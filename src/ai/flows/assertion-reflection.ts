
// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Reflects the user's initial assertion using AI to confirm understanding.
 *
 * - reflectAssertion - A function that reflects the user's assertion.
 * - ReflectAssertionInput - The input type for the reflectAssertion function.
 * - ReflectAssertionOutput - The return type for the reflectAssertion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReflectAssertionInputSchema = z.object({
  assertion: z
    .string()
    .describe('The user provided assertion or idea.'),
});
export type ReflectAssertionInput = z.infer<typeof ReflectAssertionInputSchema>;

const ReflectAssertionOutputSchema = z.object({
  reflection: z.string().describe('The AI-generated reflection of the user assertion.'),
  summary: z.string().describe('A very concise summary of the assertion, ideally 5-10 words, suitable as a short title for the core idea.'),
  coreComponents: z.array(z.string()).describe('Key elements of the assertion.'),
  keyConcepts: z.array(z.string()).describe('A list of key concepts, entities, or main nouns mentioned in the assertion.'),
  confirmationQuestion: z.string().describe('A question to confirm understanding with the user.'),
});
export type ReflectAssertionOutput = z.infer<typeof ReflectAssertionOutputSchema>;

export async function reflectAssertion(input: ReflectAssertionInput): Promise<ReflectAssertionOutput> {
  return reflectAssertionFlow(input);
}

const reflectAssertionPrompt = ai.definePrompt({
  name: 'reflectAssertionPrompt',
  input: {schema: ReflectAssertionInputSchema},
  output: {schema: ReflectAssertionOutputSchema},
  prompt: `You are an AI assistant designed to understand and reflect user assertions.

You will receive an assertion from the user. Your task is to:

1.  Create a concise summary of the assertion, ideally 5-10 words, suitable as a short title (for the 'summary' field).
2.  Provide a more detailed reflection of the assertion in 1-2 clear sentences (for the 'reflection' field).
3.  Identify the core components of the assertion (usually 2-3 main parts).
4.  Identify a list of key concepts, entities, or main nouns mentioned in the assertion (for the 'keyConcepts' field).
5.  Generate a question to confirm your understanding with the user.

Here is the assertion:

{{assertion}}
`,
});

const reflectAssertionFlow = ai.defineFlow(
  {
    name: 'reflectAssertionFlow',
    inputSchema: ReflectAssertionInputSchema,
    outputSchema: ReflectAssertionOutputSchema,
  },
  async input => {
    const {output} = await reflectAssertionPrompt(input);
    return output!;
  }
);

