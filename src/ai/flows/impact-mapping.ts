'use server';

/**
 * @fileOverview Automatically generates an initial impact map including first, second, and third-order impacts using AI.
 *
 * - impactMapping - A function that handles the impact mapping process.
 * - ImpactMappingInput - The input type for the impactMapping function.
 * - ImpactMappingOutput - The return type for the impactMapping function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImpactMappingInputSchema = z.object({
  assertion: z.string().describe('The initial assertion to map impacts for.'),
});
export type ImpactMappingInput = z.infer<typeof ImpactMappingInputSchema>;

const ImpactSchema = z.object({
  id: z.string().describe('Unique identifier for the impact.'),
  label: z.string().describe('Short label for the impact (2-3 lines max).'),
  description: z.string().describe('Detailed description of the impact.'),
  validity: z.enum(['high', 'medium', 'low']).describe('Validity assessment (high/medium/low).'),
  reasoning: z.string().describe('Reasoning for validity assessment.'),
});

const ImpactMappingOutputSchema = z.object({
  firstOrder: z.array(ImpactSchema).describe('Immediate/direct impacts.'),
  secondOrder: z.array(ImpactSchema).describe('Downstream effects.'),
  thirdOrder: z.array(ImpactSchema).describe('Societal shifts.'),
});
export type ImpactMappingOutput = z.infer<typeof ImpactMappingOutputSchema>;

export async function impactMapping(input: ImpactMappingInput): Promise<ImpactMappingOutput> {
  return impactMappingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'impactMappingPrompt',
  input: {schema: ImpactMappingInputSchema},
  output: {schema: ImpactMappingOutputSchema},
  prompt: `You are a Cascade Thinking System that helps users explore the cascading impacts of their ideas through interactive dialogue and visual networks.

  For the given assertion, identify 3-5 first-order impacts (immediate, direct effects).
  For each first-order impact, identify 2-3 second-order effects.
  For key second-order impacts, identify third-order societal shifts.

  The validity assessment should be:
  - High: Strong precedent or already happening
  - Medium: Plausible but uncertain timing/scale
  - Low: Possible but requires many assumptions

  Here is the assertion:
  {{assertion}}`,
});

const impactMappingFlow = ai.defineFlow(
  {
    name: 'impactMappingFlow',
    inputSchema: ImpactMappingInputSchema,
    outputSchema: ImpactMappingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
