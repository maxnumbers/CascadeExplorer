
'use server';
/**
 * @fileOverview Infers the initial qualitative states of stocks in a system model.
 *
 * - inferInitialQualitativeStates - Function to infer qualitative states.
 * - InferInitialQualitativeStateInput - Input type.
 * - InferInitialQualitativeStateOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import { SystemModelSchema, InferInitialQualitativeStateInputSchema, InferInitialQualitativeStateOutputSchema } from '@/types/cascade';
import type { SystemModel, InferInitialQualitativeStateInput, InferInitialQualitativeStateOutput } from '@/types/cascade';

export type { InferInitialQualitativeStateInput, InferInitialQualitativeStateOutput };

export async function inferInitialQualitativeStates(input: InferInitialQualitativeStateInput): Promise<InferInitialQualitativeStateOutput> {
  return inferInitialQualitativeStateFlow(input);
}

const inferStatePrompt = ai.definePrompt({
  name: 'inferInitialQualitativeStatePrompt',
  input: {schema: InferInitialQualitativeStateInputSchema},
  output: {schema: InferInitialQualitativeStateOutputSchema},
  prompt: `You are a Systems Analyst. Given the user's assertion and an initial system model, your task is to infer the likely initial qualitative state for each stock in the model.
A qualitative state describes the stock's condition, such as 'Strong', 'Moderate', 'Weak', 'Strained', 'Depleted', 'Abundant', 'Stable', 'Volatile', 'Under Pressure', 'Growing', 'Declining', etc. Choose the most appropriate term.

User's Assertion:
"{{assertionText}}"

Initial System Model:
Stocks:
{{#each systemModel.stocks}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No stocks in model)
{{/each}}
Agents:
{{#each systemModel.agents}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No agents in model)
{{/each}}
Incentives & Flows (Agent-Stock):
{{#each systemModel.incentives}}
- Agent: {{agentName}}, Target Stock: {{targetStockName}}, Incentive: "{{incentiveDescription}}"{{#if resultingFlow}}, Flow: "{{resultingFlow}}"{{/if}}
{{else}}
(No agent-stock incentives identified)
{{/each}}
Stock-to-Stock Flows:
{{#each systemModel.stockToStockFlows}}
- Source: {{sourceStockName}}, Target: {{targetStockName}}, Flow: "{{flowDescription}}"
{{else}}
(No stock-to-stock flows identified)
{{/each}}

Based on the assertion and the overall context provided by the system model:
1.  For EACH stock listed in 'systemModel.stocks', determine its most likely initial qualitative state. Add this state as a 'qualitativeState' field to each stock object.
2.  Provide an 'initialStatesSummary' (2-4 sentences) explaining your overall reasoning for these inferred initial states, highlighting any key assumptions made based on the assertion.

Return the complete system model with the 'qualitativeState' field populated for all stocks in 'systemModelWithQualitativeStates', and the 'initialStatesSummary'.
Ensure the 'systemModelWithQualitativeStates' retains all original fields for stocks, agents, incentives, and stockToStockFlows, only adding the 'qualitativeState' to the stocks.
Example for a stock: { name: "Public Trust", description: "Faith in institutions", qualitativeState: "Moderate" }
`,
});

const inferInitialQualitativeStateFlow = ai.defineFlow(
  {
    name: 'inferInitialQualitativeStateFlow',
    inputSchema: InferInitialQualitativeStateInputSchema,
    outputSchema: InferInitialQualitativeStateOutputSchema,
  },
  async (input) => {
    if (!input.systemModel || !input.assertionText) {
      throw new Error('System model and assertion text must be provided for initial state inference.');
    }
    
    const result = await inferStatePrompt(input);

    if (!result || !result.output || !result.output.systemModelWithQualitativeStates || !result.output.initialStatesSummary) {
        console.error('Infer initial qualitative state prompt did not return the expected output structure.', result);
        // Fallback strategy: return the original system model and a note about the failure.
        // This ensures the flow doesn't entirely break the chain if the AI fails here.
        // The qualitativeState field might be missing or undefined on stocks in this fallback.
        return {
            systemModelWithQualitativeStates: input.systemModel, // Return original model
            initialStatesSummary: "AI was unable to infer initial qualitative states. Proceeding with undefined states."
        };
    }
    // Ensure all stocks in the returned model have at least an optional qualitativeState field for type safety downstream, even if AI omits some.
    const validatedModel = {
        ...result.output.systemModelWithQualitativeStates,
        stocks: result.output.systemModelWithQualitativeStates.stocks.map(stock => ({
            ...stock,
            qualitativeState: stock.qualitativeState || undefined // Ensure field exists
        }))
    };

    return {
        systemModelWithQualitativeStates: validatedModel,
        initialStatesSummary: result.output.initialStatesSummary
    };
  }
);

    