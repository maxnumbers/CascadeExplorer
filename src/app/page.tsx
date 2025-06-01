
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { reflectAssertion, type AIReflectAssertionOutput } from '@/ai/flows/assertion-reflection';
import { generateImpactsByOrder, type GenerateImpactsByOrderInput, type GenerateImpactsByOrderOutput as AIGenerateImpactsByOrderOutput } from '@/ai/flows/generate-impacts-by-order';
import { suggestImpactConsolidation, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import { generateCascadeSummary, type CascadeSummaryInput, type CascadeSummaryOutput } from '@/ai/flows/generate-cascade-summary';
import type { ImpactNode, ImpactLink, Impact, ImpactMappingInputForConsolidation, StructuredConcept, GoalOption, SystemModel } from '@/types/cascade';
import { ExplorerStep } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import SystemModelGraph from '@/components/cascade-explorer/SystemModelGraph'; // New Import
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb, ArrowRightCircle, ListChecks, FileText, RotateCcw, HelpCircle, Brain, Target, Search, Sparkles, List, Workflow } from 'lucide-react'; // Added List, Workflow
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // New Import for Tabs

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

  const [allImpactNodes, setAllImpactNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);

  const [uiStep, setUiStep] = useState<ExplorerStep>(ExplorerStep.INITIAL);
  const [currentGoalType, setCurrentGoalType] = useState<string>(goalOptions[3].id);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);

  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  const [cascadeSummary, setCascadeSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [reflectionViewMode, setReflectionViewMode] = useState<'list' | 'graph'>('list'); // New state for view mode

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
    setAllImpactNodes([]);
    setGraphLinks([]);
    setConsolidationSuggestions(null);
    setCurrentAssertionText(assertion);
    setCascadeSummary(null);
    setSelectedNode(null);
    setIsNodePanelOpen(false);
    setIsGeneratingSummary(false);
    setReflectionViewMode('list'); // Reset to list view
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

 const fetchImpactsForOrder = useCallback(async (targetOrder: 1 | 2 | 3, parentNodesForLinking: ImpactNode[]) => {
    if (!currentAssertionText || !reflectionResult) {
        toast({ title: "Missing Context", description: "Cannot generate impacts without a confirmed assertion.", variant: "destructive" });
        setUiStep(ExplorerStep.REFLECTION_REVIEW);
        return;
    }

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
        console.error("Invalid targetOrder in fetchImpactsForOrder:", targetOrder);
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
      };
      const result: AIGenerateImpactsByOrderOutput = await generateImpactsByOrder(aiInput);

      const rawGeneratedImpacts = result.generatedImpacts || [];

      const validGeneratedImpacts = rawGeneratedImpacts.filter(impact => {
        const hasEssentialFields = impact.id && impact.id.trim() !== "" &&
                                 impact.label && impact.label.trim() !== "" &&
                                 impact.description && impact.description.trim() !== "" &&
                                 impact.validity &&
                                 impact.reasoning && impact.reasoning.trim() !== "";
        return hasEssentialFields;
      });

      if (validGeneratedImpacts.length < rawGeneratedImpacts.length) {
        const diff = rawGeneratedImpacts.length - validGeneratedImpacts.length;
        console.warn(`Filtered out ${diff} malformed impact(s) from AI generation due to missing essential fields. Raw:`, rawGeneratedImpacts.filter(i => !validGeneratedImpacts.includes(i)));
        toast({
          title: "AI Data Inconsistency",
          description: `${diff} impact(s) from AI were incomplete (missing essential fields) and have been ignored.`,
          variant: "default",
          duration: 7000,
        });
      }

      const newNodesFromAI: ImpactNode[] = validGeneratedImpacts.map(impact => ({
        id: impact.id,
        label: impact.label,
        description: impact.description,
        validity: impact.validity,
        reasoning: impact.reasoning,
        parentId: undefined,
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
          description: `The AI generated ${rawGeneratedImpacts.length} impact(s), but none passed validation (missing essential fields). Please try again or refine the assertion if this persists.`,
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

      setAllImpactNodes(prevNodes => {
        const currentNodes = allImpactNodesRef.current;
        const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
        newNodesFromAI.forEach(n => nodeMap.set(n.id, n));
        return Array.from(nodeMap.values());
      });

      const newLinksGeneratedThisStep: ImpactLink[] = [];

      if (targetOrder === 1) {
          const coreNodeForLinking = allImpactNodesRef.current.find(n => n.id === CORE_ASSERTION_ID);
          if (coreNodeForLinking) {
              newNodesFromAI.forEach(newNode => {
                  newNode.parentId = CORE_ASSERTION_ID;
                  newLinksGeneratedThisStep.push({ source: coreNodeForLinking.id, target: newNode.id });
              });
          } else {
               console.error("Core assertion node not found for linking 1st order impacts. allImpactNodesRef.current IDs:", allImpactNodesRef.current.map(n => n.id));
          }
      } else if (targetOrder > 1 && parentNodesForLinking.length > 0) {
        newNodesFromAI.forEach((newNode, index) => {
            const parentNode = parentNodesForLinking[index % parentNodesForLinking.length];
            newNode.parentId = parentNode.id;
            const linkToAdd = { source: parentNode.id, target: newNode.id };
            newLinksGeneratedThisStep.push(linkToAdd);
        });
      } else if (targetOrder > 1 && parentNodesForLinking.length === 0) {
        console.warn(`Cannot link order ${targetOrder} impacts as parentNodesForLinking is empty.`);
      }

      setGraphLinks(prevLinks => {
        const currentLinks = graphLinksRef.current;
        const linkMap = new Map(currentLinks.map(l => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            return [`${sourceId}:::${targetId}`, l];
        }));
        newLinksGeneratedThisStep.forEach(l => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            linkMap.set(`${sourceId}:::${targetId}`, l);
        });
        return Array.from(linkMap.values());
      });

      setAllImpactNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        newNodesFromAI.forEach(updatedNode => {
          if (nodeMap.has(updatedNode.id)) {
            nodeMap.set(updatedNode.id, { ...nodeMap.get(updatedNode.id)!, ...updatedNode });
          } else {
            nodeMap.set(updatedNode.id, updatedNode);
          }
        });
        return Array.from(nodeMap.values());
      });

      setUiStep(currentReviewStep);
    } catch (error: any) {
      console.error(`Error generating ${targetOrder}-order impacts:`, error);
      let errorMessage = `Failed to generate ${targetOrder}-order impacts. Please try again.`;
       if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = `AI Service Error: The model seems to be busy or unavailable for generating ${targetOrder}-order impacts. Please try again in a few moments.`;
      } else if (error.message) {
        errorMessage = `Impact Generation Error (Order ${targetOrder}): ${error.message}`;
      }
      toast({ title: "Error Generating Impacts", description: errorMessage, variant: "destructive", duration: 7000 });
      if (targetOrder === 1) setUiStep(ExplorerStep.REFLECTION_REVIEW);
      else if (targetOrder === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else if (targetOrder === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else setUiStep(ExplorerStep.INITIAL);
    }
  }, [currentAssertionText, reflectionResult, toast]);


  const handleConfirmReflectionAndFetchFirstOrder = useCallback(async () => {
    if (!reflectionResult || !currentAssertionText) return;

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
      properties: {
        fullAssertionText: currentAssertionText,
        systemModel: reflectionResult.systemModel,
        keyConcepts: reflectionResult.keyConcepts || [],
      }
    };

    setAllImpactNodes([coreNode]);
    setGraphLinks([]);
    await Promise.resolve();

    await fetchImpactsForOrder(1, [coreNode]);
  }, [reflectionResult, currentAssertionText, fetchImpactsForOrder]);


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


  const handleGenerateCascadeSummary = async () => {
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
        setUiStep(ExplorerStep.ORDER_3_REVIEW);
    } finally {
        setIsGeneratingSummary(false);
    }
  };


  const handleProceedToNextOrder = useCallback(async () => {
    let nextOrderToFetch: 2 | 3 | undefined;
    let parentNodesForLinking: ImpactNode[] = [];

    const currentNodesSnapshot = allImpactNodesRef.current;

    if (uiStep === ExplorerStep.ORDER_1_REVIEW) {
      nextOrderToFetch = 2;
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT');
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) {
      nextOrderToFetch = 3;
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT');
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) {
      await handleGenerateCascadeSummary();
      return;
    } else if (uiStep === ExplorerStep.FINAL_REVIEW) {
      toast({ title: "Exploration Complete", description: "You have completed the exploration process. Start a new one or review the summary."});
      return;
    }

    if (nextOrderToFetch && typeof nextOrderToFetch === 'number') {
      if (parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate ${nextOrderToFetch === 2 ? '2nd' : '3rd'} order impacts as no impacts from the previous order exist. You can try to finalize the summary with the current map.`, variant: "default" });
        if (nextOrderToFetch === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
        else if (nextOrderToFetch === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
        return;
      }
      await fetchImpactsForOrder(nextOrderToFetch, parentNodesForLinking);
    } else {
        console.warn("handleProceedToNextOrder called from unexpected uiStep or nextOrderToFetch not set:", uiStep);
    }
  }, [uiStep, fetchImpactsForOrder, toast, handleGenerateCascadeSummary]);


  const handleSuggestConsolidations = async () => {
    const currentNodesForAICall = allImpactNodesRef.current;

    const impactsForConsolidation: ImpactMappingInputForConsolidation = {
      firstOrder: currentNodesForAICall.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
      secondOrder: currentNodesForAICall.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
      thirdOrder: currentNodesForAICall.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
    };

    const canConsolidateFirst = impactsForConsolidation.firstOrder.length >= 2;
    const canConsolidateSecond = impactsForConsolidation.secondOrder.length >= 2;
    const canConsolidateThird = impactsForConsolidation.thirdOrder.length >= 2;

    if (!canConsolidateFirst && !canConsolidateSecond && !canConsolidateThird) {
      toast({ title: "Not Enough Impacts", description: "Not enough impacts in any single order to analyze for consolidation (minimum 2 per order).", variant: "default" });
      return;
    }

    const previousStep = uiStep;
    setUiStep(ExplorerStep.CONSOLIDATION_PENDING);
    try {
      const result = await suggestImpactConsolidation(impactsForConsolidation);
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
    const { originalImpactIds, consolidatedImpact: suggestedConsolidatedImpact } = suggestion;

    if (!originalImpactIds || originalImpactIds.length < 2) {
        console.error("Attempted to apply invalid consolidation suggestion (pre-flight check failed):", suggestion);
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
            // Skip internal links between nodes being consolidated
        } else if (originalImpactIds.includes(sourceId)) {
            childLinksToReParent.push({ source: newGraphNode.id, target: targetId });
        } else if (originalImpactIds.includes(targetId)) {
            parentLinksToReParent.push({ source: sourceId, target: newGraphNode.id });
        } else {
            finalNewLinks.push(link);
        }
    });

    finalNewLinks.push(...childLinksToReParent, ...parentLinksToReParent);

    const hasParentLink = finalNewLinks.some(l => (typeof l.target === 'object' ? (l.target as ImpactNode).id : String(l.target)) === newGraphNode.id);

    if (!hasParentLink && newGraphNode.id !== CORE_ASSERTION_ID && newGraphNode.order > 0) {
        let parentAssigned = false;
        if (newGraphNode.parentId && nextNodes.some(n => n.id === newGraphNode.parentId && n.order === newGraphNode.order - 1)) {
            finalNewLinks.push({ source: newGraphNode.parentId, target: newGraphNode.id });
            parentAssigned = true;
        } else {
            const potentialParents = nextNodes.filter(n => n.order === newGraphNode.order - 1 && n.id !== newGraphNode.id && (n.nodeSystemType === 'GENERATED_IMPACT' || n.nodeSystemType === 'CORE_ASSERTION'));
             if (newGraphNode.order === 1) {
                const coreParent = nextNodes.find(n => n.id === CORE_ASSERTION_ID);
                if (coreParent) {
                    newGraphNode.parentId = CORE_ASSERTION_ID;
                    finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                    parentAssigned = true;
                }
            } else if (potentialParents.length > 0) {
                const chosenParent = potentialParents[0];
                newGraphNode.parentId = chosenParent.id;
                finalNewLinks.push({ source: chosenParent.id, target: newGraphNode.id });
                parentAssigned = true;
            }
        }
        if (!parentAssigned) {
           console.warn(`[Consolidation Fallback] Consolidated node ${newGraphNode.id} (Order ${newGraphNode.order}) could not be deterministically linked to a preferred parent. Its suggested parentId was: ${newGraphNode.parentId}. Linking to CORE_ASSERTION as last resort if applicable.`);
            const coreParent = nextNodes.find(n => n.id === CORE_ASSERTION_ID);
            if (coreParent && newGraphNode.order >=1) {
                 newGraphNode.parentId = CORE_ASSERTION_ID;
                 finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                 console.warn(`[Consolidation Fallback] Consolidated node ${newGraphNode.id} linked to CORE_ASSERTION as fallback.`);
            } else {
                console.error(`[Consolidation Fallback] Failed to link consolidated node ${newGraphNode.id} to any parent, including CORE_ASSERTION.`);
            }
        }
    }
    nextNodes = nextNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n);


    const uniqueLinks = new Map<string, ImpactLink>();
    finalNewLinks.forEach(link => {
      const src = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
      const tgt = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
      if (src === tgt) return;
      uniqueLinks.set(`${src}:::${tgt}`, { source: src, target: tgt });
    });
    const dedupedFinalNewLinks = Array.from(uniqueLinks.values());

    setAllImpactNodes(nextNodes);
    setGraphLinks(dedupedFinalNewLinks);

    let dependentSuggestionsRemovedCount = 0;
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      const suggestionsToKeep = prev.consolidationSuggestions.filter(s => {
        if (s.consolidatedImpact.id === suggestion.consolidatedImpact.id) {
          return false;
        }
        const isDependent = s.originalImpactIds.some(id => originalImpactIds.includes(id));
        if (isDependent) {
          dependentSuggestionsRemovedCount++;
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
    const currentNodes = allImpactNodes;

    if (uiStep === ExplorerStep.INITIAL && !reflectionResult) return [];
    if (uiStep === ExplorerStep.REFLECTION_PENDING) return [];
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) {
      // For reflection review, we only want the core assertion node for the main graph
      // The system model graph will be its own separate visualization
      return currentNodes.filter(n => n.order === 0);
    }

    const maxVisibleOrderMap: Partial<Record<ExplorerStep, number>> = {
        [ExplorerStep.ORDER_1_PENDING]: 0,
        [ExplorerStep.ORDER_1_REVIEW]: 1,
        [ExplorerStep.ORDER_2_PENDING]: 1,
        [ExplorerStep.ORDER_2_REVIEW]: 2,
        [ExplorerStep.ORDER_3_PENDING]: 2,
        [ExplorerStep.ORDER_3_REVIEW]: 3,
        [ExplorerStep.CONSOLIDATION_PENDING]: 3,
        [ExplorerStep.GENERATING_SUMMARY]: 3,
        [ExplorerStep.FINAL_REVIEW]: 3,
    };

    const maxVisibleOrder = maxVisibleOrderMap[uiStep] ?? (currentNodes.length > 0 ? 3 : -1);

    if (maxVisibleOrder === -1 && currentNodes.length > 0 && reflectionResult) {
        return currentNodes.filter(n => n.order === 0);
    }
    return currentNodes.filter(n => n.order <= maxVisibleOrder);
  }, [uiStep, reflectionResult, allImpactNodes]);


  const visibleLinks = useMemo(() => {
    if (!visibleNodes.length) return [];
    const currentLinksFromState = graphLinks;
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

    const nodesForThisRenderPass = allImpactNodes;

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
      case ExplorerStep.REFLECTION_REVIEW:
        if (!reflectionResult) return commonLoading("Loading reflection...");
        return (
          <Card className="shadow-xl bg-card">
            <CardHeader>
                <CardTitle className="text-2xl text-primary">Step 2: Confirm Understanding</CardTitle>
                <CardDescription>Review the AI's interpretation and the extracted system model.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReflectionDisplay
                reflection={reflectionResult}
                showSystemModelDetails={reflectionViewMode === 'list'} // Control visibility
              />
              <Tabs value={reflectionViewMode} onValueChange={(value) => setReflectionViewMode(value as 'list' | 'graph')} className="w-full mt-4 mb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />List View</TabsTrigger>
                  <TabsTrigger value="graph"><Workflow className="mr-2 h-4 w-4" />Graph View</TabsTrigger>
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
                    onClick={handleConfirmReflectionAndFetchFirstOrder} 
                    disabled={isLoading || uiStep === ExplorerStep.ORDER_1_PENDING} 
                    className="w-full bg-primary text-primary-foreground"
                >
                    {isLoading || uiStep === ExplorerStep.ORDER_1_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Correct. Generate 1st Order Impacts
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
          [ExplorerStep.ORDER_1_REVIEW]: { orderText: "2nd", step: "Step 3" },
          [ExplorerStep.ORDER_2_REVIEW]: { orderText: "3rd", step: "Step 4" },
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
                 <Button onClick={handleProceedToNextOrder} disabled={isLoading || isGeneratingSummary} className="bg-green-500 hover:bg-green-600 text-white">
                  {isGeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Step 5: Generate Summary & Finalize
                </Button>
              )}
              { (uiStep === ExplorerStep.FINAL_REVIEW) && (
                 <Button onClick={() => {
                    setUiStep(ExplorerStep.INITIAL);
                    setCurrentGoalType(goalOptions[3].id);
                    setCurrentAssertionText('');
                    setReflectionResult(null);
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
    if (uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING) return "Define Your Assertion";
    // For REFLECTION_REVIEW, the main "Impact Network" graph isn't shown yet,
    // as it only contains the core node. The System Model graph is handled separately.
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Core Assertion Awaiting Impact Generation";


    if (visibleNodes.length > 0 && (uiStep !== ExplorerStep.REFLECTION_PENDING && uiStep !== ExplorerStep.INITIAL && uiStep !== ExplorerStep.REFLECTION_REVIEW)) {
        if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) return "Impact Network (1st Order)";
        if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) return "Impact Network (Up to 2nd Order)";
        if (uiStep === ExplorerStep.ORDER_3_PENDING || uiStep === ExplorerStep.ORDER_3_REVIEW) return "Impact Network (Up to 3rd Order)";
        if (uiStep === ExplorerStep.GENERATING_SUMMARY) return "Impact Network (Full Map - Generating Summary)";
        if (uiStep === ExplorerStep.FINAL_REVIEW || (uiStep === ExplorerStep.CONSOLIDATION_PENDING && visibleNodes.length > 0)) return "Impact Network (Full Map)";
    }
     // Fallback if no other condition met but nodes exist (e.g., after reflection review before 1st order loads)
    if (reflectionResult && allImpactNodes.some(n => n.order === 0)) return "Core Assertion Awaiting Impact Generation";
    return "Impact Network";
  };

  const getGraphDescription = () => {
    const currentStep = uiStep;

    if (currentStep === ExplorerStep.INITIAL || currentStep === ExplorerStep.REFLECTION_PENDING ) return "Enter your input to begin exploring its cascading impacts.";
    if (currentStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Review the AI's understanding above. The main impact graph will build once you proceed.";

    if (visibleNodes.length > 0 && (currentStep !== ExplorerStep.REFLECTION_PENDING && currentStep !== ExplorerStep.INITIAL && currentStep !== ExplorerStep.REFLECTION_REVIEW)) {
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


    const earlyLoadingSteps = [ExplorerStep.REFLECTION_PENDING, ExplorerStep.ORDER_1_PENDING, ExplorerStep.ORDER_2_PENDING, ExplorerStep.ORDER_3_PENDING, ExplorerStep.CONSOLIDATION_PENDING, ExplorerStep.GENERATING_SUMMARY];
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

        {/* Only show main impact network graph AFTER reflection review step */}
        {visibleNodes.length > 0 && uiStep !== ExplorerStep.INITIAL && uiStep !== ExplorerStep.REFLECTION_PENDING && uiStep !== ExplorerStep.REFLECTION_REVIEW && (
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
