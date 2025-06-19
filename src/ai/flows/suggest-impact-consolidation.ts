
'use server';

/**
 * @fileOverview Suggests consolidation of similar or redundant impacts from an impact map,
 * focusing on consolidating impacts only within a single specified order/phase.
 *
 * - suggestImpactConsolidation - A function that analyzes impacts for a specific order and suggests consolidations.
 * - SuggestImpactConsolidationInput - The input type (expects impacts for one order and the order itself).
 * - SuggestImpactConsolidationOutput - The return type for consolidation suggestions.
 */

import {ai} from '@/ai/genkit';
import {z}from 'zod'; 
import { ImpactSchema, SuggestImpactConsolidationInputSchema, StructuredConceptSchema } from '@/types/cascade'; // Updated to use new input schema name
import type { SuggestImpactConsolidationInput as SuggestImpactConsolidationInputType } from '@/types/cascade';


export type SuggestImpactConsolidationInput = SuggestImpactConsolidationInputType;

const ConsolidatedImpactSuggestionSchema = z.object({
  originalImpactIds: z.array(z.string()).describe("IDs of the impacts (all from the same order) suggested for consolidation. This field is MANDATORY and must always contain at least two IDs."),
  consolidatedImpact: ImpactSchema.extend({
    id: z.string().describe("A proposed unique ID for the new consolidated impact (e.g., consolidated-1st-impact-1)."),
    order: z.enum(['1', '2', '3']).describe("The hierarchical order (1st, 2nd, or 3rd) this consolidated impact belongs to. This MUST be the same as the order of the originalImpactIds."),
    parentIds: z.array(z.string()).optional().describe("An array of parent impact IDs from the preceding order. This should be a synthesized list based on the parents of the original impacts. If all original impacts share the exact same parentIds, use that. Otherwise, provide a unique union of all parentIds from the original impacts. If the consolidation is for 1st order impacts (which link to the core assertion), this can be omitted or an empty array."),
  }).describe("The suggested new consolidated impact, synthesizing the originals. Its order must match the order of the original impacts. It should include synthesized structured keyConcepts (name, type) and attributes. Its parentIds should be a sensible aggregation of its constituents' parents."),
  confidence: z.enum(['high', 'medium', 'low']).describe("Confidence in this consolidation suggestion (high, medium, low)."),
  reasoningForConsolidation: z.string().describe("Explanation why these impacts (within the same order) can be consolidated.")
});
export type ConsolidatedImpactSuggestion = z.infer<typeof ConsolidatedImpactSuggestionSchema>;

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
Your goal is to help simplify an impact map by suggesting consolidations of impacts that are truly similar or represent different expressions of the same core idea *within their specific hierarchical order*.

You are given a list of impacts ('impactsForCurrentOrder') all belonging to the specified 'currentOrder' (Phase {{currentOrder}}).

