
'use server';

/**
 * @fileOverview Generates impacts for a specific hierarchical order (1st, 2nd, or 3rd)
 * based on an initial assertion and parent impacts from the preceding order.
 *
 * - generateImpactsByOrder - A function that handles the impact generation for a specific order.
 * - GenerateImpactsByOrderInput - The input type.
 * - GenerateImpactsByOrderOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'zod';
import { ImpactSchema, StructuredConceptSchema } from '@/types/cascade'; 

const GenerateImpactsByOrderInputSchema = z.object({
  assertionText: z.string().describe('The initial user assertion or idea for overall context.'),
  targetOrder: z.enum(['1', '2', '3']).describe("The order of impacts to generate (e.g., '1' for first-order)."),
  parentImpacts: z.array(ImpactSchema).optional().describe('Impacts from the previous order that these new impacts will stem from. Required for targetOrder 2 or 3.'),
});
export type GenerateImpactsByOrderInput = z.infer<typeof GenerateImpactsByOrderInputSchema>;

const GenerateImpactsByOrderOutputSchema = z.object({
  generatedImpacts: z.array(ImpactSchema).describe('An array of impacts generated for the target order. Each impact should include a list of its structured `keyConcepts` (name, type), `attributes`, and `causalReasoning` explaining its plausibility given the preceding impacts and the initial assertion. For impacts of order 2 or 3, each MUST include a `parentId` field pointing to the ID of the specific impact from the preceding order from which it stems.'),
});
export type GenerateImpactsByOrderOutput = z.infer<typeof GenerateImpactsByOrderOutputSchema>;

export async function generateImpactsByOrder(input: GenerateImpactsByOrderInput): Promise<GenerateImpactsByOrderOutput> {
  return generateImpactsByOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateImpactsByOrderPrompt',
  input: {schema: GenerateImpactsByOrderInputSchema}, 
  output: {schema: GenerateImpactsByOrderOutputSchema},
  prompt: `You are a Cascade Thinking System. Your goal is to identify cascading impacts in a distinct and varied manner.
The overall assertion we are exploring is: "{{assertionText}}"

**Crucially, all generated impacts, regardless of their order, must remain directly and specifically relevant to the domain, scope, and intent of the initial \`assertionText\`**. While exploring consequences, continuously ground your reasoning in this initial context. Avoid drifting into overly broad societal claims or generic outcomes unless they are a direct, strongly justifiable, and specific extension of the consequences within the assertion's original domain.

{{#if isTargetOrder1}}
Based *only* on the assertion "{{assertionText}}", identify 3-10 distinct and varied first-order impacts (immediate, direct effects).
Ensure each impact represents a unique consequence, avoiding repetition.
Do not generate second or third order impacts yet.
For these first-order impacts, the 'causalReasoning' field should clearly explain their direct link to the assertion "{{assertionText}}".
{{/if}}

{{#if isTargetOrder2}}
We have the following first-order impacts stemming from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (1st Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these first-order parent impacts, identify 2-3 distinct and varied second-order effects.
Ensure each effect is a unique consequence of its specific parent impact.
The generated impacts must also be logical developments stemming from the **overall assertion "{{assertionText}}"**, avoiding repetition of ideas already covered or generic societal leaps not grounded in the initial assertion's context.
For each second-order impact you generate, the 'causalReasoning' field must briefly and clearly explain:
    1. *Why* this new impact is a plausible consequence of its specific preceding first-order parent impact.
    2. *How* this impact and its connection to its parent **specifically relate back to and develop the themes or goals within the initial \`assertionText\`**.
Do not generate third order impacts yet.
**You MUST include the \`parentId\` field in the structured JSON output for each second-order impact, specifying the ID of the first-order impact it stems from.**
{{/if}}

{{#if isTargetOrder3}}
We have the following second-order impacts, which ultimately stem from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (2nd Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these second-order parent impacts, identify 1-2 distinct and varied third-order societal shifts or long-term consequences.
Ensure each consequence is a unique outcome of its specific parent impact.
The generated impacts must also be logical developments stemming from the **overall assertion "{{assertionText}}"**, avoiding repetition or overly broad claims not directly and convincingly linked to the initial assertion's context.
For each third-order impact you generate, the 'causalReasoning' field must briefly and clearly explain:
    1. *Why* this new impact is a plausible consequence of its specific preceding second-order parent impact.
    2. *How* this impact and its connection to its parent **still directly serve to develop the consequences or implications of the original \`assertionText\`**. If the impact seems to broaden the scope significantly (e.g., from a technical domain to broad societal effects), this reasoning must convincingly bridge that gap back to the initial assertion's specific context and intent.
**You MUST include the \`parentId\` field in the structured JSON output for each third-order impact, specifying the ID of the second-order impact it stems from.**
{{/if}}

For each impact you generate:
- Assign a unique ID (e.g., impact-{{targetOrder}}-{index}).
- Provide a concise label (2-3 lines max).
- Provide a detailed description.
- Assess its validity ('high', 'medium', 'low'):
    - High: Strong precedent or already happening.
    - Medium: Plausible but uncertain timing/scale.
    - Low: Possible but requires many assumptions.
- Provide reasoning for the validity assessment (this is different from causalReasoning).
- Identify and list 2-4 key concepts or main nouns central to that specific impact. Each concept should be an object with a 'name' (the concept itself) and an optional 'type' (e.g., 'Technology', 'Social Trend', 'Organization', 'Location', 'Person'). This list goes into a field named 'keyConcepts'.
- Identify and list 1-2 key attributes or defining characteristics of that specific impact in a field named 'attributes'.
- The 'causalReasoning' field details are specified above for each order. Ensure it is always provided.
- **Crucially, if this impact is of order 2 or 3, you MUST include the \`parentId\` field in its structured JSON output. The value of \`parentId\` must be the ID of the specific impact from the preceding order from which this new impact directly stems.**

Return the generated impacts in the 'generatedImpacts' array.
`,
});

const generateImpactsByOrderFlow = ai.defineFlow(
  {
    name: 'generateImpactsByOrderFlow',
    inputSchema: GenerateImpactsByOrderInputSchema,
    outputSchema: GenerateImpactsByOrderOutputSchema,
  },
  async (input) => {
    if ((input.targetOrder === '2' || input.targetOrder === '3') && (!input.parentImpacts || input.parentImpacts.length === 0)) {
      console.warn(`generateImpactsByOrderFlow called for order ${input.targetOrder} without parentImpacts. Returning empty.`);
      return { generatedImpacts: [] };
    }

    const isTargetOrder1 = input.targetOrder === '1';
    const isTargetOrder2 = input.targetOrder === '2';
    const isTargetOrder3 = input.targetOrder === '3';

    const promptInput = {
      ...input,
      isTargetOrder1,
      isTargetOrder2,
      isTargetOrder3,
    };

    const {output} = await prompt(promptInput);
    return output!;
  }
);

