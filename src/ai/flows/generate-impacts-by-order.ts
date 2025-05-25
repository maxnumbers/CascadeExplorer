
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
import { ImpactSchema } from '@/types/cascade'; // Assuming ImpactSchema is now in types

const GenerateImpactsByOrderInputSchema = z.object({
  assertionText: z.string().describe('The initial user assertion or idea for overall context.'),
  targetOrder: z.enum(['1', '2', '3']).describe("The order of impacts to generate (e.g., '1' for first-order)."),
  parentImpacts: z.array(ImpactSchema).optional().describe('Impacts from the previous order that these new impacts will stem from. Required for targetOrder 2 or 3.'),
});
export type GenerateImpactsByOrderInput = z.infer<typeof GenerateImpactsByOrderInputSchema>;

const GenerateImpactsByOrderOutputSchema = z.object({
  generatedImpacts: z.array(ImpactSchema).describe('An array of impacts generated for the target order.'),
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

{{#if (eq targetOrder "1")}}
Based *only* on the assertion "{{assertionText}}", identify 3-5 distinct first-order impacts (immediate, direct effects).
Do not generate second or third order impacts yet.
{{/if}}

{{#if (eq targetOrder "2")}}
We have the following first-order impacts stemming from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (1st Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these first-order parent impacts, identify 2-3 distinct second-order effects.
Ensure the second-order effects are logical consequences of their specific parent impact and the overall assertion.
Do not generate third order impacts yet.
{{/if}}

{{#if (eq targetOrder "3")}}
We have the following second-order impacts, which ultimately stem from the assertion "{{assertionText}}":
{{#each parentImpacts}}
- Parent Impact (2nd Order) ID {{id}}, Label: "{{label}}", Description: "{{description}}"
{{/each}}
For each of these second-order parent impacts, identify 1-2 distinct third-order societal shifts or long-term consequences.
Ensure the third-order effects are logical consequences of their specific parent impact and the overall assertion.
{{/if}}

For each impact you generate:
- Assign a unique ID.
- Provide a concise label (2-3 lines max).
- Provide a detailed description.
- Assess its validity ('high', 'medium', 'low'):
    - High: Strong precedent or already happening.
    - Medium: Plausible but uncertain timing/scale.
    - Low: Possible but requires many assumptions.
- Provide reasoning for the validity assessment.

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
      // If generating 2nd/3rd order but no parents provided, return empty or handle error.
      // For now, let the prompt handle it, but this check is good.
      // Consider throwing an error or returning empty if this is invalid.
      // The prompt currently might not generate much if parentImpacts is empty.
    }
    const {output} = await prompt(input);
    return output!;
  }
);
