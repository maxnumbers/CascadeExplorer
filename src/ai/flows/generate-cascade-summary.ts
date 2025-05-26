
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
  prompt: `You are an expert analyst and persuasive writer tasked with composing a compelling essay that explains the cascading consequences of an initial assertion.
Your goal is to construct a powerful argument, drawing a clear and irrefutable line from the initial assertion to its ultimate, far-reaching consequences.
You will receive a structured set of impacts: the initial assertion, and its first, second, and third-order consequences. Each impact includes its label, description, validity, key concepts, attributes, and (for 2nd/3rd order) causal reasoning linking it to its parent.

Initial Assertion Summary: "{{initialAssertion.summary}}"
Full Assertion Text: "{{initialAssertion.fullText}}"

First-Order Impacts (Direct Consequences of the Assertion):
{{#if firstOrderImpacts.length}}
  {{#each firstOrderImpacts}}
  - ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (from parent): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No first-order impacts were identified for this assertion.
{{/if}}

Second-Order Impacts (Stemming from First-Order Impacts):
{{#if secondOrderImpacts.length}}
  {{#each secondOrderImpacts}}
  - ID: {{id}}, ParentID (1st order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (from parent): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No second-order impacts were identified.
{{/if}}

Third-Order Impacts (Stemming from Second-Order Impacts):
{{#if thirdOrderImpacts.length}}
  {{#each thirdOrderImpacts}}
  - ID: {{id}}, ParentID (2nd order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (from parent): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No third-order impacts were identified.
{{/if}}

Your task is to generate a "narrativeSummary" in the form of a persuasive essay. This essay should:
1.  **Introduction**: Begin by clearly stating the initial assertion and hinting at the profound cascade of consequences it unleashes. Establish the gravity or significance of this starting point.
2.  **Body - Develop the Argument**:
    *   Do NOT just list the impacts. Instead, synthesize them. Weave a compelling narrative that explains the *mechanisms* and *logical progression* by which one impact leads to another.
    *   Make full use of the provided \`causalReasoning\`, \`keyConcepts\`, and \`attributes\` for each impact to add depth, credibility, and persuasive force to your analysis. Explain *how* and *why* these connections occur.
    *   Trace the critical pathways through the network. If multiple impacts converge to create a more significant meta-impact or a feedback loop, articulate this convergence and its amplified effects.
    *   Structure this section logically, perhaps by following key branches of the cascade or by thematic grouping of consequences.
3.  **Conclusion**: End with a powerful concluding statement that summarizes the overall argument. Reiterate the most significant long-term outcomes and the inescapable logic of the cascade, leaving the reader with a strong understanding of the assertion's full implications.
4.  **Tone and Style**: Maintain an analytical yet highly persuasive and articulate tone. Your language should be clear, precise, and impactful. Aim for a style that is both intellectually rigorous and compelling to read.
5.  The essay should be well-structured, with clear paragraphs, and of a length appropriate to cover the complexity of the provided impact map (typically a few substantial paragraphs).

Focus on building an irrefutable case based on the provided data, demonstrating the chain of causality with clarity and persuasive insight.
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

