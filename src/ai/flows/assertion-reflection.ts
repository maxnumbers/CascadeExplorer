
// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Reflects the user's initial assertion using AI to confirm understanding,
 * extracting a system model (stocks, agents, incentives) from the assertion.
 *
 * - reflectAssertion - A function that reflects the user's assertion.
 * - ReflectAssertionInput - The input type for the reflectAssertion function.
 * - ReflectAssertionOutput - The return type for the reflectAssertion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { StructuredConceptSchema, SystemModelSchema } from '@/types/cascade'; // Import new SystemModelSchema

const ReflectAssertionInputSchema = z.object({
  assertion: z
    .string()
    .describe('The user provided assertion or idea.'),
});
export type ReflectAssertionInput = z.infer<typeof ReflectAssertionInputSchema>;

const ReflectAssertionOutputSchema = z.object({
  reflection: z.string().describe('The AI-generated reflection of the user assertion (1-2 sentences).'),
  summary: z.string().describe('A very concise summary of the assertion, ideally 5-10 words, suitable as a short title for the core idea.'),
  systemModel: SystemModelSchema.describe("A system model identified from the assertion, including key 'stocks' (accumulations/resources), 'agents' (actors), and 'incentives' (agents' motivations towards stocks, and resulting flows)."),
  keyConcepts: z.array(StructuredConceptSchema).describe("A list of general key concepts or entities (each as an object with a 'name' and an optional 'type' like 'Technology', 'Person', 'Organization') mentioned in the assertion, distinct from the system model components but potentially overlapping."),
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
  prompt: `You are an expert Systems Thinker. Your task is to analyze the user's assertion and provide a structured reflection that includes a basic system model.

User's Assertion:
"{{assertion}}"

Based on this assertion, you must:

1.  **Summary ('summary')**: Create a very concise summary of the assertion, ideally 5-10 words, suitable as a short title for the core idea.
2.  **Reflection ('reflection')**: Provide a more detailed reflection of the assertion in 1-2 clear sentences, capturing its main thrust.
3.  **System Model ('systemModel')**: Analyze the assertion to identify components of a basic system model. This is crucial for understanding the underlying dynamics.
    *   **Stocks**: Identify 2-4 key 'stocks'. Stocks are important accumulations or resources that can change over time (e.g., 'Public Trust in AI', 'Market Share of EV Cars', 'Available Water Supply', 'Technical Debt'). For each stock, provide:
        *   'name': A concise name for the stock.
        *   'description' (optional): A brief explanation of what this stock represents.
    *   **Agents**: Identify 2-4 key 'agents'. Agents are actors, entities, or forces that can influence the stocks (e.g., 'Government Regulators', 'Consumers', 'Technology Developers', 'Climate Change', 'Competitors'). For each agent, provide:
        *   'name': A concise name for the agent.
        *   'description' (optional): A brief explanation of this agent's role or nature.
    *   **Incentives**: This is a critical part of the system model. For the key agents you've identified, you must describe their primary 'incentives' related to one or more of the identified stocks. Aim to identify at least 2-4 significant incentives that illustrate the dynamics of the system as described or implied in the assertion.
        To do this, think systematically:
        1. Take an Agent you have identified.
        2. Consider each Stock you have identified.
        3. Ask: What is this Agent's primary motivation or goal (the 'incentiveDescription') concerning this Stock, based *solely on the provided assertion*?
        4. Then ask: What typical action or 'resultingFlow' (e.g., "Increases R&D spending", "Buys more product", "Reduces hiring") does this incentive drive from the Agent, which directly or indirectly affects the Stock, again, based *solely on the provided assertion*?
        For each significant incentive you identify, provide:
        *   'agentName': The name of the agent (must match one of the agents identified above).
        *   'targetStockName': The name of the stock the incentive is primarily directed towards (must match one of the stocks identified above).
        *   'incentiveDescription': A clear description of the agent's motivation or goal concerning the stock.
        *   'resultingFlow' (optional, but highly encouraged): A brief description of the typical action or flow this incentive drives.
        These incentives and flows reveal the interconnections and dynamics within the system. Ensure these are directly derivable from the user's assertion.
4.  **General Key Concepts ('keyConcepts')**: Separately from the system model, identify a list of 2-5 general key concepts or entities mentioned in the assertion. Each concept should be an object with a 'name' (the concept itself) and an optional 'type' (e.g., 'Technology', 'Social Trend', 'Organization', 'Location', 'Person'). These might overlap with system model elements but represent broader themes.
5.  **Confirmation Question ('confirmationQuestion')**: Generate a concise question to ask the user to confirm your understanding of their assertion, focusing on the core intent or the system you've identified.

Ensure your entire output strictly adheres to the requested JSON schema structure.
The 'systemModel' component, especially the 'incentives' describing agent-stock interactions, is particularly important for systems thinking.
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

    
