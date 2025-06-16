
'use server';
/**
 * @fileOverview Generates a narrative summary of the system's evolution through phases,
 * incorporating qualitative state changes, feedback loops, and equilibrium thinking.
 *
 * - generateCascadeSummary - A function that creates a summary from the full impact map and system dynamics.
 * - CascadeSummaryInput - The input type for the generateCascadeSummary function.
 * - CascadeSummaryOutput - The return type for the generateCascadeSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { CascadeSummaryInputSchema, CascadeSummaryOutputSchema } from '@/types/cascade';
import type { CascadeSummaryInput, CascadeSummaryOutput } from '@/types/cascade';

export type { CascadeSummaryInput, CascadeSummaryOutput };

export async function generateCascadeSummary(input: CascadeSummaryInput): Promise<CascadeSummaryOutput> {
  return generateCascadeSummaryFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'generateCascadeSummaryPrompt',
  input: {schema: CascadeSummaryInputSchema},
  output: {schema: CascadeSummaryOutputSchema},
  prompt: `You are an expert Systems Analyst and Persuasive Writer. Your task is to compose a compelling essay explaining the evolution of a system in response to an initial assertion.
The system's state changes qualitatively across phases, influenced by impacts, tensions, and feedback loops, eventually tending towards one or more equilibrium states.

Initial Assertion Summary: "{{initialAssertion.summary}}"
Full Assertion Text: "{{initialAssertion.fullText}}"

{{#if initialSystemStatesSummary}}
Summary of Initial Qualitative System States (before any impacts):
"{{initialSystemStatesSummary}}"
{{/if}}

Phase 1 Impacts (Initial Consequences):
{{#if firstPhaseImpacts.length}}
  {{#each firstPhaseImpacts}}
  - Impact ID: {{id}}, Label: "{{label}}", Description: "{{description}}"
    (Validity: {{validity}}, Causal Reasoning: "{{causalReasoning}}")
  {{/each}}
{{else}}
  No first-phase impacts were identified.
{{/if}}

Phase 2 Impacts (Transition Phase):
{{#if transitionPhaseImpacts.length}}
  {{#each transitionPhaseImpacts}}
  - Impact ID: {{id}}, ParentID (Phase 1): {{parentId}}, Label: "{{label}}", Description: "{{description}}"
    (Validity: {{validity}}, Causal Reasoning: "{{causalReasoning}}")
  {{/each}}
{{else}}
  No transition-phase impacts were identified.
{{/if}}

Phase 3 Impacts (Stabilization Phase):
{{#if stabilizationPhaseImpacts.length}}
  {{#each stabilizationPhaseImpacts}}
  - Impact ID: {{id}}, ParentID (Phase 2): {{parentId}}, Label: "{{label}}", Description: "{{description}}"
    (Validity: {{validity}}, Causal Reasoning: "{{causalReasoning}}")
  {{/each}}
{{else}}
  No stabilization-phase impacts were identified.
{{/if}}

{{#if feedbackLoopInsights.length}}
Identified Feedback Loop Insights during System Evolution:
{{#each feedbackLoopInsights}}
- "{{this}}"
{{/each}}
{{/if}}

{{#if finalSystemQualitativeStates}}
Final Qualitative States of Key System Stocks (after all phases):
{{#each finalSystemQualitativeStates}}
- {{ @key }}: {{this}}
{{/each}}
{{/if}}

Your essay ("narrativeSummary") must:
1.  **Introduction**: Start with the initial assertion. Briefly mention the inferred initial qualitative state of the system (if provided by 'initialSystemStatesSummary') to set the stage.
2.  **Body - System Evolution Through Phases**:
    *   Describe how the system evolves from its initial state. Narrate the progression of key impacts through Phase 1, Transition Phase, and Stabilization Phase.
    *   **Integrate State Changes**: When discussing impacts, explain how they likely affected the qualitative states of relevant system stocks (e.g., "This policy initially strengthened 'Public Trust', but later strained 'Fiscal Reserves'.").
    *   **Weave in Feedback Loops**: Explicitly incorporate the 'feedbackLoopInsights'. Explain how these loops (reinforcing or balancing) influenced the system's trajectory and the evolution of its qualitative states. For example: "The initial success in X created a reinforcing loop by boosting Y, which in turn further accelerated X."
    *   **Highlight Key Dynamics**: Focus on the most significant causal chains, state shifts, and feedback mechanisms. Don't just list impacts; explain their interplay.
3.  **Conclusion - Equilibrium and System Destination**:
    *   Based on the entire evolution, the final qualitative states (if provided), and the identified feedback loops, discuss where the system tends to stabilize.
    *   Describe 1-3 plausible "equilibrium states" or "system destinations." These are not necessarily static endpoints but rather dynamic patterns or conditions the system is likely to settle into. For example: "The system appears to be heading towards a new equilibrium characterized by high innovation but increased social stratification," or "A likely outcome is a fragile balance, with ongoing tension between force A and force B."
    *   Your conclusion should synthesize the analysis into a coherent view of the system's likely future based *only* on the provided inputs.
4.  **Tone and Style**: Authoritative, analytical, insightful, and persuasive. Make it read like a sophisticated systems analysis.

Crucially, ensure your narrative is grounded in the provided data (assertion, impacts, states, feedback insights). Do not introduce external information. The goal is to synthesize the provided system dynamics into a compelling story of change and potential futures.
`,
});

const generateCascadeSummaryFlow = ai.defineFlow(
  {
    name: 'generateCascadeSummaryFlow',
    inputSchema: CascadeSummaryInputSchema,
    outputSchema: CascadeSummaryOutputSchema,
  },
  async (input: CascadeSummaryInput) => {
    if (!input.initialAssertion?.fullText) {
        return { narrativeSummary: "The initial assertion was not provided or was empty, so a summary cannot be generated." };
    }
    // Ensure arrays are present even if empty for the prompt
    const promptInput: CascadeSummaryInput = {
        ...input,
        firstPhaseImpacts: input.firstPhaseImpacts || [],
        transitionPhaseImpacts: input.transitionPhaseImpacts || [],
        stabilizationPhaseImpacts: input.stabilizationPhaseImpacts || [],
        feedbackLoopInsights: input.feedbackLoopInsights || [],
        // initialSystemStatesSummary and finalSystemQualitativeStates are optional and handled by Handlebars
    };

    const result = await summaryPrompt(promptInput);
    if (!result || !result.output || !result.output.narrativeSummary) {
      console.error('Generate cascade summary prompt did not return the expected output structure.', result);
      return { narrativeSummary: "The AI was unable to generate a narrative summary for the provided system evolution at this time." };
    }
    return result.output;
  }
);

    