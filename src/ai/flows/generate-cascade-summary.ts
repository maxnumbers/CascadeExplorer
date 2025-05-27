
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
You will receive a structured set of impacts: the initial assertion, and its first, second, and third-order consequences. Each impact includes its label, description, validity, key concepts, attributes, and (for 2nd/3rd order impacts) causal reasoning linking it to its parent.

Initial Assertion Summary: "{{initialAssertion.summary}}"
Full Assertion Text: "{{initialAssertion.fullText}}"

First-Order Impacts (Direct Consequences of the Assertion):
{{#if firstOrderImpacts.length}}
  {{#each firstOrderImpacts}}
  - Impact ID: {{id}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (linking to assertion): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No first-order impacts were identified for this assertion.
{{/if}}

Second-Order Impacts (Stemming from First-Order Impacts):
{{#if secondOrderImpacts.length}}
  {{#each secondOrderImpacts}}
  - Impact ID: {{id}}, ParentID (1st order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (from parent {{parentId}}): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No second-order impacts were identified.
{{/if}}

Third-Order Impacts (Stemming from Second-Order Impacts):
{{#if thirdOrderImpacts.length}}
  {{#each thirdOrderImpacts}}
  - Impact ID: {{id}}, ParentID (2nd order): {{parentId}}, Label: "{{label}}", Description: "{{description}}", Validity: {{validity}}
    {{#if keyConcepts.length}}Key Concepts: {{#each keyConcepts}}{{name}}{{#if type}} ({{type}}){{/if}}{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if attributes.length}}Attributes: {{#each attributes}}"{{this}}"{{#unless @last}}; {{/unless}}{{/each}}{{/if}}
    {{#if causalReasoning}}Causal Reasoning (from parent {{parentId}}): "{{causalReasoning}}"{{/if}}
  {{/each}}
{{else}}
  No third-order impacts were identified.
{{/if}}

Your task is to generate a "narrativeSummary" in the form of a persuasive essay. This essay should:
1.  **Introduction**: Begin by clearly stating the initial assertion and hinting at the profound cascade of consequences it unleashes. Establish the gravity or significance of this starting point.
2.  **Body - Develop the Argument Step-by-Step**:
    *   **Narrative Integration**: Your essay must flow naturally. When discussing the impacts, **do not simply restate their 'Label' verbatim**. Instead, describe the *concept, phenomenon, or consequence represented by the label* in your own narrative words. Integrate these ideas smoothly into the essay, making it read like a cohesive argument rather than a recitation of impact titles. For example, if an impact label is 'Economic Downturn', you might write, 'This subsequently led to a significant contraction in economic activity...' rather than 'This led to Economic Downturn...'.
    *   **Elaborate on Connections**: Do NOT just list the impacts. Weave a compelling narrative that explicitly explains the *mechanisms* and *logical progression* by which one impact leads to another. Build an irrefutable case for the cascade.
    *   **Leverage Provided Reasoning**: When an impact has a \`causalReasoning\` field explaining its link to its parent, you **must explicitly incorporate and elaborate on this reasoning in your narrative**. This is crucial for demonstrating the chain of causality. If \`causalReasoning\` is absent (e.g., for first-order impacts from the main assertion), construct the most robust logical bridge using the impact's description, key concepts, and attributes.
    *   **Depth and Detail**: For each step in the cascade (Assertion to 1st order, 1st to 2nd order, 2nd to 3rd order), clearly articulate *how* and *why* these connections occur. Avoid superficial statements or unexplained jumps in logic. Use the provided \`keyConcepts\` and \`attributes\` to add specificity, credibility, and depth to your explanations of these mechanisms.
    *   **Highlight Critical Pathways**: Trace significant causal pathways through the network. If multiple impacts converge to create a more significant meta-impact or a feedback loop, articulate this convergence and its amplified effects.
    *   **Structure**: Organize this section logically, perhaps by following key branches of the cascade or by thematic grouping of consequences, always ensuring the reader can follow the step-by-step progression.
3.  **Conclusion - Synthesize the Cascade**:
    *   End with a powerful concluding statement that summarizes the overall argument and the main lines of causality you have developed.
    *   Reiterate the most significant long-term outcomes and the inescapable logic of the cascade, leaving the reader with a strong understanding of the assertion's full implications.
    *   **Crucially, ensure your conclusion strictly synthesizes the impacts and relationships presented in the provided data. Do not introduce new concepts, solutions, or external information not found within the impact map itself.**
4.  **Tone and Style**: Maintain an authoritative, analytical, yet highly persuasive and articulate tone. Your language should be clear, precise, and impactful. Aim for a style that is both intellectually rigorous and compelling to read, as if presenting a meticulously researched case study.
5.  **Essay Structure**: The essay should be well-structured with clear paragraphs, and of a length appropriate to cover the complexity of the provided impact map (typically several substantial paragraphs).

Before finalizing your essay, critically review it:
- Is every step in the causal chain clearly explained with sufficient detail and persuasive reasoning?
- Have you successfully integrated the *concepts* behind the impact labels into a flowing narrative, rather than just listing the labels?
- Have you fully utilized and elaborated upon the provided \`causalReasoning\`, \`keyConcepts\`, and \`attributes\` to support your analysis and explanations of connections?
- Does the conclusion accurately reflect the main pathways and outcomes developed in the essay body, without introducing external elements?

Focus on building an irrefutable case based on the provided data, demonstrating the chain of causality with clarity, depth, and persuasive insight.
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

