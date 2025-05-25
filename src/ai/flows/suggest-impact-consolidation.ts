
'use server';

/**
 * @fileOverview Suggests consolidation of similar or redundant impacts from an impact map.
 *
 * - suggestImpactConsolidation - A function that analyzes an impact map and suggests consolidations.
 * - SuggestImpactConsolidationInput - The input type (same as ImpactMappingOutput).
 * - SuggestImpactConsolidationOutput - The return type for consolidation suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Import schemas and types from the shared types file
import { ImpactSchema, ImpactMappingOutputSchema as SuggestImpactConsolidationInputSchema } from '@/types/cascade';
import type { ImpactMappingOutput as ImpactMappingOutputType } from '@/types/cascade';

export type SuggestImpactConsolidationInput = ImpactMappingOutputType;

const ConsolidatedImpactSuggestionSchema = z.object({
  originalImpactIds: z.array(z.string()).describe("IDs of the impacts suggested for consolidation."),
  consolidatedImpact: ImpactSchema.extend({ 
    id: z.string().describe("A proposed unique ID for the new consolidated impact (e.g., consolidated-impact-1)."),
    order: z.enum(['1', '2', '3']).describe("The hierarchical order (1st, 2nd, or 3rd) this consolidated impact best fits into, as a string '1', '2', or '3'.")
  }).describe("The suggested new consolidated impact, synthesizing the originals."),
  confidence: z.enum(['high', 'medium', 'low']).describe("Confidence in this consolidation suggestion (high, medium, low)."),
  reasoningForConsolidation: z.string().describe("Explanation why these impacts can be consolidated.")
});
export type ConsolidatedImpactSuggestion = z.infer<typeof ConsolidatedImpactSuggestionSchema>; // Exporting this type

const SuggestImpactConsolidationOutputSchema = z.object({
  consolidationSuggestions: z.array(ConsolidatedImpactSuggestionSchema).describe("List of suggestions for consolidating impacts. Returns empty if no suitable consolidations are found.")
});
export type SuggestImpactConsolidationOutput = z.infer<typeof SuggestImpactConsolidationOutputSchema>;


export async function suggestImpactConsolidation(input: SuggestImpactConsolidationInput): Promise<SuggestImpactConsolidationOutput> {
  return suggestImpactConsolidationFlow(input);
}

const consolidationPrompt = ai.definePrompt({
  name: 'suggestImpactConsolidationPrompt',
  input: {schema: SuggestImpactConsolidationInputSchema}, 
  output: {schema: SuggestImpactConsolidationOutputSchema},
  prompt: `You are an AI assistant skilled in identifying conceptual overlaps and redundancies in a structured list of impacts.
Given the following impact map, which includes first-order, second-order, and third-order impacts stemming from an initial assertion:

First-Order Impacts:
{{#each firstOrder}}
- ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
{{/each}}

Second-Order Impacts:
{{#each secondOrder}}
- ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
{{/each}}

Third-Order Impacts:
{{#each thirdOrder}}
- ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
{{/each}}

Your task is to:
1. Identify groups of two or more impacts (these can be from the same order or different orders) that are highly similar, redundant, or represent different facets of the same underlying consequence.
2. For each identified group, provide:
    a. \`originalImpactIds\`: A list of the IDs of the original impacts you suggest consolidating.
    b. \`consolidatedImpact\`: A new, single impact object with the following fields:
        i. \`id\`: Propose a new, unique ID for this consolidated impact (e.g., 'consolidated-impact-1', 'consolidated-impact-2').
        ii. \`label\`: A concise label for the consolidated impact that captures the essence of the merged items.
        iii. \`description\`: A comprehensive description that synthesizes the original impacts' descriptions.
        iv. \`validity\`: An estimated validity ('high', 'medium', 'low') for the consolidated impact. This should be carefully considered based on the validities of the original impacts. For example, if consolidating a 'high' and 'low' validity impact, the result might be 'medium'.
        v. \`reasoning\`: A brief explanation for the consolidated impact's validity assessment (how the new validity was determined from originals).
        vi. \`order\`: Determine the most appropriate hierarchical order ('1', '2', or '3') for this consolidated impact. This should be a string. Consider the orders of the original impacts and the nature of the consolidated idea. For example, if consolidating two 1st-order impacts, the result is likely '1'. If consolidating a 1st and 2nd, carefully consider if the consolidated idea is now a more direct (1st order) or still a downstream (2nd order) consequence.
    c. \`confidence\`: Your confidence ('high', 'medium', 'low') that this consolidation is appropriate and meaningful.
    d. \`reasoningForConsolidation\`: A brief explanation of why these specific impacts can be consolidated.
3. If no such groups are found, return an empty list for \`consolidationSuggestions\`.

Focus on strong semantic similarity and avoid merging distinct consequences unless they are truly minor variations of a larger point. Ensure the consolidated impact truly represents a sensible merge of the originals.
`,
});

const suggestImpactConsolidationFlow = ai.defineFlow(
  {
    name: 'suggestImpactConsolidationFlow',
    inputSchema: SuggestImpactConsolidationInputSchema, 
    outputSchema: SuggestImpactConsolidationOutputSchema,
  },
  async (input) => {
    if (input.firstOrder.length === 0 && input.secondOrder.length === 0 && input.thirdOrder.length === 0) {
      return { consolidationSuggestions: [] };
    }
    const {output} = await consolidationPrompt(input);
    return output!;
  }
);
