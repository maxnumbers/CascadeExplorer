
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { reflectAssertion, type AIReflectAssertionOutput } from '@/ai/flows/assertion-reflection';
import { inferInitialQualitativeStates, type InferInitialQualitativeStateInput, type InferInitialQualitativeStateOutput } from '@/ai/flows/infer-initial-qualitative-state';
import { identifyTensions, type TensionAnalysisInput, type TensionAnalysisOutput } from '@/ai/flows/tension-identification';
import { generateImpactsByOrder, type AIGenerateImpactsByOrderInput, type GeneratePhaseConsequencesOutput } from '@/ai/flows/generate-impacts-by-order';
import { suggestImpactConsolidation, type SuggestImpactConsolidationInput, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import { generateCascadeSummary, type CascadeSummaryInput, type CascadeSummaryOutput } from '@/ai/flows/generate-cascade-summary';
import { reviseSystemModelWithFeedback, type ReviseSystemModelInput, type ReviseSystemModelOutput } from '@/ai/flows/revise-system-model-with-feedback';
import type { ImpactNode, ImpactLink, Impact, StructuredConcept, GoalOption, SystemModel } from '@/types/cascade';
import { ExplorerStep, CORE_ASSERTION_ID } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import { TensionAnalysisDisplay } from '@/components/cascade-explorer/TensionAnalysisDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import SystemModelGraph from '@/components/cascade-explorer/SystemModelGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { SystemModelFeedbackDialog } from '@/components/cascade-explorer/SystemModelFeedbackDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb, ArrowRightCircle, ListChecks, FileText, RotateCcw, HelpCircle, Brain, Target, Search, Sparkles, List, Workflow, MessageSquareText, Edit3, ShieldAlert, AlertTriangle, Info, Settings2, LinkIcon, Package, Users, TrendingUp, ArrowRightLeft, ThumbsUp, ThumbsDown, MinusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const goalOptions: GoalOption[] = [
  {
    id: 'decision',
    title: "Test a Decision",
    description: "See potential outcomes before committing to a choice.",
    promptLabel: "What decision are you considering?",
    placeholder: "Our company is considering a major shift to invest heavily in renewable energy for all operations within the next 10 years. This involves significant capital expenditure and requires retraining our workforce. Key groups involved include our investors, employees, local communities, and environmental NGOs. The primary aim is to improve long-term sustainability and reduce carbon emissions, while being mindful of short-term profit margins and operational efficiency.",
    icon: HelpCircle,
  },
  {
    id: 'pitch',
    title: "Strengthen a Pitch",
    description: "Build an airtight argument for your idea or proposal.",
    promptLabel: "What idea or proposal are you trying to convince someone of?",
    placeholder: "To revitalize our city's downtown core, we should implement a 'Pedestrian-First' initiative. This involves converting Main Street into a car-free zone on weekends, investing in public art installations, and offering tax incentives to encourage small businesses. The main players are the City Council, local business owners, city residents, and an urban planning consultancy. The goal is to boost local economic activity, improve community wellbeing, and enhance cultural vibrancy, while considering impacts on traffic and current business models.",
    icon: Brain,
  },
  {
    id: 'risk',
    title: "Find Blind Spots",
    description: "Uncover hidden risks and unintended consequences of a plan.",
    promptLabel: "What plan, change, or existing situation are you analyzing for risks?",
    placeholder: "Our tech company plans to launch a new AI-powered social media platform. While the goal is rapid user growth, we need to analyze risks related to user data security, algorithmic fairness, the potential for misinformation spread, and the mental well-being of users. Other involved parties include advertisers, regulatory bodies, and competitor platforms. We also need to consider strain on our engineering capacity and server infrastructure.",
    icon: Search,
  },
  {
    id: 'general',
    title: "Explore an Assertion",
    description: "Conduct a general exploration of an idea's cascading impacts.",
    promptLabel: "Enter your assertion or idea:",
    placeholder: "The widespread adoption of fully Autonomous Vehicles for public and private transportation will fundamentally transform urban density, affect labor markets for transportation workers, and change the concept of mobility access. This will impact city planners, influence infrastructure investment, affect road safety, and potentially create new business opportunities while displacing existing industries. Consider the interplay between AV developers, regulatory bodies, and public trust.",
    icon: Target,
  }
];


