
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
    *   **Stocks**: Identify 3-10 key 'stocks'. Stocks are important accumulations or resources that can change over time (e.g., 'Public Trust in AI', 'Market Share of EV Cars', 'Available Water Supply', 'Technical Debt'). For each stock, provide:
        *   'name': A concise name for the stock.
        *   'description' (optional): A brief explanation of what this stock represents.
    *   **Agents**: Identify 3-10 key 'agents'. Agents are actors, entities, or forces that can influence the stocks (e.g., 'Government Regulators', 'Consumers', 'Technology Developers', 'Climate Change', 'Competitors'). For each agent, provide:
        *   'name': A concise name for the agent.
        *   'description' (optional): A brief explanation of this agent's role or nature.
    *   **Incentives & Flows (Crucial for System Dynamics)**: This part requires careful, systematic thought.
        *   **Initial Pass - Obvious Connections**: First, based on the stocks and agents you've identified, pinpoint the most direct and primary incentives. For these, describe the agent's main motivation regarding a stock and the most likely resulting flow or action, all derived *explicitly* from the user's assertion.
        *   **Review and Expansion Pass - Holistic System Mapping**:
            Now, critically review ALL stocks and ALL agents you've listed above. Your goal is to build a more complete map of interdependencies that are *still grounded in the user's assertion*.
            For EACH Agent previously identified:
                Systematically go through EACH Stock previously identified (even if you didn't link them in the initial pass).
                Ask yourself, based *solely and strictly on the user's assertion*:
                    1.  "What is this Agent's primary motivation or goal (the 'incentiveDescription') concerning *this specific* Stock?" (Revisit or confirm initial thoughts).
                    2.  "What typical action or 'resultingFlow' (e.g., 'Increases R&D spending', 'Buys more product', 'Reduces hiring', 'Advocates for policy change') does this incentive drive from the Agent, which directly or indirectly affects *this specific* Stock, according to the assertion?"
                    3.  "Are there any *secondary* or *less obvious but still plausible* incentives this Agent might have towards this Stock, as implied by the assertion?" If so, detail them.
                    4.  "Does the assertion hint at any *conflicting* incentives for this Agent (e.g., an agent might be incentivized to increase one stock which inadvertently depletes another, both actions stemming from the core assertion)?" If so, detail these.
            Also consider:
                *   "Are there any other minor agents, groups, or even abstract forces (e.g., 'Market Demand', 'Technological Obsolescence') *implied by the assertion* that have clear incentives related to the identified stocks?" If a strong case can be made *from the assertion text*, briefly add them as agents and define their key incentive and flow. Be very selective here; do not invent agents not supported by the text.
        *   **Final Output for Incentives**: Consolidate your findings from both passes. Aim to identify a total of 4-7 *distinct and significant* incentives in your final output. For each, ensure you provide:
            *   'agentName': The name of the agent (must match one of the agents identified or added).
            *   'targetStockName': The name of the stock the incentive is primarily directed towards (must match one of_the stocks identified).
            *   'incentiveDescription': A clear description of the agent's motivation or goal concerning the stock, derived from the assertion.
            *   'resultingFlow': A brief description of the typical action or flow this incentive drives, as implied by the assertion. This is highly encouraged.
            These incentives and flows are what truly reveal the system's dynamics. Ensure all are directly derivable from and justified by the user's assertion.
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
    const result = await reflectAssertionPrompt(input);
    if (!result || !result.output) {
      console.error('Assertion reflection prompt did not return the expected output structure.', result);
      throw new Error('AI failed to provide a valid reflection output.');
    }
    return result.output;
  }
);
    
