
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
import {z} from 'zod';
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
1.  **Introduction**: Start with the initial assertion. Briefly describe the initial situation or context (informed by 'initialSystemStatesSummary' if provided) to set the stage.
2.  **Body - System Evolution Through Stages**:
    *   Describe how the system evolves from its initial condition. Narrate the progression of key developments and consequences, drawing from the substance of Phase 1, Transition, and Stabilization impacts.
    *   **CRITICAL: Write a fluid, immersive narrative. Do NOT explicitly mention "Phase 1/2/3", impact IDs (e.g., "impact-1-1"), or directly quote impact labels/descriptions verbatim in the essay. Instead, synthesize the *meaning, substance, and causal connections* of the impacts into the narrative. For example, instead of saying "'Improved Employee Well-being' (impact-1-1) occurred, which was a high validity impact...", you might say "Initially, efforts to enhance employee well-being, such as better compensation, began to take effect, strengthening morale...".**
    *   **Integrate State Changes Naturally**: When discussing developments, explain how they likely affected relevant aspects of the system (informed by qualitative stock states). For example: "This policy initially bolstered public trust, but later placed a strain on fiscal reserves." Avoid saying "Stock 'Public Trust' changed to 'High'".
    *   **Weave in Feedback Dynamics**: Subtly incorporate the essence of 'feedbackLoopInsights'. Explain how these reinforcing or balancing dynamics influenced the system's trajectory. For example: "The initial success in X created a virtuous cycle by boosting Y, which in turn further accelerated X." Avoid using the term "feedback loop" explicitly unless it flows very naturally.
    *   **Highlight Key Dynamics**: Focus on the most significant causal chains and shifts in the system. Don't just list events; explain their interplay and significance.
3.  **Conclusion - System Outlook and Potential Futures**:
    *   Based on the entire evolution, the final system conditions (if provided), and the identified dynamics, discuss where the system appears to be heading.
    *   Describe 1-3 plausible "future scenarios" or "system destinations." These are not necessarily static endpoints but rather dynamic patterns or conditions the system is likely to settle into. For example: "The system appears to be heading towards a new state characterized by high innovation but increased social stratification," or "A likely outcome is a fragile balance, with ongoing tension between certain forces."
    *   Your conclusion should synthesize the analysis into a coherent view of the system's likely future based *only* on the provided inputs.
4.  **Tone and Style**: Authoritative, analytical, insightful, and persuasive. Make it read like a sophisticated systems analysis written for a general intelligent audience, not a technical report.

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

    

