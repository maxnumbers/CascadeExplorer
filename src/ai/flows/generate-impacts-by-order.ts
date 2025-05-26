
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
import {z} from 'genkit';
import { ImpactSchema } from '@/types/cascade'; 

const GenerateImpactsByOrderInputSchema = z.object({
  assertionText: z.string().describe('The initial user assertion or idea for overall context.'),
  targetOrder: z.enum(['1', '2', '3']).describe("The order of impacts to generate (e.g., '1' for first-order)."),
  parentImpacts: z.array(ImpactSchema).optional().describe('Impacts from the previous order that these new impacts will stem from. Required for targetOrder 2 or 3.'),
});
export type GenerateImpactsByOrderInput = z.infer<typeof GenerateImpactsByOrderInputSchema>;

const GenerateImpactsByOrderOutputSchema = z.object({
  generatedImpacts: z.array(ImpactSchema).describe('An array of impacts generated for the target order. Each impact for order 2 or 3 should include a `parentId` field if it directly stems from one of the input `parentImpacts`. Each impact should also include a list of its `keyConcepts` and `attributes`.'),
});
export type GenerateImpactsByOrderOutput = z.infer<typeof GenerateImpactsByOrderOutputSchema>;

export async function generateImpactsByOrder(input: GenerateImpactsByOrderInput): Promise<GenerateImpactsByOrderOutput> {
  return generateImpactsByOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateImpactsByOrderPrompt',
  input: {schema: GenerateImpactsByOrderInputSchema}, 
  output: {schema: GenerateImpactsByOrderOutputSchema},
  prompt: `You are a Cascade Thinking System. Your goal is to identify cascading impacts.
The overall assertion we are exploring is: "{{assertionText}}"

{{#if isTargetOrder1}}
Based *only* on the assertion "{{assertionText}}", identify 3-5 distinct first-order impacts (immediate, direct effects).
Do not generate second or third order impacts yet. For these first-order impacts, the 'parentId' field is not applicable.
{{/if}}

{{#if isTargetOrder2}}
We have the following first-order impacts stemming from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (1st Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these first-order parent impacts, identify 2-3 distinct second-order effects.
Ensure the second-order effects are logical consequences of their specific parent impact and the overall assertion.
For each second-order impact you generate, you MUST include a 'parentId' field in its data, set to the 'id' of the specific first-order parent impact it directly stems from.
Do not generate third order impacts yet.
{{/if}}

{{#if isTargetOrder3}}
We have the following second-order impacts, which ultimately stem from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (2nd Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these second-order parent impacts, identify 1-2 distinct third-order societal shifts or long-term consequences.
Ensure the third-order effects are logical consequences of their specific parent impact and the overall assertion.
For each third-order impact you generate, you MUST include a 'parentId' field in its data, set to the 'id' of the specific second-order parent impact it directly stems from.
{{/if}}

For each impact you generate:
- Assign a unique ID (e.g., impact-{{targetOrder}}-{index}).
- Provide a concise label (2-3 lines max).
- Provide a detailed description.
- Assess its validity ('high', 'medium', 'low'):
    - High: Strong precedent or already happening.
    - Medium: Plausible but uncertain timing/scale.
    - Low: Possible but requires many assumptions.
- Provide reasoning for the validity assessment.
- Identify and list 2-4 key concepts or main nouns central to that specific impact in a field named 'keyConcepts'.
- Identify and list 1-2 key attributes or defining characteristics of that specific impact in a field named 'attributes'.
- If generating for targetOrder 2 or 3, ensure the 'parentId' field is populated as described above.

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
      // This condition is primarily handled on the client-side before calling the flow.
      // Consider returning an empty array or specific error if this is an invalid state for the AI.
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
