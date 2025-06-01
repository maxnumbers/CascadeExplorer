
"use client";

import type { ImpactNode, StructuredConcept, SystemModel } from '@/types/cascade';
import { VALIDITY_OPTIONS } from '@/types/cascade';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Package, Users, TrendingUp, ArrowRightLeft } from 'lucide-react'; // Added icons

interface NodeDetailPanelProps {
  node: ImpactNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateValidity: (nodeId: string, validity: 'high' | 'medium' | 'low') => void;
}

const renderSystemModelForPanel = (systemModel: SystemModel) => {
  return (
    <div className="space-y-3">
      <div>
        <h5 className="font-medium text-primary flex items-center mb-1">
          <Package className="w-4 h-4 mr-2 text-accent" />
          Stocks:
        </h5>
        {systemModel.stocks && systemModel.stocks.length > 0 ? (
          <ul className="list-none pl-0 space-y-1">
            {systemModel.stocks.map((stock, index) => (
              <li key={`panel-stock-${index}`} className="p-1.5 border border-input rounded-md bg-background/30 text-xs">
                <strong className="text-foreground">{stock.name}</strong>
                {stock.description && <p className="text-muted-foreground mt-0.5">{stock.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">None identified.</p>}
      </div>
      <div>
        <h5 className="font-medium text-primary flex items-center mb-1">
          <Users className="w-4 h-4 mr-2 text-accent" />
          Agents:
        </h5>
        {systemModel.agents && systemModel.agents.length > 0 ? (
          <ul className="list-none pl-0 space-y-1">
            {systemModel.agents.map((agent, index) => (
              <li key={`panel-agent-${index}`} className="p-1.5 border border-input rounded-md bg-background/30 text-xs">
                <strong className="text-foreground">{agent.name}</strong>
                {agent.description && <p className="text-muted-foreground mt-0.5">{agent.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">None identified.</p>}
      </div>
      <div>
        <h5 className="font-medium text-primary flex items-center mb-1">
          <TrendingUp className="w-4 h-4 mr-2 text-accent" />
          Incentives & Flows:
        </h5>
        {systemModel.incentives && systemModel.incentives.length > 0 ? (
          <ul className="list-none pl-0 space-y-2">
            {systemModel.incentives.map((incentive, index) => (
              <li key={`panel-incentive-${index}`} className="p-2 border border-input rounded-md bg-background/30 space-y-0.5 text-xs">
                <div>
                  <Badge variant="secondary" className="mr-1 text-xs">{incentive.agentName}</Badge>
                   <ArrowRightLeft className="w-2.5 h-2.5 inline-block mx-0.5 text-muted-foreground" />
                  <Badge variant="outline" className="mr-1 text-xs">{incentive.targetStockName}</Badge>
                </div>
                <p><strong className="text-foreground font-normal">Incentive:</strong> {incentive.incentiveDescription}</p>
                {incentive.resultingFlow && <p className="text-muted-foreground"><strong className="text-foreground font-normal">Resulting Flow:</strong> {incentive.resultingFlow}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">None identified.</p>}
      </div>
    </div>
  );
};


export function NodeDetailPanel({ node, isOpen, onClose, onUpdateValidity }: NodeDetailPanelProps): JSX.Element | null {
  if (!node) return null;

  const handleValidityChange = (newValidity: string) => {
    onUpdateValidity(node.id, newValidity as 'high' | 'medium' | 'low');
  };

  const orderTextMap: Record<number, string> = {
    0: "Core Assertion",
    1: "First-Order Impact",
    2: "Second-Order Impact",
    3: "Third-Order Impact",
  };

  const nodeTypeDisplay = node.nodeSystemType;

  // Access structured data directly from node properties or top-level fields
  const fullAssertionText = node.properties?.fullAssertionText || (node.nodeSystemType === 'CORE_ASSERTION' ? node.description : undefined);
  const systemModel = node.properties?.systemModel as SystemModel | undefined;
  
  const keyConcepts: StructuredConcept[] = node.keyConcepts || (node.properties?.keyConcepts as StructuredConcept[]) || [];
  const attributes: string[] = node.attributes || (node.properties?.attributes as string[]) || [];
  const causalReasoning = node.causalReasoning;
  
  const explicitlyHandledPropertyKeys = ['fullAssertionText', 'systemModel', 'keyConcepts', 'attributes'];
  
  const otherProperties = node.properties 
    ? Object.fromEntries(
        Object.entries(node.properties).filter(([key]) => !explicitlyHandledPropertyKeys.includes(key))
      )
    : {};


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">{node.label}</DialogTitle>
          <DialogDescription>{orderTextMap[node.order]} ({nodeTypeDisplay})</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="grid gap-4 py-4 pr-3">
            <div className="space-y-1">
              <Label htmlFor="description" className="font-semibold text-primary">Description</Label>
              <p id="description" className="text-sm text-muted-foreground whitespace-pre-wrap">{node.description}</p>
            </div>

            {causalReasoning && node.order > 0 && (
                 <div className="space-y-1 border-t border-border pt-3 mt-3">
                    <Label htmlFor="causalReasoning" className="font-semibold text-primary">Reasoning for Link to Parent</Label>
                    <p id="causalReasoning" className="text-sm text-muted-foreground whitespace-pre-wrap">{causalReasoning}</p>
                </div>
            )}

            <div className="space-y-1 border-t border-border pt-3 mt-3">
              <Label htmlFor="reasoning" className="font-semibold text-primary">Reasoning for Validity</Label>
              <p id="reasoning" className="text-sm text-muted-foreground whitespace-pre-wrap">{node.reasoning}</p>
            </div>

            {node.nodeSystemType === 'CORE_ASSERTION' && fullAssertionText && node.description !== fullAssertionText && (
                <div className="space-y-1 border-t border-border pt-3 mt-3">
                    <Label className="font-semibold text-primary">Full Original Assertion Text</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fullAssertionText}</p>
                </div>
            )}
            {node.nodeSystemType === 'CORE_ASSERTION' && systemModel && (
                 <div className="space-y-1 border-t border-border pt-3 mt-3">
                    <Label className="font-semibold text-primary">Extracted System Model</Label>
                    <div className="mt-1 p-2 border border-input rounded-md">
                      {renderSystemModelForPanel(systemModel)}
                    </div>
                </div>
            )}

            {keyConcepts && Array.isArray(keyConcepts) && keyConcepts.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3 mt-3">
                <Label className="font-semibold text-primary">General Key Concepts</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                    {keyConcepts.map((item, index) => (
                      <Badge key={`kc-${index}-${item.name}`} variant="secondary">
                        {item.name}
                        {item.type && <span className="ml-1 opacity-75">({item.type})</span>}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {attributes && Array.isArray(attributes) && attributes.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3 mt-3">
                <Label className="font-semibold text-primary">Impact Attributes</Label>
                 <div className="flex flex-wrap gap-1 mt-1">
                    {attributes.map((item, index) => <Badge key={`attr-${index}-${item}`} variant="outline">{item}</Badge>)}
                </div>
              </div>
            )}
            
            {Object.keys(otherProperties).length > 0 && (
              <div className="space-y-2 border-t border-border pt-3 mt-3">
                <h4 className="font-semibold text-primary mb-1">Other Properties:</h4>
                {Object.entries(otherProperties).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                    {Array.isArray(value) ? (
                      <ul className="list-disc list-inside ml-4">
                        {value.map((item, index) => (
                          <li key={index} className="text-foreground">{String(item)}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-foreground">{String(value)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="validity" className="font-semibold text-primary">Validity Assessment</Label>
              <Select
                value={node.validity}
                onValueChange={handleValidityChange}
              >
                <SelectTrigger id="validity" className="w-full bg-input text-foreground">
                  <SelectValue placeholder="Select validity" />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    