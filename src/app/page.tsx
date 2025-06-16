
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { reflectAssertion, type AIReflectAssertionOutput } from '@/ai/flows/assertion-reflection';
import { identifyTensions, type TensionAnalysisInput, type TensionAnalysisOutput } from '@/ai/flows/tension-identification'; // New tension flow
import { generateImpactsByOrder, type GenerateImpactsByOrderInput, type GenerateImpactsByOrderOutput as AIGenerateImpactsByOrderOutput } from '@/ai/flows/generate-impacts-by-order';
import { suggestImpactConsolidation, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import { generateCascadeSummary, type CascadeSummaryInput, type CascadeSummaryOutput } from '@/ai/flows/generate-cascade-summary';
import { reviseSystemModelWithFeedback, type ReviseSystemModelInput, type ReviseSystemModelOutput } from '@/ai/flows/revise-system-model-with-feedback';
import type { ImpactNode, ImpactLink, Impact, ImpactMappingInputForConsolidation, StructuredConcept, GoalOption, SystemModel } from '@/types/cascade';
import { ExplorerStep } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import { TensionAnalysisDisplay } from '@/components/cascade-explorer/TensionAnalysisDisplay'; // New display component
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import SystemModelGraph from '@/components/cascade-explorer/SystemModelGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { SystemModelFeedbackDialog } from '@/components/cascade-explorer/SystemModelFeedbackDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb, ArrowRightCircle, ListChecks, FileText, RotateCcw, HelpCircle, Brain, Target, Search, Sparkles, List, Workflow, MessageSquareText, Edit3, ShieldAlert, AlertTriangle } from 'lucide-react'; // Added ShieldAlert, AlertTriangle
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CORE_ASSERTION_ID = 'core-assertion';

const goalOptions: GoalOption[] = [
  {
    id: 'decision',
    title: "Test a Decision",
    description: "See potential outcomes before committing to a choice.",
    promptLabel: "What decision are you considering?",
    placeholder: "Should our company adopt a 4-day work week?",
    icon: HelpCircle,
  },
  {
    id: 'pitch',
    title: "Strengthen a Pitch",
    description: "Build an airtight argument for your idea or proposal.",
    promptLabel: "What idea or proposal are you trying to convince someone of?",
    placeholder: "We should invest in renewable energy infrastructure.",
    icon: Brain,
  },
  {
    id: 'risk',
    title: "Find Blind Spots",
    description: "Uncover hidden risks and unintended consequences of a plan.",
    promptLabel: "What plan, change, or existing situation are you analyzing for risks?",
    placeholder: "Launching a new product in a competitive market.",
    icon: Search,
  },
  {
    id: 'general',
    title: "Explore an Assertion",
    description: "Conduct a general exploration of an idea's cascading impacts.",
    promptLabel: "Enter your assertion or idea:",
    placeholder: "The rise of AI will transform global education.",
    icon: Target,
  }
];


