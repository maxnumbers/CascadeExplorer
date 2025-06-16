
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
import {z} from 'zod';
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
  prompt: `You are an expert Systems Analyst. Your task is to revise an existing system model based on user feedback.
The user has provided feedback on what they believe is incorrect, missing, or should be changed in the current system model.
Carefully analyze the user's feedback and the current system model. Then, produce a 'revisedSystemModel' that incorporates the feedback.

When revising, you can:
- Add new stocks, agents, or incentives.
- Modify existing stocks, agents, or incentives (e.g., change descriptions, names if typos, incentive details).
- Remove stocks, agents, or incentives if the feedback strongly implies they are irrelevant or incorrect.
- Re-categorize elements if appropriate (e.g., an agent might become a stock if viewed differently).

The 'revisedSystemModel' MUST strictly adhere to the SystemModel schema (stocks, agents, incentives with their sub-fields).
Ensure that names used in 'incentives' (agentName, targetStockName) correctly refer to names defined in the 'agents' and 'stocks' lists of the *revised* model.

Also, provide a 'revisionSummary' (2-3 sentences) explaining the key changes you made to the system model based on the user's feedback and your reasoning.

Current System Model:
Stocks:
{{#each currentSystemModel.stocks}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No stocks in current model)
{{/each}}

Agents:
{{#each currentSystemModel.agents}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No agents in current model)
{{/each}}

Incentives & Flows:
{{#each currentSystemModel.incentives}}
- Agent: {{agentName}}, Target Stock: {{targetStockName}}, Incentive: "{{incentiveDescription}}"{{#if resultingFlow}}, Flow: "{{resultingFlow}}"{{/if}}
{{else}}
(No incentives in current model)
{{/each}}

User Feedback:
"{{userFeedback}}"

Based on this feedback and the current model, generate the 'revisedSystemModel' and 'revisionSummary'.
Focus on accurately interpreting the user's intent and making logical, coherent updates to the system model.
If the feedback is vague or impossible to implement structurally, make a best effort to address the user's concern or explain in the summary why a direct change wasn't feasible.
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
