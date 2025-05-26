
'use server';
/**
 * @fileOverview Generates a narrative summary of the entire impact cascade.
 *
 * - generateCascadeSummary - A function that creates a summary from the full impact map.
 * - CascadeSummaryInput - The input type for the generateCascadeSummary function.
 * - CascadeSummaryOutput - The return type for the generateCascadeSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { CascadeSummaryInputSchema, CascadeSummaryOutputSchema } from '@/types/cascade';
import type { CascadeSummaryInput, CascadeSummaryOutput } from '@/types/cascade';

export type { CascadeSummaryInput, CascadeSummaryOutput };

export async function generateCascadeSummary(input: CascadeSummaryInput): Promise<CascadeSummaryOutput> {
  return generateCascadeSummaryFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'generateCascadeSummaryPrompt',
  input: {schema: CascadeSummaryInputSchema},
  output: {schema: CascadeSummaryOutputSchema},
  prompt: `You are an AI assistant skilled in synthesizing complex information into a coherent narrative.
You will receive a structured set of impacts, starting from an initial assertion and cascading through first, second, and third-order consequences.
The impacts are linked by their order and 'parentId' fields where applicable.

Initial Assertion Summary: "{{initialAssertion.summary}}"
Full Assertion Text: "{{initialAssertion.fullText}}"

First-Order Impacts (Direct Consequences of the Assertion):
{{#if firstOrderImpacts.length}}
  {{#each firstOrderImpacts}}
  - ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
  {{/each}}
{{else}}
  No first-order impacts were identified for this assertion.
{{/if}}

Second-Order Impacts (Stemming from First-Order Impacts):
{{#if secondOrderImpacts.length}}
  {{#each secondOrderImpacts}}
  - ID: {{id}}, ParentID (1st order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
  {{/each}}
{{else}}
  No second-order impacts were identified.
{{/if}}

Third-Order Impacts (Stemming from Second-Order Impacts):
{{#if thirdOrderImpacts.length}}
  {{#each thirdOrderImpacts}}
  - ID: {{id}}, ParentID (2nd order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
  {{/each}}
{{else}}
  No third-order impacts were identified.
{{/if}}

Your task is to generate a "narrativeSummary". This summary should:
1. Start by briefly restating or acknowledging the core of the initial assertion.
2. Weave a story or logical chain explaining how the initial assertion leads to the first-order impacts.
3. Continue this narrative by showing how key first-order impacts (or combinations thereof) give rise to the second-order impacts.
4. Extend the story to demonstrate how second-order impacts lead to the third-order consequences or societal shifts.
5. Highlight the most significant or plausible causal pathways through the network. If there are multiple distinct threads of consequence, try to cover them.
6. Conclude with a cohesive statement that encapsulates the overall cascaded outcome or the primary set of conclusions derived from this exploration.
7. The tone should be analytical and insightful, focusing on the logical flow of consequences.
8. The summary should be a few paragraphs long, well-structured, and easy to understand.

Focus on creating a flowing narrative, not just a list of impacts. Identify the connections and explain the "how" and "why" of the cascade.
`,
});

const generateCascadeSummaryFlow = ai.defineFlow(
  {
    name: 'generateCascadeSummaryFlow',
    inputSchema: CascadeSummaryInputSchema,
    outputSchema: CascadeSummaryOutputSchema,
  },
  async (input) => {
    // Basic validation: Ensure there's at least an assertion to work with.
    if (!input.initialAssertion?.fullText) {
        return { narrativeSummary: "The initial assertion was not provided or was empty, so a summary cannot be generated." };
    }
    // Ensure arrays are present even if empty for the prompt
    const promptInput = {
        ...input,
        firstOrderImpacts: input.firstOrderImpacts || [],
        secondOrderImpacts: input.secondOrderImpacts || [],
        thirdOrderImpacts: input.thirdOrderImpacts || [],
    };

    const {output} = await summaryPrompt(promptInput);
    if (!output?.narrativeSummary) {
        return { narrativeSummary: "The AI was unable to generate a narrative summary for the provided impact map at this time." };
    }
    return output;
  }
);
