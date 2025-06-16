
"use client";

import type { TensionAnalysisOutput } from '@/types/cascade';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, ShieldAlert, ThumbsUp, ThumbsDown, Lightbulb, Package, MinusCircle } from 'lucide-react';

interface TensionAnalysisDisplayProps {
  tensionAnalysis: TensionAnalysisOutput;
}

export function TensionAnalysisDisplay({ tensionAnalysis }: TensionAnalysisDisplayProps): JSX.Element {
  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-input">
        <CardHeader>
          <CardTitle className="text-lg text-accent flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Competing Stakeholder Responses
          </CardTitle>
          <CardDescription>How different agents might react to the assertion.</CardDescription>
        </CardHeader>
        <CardContent>
          {tensionAnalysis.competingStakeholderResponses.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {tensionAnalysis.competingStakeholderResponses.map((response, index) => (
                <AccordionItem value={`stakeholder-${index}`} key={`stakeholder-${index}`} className="bg-background/30 border border-border rounded-md px-3">
                  <AccordionTrigger className="hover:no-underline text-left">
                    <span className="font-medium text-primary">{response.agentName}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-green-400 flex items-center mb-1"><ThumbsUp className="w-4 h-4 mr-1.5" /> Supportive Response:</h4>
                      <p className="text-muted-foreground ml-1">{response.supportiveResponse.description}</p>
                      <p className="text-xs text-muted-foreground/70 ml-1"><em>Reasoning:</em> {response.supportiveResponse.reasoning}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-400 flex items-center mb-1"><ThumbsDown className="w-4 h-4 mr-1.5" /> Resistant Response:</h4>
                      <p className="text-muted-foreground ml-1">{response.resistantResponse.description}</p>
                      <p className="text-xs text-muted-foreground/70 ml-1"><em>Reasoning:</em> {response.resistantResponse.reasoning}</p>
                    </div>
                    {response.keyAssumptions && (
                       <div>
                        <h4 className="font-semibold text-primary/80 flex items-center mb-1"><Lightbulb className="w-4 h-4 mr-1.5" /> Key Assumptions:</h4>
                        <p className="text-xs text-muted-foreground ml-1">{response.keyAssumptions}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">No specific competing stakeholder responses identified by the AI.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-input">
        <CardHeader>
          <CardTitle className="text-lg text-accent flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Resource Constraints
          </CardTitle>
          <CardDescription>Potential bottlenecks and scarcity issues.</CardDescription>
        </CardHeader>
        <CardContent>
          {tensionAnalysis.resourceConstraints.length > 0 ? (
            <ul className="space-y-3">
              {tensionAnalysis.resourceConstraints.map((constraint, index) => (
                <li key={`resource-${index}`} className="p-3 border border-border rounded-md bg-background/30">
                  <h4 className="font-medium text-primary">{constraint.resourceName}</h4>
                  <p className="text-sm text-muted-foreground mt-1"><strong className="text-foreground font-normal">Demands from Assertion:</strong> {constraint.demandsOnResource}</p>
                  <p className="text-sm text-muted-foreground mt-1"><strong className="text-foreground font-normal">Potential Scarcity Impact:</strong> {constraint.potentialScarcityImpact}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific resource constraints identified by the AI.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-input">
        <CardHeader>
          <CardTitle className="text-lg text-accent flex items-center">
            <MinusCircle className="w-5 h-5 mr-2" />
            Identified Trade-Offs
          </CardTitle>
          <CardDescription>Potential downsides or opportunity costs.</CardDescription>
        </CardHeader>
        <CardContent>
          {tensionAnalysis.identifiedTradeOffs.length > 0 ? (
            <ul className="space-y-3">
              {tensionAnalysis.identifiedTradeOffs.map((tradeoff, index) => (
                <li key={`tradeoff-${index}`} className="p-3 border border-border rounded-md bg-background/30">
                  <h4 className="font-medium text-primary">Trade-off for: <span className="italic">{tradeoff.primaryPositiveOutcome}</span></h4>
                  <p className="text-sm text-muted-foreground mt-1"><strong className="text-foreground font-normal">Negative Consequence/Cost:</strong> {tradeoff.potentialNegativeConsequenceOrOpportunityCost}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1"><em>Explanation:</em> {tradeoff.explanation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific trade-offs identified by the AI.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    