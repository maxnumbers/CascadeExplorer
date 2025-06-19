
// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Reflects the user's initial assertion using AI to confirm understanding,
 * extracting a system model (stocks, agents, incentives, stock-to-stock flows) from the assertion.
 *
 * - reflectAssertion - A function that reflects the user's assertion.
 * - ReflectAssertionInput - The input type for the reflectAssertion function.
 * - ReflectAssertionOutput - The return type for the reflectAssertion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { StructuredConceptSchema, SystemModelSchema } from '@/types/cascade';

const ReflectAssertionInputSchema = z.object({
  assertion: z
    .string()
    .describe('The user provided assertion or idea.'),
});
export type ReflectAssertionInput = z.infer<typeof ReflectAssertionInputSchema>;

const ReflectAssertionOutputSchema = z.object({
  reflection: z.string().describe('The AI-generated reflection of the user assertion (1-2 sentences).'),
  summary: z.string().describe('A very concise summary of the assertion, ideally 5-10 words, suitable as a short title for the core idea.'),
  systemModel: SystemModelSchema.describe("A system model identified from the assertion, including key 'stocks' (accumulations/resources), 'agents' (actors), 'incentives' (agents' motivations towards stocks, and resulting flows), and 'stockToStockFlows' (direct influences between stocks). All elements in the system model must be interconnected in a way that demonstrates the ripple effects of the assertion."),
  keyConcepts: z.array(StructuredConceptSchema).describe("A list of general key concepts or entities (each as an object with a 'name' and an optional 'type' like 'Technology', 'Person', 'Organization') mentioned in the assertion, distinct from the system model components but potentially overlapping."),
  confirmationQuestion: z.string().describe('A question to confirm understanding with the user.'),
});
export type ReflectAssertionOutput = z.infer<typeof ReflectAssertionOutputSchema>;

export async function reflectAssertion(input: ReflectAssertionInput): Promise<ReflectAssertionOutput> {
  const result = await reflectAssertionFlow(input);
  if (!result || !result.systemModel) {
    console.error('Assertion reflection prompt did not return the expected output structure. Missing systemModel.', {output: result});
    throw new Error('AI failed to provide a valid reflection output with a system model.');
  }
  return result;
}