Impacts for Current Order (Phase {{currentOrder}}):
{{#each impactsForCurrentOrder}}
- ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}, ParentIDs: [{{#each parentIds}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}], KeyConcepts: [{{#each keyConcepts}}{name: "{{name}}"{{#if type}}, type: "{{type}}"{{/if}}{{#unless @last}}, {{/unless}}{{/each}}], Attributes: [{{#each attributes}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}], CausalReasoning: "{{causalReasoning}}"
{{else}}
(No impacts provided for this order)
{{/each}}

Your task is to:
1.  Analyze ONLY the impacts provided in 'impactsForCurrentOrder'.
2.  Identify groups of **two or more impacts** *from this set* that should be consolidated. A group is suitable for consolidation if the impacts are:
    a. Highly similar or redundant in their meaning.
    b. Represent different facets or perspectives of the *same fundamental underlying consequence or theme* appropriate to this order.
3.  For each identified group, you MUST provide:
    a. \`originalImpactIds\`: A list of the IDs of the original impacts you suggest consolidating. All these IDs must belong to 'currentOrder'. THIS FIELD IS MANDATORY AND MUST ALWAYS BE PRESENT AND CONTAIN AT LEAST TWO IDs.
    b. \`consolidatedImpact\`: A new, single impact object. This object MUST include an \`order\` field (e.g., '1', '2', or '3') that is the SAME as the 'currentOrder' value.
        The \`consolidatedImpact\` should also have:
        i. \`id\`: Propose a new, unique ID (e.g., 'consolidated-{{currentOrder}}-impact-1').
        ii. \`label\`: A concise label that captures the essence of the merged items.
        iii. \`description\`: A comprehensive description that synthesizes the original impacts' descriptions.
        iv. \`validity\`: An estimated validity ('high', 'medium', 'low') for the consolidated impact, carefully considered based on the validities of the original impacts.
        v. \`reasoning\`: A brief explanation for the consolidated impact's validity assessment.
        vi. \`parentIds\`: An ARRAY of strings. This should be a list of the unique parent impact IDs from the *preceding order* that the new consolidated impact should link to. This list should be formed by taking the UNION of all unique parent IDs from the \`parentIds\` arrays of the original impacts being consolidated. If consolidating 1st order impacts (currentOrder is '1'), then \`parentIds\` for the consolidated impact should be an empty array or omitted.
        vii. \`keyConcepts\`: Synthesize a new list of structured key concepts (2-4, each as an object with 'name' and optional 'type') for the consolidated impact, drawing from the original impacts' key concepts.
        viii. \`attributes\`: Synthesize a new list of attributes (1-2) for the consolidated impact, drawing from the original impacts' attributes.
        ix. \`causalReasoning\`: If consolidating impacts that had causal reasoning, synthesize a new causal reasoning for the consolidated impact, or explain why it's no longer needed. If not applicable, omit.
    c. \`confidence\`: Your confidence ('high', 'medium', 'low') that this consolidation is appropriate and meaningful.
    d. \`reasoningForConsolidation\`: A brief explanation of why these specific impacts (from the same order) can be consolidated, highlighting the shared theme or redundancy.
4.  If no such groups are found, return an empty list for \`consolidationSuggestions\`.

Focus on strong semantic similarity and thematic convergence. Ensure the consolidated impact truly represents a sensible merge of the originals and maintains its original order ('currentOrder'). The synthesized structured keyConcepts (name, type) and attributes for the consolidated impact are crucial.
MAKE ABSOLUTELY SURE THAT EACH SUGGESTION OBJECT IN THE 'consolidationSuggestions' ARRAY CONTAINS THE 'originalImpactIds' FIELD, AND THAT THIS FIELD CONTAINS AT LEAST TWO STRING IDENTIFIERS.
The 'consolidatedImpact.parentIds' field MUST be an array of strings.
The 'consolidatedImpact.order' field MUST match the 'currentOrder' input.
`,
});

const suggestImpactConsolidationFlow = ai.defineFlow(
  {
    name: 'suggestImpactConsolidationFlow',
    inputSchema: SuggestImpactConsolidationInputSchema,
    outputSchema: SuggestImpactConsolidationOutputSchema,
  },
  async (input: SuggestImpactConsolidationInput) => {
    if (!input.impactsForCurrentOrder || input.impactsForCurrentOrder.length < 2) {
         return { consolidationSuggestions: [] };
    }
    
    const promptInput = {
        impactsForCurrentOrder: (input.impactsForCurrentOrder || []).map(impact => ({...impact, parentIds: impact.parentIds || []})),
        currentOrder: input.currentOrder,
    };

    const result = await consolidationPrompt(promptInput);
    if (!result || !result.output) {
      console.error('Suggest impact consolidation prompt did not return the expected output structure.', result);
      throw new Error('AI failed to provide valid consolidation suggestions output.');
    }
    
    const validatedSuggestions = (result.output.consolidationSuggestions || []).map(suggestion => ({
        ...suggestion,
        consolidatedImpact: {
            ...suggestion.consolidatedImpact,
            parentIds: suggestion.consolidatedImpact.parentIds || [],
            // Ensure the order from AI matches the currentOrder it was asked to process
            order: input.currentOrder, 
        }
    }));

    return { consolidationSuggestions: validatedSuggestions };
  }
);

```