export default function CascadeExplorerPage() {
  const [currentAssertionText, setCurrentAssertionText] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<AIReflectAssertionOutput | null>(null);
  const [initialSystemStatesSummary, setInitialSystemStatesSummary] = useState<string | null>(null);
  const [currentSystemQualitativeStates, setCurrentSystemQualitativeStates] = useState<Record<string, string> | null>(null);
  const [previousSystemQualitativeStates, setPreviousSystemQualitativeStates] = useState<Record<string, string> | null>(null);
  const [allFeedbackLoopInsights, setAllFeedbackLoopInsights] = useState<string[]>([]);
  const [tensionAnalysisResult, setTensionAnalysisResult] = useState<TensionAnalysisOutput | null>(null);

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
  const [advancedViewEnabled, setAdvancedViewEnabled] = useState<boolean>(false);


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
    ExplorerStep.INFERRING_INITIAL_STATE,
    ExplorerStep.TENSION_ANALYSIS_PENDING,
    ExplorerStep.ORDER_1_PENDING, 
    ExplorerStep.ORDER_2_PENDING, 
    ExplorerStep.ORDER_3_PENDING, 
    ExplorerStep.CONSOLIDATION_PENDING,
    ExplorerStep.GENERATING_SUMMARY,
  ].includes(uiStep), [uiStep]);

  const resetAllExplorationState = () => {
    setCurrentAssertionText('');
    setReflectionResult(null);
    setInitialSystemStatesSummary(null);
    setCurrentSystemQualitativeStates(null);
    setPreviousSystemQualitativeStates(null); 
    setAllFeedbackLoopInsights([]);
    setTensionAnalysisResult(null);
    setAllImpactNodes([]);
    setGraphLinks([]);
    setConsolidationSuggestions(null);
    setCascadeSummary(null);
    setSelectedNode(null);
    setIsNodePanelOpen(false);
    setIsGeneratingSummary(false);
    setReflectionViewMode('list');
    setIsSystemModelFeedbackDialogOpen(false);
    // setAdvancedViewEnabled(false); // Optionally reset this too
    setCurrentGoalType(goalOptions[3].id);
    setUiStep(ExplorerStep.INITIAL);
  }

  const handleExampleButtonClick = (exampleText: string, goalId: string) => {
    resetAllExplorationState(); 
    setCurrentAssertionText(exampleText);
    setCurrentGoalType(goalId);
    toast({ title: "Example Loaded", description: `"${exampleText.substring(0,50)}..." loaded into input. Associated context: ${goalOptions.find(g=>g.id === goalId)?.title || 'General'}.`, duration: 4000 });
  };

  const handleAssertionSubmit = async (assertion: string) => {
    resetAllExplorationState(); 
    setUiStep(ExplorerStep.REFLECTION_PENDING);
    setCurrentAssertionText(assertion);
    try {
      const result = await reflectAssertion({ assertion });
      setReflectionResult(result as AIReflectAssertionOutput); 
      setUiStep(ExplorerStep.REFLECTION_REVIEW);
    } catch (error: any) {
      console.error("Error reflecting assertion:", error);
      let errorMessage = "Failed to get AI reflection. Please try again.";
      if (error.message && (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.includes("overloaded"))) {
        errorMessage = "AI Service Error: The model seems to be busy or unavailable for assertion reflection. Please try again in a few moments.";
      } else if (error.message && error.message.includes("An unexpected response")) {
        errorMessage = "An unexpected response was received from the AI server. Please check Genkit server logs for details and try again.";
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
        setReflectionResult(prev => {
            if (!prev) return null;
            const newSystemModel = result.revisedSystemModel;
            // Preserve existing qualitative states on revised model's stocks if names match
            const currentQualitativeStates = currentSystemQualitativeStates || {};
            const updatedStocksWithStates = newSystemModel.stocks.map(stock => {
                const existingState = currentQualitativeStates[stock.name];
                return existingState ? { ...stock, qualitativeState: existingState } : stock;
            });
            return { ...prev, systemModel: { ...newSystemModel, stocks: updatedStocksWithStates }};
        });
        toast({ title: "System Model Revised by AI", description: result.revisionSummary || "AI has revised the system model based on your feedback.", duration: 6000 });
      } else {
        toast({ title: "Revision Failed", description: result.revisionSummary || "AI could not revise the model as requested.", variant: "destructive", duration: 6000 });
      }
      return result;
    } catch (error: any) {
      console.error("Error revising system model:", error);
      let errorMessage = "Failed to revise system model. Please try again.";
       if (error.message && error.message.includes("An unexpected response")) {
        errorMessage = "An unexpected response was received from the AI server during model revision. Check Genkit server logs.";
      } else if (error.message) {
        errorMessage = `Revision Error: ${error.message}`;
      }
      toast({ title: "Error Revising System Model", description: errorMessage, variant: "destructive", duration: 7000 });
      return { revisedSystemModel: reflectionResult.systemModel, revisionSummary: `Error: ${errorMessage}` };
    } finally {
      setUiStep(ExplorerStep.REFLECTION_REVIEW); 
    }
  };

  const mapImpactNodeToImpact = useCallback((node: ImpactNode): Impact => {
    const keyConcepts = node.keyConcepts || (node.properties?.keyConcepts as StructuredConcept[] | undefined) || [];
    const attributes = node.attributes || (node.properties?.attributes as string[] | undefined) || [];

    return {
        id: node.id,
        label: node.label,
        description: node.description,
        validity: node.validity,
        reasoning: node.reasoning,
        parentIds: node.parentIds || [], 
        keyConcepts: keyConcepts,
        attributes: attributes,
        causalReasoning: node.causalReasoning,
        order: String(node.order) as '0' | '1' | '2' | '3',
    };
  }, []);


  const handleIdentifyTensions = useCallback(async (
    currentReflectionForTensions: AIReflectAssertionOutput,
    assertionTextForTensions: string
  ) => {
    if (!currentReflectionForTensions?.systemModel) {
        toast({ title: "Missing System Model", description: "Cannot identify tensions without a system model.", variant: "destructive" });
        setUiStep(ExplorerStep.INITIAL_STATE_REVIEW);
        return;
    }
    setUiStep(ExplorerStep.TENSION_ANALYSIS_PENDING);
    setTensionAnalysisResult(null);

    try {
        const tensionInput: TensionAnalysisInput = {
            assertionText: assertionTextForTensions,
            systemModel: currentReflectionForTensions.systemModel,
        };
        const result = await identifyTensions(tensionInput);
        setTensionAnalysisResult(result);
        setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
    } catch (error: any) {
        console.error("Error identifying tensions:", error);
        let errorMessage = "Failed to identify system tensions. Please try again.";
        if (error.message && error.message.includes("An unexpected response")) {
            errorMessage = "An unexpected response was received from the AI server during tension analysis. Check Genkit server logs.";
        } else if (error.message) {
            errorMessage = `Tension Analysis Error: ${error.message}`;
        }
        toast({ title: "Error Identifying Tensions", description: errorMessage, variant: "destructive", duration: 7000 });
        setUiStep(ExplorerStep.INITIAL_STATE_REVIEW); 
    }
  }, [toast, setUiStep, setTensionAnalysisResult]);


  const handleConfirmReflectionAndInferInitialStates = useCallback(async () => {
    if (!reflectionResult || !currentAssertionText || !reflectionResult.systemModel) {
        toast({ title: "Missing Context", description: "Cannot infer initial states without a confirmed assertion and system model.", variant: "destructive" });
        setUiStep(ExplorerStep.REFLECTION_REVIEW);
        return;
    }
    setUiStep(ExplorerStep.INFERRING_INITIAL_STATE);
    setPreviousSystemQualitativeStates(null); 

    try {
        const inferInput: InferInitialQualitativeStateInput = {
            assertionText: currentAssertionText, 
            systemModel: reflectionResult.systemModel, 
        };
        const stateInferenceResult = await inferInitialQualitativeStates(inferInput);
        
        const updatedReflectionWithStates = { 
            ...reflectionResult, 
            systemModel: stateInferenceResult.systemModelWithQualitativeStates 
        };
        setReflectionResult(updatedReflectionWithStates);
        setInitialSystemStatesSummary(stateInferenceResult.initialStatesSummary);

        const initialStates: Record<string, string> = {};
        stateInferenceResult.systemModelWithQualitativeStates.stocks.forEach(stock => {
            if (stock.qualitativeState) {
                initialStates[stock.name] = stock.qualitativeState;
            }
        });
        setCurrentSystemQualitativeStates(initialStates);
        
        await handleIdentifyTensions(updatedReflectionWithStates, currentAssertionText);

    } catch (error: any) {
        console.error("Error inferring initial qualitative states:", error);
        let errorMessage = "Failed to infer initial system states. Please try again.";
        if (error.message && error.message.includes("An unexpected response")) {
            errorMessage = "An unexpected response was received from the AI server during state inference. Check Genkit server logs.";
        } else if (error.message) {
            errorMessage = `State Inference Error: ${error.message}`;
        }
        toast({ title: "Error Inferring Initial States", description: errorMessage, variant: "destructive", duration: 7000 });
        setUiStep(ExplorerStep.REFLECTION_REVIEW); 
    }
  }, [reflectionResult, currentAssertionText, toast, setUiStep, setReflectionResult, setInitialSystemStatesSummary, setCurrentSystemQualitativeStates, handleIdentifyTensions, setPreviousSystemQualitativeStates]);
  
  const fetchImpactsForOrder = useCallback(async (targetPhase: '1' | '2' | '3', parentNodesForLinking: ImpactNode[]) => {
    if (!currentAssertionText || !reflectionResult || !reflectionResult.systemModel || !currentSystemQualitativeStates) {
        toast({ title: "Missing Context", description: "Cannot generate phase consequences without assertion, system model, and current qualitative states.", variant: "destructive" });
        setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW); 
        return;
    }

    const coreNodeForProps = allImpactNodesRef.current.find(n => n.id === CORE_ASSERTION_ID);
    const currentTensionAnalysisToUse = tensionAnalysisResult || coreNodeForProps?.properties?.tensionAnalysis;

    if (targetPhase === '1' && !currentTensionAnalysisToUse) {
        toast({ title: "Missing Tension Analysis", description: "Tension analysis is required before generating Phase 1 consequences.", variant: "destructive" });
        setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
        return;
    }
    
    let currentLoadingStep: ExplorerStep = ExplorerStep.ORDER_1_PENDING; 
    let currentReviewStep: ExplorerStep = ExplorerStep.ORDER_1_REVIEW;

    if (targetPhase === '1') { /* Default */ }
    else if (targetPhase === '2') {
        currentLoadingStep = ExplorerStep.ORDER_2_PENDING; currentReviewStep = ExplorerStep.ORDER_2_REVIEW;
    } else if (targetPhase === '3') {
        currentLoadingStep = ExplorerStep.ORDER_3_PENDING; currentReviewStep = ExplorerStep.ORDER_3_REVIEW;
    }

    if ((targetPhase === '2' || targetPhase === '3') && parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate Phase ${targetPhase} consequences as no impacts from the previous phase exist.`, variant: "default" });
        if (targetPhase === '2') setUiStep(ExplorerStep.ORDER_1_REVIEW);
        else if (targetPhase === '3') setUiStep(ExplorerStep.ORDER_2_REVIEW);
        return;
    }

    setUiStep(currentLoadingStep);
    setConsolidationSuggestions(null); 
    setPreviousSystemQualitativeStates(currentSystemQualitativeStates); 

    try {
      const aiInput: AIGenerateImpactsByOrderInput = {
        assertionText: reflectionResult.summary, 
        targetPhase: targetPhase,
        parentImpacts: targetPhase > '1' ? parentNodesForLinking.map(mapImpactNodeToImpact) : undefined,
        currentSystemQualitativeStates: currentSystemQualitativeStates,
        tensionAnalysis: currentTensionAnalysisToUse || undefined,
        systemModel: reflectionResult.systemModel, 
      };
      const result: GeneratePhaseConsequencesOutput = await generateImpactsByOrder(aiInput);

      const rawGeneratedImpacts = result.generatedImpacts || [];
       const validGeneratedImpacts = rawGeneratedImpacts.filter(impact => {
        const hasEssentialFields = impact.id && impact.id.trim() !== "" &&
                                 impact.label && impact.label.trim() !== "" &&
                                 impact.description && impact.description.trim() !== "" &&
                                 impact.validity &&
                                 impact.reasoning && impact.reasoning.trim() !== "";
        const parentIdsCheck = targetPhase === '1' || (impact.parentIds !== undefined && Array.isArray(impact.parentIds));
        return hasEssentialFields && parentIdsCheck;
      });

      const newNodesFromAI: ImpactNode[] = validGeneratedImpacts.map(impact => ({
        id: impact.id,
        label: impact.label,
        description: impact.description,
        validity: impact.validity,
        reasoning: impact.reasoning,
        parentIds: impact.parentIds || [], 
        keyConcepts: impact.keyConcepts || [],
        attributes: impact.attributes || [],
        causalReasoning: impact.causalReasoning,
        order: parseInt(targetPhase, 10) as 1 | 2 | 3, 
        nodeSystemType: 'GENERATED_IMPACT',
        properties: {
            keyConcepts: impact.keyConcepts || [],
            attributes: impact.attributes || [],
        },
      }));
      
      const newLinksGeneratedThisStep: ImpactLink[] = [];
      const finalNewNodesWithUpdatedParentIds: ImpactNode[] = [];

      newNodesFromAI.forEach(newNode => {
          finalNewNodesWithUpdatedParentIds.push(newNode);
          if (newNode.parentIds && newNode.parentIds.length > 0) {
              newNode.parentIds.forEach(aiParentId => {
                  const parentNodeFromGraph = allImpactNodesRef.current.find(n => n.id === aiParentId && n.order === parseInt(targetPhase, 10) - 1);
                  if (parentNodeFromGraph) {
                      newLinksGeneratedThisStep.push({ source: parentNodeFromGraph.id, target: newNode.id });
                  } else {
                      const fallbackParentNode = parentNodesForLinking.find(p => p.id === aiParentId);
                      if (fallbackParentNode) {
                           newLinksGeneratedThisStep.push({ source: fallbackParentNode.id, target: newNode.id });
                           toast({ title: "Linking Notice", description: `Impact "${newNode.label}" linked to AI-provided parent "${aiParentId}" from available context.`, variant: "default", duration: 7000 });
                      } else {
                          toast({ title: "Orphaned Link Attempt", description: `Impact "${newNode.label}" could not link to parent "${aiParentId}" as it was not found in the previous phase or context.`, variant: "destructive", duration: 7000 });
                      }
                  }
              });
          } else if (targetPhase === '1') {
              newLinksGeneratedThisStep.push({ source: CORE_ASSERTION_ID, target: newNode.id });
              newNode.parentIds = [CORE_ASSERTION_ID]; 
          } else if (newNode.parentIds?.length === 0 && targetPhase > '1' && parentNodesForLinking.length > 0) {
              toast({ title: "No Explicit Parents", description: `Impact "${newNode.label}" (Phase ${targetPhase}) was generated without explicit parent links from AI.`, variant: "default", duration: 7000 });
          }
      });

      setAllImpactNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        finalNewNodesWithUpdatedParentIds.forEach(updatedNode => nodeMap.set(updatedNode.id, updatedNode));
        return Array.from(nodeMap.values());
      });
      setGraphLinks(prevLinks => {
          const linkMap = new Map(prevLinks.map(l => [`${typeof l.source === 'object' ? l.source.id : l.source}-${typeof l.target === 'object' ? l.target.id : l.target}`, l]));
          newLinksGeneratedThisStep.forEach(l => linkMap.set(`${typeof l.source === 'object' ? l.source.id : l.source}-${typeof l.target === 'object' ? l.target.id : l.target}`,l));
          return Array.from(linkMap.values());
      });

      if (result.updatedSystemQualitativeStates) {
        const newQualitativeStates = {
            ...(currentSystemQualitativeStates || {}), 
            ...result.updatedSystemQualitativeStates 
        };
        setCurrentSystemQualitativeStates(newQualitativeStates);
        
        setReflectionResult(prev => {
            if (!prev || !prev.systemModel) return prev;
            const updatedStocks = prev.systemModel.stocks.map(stock => ({
                ...stock,
                qualitativeState: newQualitativeStates[stock.name] || stock.qualitativeState,
            }));
            return { ...prev, systemModel: { ...prev.systemModel, stocks: updatedStocks }};
        });
      }
      if (result.feedbackLoopInsights && result.feedbackLoopInsights.length > 0) {
        setAllFeedbackLoopInsights(prevInsights => [...new Set([...prevInsights, ...result.feedbackLoopInsights!])]);
      }

      setUiStep(currentReviewStep);

    } catch (error: any) {
      console.error(`[fetchImpactsForOrder] Error generating Phase ${targetPhase} consequences:`, error);
      let errorMessage = `Failed to generate Phase ${targetPhase} consequences. Please try again.`;
      if (error.message && error.message.includes("An unexpected response")) {
          errorMessage = `An unexpected response was received from the AI server while generating Phase ${targetPhase} consequences. Check Genkit server logs.`;
      } else if (error.message) {
          errorMessage = `Phase ${targetPhase} Generation Error: ${error.message}`;
      }
      toast({ title: "Error Generating Consequences", description: errorMessage, variant: "destructive", duration: 7000 });
      
      if (targetPhase === '1') setUiStep(ExplorerStep.TENSION_ANALYSIS_REVIEW);
      else if (targetPhase === '2') setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else if (targetPhase === '3') setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else setUiStep(ExplorerStep.INITIAL);
    }
  }, [currentAssertionText, reflectionResult, tensionAnalysisResult, currentSystemQualitativeStates, mapImpactNodeToImpact, toast, allImpactNodesRef, graphLinksRef, setUiStep, setConsolidationSuggestions, setCurrentSystemQualitativeStates, setAllFeedbackLoopInsights, setAllImpactNodes, setGraphLinks, setReflectionResult, setPreviousSystemQualitativeStates]);


  const handleProceedFromTensionAnalysisToFirstOrder = useCallback(async () => {
    if (!reflectionResult || !currentAssertionText || !tensionAnalysisResult || !reflectionResult.systemModel || !currentSystemQualitativeStates) {
      toast({ title: "Missing Context", description: "Cannot generate impacts without confirmed assertion, system model with qualitative states, and tension analysis.", variant: "destructive" });
      return;
    }
    
    setPreviousSystemQualitativeStates(currentSystemQualitativeStates); 

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
      parentIds: [], 
      properties: {
        fullAssertionText: currentAssertionText,
        systemModel: reflectionResult.systemModel,
        keyConcepts: reflectionResult.keyConcepts || [],
        tensionAnalysis: tensionAnalysisResult,
        initialSystemStatesSummary: initialSystemStatesSummary,
      }
    };

    setAllImpactNodes([coreNode]); 
    setGraphLinks([]); 
    await Promise.resolve();

    await fetchImpactsForOrder('1', [coreNode]);
  }, [reflectionResult, currentAssertionText, tensionAnalysisResult, fetchImpactsForOrder, toast, initialSystemStatesSummary, currentSystemQualitativeStates, setAllImpactNodes, setGraphLinks, setPreviousSystemQualitativeStates]);

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
        initialSystemStatesSummary: initialSystemStatesSummary, 
        firstPhaseImpacts: currentNodes.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
        transitionPhaseImpacts: currentNodes.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
        stabilizationPhaseImpacts: currentNodes.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapImpactNodeToImpact),
        feedbackLoopInsights: allFeedbackLoopInsights, 
        finalSystemQualitativeStates: currentSystemQualitativeStates || undefined, 
    };

    try {
        const result: CascadeSummaryOutput = await generateCascadeSummary(summaryInput);
        setCascadeSummary(result.narrativeSummary);
        toast({title: "Narrative Summary Generated", description: "The AI has summarized the system evolution."});
        setUiStep(ExplorerStep.FINAL_REVIEW);
    } catch (error: any) {
        console.error("Error generating cascade summary:", error);
        let errorMessage = "Failed to generate cascade summary. Please try again.";
        if (error.message && error.message.includes("An unexpected response")) {
          errorMessage = "An unexpected response was received from the AI server during summary generation. Check Genkit server logs.";
        } else if (error.message) {
          errorMessage = `Summary Generation Error: ${error.message}`;
        }
        toast({ title: "Summary Generation Failed", description: errorMessage, variant: "destructive", duration: 7000 });
        setUiStep(ExplorerStep.ORDER_3_REVIEW); 
    } finally {
        setIsGeneratingSummary(false);
    }
  }, [reflectionResult, currentAssertionText, initialSystemStatesSummary, allFeedbackLoopInsights, currentSystemQualitativeStates, allImpactNodesRef, mapImpactNodeToImpact, toast, setUiStep, setIsGeneratingSummary, setCascadeSummary]);


  const handleProceedToNextOrder = useCallback(async () => {
    let nextPhaseToFetch: '2' | '3' | undefined;
    let parentNodesForLinking: ImpactNode[] = [];

    const currentNodesSnapshot = allImpactNodesRef.current;

    if (uiStep === ExplorerStep.ORDER_1_REVIEW) { 
      nextPhaseToFetch = '2'; 
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT');
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) { 
      nextPhaseToFetch = '3'; 
      parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT');
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) { 
      await handleGenerateCascadeSummary();
      return;
    } else if (uiStep === ExplorerStep.FINAL_REVIEW) {
      toast({ title: "Exploration Complete", description: "You have completed the exploration process."});
      return;
    }

    if (nextPhaseToFetch) {
      if (parentNodesForLinking.length === 0 && nextPhaseToFetch > '1') {
        toast({ title: `No Parent Impacts`, description: `Cannot generate Phase ${nextPhaseToFetch} as no impacts from the previous phase exist. Proceeding to summary if applicable.`, variant: "default" });
        if (nextPhaseToFetch === '2' && uiStep === ExplorerStep.ORDER_1_REVIEW) {
            setUiStep(ExplorerStep.ORDER_2_REVIEW); 
        } else if (nextPhaseToFetch === '3' && uiStep === ExplorerStep.ORDER_2_REVIEW) {
            setUiStep(ExplorerStep.ORDER_3_REVIEW); 
        }
        return;
      }
      await fetchImpactsForOrder(nextPhaseToFetch, parentNodesForLinking);
    }
  }, [uiStep, fetchImpactsForOrder, handleGenerateCascadeSummary, toast, allImpactNodesRef, setUiStep]);


  const handleSuggestConsolidations = async () => {
    let currentReviewOrder: '1' | '2' | '3' | undefined;
    if (uiStep === ExplorerStep.ORDER_1_REVIEW) currentReviewOrder = '1';
    else if (uiStep === ExplorerStep.ORDER_2_REVIEW) currentReviewOrder = '2';
    else if (uiStep === ExplorerStep.ORDER_3_REVIEW) currentReviewOrder = '3';

    if (!currentReviewOrder) {
        toast({ title: "Not in Review Step", description: "Consolidations can only be suggested during a review step for generated impacts.", variant: "default" });
        return;
    }

    const impactsForCurrentOrder = allImpactNodesRef.current
      .filter(n => n.order === parseInt(currentReviewOrder!, 10) && n.nodeSystemType === 'GENERATED_IMPACT')
      .map(mapImpactNodeToImpact);

    if (impactsForCurrentOrder.length < 2) {
      toast({ title: "Not Enough Impacts", description: `Not enough impacts in Phase ${currentReviewOrder} to analyze for consolidation (minimum 2).`, variant: "default" });
      return;
    }

    const previousStep = uiStep;
    setUiStep(ExplorerStep.CONSOLIDATION_PENDING);
    try {
      const consolidationInput: SuggestImpactConsolidationInput = {
        impactsForCurrentOrder: impactsForCurrentOrder,
        currentOrder: currentReviewOrder,
      };
      const result = await suggestImpactConsolidation(consolidationInput);
      
      const currentNodesSnapshotForValidation = allImpactNodesRef.current; 
      const validSuggestions = (result.consolidationSuggestions || []).filter(suggestion => {
        if (!suggestion.originalImpactIds || suggestion.originalImpactIds.length < 2) return false;
        const originalNodes = suggestion.originalImpactIds.map(id => currentNodesSnapshotForValidation.find(n => n.id === id)).filter(Boolean) as ImpactNode[];
        if (originalNodes.length !== suggestion.originalImpactIds.length || originalNodes.length === 0) return false;
        
        const firstOriginalOrder = originalNodes[0].order; 
        const suggestionConsolidatedOrderString = String(suggestion.consolidatedImpact.order); 
        
        if (!originalNodes.every(node => node.order === firstOriginalOrder && String(node.order) === currentReviewOrder)) return false;
        if (!['0', '1', '2', '3'].includes(suggestionConsolidatedOrderString) || suggestionConsolidatedOrderString !== currentReviewOrder) return false;
        
        return true;
      });

      setConsolidationSuggestions({ consolidationSuggestions: validSuggestions });
      if (validSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${validSuggestions.length} potential consolidation(s) for Phase ${currentReviewOrder}.` });
      } else {
        toast({ title: "No Suitable Consolidations Found", description: `The AI did not identify any valid groups to consolidate for Phase ${currentReviewOrder}.` });
      }
    } catch (error: any) {
      let errorMessage = "Error suggesting consolidations. Please try again.";
       if (error.message && error.message.includes("An unexpected response")) {
          errorMessage = "An unexpected response was received from the AI server during consolidation analysis. Check Genkit server logs.";
      } else if (error.message) {
          errorMessage = `Consolidation Error: ${error.message}`;
      }
      toast({ title: "Error Suggesting Consolidations", description: errorMessage, variant: "destructive" });
    } finally {
      setUiStep(previousStep);
    }
  };

  const handleNodeClick = (node: ImpactNode) => {
    setSelectedNode(node);
    setIsNodePanelOpen(true);
  };

  const handleUpdateValidity = (nodeId: string, validity: 'high' | 'medium' | 'low') => {
    setAllImpactNodes(prevNodes => prevNodes.map(n => (n.id === nodeId ? { ...n, validity } : n)));
    if (selectedNode && selectedNode.id === nodeId) setSelectedNode(prev => prev ? {...prev, validity} : null);
    toast({ title: "Plausibility Updated", description: `Node validity set to ${validity}.`});
  };

  const handleApplyConsolidation = (suggestion: ConsolidatedImpactSuggestion) => {
    const { originalImpactIds, consolidatedImpact: suggestedConsolidatedImpact } = suggestion;
    if (!originalImpactIds || originalImpactIds.length < 2) {
        toast({title: "Invalid Suggestion", description: "Cannot apply consolidation, suggestion is missing original impact IDs or has too few.", variant:"destructive"});
        return;
    }
    const consolidatedOrderString = String(suggestedConsolidatedImpact.order);
    if (!['1', '2', '3'].includes(consolidatedOrderString)) { 
        toast({title: "Invalid Order for Consolidation", description: `Consolidated impact has an invalid order: ${consolidatedOrderString}.`, variant:"destructive"});
        return;
    }

    const newConsolidatedImpactOrder = parseInt(consolidatedOrderString, 10) as 1 | 2 | 3;
    const newGraphNode: ImpactNode = {
        id: suggestedConsolidatedImpact.id,
        label: suggestedConsolidatedImpact.label,
        description: suggestedConsolidatedImpact.description,
        validity: suggestedConsolidatedImpact.validity,
        reasoning: suggestedConsolidatedImpact.reasoning,
        parentIds: suggestedConsolidatedImpact.parentIds || [], 
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
    let nextNodes = currentNodes.filter(n => !originalImpactIds.includes(n.id)).concat(newGraphNode);
    let finalNewLinks: ImpactLink[] = [];
    
    const currentLinks = graphLinksRef.current;
    currentLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
        const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);

        if (originalImpactIds.includes(sourceId) || originalImpactIds.includes(targetId)) {
        } else {
            finalNewLinks.push(link); 
        }
    });

    if (newGraphNode.parentIds) {
        newGraphNode.parentIds.forEach(pid => {
            const parentNode = nextNodes.find(n => n.id === pid && n.order === newGraphNode.order - 1);
            if (parentNode) {
                finalNewLinks.push({ source: pid, target: newGraphNode.id });
            } else if (newGraphNode.order === 1 && pid === CORE_ASSERTION_ID) {
                finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
            }
        });
    }
     if (newGraphNode.order === 1 && (!newGraphNode.parentIds || newGraphNode.parentIds.length === 0)) {
        newGraphNode.parentIds = [CORE_ASSERTION_ID];
        finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
    }

    const childrenToReParent: { childId: string, originalParentId: string }[] = [];
    currentLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
        const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
        if (originalImpactIds.includes(sourceId) && !originalImpactIds.includes(targetId)) {
            const childNode = currentNodes.find(n => n.id === targetId); 
            if (childNode && childNode.order === newGraphNode.order + 1) { 
                childrenToReParent.push({childId: targetId, originalParentId: sourceId });
            }
        }
    });
    
    childrenToReParent.forEach(({ childId }) => {
        const childNodeInNextNodes = nextNodes.find(n => n.id === childId);
        if (childNodeInNextNodes) {
            childNodeInNextNodes.parentIds = (childNodeInNextNodes.parentIds || []).filter(pid => !originalImpactIds.includes(pid)); 
            if (!childNodeInNextNodes.parentIds?.includes(newGraphNode.id)) {
                 childNodeInNextNodes.parentIds = [...(childNodeInNextNodes.parentIds || []), newGraphNode.id];
            }
            finalNewLinks.push({ source: newGraphNode.id, target: childId });
            nextNodes = nextNodes.map(n => n.id === childId ? childNodeInNextNodes : n);
        }
    });
    
    nextNodes = nextNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n);
    const uniqueLinks = new Map<string, ImpactLink>();
    finalNewLinks.forEach(link => {
      const src = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
      const tgt = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
      if (src === tgt) return; 
      uniqueLinks.set(`${src}:::${tgt}`, { source: src, target: tgt });
    });

    setAllImpactNodes(nextNodes);
    setGraphLinks(Array.from(uniqueLinks.values()));

    let dependentSuggestionsRemovedCount = 0;
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      const suggestionsToKeep = prev.consolidationSuggestions.filter(s => {
        if (s.consolidatedImpact.id === suggestion.consolidatedImpact.id) return false; 
        const isDependent = s.originalImpactIds.some(id => originalImpactIds.includes(id));
        if (isDependent) { dependentSuggestionsRemovedCount++; return false; }
        return true;
      });
      return { ...prev, consolidationSuggestions: suggestionsToKeep };
    });
    toast({ title: "Consolidation Applied", description: `Impacts consolidated. ${dependentSuggestionsRemovedCount > 0 ? `${dependentSuggestionsRemovedCount} dependent suggestion(s) removed.` : ''}` });
  };

  const handleDismissConsolidation = (suggestionId: string) => {
    toast({ title: "Suggestion Dismissed", description: `Suggestion for ID ${suggestionId} removed.` });
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      return { ...prev, consolidationSuggestions: prev.consolidationSuggestions.filter(s => s.consolidatedImpact.id !== suggestionId) };
    });
  };

  const visibleNodes = useMemo(() => {
    const currentNodes = allImpactNodes;
    if (uiStep === ExplorerStep.INITIAL && !reflectionResult) return [];
    if ([ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.INFERRING_INITIAL_STATE, ExplorerStep.TENSION_ANALYSIS_PENDING].includes(uiStep)) return [];
    if ((uiStep === ExplorerStep.REFLECTION_REVIEW || uiStep === ExplorerStep.INITIAL_STATE_REVIEW || uiStep === ExplorerStep.TENSION_ANALYSIS_REVIEW) && reflectionResult) {
      const coreNode = currentNodes.find(n => n.id === CORE_ASSERTION_ID && n.order === 0);
      return coreNode ? [coreNode] : [];
    }
    const maxVisibleOrderMap: Partial<Record<ExplorerStep, number>> = {
        [ExplorerStep.ORDER_1_PENDING]: 0, [ExplorerStep.ORDER_1_REVIEW]: 1,
        [ExplorerStep.ORDER_2_PENDING]: 1, [ExplorerStep.ORDER_2_REVIEW]: 2,
        [ExplorerStep.ORDER_3_PENDING]: 2, [ExplorerStep.ORDER_3_REVIEW]: 3,
        [ExplorerStep.CONSOLIDATION_PENDING]: 3, [ExplorerStep.GENERATING_SUMMARY]: 3, [ExplorerStep.FINAL_REVIEW]: 3,
    };
    const maxVisibleOrder = maxVisibleOrderMap[uiStep] ?? (currentNodes.length > 0 ? 3 : -1);
    if (maxVisibleOrder === -1 && currentNodes.length > 0 && reflectionResult) return currentNodes.filter(n => n.order === 0);
    return currentNodes.filter(n => n.order <= maxVisibleOrder);
  }, [uiStep, reflectionResult, allImpactNodes]);


  const visibleLinks = useMemo(() => {
    if (!visibleNodes.length) return [];
    const currentLinksFromState = graphLinks;
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return currentLinksFromState.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : String(link.target);
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }, [visibleNodes, graphLinks]);

  const getCurrentReviewPhaseOrder = (): '1' | '2' | '3' | undefined => {
    if (uiStep === ExplorerStep.ORDER_1_REVIEW) return '1';
    if (uiStep === ExplorerStep.ORDER_2_REVIEW) return '2';
    if (uiStep === ExplorerStep.ORDER_3_REVIEW) return '3';
    return undefined;
  };

  const renderStepContent = () => {
    const commonLoading = (text: string) => ( <div className="flex justify-center items-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-lg">{text}</p></div>);
    const nodesForThisRenderPass = allImpactNodesRef.current; 

    switch (uiStep) {
      case ExplorerStep.INITIAL:
        return ( 
          <Card className="shadow-xl bg-card"><CardHeader><CardTitle className="text-2xl text-primary">Step 1: Define Your Assertion</CardTitle><CardDescription>Enter your assertion, idea, or decision to explore, or select an example.</CardDescription></CardHeader><CardContent>
          <AssertionInputForm onSubmit={handleAssertionSubmit} isLoading={isLoading} initialAssertionText={currentAssertionText} onAssertionChange={setCurrentAssertionText} inputPromptLabel="Your Assertion / Idea / Decision:" placeholder="e.g., Implementing a universal basic income..."/>
          
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-md font-semibold mb-3 text-accent">Or try an example:</h3>
            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {goalOptions.map((goal) => (
                <Button 
                  key={goal.id} 
                  variant="outline" 
                  className="text-left h-auto py-2 px-3 justify-start hover:bg-accent/10 items-start" 
                  onClick={() => handleExampleButtonClick(goal.placeholder, goal.id)}
                > 
                  {goal.icon && <goal.icon className="w-4 h-4 mr-2.5 mt-0.5 shrink-0 text-primary" />} 
                  <div className="flex-grow"> 
                    <span className="block text-sm text-foreground leading-snug">
                      {goal.placeholder.substring(0,70) + (goal.placeholder.length > 70 ? '...' : '')}
                    </span> 
                    <span className="block text-xs text-muted-foreground italic mt-1">
                      ({goal.title})
                    </span>
                  </div>
                </Button>
              ))}
            </div> */}
          </div>
          
          </CardContent></Card>
        );
      case ExplorerStep.REFLECTION_PENDING: return commonLoading("Reflecting on your input...");
      case ExplorerStep.REVISING_SYSTEM_MODEL: return commonLoading("AI is revising the system model...");
      case ExplorerStep.INFERRING_INITIAL_STATE: return commonLoading("AI is inferring initial system states...");
      
      case ExplorerStep.REFLECTION_REVIEW: 
      case ExplorerStep.INITIAL_STATE_REVIEW:
        if (!reflectionResult) return commonLoading("Loading reflection...");
        const systemModelForDisplay = reflectionResult.systemModel; 
        const currentInitialStatesSummary = initialSystemStatesSummary; 
        const stepTitle = uiStep === ExplorerStep.INITIAL_STATE_REVIEW ? "Step 2b: Review Initial System States" : "Step 2a: Confirm Understanding & System Model";
        const stepDescription = uiStep === ExplorerStep.INITIAL_STATE_REVIEW ? "Review AI's inferred initial qualitative states for the system model. This sets the baseline." : "Review AI's interpretation and extracted system model. You can suggest revisions or proceed to state inference.";

        return (
          <Card className="shadow-xl bg-card">
            <CardHeader>
                <CardTitle className="text-2xl text-primary">{stepTitle}</CardTitle>
                <CardDescription>{stepDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReflectionDisplay reflection={reflectionResult} showSystemModelDetails={reflectionViewMode === 'list'} />
              {currentInitialStatesSummary && (uiStep === ExplorerStep.INITIAL_STATE_REVIEW || uiStep === ExplorerStep.TENSION_ANALYSIS_REVIEW) && (
                <Card className="mt-4 p-4 bg-accent/10 border-accent/30">
                  <CardTitle className="text-md text-accent flex items-center mb-1"><Info className="w-4 h-4 mr-2"/>AI's Summary of Initial System States:</CardTitle>
                  <p className="text-sm text-muted-foreground">{currentInitialStatesSummary}</p>
                </Card>
              )}
              <Tabs value={reflectionViewMode} onValueChange={(value) => setReflectionViewMode(value as 'list' | 'graph')} className="w-full mt-4 mb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />System List View</TabsTrigger>
                  <TabsTrigger value="graph"><Workflow className="mr-2 h-4 w-4" />System Graph View</TabsTrigger>
                </TabsList>
                 {reflectionViewMode === 'graph' && systemModelForDisplay && (
                    <Card className="mt-0 shadow-md bg-card/50 border-input">
                        <CardHeader><CardTitle className="text-lg text-accent">System Model Graph (with Qualitative States)</CardTitle></CardHeader>
                        <CardContent className="min-h-[300px] md:min-h-[400px]">
                            <SystemModelGraph systemModel={systemModelForDisplay} />
                        </CardContent>
                    </Card>
                )}
              </Tabs>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
                {uiStep === ExplorerStep.REFLECTION_REVIEW && (
                    <>
                        <p className="text-sm text-muted-foreground italic">{reflectionResult.confirmationQuestion}</p>
                        <Button onClick={() => setIsSystemModelFeedbackDialogOpen(true)} variant="outline" disabled={isLoading || uiStep === ExplorerStep.INFERRING_INITIAL_STATE || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING} className="w-full">
                            <MessageSquareText className="mr-2 h-4 w-4" /> Suggest Revisions to System Model (AI)
                        </Button>
                        <Button onClick={handleConfirmReflectionAndInferInitialStates} disabled={isLoading || uiStep === ExplorerStep.INFERRING_INITIAL_STATE || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING} className="w-full bg-primary text-primary-foreground">
                            {(isLoading && (uiStep === ExplorerStep.INFERRING_INITIAL_STATE || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING)) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                            Confirm & Infer Initial System States
                        </Button>
                    </>
                )}
                 {uiStep === ExplorerStep.INITIAL_STATE_REVIEW && (
                     <Button onClick={handleConfirmReflectionAndInferInitialStates} disabled={isLoading || uiStep === ExplorerStep.INFERRING_INITIAL_STATE || uiStep === ExplorerStep.REVISING_SYSTEM_MODEL || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING} className="w-full bg-primary text-primary-foreground">
                        {(isLoading && (uiStep === ExplorerStep.INFERRING_INITIAL_STATE || uiStep === ExplorerStep.TENSION_ANALYSIS_PENDING)) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                        {currentSystemQualitativeStates ? "Re-Infer States & Proceed to Tensions" : "Confirm & Infer Initial System States"}
                    </Button>
                 )}
            </CardFooter>
          </Card>
        );
      case ExplorerStep.TENSION_ANALYSIS_PENDING: return commonLoading("Identifying System Tensions...");
      case ExplorerStep.TENSION_ANALYSIS_REVIEW:
        if (!tensionAnalysisResult || !reflectionResult) return commonLoading("Loading tension analysis...");
        return ( 
           <Card className="shadow-xl bg-card"><CardHeader><CardTitle className="text-2xl text-primary">Step 3: Review System Tensions</CardTitle><CardDescription>AI has analyzed potential conflicts, constraints, and trade-offs. Review before generating consequences.</CardDescription></CardHeader><CardContent>
           <TensionAnalysisDisplay tensionAnalysis={tensionAnalysisResult} />
           {initialSystemStatesSummary && (
                <Card className="mt-4 p-3 bg-accent/10 border-accent/30 text-xs">
                  <p><strong className="text-accent">Initial States Summary (Recap):</strong> {initialSystemStatesSummary}</p>
                </Card>
            )}
           </CardContent><CardFooter className="flex-col items-stretch gap-4">
           <Button onClick={handleProceedFromTensionAnalysisToFirstOrder} disabled={isLoading || uiStep === ExplorerStep.ORDER_1_PENDING} className="w-full bg-primary text-primary-foreground">
           {isLoading && uiStep === ExplorerStep.ORDER_1_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Acknowledge & Generate Initial Consequences (Phase 1)
           </Button></CardFooter></Card>
        );

      case ExplorerStep.ORDER_1_PENDING: return commonLoading("Generating Initial Consequences (Phase 1)...");
      case ExplorerStep.ORDER_2_PENDING: return commonLoading("Generating Transition Phase Consequences (Phase 2)...");
      case ExplorerStep.ORDER_3_PENDING: return commonLoading("Generating Stabilization Phase Consequences (Phase 3)...");
      case ExplorerStep.CONSOLIDATION_PENDING: return commonLoading("Analyzing for consolidations...");
      case ExplorerStep.GENERATING_SUMMARY: return commonLoading("Generating Narrative Summary...");

      case ExplorerStep.ORDER_1_REVIEW: 
      case ExplorerStep.ORDER_2_REVIEW: 
      case ExplorerStep.ORDER_3_REVIEW: 
      case ExplorerStep.FINAL_REVIEW:
        const currentReviewOrderForButton = getCurrentReviewPhaseOrder();
        const canSuggestConsolidationsNow = 
          currentReviewOrderForButton && 
          nodesForThisRenderPass.filter(n => String(n.order) === currentReviewOrderForButton && n.nodeSystemType === 'GENERATED_IMPACT').length >= 2;

        const phaseActionMap = {
          [ExplorerStep.ORDER_1_REVIEW]: { phaseText: "Transition (Phase 2)", step: "Step 4" },
          [ExplorerStep.ORDER_2_REVIEW]: { phaseText: "Stabilization (Phase 3)", step: "Step 5" },
        };
        const nextPhaseActionInfo = phaseActionMap[uiStep as keyof typeof phaseActionMap];

        return ( 
          <><div className="my-4 flex flex-wrap justify-center gap-4">
            { (uiStep === ExplorerStep.ORDER_1_REVIEW || uiStep === ExplorerStep.ORDER_2_REVIEW || uiStep === ExplorerStep.ORDER_3_REVIEW) && canSuggestConsolidationsNow && (
            <Button onClick={handleSuggestConsolidations} disabled={isLoading || uiStep === ExplorerStep.CONSOLIDATION_PENDING} variant="outline" className="bg-accent text-accent-foreground hover:bg-accent/90">
            {uiStep === ExplorerStep.CONSOLIDATION_PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            {consolidationSuggestions?.consolidationSuggestions?.length === 0 && consolidationSuggestions !== null ? "No New Suggestions" : "Suggest Consolidations"}
            </Button>)}
            { nextPhaseActionInfo && (<Button onClick={handleProceedToNextOrder} disabled={isLoading} className="bg-primary text-primary-foreground"><ArrowRightCircle className="mr-2 h-4 w-4" /> {nextPhaseActionInfo.step}: Generate {nextPhaseActionInfo.phaseText} Consequences</Button>)}
            { (uiStep === ExplorerStep.ORDER_3_REVIEW ) && (<Button onClick={handleGenerateCascadeSummary} disabled={isLoading || isGeneratingSummary} className="bg-green-500 hover:bg-green-600 text-white">{isGeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Step 6: Generate Summary & Finalize</Button>)}
            { (uiStep === ExplorerStep.FINAL_REVIEW) && (<Button onClick={resetAllExplorationState} className="bg-blue-500 hover:bg-blue-600 text-white"><RotateCcw className="mr-2 h-4 w-4" /> Start New Exploration</Button>)}
          </div>
          {consolidationSuggestions && consolidationSuggestions.consolidationSuggestions.length > 0 && (<ConsolidationSuggestionsDisplay suggestions={consolidationSuggestions} graphNodes={nodesForThisRenderPass} onApplyConsolidation={handleApplyConsolidation} onDismissSuggestion={handleDismissConsolidation}/>)}
          {cascadeSummary && uiStep === ExplorerStep.FINAL_REVIEW && (
          <Card className="mt-6 shadow-xl bg-card text-card-foreground"><CardHeader><CardTitle className="text-xl text-primary flex items-center"><FileText className="w-6 h-6 mr-2 text-accent" />System Evolution Narrative</CardTitle></CardHeader><CardContent><div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{cascadeSummary}</div></CardContent></Card>
          )}</>
        );
      default: return <p className="text-center">Current step: {ExplorerStep[uiStep] || uiStep}.</p>;
    }
  };

  const getGraphTitle = () => { 
    if ([ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.INFERRING_INITIAL_STATE, ExplorerStep.TENSION_ANALYSIS_PENDING].includes(uiStep)) return "Define Your Assertion";
    if (([ExplorerStep.REFLECTION_REVIEW, ExplorerStep.INITIAL_STATE_REVIEW, ExplorerStep.TENSION_ANALYSIS_REVIEW].includes(uiStep)) && reflectionResult) return "Core Assertion & Initial System State";
    
    const phaseTextMap: Record<ExplorerStep, string | undefined> = {
        [ExplorerStep.ORDER_1_PENDING]: "Impact Network (Processing Initial Phase)",
        [ExplorerStep.ORDER_1_REVIEW]: "Impact Network (Initial Phase Consequences)",
        [ExplorerStep.ORDER_2_PENDING]: "Impact Network (Processing Transition Phase)",
        [ExplorerStep.ORDER_2_REVIEW]: "Impact Network (Transition Phase Consequences)",
        [ExplorerStep.ORDER_3_PENDING]: "Impact Network (Processing Stabilization Phase)",
        [ExplorerStep.ORDER_3_REVIEW]: "Impact Network (Stabilization Phase Consequences)",
        [ExplorerStep.GENERATING_SUMMARY]: "Impact Network (Full System Evolution - Generating Summary)",
        [ExplorerStep.FINAL_REVIEW]: "Impact Network (Full System Evolution)",
        [ExplorerStep.CONSOLIDATION_PENDING]: "Impact Network (Analyzing Consolidations)",
        [ExplorerStep.INITIAL]: "Define Your Assertion", 
        [ExplorerStep.REFLECTION_PENDING]: "Reflecting...", 
        [ExplorerStep.REVISING_SYSTEM_MODEL]: "Revising Model...", 
        [ExplorerStep.INFERRING_INITIAL_STATE]: "Inferring States...", 
        [ExplorerStep.INITIAL_STATE_REVIEW]: "Impact Network (Review Initial State)", 
        [ExplorerStep.TENSION_ANALYSIS_PENDING]: "Analyzing Tensions...", 
        [ExplorerStep.TENSION_ANALYSIS_REVIEW]: "Impact Network (Review Tensions)", 
    };
    return phaseTextMap[uiStep] || "Impact Network";
  };

  const getGraphDescription = () => { 
    const base = "Explore the generated consequences. Click nodes for details.";
    const phaseDescMap: Record<ExplorerStep, string | undefined> = {
        [ExplorerStep.ORDER_1_REVIEW]: `${base} Currently showing Initial Phase.`,
        [ExplorerStep.ORDER_2_REVIEW]: `${base} Currently showing up to Transition Phase.`,
        [ExplorerStep.ORDER_3_REVIEW]: `${base} Currently showing up to Stabilization Phase.`,
        [ExplorerStep.FINAL_REVIEW]: `${base} Displaying full system evolution.`,
    };
    if ([ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.INFERRING_INITIAL_STATE, ExplorerStep.TENSION_ANALYSIS_PENDING].includes(uiStep)) return "Enter your input to begin exploring.";
    if (([ExplorerStep.REFLECTION_REVIEW, ExplorerStep.INITIAL_STATE_REVIEW, ExplorerStep.TENSION_ANALYSIS_REVIEW].includes(uiStep)) && reflectionResult) return "Review AI's understanding. Impact graph builds after generating consequences. You can view the System Model via the tabs above.";

    return phaseDescMap[uiStep] || "Define assertion to start.";
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Zap className="w-10 h-10 mr-3 text-accent" /> Cascade Explorer
        </h1>
        <p className="text-muted-foreground mt-2">Tool for qualitative systems modeling of ideas and decisions.</p>
      </header>

      <div className="flex items-center space-x-2 self-center my-2">
          <Switch
            id="advanced-view-toggle"
            checked={advancedViewEnabled}
            onCheckedChange={setAdvancedViewEnabled}
            aria-label="Toggle Advanced System Details"
          />
          <Label htmlFor="advanced-view-toggle" className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" /> Show Advanced System Details (in Node Panel)
          </Label>
      </div>


      <main className="flex-grow flex flex-col gap-6">
        {renderStepContent()}
        {visibleNodes.length > 0 &&
         ![ExplorerStep.INITIAL, ExplorerStep.REFLECTION_PENDING, ExplorerStep.REVISING_SYSTEM_MODEL, ExplorerStep.INFERRING_INITIAL_STATE, ExplorerStep.REFLECTION_REVIEW, ExplorerStep.INITIAL_STATE_REVIEW, ExplorerStep.TENSION_ANALYSIS_PENDING, ExplorerStep.TENSION_ANALYSIS_REVIEW].includes(uiStep) && (
          <Card className="shadow-xl bg-card flex-grow flex flex-col min-h-[600px] mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-primary flex items-center"><ListChecks className="mr-2 h-6 w-6 text-accent"/>{getGraphTitle()}</CardTitle>
              <CardDescription>{getGraphDescription()}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow"><NetworkGraph nodes={visibleNodes} links={visibleLinks} onNodeClick={handleNodeClick} width={800} height={700} /></CardContent>
          </Card>
        )}
      </main>

      {reflectionResult && reflectionResult.systemModel && ( 
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
        advancedViewEnabled={advancedViewEnabled}
        masterSystemModel={reflectionResult?.systemModel}
        previousSystemQualitativeStates={previousSystemQualitativeStates}
      />
      <footer className="mt-12 text-center text-sm text-muted-foreground"><p>&copy; {new Date().getFullYear()} Cascade Explorer. Powered by Firebase Studio &amp; Genkit.</p></footer>
    </div>
  );
}
