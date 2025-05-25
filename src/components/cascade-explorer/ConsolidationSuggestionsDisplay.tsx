
"use client";

import type { SuggestImpactConsolidationOutput, ConsolidatedImpactSuggestion } from '@/ai/flows/suggest-impact-consolidation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConsolidationSuggestionsDisplayProps {
  suggestions: SuggestImpactConsolidationOutput | null;
  onApplyConsolidation: (suggestion: ConsolidatedImpactSuggestion) => void; // Placeholder for future
  onDismissSuggestion: (suggestionId: string) => void; // Placeholder for future
}

export function ConsolidationSuggestionsDisplay({ 
  suggestions, 
  onApplyConsolidation, 
  onDismissSuggestion 
}: ConsolidationSuggestionsDisplayProps): JSX.Element | null {
  if (!suggestions || suggestions.consolidationSuggestions.length === 0) {
    return null; // Or a message like "No consolidation suggestions at this time."
  }

  // Helper function to get a short label for the trigger, maybe from the first original impact
  const getTriggerLabel = (suggestion: ConsolidatedImpactSuggestion) => {
    // This part needs access to the original nodes' labels.
    // For now, let's use the proposed consolidated label as a placeholder,
    // or list the IDs.
    if (suggestion.consolidatedImpact.label) {
      return `Suggestion: Consolidate to "${suggestion.consolidatedImpact.label}"`;
    }
    return `Consolidate ${suggestion.originalImpactIds.length} impacts: ${suggestion.originalImpactIds.join(', ')}`;
  };
  
  const getConfidenceVariant = (confidence: 'high' | 'medium' | 'low'): "default" | "secondary" | "destructive" => {
    switch (confidence) {
      case 'high': return 'default'; // Or a success-like variant if available
      case 'medium': return 'secondary';
      case 'low': return 'destructive'; // Or an outline/warning variant
      default: return 'secondary';
    }
  };


  return (
    <Card className="mt-6 shadow-xl bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl text-primary flex items-center">
          <AlertCircle className="w-6 h-6 mr-2 text-accent" />
          Impact Consolidation Suggestions
        </CardTitle>
        <CardDescription>
          The AI has identified potential overlaps or redundancies in the impact map. Review the suggestions below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.consolidationSuggestions.length === 0 ? (
          <p className="text-muted-foreground">No consolidation opportunities found by the AI.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {suggestions.consolidationSuggestions.map((suggestion, index) => (
              <AccordionItem value={`item-${index}`} key={suggestion.consolidatedImpact.id || `suggestion-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col text-left">
                     <span className="font-semibold">{getTriggerLabel(suggestion)}</span>
                     <span className="text-xs text-muted-foreground">
                        Original IDs: {suggestion.originalImpactIds.join(', ')}
                     </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 p-4 bg-background/30 rounded-md">
                  <div>
                    <h4 className="font-semibold text-primary">Proposed Consolidated Impact:</h4>
                    <p><strong className="text-sm">Label:</strong> {suggestion.consolidatedImpact.label}</p>
                    <p><strong className="text-sm">Description:</strong> {suggestion.consolidatedImpact.description}</p>
                    <p>
                      <strong className="text-sm">Validity:</strong> {suggestion.consolidatedImpact.validity}
                      <span className="text-xs text-muted-foreground_FIX_THIS_LATER_TODO"> (Reasoning: {suggestion.consolidatedImpact.reasoning})</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">AI Analysis:</h4>
                    <p><strong className="text-sm">Reasoning for Consolidation:</strong> {suggestion.reasoningForConsolidation}</p>
                    <p className="flex items-center">
                        <strong className="text-sm mr-2">Confidence:</strong> 
                        <Badge variant={getConfidenceVariant(suggestion.confidence)}>{suggestion.confidence}</Badge>
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        console.log("Apply suggestion:", suggestion); // Placeholder
                        onApplyConsolidation(suggestion);
                        // toast({ title: "Suggestion Applied (Placeholder)", description: `Consolidated into ${suggestion.consolidatedImpact.label}`});
                      }}
                      disabled // Enable once functionality is built
                      className="bg-primary/80 hover:bg-primary"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Apply Consolidation
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log("Dismiss suggestion:", suggestion.consolidatedImpact.id); // Placeholder
                        // onDismissSuggestion(suggestion.consolidatedImpact.id); 
                        // toast({ title: "Suggestion Dismissed (Placeholder)"});
                      }}
                      disabled // Enable once functionality is built
                    >
                      Dismiss
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground_FIX_THIS_LATER_TODO_SECONDARY italic mt-2">Note: Applying consolidations is not yet implemented in the UI.</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
      {suggestions.consolidationSuggestions.length > 0 && (
        <CardFooter>
            <p className="text-xs text-muted-foreground">Review each suggestion. Applying consolidations will merge impacts in the graph (feature coming soon).</p>
        </CardFooter>
      )}
    </Card>
  );
}
