
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { reflectAssertion } from '@/ai/flows/assertion-reflection';
import { generateImpactsByOrder } from '@/ai/flows/generate-impacts-by-order';
import { suggestImpactConsolidation, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import type { ImpactNode, ImpactLink, AIReflectAssertionOutput, Impact, ImpactMappingInputForConsolidation } from '@/types/cascade';
import { ExplorerStep } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb, ArrowRightCircle, CheckCircle, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const CORE_ASSERTION_ID = 'core-assertion';

export default function CascadeExplorerPage() {
  const [currentAssertionText, setCurrentAssertionText] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<AIReflectAssertionOutput | null>(null);
  
  const [allImpactNodes, setAllImpactNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);
  
  const [uiStep, setUiStep] = useState<ExplorerStep>(ExplorerStep.INITIAL);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);
  
  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  // Ref to hold the latest version of allImpactNodes for use in callbacks
  const allImpactNodesRef = useRef(allImpactNodes);
  useEffect(() => {
    allImpactNodesRef.current = allImpactNodes;
  }, [allImpactNodes]);

  const { toast } = useToast();

  const isLoading = useMemo(() => [
    ExplorerStep.REFLECTION_PENDING,
    ExplorerStep.ORDER_1_PENDING,
    ExplorerStep.ORDER_2_PENDING,
    ExplorerStep.ORDER_3_PENDING,
    ExplorerStep.CONSOLIDATION_PENDING
  ].includes(uiStep), [uiStep]);

  const handleAssertionSubmit = async (assertion: string) => {
    setUiStep(ExplorerStep.REFLECTION_PENDING);
    setReflectionResult(null);
    setAllImpactNodes([]);
    setGraphLinks([]);
    setConsolidationSuggestions(null);
    setCurrentAssertionText(assertion);
    try {
      const result = await reflectAssertion({ assertion });
      setReflectionResult(result);
      setUiStep(ExplorerStep.REFLECTION_REVIEW);
    } catch (error) {
      console.error("Error reflecting assertion:", error);
      toast({ title: "Error", description: "Failed to reflect assertion.", variant: "destructive" });
      setUiStep(ExplorerStep.INITIAL);
    }
  };

  const fetchImpactsForOrder = useCallback(async (targetOrder: 1 | 2 | 3) => {
    if (!currentAssertionText) return;

    let currentLoadingStep: ExplorerStep = ExplorerStep.ORDER_1_PENDING;
    let currentReviewStep: ExplorerStep = ExplorerStep.ORDER_1_REVIEW;
    let parentNodesForAI: Impact[] = [];
    let parentNodesForLinking: ImpactNode[] = []; // These are actual ImpactNode objects from allImpactNodesRef.current
    const currentNodes = allImpactNodesRef.current;
    switch (targetOrder) {
      case 1:
        currentLoadingStep = ExplorerStep.ORDER_1_PENDING;
        currentReviewStep = ExplorerStep.ORDER_1_REVIEW;
        // The core assertion node is the "parent" for linking 1st order impacts.
        const coreNode = currentNodes.find(n => n.id === CORE_ASSERTION_ID);
        if (coreNode) parentNodesForLinking = [coreNode];
        // No parentImpacts needed for AI for 1st order.
        break;
      case 2:
        currentLoadingStep = ExplorerStep.ORDER_2_PENDING;
        currentReviewStep = ExplorerStep.ORDER_2_REVIEW;
        parentNodesForLinking = currentNodes.filter(n => n.order === 1);
        parentNodesForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest);
        break;
      case 3:
        currentLoadingStep = ExplorerStep.ORDER_3_PENDING;
        currentReviewStep = ExplorerStep.ORDER_3_REVIEW;
        parentNodesForLinking = currentNodes.filter(n => n.order === 2);
        parentNodesForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest);
        break;
      default:
        console.error("Invalid targetOrder in fetchImpactsForOrder:", targetOrder);
        toast({ title: "Internal Error", description: "Invalid order requested.", variant: "destructive" });
        setUiStep(ExplorerStep.INITIAL);
        return;
    }
    
    if ((targetOrder === 2 || targetOrder === 3) && parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate ${targetOrder === 2 ? '2nd' : '3rd'} order impacts as no impacts from the previous order exist. Please generate or ensure previous order impacts are present.`, variant: "destructive" });
        if (targetOrder === 2) setUiStep(currentNodes.some(n => n.order === 1) ? ExplorerStep.ORDER_1_REVIEW : ExplorerStep.REFLECTION_REVIEW);
        else if (targetOrder === 3) setUiStep(currentNodes.some(n => n.order === 2) ? ExplorerStep.ORDER_2_REVIEW : ExplorerStep.ORDER_1_REVIEW);
        return;
    }

    setUiStep(currentLoadingStep);
    setConsolidationSuggestions(null);

    try {
      const result = await generateImpactsByOrder({
        assertionText: currentAssertionText,
        targetOrder: String(targetOrder) as '1' | '2' | '3',
        parentImpacts: parentNodesForAI.length > 0 ? parentNodesForAI : undefined,
      });

      const newNodesFromAI: ImpactNode[] = result.generatedImpacts.map(impact => ({
        ...impact,
        order: targetOrder,
        type: 'impact' as 'impact',
      }));

      setAllImpactNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        newNodesFromAI.forEach(n => nodeMap.set(n.id, n));
        return Array.from(nodeMap.values());
      });
      
      const parentNodeIdsForLinking = parentNodesForLinking.map(p => p.id);

      setGraphLinks(prevLinks => {
        const newLinksGeneratedThisStep: ImpactLink[] = [];
        if (targetOrder === 1) {
            // The CORE_ASSERTION_ID node is guaranteed to be in `allImpactNodesRef.current`
            // (and thus in the `allImpactNodes` state) by the time NetworkGraph renders,
            // due to `handleConfirmReflectionAndFetchFirstOrder`.
            // We use the ID directly for link definition.
            newNodesFromAI.forEach(newNode => {
                newLinksGeneratedThisStep.push({ source: CORE_ASSERTION_ID, target: newNode.id });
            });
        } else if (targetOrder > 1 && parentNodesForLinking.length > 0) {
          newNodesFromAI.forEach((newNode) => { // removed unused index
            let parentLinked = false;
            if (newNode.parentId && parentNodeIdsForLinking.includes(newNode.parentId)) {
              const specificParent = parentNodesForLinking.find(p => p.id === newNode.parentId); // parentNodesForLinking is from currentNodes (via ref)
              if (specificParent) {
                newLinksGeneratedThisStep.push({ source: specificParent.id, target: newNode.id });
                parentLinked = true;
              } else {
                 // This case should ideally not happen if parentId is in parentNodeIdsForLinking
                 console.warn(`Impact node "${newNode.label}" (ID: ${newNode.id}) for order ${targetOrder} had parentId "${newNode.parentId}" but parent was not found in the provided parent list. This indicates an inconsistency.`);
              }
            }
            
            if (!parentLinked && parentNodesForLinking.length > 0) {
              // Fallback linking strategy if parentId is missing, invalid, or specific parent not found
              const fallbackParent = parentNodesForLinking[0]; // Link to the first available parent
              newLinksGeneratedThisStep.push({ source: fallbackParent.id, target: newNode.id });
              console.warn(`Impact node "${newNode.label}" (ID: ${newNode.id}) for order ${targetOrder} was linked to fallback parent "${fallbackParent.label}" as AI did not provide a specific valid parentId or parent was not found.`);
            } else if (!parentLinked) {
               console.error(`Could not find any parent for impact node "${newNode.label}" (ID: ${newNode.id}) for order ${targetOrder}. No parent nodes available from previous order.`);
            }
          });
        }
        
        const linkMap = new Map(prevLinks.map(l => [`${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`, l]));
        newLinksGeneratedThisStep.forEach(l => linkMap.set(`${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`, l));
        return Array.from(linkMap.values());
      });
      
      setUiStep(currentReviewStep);
    } catch (error) {
      console.error(`Error generating ${targetOrder}-order impacts:`, error);
      toast({ title: "Error", description: `Failed to generate ${targetOrder}-order impacts.`, variant: "destructive" });
      // Revert to the previous stable review step
      if (currentLoadingStep === ExplorerStep.ORDER_1_PENDING) setUiStep(ExplorerStep.REFLECTION_REVIEW);
      else if (currentLoadingStep === ExplorerStep.ORDER_2_PENDING) setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else if (currentLoadingStep === ExplorerStep.ORDER_3_PENDING) setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else setUiStep(ExplorerStep.INITIAL);
    }
  }, [currentAssertionText, toast]); // Removed allImpactNodes from deps as we use ref


  const handleConfirmReflectionAndFetchFirstOrder = useCallback(async () => {
    if (!reflectionResult || !currentAssertionText) return;
    
    const coreNode: ImpactNode = {
      id: CORE_ASSERTION_ID,
      label: reflectionResult.summary || "Core Assertion",
      description: currentAssertionText,
      validity: 'high', 
      reasoning: 'User-provided assertion, confirmed.',
      order: 0,
      type: 'assertion',
    };
    // Set core node first, then call fetchImpacts which depends on allImpactNodes
    setAllImpactNodes([coreNode]); 
    setGraphLinks([]); 
    // fetchImpactsForOrder will use the `allImpactNodesRef.current` which is updated by the useEffect.
    // The await Promise.resolve() helps ensure state updates are processed before continuing.
    await Promise.resolve(); 
    await fetchImpactsForOrder(1);
  }, [reflectionResult, currentAssertionText, fetchImpactsForOrder]);

  const handleProceedToNextOrder = useCallback(async () => {
    if (uiStep === ExplorerStep.ORDER_1_REVIEW) {
      await fetchImpactsForOrder(2);
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) {
      await fetchImpactsForOrder(3);
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) {
      setUiStep(ExplorerStep.FINAL_REVIEW); 
      toast({ title: "Impact Map Complete", description: "All impact orders have been generated. You can now review or consolidate further."});
    } else if (uiStep === ExplorerStep.FINAL_REVIEW) {
      toast({ title: "Map Explored", description: "You have completed the exploration process for this assertion."});
    }
  }, [uiStep, fetchImpactsForOrder, toast]);


  const handleSuggestConsolidations = async () => {
    const currentNodes = allImpactNodesRef.current;
    const impactsForConsolidation: ImpactMappingInputForConsolidation = {
      firstOrder: currentNodes.filter(n => n.order === 1 && n.type === 'impact').map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
      secondOrder: currentNodes.filter(n => n.order === 2 && n.type === 'impact').map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
      thirdOrder: currentNodes.filter(n => n.order === 3 && n.type === 'impact').map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
    };

    if (impactsForConsolidation.firstOrder.length === 0 && impactsForConsolidation.secondOrder.length === 0 && impactsForConsolidation.thirdOrder.length === 0) {
      toast({ title: "No Impacts", description: "No impacts available to analyze for consolidation.", variant: "destructive" });
      return;
    }

    const previousStep = uiStep; 
    setUiStep(ExplorerStep.CONSOLIDATION_PENDING);
    try {
      const result = await suggestImpactConsolidation(impactsForConsolidation);
      setConsolidationSuggestions(result);
      if (result.consolidationSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${result.consolidationSuggestions.length} potential consolidation(s). Review them below.` });
      } else {
        toast({ title: "No Consolidations Found", description: "The AI did not find any impacts to consolidate." });
      }
    } catch (error) {
      console.error("Error suggesting consolidations:", error);
      toast({ title: "Error", description: "Failed to get consolidation suggestions.", variant: "destructive" });
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
    const newConsolidatedImpactOrder = parseInt(suggestedConsolidatedImpact.order as string, 10) as 0 | 1 | 2 | 3;

    const newGraphNode: ImpactNode = {
        id: suggestedConsolidatedImpact.id,
        label: suggestedConsolidatedImpact.label,
        description: suggestedConsolidatedImpact.description,
        validity: suggestedConsolidatedImpact.validity,
        reasoning: suggestedConsolidatedImpact.reasoning,
        order: newConsolidatedImpactOrder,
        type: 'impact', 
        // parentId will be determined by linking logic below if needed
    };

    let finalNodesAfterConsolidation: ImpactNode[] = [];
    setAllImpactNodes(prevNodes => {
        const filteredNodes = prevNodes.filter(n => !originalImpactIds.includes(n.id));
        if (!filteredNodes.find(n => n.id === newGraphNode.id)) {
           finalNodesAfterConsolidation = [...filteredNodes, newGraphNode];
        } else {
           finalNodesAfterConsolidation = filteredNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n);
        }
        return finalNodesAfterConsolidation;
    });
    
    setGraphLinks(prevLinks => {
        let linksToKeep: ImpactLink[] = [];
        let childLinksToReParent: ImpactLink[] = []; 
        let parentLinksToReParent: ImpactLink[] = []; 

        prevLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
            const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);

            if (originalImpactIds.includes(sourceId) && originalImpactIds.includes(targetId)) {
                // Skip links between two original nodes being consolidated
            } else if (originalImpactIds.includes(sourceId)) { 
                childLinksToReParent.push({ source: newGraphNode.id, target: targetId });
            } else if (originalImpactIds.includes(targetId)) { 
                parentLinksToReParent.push({ source: sourceId, target: newGraphNode.id });
            } else {
                linksToKeep.push(link);
            }
        });
        
        linksToKeep.push(...childLinksToReParent, ...parentLinksToReParent);
        
        // Ensure the new consolidated node has at least one parent link if it's not the core assertion
        // Use finalNodesAfterConsolidation (the state after nodes update) for finding potential parents
        const currentNodesForLinking = allImpactNodesRef.current; // This will be updated by useEffect after setAllImpactNodes

        const hasParentLink = linksToKeep.some(l => (typeof l.target === 'object' ? l.target.id : String(l.target)) === newGraphNode.id);

        if (!hasParentLink && newGraphNode.id !== CORE_ASSERTION_ID) {
            if (newGraphNode.order === 1) {
                 if (!linksToKeep.some(l => (typeof l.target === 'string' ? l.target : l.target.id) === newGraphNode.id && (typeof l.source === 'string' ? l.source : l.source.id) === CORE_ASSERTION_ID)) {
                    linksToKeep.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                 }
            } else if (newGraphNode.order > 1) {
                const potentialParents = currentNodesForLinking.filter(n => n.order === newGraphNode.order - 1 && n.id !== newGraphNode.id);
                if (potentialParents.length > 0) {
                     if (!linksToKeep.some(l => (typeof l.target === 'string' ? l.target : l.target.id) === newGraphNode.id)) { 
                        linksToKeep.push({ source: potentialParents[0].id, target: newGraphNode.id }); 
                     }
                } else { 
                    if (!linksToKeep.some(l => (typeof l.target === 'string' ? l.target : l.target.id) === newGraphNode.id && (typeof l.source === 'string' ? l.source : l.source.id) === CORE_ASSERTION_ID)){
                        linksToKeep.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                    }
                }
            }
        }
      
        const uniqueLinks = new Map<string, ImpactLink>();
        linksToKeep.forEach(link => {
          const src = typeof link.source === 'object' ? link.source.id : String(link.source);
          const tgt = typeof link.target === 'object' ? link.target.id : String(link.target);
          if (src === tgt) return; 
          uniqueLinks.set(`${src}:::${tgt}`, { source: src, target: tgt });
        });
        return Array.from(uniqueLinks.values());
    });
    
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        consolidationSuggestions: prev.consolidationSuggestions.filter(s => s.consolidatedImpact.id !== suggestion.consolidatedImpact.id)
      };
    });

    toast({ 
      title: "Consolidation Applied", 
      description: `Impacts consolidated into "${suggestion.consolidatedImpact.label}". Graph updated.`
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
    if (uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING) return [];
    const currentVisibleNodes = allImpactNodesRef.current; // Use ref for up-to-date data in memo
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) {
      return currentVisibleNodes.filter(n => n.order === 0); // Only core assertion
    }
    // For order review steps, show up to that order + core
    if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) return currentVisibleNodes.filter(n => n.order <= 1);
    if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) return currentVisibleNodes.filter(n => n.order <= 2);
    if (uiStep === ExplorerStep.ORDER_3_PENDING || uiStep === ExplorerStep.ORDER_3_REVIEW) return currentVisibleNodes.filter(n => n.order <= 3);
    if (uiStep === ExplorerStep.FINAL_REVIEW || uiStep === ExplorerStep.CONSOLIDATION_PENDING) return currentVisibleNodes; // Show all nodes
    
    return currentVisibleNodes; // Default to all nodes if step doesn't restrict
  }, [uiStep, reflectionResult, allImpactNodes]); // allImpactNodes still needed for reactivity of useMemo

  const renderStepContent = () => {
    const commonLoading = (text: string) => (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">{text}</p>
      </div>
    );

    switch (uiStep) {
      case ExplorerStep.INITIAL:
        return null; 
      case ExplorerStep.REFLECTION_PENDING:
        return commonLoading("Reflecting on your assertion...");
      case ExplorerStep.REFLECTION_REVIEW:
        if (!reflectionResult) return commonLoading("Loading reflection...");
        return (
          <Card className="shadow-xl bg-card">
            <CardHeader><CardTitle className="text-2xl text-primary">2. Confirm Understanding</CardTitle></CardHeader>
            <CardContent>
              <ReflectionDisplay 
                reflection={reflectionResult} 
                onConfirm={handleConfirmReflectionAndFetchFirstOrder}
                isLoadingConfirmation={isLoading || uiStep === ExplorerStep.ORDER_1_PENDING}
                confirmButtonText="Correct. Generate 1st Order Impacts"
              />
            </CardContent>
          </Card>
        );
      case ExplorerStep.ORDER_1_PENDING: return commonLoading("Generating 1st Order Impacts...");
      case ExplorerStep.ORDER_2_PENDING: return commonLoading("Generating 2nd Order Impacts...");
      case ExplorerStep.ORDER_3_PENDING: return commonLoading("Generating 3rd Order Impacts...");
      case ExplorerStep.CONSOLIDATION_PENDING: return commonLoading("Analyzing for consolidations...");
      
      case ExplorerStep.ORDER_1_REVIEW:
      case ExplorerStep.ORDER_2_REVIEW:
      case ExplorerStep.ORDER_3_REVIEW:
      case ExplorerStep.FINAL_REVIEW:
        const currentRenderNodes = allImpactNodesRef.current;
        const canSuggestConsolidations = currentRenderNodes.filter(n => n.type === 'impact').length > 1; // Need at least 2 impacts to consolidate
        const impactsExist = currentRenderNodes.length > 1; 

        const nextOrderMap = {
          [ExplorerStep.ORDER_1_REVIEW]: { orderText: "2nd" },
          [ExplorerStep.ORDER_2_REVIEW]: { orderText: "3rd" },
        };
        const nextOrderActionInfo = nextOrderMap[uiStep as keyof typeof nextOrderMap];

        return (
          <>
            <div className="my-4 flex flex-wrap justify-center gap-4">
              { impactsExist && canSuggestConsolidations && (
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
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> Generate {nextOrderActionInfo.orderText} Order Impacts
                </Button>
              )}
              { (uiStep === ExplorerStep.ORDER_3_REVIEW ) && (
                 <Button onClick={handleProceedToNextOrder} disabled={isLoading} className="bg-green-500 hover:bg-green-600 text-white">
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark 3rd Order & Finalize
                </Button>
              )}
              { (uiStep === ExplorerStep.FINAL_REVIEW) && currentRenderNodes.some(n => n.order === 3) && (
                 <Button onClick={handleProceedToNextOrder} disabled={isLoading} className="bg-green-500 hover:bg-green-600 text-white">
                  <CheckCircle className="mr-2 h-4 w-4" /> Review Complete
                </Button>
              )}
            </div>

            {consolidationSuggestions && consolidationSuggestions.consolidationSuggestions.length > 0 && (
              <ConsolidationSuggestionsDisplay 
                suggestions={consolidationSuggestions}
                graphNodes={currentRenderNodes} 
                onApplyConsolidation={handleApplyConsolidation}
                onDismissSuggestion={handleDismissConsolidation}
              />
            )}
          </>
        );
      default:
        return <p className="text-center">Current step: {uiStep}. Please proceed or refresh if stuck.</p>;
    }
  };

  const getGraphTitle = () => {
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Core Assertion";
    if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) return "Impact Network (1st Order)";
    if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) return "Impact Network (Up to 2nd Order)";
    if (uiStep === ExplorerStep.ORDER_3_PENDING || uiStep === ExplorerStep.ORDER_3_REVIEW) return "Impact Network (Up to 3rd Order)";
    if (uiStep === ExplorerStep.FINAL_REVIEW || uiStep === ExplorerStep.CONSOLIDATION_PENDING) return "Impact Network (Full Map)";
    if (uiStep === ExplorerStep.INITIAL || !reflectionResult) return "Define Your Assertion";
    return "Impact Network";
  };
  
  const getGraphDescription = () => {
    if (uiStep === ExplorerStep.INITIAL || (uiStep === ExplorerStep.REFLECTION_INPUT && !reflectionResult)) return "Enter an assertion to begin exploring its cascading impacts.";
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Core assertion reflected by AI. Confirm to generate first-order impacts.";
    if (visibleNodes.length > 0) return `Explore the generated impacts. Click nodes for details. Current step: ${ExplorerStep[uiStep] || uiStep}`;
    return "Define your assertion to start building the impact network.";
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Zap className="w-10 h-10 mr-3 text-accent" /> Cascade Explorer
        </h1>
        <p className="text-muted-foreground mt-2">Explore the cascading impacts of your ideas step-by-step.</p>
      </header>

      <main className="flex-grow flex flex-col gap-6">
        {(uiStep === ExplorerStep.INITIAL || (uiStep === ExplorerStep.REFLECTION_INPUT && !reflectionResult)) && (
          <Card className="shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">1. Define Your Assertion</CardTitle>
            </CardHeader>
            <CardContent>
              <AssertionInputForm onSubmit={handleAssertionSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>
        )}

        {renderStepContent()}
        
        {visibleNodes.length > 0 && (uiStep !== ExplorerStep.INITIAL && uiStep !== ExplorerStep.REFLECTION_PENDING) && (
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
              <NetworkGraph nodes={visibleNodes} links={graphLinks} onNodeClick={handleNodeClick} width={800} height={700} />
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
        <p>&copy; {new Date().getFullYear()} Cascade Explorer. Powered by Firebase Studio & Genkit.</p>
      </footer>
    </div>
  );
}

