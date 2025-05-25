
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
    const nodes: ImpactNode[] = [];
    const links: ImpactLink[] = [];

    const coreNode: ImpactNode = {
      id: 'core-assertion',
      label: reflection.summary || "Core Assertion",
      description: assertionText,
      validity: 'high', 
      reasoning: 'User-provided assertion, confirmed.',
      order: 0,
      type: 'assertion',
    };
    nodes.push(coreNode);
    
    const addNodeAndLink = (impact: Impact, order: 1 | 2 | 3, parentId: string) => {
        if (!nodes.find(n => n.id === impact.id)) {
            const impactNode: ImpactNode = {
                ...impact,
                order,
                type: 'impact',
            };
            nodes.push(impactNode);
            links.push({ source: parentId, target: impact.id });
        }
    };
    
    impactData.firstOrder.forEach(fo => {
        addNodeAndLink(fo, 1, coreNode.id);
    });

    impactData.secondOrder.forEach(so => {
        // Try to find a parent in firstOrder. This logic might need refinement if mapping isn't direct.
        // For now, this assumes secondOrder impacts relate to firstOrder impacts primarily.
        // A more robust solution would require the AI to specify parent IDs for second/third order impacts.
        const potentialParentFoId = impactData.firstOrder.find(fo => so.id.startsWith(fo.id + "-"))?.id || coreNode.id; // Example heuristic
        addNodeAndLink(so, 2, potentialParentFoId);
    });

    impactData.thirdOrder.forEach(to => {
        const potentialParentSoId = impactData.secondOrder.find(so => to.id.startsWith(so.id + "-"))?.id || coreNode.id; // Example heuristic
        addNodeAndLink(to, 3, potentialParentSoId);
    });
    
    // A simple linking logic for now: connect based on array position if AI doesn't give parent info
    // This needs to be improved if the AI output doesn't imply parentage
    if (impactData.firstOrder.length > 0 && impactData.secondOrder.length > 0) {
        impactData.secondOrder.forEach((so, idx) => {
            if (!links.find(l => l.target === so.id)) { // If not already linked by a more specific logic
                 const parentFo = impactData.firstOrder[idx % impactData.firstOrder.length];
                 if (parentFo && !links.find(l => l.source === parentFo.id && l.target === so.id)) {
                    links.push({ source: parentFo.id, target: so.id });
                 }
            }
        });
    }
    if (impactData.secondOrder.length > 0 && impactData.thirdOrder.length > 0) {
         impactData.thirdOrder.forEach((to, idx) => {
            if (!links.find(l => l.target === to.id)) {
                const parentSo = impactData.secondOrder[idx % impactData.secondOrder.length];
                if (parentSo && !links.find(l => l.source === parentSo.id && l.target === to.id)) {
                    links.push({ source: parentSo.id, target: to.id });
                }
            }
        });
    }


    return { nodes, links };
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
    const newConsolidatedImpactOrder = parseInt(suggestedConsolidatedImpact.order as string, 10) as 1 | 2 | 3;

    // 1. Update rawImpactMapData
    setRawImpactMapData(prevRawData => {
      if (!prevRawData) return null;
      const updatedData = JSON.parse(JSON.stringify(prevRawData)) as AIImpactMappingOutput;

      originalImpactIds.forEach(idToRemove => {
        updatedData.firstOrder = updatedData.firstOrder.filter(i => i.id !== idToRemove);
        updatedData.secondOrder = updatedData.secondOrder.filter(i => i.id !== idToRemove);
        updatedData.thirdOrder = updatedData.thirdOrder.filter(i => i.id !== idToRemove);
      });
      
      // Create the impact object for rawData (without the AI's 'order' field)
      const { order, ...impactForRawData } = suggestedConsolidatedImpact;

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
        order: newConsolidatedImpactOrder,
        type: 'impact',
      };
      return [...filteredNodes, newGraphNode];
    });

    // 3. Update graphLinks
    setGraphLinks(prevLinks => {
      const newLinks: ImpactLink[] = [];
      const consolidatedNodeId = suggestedConsolidatedImpact.id;

      for (const link of prevLinks) {
        const sourceIsOriginal = originalImpactIds.includes(link.source as string);
        const targetIsOriginal = originalImpactIds.includes(link.target as string);

        if (sourceIsOriginal && targetIsOriginal) {
          // Link between two original nodes, gets removed
          continue;
        } else if (sourceIsOriginal) {
          // Link from an original node to an external node
          newLinks.push({ source: consolidatedNodeId, target: link.target });
        } else if (targetIsOriginal) {
          // Link from an external node to an original node
          newLinks.push({ source: link.source, target: consolidatedNodeId });
        } else {
          // Link not involving original nodes
          newLinks.push(link);
        }
      }
      // Deduplicate links
      const uniqueLinkStrings = new Set(newLinks.map(l => `${l.source}-${l.target}`));
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
