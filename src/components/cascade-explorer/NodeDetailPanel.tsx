
"use client";

import type { ImpactNode, StructuredConcept } from '@/types/cascade';
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

interface NodeDetailPanelProps {
  node: ImpactNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateValidity: (nodeId: string, validity: 'high' | 'medium' | 'low') => void;
}

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
  const coreComponents = node.properties?.coreComponents || [];
  
  const keyConcepts: StructuredConcept[] = node.keyConcepts || (node.properties?.keyConcepts as StructuredConcept[]) || [];
  const attributes: string[] = node.attributes || (node.properties?.attributes as string[]) || [];
  const causalReasoning = node.causalReasoning;
  
  const explicitlyHandledPropertyKeys = ['fullAssertionText', 'coreComponents', 'keyConcepts', 'attributes'];
  
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
                    <Label className="font-semibold text-primary">Full Assertion Text</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fullAssertionText}</p>
                </div>
            )}
            {node.nodeSystemType === 'CORE_ASSERTION' && coreComponents && coreComponents.length > 0 && (
                 <div className="space-y-1 border-t border-border pt-3 mt-3">
                    <Label className="font-semibold text-primary">Core Components (from Assertion)</Label>
                    <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground">
                        {coreComponents.map((item, index) => <li key={`core-${index}`}>{item}</li>)}
                    </ul>
                </div>
            )}

            {keyConcepts && Array.isArray(keyConcepts) && keyConcepts.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3 mt-3">
                <Label className="font-semibold text-primary">Key Concepts</Label>
                <div className="flex flex-wrap gap-1">
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
                <Label className="font-semibold text-primary">Attributes</Label>
                 <div className="flex flex-wrap gap-1">
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
