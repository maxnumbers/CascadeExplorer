
"use client";

import type { AIReflectAssertionOutput, SystemModel, SystemStock, SystemAgent, SystemIncentive } from '@/types/cascade'; // Updated import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Package, Users, TrendingUp, ArrowRightLeft } from 'lucide-react'; // Added icons
import { Badge } from '@/components/ui/badge';

interface ReflectionDisplayProps {
  reflection: AIReflectAssertionOutput;
  onConfirm: () => void;
  isLoadingConfirmation: boolean;
  confirmButtonText?: string;
}

const renderSystemModel = (systemModel: SystemModel) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-primary flex items-center mb-2">
          <Package className="w-5 h-5 mr-2 text-accent" />
          Identified Stocks (Key Resources/Accumulations):
        </h4>
        {systemModel.stocks && systemModel.stocks.length > 0 ? (
          <ul className="list-none pl-0 space-y-2">
            {systemModel.stocks.map((stock, index) => (
              <li key={`stock-${index}`} className="p-2 border border-input rounded-md bg-background/50">
                <strong className="text-foreground">{stock.name}</strong>
                {stock.description && <p className="text-xs text-muted-foreground mt-1">{stock.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No distinct stocks identified.</p>}
      </div>

      <div>
        <h4 className="font-semibold text-primary flex items-center mb-2">
          <Users className="w-5 h-5 mr-2 text-accent" />
          Identified Agents (Actors/Entities):
        </h4>
        {systemModel.agents && systemModel.agents.length > 0 ? (
          <ul className="list-none pl-0 space-y-2">
            {systemModel.agents.map((agent, index) => (
              <li key={`agent-${index}`} className="p-2 border border-input rounded-md bg-background/50">
                <strong className="text-foreground">{agent.name}</strong>
                {agent.description && <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No distinct agents identified.</p>}
      </div>
      
      <div>
        <h4 className="font-semibold text-primary flex items-center mb-2">
          <TrendingUp className="w-5 h-5 mr-2 text-accent" />
          Identified Incentives & Flows:
        </h4>
        {systemModel.incentives && systemModel.incentives.length > 0 ? (
          <ul className="list-none pl-0 space-y-3">
            {systemModel.incentives.map((incentive, index) => (
              <li key={`incentive-${index}`} className="p-3 border border-input rounded-md bg-background/50 space-y-1">
                <div>
                  <Badge variant="secondary" className="mr-2">{incentive.agentName}</Badge>
                   <ArrowRightLeft className="w-3 h-3 inline-block mx-1 text-muted-foreground" />
                  <Badge variant="outline" className="mr-2">{incentive.targetStockName}</Badge>
                </div>
                <p className="text-sm"><strong className="text-foreground font-medium">Incentive:</strong> {incentive.incentiveDescription}</p>
                {incentive.resultingFlow && <p className="text-xs text-muted-foreground"><strong className="text-foreground font-normal">Resulting Flow/Action:</strong> {incentive.resultingFlow}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No distinct incentives/flows identified.</p>}
      </div>
    </div>
  );
};


export function ReflectionDisplay({ reflection, onConfirm, isLoadingConfirmation, confirmButtonText = "Yes, this is correct. Generate Impact Map." }: ReflectionDisplayProps): JSX.Element {
  return (
    <Card className="mt-6 shadow-lg bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl">Assertion Reflection</CardTitle>
        <CardDescription>Please review the AI's understanding of your assertion, including the identified system model.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-primary">Summary:</h3>
          <p>{reflection.summary}</p>
        </div>
        <div>
          <h3 className="font-semibold text-primary">Reflection Statement:</h3>
          <p>{reflection.reflection}</p>
        </div>
        
        <div className="border-t border-border pt-4">
          <h3 className="font-semibold text-primary text-lg mb-3">Proposed System Model:</h3>
          {reflection.systemModel ? renderSystemModel(reflection.systemModel) : <p>No system model extracted.</p>}
        </div>

        {reflection.keyConcepts && reflection.keyConcepts.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-primary">General Key Concepts:</h3>
             <div className="flex flex-wrap gap-2 mt-2">
                {reflection.keyConcepts.map((concept, index) => (
                    <Badge key={`gen-concept-${index}`} variant="secondary">
                    {concept.name}
                    {concept.type && <span className="ml-1 opacity-75">({concept.type})</span>}
                    </Badge>
                ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold text-primary">Confirmation Question:</h3>
          <p className="italic">{reflection.confirmationQuestion}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onConfirm} disabled={isLoadingConfirmation} className="w-full sm:w-auto">
          {isLoadingConfirmation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {confirmButtonText}
        </Button>
      </CardFooter>
    </Card>
  );
}

    