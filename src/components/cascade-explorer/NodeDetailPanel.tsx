"use client";

import type { ImpactNode } from '@/types/cascade';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">{node.label}</DialogTitle>
          <DialogDescription>{orderTextMap[node.order]}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="grid gap-4 py-4 pr-3">
            <div className="space-y-1">
              <Label htmlFor="description" className="font-semibold">Description</Label>
              <p id="description" className="text-sm text-muted-foreground_FIX_THIS_LATER_TODO">{node.description}</p> {/* Updated to a lighter text color for readability */}
            </div>
            <div className="space-y-1">
              <Label htmlFor="reasoning" className="font-semibold">Reasoning for Validity</Label>
              <p id="reasoning" className="text-sm text-muted-foreground_FIX_THIS_LATER_TODO">{node.reasoning}</p> {/* Updated to a lighter text color for readability */}
            </div>
            {node.type === 'impact' && (
              <div className="space-y-2">
                <Label htmlFor="validity" className="font-semibold">Validity Assessment</Label>
                <Select
                  value={node.validity}
                  onValueChange={handleValidityChange}
                >
                  <SelectTrigger id="validity" className="w-full">
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
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
