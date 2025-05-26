
"use client";

import type { SuggestImpactConsolidationOutput, ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import type { ImpactNode } from '@/types/cascade';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Merge, CheckCircle2, XCircle } from 'lucide-react'; // Removed AlertCircle as it was unused

interface ConsolidationSuggestionsDisplayProps {
  suggestions: SuggestImpactConsolidationOutput | null;
  graphNodes: ImpactNode[]; // To look up original node details
  onApplyConsolidation: (suggestion: ConsolidatedImpactSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

export function ConsolidationSuggestionsDisplay({ 
  suggestions, 
  graphNodes,
  onApplyConsolidation, 
  onDismissSuggestion 
}: ConsolidationSuggestionsDisplayProps): JSX.Element | null {
  if (!suggestions || suggestions.consolidationSuggestions.length === 0) {
    return null; 
  }

  const getTriggerLabel = (suggestion: ConsolidatedImpactSuggestion) => {
    const originalLabels = suggestion.originalImpactIds.map(id => {
      const node = graphNodes.find(n => n.id === id);
      return node ? `"${node.label}"` : `ID: ${id}`;
    }).slice(0, 2); 

    let labelText = `Consolidate: ${originalLabels.join(' & ')}`;
    if (suggestion.originalImpactIds.length > 2) {
      labelText += ` & ${suggestion.originalImpactIds.length - 2} more`;
    }
    labelText += ` -> "${suggestion.consolidatedImpact.label}"`;
    return labelText;
  };
  
  const getConfidenceVariant = (confidence: 'high' | 'medium' | 'low'): "default" | "secondary" | "destructive" => {
    switch (confidence) {
      case 'high': return 'default'; 
      case 'medium': return 'secondary';
      case 'low': return 'destructive'; 
      default: return 'secondary';
    }
  };

  const getValidityBadgeVariant = (validity?: 'high' | 'medium' | 'low'): "default" | "secondary" | "destructive" | "outline" => {
    if (!validity) return "outline";
    switch (validity) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <Card className="mt-6 shadow-xl bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl text-primary flex items-center">
          <Merge className="w-6 h-6 mr-2 text-accent" />
          Impact Consolidation Suggestions
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          The AI has identified potential overlaps. Review the suggestions below to streamline your impact map.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.consolidationSuggestions.length === 0 ? (
          <p className="text-muted-foreground">No consolidation opportunities found by the AI.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {suggestions.consolidationSuggestions.map((suggestion, index) => (
              <AccordionItem value={`item-${index}`} key={suggestion.consolidatedImpact.id || `suggestion-${index}`} className="border-border">
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex flex-col">
                     <span className="font-semibold text-primary">{getTriggerLabel(suggestion)}</span>
                     <span className="text-xs text-muted-foreground mt-1">
                        Confidence: <Badge variant={getConfidenceVariant(suggestion.confidence)} className="ml-1">{suggestion.confidence}</Badge>
                     </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 p-4 bg-background/30 rounded-md border border-border mt-1">
                  
                  <div>
                    <h4 className="font-semibold text-accent mb-2">Original Impacts to Consolidate:</h4>
                    <ul className="space-y-3">
                      {suggestion.originalImpactIds.map(id => {
                        const originalNode = graphNodes.find(n => n.id === id);
                        return (
                          <li key={id} className="p-3 border border-input rounded-md bg-card/50 shadow-sm space-y-1">
                            <div>
                                <strong className="text-primary">Label:</strong>
                                <span className="ml-2 text-foreground">{originalNode?.label || id}</span>
                            </div>
                            <div>
                                <strong className="text-primary">Description:</strong>
                                <span className="ml-2 text-sm text-muted-foreground">{originalNode?.description || 'N/A'}</span>
                            </div>
                            <div>
                                <strong className="text-primary">Current Validity:</strong> 
                                <Badge variant={getValidityBadgeVariant(originalNode?.validity)} className="ml-1">{originalNode?.validity || 'N/A'}</Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  
                  <div className="border-t border-border my-4"></div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-accent mb-2">Proposed Consolidated Impact:</h4>
                    <div className="p-3 border border-input rounded-md bg-card/50 shadow-sm space-y-1">
                        <div>
                            <strong className="text-sm text-primary">New Label:</strong> <span className="text-foreground">{suggestion.consolidatedImpact.label}</span>
                        </div>
                        <div>
                            <strong className="text-sm text-primary">New Description:</strong> <span className="text-foreground">{suggestion.consolidatedImpact.description}</span>
                        </div>
                        <div>
                            <strong className="text-sm text-primary">Proposed Validity:</strong> <Badge variant={getValidityBadgeVariant(suggestion.consolidatedImpact.validity)} className="ml-1">{suggestion.consolidatedImpact.validity}</Badge>
                            <span className="text-xs text-muted-foreground ml-2">(Reasoning: {suggestion.consolidatedImpact.reasoning})</span>
                        </div>
                    </div>
                  </div>

                  <div className="border-t border-border my-4"></div>

                  <div>
                    <h4 className="font-semibold text-accent mb-1">AI's Rationale:</h4>
                    <p className="text-sm text-muted-foreground"><strong className="text-primary">Reason for Consolidation:</strong> {suggestion.reasoningForConsolidation}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button 
                      size="sm" 
                      onClick={() => onApplyConsolidation(suggestion)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex-grow sm:flex-grow-0"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Apply Consolidation
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onDismissSuggestion(suggestion.consolidatedImpact.id)}
                      className="flex-grow sm:flex-grow-0"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Dismiss
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
      {suggestions.consolidationSuggestions.length > 0 && (
        <CardFooter>
            <p className="text-xs text-muted-foreground">Review each suggestion carefully. Applying consolidations will merge impacts in the graph.</p>
        </CardFooter>
      )}
    </Card>
  );
}
