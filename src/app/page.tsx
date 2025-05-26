
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { reflectAssertion, type ReflectAssertionOutput } from '@/ai/flows/assertion-reflection';
import { generateImpactsByOrder, type GenerateImpactsByOrderInput } from '@/ai/flows/generate-impacts-by-order';
import { suggestImpactConsolidation, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import { generateCascadeSummary, type CascadeSummaryInput, type CascadeSummaryOutput } from '@/ai/flows/generate-cascade-summary';
import type { ImpactNode, ImpactLink, Impact, ImpactMappingInputForConsolidation } from '@/types/cascade';
import { ExplorerStep } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb, ArrowRightCircle, CheckCircle, ListChecks, FileText, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const CORE_ASSERTION_ID = 'core-assertion';

export default function CascadeExplorerPage() {
  const [currentAssertionText, setCurrentAssertionText] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<ReflectAssertionOutput | null>(null);

  const [allImpactNodes, setAllImpactNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);

  const [uiStep, setUiStep] = useState<ExplorerStep>(ExplorerStep.INITIAL);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);

  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  const [cascadeSummary, setCascadeSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);


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

  const handleAssertionSubmit = async (assertion: string) => {
    setUiStep(ExplorerStep.REFLECTION_PENDING);
    setReflectionResult(null);
    setAllImpactNodes([]);
    setGraphLinks([]);
    setConsolidationSuggestions(null);
    setCurrentAssertionText(assertion);
    setCascadeSummary(null);
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
    if (!currentAssertionText || !reflectionResult) {
        toast({ title: "Missing Context", description: "Cannot generate impacts without a confirmed assertion.", variant: "destructive" });
        setUiStep(ExplorerStep.REFLECTION_REVIEW);
        return;
    }

    let currentLoadingStep: ExplorerStep = ExplorerStep.ORDER_1_PENDING;
    let currentReviewStep: ExplorerStep = ExplorerStep.ORDER_1_REVIEW;
    let parentImpactsForAI: Impact[] = [];
    let parentNodesForLinking: ImpactNode[] = [];

    const currentNodesSnapshot = allImpactNodesRef.current;

    switch (targetOrder) {
      case 1:
        currentLoadingStep = ExplorerStep.ORDER_1_PENDING;
        currentReviewStep = ExplorerStep.ORDER_1_REVIEW;
        const coreNodeFromSnapshot = currentNodesSnapshot.find(n => n.id === CORE_ASSERTION_ID);
        if (coreNodeFromSnapshot) {
            parentNodesForLinking = [coreNodeFromSnapshot];
        } else {
            console.error("Critical: Core assertion node not found when preparing for 1st order impacts. This indicates a state inconsistency and may lead to linking issues.");
            toast({ title: "Error", description: "Core assertion node missing. Cannot generate 1st order impacts without it.", variant: "destructive" });
            setUiStep(ExplorerStep.REFLECTION_REVIEW); 
            return;
        }
        break;
      case 2:
        currentLoadingStep = ExplorerStep.ORDER_2_PENDING;
        currentReviewStep = ExplorerStep.ORDER_2_REVIEW;
        parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 1);
        parentImpactsForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, nodeSystemType, order, parentId, properties, ...rest }) => ({...rest, parentId: parentId || undefined}));
        break;
      case 3:
        currentLoadingStep = ExplorerStep.ORDER_3_PENDING;
        currentReviewStep = ExplorerStep.ORDER_3_REVIEW;
        parentNodesForLinking = currentNodesSnapshot.filter(n => n.order === 2);
        parentImpactsForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, nodeSystemType, order, parentId, properties, ...rest }) => ({...rest, parentId: parentId || undefined}));
        break;
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
        parentImpacts: parentImpactsForAI.length > 0 ? parentImpactsForAI : undefined,
      };
      const result = await generateImpactsByOrder(aiInput);

      const rawGeneratedImpacts = result.generatedImpacts || [];
      const validGeneratedImpacts = rawGeneratedImpacts.filter(impact => {
        return impact.id &&
               impact.label && impact.label.trim() !== "" &&
               impact.description && impact.description.trim() !== "" &&
               impact.validity &&
               impact.reasoning && impact.reasoning.trim() !== "";
      });

      if (validGeneratedImpacts.length < rawGeneratedImpacts.length) {
        const diff = rawGeneratedImpacts.length - validGeneratedImpacts.length;
        console.warn(`Filtered out ${diff} malformed impact(s) from AI generation.`);
        toast({
          title: "AI Data Inconsistency",
          description: `${diff} impact(s) from AI were incomplete and have been ignored.`,
          variant: "default",
          duration: 7000,
        });
      }
      
      const newNodesFromAI: ImpactNode[] = validGeneratedImpacts.map(impact => ({
        ...impact,
        order: targetOrder,
        nodeSystemType: 'GENERATED_IMPACT',
        properties: {
            ...(impact.keyConcepts && impact.keyConcepts.length > 0 && { keyConcepts: impact.keyConcepts }),
            ...(impact.attributes && impact.attributes.length > 0 && { attributes: impact.attributes }),
        },
      }));


      if (newNodesFromAI.length === 0 && rawGeneratedImpacts.length === 0) {
        toast({
          title: `No New Impacts Generated`,
          description: `The AI did not identify any ${targetOrder === 1 ? 'first' : targetOrder === 2 ? 'second' : 'third'}-order impacts for this step. You can try proceeding or refine your assertion.`,
          variant: "default",
          duration: 7000,
        });
      }

      setAllImpactNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        newNodesFromAI.forEach(n => nodeMap.set(n.id, n));
        return Array.from(nodeMap.values());
      });

      setGraphLinks(prevLinks => {
        const newLinksGeneratedThisStep: ImpactLink[] = [];
        if (targetOrder === 1) {
            const coreNodeForLinking = allImpactNodesRef.current.find(n => n.id === CORE_ASSERTION_ID);
            if (coreNodeForLinking) {
                newNodesFromAI.forEach(newNode => {
                    newLinksGeneratedThisStep.push({ source: CORE_ASSERTION_ID, target: newNode.id });
                });
            } else {
                 console.error("Critical: Core assertion node not found when attempting to link 1st order impacts. This may lead to an inconsistent graph state.");
            }
        } else if (targetOrder > 1 && parentNodesForLinking.length > 0) {
          newNodesFromAI.forEach((newNode) => {
            let parentLinked = false;
            if (newNode.parentId && parentNodesForLinking.some(pNode => pNode.id === newNode.parentId)) {
              newLinksGeneratedThisStep.push({ source: newNode.parentId, target: newNode.id });
              parentLinked = true;
            }

            if (!parentLinked && parentNodesForLinking.length > 0) {
              const fallbackParent = parentNodesForLinking[0]; 
              newLinksGeneratedThisStep.push({ source: fallbackParent.id, target: newNode.id });
              console.warn(`Impact node "${newNode.label}" (ID: ${newNode.id}) for order ${targetOrder} was linked to fallback parent "${fallbackParent.label}" (ID: ${fallbackParent.id}) as AI did not provide a specific valid parentId or the specific parent was not in this step's list of potential parents.`);
               toast({
                  title: "Fallback Linking Applied",
                  description: `Impact "${newNode.label}" linked to fallback parent "${fallbackParent.label}" as specific parent ID was missing or invalid.`,
                  variant: "default",
                  duration: 8000
              });
            } else if (!parentLinked && parentNodesForLinking.length === 0) {
                console.error(`Cannot link impact node "${newNode.label}" (ID: ${newNode.id}) for order ${targetOrder} as no parent nodes were available for linking.`);
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
      if (targetOrder === 1) setUiStep(ExplorerStep.REFLECTION_REVIEW);
      else if (targetOrder === 2) setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else if (targetOrder === 3) setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else setUiStep(ExplorerStep.INITIAL);
    }
  }, [currentAssertionText, reflectionResult, toast ]);


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
      properties: {
        fullAssertionText: currentAssertionText,
        ...(reflectionResult.coreComponents && reflectionResult.coreComponents.length > 0 && { coreComponents: reflectionResult.coreComponents }),
        ...(reflectionResult.keyConcepts && reflectionResult.keyConcepts.length > 0 && { keyConcepts: reflectionResult.keyConcepts }),
      }
    };

    setAllImpactNodes([coreNode]);
    setGraphLinks([]); 

    await Promise.resolve(); 

    await fetchImpactsForOrder(1);
  }, [reflectionResult, currentAssertionText, fetchImpactsForOrder]);

  const handleGenerateCascadeSummary = async () => {
    if (!reflectionResult || allImpactNodesRef.current.length === 0) {
      toast({title: "Cannot Generate Summary", description: "Initial assertion and impact map are required.", variant: "destructive"});
      return;
    }
    setUiStep(ExplorerStep.GENERATING_SUMMARY);
    setIsGeneratingSummary(true);
    setCascadeSummary(null);

    const currentNodes = allImpactNodesRef.current;
    
    const mapToImpact = (node: ImpactNode): Impact => {
        const { x, y, vx, vy, fx, fy, index, originalColor, nodeSystemType, order, properties, ...impactData } = node;
        return {
            ...impactData,
            parentId: impactData.parentId || undefined, 
            keyConcepts: properties?.keyConcepts || undefined,
            attributes: properties?.attributes || undefined,
        };
    };
    
    const summaryInput: CascadeSummaryInput = {
        initialAssertion: {
            summary: reflectionResult.summary,
            fullText: currentAssertionText,
        },
        firstOrderImpacts: currentNodes.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpact),
        secondOrderImpacts: currentNodes.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpact),
        thirdOrderImpacts: currentNodes.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpact),
    };

    try {
        const result = await generateCascadeSummary(summaryInput);
        setCascadeSummary(result.narrativeSummary);
        toast({title: "Narrative Summary Generated", description: "The AI has summarized the impact cascade."});
        setUiStep(ExplorerStep.FINAL_REVIEW);
    } catch (error) {
        console.error("Error generating cascade summary:", error);
        toast({ title: "Error", description: "Failed to generate cascade summary.", variant: "destructive" });
        setUiStep(ExplorerStep.ORDER_3_REVIEW); 
    } finally {
        setIsGeneratingSummary(false);
    }
  };


  const handleProceedToNextOrder = useCallback(async () => {
    let nextOrderToFetch: 1 | 2 | 3 | undefined;
    if (uiStep === ExplorerStep.ORDER_1_REVIEW) {
      nextOrderToFetch = 2;
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) {
      nextOrderToFetch = 3;
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) {
      await handleGenerateCascadeSummary();
      return;
    } else if (uiStep === ExplorerStep.FINAL_REVIEW) {
      toast({ title: "Exploration Complete", description: "You have completed the exploration process for this assertion."});
      return;
    }

    if (nextOrderToFetch) {
      await fetchImpactsForOrder(nextOrderToFetch);
    }
  }, [uiStep, fetchImpactsForOrder, toast, handleGenerateCascadeSummary]);


  const handleSuggestConsolidations = async () => {
    const currentNodesForAICall = allImpactNodesRef.current;
    
    const mapToImpactForConsolidation = (node: ImpactNode): Impact => {
        const { x, y, vx, vy, fx, fy, index, originalColor, nodeSystemType, order, properties, ...impactData } = node;
        return {
            ...impactData,
            parentId: impactData.parentId || undefined,
            keyConcepts: properties?.keyConcepts || undefined,
            attributes: properties?.attributes || undefined,
        };
    };

    const impactsForConsolidation: ImpactMappingInputForConsolidation = {
      firstOrder: currentNodesForAICall.filter(n => n.order === 1 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpactForConsolidation),
      secondOrder: currentNodesForAICall.filter(n => n.order === 2 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpactForConsolidation),
      thirdOrder: currentNodesForAICall.filter(n => n.order === 3 && n.nodeSystemType === 'GENERATED_IMPACT').map(mapToImpactForConsolidation),
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

      const validSuggestions = (result.consolidationSuggestions || []).filter(
        suggestion => suggestion.originalImpactIds.length >= 2
      );

      if (validSuggestions.length < (result.consolidationSuggestions || []).length) {
        const invalidCount = (result.consolidationSuggestions || []).length - validSuggestions.length;
        console.warn(`AI suggested ${invalidCount} consolidation(s) involving fewer than two original impacts. These have been filtered out.`);
      }

      setConsolidationSuggestions({ consolidationSuggestions: validSuggestions });

      if (validSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${validSuggestions.length} potential consolidation(s). Review them below.` });
      } else {
        toast({ title: "No Suitable Consolidations Found", description: "The AI did not identify any groups of two or more impacts to consolidate within any single order." });
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
        nodeSystemType: 'GENERATED_IMPACT', 
        properties: { 
            ...(suggestedConsolidatedImpact.keyConcepts && suggestedConsolidatedImpact.keyConcepts.length > 0 && { keyConcepts: suggestedConsolidatedImpact.keyConcepts }),
            ...(suggestedConsolidatedImpact.attributes && suggestedConsolidatedImpact.attributes.length > 0 && { attributes: suggestedConsolidatedImpact.attributes }),
         },
        parentId: suggestedConsolidatedImpact.parentId
    };

    const currentNodesSnapshot = allImpactNodesRef.current;
    const currentLinksSnapshot = graphLinksRef.current;
    
    const nextNodes = currentNodesSnapshot
        .filter(n => !originalImpactIds.includes(n.id))
        .concat(newGraphNode);

    let finalNewLinks: ImpactLink[] = [];
    let childLinksToReParent: ImpactLink[] = [];
    let parentLinksToReParent: ImpactLink[] = [];

    currentLinksSnapshot.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
        const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);

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
    
    const hasParentLink = finalNewLinks.some(l => (typeof l.target === 'object' ? l.target.id : String(l.target)) === newGraphNode.id);

    if (!hasParentLink && newGraphNode.id !== CORE_ASSERTION_ID && newGraphNode.order > 0) {
        if (newGraphNode.parentId && nextNodes.some(n => n.id === newGraphNode.parentId && n.order === newGraphNode.order -1)) {
            finalNewLinks.push({ source: newGraphNode.parentId, target: newGraphNode.id });
        } else if (newGraphNode.order === 1 && nextNodes.some(n => n.id === CORE_ASSERTION_ID)) {
             finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
        } else {
            const potentialParents = nextNodes.filter(n => n.order === newGraphNode.order - 1 && n.id !== newGraphNode.id);
            if (potentialParents.length > 0) {
                finalNewLinks.push({ source: potentialParents[0].id, target: newGraphNode.id });
                 console.warn(`Consolidated node ${newGraphNode.id} (Order ${newGraphNode.order}) linked to fallback parent ${potentialParents[0].id} as no explicit parent link was formed.`);
            } else if (newGraphNode.order > 1 && nextNodes.some(n => n.id === CORE_ASSERTION_ID)) { 
                finalNewLinks.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                console.warn(`Consolidated node ${newGraphNode.id} (Order ${newGraphNode.order}) linked to CORE_ASSERTION as a last resort as no order ${newGraphNode.order -1} parents found in the updated node list.`);
            }
        }
    }
    
    const uniqueLinks = new Map<string, ImpactLink>();
    finalNewLinks.forEach(link => {
      const src = typeof link.source === 'object' ? link.source.id : String(link.source);
      const tgt = typeof link.target === 'object' ? link.target.id : String(link.target);
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
    if (uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING) return [];
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) {
      return currentNodes.filter(n => n.order === 0);
    }
    if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) {
      return currentNodes.filter(n => n.order <= 1);
    }
    if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) {
      return currentNodes.filter(n => n.order <= 2);
    }
    if ([
        ExplorerStep.ORDER_3_PENDING, 
        ExplorerStep.ORDER_3_REVIEW, 
        ExplorerStep.GENERATING_SUMMARY, 
        ExplorerStep.FINAL_REVIEW,
      ].includes(uiStep) || (uiStep === ExplorerStep.CONSOLIDATION_PENDING && currentNodes.length > 0)
    ) {
        return currentNodes;
    }
    return currentNodes; 
  }, [uiStep, reflectionResult, allImpactNodes]);

  const visibleLinks = useMemo(() => {
    const currentLinks = graphLinks; 
    if (!visibleNodes.length) return [];
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return currentLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
      const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
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
          [ExplorerStep.ORDER_1_REVIEW]: { orderText: "2nd" },
          [ExplorerStep.ORDER_2_REVIEW]: { orderText: "3rd" },
        };
        const nextOrderActionInfo = nextOrderMap[uiStep as keyof typeof nextOrderMap];

        return (
          <>
            <div className="my-4 flex flex-wrap justify-center gap-4">
              { canSuggestConsolidationsNow && (
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
                 <Button onClick={handleProceedToNextOrder} disabled={isLoading || isGeneratingSummary} className="bg-green-500 hover:bg-green-600 text-white">
                  {isGeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generate Summary & Finalize
                </Button>
              )}
              { (uiStep === ExplorerStep.FINAL_REVIEW) && (
                 <Button onClick={() => {
                    setUiStep(ExplorerStep.INITIAL);
                    setCurrentAssertionText('');
                    setReflectionResult(null);
                    setAllImpactNodes([]);
                    setGraphLinks([]);
                    setConsolidationSuggestions(null);
                    setCascadeSummary(null);
                    setSelectedNode(null);
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
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Core Assertion";
    if (uiStep === ExplorerStep.ORDER_1_PENDING || uiStep === ExplorerStep.ORDER_1_REVIEW) return "Impact Network (1st Order)";
    if (uiStep === ExplorerStep.ORDER_2_PENDING || uiStep === ExplorerStep.ORDER_2_REVIEW) return "Impact Network (Up to 2nd Order)";
    if (uiStep === ExplorerStep.ORDER_3_PENDING || uiStep === ExplorerStep.ORDER_3_REVIEW) return "Impact Network (Up to 3rd Order)";
    if (uiStep === ExplorerStep.GENERATING_SUMMARY) return "Impact Network (Full Map - Generating Summary)";
    if (uiStep === ExplorerStep.FINAL_REVIEW || (uiStep === ExplorerStep.CONSOLIDATION_PENDING && allImpactNodes.length > 0)) return "Impact Network (Full Map)";
    return "Impact Network";
  };

  const getGraphDescription = () => {
    if (uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING ) return "Enter an assertion to begin exploring its cascading impacts.";
    if (uiStep === ExplorerStep.REFLECTION_REVIEW && reflectionResult) return "Core assertion reflected by AI. Confirm to generate first-order impacts.";

    const currentNodes = allImpactNodes; 
    if (currentNodes.length > 0 && (uiStep !== ExplorerStep.REFLECTION_PENDING && uiStep !== ExplorerStep.INITIAL)) {
        let orderText = 'all visible';
        if (uiStep === ExplorerStep.ORDER_1_REVIEW || uiStep === ExplorerStep.ORDER_1_PENDING) {
            orderText = '1st order';
        } else if (uiStep === ExplorerStep.ORDER_2_REVIEW || uiStep === ExplorerStep.ORDER_2_PENDING) {
            orderText = 'up to 2nd order';
        } else if (uiStep === ExplorerStep.ORDER_3_REVIEW || uiStep === ExplorerStep.ORDER_3_PENDING) {
            orderText = 'up to 3rd order';
        } else if (uiStep === ExplorerStep.FINAL_REVIEW || uiStep === ExplorerStep.GENERATING_SUMMARY || uiStep === ExplorerStep.CONSOLIDATION_PENDING) {
            orderText = 'full map';
        }
         return `Explore the generated impacts. Click nodes for details. Currently showing ${orderText} impacts. Current step: ${ExplorerStep[uiStep] || uiStep}`;
    }

    const earlyLoadingSteps = [ExplorerStep.REFLECTION_PENDING, ExplorerStep.ORDER_1_PENDING, ExplorerStep.ORDER_2_PENDING, ExplorerStep.ORDER_3_PENDING, ExplorerStep.CONSOLIDATION_PENDING, ExplorerStep.GENERATING_SUMMARY];
    if (earlyLoadingSteps.includes(uiStep)) {
      return `Processing... Current step: ${ExplorerStep[uiStep] || uiStep}`;
    }

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
        {(uiStep === ExplorerStep.INITIAL || uiStep === ExplorerStep.REFLECTION_PENDING && !reflectionResult) && (
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
