
'use server';
/**
 * @fileOverview Identifies tensions, constraints, and trade-offs related to an assertion and its system model.
 *
 * - identifyTensions - A function that analyzes an assertion and system model for tensions.
 * - TensionAnalysisInput - The input type for the identifyTensions function.
 * - TensionAnalysisOutput - The return type for the identifyTensions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { TensionAnalysisInputSchema, TensionAnalysisOutputSchema } from '@/types/cascade';
import type { TensionAnalysisInput, TensionAnalysisOutput } from '@/types/cascade';

export type { TensionAnalysisInput, TensionAnalysisOutput };

export async function identifyTensions(input: TensionAnalysisInput): Promise<TensionAnalysisOutput> {
  return identifyTensionsFlow(input);
}

const tensionIdentificationPrompt = ai.definePrompt({
  name: 'tensionIdentificationPrompt',
  input: {schema: TensionAnalysisInputSchema},
  output: {schema: TensionAnalysisOutputSchema},
  prompt: `You are a Critical Systems Analyst and Strategic Foresight expert.
Your task is to analyze the provided user assertion and its corresponding system model (stocks, agents, incentives, stock-to-stock flows) to identify potential tensions, constraints, and trade-offs. This analysis will help build a more realistic understanding of the assertion's potential consequences.

User's Assertion:
"{{assertionText}}"

System Model:
Stocks:
{{#each systemModel.stocks}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No stocks identified)
{{/each}}

Agents:
{{#each systemModel.agents}}
- Name: {{name}}{{#if description}}, Description: "{{description}}"{{/if}}
{{else}}
(No agents identified)
{{/each}}

Incentives & Flows (Agent-Stock):
{{#each systemModel.incentives}}
- Agent: {{agentName}}, Target Stock: {{targetStockName}}, Incentive: "{{incentiveDescription}}"{{#if resultingFlow}}, Flow: "{{resultingFlow}}"{{/if}}
{{else}}
(No agent-stock incentives identified)
{{/each}}

Stock-to-Stock Flows (Direct inter-stock influences):
{{#if systemModel.stockToStockFlows.length}}
  {{#each systemModel.stockToStockFlows}}
  - Source: {{sourceStockName}}, Target: {{targetStockName}}, Flow: "{{flowDescription}}"{{#if drivingForceDescription}}, Driver: "{{drivingForceDescription}}"{{/if}}
  {{/each}}
{{else}}
(No direct stock-to-stock flows identified)
{{/if}}

Based on the assertion and the system model, you MUST generate the following analysis:

1.  **Competing Stakeholder Responses ('competingStakeholderResponses')**: For EACH agent identified in the 'systemModel.agents' list (critically review up to 5 key agents if many are listed, prioritizing those most central to the assertion), analyze how they might respond to the user's 'assertionText'.
    *   For each agent, provide:
        *   'agentName': The name of the agent.
        *   'supportiveResponse': An object detailing how this agent might *support* or *further* the assertion.
            *   'description': A plausible supportive action or stance.
            *   'reasoning': The agent's likely motivation or interest for this supportive response.
        *   'resistantResponse': An object detailing how this agent might *resist*, *hinder*, or *subvert* the assertion.
            *   'description': A plausible resistant action or stance.
            *   'reasoning': The agent's likely motivation, fear, or conflicting interest for this resistant response.
        *   'keyAssumptions' (optional): Briefly state 1-2 key assumptions made about this agent's behavior, context, or capabilities that underpin your predicted responses.
    *   Aim for 2-4 agents to be analyzed in depth.

2.  **Resource Constraints ('resourceConstraints')**: Identify 2-4 critical resources that would be essential for the successful implementation or realization of the 'assertionText' or its primary positive outcomes.
    *   For each resource, provide:
        *   'resourceName': A concise name (e.g., "Funding", "Public Support", "Skilled Personnel", "Time", "Political Capital", "Critical Materials").
        *   'demandsOnResource': Briefly explain how the assertion itself or its direct intended outcomes would specifically demand or consume this resource.
        *   'potentialScarcityImpact': Describe how scarcity, competition for, or difficulty in acquiring this resource could negatively impact the assertion's success, lead to unintended negative consequences, or create bottlenecks.

3.  **Identified Trade-Offs ('identifiedTradeOffs')**: Based on the 'assertionText', identify 2-3 significant trade-offs. A trade-off occurs when pursuing a desired positive outcome inherently involves accepting a negative consequence or forgoing another valuable opportunity.
    *   For each trade-off, provide:
        *   'primaryPositiveOutcome': A key positive outcome or goal implied by the assertion.
        *   'potentialNegativeConsequenceOrOpportunityCost': The associated negative consequence, downside, or opportunity cost that is difficult to avoid if the positive outcome is pursued.
        *   'explanation': A clear explanation of why this trade-off exists – what is the inherent tension or conflict?

Your analysis should be critical and realistic, moving beyond simplistic cause-and-effect to uncover the complexities and potential challenges. Ensure your output strictly adheres to the JSON schema.
Think about political economy, implementation challenges, and how different parts of the system might react in ways that are not immediately obvious.
`,
});

const identifyTensionsFlow = ai.defineFlow(
  {
    name: 'identifyTensionsFlow',
    inputSchema: TensionAnalysisInputSchema,
    outputSchema: TensionAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.assertionText || !input.systemModel) {
      throw new Error('Assertion text and system model must be provided for tension analysis.');
    }

    const result = await tensionIdentificationPrompt(input);
    if (!result || !result.output || !result.output.competingStakeholderResponses || !result.output.resourceConstraints || !result.output.identifiedTradeOffs) {
      console.error('Tension identification prompt did not return the expected output structure.', result);
      throw new Error('AI failed to provide a valid tension analysis output. Check competingStakeholderResponses, resourceConstraints, and identifiedTradeOffs.');
    }
    return result.output;
  }
);

    