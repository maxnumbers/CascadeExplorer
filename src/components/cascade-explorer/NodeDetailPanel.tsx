
"use client";

import type { ImpactNode, StructuredConcept, SystemModel, TensionAnalysisOutput, SystemStock, SystemAgent, SystemIncentive, StockToStockFlow, CompetingStakeholderResponse, ResourceConstraint, IdentifiedTradeOff } from '@/types/cascade';
import { VALIDITY_OPTIONS, CORE_ASSERTION_ID } from '@/types/cascade'; // Added CORE_ASSERTION_ID
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, Users, TrendingUp, ArrowRightLeft, ShieldAlert, Info, ThumbsUp, ThumbsDown, Lightbulb, MinusCircle, FileText } from 'lucide-react';

interface NodeDetailPanelProps {
  node: ImpactNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateValidity: (nodeId: string, validity: 'high' | 'medium' | 'low') => void;
  advancedViewEnabled?: boolean;
  masterSystemModel?: SystemModel | null; // New prop for the latest overall system model
}

const renderAdvancedSystemModel = (systemModel: SystemModel) => {
  return (
    <div className="space-y-3">
      <div>
        <h5 className="font-medium text-primary flex items-center mb-1">
          <Package className="w-4 h-4 mr-2 text-accent" />
          Stocks:
        </h5>
        {systemModel.stocks && systemModel.stocks.length > 0 ? (
          <ul className="list-none pl-0 space-y-1 text-xs">
            {systemModel.stocks.map((stock, index) => (
              <li key={`adv-stock-${index}`} className="p-1.5 border border-input rounded-md bg-background/30">
                <strong className="text-foreground">{stock.name}</strong>
                {stock.qualitativeState && <Badge variant="outline" className="ml-2 text-xs">{stock.qualitativeState}</Badge>}
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
          <ul className="list-none pl-0 space-y-1 text-xs">
            {systemModel.agents.map((agent, index) => (
              <li key={`adv-agent-${index}`} className="p-1.5 border border-input rounded-md bg-background/30">
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
          Incentives (Agent-Stock Flows):
        </h5>
        {systemModel.incentives && systemModel.incentives.length > 0 ? (
          <ul className="list-none pl-0 space-y-2 text-xs">
            {systemModel.incentives.map((incentive, index) => (
              <li key={`adv-incentive-${index}`} className="p-2 border border-input rounded-md bg-background/30 space-y-0.5">
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
      {systemModel.stockToStockFlows && systemModel.stockToStockFlows.length > 0 && (
        <div>
          <h5 className="font-medium text-primary flex items-center mb-1">
            <ArrowRightLeft className="w-4 h-4 mr-2 text-accent" />
            Stock-to-Stock Flows:
          </h5>
          <ul className="list-none pl-0 space-y-2 text-xs">
            {systemModel.stockToStockFlows.map((flow, index) => (
              <li key={`adv-s2sflow-${index}`} className="p-2 border border-input rounded-md bg-background/30 space-y-0.5">
                <div>
                  <Badge variant="outline" className="mr-1 text-xs">{flow.sourceStockName}</Badge>
                   <ArrowRightLeft className="w-2.5 h-2.5 inline-block mx-0.5 text-muted-foreground" />
                  <Badge variant="outline" className="mr-1 text-xs">{flow.targetStockName}</Badge>
                </div>
                <p><strong className="text-foreground font-normal">Flow:</strong> {flow.flowDescription}</p>
                {flow.drivingForceDescription && <p className="text-muted-foreground"><strong className="text-foreground font-normal">Driving Force:</strong> {flow.drivingForceDescription}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const renderAdvancedTensionAnalysis = (tensionAnalysis: TensionAnalysisOutput) => {
  return (
    <Accordion type="multiple" className="w-full space-y-2 text-xs">
      <AccordionItem value="stakeholders" className="border-input bg-background/30 rounded-md">
        <AccordionTrigger className="px-3 py-2 text-sm text-primary hover:no-underline">
            <Users className="w-4 h-4 mr-2 text-accent" /> Competing Stakeholder Responses
        </AccordionTrigger>
        <AccordionContent className="p-3 space-y-2">
          {tensionAnalysis.competingStakeholderResponses.map((response, index) => (
            <div key={`adv-tension-stakeholder-${index}`} className="p-2 border border-border rounded-md bg-card/50">
              <strong className="text-foreground block mb-1">{response.agentName}</strong>
              <div className="pl-2 border-l-2 border-green-500/50 mb-1 pb-1">
                <p className="text-green-400 text-xs flex items-center"><ThumbsUp className="w-3 h-3 mr-1" /> Supportive: {response.supportiveResponse.description}</p>
                <p className="text-muted-foreground text-xs italic ml-1">Reason: {response.supportiveResponse.reasoning}</p>
              </div>
              <div className="pl-2 border-l-2 border-red-500/50">
                <p className="text-red-400 text-xs flex items-center"><ThumbsDown className="w-3 h-3 mr-1" /> Resistant: {response.resistantResponse.description}</p>
                <p className="text-muted-foreground text-xs italic ml-1">Reason: {response.resistantResponse.reasoning}</p>
              </div>
              {response.keyAssumptions && <p className="text-muted-foreground text-xs mt-1 flex items-center"><Lightbulb className="w-3 h-3 mr-1 text-blue-400"/> Assumptions: {response.keyAssumptions}</p>}
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="constraints" className="border-input bg-background/30 rounded-md">
        <AccordionTrigger className="px-3 py-2 text-sm text-primary hover:no-underline">
            <Package className="w-4 h-4 mr-2 text-accent" /> Resource Constraints
        </AccordionTrigger>
        <AccordionContent className="p-3 space-y-2">
          {tensionAnalysis.resourceConstraints.map((constraint, index) => (
            <div key={`adv-tension-constraint-${index}`} className="p-2 border border-border rounded-md bg-card/50">
              <strong className="text-foreground block mb-0.5">{constraint.resourceName}</strong>
              <p className="text-muted-foreground text-xs">Demands: {constraint.demandsOnResource}</p>
              <p className="text-muted-foreground text-xs">Scarcity Impact: {constraint.potentialScarcityImpact}</p>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="tradeoffs" className="border-input bg-background/30 rounded-md">
        <AccordionTrigger className="px-3 py-2 text-sm text-primary hover:no-underline">
            <MinusCircle className="w-4 h-4 mr-2 text-accent" /> Identified Trade-Offs
        </AccordionTrigger>
        <AccordionContent className="p-3 space-y-2">
          {tensionAnalysis.identifiedTradeOffs.map((tradeoff, index) => (
            <div key={`adv-tension-tradeoff-${index}`} className="p-2 border border-border rounded-md bg-card/50">
              <p className="text-foreground"><strong className="font-medium">For Positive Outcome:</strong> {tradeoff.primaryPositiveOutcome}</p>
              <p className="text-muted-foreground text-xs"><strong className="text-foreground font-normal">Negative/Cost:</strong> {tradeoff.potentialNegativeConsequenceOrOpportunityCost}</p>
              <p className="text-muted-foreground text-xs italic">Explanation: {tradeoff.explanation}</p>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};


export function NodeDetailPanel({ node, isOpen, onClose, onUpdateValidity, advancedViewEnabled, masterSystemModel }: NodeDetailPanelProps): JSX.Element | null {
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

  // Determine which system model to use for display
  const systemModelForDisplay = (node.id === CORE_ASSERTION_ID && masterSystemModel) ? masterSystemModel : node.properties?.systemModel as SystemModel | undefined;
  
  // Access structured data: Use masterSystemModel for CORE_ASSERTION specific properties if available and advancedView is on
  const fullAssertionText = (node.id === CORE_ASSERTION_ID && masterSystemModel) 
    ? node.properties?.fullAssertionText // Prefer specific prop if set, else derive from node.description for core
    : (node.nodeSystemType === 'CORE_ASSERTION' ? node.description : undefined);

  // For tensionAnalysis and initialSystemStatesSummary, these are usually tied to the initial setup.
  // If masterSystemModel is provided for CORE_ASSERTION_ID, it implies we are in an advanced view context
  // where these top-level properties from the node itself are still relevant.
  const tensionAnalysis = node.properties?.tensionAnalysis as TensionAnalysisOutput | undefined;
  const initialSystemStatesSummary = node.properties?.initialSystemStatesSummary as string | undefined;
  
  const keyConcepts: StructuredConcept[] = node.keyConcepts || (node.properties?.keyConcepts as StructuredConcept[]) || [];
  const attributes: string[] = node.attributes || (node.properties?.attributes as string[]) || [];
  const causalReasoning = node.causalReasoning;
  
  const explicitlyHandledPropertyKeys = ['fullAssertionText', 'systemModel', 'tensionAnalysis', 'initialSystemStatesSummary', 'keyConcepts', 'attributes'];
  
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
              <Label htmlFor="reasoning" className="font-semibold text-primary">Reasoning for Plausibility</Label>
              <p id="reasoning" className="text-sm text-muted-foreground whitespace-pre-wrap">{node.reasoning}</p>
            </div>

            {node.nodeSystemType === 'CORE_ASSERTION' && fullAssertionText && node.description !== fullAssertionText && (
                <div className="space-y-1 border-t border-border pt-3 mt-3">
                    <Label className="font-semibold text-primary flex items-center"><FileText className="w-4 h-4 mr-2 text-accent"/>Full Original Assertion Text</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fullAssertionText}</p>
                </div>
            )}
            
            {advancedViewEnabled && node.nodeSystemType === 'CORE_ASSERTION' && (
              <>
                {initialSystemStatesSummary && (
                  <div className="space-y-1 border-t border-border pt-3 mt-3">
                      <Label className="font-semibold text-primary flex items-center"><Info className="w-4 h-4 mr-2 text-accent"/>AI's Summary of Initial System States</Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{initialSystemStatesSummary}</p>
                  </div>
                )}
                {systemModelForDisplay && ( // Use systemModelForDisplay here
                  <div className="space-y-1 border-t border-border pt-3 mt-3">
                      <Label className="font-semibold text-primary flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-accent"/>Advanced: System Model Details (Live States)</Label>
                      <div className="mt-1 p-2 border border-input rounded-md bg-background/10">
                        {renderAdvancedSystemModel(systemModelForDisplay)}
                      </div>
                  </div>
                )}
                {tensionAnalysis && (
                  <div className="space-y-1 border-t border-border pt-3 mt-3">
                      <Label className="font-semibold text-primary flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-accent"/>Advanced: Tension Analysis Details</Label>
                       <div className="mt-1 p-2 border border-input rounded-md bg-background/10">
                        {renderAdvancedTensionAnalysis(tensionAnalysis)}
                      </div>
                  </div>
                )}
              </>
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

            <div className="space-y-2 border-t border-border pt-3 mt-3">
              <Label htmlFor="validity" className="font-semibold text-primary">Plausibility Assessment</Label>
              <Select
                value={node.validity}
                onValueChange={handleValidityChange}
              >
                <SelectTrigger id="validity" className="w-full bg-input text-foreground">
                  <SelectValue placeholder="Select plausibility" />
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

