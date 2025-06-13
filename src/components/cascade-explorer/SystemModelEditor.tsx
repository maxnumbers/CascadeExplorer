
"use client";

import type * as React from 'react';
import { useState, useEffect } from 'react';
import type { SystemModel, SystemStock, SystemAgent, SystemIncentive } from '@/types/cascade';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Edit3, Trash2, Save } from 'lucide-react';

interface SystemModelEditorProps {
  initialSystemModel: SystemModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSystemModel: SystemModel) => void;
}

// This component is a SHELL for now and does not implement full editing.
// It's set up to pass the initial model back on save.
export function SystemModelEditor({
  initialSystemModel,
  isOpen,
  onClose,
  onSave,
}: SystemModelEditorProps): JSX.Element | null {
  const [stocks, setStocks] = useState<SystemStock[]>([]);
  const [agents, setAgents] = useState<SystemAgent[]>([]);
  const [incentives, setIncentives] = useState<SystemIncentive[]>([]);

  useEffect(() => {
    if (initialSystemModel) {
      setStocks(initialSystemModel.stocks || []);
      setAgents(initialSystemModel.agents || []);
      setIncentives(initialSystemModel.incentives || []);
    } else {
      setStocks([]);
      setAgents([]);
      setIncentives([]);
    }
  }, [initialSystemModel, isOpen]); // Re-init when dialog opens or model changes

  if (!initialSystemModel) return null;

  const handleSave = () => {
    // For now, just pass back the model as it was given
    // In a full implementation, this would construct the model from edited state
    onSave({ stocks, agents, incentives }); 
    onClose();
  };

  const renderSection = <T extends { name: string; description?: string }>(
    title: string,
    items: T[],
    // addItem: () => void,
    // updateItem: (index: number, field: keyof T, value: string) => void,
    // deleteItem: (index: number) => void,
    itemType: 'stock' | 'agent' | 'incentive'
  ) => (
    <div className="space-y-3 p-3 border border-input rounded-md">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-primary">{title}</h4>
        <Button variant="outline" size="sm" disabled>
          <PlusCircle className="w-4 h-4 mr-2" /> Add {itemType === 'incentive' ? 'Incentive' : itemType.charAt(0).toUpperCase() + itemType.slice(1)}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {itemType}s defined.</p>
      ) : (
        items.map((item, index) => (
          <div key={`${itemType}-${index}`} className="p-3 border border-border rounded-md bg-background/50 space-y-2">
            <div className="flex justify-between items-center">
                <p className="font-medium text-foreground">
                    {itemType === 'incentive' 
                        ? `${(item as SystemIncentive).agentName} -> ${(item as SystemIncentive).targetStockName}` 
                        : item.name}
                </p>
                <div className="space-x-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled><Edit3 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
            </div>
            {itemType !== 'incentive' && item.description && (
              <p className="text-xs text-muted-foreground"><i>Desc:</i> {item.description}</p>
            )}
            {itemType === 'incentive' && (
              <>
                <p className="text-xs text-muted-foreground"><i>Incentive:</i> {(item as SystemIncentive).incentiveDescription}</p>
                {(item as SystemIncentive).resultingFlow && <p className="text-xs text-muted-foreground"><i>Flow:</i> {(item as SystemIncentive).resultingFlow}</p>}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card text-card-foreground border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Edit System Model</DialogTitle>
          <DialogDescription>
            Modify the stocks, agents, and incentives identified by the AI. (Full editing coming soon)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderSection<SystemStock>("Stocks", stocks, 'stock')}
            {renderSection<SystemAgent>("Agents", agents, 'agent')}
            {renderSection<SystemIncentive>("Incentives & Flows", incentives, 'incentive')}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-6 pt-4 border-t border-border">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Save Changes (Read-Only for Now)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
