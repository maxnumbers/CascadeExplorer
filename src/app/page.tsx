
"use client";

import { useState, useCallback, useMemo } from 'react';
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
  
  const [allImpactNodes, setAllImpactNodes] <ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] <ImpactLink[]>([]);
  
  const [uiStep, setUiStep] = useState<ExplorerStep>(ExplorerStep.INITIAL);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);
  
  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

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

    let loadingStep: ExplorerStep;
    let reviewStep: ExplorerStep;
    let parentNodesForAI: Impact[] = [];
    let parentNodesForLinking: ImpactNode[] = [];

    switch (targetOrder) {
      case 1:
        loadingStep = ExplorerStep.ORDER_1_PENDING;
        reviewStep = ExplorerStep.ORDER_1_REVIEW;
        const coreNode = allImpactNodes.find(n => n.id === CORE_ASSERTION_ID);
        if (coreNode) parentNodesForLinking = [coreNode];
        // No parentImpactsForAI for 1st order, AI uses assertionText
        break;
      case 2:
        loadingStep = ExplorerStep.ORDER_2_PENDING;
        reviewStep = ExplorerStep.ORDER_2_REVIEW;
        parentNodesForLinking = allImpactNodes.filter(n => n.order === 1);
        parentNodesForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest);
        break;
      case 3:
        loadingStep = ExplorerStep.ORDER_3_PENDING;
        reviewStep = ExplorerStep.ORDER_3_REVIEW;
        parentNodesForLinking = allImpactNodes.filter(n => n.order === 2);
        parentNodesForAI = parentNodesForLinking.map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest);
        break;
      default:
        return;
    }
    
    if ((targetOrder === 2 || targetOrder === 3) && parentNodesForLinking.length === 0) {
        toast({ title: `No Parent Impacts`, description: `Cannot generate ${targetOrder}nd/rd order impacts as no impacts from the previous order exist.`, variant: "destructive" });
        setUiStep(reviewStep); // or go to a state that allows proceeding or stopping
        return;
    }

    setUiStep(loadingStep);
    setConsolidationSuggestions(null); // Clear old suggestions

    try {
      const result = await generateImpactsByOrder({
        assertionText: currentAssertionText,
        targetOrder: String(targetOrder) as '1' | '2' | '3',
        parentImpacts: parentNodesForAI.length > 0 ? parentNodesForAI : undefined,
      });

      setAllImpactNodes(prevNodes => {
        const newNodes = result.generatedImpacts.map(impact => ({
          ...impact,
          order: targetOrder,
          type: 'impact' as 'impact',
        }));
        // Filter out any potential duplicates by ID, favoring new ones if IDs clash (though IDs should be unique)
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        newNodes.forEach(n => nodeMap.set(n.id, n));
        return Array.from(nodeMap.values());
      });

      setGraphLinks(prevLinks => {
        const newLinks: ImpactLink[] = [];
        if (parentNodesForLinking.length > 0) {
          result.generatedImpacts.forEach((newImpact, idx) => {
            // Simple round-robin linking to parents if multiple parents
            const parentNode = parentNodesForLinking[idx % parentNodesForLinking.length];
            if (parentNode) {
                 newLinks.push({ source: parentNode.id, target: newImpact.id });
            }
          });
        }
        // Deduplicate links
        const linkMap = new Map(prevLinks.map(l => [`${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`, l]));
        newLinks.forEach(l => linkMap.set(`${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`, l));
        return Array.from(linkMap.values());
      });
      
      setUiStep(reviewStep);
    } catch (error) {
      console.error(`Error generating ${targetOrder}-order impacts:`, error);
      toast({ title: "Error", description: `Failed to generate ${targetOrder}-order impacts.`, variant: "destructive" });
      setUiStep(targetOrder === 1 ? ExplorerStep.REFLECTION_REVIEW : (targetOrder === 2 ? ExplorerStep.ORDER_1_REVIEW : ExplorerStep.ORDER_2_REVIEW));
    }
  }, [currentAssertionText, allImpactNodes, toast]);


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
    setAllImpactNodes([coreNode]);
    setGraphLinks([]); // Reset links
    await fetchImpactsForOrder(1);
  }, [reflectionResult, currentAssertionText, fetchImpactsForOrder]);

  const handleProceedToNextOrder = useCallback(async () => {
    if (uiStep === ExplorerStep.ORDER_1_REVIEW) {
      await fetchImpactsForOrder(2);
    } else if (uiStep === ExplorerStep.ORDER_2_REVIEW) {
      await fetchImpactsForOrder(3);
    } else if (uiStep === ExplorerStep.ORDER_3_REVIEW) {
      setUiStep(ExplorerStep.FINAL_REVIEW); // All orders generated
      toast({ title: "Impact Map Complete", description: "All impact orders have been generated. You can now review or consolidate further."});
    }
  }, [uiStep, fetchImpactsForOrder, toast]);


  const handleSuggestConsolidations = async () => {
    const impactsForConsolidation: ImpactMappingInputForConsolidation = {
      firstOrder: allImpactNodes.filter(n => n.order === 1).map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
      secondOrder: allImpactNodes.filter(n => n.order === 2).map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
      thirdOrder: allImpactNodes.filter(n => n.order === 3).map(({ x, y, vx, vy, fx, fy, index, originalColor, type, order, ...rest }) => rest),
    };

    if (impactsForConsolidation.firstOrder.length === 0 && impactsForConsolidation.secondOrder.length === 0 && impactsForConsolidation.thirdOrder.length === 0) {
      toast({ title: "No Impacts", description: "No impacts available to analyze for consolidation.", variant: "destructive" });
      return;
    }

    setUiStep(ExplorerStep.CONSOLIDATION_PENDING);
    try {
      const result = await suggestImpactConsolidation(impactsForConsolidation);
      setConsolidationSuggestions(result);
      if (result.consolidationSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${result.consolidationSuggestions.length} potential consolidation(s).` });
      } else {
        toast({ title: "No Consolidations Found", description: "The AI did not find any impacts to consolidate." });
      }
    } catch (error) {
      console.error("Error suggesting consolidations:", error);
      toast({ title: "Error", description: "Failed to get consolidation suggestions.", variant: "destructive" });
    } finally {
      // Revert to the step before consolidation was triggered
      if (allImpactNodes.some(n => n.order === 3)) setUiStep(ExplorerStep.ORDER_3_REVIEW);
      else if (allImpactNodes.some(n => n.order === 2)) setUiStep(ExplorerStep.ORDER_2_REVIEW);
      else if (allImpactNodes.some(n => n.order === 1)) setUiStep(ExplorerStep.ORDER_1_REVIEW);
      else setUiStep(ExplorerStep.REFLECTION_REVIEW);
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
    toast({ title: "Validity Updated", description: `Node "${allImpactNodes.find(n => n.id === nodeId)?.label || nodeId}" validity set to ${validity}.`});
  };
  
 const handleApplyConsolidation = (suggestion: ConsolidatedImpactSuggestion) => {
    const { originalImpactIds, consolidatedImpact: suggestedConsolidatedImpact } = suggestion;
    const newConsolidatedImpactOrder = parseInt(suggestedConsolidatedImpact.order as string, 10) as 1 | 2 | 3;

    const newGraphNode: ImpactNode = {
        id: suggestedConsolidatedImpact.id,
        label: suggestedConsolidatedImpact.label,
        description: suggestedConsolidatedImpact.description,
        validity: suggestedConsolidatedImpact.validity,
        reasoning: suggestedConsolidatedImpact.reasoning,
        order: newConsolidatedImpactOrder,
        type: 'impact', 
    };

    setAllImpactNodes(prevNodes => {
        const filteredNodes = prevNodes.filter(n => !originalImpactIds.includes(n.id));
        if (!filteredNodes.find(n => n.id === newGraphNode.id)) {
            return [...filteredNodes, newGraphNode];
        }
        return filteredNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n);
    });
    
    setGraphLinks(prevLinks => {
        let linksToKeep: ImpactLink[] = [];
        let childLinksToReParent: ImpactLink[] = []; // Links where an original node was a source
        let parentLinksToReParent: ImpactLink[] = []; // Links where an original node was a target

        prevLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
            const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);

            if (originalImpactIds.includes(sourceId) && originalImpactIds.includes(targetId)) {
                // Skip links between two original nodes
            } else if (originalImpactIds.includes(sourceId)) {
                childLinksToReParent.push({ source: newGraphNode.id, target: targetId });
            } else if (originalImpactIds.includes(targetId)) {
                parentLinksToReParent.push({ source: sourceId, target: newGraphNode.id });
            } else {
                linksToKeep.push(link);
            }
        });
        
        linksToKeep = linksToKeep.concat(childLinksToReParent, parentLinksToReParent);

        // If the consolidated node has no parents from the re-parenting logic, add default parent links
        const hasParentLink = linksToKeep.some(l => (typeof l.target === 'object' ? l.target.id : String(l.target)) === newGraphNode.id);
        if (!hasParentLink) {
            if (newGraphNode.order === 1 && !linksToKeep.some(l => l.target === newGraphNode.id && l.source === CORE_ASSERTION_ID)) {
                 linksToKeep.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
            } else if (newGraphNode.order > 1) {
                const potentialParents = allImpactNodes.filter(n => n.order === newGraphNode.order - 1 && !originalImpactIds.includes(n.id));
                if (potentialParents.length > 0 && !linksToKeep.some(l => l.target === newGraphNode.id) ) {
                     linksToKeep.push({ source: potentialParents[0].id, target: newGraphNode.id }); // Link to first available parent
                } else if (!linksToKeep.some(l => l.target === newGraphNode.id && l.source === CORE_ASSERTION_ID)) { // Fallback to core
                     linksToKeep.push({ source: CORE_ASSERTION_ID, target: newGraphNode.id });
                }
            }
        }
      
        const uniqueLinks = new Map<string, { source: string; target: string }>();
        linksToKeep.forEach(link => {
          const src = typeof link.source === 'object' ? link.source.id : String(link.source);
          const tgt = typeof link.target === 'object' ? link.target.id : String(link.target);
          if (src === tgt) return; // Avoid self-loops from this logic
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
    if (uiStep === ExplorerStep.REFLECTION_REVIEW) {
        return allImpactNodes.filter(n => n.order === 0);
    }
    // Default to showing all generated nodes
    return allImpactNodes;
  }, [allImpactNodes, uiStep]);

  const renderStepContent = () => {
    const commonLoading = (text: string) => (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">{text}</p>
      </div>
    );

    switch (uiStep) {
      case ExplorerStep.INITIAL:
      case ExplorerStep.REFLECTION_INPUT: // Covered by AssertionInputForm visibility
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
                isLoadingConfirmation={uiStep === ExplorerStep.ORDER_1_PENDING}
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
        return (
          <>
            {/* Buttons for progressing and consolidation */}
            <div className="my-4 flex flex-wrap justify-center gap-4">
              { (uiStep === ExplorerStep.ORDER_1_REVIEW || uiStep === ExplorerStep.ORDER_2_REVIEW || uiStep === ExplorerStep.ORDER_3_REVIEW || uiStep === ExplorerStep.FINAL_REVIEW) && allImpactNodes.length > 1 && (
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
              {uiStep === ExplorerStep.ORDER_1_REVIEW && (
                <Button onClick={handleProceedToNextOrder} className="bg-primary text-primary-foreground">
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> Generate 2nd Order Impacts
                </Button>
              )}
              {uiStep === ExplorerStep.ORDER_2_REVIEW && (
                <Button onClick={handleProceedToNextOrder} className="bg-primary text-primary-foreground">
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> Generate 3rd Order Impacts
                </Button>
              )}
              {uiStep === ExplorerStep.ORDER_3_REVIEW && (
                 <Button onClick={handleProceedToNextOrder} className="bg-green-500 hover:bg-green-600 text-white">
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Complete & Review
                </Button>
              )}
            </div>

            {consolidationSuggestions && consolidationSuggestions.consolidationSuggestions.length > 0 && (
              <ConsolidationSuggestionsDisplay 
                suggestions={consolidationSuggestions}
                graphNodes={allImpactNodes} 
                onApplyConsolidation={handleApplyConsolidation}
                onDismissSuggestion={handleDismissConsolidation}
              />
            )}
          </>
        );
      default:
        return <p className="text-center">Explorer is in an unknown state.</p>;
    }
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
        {uiStep !== ExplorerStep.REFLECTION_PENDING && uiStep !== ExplorerStep.REFLECTION_REVIEW && 
         !allImpactNodes.some(n => n.order > 0) && // Only show initial input if no impacts exist yet
          (
          <Card className="shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">1. Define Your Assertion</CardTitle>
            </CardHeader>
            <CardContent>
              <AssertionInputForm onSubmit={handleAssertionSubmit} isLoading={uiStep === ExplorerStep.REFLECTION_PENDING} />
            </CardContent>
          </Card>
        )}

        {renderStepContent()}
        
        {visibleNodes.length > 0 && (
          <Card className="shadow-xl bg-card flex-grow flex flex-col min-h-[600px] mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-primary flex items-center">
                <ListChecks className="mr-2 h-6 w-6 text-accent"/>
                Impact Network 
                 { uiStep === ExplorerStep.ORDER_1_REVIEW && " (1st Order)"}
                 { uiStep === ExplorerStep.ORDER_2_REVIEW && " (1st & 2nd Order)"}
                 { (uiStep === ExplorerStep.ORDER_3_REVIEW || uiStep === ExplorerStep.FINAL_REVIEW) && " (All Orders)"}
              </CardTitle>
              <CardDescription>
                { uiStep === ExplorerStep.REFLECTION_REVIEW ? "Core assertion reflected." : "Explore the generated impacts. Click nodes for details." }
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
