"use client";

import { useState, useEffect, useCallback } from 'react';
import { reflectAssertion } from '@/ai/flows/assertion-reflection';
import { impactMapping } from '@/ai/flows/impact-mapping';
import type { ImpactNode, ImpactLink, ImpactData, AIImpactMappingOutput, AIReflectAssertionOutput, Impact } from '@/types/cascade';
import { AssertionInputForm } from '@/components/cascade-explorer/AssertionInputForm';
import { ReflectionDisplay } from '@/components/cascade-explorer/ReflectionDisplay';
import NetworkGraph from '@/components/cascade-explorer/NetworkGraph';
import { NodeDetailPanel } from '@/components/cascade-explorer/NodeDetailPanel';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CascadeExplorerPage() {
  const [currentAssertion, setCurrentAssertion] = useState<string>('');
  const [reflectionResult, setReflectionResult] = useState<AIReflectAssertionOutput | null>(null);
  
  const [graphNodes, setGraphNodes] = useState<ImpactNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<ImpactLink[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<ImpactNode | null>(null);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);

  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [isLoadingImpactMap, setIsLoadingImpactMap] = useState(false);

  const { toast } = useToast();

  const handleAssertionSubmit = async (assertion: string) => {
    setIsLoadingReflection(true);
    setReflectionResult(null);
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

    const addImpacts = (impacts: Impact[], order: 1 | 2 | 3, parentId?: string) => {
      impacts.forEach(impact => {
        const impactNode: ImpactNode = {
          ...impact,
          order,
          type: 'impact',
        };
        nodes.push(impactNode);
        if (parentId) {
          links.push({ source: parentId, target: impact.id });
        }
        
        // Recursively add children if structure was nested (not needed for current AI output)
        // if (order < 3 && impact.children) { // Assuming children property if AI provided nested
        //   addImpacts(impact.children, (order + 1) as 2 | 3, impact.id);
        // }
      });
    };
    
    // Connect first-order to core assertion
    impactData.firstOrder.forEach(fo => {
      addImpacts([fo], 1, coreNode.id);
      // Connect second-order to their respective first-order
      const relatedSecondOrder = impactData.secondOrder.filter(so => {
        // This logic depends on how AI might link second order. 
        // Assuming second order impacts are directly linked to a first order impact by some implicit AI logic or if AI explicitly stated parent.
        // For now, we'll link based on some heuristic or assume a flat structure where all 2nd orders link to all 1st orders (less ideal).
        // A better AI output would specify parent IDs for 2nd/3rd order impacts.
        // Let's assume for now, 2nd orders are children of specific 1st orders.
        // This part needs robust linking logic based on actual AI capabilities.
        // For demonstration, let's say each 2nd order links back to its corresponding 1st order if IDs matched pattern or AI implied it.
        // This is a simplification: we'll link 2nd order to *their* source firstOrder impacts.
        // The current `impactMapping` AI flow doesn't explicitly state parentage for 2nd/3rd order.
        // So, we'll link them to their 'conceptual' parent.
        // Let's assume AI means secondOrder relates to the context of firstOrder items,
        // and thirdOrder relates to the context of secondOrder items.
        // For a simple graph, each firstOrder is a child of core.
        // Each secondOrder needs a parent firstOrder. Each thirdOrder needs a parent secondOrder.
        // The AI output does not give this parent-child relationship explicitly within the arrays.
        // We will make a simple assumption: link all second orders to all first orders, and all third to all second.
        // This will create a very dense graph. A better approach is needed from AI or user input.
        // For now, let's make 2nd order children of corresponding 1st order (by index, a bad heuristic)
        // OR connect all 2nd orders to all 1st orders.
        // The AI output for impactMapping.ts has firstOrder, secondOrder, thirdOrder as flat arrays.
        // Let's link firstOrder to core. Then, for simplicity:
        // Link first item of secondOrder to first item of firstOrder etc. (round-robin if lengths differ)
        // This is a placeholder for more sophisticated linking.
        // A better way is to have the AI provide parent IDs.
      });
    });
    
    // Simplified linking for demo:
    // First Order -> Core
    impactData.firstOrder.forEach(fo => {
        const node: ImpactNode = { ...fo, order: 1, type: 'impact' };
        if(!nodes.find(n => n.id === node.id)) nodes.push(node);
        links.push({ source: coreNode.id, target: fo.id });
    });

    // Second Order -> Corresponding First Order (example: round-robin)
    if (impactData.firstOrder.length > 0) {
        impactData.secondOrder.forEach((so, idx) => {
            const node: ImpactNode = { ...so, order: 2, type: 'impact' };
            if(!nodes.find(n => n.id === node.id)) nodes.push(node);
            const parentFo = impactData.firstOrder[idx % impactData.firstOrder.length];
            links.push({ source: parentFo.id, target: so.id });
        });
    }


    // Third Order -> Corresponding Second Order (example: round-robin)
    if (impactData.secondOrder.length > 0) {
        impactData.thirdOrder.forEach((to, idx) => {
            const node: ImpactNode = { ...to, order: 3, type: 'impact' };
            if(!nodes.find(n => n.id === node.id)) nodes.push(node);
            const parentSo = impactData.secondOrder[idx % impactData.secondOrder.length];
            links.push({ source: parentSo.id, target: to.id });
        });
    }


    return { nodes, links };
  }, []);


  const handleConfirmReflection = async () => {
    if (!currentAssertion || !reflectionResult) return;
    setIsLoadingImpactMap(true);
    try {
      const result = await impactMapping({ assertion: currentAssertion });
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
    toast({ title: "Validity Updated", description: `Node "${nodeId}" validity set to ${validity}.`});
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Zap className="w-10 h-10 mr-3 text-accent" /> Cascade Explorer
        </h1>
        <p className="text-muted-foreground_FIX_THIS_LATER_TODO mt-2">Explore the cascading impacts of your ideas.</p> {/* Updated for better readability */}
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
      
      <footer className="mt-12 text-center text-sm text-muted-foreground_FIX_THIS_LATER_TODO"> {/* Updated for better readability */}
        <p>&copy; {new Date().getFullYear()} Cascade Explorer. Powered by Firebase Studio & Genkit.</p>
      </footer>
    </div>
  );
}