const reflectAssertionPrompt = ai.definePrompt({
  name: 'reflectAssertionPrompt',
  input: {schema: ReflectAssertionInputSchema},
  output: {schema: ReflectAssertionOutputSchema},
  prompt: `You are an expert Systems Thinker. Your task is to analyze the user's assertion and provide a structured reflection that includes a rich, interconnected system model relevant to the assertion's core dynamics.

User's Assertion:
"{{assertion}}"

Based on this assertion, you must:

1.  **Summary ('summary')**: Create a very concise summary of the assertion, ideally 5-10 words, suitable as a short title for the core idea.
2.  **Reflection ('reflection')**: Provide a more detailed reflection of the assertion in 1-2 clear sentences, capturing its main thrust.
3.  **System Model ('systemModel')**: Analyze the assertion to identify components of an interconnected system model. This model must illustrate how the assertion's core idea would impact various elements and how these elements relate to each other.
    *   **Stocks**: Identify the key 'stocks'. Stocks are important accumulations or resources that can change over time (e.g., 'Public Trust in AI', 'Market Share of EV Cars', 'Available Water Supply', 'Technical Debt', 'Employee Well-being', 'Company Productivity'). Aim for a number that comprehensively covers the core dynamics of the assertion. For each stock, provide:
        *   'name': A concise name for the stock.
        *   'description' (optional): A brief explanation of what this stock represents.
        *   **Connectivity Requirement**: Every stock MUST be demonstrably part of the system's causal web related to the assertion. It must have clear incoming influences (e.g., targeted by an agent's incentive, affected by another stock via a stock-to-stock flow) AND outgoing influences (e.g., it is the source of a stock-to-stock flow influencing another key stock, or its state is a precondition for an agent's action described in an incentive). Do not list stocks that are merely mentioned if they don't participate in the system's dynamics as triggered by the assertion.
    *   **Agents**: Identify the key 'agents'. Agents are actors, entities, or forces that can influence the stocks (e.g., 'Government Regulators', 'Consumers', 'Technology Developers', 'Climate Change', 'Competitors', 'Management', 'Employees'). Aim for a number that comprehensively covers the core dynamics of the assertion. For each agent, provide:
        *   'name': A concise name for the agent.
        *   'description' (optional): A brief explanation of this agent's role or nature.
            When identifying agents, consider those central to the assertion and any implied counter-agents. Ensure each agent is linked to the system through at least one incentive.
    *   **Incentives & Flows (Agent-Stock Interactions)**: Identify a comprehensive set of *significant* incentives. For EACH incentive, ensure the 'targetStockName' is a stock that is clearly affected by the assertion's core mechanisms or is a key mediating factor. The agent's 'resultingFlow' should show how it impacts this stock. Provide:
        *   'agentName': The name of an identified agent.
        *   'targetStockName': The name of an identified stock.
        *   'incentiveDescription': Agent's motivation towards the stock.
        *   'resultingFlow': The action or flow driven by the incentive.
    *   **Stock-to-Stock Flows ('stockToStockFlows')**: Identify a comprehensive set of significant direct influences or flows *between different stocks*. These are *crucial* for showing how changes in one stock directly impact another, forming the system's internal structure and ensuring a non-fragmented model. Examples: 'Increased Employee Well-being' (stock) leads to 'Improved Company Productivity' (stock); 'Increased Company Productivity' (stock) might enable 'Higher Investment in R&D' (stock); 'Strain on Labor Costs' (stock) might negatively impact 'Profit Margins' (stock). For each flow, provide:
        *   'sourceStockName': The source stock.
        *   'targetStockName': The target stock.
        *   'flowDescription': How the source influences the target.
        *   'drivingForceDescription' (optional): Underlying mechanism if not obvious.
        Ensure these flows help connect the system model cohesively, particularly linking any secondary stocks back to the primary stocks affected by the assertion.
4.  **General Key Concepts ('keyConcepts')**: Separately, list 2-5 general key concepts mentioned in the assertion.
5.  **Confirmation Question ('confirmationQuestion')**: Ask a concise question to confirm understanding.

**Final System Model Review (Self-Correction Step for AI):**
Before finalizing the 'systemModel' output:
- Is every stock part of a clear causal chain related to the assertion? Does it have both incoming and outgoing influences within the model (via agent incentives or stock-to-stock flows)?
- Is every agent linked to the system via at least one incentive involving a core stock?
- Do the stock-to-stock flows create a robustly interconnected network, explaining how changes in one area ripple to others, rather than leaving some stocks as endpoints?
- Is the model comprehensive yet focused? Are there enough connections (incentives and stock-to-stock flows) to demonstrate how the assertion ripples through the system? Avoid isolated 'islands' of stocks or agents.
- If a stock (e.g., 'Service Quality') seems peripheral, have you explicitly defined how it's influenced by core stocks (e.g., 'Employee Well-being') and how it, in turn, might influence other core stocks or agent behaviors relevant to the assertion?
- The goal is a tightly-knit system model where the assertion's impact can be traced through multiple interconnected components. If elements are isolated, reconsider their inclusion or add the necessary connecting flows based on plausible interpretations of the assertion. It's better to have a slightly smaller, deeply interconnected model focused on the assertion's core dynamics than a larger one with dangling parts.
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
    if (!result || !result.output || !result.output.systemModel) {
      console.error('Assertion reflection prompt did not return the expected output structure. Missing systemModel.', {input, output: result.output});
      throw new Error('AI failed to provide a valid reflection output with a system model.');
    }
    // Additional validation could be added here to check for orphaned stocks in result.output.systemModel
    // For now, we rely on the prompt's self-correction instruction.
    return result.output;
  }
);

    
