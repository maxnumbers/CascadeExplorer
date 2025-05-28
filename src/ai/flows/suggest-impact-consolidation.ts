
'use server';

/**
 * @fileOverview Suggests consolidation of similar or redundant impacts from an impact map,
 * focusing on consolidating impacts only within the same order.
 *
 * - suggestImpactConsolidation - A function that analyzes an impact map and suggests consolidations.
 * - SuggestImpactConsolidationInput - The input type (expects all impacts grouped by order).
 * - SuggestImpactConsolidationOutput - The return type for consolidation suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod'; // Changed from 'genkit' to 'zod' for direct import
// Import schemas and types from the shared types file
import { ImpactSchema, ImpactMappingInputForConsolidationSchema as SuggestImpactConsolidationInputSchema, StructuredConceptSchema } from '@/types/cascade';
import type { ImpactMappingInputForConsolidation as SuggestImpactConsolidationInputType } from '@/types/cascade';


export type SuggestImpactConsolidationInput = SuggestImpactConsolidationInputType;

const ConsolidatedImpactSuggestionSchema = z.object({
  originalImpactIds: z.array(z.string()).describe("IDs of the impacts (all from the same order) suggested for consolidation. This field is MANDATORY and must always contain at least two IDs."),
  consolidatedImpact: ImpactSchema.extend({
    id: z.string().describe("A proposed unique ID for the new consolidated impact (e.g., consolidated-1st-impact-1)."),
    order: z.enum(['1', '2', '3']).describe("The hierarchical order (1st, 2nd, or 3rd) this consolidated impact belongs to. This MUST be the same as the order of the originalImpactIds."),
    // keyConcepts and attributes are now part of ImpactSchema and should be synthesized by the AI
  }).describe("The suggested new consolidated impact, synthesizing the originals. Its order must match the order of the original impacts. It should include synthesized structured keyConcepts (name, type) and attributes."),
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

Given the following impact map, which includes first-order, second-order, and third-order impacts stemming from an initial assertion. Each impact has associated structured key concepts (name, type), attributes, and causal reasoning.

First-Order Impacts:
{{#each firstOrder}}
- ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}, ParentID: {{parentId}}, KeyConcepts: [{{#each keyConcepts}}{name: "{{name}}"{{#if type}}, type: "{{type}}"{{/if}}{{#unless @last}}, {{/unless}}{{/each}}], Attributes: [{{#each attributes}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}], CausalReasoning: "{{causalReasoning}}"
{{/each}}

Second-Order Impacts:
{{#each secondOrder}}
- ID: {{id}}, ParentID (from 1st order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}, KeyConcepts: [{{#each keyConcepts}}{name: "{{name}}"{{#if type}}, type: "{{type}}"{{/if}}{{#unless @last}}, {{/unless}}{{/each}}], Attributes: [{{#each attributes}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}], CausalReasoning: "{{causalReasoning}}"
{{/each}}

Third-Order Impacts:
{{#each thirdOrder}}
- ID: {{id}}, ParentID (from 2nd order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}, KeyConcepts: [{{#each keyConcepts}}{name: "{{name}}"{{#if type}}, type: "{{type}}"{{/if}}{{#unless @last}}, {{/unless}}{{/each}}], Attributes: [{{#each attributes}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}], CausalReasoning: "{{causalReasoning}}"
{{/each}}

Your task is to:
1.  For EACH order (first, second, third) provided, separately analyze the impacts WITHIN that specific order.
2.  Identify groups of **two or more impacts** *WITHIN THE SAME ORDER* that should be consolidated. A group is suitable for consolidation if the impacts are:
    a. Highly similar or redundant in their meaning.
    b. Represent different facets or perspectives of the *same fundamental underlying consequence or theme* appropriate to that order. These impacts might appear to stem from different parent impacts in the *preceding order* (e.g., two 2nd-order impacts having different 1st-order parentIds), but if they converge on a shared theme at their *current order*, they are candidates for consolidation.
3.  Critically, do NOT suggest consolidating impacts from different orders with each other (e.g., do not merge a 1st order impact with a 2nd order impact).
4.  For each identified group, you MUST provide:
    a. \`originalImpactIds\`: A list of the IDs of the original impacts you suggest consolidating. All these IDs must belong to the same order. THIS FIELD IS MANDATORY AND MUST ALWAYS BE PRESENT AND CONTAIN AT LEAST TWO IDs.
    b. \`consolidatedImpact\`: A new, single impact object. This object MUST include an \`order\` field (e.g., '1', '2', or '3') that is the SAME as the order of the \`originalImpactIds\` being consolidated.
        The \`consolidatedImpact\` should also have:
        i. \`id\`: Propose a new, unique ID (e.g., 'consolidated-1st-impact-1').
        ii. \`label\`: A concise label that captures the essence of the merged items.
        iii. \`description\`: A comprehensive description that synthesizes the original impacts' descriptions.
        iv. \`validity\`: An estimated validity ('high', 'medium', 'low') for the consolidated impact, carefully considered based on the validities of the original impacts.
        v. \`reasoning\`: A brief explanation for the consolidated impact's validity assessment.
        vi. \`parentId\`: If ALL original impacts share the SAME parentId (from the preceding order), then use that parentId. If they have DIFFERENT parentIds, or if it's a 1st order consolidation (no parentId applicable), then OMIT the parentId field for the consolidatedImpact or set it to null/undefined. The application will handle linking it appropriately based on its order.
        vii. \`keyConcepts\`: Synthesize a new list of structured key concepts (2-4, each as an object with 'name' and optional 'type') for the consolidated impact, drawing from the original impacts' key concepts.
        viii. \`attributes\`: Synthesize a new list of attributes (1-2) for the consolidated impact, drawing from the original impacts' attributes.
        ix. \`causalReasoning\`: If consolidating impacts that had causal reasoning, synthesize a new causal reasoning for the consolidated impact, or explain why it's no longer needed. If not applicable, omit.
    c. \`confidence\`: Your confidence ('high', 'medium', 'low') that this consolidation is appropriate and meaningful.
    d. \`reasoningForConsolidation\`: A brief explanation of why these specific impacts (from the same order) can be consolidated, highlighting the shared theme or redundancy.
5.  If no such groups are found within any order, return an empty list for \`consolidationSuggestions\`.

Focus on strong semantic similarity and thematic convergence within each order. Ensure the consolidated impact truly represents a sensible merge of the originals and maintains its original order. The synthesized structured keyConcepts (name, type) and attributes for the consolidated impact are crucial.
MAKE ABSOLUTELY SURE THAT EACH SUGGESTION OBJECT IN THE 'consolidationSuggestions' ARRAY CONTAINS THE 'originalImpactIds' FIELD, AND THAT THIS FIELD CONTAINS AT LEAST TWO STRING IDENTIFIERS.
`,
});

const suggestImpactConsolidationFlow = ai.defineFlow(
  {
    name: 'suggestImpactConsolidationFlow',
    inputSchema: SuggestImpactConsolidationInputSchema,
    outputSchema: SuggestImpactConsolidationOutputSchema,
  },
  async (input) => {
    if (!input.firstOrder && !input.secondOrder && !input.thirdOrder) {
         return { consolidationSuggestions: [] };
    }
    // Ensure arrays are present even if empty for the prompt to avoid Handlebars errors
    const promptInput = {
        firstOrder: input.firstOrder || [],
        secondOrder: input.secondOrder || [],
        thirdOrder: input.thirdOrder || [],
    };

    if (promptInput.firstOrder.length === 0 && promptInput.secondOrder.length === 0 && promptInput.thirdOrder.length === 0) {
      return { consolidationSuggestions: [] };
    }

    const canConsolidateFirst = promptInput.firstOrder.length >= 2;
    const canConsolidateSecond = promptInput.secondOrder.length >= 2;
    const canConsolidateThird = promptInput.thirdOrder.length >= 2;

    if (!canConsolidateFirst && !canConsolidateSecond && !canConsolidateThird) {
        // If no individual order has enough impacts to consolidate, don't call the AI.
        // This complements the client-side check in page.tsx, but for cases where
        // individual orders might be sparse even if the total number of impacts is high.
        return { consolidationSuggestions: [] };
    }

    const {output} = await consolidationPrompt(promptInput);
    return output!;
  }
);

