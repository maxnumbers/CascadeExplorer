
'use server';
/**
 * @fileOverview Revises an existing system model based on user's textual feedback.
 *
 * - reviseSystemModelWithFeedback - A function that takes the current system model and user feedback,
 *   and returns a revised system model and a summary of changes.
 * - ReviseSystemModelInput - The input type for the function.
 * - ReviseSystemModelOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'zod';
import { ReviseSystemModelInputSchema, ReviseSystemModelOutputSchema, SystemModelSchema } from '@/types/cascade';
import type { ReviseSystemModelInput, ReviseSystemModelOutput } from '@/types/cascade';

export type { ReviseSystemModelInput, ReviseSystemModelOutput };

export async function reviseSystemModelWithFeedback(input: ReviseSystemModelInput): Promise<ReviseSystemModelOutput> {
  return reviseSystemModelFlow(input);
}

const revisePrompt = ai.definePrompt({
  name: 'reviseSystemModelPrompt',
  input: {schema: ReviseSystemModelInputSchema},
  output: {schema: ReviseSystemModelOutputSchema},
  prompt: `You are an expert Systems Analyst. Your task is to revise an existing system model based on user feedback, ensuring the revised model remains coherent and interconnected.

Current System Model:
Stocks:
{{#each currentSystemModel.stocks}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}{{#if qualitativeState}}, State: "{{qualitativeState}}"{{/if}}
{{else}}
(No stocks in current model)
{{/each}}

Agents:
{{#each currentSystemModel.agents}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No agents in current model)
{{/each}}

Incentives & Flows (Agent-Stock):
{{#each currentSystemModel.incentives}}
- Agent: {{agentName}}, Target Stock: {{targetStockName}}, Incentive: "{{incentiveDescription}}"{{#if resultingFlow}}, Flow: "{{resultingFlow}}"{{/if}}
{{else}}
(No agent-stock incentives in current model)
{{/each}}

Stock-to-Stock Flows:
{{#if currentSystemModel.stockToStockFlows.length}}
{{#each currentSystemModel.stockToStockFlows}}
- Source: {{sourceStockName}}, Target: {{targetStockName}}, Flow: "{{flowDescription}}"{{#if drivingForceDescription}}, Driver: "{{drivingForceDescription}}"{{/if}}
{{/each}}
{{else}}
(No stock-to-stock flows in current model)
{{/if}}

User Feedback:
"{{userFeedback}}"

Based on this feedback and the current model:
1.  **Preserve Existing Structure**: Start with the 'currentSystemModel'. Your primary goal is to incorporate the user's feedback while *preserving as much of the existing valid structure and connections (stocks, agents, incentives, stockToStockFlows) as possible*. Do not remove or alter existing elements unless the user's feedback *explicitly and unambiguously* directs you to do so or makes an existing element clearly redundant or incorrect in light of the feedback.
2.  **Incorporate Feedback**:
    *   If the user suggests adding new stocks, agents, incentives, or stock-to-stock flows, add them to the model.
    *   If the user suggests modifying existing elements (e.g., changing descriptions, names for typos, incentive details), apply these modifications.
    *   If the user points out missing connections, add the appropriate incentives or stock-to-stock flows.
3.  **Ensure Interconnectedness**: Any new elements added based on feedback MUST be meaningfully connected to the existing model through appropriate incentives or stock-to-stock flows. Avoid creating isolated components in the revised model. If the feedback implies new components that cannot be logically connected to the core system dynamics influenced by the assertion, explain this limitation in your summary.
4.  **Schema Adherence**: The 'revisedSystemModel' MUST strictly adhere to the SystemModel schema (stocks, agents, incentives, stockToStockFlows with their sub-fields).
    *   All 'agentName' and 'targetStockName' in 'incentives' MUST refer to agents and stocks present in the *revised* 'agents' and 'stocks' lists.
    *   All 'sourceStockName' and 'targetStockName' in 'stockToStockFlows' MUST refer to stocks present in the *revised* 'stocks' list.
    *   Retain qualitative states on stocks if they were present.
5.  **Revision Summary**: Provide a 'revisionSummary' (2-4 sentences) explaining the key changes you made and your reasoning, especially highlighting how feedback was incorporated and how connections were maintained or established. If a piece of feedback could not be fully implemented while maintaining model coherence, briefly explain why.

Focus on accurately interpreting the user's intent and making logical, coherent updates. Prioritize a connected and holistic revised model.
`,
});

const reviseSystemModelFlow = ai.defineFlow(
  {
    name: 'reviseSystemModelFlow',
    inputSchema: ReviseSystemModelInputSchema,
    outputSchema: ReviseSystemModelOutputSchema,
  },
  async (input) => {
    if (!input.currentSystemModel || !input.userFeedback) {
      // This check is important for developer error, should not happen from UI if checks are in place.
      console.error("reviseSystemModelFlow: Current system model or user feedback is missing.", input);
      throw new Error('Current system model and user feedback must be provided.');
    }
    
    const result = await revisePrompt(input);

    if (!result || !result.output || !result.output.revisedSystemModel || !result.output.revisionSummary) {
        console.error('Revise system model prompt did not return the expected output structure.', result);
        // Fallback if AI output is malformed to ensure the flow still returns something
        // that matches the output schema, even if it's just the original model.
        return {
            revisedSystemModel: input.currentSystemModel, 
            revisionSummary: "The AI was unable to process the revisions as requested or the output was malformed. The system model has not been changed."
        };
    }
    return result.output;
  }
);

