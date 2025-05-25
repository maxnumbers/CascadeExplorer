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
// Import Zod schemas from the shared types file
import { ImpactMappingOutputSchema } from '@/types/cascade'; 
import type { ImpactMappingOutput as ImpactMappingOutputType } from '@/types/cascade';


const ImpactMappingInputSchema = z.object({
  assertion: z.string().describe('The initial assertion to map impacts for.'),
});
export type ImpactMappingInput = z.infer<typeof ImpactMappingInputSchema>;

// Export the TypeScript type derived from the imported Zod schema
export type ImpactMappingOutput = ImpactMappingOutputType;


export async function impactMapping(input: ImpactMappingInput): Promise<ImpactMappingOutput> {
  return impactMappingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'impactMappingPrompt',
  input: {schema: ImpactMappingInputSchema},
  output: {schema: ImpactMappingOutputSchema}, // Use imported schema
  prompt: `You are a Cascade Thinking System that helps users explore the cascading impacts of their ideas through interactive dialogue and visual networks.

  For the given assertion, identify 3-5 first-order impacts (immediate, direct effects).
  For each first-order impact, identify 2-3 second-order effects.
  For key second-order impacts, identify third-order societal shifts.

  The validity assessment should be:
  - High: Strong precedent or already happening
  - Medium: Plausible but uncertain timing/scale
  - Low: Possible but requires many assumptions

  Assign a unique ID to each impact generated.

  Here is the assertion:
  {{assertion}}`,
});

const impactMappingFlow = ai.defineFlow(
  {
    name: 'impactMappingFlow',
    inputSchema: ImpactMappingInputSchema,
    outputSchema: ImpactMappingOutputSchema, // Use imported schema
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);