export default function CascadeExplorerPage() {
  const [currentAssertionText, setCurrentAssertionText] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<AIReflectAssertionOutput | null>(null);
  const [tensionAnalysisResult, setTensionAnalysisResult] = useState<TensionAnalysisOutput | null>(null); // New state for tension analysis

  const [allImpactNodes, setAllImpactNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);

  const [uiStep, setUiStep] = useState<ExplorerStep>(ExplorerStep.INITIAL);
  const [currentGoalType, setCurrentGoalType] = useState<string>(goalOptions[3].id);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);

  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  const [cascadeSummary, setCascadeSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [reflectionViewMode, setReflectionViewMode] = useState<'list' | 'graph'>('list');
  const [isSystemModelFeedbackDialogOpen, setIsSystemModelFeedbackDialogOpen] = useState<boolean>(false);

  const allImpactNodesRef = useRef(allImpactNodes);
  useEffect(() => {
    allImpactNodesRef.current = allImpactNodes;
  }, [allImpactNodes]);

  const graphLinksRef = useRef(graphLinks);
  useEffect(() => {
    graphLinksRef.current = graphLinks;
  }, [graphLinks]);

  const { toast } = useToast();

  const isLoading = useMemo(() => [
    ExplorerStep.REFLECTION_PENDING,
    ExplorerStep.REVISING_SYSTEM_MODEL,
    ExplorerStep.TENSION_ANALYSIS_PENDING, // Added new loading step
    ExplorerStep.ORDER_1_PENDING,
    ExplorerStep.ORDER_2_PENDING,
    ExplorerStep.ORDER_3_PENDING,
    ExplorerStep.CONSOLIDATION_PENDING,
    ExplorerStep.GENERATING_SUMMARY,
  ].includes(uiStep), [uiStep]);

  const handleExampleButtonClick = (exampleText: string, goalId: string) => {
    setCurrentAssertionText(exampleText);
    setCurrentGoalType(goalId);
    toast({ title: "Example Loaded", description: `"${exampleText.substring(0,50)}..." loaded into input. Associated context: ${goalOptions.find(g=>g.id === goalId)?.title || 'General'}.`, duration: 4000 });
  };

  const handleAssertionSubmit = async (assertion: string) => {
    setUiStep(ExplorerStep.REFLECTION_PENDING);
    setReflectionResult(null);
    setTensionAnalysisResult(null); // Reset tension analysis
    setAllImpactNodes([]);
    setGraphLinks([]);
    setConsolidationSuggestions(null);
    setCurrentAssertionText(assertion);
    setCascadeSummary(null);
    setSelectedNode(null);
    setIsNodePanelOpen(false);
    setIsGeneratingSummary(false);
    setReflectionViewMode('list');
    setIsSystemModelFeedbackDialogOpen(false);
    try {
      const result = await reflectAssertion({ assertion });
      setReflectionResult(result);
      setUiStep(ExplorerStep.REFLECTION_REVIEW);
    } catch (error: any) {
      console.error("Error reflecting assertion:", error);
      let errorMessage = "Failed to get AI reflection. Please try again.";
      if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = "AI Service Error: The model seems to be busy or unavailable for assertion reflection. Please try again in a few moments.";
      } else if (error.message) {
        errorMessage = `Reflection Error: ${error.message}`;
      }
      toast({ title: "Error Reflecting Assertion", description: errorMessage, variant: "destructive", duration: 7000 });
      setUiStep(ExplorerStep.INITIAL);
    }
  };

  const handleSystemModelRevisionSubmit = async (feedbackText: string): Promise<ReviseSystemModelOutput | null> => {
    if (!reflectionResult?.systemModel || !feedbackText.trim()) {
      toast({title: "Missing Data", description: "Cannot revise model without current model and feedback.", variant: "destructive"});
      return null;
    }
    setUiStep(ExplorerStep.REVISING_SYSTEM_MODEL);
    try {
      const input: ReviseSystemModelInput = {
        currentSystemModel: reflectionResult.systemModel,
        userFeedback: feedbackText,
      };
      const result = await reviseSystemModelWithFeedback(input);
      if (result && result.revisedSystemModel) {
        setReflectionResult(prev => prev ? { ...prev, systemModel: result.revisedSystemModel } : null);
        toast({ title: "System Model Revised", description: result.revisionSummary || "AI has revised the system model based on your feedback.", duration: 6000 });
      } else {
        toast({ title: "Revision Failed", description: result.revisionSummary || "AI could not revise the model as requested.", variant: "destructive", duration: 6000 });
      }
      return result;
    } catch (error: any) {
      console.error("Error revising system model:", error);
      let errorMessage = "Failed to revise system model. Please try again.";
      if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = "AI Service Error: The model seems to be busy or unavailable for system model revision. Please try again in a few moments.";
      } else if (error.message) {
        errorMessage = `System Model Revision Error: ${error.message}`;
      }
      toast({ title: "Error Revising System Model", description: errorMessage, variant: "destructive", duration: 7000 });
      return { revisedSystemModel: reflectionResult.systemModel, revisionSummary: `Error: ${errorMessage}` };
    } finally {
      setUiStep(ExplorerStep.REFLECTION_REVIEW);
    }
  };

  const handleConfirmReflectionAndIdentifyTensions = async () => {
    if (!reflectionResult || !currentAssertionText) {
        toast({ title: "Missing Context", description: "Cannot identify tensions without a confirmed assertion and system model.", variant: "destructive" });
        setUiStep(ExplorerStep.REFLECTION_REVIEW);
        return;
    }
    setUiStep(ExplorerStep.TENSION_ANALYSIS_PENDING);
    setTensionAnalysisResult(null);

    try {
        const tensionInput: TensionAnalysisInput = {
            assertionText: currentAssertionText, // Use full assertion text
            systemModel: reflectionResult.systemModel,
        };
        const result = await identifyTensions(tensionInput);
        setTensionAnalysisResult(result);
        setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
    } catch (error: any) {
        console.error("Error identifying tensions:", error);
        let errorMessage = "Failed to identify system tensions. Please try again.";
        if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
            errorMessage = "AI Service Error: The model seems to be busy or unavailable for tension analysis. Please try again in a few moments.";
        } else if (error.message) {
            errorMessage = `Tension Analysis Error: ${error.message}`;
        }
        toast({ title: "Error Identifying Tensions", description: errorMessage, variant: "destructive", duration: 7000 });
        setUiStep(ExplorerStep.REFLECTION_REVIEW); // Fallback to reflection review
    }
  };

  const mapImpactNodeToImpact = (node: ImpactNode): Impact => {
    const keyConcepts = node.keyConcepts || (node.properties?.keyConcepts as StructuredConcept[] | undefined) || [];
    const attributes = node.attributes || (node.properties?.attributes as string[] | undefined) || [];

    return {
        id: node.id,
        label: node.label,
        description: node.description,
        validity: node.validity,
        reasoning: node.reasoning,
        parentId: node.parentId,
        keyConcepts: keyConcepts,
        attributes: attributes,
        causalReasoning: node.causalReasoning,
    };
  };

  const fetchImpactsForOrder = useCallback(async (targetOrder: 1 | 2 | 3, parentNodesForLinking: ImpactNode[]) => {
    if (!currentAssertionText || !reflectionResult) {
        toast({ title: "Missing Context", description: "Cannot generate impacts without a confirmed assertion.", variant: "destructive" });
        setUiStep(ExplorerStep.REFLECTION_REVIEW);
        return;
    }

    const coreAssertionNode = allImpactNodesRef.current.find(n => n.id === CORE_ASSERTION_ID);
    const currentTensionAnalysis = targetOrder === 1
        ? tensionAnalysisResult
        : coreAssertionNode?.properties?.tensionAnalysis;


    if (targetOrder === 1 && !currentTensionAnalysis) {
        toast({ title: "Missing Tension Analysis", description: "Tension analysis is required before generating 1st order impacts.", variant: "destructive" });
        setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
        return;
    }

    console.log(`[fetchImpactsForOrder] Called for Order: ${targetOrder}`);
    console.log("[fetchImpactsForOrder] Parent nodes for linking (sent to AI):", parentNodesForLinking.map(p => ({id: p.id, label:p.label})));
    console.log("[fetchImpactsForOrder] Tension Analysis to be used:", currentTensionAnalysis);


    let currentLoadingStep: ExplorerStep = ExplorerStep.ORDER_1_PENDING;
    let currentReviewStep: ExplorerStep = ExplorerStep.ORDER_1_REVIEW;

    switch (targetOrder) {
      case 1:
        currentLoadingStep = ExplorerStep.ORDER_1_PENDING;
        currentReviewStep = ExplorerStep.ORDER_1_REVIEW;
        break;
      case 2:
        currentLoadingStep = ExplorerStep.ORDER_2_PENDING;
        currentReviewStep = ExplorerStep.ORDER_2_REVIEW;
        break;
      case 3:
        currentLoadingStep = ExplorerStep.ORDER_3_PENDING;
        currentReviewStep = ExplorerStep.ORDER_3_REVIEW;
        break;
      default:
        console.error("[fetchImpactsForOrder] Invalid targetOrder:", targetOrder);
        setUiStep(ExplorerStep.INITIAL);
        return;
    }

    if ((targetOrder === 2 || targetOrder === 3) && parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate ${targetOrder === 2 ? '2nd' : '3rd'} order impacts as no impacts from the previous order exist. Proceed from the current step.`, variant: "default" });
        if (targetOrder === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
        else if (targetOrder === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
        return;
    }

    setUiStep(currentLoadingStep);
    setConsolidationSuggestions(null);

    try {
      const aiInput: GenerateImpactsByOrderInput = {
        assertionText: reflectionResult.summary,
        targetOrder: String(targetOrder) as '1' | '2' | '3',
        parentImpacts: targetOrder > 1 ? parentNodesForLinking.map(mapImpactNodeToImpact) : undefined,
        tensionAnalysis: currentTensionAnalysis || undefined,
      };
      const result: AIGenerateImpactsByOrderOutput = await generateImpactsByOrder(aiInput);
      console.log("[fetchImpactsForOrder] Raw result.generatedImpacts from AI:", JSON.parse(JSON.stringify(result.generatedImpacts)));

      const rawGeneratedImpacts = result.generatedImpacts || [];

      const validGeneratedImpacts = rawGeneratedImpacts.filter(impact => {
        const hasEssentialFields = impact.id && impact.id.trim() !== "" &&
                                 impact.label && impact.label.trim() !== "" &&
                                 impact.description && impact.description.trim() !== "" &&
                                 impact.validity &&
                                 impact.reasoning && impact.reasoning.trim() !== "";
        const parentIdCheck = targetOrder === 1 || (impact.parentId && impact.parentId.trim() !== "");
        return hasEssentialFields && parentIdCheck;
      });

      console.log(`[fetchImpactsForOrder] Processing ${validGeneratedImpacts.length} valid impacts out of ${rawGeneratedImpacts.length} raw impacts.`);
      validGeneratedImpacts.forEach(imp => {
        console.log(`[fetchImpactsForOrder] Valid impact from AI: ID=${imp.id}, Label="${imp.label}", AI-ParentID=${imp.parentId || 'N/A'}`);
      });

      if (validGeneratedImpacts.length < rawGeneratedImpacts.length) {
        const diff = rawGeneratedImpacts.length - validGeneratedImpacts.length;
        const exampleMissingParentId = targetOrder > 1 ? rawGeneratedImpacts.find(imp => !imp.parentId) : null;
        let detail = `${diff} impact(s) from AI were incomplete and ignored.`;
        if(exampleMissingParentId){
           detail += ` Example: Impact "${exampleMissingParentId.label}" missing parentId.`;
        }
        console.warn(`[fetchImpactsForOrder] Filtered out ${diff} malformed impact(s). Raw discarded:`, rawGeneratedImpacts.filter(i => !validGeneratedImpacts.includes(i)));
        toast({
          title: "AI Data Inconsistency",
          description: detail,
          variant: "default",
          duration: 8000,
        });
      }

      const newNodesFromAI: ImpactNode[] = validGeneratedImpacts.map(impact => ({
        id: impact.id,
        label: impact.label,
        description: impact.description,
        validity: impact.validity,
        reasoning: impact.reasoning,
        parentId: impact.parentId, // Correctly mapped
        keyConcepts: impact.keyConcepts || [],
        attributes: impact.attributes || [],
        causalReasoning: impact.causalReasoning,
        order: targetOrder,
        nodeSystemType: 'GENERATED_IMPACT',
        properties: {
            keyConcepts: impact.keyConcepts || [],
            attributes: impact.attributes || [],
        },
      }));

      if (newNodesFromAI.length === 0 && rawGeneratedImpacts.length > 0) {
         toast({
          title: `No Valid Impacts Processed`,
          description: `The AI generated ${rawGeneratedImpacts.length} impact(s), but none passed validation. Please try again or refine the assertion if this persists.`,
          variant: "destructive",
          duration: 8000,
        });
      } else if (newNodesFromAI.length === 0 && rawGeneratedImpacts.length === 0) {
        toast({
          title: `No New Impacts Generated`,
          description: `The AI did not identify any ${targetOrder === 1 ? 'first' : targetOrder === 2 ? 'second' : 'third'}-order impacts for this step. You can try proceeding or refine your assertion.`,
          variant: "default",
          duration: 7000,
        });
      }

      const newLinksGeneratedThisStep: ImpactLink[] = [];
      const finalNewNodesWithUpdatedParentIds: ImpactNode[] = [];

      if (targetOrder === 1) {
          const coreNodeForLinking = allImpactNodesRef.current.find(n => n.id === CORE_ASSERTION_ID);
          if (coreNodeForLinking) {
              newNodesFromAI.forEach(newNode => {
                  const nodeWithParent = { ...newNode, parentId: CORE_ASSERTION_ID };
                  finalNewNodesWithUpdatedParentIds.push(nodeWithParent);
                  newLinksGeneratedThisStep.push({ source: CORE_ASSERTION_ID, target: nodeWithParent.id });
                  console.log(`[fetchImpactsForOrder] Linking 1st Order Node: ID="${nodeWithParent.id}", Label="${nodeWithParent.label}" to ParentID="${CORE_ASSERTION_ID}" (Core Assertion).`);
              });
          } else {
               console.error("[fetchImpactsForOrder] Core assertion node not found for linking 1st order impacts. allImpactNodesRef.current IDs:", allImpactNodesRef.current.map(n => n.id));
          }
      } else if (targetOrder > 1) {
        newNodesFromAI.forEach(newNode => {
            const aiParentId = newNode.parentId; // This is now correctly from AI's output
            let parentNodeFromGraph = allImpactNodesRef.current.find(n => n.id === aiParentId && n.order === targetOrder - 1);
            let linkLogDetails = {
                newNodeId: newNode.id,
                newNodeLabel: newNode.label,
                aiParentId: aiParentId,
                attemptedParentId: aiParentId,
                foundParentNodeId: parentNodeFromGraph?.id,
                fallbackUsed: false,
                fallbackParentId: '',
            };

            if (parentNodeFromGraph) {
                finalNewNodesWithUpdatedParentIds.push(newNode); // ParentId already set from AI
                newLinksGeneratedThisStep.push({ source: parentNodeFromGraph.id, target: newNode.id });
                linkLogDetails.foundParentNodeId = parentNodeFromGraph.id;
            } else {
                console.warn(`[fetchImpactsForOrder] Impact "${newNode.label}" (ID: ${newNode.id}) from AI for order ${targetOrder} specified parentId ('${aiParentId}') which is not a valid, existing node of order ${targetOrder - 1}. Attempting fallback.`);
                if (parentNodesForLinking.length > 0) {
                    const fallbackParent = parentNodesForLinking[0]; // Fallback to first available parent sent to AI
                    const nodeWithFallbackParent = { ...newNode, parentId: fallbackParent.id };
                    finalNewNodesWithUpdatedParentIds.push(nodeWithFallbackParent);
                    newLinksGeneratedThisStep.push({ source: fallbackParent.id, target: nodeWithFallbackParent.id });

                    linkLogDetails.fallbackUsed = true;
                    linkLogDetails.fallbackParentId = fallbackParent.id;
                    linkLogDetails.foundParentNodeId = fallbackParent.id;

                    toast({
                        title: "Linking Fallback Applied",
                        description: `Impact "${newNode.label}" used a fallback parent ("${fallbackParent.label}") because its AI-specified parent (ID: ${aiParentId}) was invalid or missing. The AI's reasoning text may still refer to the intended parent.`,
                        variant: "default", duration: 10000,
                    });
                } else {
                    finalNewNodesWithUpdatedParentIds.push(newNode); // Keep AI's parentId, but it won't link
                    console.error(`[fetchImpactsForOrder] CRITICAL: Orphaned Impact "${newNode.label}" (ID: ${newNode.id}). AI parentId ('${aiParentId}') invalid, and no fallback parents (parentNodesForLinking) exist. Will appear disconnected.`);
                    linkLogDetails.foundParentNodeId = undefined;
                    toast({
                        title: "Orphaned Impact Warning",
                        description: `Impact "${newNode.label}" could not be linked to any parent node. It will appear disconnected. This may be due to an issue with AI output or consolidation.`,
                        variant: "destructive", duration: 10000,
                    });
                }
            }
            console.log("[fetchImpactsForOrder] Linking Node Attempt:", linkLogDetails);
        });
      }

      setAllImpactNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        finalNewNodesWithUpdatedParentIds.forEach(updatedNode => {
          nodeMap.set(updatedNode.id, updatedNode);
        });
        return Array.from(nodeMap.values());
      });

      setGraphLinks(prevLinks => {
        const currentLinks = graphLinksRef.current;
        const linkMap = new Map(currentLinks.map(l => {
            const sourceId = typeof l.source === 'string' ? l.source : (l.source as ImpactNode).id;
            const targetId = typeof l.target === 'string' ? l.target : (l.target as ImpactNode).id;
            return [`${sourceId}:::${targetId}`, l];
        }));
        newLinksGeneratedThisStep.forEach(l => {
            const sourceId = typeof l.source === 'string' ? l.source : (l.source as ImpactNode).id;
            const targetId = typeof l.target === 'string' ? l.target : (l.target as ImpactNode).id;
            linkMap.set(`${sourceId}:::${targetId}`, l);
        });
        return Array.from(linkMap.values());
      });

      setUiStep(currentReviewStep);
    } catch (error: any) {
      console.error(`[fetchImpactsForOrder] Error generating ${targetOrder}-order impacts:`, error);
      let errorMessage = `Failed to generate ${targetOrder}-order impacts. Please try again.`;
       if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = `AI Service Error: The model seems to be busy or unavailable for generating ${targetOrder}-order impacts. Please try again in a few moments.`;
      } else if (error.message) {
        errorMessage = `Impact Generation Error (Order ${targetOrder}): ${error.message}`;
      }
      toast({ title: "Error Generating Impacts", description: errorMessage, variant: "destructive", duration: 7000 });
      if (targetOrder === 1) setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
      else if (targetOrder === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else if (targetOrder === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else setUiStep(ExplorerStep.INITIAL);
    }
  }, [currentAssertionText, reflectionResult, tensionAnalysisResult, toast, allImpactNodesRef, mapImpactNodeToImpact, setUiStep, setAllImpactNodes, setGraphLinks, setConsolidationSuggestions]);

  const handleProceedFromTensionAnalysisToFirstOrder = useCallback(async () => {
    if (!reflectionResult || !currentAssertionText || !tensionAnalysisResult) {
      toast({ title: "Missing Context", description: "Cannot generate impacts without confirmed assertion, system model, and tension analysis.", variant: "destructive" });
      return;
    }

    const coreNode: ImpactNode = {
      id: CORE_ASSERTION_ID,
      label: reflectionResult.summary,
      description: currentAssertionText,
      validity: 'high',
      reasoning: 'User-provided assertion, confirmed.',
      order: 0,
      nodeSystemType: 'CORE_ASSERTION',
      keyConcepts: reflectionResult.keyConcepts || [],
      attributes: [],
      causalReasoning: undefined,
      parentId: undefined,
      properties: {
        fullAssertionText: currentAssertionText,
        systemModel: reflectionResult.systemModel,
        keyConcepts: reflectionResult.keyConcepts || [],
        tensionAnalysis: tensionAnalysisResult,
      }
    };

    setAllImpactNodes([coreNode]);
    setGraphLinks([]);
    await Promise.resolve(); // Ensure state updates are processed before calling next step

    console.log("[handleProceedFromTensionAnalysisToFirstOrder] Core node created, proceeding to fetch 1st order impacts.");
    console.log("[handleProceedFromTensionAnalysisToFirstOrder] Core node for linking (passed to fetchImpactsForOrder):", {id: coreNode.id, label:coreNode.label});
    await fetchImpactsForOrder(1, [coreNode]);
  }, [reflectionResult, currentAssertionText, tensionAnalysisResult, fetchImpactsForOrder, toast, setAllImpactNodes, setGraphLinks]);

  const handleGenerateCascadeSummary = useCallback(async () => {
    if (!reflectionResult || allImpactNodesRef.current.length <=1 ) {
      toast({title: "Cannot Generate Summary", description: "Initial assertion and a developed impact map are required.", variant: "destructive"});
      return;
    }
    setUiStep(ExplorerStep.GENERATING_SUMMARY);
    setIsGeneratingSummary(true);
    setCascadeSummary(null);

    const currentNodes = allImpactNodesRef.current;

    const summaryInput: CascadeSummaryInput = {
        initialAssertion: {
            summary: reflectionResult.summary,
            fullText: currentAssertionText,
        },
        firstOrderImpacts: currentNodes.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
        secondOrderImpacts: currentNodes.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
        thirdOrderImpacts: currentNodes.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
    };

    try {
        const result: CascadeSummaryOutput = await generateCascadeSummary(summaryInput);
        setCascadeSummary(result.narrativeSummary);
        toast({title: "Narrative Summary Generated", description: "The AI has summarized the impact cascade."});
        setUiStep(ExplorerStep.FINAL_REVIEW);
    } catch (error: any) {
        console.error("Error generating cascade summary:", error);
        let errorMessage = "Failed to generate cascade summary. Please try again.";
        if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
            errorMessage = "AI Service Error: The model seems to be busy or unavailable for summary generation. Please try again in a few moments.";
        } else if (error.message) {
            errorMessage = `Summary Error: ${error.message}`;
        }
        toast({ title: "Summary Generation Failed", description: errorMessage, variant: "destructive", duration: 7000 });
        setUiStep(ExplorerStep.ORDER_3_REVIEW); // Or appropriate fallback
    } finally {
        setIsGeneratingSummary(false);
    }
  }, [reflectionResult, currentAssertionText, allImpactNodesRef, toast, setUiStep, setIsGeneratingSummary, setCascadeSummary, mapImpactNodeToImpact]);


  const handleProceedToNextOrder = useCallback(async () => {
    let nextOrderToFetch: 2 | 3 | undefined;
    let parentNodesForLinking: ImpactNode[] = [];

    const currentNodesSnapshot = allImpactNodesRef.current;
    console.log("[handleProceedToNextOrder] Called. Current uiStep:", ExplorerStep[uiStep]);
    console.log("[handleProceedToNextOrder] Current nodes snapshot for filtering parents:", currentNodesSnapshot.map(n => ({id: n.id, label:n.label, order:n.order})));


    if (uiStep === ExplorerStep.ORDER_1_REVIEW) {
      nextOrderToFetch = 2;
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT');
      console.log("[handleProceedToNextOrder] Determined next order to fetch: 2. Parent nodes count:", parentNodesForLinking.length, parentNodesForLinking.map(p=>p.label));
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) {
      nextOrderToFetch = 3;
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT');
       console.log("[handleProceedToNextOrder] Determined next order to fetch: 3. Parent nodes count:", parentNodesForLinking.length, parentNodesForLinking.map(p=>p.label));
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) {
      console.log("[handleProceedToNextOrder] At ORDER_3_REVIEW, proceeding to generate summary.");
      await handleGenerateCascadeSummary();
      return;
    } else if (uiStep === ExplorerStep.FINAL_REVIEW) {
      toast({ title: "Exploration Complete", description: "You have completed the exploration process. Start a new one or review the summary."});
      return;
    }

    if (nextOrderToFetch && typeof nextOrderToFetch === 'number') {
      if (parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate ${nextOrderToFetch === 2 ? '2nd' : '3rd'} order impacts as no impacts from the previous order exist. You can try to finalize the summary with the current map.`, variant: "default" });
        console.warn(`[handleProceedToNextOrder] No parent impacts found for order ${nextOrderToFetch}. Staying in current review step.`);
        if (nextOrderToFetch === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
        else if (nextOrderToFetch === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
        return;
      }
      console.log(`[handleProceedToNextOrder] Calling fetchImpactsForOrder for order ${nextOrderToFetch} with ${parentNodesForLinking.length} parent nodes.`);
      await fetchImpactsForOrder(nextOrderToFetch, parentNodesForLinking);
    } else {
        console.warn("[handleProceedToNextOrder] Called from unexpected uiStep or nextOrderToFetch not set:", ExplorerStep[uiStep]);
    }
  }, [uiStep, fetchImpactsForOrder, toast, handleGenerateCascadeSummary, setUiStep, allImpactNodesRef]);


  const handleSuggestConsolidations = async () => {
    const currentNodesForAICall = allImpactNodesRef.current;
    console.log("[handleSuggestConsolidations] Called. Current nodes for AI call:", currentNodesForAICall.map(n=>({id:n.id, label:n.label, order:n.order})));

    const impactsForConsolidation: ImpactMappingInputForConsolidation = {
      firstOrder: currentNodesForAICall.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
      secondOrder: currentNodesForAICall.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
      thirdOrder: currentNodesForAICall.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
    };
    console.log("[handleSuggestConsolidations] Impacts formatted for AI:", impactsForConsolidation);

    const canConsolidateFirst = impactsForConsolidation.firstOrder.length >= 2;
    const canConsolidateSecond = impactsForConsolidation.secondOrder.length >= 2;
    const canConsolidateThird = impactsForConsolidation.thirdOrder.length >= 2;

    if (!canConsolidateFirst && !canConsolidateSecond && !canConsolidateThird) {
      toast({ title: "Not Enough Impacts", description: "Not enough impacts in any single order to analyze for consolidation (minimum 2 per order).", variant: "default" });
      console.log("[handleSuggestConsolidations] Not enough impacts to consolidate in any single order.");
      return;
    }

    const previousStep = uiStep;
    setUiStep(ExplorerStep.CONSOLIDATION_PENDING);
    try {
      const result = await suggestImpactConsolidation(impactsForConsolidation);
      console.log("[handleSuggestConsolidations] Raw result from AI:", JSON.parse(JSON.stringify(result)));
      const currentNodesSnapshotForValidation = allImpactNodesRef.current;

      const validSuggestions = (result.consolidationSuggestions || []).filter(suggestion => {
        if (!suggestion.originalImpactIds || suggestion.originalImpactIds.length < 2) {
          console.warn("AI suggested consolidation with <2 originalImpactIds (client-side filter):", suggestion);
          return false;
        }

        const originalNodes = suggestion.originalImpactIds.map(id => currentNodesSnapshotForValidation.find(n => n.id === id)).filter(Boolean) as ImpactNode[];

        if (originalNodes.length !== suggestion.originalImpactIds.length) {
          console.warn("AI suggested consolidation with non-existent originalImpactIds (client-side filter):", suggestion);
          return false;
        }
        if (originalNodes.length === 0) return false;

        const firstOriginalOrder = originalNodes[0].order;
        const allSameOrder = originalNodes.every(node => node.order === firstOriginalOrder);
        if (!allSameOrder) {
          console.warn("AI suggested consolidation across different orders (client-side filter):", suggestion);
          return false;
        }

        const consolidatedOrderString = suggestion.consolidatedImpact.order;
        if (!consolidatedOrderString || !['0', '1', '2', '3'].includes(consolidatedOrderString)) {
             console.warn("AI suggested consolidation with invalid or missing consolidatedImpact.order (client-side filter):", suggestion);
             return false;
        }
        const consolidatedOrder = parseInt(consolidatedOrderString, 10);
        if (consolidatedOrder !== firstOriginalOrder) {
          console.warn("AI suggested consolidatedImpact.order different from originalImpactIds' order (client-side filter):", suggestion);
          return false;
        }
        return true;
      });


      if (validSuggestions.length < (result.consolidationSuggestions || []).length) {
        const invalidCount = (result.consolidationSuggestions || []).length - validSuggestions.length;
        console.warn(`AI suggested ${invalidCount} consolidation(s) that were invalid based on client-side structural rules. These have been filtered out.`);
         toast({ title: "AI Data Filtered", description: `${invalidCount} invalid consolidation suggestion(s) from AI were ignored.`, variant: "default", duration: 7000 });
      }

      console.log("[handleSuggestConsolidations] Valid suggestions after filtering:", validSuggestions);
      setConsolidationSuggestions({ consolidationSuggestions: validSuggestions });

      if (validSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${validSuggestions.length} potential consolidation(s). Review them below.` });
      } else {
        toast({ title: "No Suitable Consolidations Found", description: "The AI did not identify any valid groups of two or more impacts to consolidate within any single order that passed client-side validation." });
      }
    } catch (error: any) {
      console.error("Error suggesting consolidations:", error);
      let errorMessage = "Failed to get consolidation suggestions. Please try again.";
      if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = "AI Service Error: The model seems to be busy or unavailable for consolidation suggestions. Please try again in a few moments.";
      } else if (error.message) {
        errorMessage = `Consolidation Error: ${error.message}`;
      }
      toast({ title: "Error Suggesting Consolidations", description: errorMessage, variant: "destructive", duration: 7000 });
    } finally {
      setUiStep(previousStep);
    }
  };

  const handleNodeClick = (node: ImpactNode) => {
    setSelectedNode(node);
    setIsNodePanelOpen(true);
  };

  const handleUpdateValidity = (nodeId: string, validity: 'high' | 'medium' | 'low') => {
    setAllImpactNodes(prevNodes =>
      prevNodes.map(n => (n.id === nodeId ? { ...n, validity } : n))
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? {...prev, validity} : null);
    }
    const nodeLabel = allImpactNodesRef.current.find(n => n.id === nodeId)?.label || nodeId;
    toast({ title: "Validity Updated", description: `Node "${nodeLabel}" validity set to ${validity}.`});
  };

 const handleApplyConsolidation = (suggestion: ConsolidatedImpactSuggestion) => {
    console.log("[handleApplyConsolidation] Applying suggestion:", JSON.parse(JSON.stringify(suggestion)));
    const { originalImpactIds, consolidatedImpact: suggestedConsolidatedImpact } = suggestion;
    console.log("[handleApplyConsolidation] Original Impact IDs to remove:", originalImpactIds);


    if (!originalImpactIds || originalImpactIds.length < 2) {
        console.error("[handleApplyConsolidation] Attempted to apply invalid consolidation suggestion (pre-flight check failed):", suggestion);
        toast({title: "Invalid Suggestion", description: "Cannot apply consolidation, suggestion is missing original impact IDs or has too few.", variant:"destructive"});
        return;
    }

    const newConsolidatedImpactOrder = parseInt(suggestedConsolidatedImpact.order as string, 10) as 0 | 1 | 2 | 3;

    const newGraphNode: ImpactNode = {
        id: suggestedConsolidatedImpact.id,
        label: suggestedConsolidatedImpact.label,
        description: suggestedConsolidatedImpact.description,
        validity: suggestedConsolidatedImpact.validity,
        reasoning: suggestedConsolidatedImpact.reasoning,
        parentId: suggestedConsolidatedImpact.parentId,
        keyConcepts: suggestedConsolidatedImpact.keyConcepts || [],
        attributes: suggestedConsolidatedImpact.attributes || [],
        causalReasoning: suggestedConsolidatedImpact.causalReasoning,
        order: newConsolidatedImpactOrder,
        nodeSystemType: 'GENERATED_IMPACT',
        properties: {
            keyConcepts: suggestedConsolidatedImpact.keyConcepts || [],
            attributes: suggestedConsolidatedImpact.attributes || [],
        },
    };
    console.log("[handleApplyConsolidation] New graph node being created:", JSON.parse(JSON.stringify(newGraphNode)));


    let currentNodes = allImpactNodesRef.current;
    let nextNodes = currentNodes
        .filter(n => !originalImpactIds.includes(n.id))
        .concat(newGraphNode);

    let finalNewLinks: ImpactLink[] = [];
    let childLinksToReParent: ImpactLink[] = [];
    let parentLinksToReParent: ImpactLink[] = [];

    graphLinksRef.current.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
        const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);

        if (originalImpactIds.includes(sourceId) && originalImpactIds.includes(targetId)) {
            console.log(`[handleApplyConsolidation] Skipping internal link between consolidated nodes: ${sourceId} -> ${targetId}`);
        } else if (originalImpactIds.includes(sourceId)) {
            console.log(`[handleApplyConsolidation] Re-parenting child link: Original source ${sourceId} (to be ${newGraphNode.id}) -> Target ${targetId}`);
            childLinksToReParent.push({ source: newGraphNode.id, target: targetId });
        } else if (originalImpactIds.includes(targetId)) {
            console.log(`[handleApplyConsolidation] Re-parenting parent link: Source ${sourceId} -> Original target ${targetId} (to be ${newGraphNode.id})`);
            parentLinksToReParent.push({ source: sourceId, target: newGraphNode.id });
        } else {
            finalNewLinks.push(link);
        }
    });

    console.log("[handleApplyConsolidation] Child links to re-parent:", JSON.parse(JSON.stringify(childLinksToReParent)));
    console.log("[handleApplyConsolidation] Parent links to re-parent:", JSON.parse(JSON.stringify(parentLinksToReParent)));

    finalNewLinks.push(...childLinksToReParent, ...parentLinksToReParent);

    // Ensure the consolidated node itself has a parent link if it's not a root node
    // and its AI-suggested parentId is valid, or fallback to a valid parent of the same order.
    const hasParentLink = finalNewLinks.some(l => (typeof l.target === 'object' ? (l.target as ImpactNode).id : String(l.target)) === newGraphNode.id);
    let parentAssignedForNewNode = hasParentLink;

    if (!parentAssignedForNewNode && newGraphNode.id !== CORE_ASSERTION_ID && newGraphNode.order > 0) {
        if (newGraphNode.parentId && nextNodes.some(n => n.id === newGraphNode.parentId && n.order === newGraphNode.order - 1)) {
            console.log(`[handleApplyConsolidation] Consolidated node ${newGraphNode.id} has AI parentId ${newGraphNode.parentId}. Linking.`);
            finalNewLinks.push({ source: newGraphNode.parentId, target: newGraphNode.id });
            parentAssignedForNewNode = true;
        } else {
             // Fallback: find the first valid parent from the originalImpacts, if any had one.
            let potentialFallbackParentId: string | undefined = undefined;
            const originalNodesData = suggestion.originalImpactIds
                .map(id => allImpactNodesRef.current.find(n => n.id === id))
                .filter(Boolean) as ImpactNode[];

            for (const origNode of originalNodesData) {
                if (origNode.parentId && nextNodes.some(n => n.id === origNode.parentId && n.order === newGraphNode.order -1)) {
                    potentialFallbackParentId = origNode.parentId;
                    break;
                }
            }
            if (potentialFallbackParentId) {
                newGraphNode.parentId = potentialFallbackParentId; // Update the node's parentId as well
                finalNewLinks.push({ source: potentialFallbackParentId, target: newGraphNode.id });
                parentAssignedForNewNode = true;
                console.log(`[handleApplyConsolidation] Consolidated node ${newGraphNode.id} linked to fallback parent ${potentialFallbackParentId} from original impacts.`);
            } else if (newGraphNode.order === 1) { // If it's 1st order, it must link to CORE_ASSERTION
                 const coreParent = nextNodes.find(n => n.id === CORE_ASSERTION_ID);
                 if (coreParent) {
                     newGraphNode.parentId = CORE_ASSERTION_ID;
                     finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                     parentAssignedForNewNode = true;
                     console.log(`[handleApplyConsolidation] Consolidated 1st order node ${newGraphNode.id} linked to CORE_ASSERTION.`);
                 }
            }
        }
        if (!parentAssignedForNewNode) {
           console.warn(`[handleApplyConsolidation] Consolidated node ${newGraphNode.id} (Order ${newGraphNode.order}) could not be deterministically linked to a parent. Suggested parentId: ${newGraphNode.parentId || 'none'}. It might appear disconnected if not a root node.`);
            // If it's order 1 and still no parent, it should be CORE_ASSERTION
            if (newGraphNode.order === 1 && newGraphNode.id !== CORE_ASSERTION_ID) {
                 const coreNode = nextNodes.find(n => n.id === CORE_ASSERTION_ID);
                 if (coreNode) {
                    newGraphNode.parentId = CORE_ASSERTION_ID;
                    finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                    console.log(`[handleApplyConsolidation] Last resort: Linking 1st order consolidated node ${newGraphNode.id} to CORE_ASSERTION.`);
                 } else {
                    console.error(`[handleApplyConsolidation] CRITICAL: Core assertion node not found for 1st order consolidated node ${newGraphNode.id}.`);
                 }
            }
        }
    }
    // Update the newGraphNode in nextNodes if its parentId was changed by fallback logic
    nextNodes = nextNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n);


    const uniqueLinks = new Map<string, ImpactLink>();
    finalNewLinks.forEach(link => {
      const src = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
      const tgt = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
      if (src === tgt) {
        console.warn(`[handleApplyConsolidation] Attempted to create self-link for node ${src}. Skipping.`);
        return;
      }
      uniqueLinks.set(`${src}:::${tgt}`, { source: src, target: tgt });
    });
    const dedupedFinalNewLinks = Array.from(uniqueLinks.values());

    console.log("[handleApplyConsolidation] Final deduped new links:", JSON.parse(JSON.stringify(dedupedFinalNewLinks)));
    console.log("[handleApplyConsolidation] Final nextNodes state (IDs, Labels, Orders, ParentIDs):", JSON.parse(JSON.stringify(nextNodes.map(n=>({id:n.id, label:n.label, order:n.order, parentId:n.parentId})))));


    setAllImpactNodes(nextNodes);
    setGraphLinks(dedupedFinalNewLinks);

    let dependentSuggestionsRemovedCount = 0;
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      const suggestionsToKeep = prev.consolidationSuggestions.filter(s => {
        if (s.consolidatedImpact.id === suggestion.consolidatedImpact.id) {
          return false; // Remove the applied suggestion
        }
        // Remove any other suggestions that involved one of the *originalImpactIds* we just consolidated
        const isDependent = s.originalImpactIds.some(id => originalImpactIds.includes(id));
        if (isDependent) {
          dependentSuggestionsRemovedCount++;
          console.log(`[handleApplyConsolidation] Removing dependent suggestion for consolidated impact ID ${s.consolidatedImpact.id} because it involved one of the originalImpactIds: ${originalImpactIds.join(', ')}`);
          return false;
        }
        return true;
      });
      return {
        ...prev,
        consolidationSuggestions: suggestionsToKeep
      };
    });

    let toastMessage = `Impacts consolidated into "${suggestion.consolidatedImpact.label}". Graph updated.`;
    if (dependentSuggestionsRemovedCount > 0) {
      toastMessage += ` ${dependentSuggestionsRemovedCount} dependent suggestion(s) were also removed.`;
    }
    toast({
      title: "Consolidation Applied",
      description: toastMessage
    });
  };

  const handleDismissConsolidation = (suggestionId: string) => {
     toast({
        title: "Suggestion Dismissed",
        description: `Suggestion for consolidated impact ID ${suggestionId} has been removed.`
    });
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        consolidationSuggestions: prev.consolidationSuggestions.filter(s => s.consolidatedImpact.id !== suggestionId)
      };
    });
  };

  const visibleNodes = useMemo(() => {
    const currentNodes = allImpactNodes; // Use direct state for this memo

    if (uiStep === ExplorerStep.INITIAL && !reflectionResult) return [];
    if (uiStep === ExplorerStep.REFLECTION_PENDING || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING) return [];

    if ((uiStep === ExplorerStep.REFLECTION_REVIEW || uiStep === ExplorerStep.TENSION_ANALYSIS_REVIEW) && reflectionResult) {
      const coreNode = currentNodes.find(n => n.id === CORE_ASSERTION_ID && n.order === 0);
      return coreNode ? [coreNode] : [];
    }


    const maxVisibleOrderMap: Partial<Record<ExplorerStep, number>> = {
        [ExplorerStep.ORDER_1_PENDING]: 0,
        [ExplorerStep.ORDER_1_REVIEW]: 1,
        [ExplorerStep.ORDER_2_PENDING]: 1,
        [ExplorerStep.ORDER_2_REVIEW]: 2,
        [ExplorerStep.ORDER_3_PENDING]: 2,
        [ExplorerStep.ORDER_3_REVIEW]: 3,
        [ExplorerStep.CONSOLIDATION_PENDING]: 3, // Keep showing full map during consolidation
        [ExplorerStep.GENERATING_SUMMARY]: 3,
        [ExplorerStep.FINAL_REVIEW]: 3,
    };

    const maxVisibleOrder = maxVisibleOrderMap[uiStep] ?? (currentNodes.length > 0 ? 3 : -1);

    if (maxVisibleOrder === -1 && currentNodes.length > 0 && reflectionResult) {
        // Fallback for unexpected uiStep, show only core if available
        return currentNodes.filter(n => n.order === 0);
    }
    return currentNodes.filter(n => n.order <= maxVisibleOrder);
  }, [uiStep, reflectionResult, allImpactNodes]);


  const visibleLinks = useMemo(() => {
    if (!visibleNodes.length) return [];
    const currentLinksFromState = graphLinks; // Use direct state for this memo
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const filteredLinks = currentLinksFromState.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
    return filteredLinks;
  }, [visibleNodes, graphLinks]);


  const renderStepContent = () => {
    const commonLoading = (text: string) => (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">{text}</p>
      </div>
    );

    const nodesForThisRenderPass = allImpactNodes; // Use current state for rendering decisions

    switch (uiStep) {
      case ExplorerStep.INITIAL:
        return (
          <Card className="shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">
                Step 1: Define Your Assertion
              </CardTitle>
              <CardDescription>
                Enter your assertion, idea, or decision to explore, or select an example below to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssertionInputForm
                onSubmit={handleAssertionSubmit}
                isLoading={isLoading}
                initialAssertionText={currentAssertionText}
                onAssertionChange={setCurrentAssertionText}
                inputPromptLabel="Your Assertion / Idea / Decision:"
                placeholder="e.g., Implementing a universal basic income..."
              />
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-md font-semibold mb-3 text-accent">Or try an example:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goalOptions.map((goal) => (
                    <Button
                      key={goal.id}
                      variant="outline"
                      className="text-left h-auto py-2 px-3 justify-start hover:bg-accent/10"
                      onClick={() => handleExampleButtonClick(goal.placeholder, goal.id)}
                    >
                      <goal.icon className="w-4 h-4 mr-2 shrink-0 text-primary" />
                      <div>
                        <span className="block text-sm text-foreground">{goal.placeholder}</span>
                        <span className="block text-xs text-muted-foreground italic">({goal.title})</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case ExplorerStep.REFLECTION_PENDING:
        return commonLoading("Reflecting on your input...");
      case ExplorerStep.REVISING_SYSTEM_MODEL:
        return commonLoading("AI is revising the system model based on your feedback...");
      case ExplorerStep.REFLECTION_REVIEW:
        if (!reflectionResult) return commonLoading("Loading reflection...");
        return (
          <Card className="shadow-xl bg-card">
            <CardHeader>
                <CardTitle className="text-2xl text-primary">Step 2: Confirm Understanding & System Model</CardTitle>
                <CardDescription>Review the AI's interpretation and the extracted system model. You can suggest revisions or proceed to analyze system tensions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReflectionDisplay
                reflection={reflectionResult}
                showSystemModelDetails={reflectionViewMode === 'list'}
              />
              <Tabs value={reflectionViewMode} onValueChange={(value) => setReflectionViewMode(value as 'list' | 'graph')} className="w-full mt-4 mb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />System List View</TabsTrigger>
                  <TabsTrigger value="graph"><Workflow className="mr-2 h-4 w-4" />System Graph View</TabsTrigger>
                </TabsList>
              </Tabs>

              {reflectionViewMode === 'graph' && reflectionResult.systemModel && (
                <Card className="mt-0 shadow-md bg-card/50 border-input">
                  <CardHeader><CardTitle className="text-lg text-accent">System Model Graph</CardTitle></CardHeader>
                  <CardContent className="min-h-[300px] md:min-h-[400px]">
                    <SystemModelGraph systemModel={reflectionResult.systemModel} />
                  </CardContent>
                </Card>
              )}

            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
                 <p className="text-sm text-muted-foreground italic">{reflectionResult.confirmationQuestion}</p>
                 <Button
                    onClick={() => setIsSystemModelFeedbackDialogOpen(true)}
                    variant="outline"
                    disabled={isLoading || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL}
                    className="w-full"
                  >
                    <MessageSquareText className="mr-2 h-4 w-4" /> Suggest Revisions to System Model (AI)
                  </Button>
                <Button
                    onClick={handleConfirmReflectionAndIdentifyTensions}
                    disabled={isLoading || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL}
                    className="w-full bg-primary text-primary-foreground"
                >
                    {isLoading && uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                    Looks Good! Identify System Tensions
                </Button>
            </CardFooter>
          </Card>
        );
      case ExplorerStep.TENSION_ANALYSIS_PENDING:
        return commonLoading("Identifying System Tensions...");
      case ExplorerStep.TENSION_ANALYSIS_REVIEW:
        if (!tensionAnalysisResult || !reflectionResult) return commonLoading("Loading tension analysis...");
        return (
          <Card className="shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Step 3: Review System Tensions</CardTitle>
              <CardDescription>The AI has analyzed potential stakeholder conflicts, resource constraints, and trade-offs. Review these before generating impacts.</CardDescription>
            </CardHeader>
            <CardContent>
              <TensionAnalysisDisplay tensionAnalysis={tensionAnalysisResult} />
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
              <Button
                onClick={handleProceedFromTensionAnalysisToFirstOrder}
                disabled={isLoading || uiStep === ExplorerStep.ORDER_1_PENDING}
                className="w-full bg-primary text-primary-foreground"
              >
                {isLoading && uiStep === ExplorerStep.ORDER_1_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Acknowledge Tensions & Generate 1st Order Impacts
              </Button>
            </CardFooter>
          </Card>
        );

      case ExplorerStep.ORDER_1_PENDING: return commonLoading("Generating 1st Order Impacts...");
      case ExplorerStep.ORDER_2_PENDING: return commonLoading("Generating 2nd Order Impacts...");
      case ExplorerStep.ORDER_3_PENDING: return commonLoading("Generating 3rd Order Impacts...");
      case ExplorerStep.CONSOLIDATION_PENDING: return commonLoading("Analyzing for consolidations...");
      case ExplorerStep.GENERATING_SUMMARY: return commonLoading("Generating Narrative Summary...");

      case ExplorerStep.ORDER_1_REVIEW:
      case ExplorerStep.ORDER_2_REVIEW:
      case ExplorerStep.ORDER_3_REVIEW:
      case ExplorerStep.FINAL_REVIEW:
        const canSuggestConsolidationsNow =
          nodesForThisRenderPass.filter(n => n.nodeSystemType === 'GENERATED_IMPACT' && n.order === 1).length >= 2 ||
          nodesForThisRenderPass.filter(n => n.nodeSystemType === 'GENERATED_IMPACT' && n.order === 2).length >= 2 ||
          nodesForThisRenderPass.filter(n => n.nodeSystemType === 'GENERATED_IMPACT' && n.order === 3).length >= 2;


        const nextOrderMap = {
          [ExplorerStep.ORDER_1_REVIEW]: { orderText: "2nd", step: "Step 4" },
          [ExplorerStep.ORDER_2_REVIEW]: { orderText: "3rd", step: "Step 5" },
        };
        const nextOrderActionInfo = nextOrderMap[uiStep as keyof typeof nextOrderMap];

        return (
          <>
            <div className="my-4 flex flex-wrap justify-center gap-4">
              { (uiStep === ExplorerStep.ORDER_1_REVIEW || uiStep === ExplorerStep.ORDER_2_REVIEW || uiStep === ExplorerStep.ORDER_3_REVIEW) && canSuggestConsolidationsNow && (
                <Button
                  onClick={handleSuggestConsolidations}
                  disabled={isLoading || (consolidationSuggestions?.consolidationSuggestions?.length === 0 && consolidationSuggestions !== null)}
                  variant="outline"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {uiStep === ExplorerStep.CONSOLIDATION_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                  {consolidationSuggestions?.consolidationSuggestions?.length === 0 && consolidationSuggestions !== null ? "No New Suggestions" : "Suggest Consolidations"}
                </Button>
              )}
              { nextOrderActionInfo && (
                <Button onClick={handleProceedToNextOrder} disabled={isLoading} className="bg-primary text-primary-foreground">
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> {nextOrderActionInfo.step}: Generate {nextOrderActionInfo.orderText} Order Impacts
                </Button>
              )}
              { (uiStep === ExplorerStep.ORDER_3_REVIEW ) && (
                 <Button onClick={handleGenerateCascadeSummary} disabled={isLoading || isGeneratingSummary} className="bg-green-500 hover:bg-green-600 text-white">
                  {isGeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Step 6: Generate Summary & Finalize
                </Button>
              )}
              { (uiStep === ExplorerStep.FINAL_REVIEW) && (
                 <Button onClick={() => {
                    setUiStep(ExplorerStep.INITIAL);
                    setCurrentGoalType(goalOptions[3].id);
                    setCurrentAssertionText('');
                    setReflectionResult(null);
                    setTensionAnalysisResult(null);
                    setAllImpactNodes([]);
                    setGraphLinks([]);
                    setConsolidationSuggestions(null);
                    setCascadeSummary(null);
                    setSelectedNode(null);
                    setIsNodePanelOpen(false);
                    setIsGeneratingSummary(false);
                    setReflectionViewMode('list');
                 }} className="bg-blue-500 hover:bg-blue-600 text-white">
                  <RotateCcw className="mr-2 h-4 w-4" /> Start New Exploration
                </Button>
              )}
            </div>

            {consolidationSuggestions && consolidationSuggestions.consolidationSuggestions.length > 0 && (
              <ConsolidationSuggestionsDisplay
                suggestions={consolidationSuggestions}
                graphNodes={nodesForThisRenderPass}
                onApplyConsolidation={handleApplyConsolidation}
                onDismissSuggestion={handleDismissConsolidation}
              />
            )}
            {cascadeSummary && uiStep === ExplorerStep.FINAL_REVIEW && (
                <Card className="mt-6 shadow-xl bg-card text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center">
                            <FileText className="w-6 h-6 mr-2 text-accent" />
                            Cascade Narrative Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                           {cascadeSummary}
                        </div>
                    </CardContent>
                </Card>
            )}
          </>
        );
      default:
        return <p className="text-center">Current step: {ExplorerStep[uiStep] || uiStep}. Please proceed or refresh if stuck.</p>;
    }
  };

  const getGraphTitle = () => {
    if (uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING) return "Define Your Assertion";
    if ((uiStep === ExplorerStep.REFLECTION_REVIEW || uiStep === ExplorerStep.TENSION_ANALYSIS_REVIEW) && reflectionResult) return "Core Assertion Awaiting Impact Generation";

    if (visibleNodes.length > 0 && ![ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.REFLECTION_REVIEW, ExplorerStep.TENSION_ANALYSIS_PENDING, ExplorerStep.TENSION_ANALYSIS_REVIEW].includes(uiStep)) {
        if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) return "Impact Network (1st Order)";
        if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) return "Impact Network (Up to 2nd Order)";
        if (uiStep === ExplorerStep.ORDER_3_PENDING || uiStep === ExplorerStep.ORDER_3_REVIEW) return "Impact Network (Up to 3rd Order)";
        if (uiStep === ExplorerStep.GENERATING_SUMMARY) return "Impact Network (Full Map - Generating Summary)";
        if (uiStep === ExplorerStep.FINAL_REVIEW || (uiStep === ExplorerStep.CONSOLIDATION_PENDING && visibleNodes.length > 0)) return "Impact Network (Full Map)";
    }
    if (reflectionResult && allImpactNodes.some(n => n.order === 0)) return "Core Assertion Awaiting Impact Generation";
    return "Impact Network";
  };

  const getGraphDescription = () => {
    const currentStep = uiStep;

    if ([ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.TENSION_ANALYSIS_PENDING].includes(currentStep)) return "Enter your input to begin exploring its cascading impacts.";
    if ((currentStep === ExplorerStep.REFLECTION_REVIEW || currentStep === ExplorerStep.TENSION_ANALYSIS_REVIEW) && reflectionResult) {
        return `Review the AI's understanding above. The main impact graph will build once you proceed from ${currentStep === ExplorerStep.REFLECTION_REVIEW ? 'System Model review' : 'Tension Analysis review'}.`;
    }

    if (visibleNodes.length > 0 && ![ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.REFLECTION_REVIEW, ExplorerStep.TENSION_ANALYSIS_PENDING, ExplorerStep.TENSION_ANALYSIS_REVIEW].includes(currentStep)) {
        let orderText = 'all visible';
        if (currentStep === ExplorerStep.ORDER_1_REVIEW || currentStep === ExplorerStep.ORDER_1_PENDING) {
            orderText = 'displaying 1st order';
        } else if (currentStep === ExplorerStep.ORDER_2_REVIEW || currentStep === ExplorerStep.ORDER_2_PENDING) {
            orderText = 'displaying up to 2nd order';
        } else if (currentStep === ExplorerStep.ORDER_3_REVIEW || currentStep === ExplorerStep.ORDER_3_PENDING) {
            orderText = 'displaying up to 3rd order';
        } else if (currentStep === ExplorerStep.FINAL_REVIEW || currentStep === ExplorerStep.GENERATING_SUMMARY || (currentStep === ExplorerStep.CONSOLIDATION_PENDING && visibleNodes.length > 0) ) {
            orderText = 'displaying full map';
        }
         return `Explore the generated impacts. Click nodes for details. Currently ${orderText} impacts. Current step: ${ExplorerStep[currentStep] || currentStep}`;
    }
    if (reflectionResult && allImpactNodes.some(n => n.order === 0)) return "The main impact graph will build once you generate first-order impacts.";


    const earlyLoadingSteps = [ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.TENSION_ANALYSIS_PENDING, ExplorerStep.ORDER_1_PENDING, ExplorerStep.ORDER_2_PENDING, ExplorerStep.ORDER_3_PENDING, ExplorerStep.CONSOLIDATION_PENDING, ExplorerStep.GENERATING_SUMMARY];
    if (earlyLoadingSteps.includes(currentStep)) {
      return `Processing... Current step: ${ExplorerStep[currentStep] || currentStep}`;
    }

    return "Define your assertion to start building the impact network.";
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Zap className="w-10 h-10 mr-3 text-accent" /> Cascade Explorer
        </h1>
        <p className="text-muted-foreground mt-2">A tool for thinking through the ripple effects of ideas and decisions.</p>
      </header>

      <main className="flex-grow flex flex-col gap-6">
        {renderStepContent()}

        {visibleNodes.length > 0 &&
         uiStep !== ExplorerStep.INITIAL &&
         uiStep !== ExplorerStep.REFLECTION_PENDING &&
         uiStep !== ExplorerStep.REFLECTION_REVIEW &&
         uiStep !== ExplorerStep.REVISING_SYSTEM_MODEL &&
         uiStep !== ExplorerStep.TENSION_ANALYSIS_PENDING &&
         uiStep !== ExplorerStep.TENSION_ANALYSIS_REVIEW && (
          <Card className="shadow-xl bg-card flex-grow flex flex-col min-h-[600px] mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-primary flex items-center">
                <ListChecks className="mr-2 h-6 w-6 text-accent"/>
                {getGraphTitle()}
              </CardTitle>
              <CardDescription>
                {getGraphDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <NetworkGraph nodes={visibleNodes} links={visibleLinks} onNodeClick={handleNodeClick} width={800} height={700} />
            </CardContent>
          </Card>
        )}
      </main>

      {reflectionResult && (
        <SystemModelFeedbackDialog
            isOpen={isSystemModelFeedbackDialogOpen}
            onClose={() => setIsSystemModelFeedbackDialogOpen(false)}
            currentSystemModel={reflectionResult.systemModel}
            currentReflection={reflectionResult}
            onRevisionSubmit={handleSystemModelRevisionSubmit}
        />
      )}

      <NodeDetailPanel
        node={selectedNode}
        isOpen={isNodePanelOpen}
        onClose={() => setIsNodePanelOpen(false)}
        onUpdateValidity={handleUpdateValidity}
      />

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cascade Explorer. Powered by Firebase Studio &amp; Genkit.</p>
      </footer>
    </div>
  );
}

    