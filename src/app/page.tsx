
"use client";

import { useState, useEffect, useCallback } from 'react';
import { reflectAssertion } from '@/ai/flows/assertion-reflection';
import { impactMapping, type ImpactMappingOutput as AIImpactMappingOutput } from '@/ai/flows/impact-mapping';
import { suggestImpactConsolidation, type SuggestImpactConsolidationOutput, type ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import type { ImpactNode, ImpactLink, AIReflectAssertionOutput, Impact } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { ConsolidationSuggestionsDisplay } from '@/components/cascade-explorer/ConsolidationSuggestionsDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CascadeExplorerPage() {
  const [currentAssertion, setCurrentAssertion] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<AIReflectAssertionOutput | null>(null);
  const [rawImpactMapData, setRawImpactMapData] = useState<AIImpactMappingOutput | null>(null);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<SuggestImpactConsolidationOutput | null>(null);
  
  const [graphNodes, setGraphNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [isLoadingImpactMap, setIsLoadingImpactMap] = useState(false);
  const [isLoadingConsolidations, setIsLoadingConsolidations] = useState(false);

  const { toast } = useToast();

  const handleAssertionSubmit = async (assertion: string) => {
    setIsLoadingReflection(true);
    setReflectionResult(null);
    setRawImpactMapData(null);
    setConsolidationSuggestions(null);
    setGraphNodes([]);
    setGraphLinks([]);
    setCurrentAssertion(assertion);
    try {
      const result = await reflectAssertion({ assertion });
      setReflectionResult(result);
    } catch (error) {
      console.error("Error reflecting assertion:", error);
      toast({ title: "Error", description: "Failed to reflect assertion.", variant: "destructive" });
    } finally {
      setIsLoadingReflection(false);
    }
  };

  const processImpactData = useCallback((assertionText: string, reflection: AIReflectAssertionOutput, impactData: AIImpactMappingOutput): { nodes: ImpactNode[], links: ImpactLink[] } => {
    const newGraphNodes: ImpactNode[] = [];
    const newGraphLinks: ImpactLink[] = [];
    const addedNodeIds = new Set<string>();

    // 1. Add Core Assertion Node
    const coreNode: ImpactNode = {
      id: 'core-assertion',
      label: reflection.summary || "Core Assertion",
      description: assertionText,
      validity: 'high', 
      reasoning: 'User-provided assertion, confirmed.',
      order: 0,
      type: 'assertion',
    };
    newGraphNodes.push(coreNode);
    addedNodeIds.add(coreNode.id);

    // 2. Process First-Order Impacts
    const firstOrderNodesProcessed: ImpactNode[] = [];
    impactData.firstOrder.forEach(fo => {
        if (!addedNodeIds.has(fo.id)) {
            const nodeToAdd: ImpactNode = { ...fo, order: 1, type: 'impact' };
            newGraphNodes.push(nodeToAdd);
            newGraphLinks.push({ source: coreNode.id, target: fo.id });
            addedNodeIds.add(fo.id);
            firstOrderNodesProcessed.push(nodeToAdd);
        }
    });

    // 3. Process Second-Order Impacts
    const secondOrderNodesProcessed: ImpactNode[] = [];
    if (firstOrderNodesProcessed.length > 0) {
        impactData.secondOrder.forEach((so, idx) => {
            if (!addedNodeIds.has(so.id)) {
                const nodeToAdd: ImpactNode = { ...so, order: 2, type: 'impact' };
                newGraphNodes.push(nodeToAdd);
                const parentNode = firstOrderNodesProcessed[idx % firstOrderNodesProcessed.length];
                newGraphLinks.push({ source: parentNode.id, target: so.id });
                addedNodeIds.add(so.id);
                secondOrderNodesProcessed.push(nodeToAdd);
            }
        });
    } else { // Fallback: Link to core if no first-order impacts
        impactData.secondOrder.forEach(so => {
            if (!addedNodeIds.has(so.id)) {
                const nodeToAdd: ImpactNode = { ...so, order: 2, type: 'impact' };
                newGraphNodes.push(nodeToAdd);
                newGraphLinks.push({ source: coreNode.id, target: so.id });
                addedNodeIds.add(so.id);
                secondOrderNodesProcessed.push(nodeToAdd);
            }
        });
    }

    // 4. Process Third-Order Impacts
    if (secondOrderNodesProcessed.length > 0) {
        impactData.thirdOrder.forEach((to, idx) => {
            if (!addedNodeIds.has(to.id)) {
                const nodeToAdd: ImpactNode = { ...to, order: 3, type: 'impact' };
                newGraphNodes.push(nodeToAdd);
                const parentNode = secondOrderNodesProcessed[idx % secondOrderNodesProcessed.length];
                newGraphLinks.push({ source: parentNode.id, target: to.id });
                addedNodeIds.add(to.id);
            }
        });
    } else if (firstOrderNodesProcessed.length > 0) { // Fallback: Link to first-order if no second-order
        impactData.thirdOrder.forEach((to, idx) => {
            if (!addedNodeIds.has(to.id)) {
                const nodeToAdd: ImpactNode = { ...to, order: 3, type: 'impact' };
                newGraphNodes.push(nodeToAdd);
                const parentNode = firstOrderNodesProcessed[idx % firstOrderNodesProcessed.length];
                newGraphLinks.push({ source: parentNode.id, target: to.id });
                addedNodeIds.add(to.id);
            }
        });
    } else { // Fallback: Link to core if no first or second-order
        impactData.thirdOrder.forEach(to => {
            if (!addedNodeIds.has(to.id)) {
                const nodeToAdd: ImpactNode = { ...to, order: 3, type: 'impact' };
                newGraphNodes.push(nodeToAdd);
                newGraphLinks.push({ source: coreNode.id, target: to.id });
                addedNodeIds.add(to.id);
            }
        });
    }
    
    return { nodes: newGraphNodes, links: newGraphLinks };
  }, []);


  const handleConfirmReflection = async () => {
    if (!currentAssertion || !reflectionResult) return;
    setIsLoadingImpactMap(true);
    setRawImpactMapData(null);
    setConsolidationSuggestions(null);
    try {
      const result = await impactMapping({ assertion: currentAssertion });
      setRawImpactMapData(result); 
      const { nodes, links: newLinks } = processImpactData(currentAssertion, reflectionResult, result);
      setGraphNodes(nodes);
      setGraphLinks(newLinks);
    } catch (error) {
      console.error("Error generating impact map:", error);
      toast({ title: "Error", description: "Failed to generate impact map.", variant: "destructive" });
    } finally {
      setIsLoadingImpactMap(false);
    }
  };

  const handleSuggestConsolidations = async () => {
    if (!rawImpactMapData) {
      toast({ title: "Error", description: "No impact map data available to analyze.", variant: "destructive" });
      return;
    }
    setIsLoadingConsolidations(true);
    setConsolidationSuggestions(null);
    try {
      const result = await suggestImpactConsolidation(rawImpactMapData);
      setConsolidationSuggestions(result);
      if (result.consolidationSuggestions.length > 0) {
        toast({ title: "Consolidation Suggestions Ready", description: `The AI found ${result.consolidationSuggestions.length} potential consolidation(s). Review them below.` });
      } else {
        toast({ title: "No Consolidations Found", description: "The AI did not find any impacts to consolidate at this time." });
      }
    } catch (error) {
      console.error("Error suggesting consolidations:", error);
      toast({ title: "Error", description: "Failed to get consolidation suggestions.", variant: "destructive" });
    } finally {
      setIsLoadingConsolidations(false);
    }
  };
  
  const handleNodeClick = (node: ImpactNode) => {
    setSelectedNode(node);
    setIsNodePanelOpen(true);
  };

  const handleUpdateValidity = (nodeId: string, validity: 'high' | 'medium' | 'low') => {
    setGraphNodes(prevNodes =>
      prevNodes.map(n => (n.id === nodeId ? { ...n, validity } : n))
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? {...prev, validity} : null);
    }
    
    setRawImpactMapData(prevRawData => {
        if (!prevRawData) return null;
        const updateImpacts = (impacts: Impact[]) => impacts.map(i => i.id === nodeId ? { ...i, validity } : i);
        return {
            firstOrder: updateImpacts(prevRawData.firstOrder),
            secondOrder: updateImpacts(prevRawData.secondOrder),
            thirdOrder: updateImpacts(prevRawData.thirdOrder),
        };
    });
    toast({ title: "Validity Updated", description: `Node "${graphNodes.find(n => n.id === nodeId)?.label || nodeId}" validity set to ${validity}.`});
  };
  
 const handleApplyConsolidation = (suggestion: ConsolidatedImpactSuggestion) => {
    const { originalImpactIds, consolidatedImpact: suggestedConsolidatedImpact } = suggestion;
    const newConsolidatedImpactOrder = parseInt(suggestedConsolidatedImpact.order as string, 10) as 0 | 1 | 2 | 3; // Allow 0 for assertion if needed, though impacts are usually 1,2,3

    // 1. Update rawImpactMapData
    setRawImpactMapData(prevRawData => {
      if (!prevRawData) return null;
      const updatedData = JSON.parse(JSON.stringify(prevRawData)) as AIImpactMappingOutput;

      originalImpactIds.forEach(idToRemove => {
        updatedData.firstOrder = updatedData.firstOrder.filter(i => i.id !== idToRemove);
        updatedData.secondOrder = updatedData.secondOrder.filter(i => i.id !== idToRemove);
        updatedData.thirdOrder = updatedData.thirdOrder.filter(i => i.id !== idToRemove);
      });
      
      const { order, ...impactForRawData } = suggestedConsolidatedImpact; // Exclude 'order' from raw data impact

      if (newConsolidatedImpactOrder === 1) updatedData.firstOrder.push(impactForRawData);
      else if (newConsolidatedImpactOrder === 2) updatedData.secondOrder.push(impactForRawData);
      else if (newConsolidatedImpactOrder === 3) updatedData.thirdOrder.push(impactForRawData);
      
      return updatedData;
    });

    // 2. Update graphNodes
    setGraphNodes(prevNodes => {
      const filteredNodes = prevNodes.filter(n => !originalImpactIds.includes(n.id));
      const newGraphNode: ImpactNode = {
        id: suggestedConsolidatedImpact.id,
        label: suggestedConsolidatedImpact.label,
        description: suggestedConsolidatedImpact.description,
        validity: suggestedConsolidatedImpact.validity,
        reasoning: suggestedConsolidatedImpact.reasoning,
        order: newConsolidatedImpactOrder, // Use the AI provided order
        type: 'impact', // Consolidated nodes are impacts
      };
      // Ensure the new node isn't already there (e.g. if IDs are not perfectly unique from AI)
      if (!filteredNodes.find(n => n.id === newGraphNode.id)) {
        return [...filteredNodes, newGraphNode];
      }
      return filteredNodes.map(n => n.id === newGraphNode.id ? newGraphNode : n); // Replace if ID somehow existed
    });

    // 3. Update graphLinks
    setGraphLinks(prevLinks => {
      const newLinks: ImpactLink[] = [];
      const consolidatedNodeId = suggestedConsolidatedImpact.id;
      const tempLinks: {source: string, target: string}[] = [];

      for (const link of prevLinks) {
        const sourceId = typeof link.source === 'object' ? (link.source as ImpactNode).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as ImpactNode).id : link.target;

        const sourceIsOriginal = originalImpactIds.includes(sourceId);
        const targetIsOriginal = originalImpactIds.includes(targetId);

        if (sourceIsOriginal && targetIsOriginal) {
          // Link between two original nodes, gets removed
          continue;
        } else if (sourceIsOriginal) {
          // Link from an original node to an external node (outgoing)
          // Avoid duplicate links to the same target
          if (!tempLinks.find(l => l.source === consolidatedNodeId && l.target === targetId)) {
             tempLinks.push({ source: consolidatedNodeId, target: targetId });
          }
        } else if (targetIsOriginal) {
          // Link from an external node to an original node (incoming)
          // Avoid duplicate links from the same source
          if (!tempLinks.find(l => l.source === sourceId && l.target === consolidatedNodeId)) {
            tempLinks.push({ source: sourceId, target: consolidatedNodeId });
          }
        } else {
          // Link not involving original nodes
          tempLinks.push({ source: sourceId, target: targetId });
        }
      }
      
      // If the consolidated node has no links after rewiring,
      // try to link it based on its order, similar to processImpactData.
      // This is a fallback if it becomes orphaned.
      const consolidatedNodeHasLinks = tempLinks.some(l => l.source === consolidatedNodeId || l.target === consolidatedNodeId);
      if (!consolidatedNodeHasLinks && currentAssertion && reflectionResult && rawImpactMapData) {
          // Re-evaluate based on its new order. This is simplistic.
          // A better approach might be to ask the AI for parent after consolidation, or user specifies.
          const tempNodesForLinking = graphNodes.filter(n => !originalImpactIds.includes(n.id));
          if (!tempNodesForLinking.find(n => n.id === consolidatedNodeId)) {
            // This should not happen if graphNodes was updated correctly
          }
          
          if (newConsolidatedImpactOrder === 1) {
             if(!tempLinks.find(l => l.source === 'core-assertion' && l.target === consolidatedNodeId)) {
                tempLinks.push({source: 'core-assertion', target: consolidatedNodeId});
             }
          } else if (newConsolidatedImpactOrder === 2) {
            const potentialParents = tempNodesForLinking.filter(n => n.order === 1);
            if (potentialParents.length > 0 && !tempLinks.find(l => l.target === consolidatedNodeId)) { // if no incoming links yet
                tempLinks.push({source: potentialParents[0].id, target: consolidatedNodeId}); // Link to first available parent
            } else if (!tempLinks.find(l => l.source === 'core-assertion' && l.target === consolidatedNodeId)){
                tempLinks.push({source: 'core-assertion', target: consolidatedNodeId}); // Fallback to core
            }
          } else if (newConsolidatedImpactOrder === 3) {
            const potentialParents = tempNodesForLinking.filter(n => n.order === 2);
            if (potentialParents.length > 0 && !tempLinks.find(l => l.target === consolidatedNodeId)) {
                tempLinks.push({source: potentialParents[0].id, target: consolidatedNodeId});
            } else {
                const fallbackParents = tempNodesForLinking.filter(n => n.order === 1);
                if (fallbackParents.length > 0 && !tempLinks.find(l => l.target === consolidatedNodeId)) {
                   tempLinks.push({source: fallbackParents[0].id, target: consolidatedNodeId});
                } else if(!tempLinks.find(l => l.source === 'core-assertion' && l.target === consolidatedNodeId)) {
                   tempLinks.push({source: 'core-assertion', target: consolidatedNodeId});
                }
            }
          }
      }
      
      // Deduplicate links more robustly
      const uniqueLinkStrings = new Set(tempLinks.map(l => `${l.source}-${l.target}`));
      return Array.from(uniqueLinkStrings).map(s => {
        const [source, target] = s.split('-');
        return { source, target };
      });
    });
    
    // 4. Update UI
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
        description: `Suggestion for consolidated impact ID ${suggestionId} has been removed from the list.`
    });
    setConsolidationSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        consolidationSuggestions: prev.consolidationSuggestions.filter(s => s.consolidatedImpact.id !== suggestionId)
      };
    });
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Zap className="w-10 h-10 mr-3 text-accent" /> Cascade Explorer
        </h1>
        <p className="text-muted-foreground mt-2">Explore the cascading impacts of your ideas.</p>
      </header>

      <main className="flex-grow flex flex-col gap-6">
        <Card className="shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">1. Define Your Assertion</CardTitle>
          </CardHeader>
          <CardContent>
            <AssertionInputForm onSubmit={handleAssertionSubmit} isLoading={isLoadingReflection} />
          </CardContent>
        </Card>

        {isLoadingReflection && (
          <div className="flex justify-center items-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-lg">Reflecting on your assertion...</p>
          </div>
        )}

        {reflectionResult && !isLoadingReflection && (
           <Card className="shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">2. Confirm Understanding</CardTitle>
            </CardHeader>
            <CardContent>
              <ReflectionDisplay 
                reflection={reflectionResult} 
                onConfirm={handleConfirmReflection}
                isLoadingConfirmation={isLoadingImpactMap}
              />
            </CardContent>
          </Card>
        )}
        
        {isLoadingImpactMap && (
          <div className="flex justify-center items-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-lg">Generating impact map...</p>
          </div>
        )}

        {rawImpactMapData && graphNodes.length > 0 && !isLoadingImpactMap && (
          <div className="my-4 flex justify-center">
            <Button 
              onClick={handleSuggestConsolidations} 
              disabled={isLoadingConsolidations || (consolidationSuggestions?.consolidationSuggestions?.length === 0 && consolidationSuggestions !== null)}
              variant="outline"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isLoadingConsolidations ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {consolidationSuggestions?.consolidationSuggestions?.length === 0 && consolidationSuggestions !== null ? "No More Suggestions" : "Suggest Consolidations"}
            </Button>
          </div>
        )}

        {isLoadingConsolidations && (
           <div className="flex justify-center items-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-lg">Analyzing for consolidations...</p>
          </div>
        )}

        {consolidationSuggestions && consolidationSuggestions.consolidationSuggestions.length > 0 && !isLoadingConsolidations && (
          <ConsolidationSuggestionsDisplay 
            suggestions={consolidationSuggestions}
            graphNodes={graphNodes} 
            onApplyConsolidation={handleApplyConsolidation}
            onDismissSuggestion={handleDismissConsolidation}
          />
        )}


        {graphNodes.length > 0 && !isLoadingImpactMap && (
          <Card className="shadow-xl bg-card flex-grow flex flex-col min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">3. Explore Impact Network</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <NetworkGraph nodes={graphNodes} links={graphLinks} onNodeClick={handleNodeClick} width={800} height={700} />
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

