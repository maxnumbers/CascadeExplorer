
'use server';

/**
 * @fileOverview Generates impacts for a specific system phase (Initial, Transition, Stabilization)
 * based on an initial assertion, parent impacts, current system qualitative states, and identified system tensions.
 * This flow aims to model the system's evolution.
 *
 * - generateImpactsByOrder (conceptually generatePhaseConsequences)
 * - GenerateImpactsByOrderInput (now AIGenerateImpactsByOrderInput from types)
 * - GenerateImpactsByOrderOutput (now GeneratePhaseConsequencesOutput from types)
 */

import {ai} from '@/ai/genkit';
import {z}from 'zod';
import { ImpactSchema, TensionAnalysisOutputSchema, SystemModelSchema, GeneratePhaseConsequencesOutputSchema } from '@/types/cascade'; 
import type { AIGenerateImpactsByOrderInput as GeneratePhaseConsequencesInputType, GeneratePhaseConsequencesOutput } from '@/types/cascade'; // Renamed for conceptual clarity


// Define the input schema matching AIGenerateImpactsByOrderInput from types/cascade.ts
const GeneratePhaseConsequencesInputSchema = z.object({
  assertionText: z.string().describe('The initial user assertion or idea for overall context.'),
  targetPhase: z.enum(['1', '2', '3']).describe("The phase of impacts to generate ('1' for Initial Consequences, '2' for Transition Phase, '3' for Stabilization Phase)."),
  parentImpacts: z.array(ImpactSchema).optional().describe('Impacts from the previous phase that these new impacts will stem from. Required for phase 2 or 3 if following a chain.'),
  currentSystemQualitativeStates: z.record(z.string()).describe("Current qualitative states of all system stocks (e.g., {'Employee Trust': 'Moderate'})."),
  tensionAnalysis: TensionAnalysisOutputSchema.optional().describe('Previously identified system tensions to consider for realism.'),
  systemModel: SystemModelSchema.describe("The full system model (stocks, agents, incentives, flows) for context.")
});
export type GeneratePhaseConsequencesInput = z.infer<typeof GeneratePhaseConsequencesInputSchema>;

// Internal schema for the prompt, extending the flow input with boolean phase flags
const PhasePromptInternalInputSchema = GeneratePhaseConsequencesInputSchema.extend({
  isPhase1: z.boolean(),
  isPhase2: z.boolean(),
  isPhase3: z.boolean(),
});
type PhasePromptInternalInput = z.infer<typeof PhasePromptInternalInputSchema>;


// Output schema is GeneratePhaseConsequencesOutputSchema from types/cascade.ts
export type { GeneratePhaseConsequencesOutput };


export async function generateImpactsByOrder(input: GeneratePhaseConsequencesInput): Promise<GeneratePhaseConsequencesOutput> {
  return generatePhaseConsequencesFlow(input);
}

const phasePrompt = ai.definePrompt({
  name: 'generatePhaseConsequencesPrompt',
  input: {schema: PhasePromptInternalInputSchema}, // Use the internal schema with boolean flags
  output: {schema: GeneratePhaseConsequencesOutputSchema},
  prompt: `You are a Systems Dynamics Analyst. Your task is to model the evolution of a system through qualitative phases, considering its current state, tensions, and how impacts create feedback loops.

Overall Assertion: "{{assertionText}}"

Full System Model for Context:
Stocks: {{#each systemModel.stocks}} - {{name}} (Initial State: {{qualitativeState}}){{/each}}
Agents: {{#each systemModel.agents}} - {{name}}{{/each}}
(Incentives and flows also exist in the model)

Current Qualitative States of Key Stocks:
{{#each currentSystemQualitativeStates}}
- {{ @key }}: {{this}}
{{else}}
(No specific current qualitative states provided, rely on initial states in systemModel)
{{/each}}

{{#if tensionAnalysis}}
System Tensions to Consider:
  Competing Stakeholder Responses: {{#each tensionAnalysis.competingStakeholderResponses}}Agent {{agentName}} may {{supportiveResponse.description}} or {{resistantResponse.description}}. {{/each}}
  Resource Constraints: {{#each tensionAnalysis.resourceConstraints}}{{resourceName}} may be scarce due to {{demandsOnResource}}. {{/each}}
  Trade-Offs: {{#each tensionAnalysis.identifiedTradeOffs}}Pursuing {{primaryPositiveOutcome}} might lead to {{potentialNegativeConsequenceOrOpportunityCost}}. {{/each}}
Incorporate these tensions into your reasoning. How might they shape the consequences, their likelihood, or trigger feedback?
{{/if}}

We are generating consequences for:
{{#if isPhase1}}**Phase 1: Initial Consequences** (Direct effects of the assertion given initial states and tensions).
  Parent context: The main assertion "{{assertionText}}".
  Number of distinct consequences to generate: 3-5.
{{/if}}
{{#if isPhase2}}**Phase 2: Transition Phase Consequences** (Effects stemming from Initial Consequences, considering evolving system states and tensions).
  Parent Impacts from Phase 1:
  {{#each parentImpacts}} - ID {{id}}, Label: "{{label}}" {{/each}}
  Number of distinct consequences to generate per parent: 2-3.
{{/if}}
{{#if isPhase3}}**Phase 3: Stabilization Phase Consequences** (Longer-term shifts and emergent system behaviors as it moves towards new equilibriums).
  Parent Impacts from Phase 2:
  {{#each parentImpacts}} - ID {{id}}, Label: "{{label}}" {{/each}}
  Number of distinct consequences to generate per parent: 1-2.
{{/if}}

For each consequence you generate (to be included in the 'generatedImpacts' array):
1.  **Impact Definition**:
    *   Assign a unique \`id\` (e.g., impact-{{targetPhase}}-{index}).
    *   Provide a concise \`label\` (2-3 lines max).
    *   Provide a detailed \`description\`. This description MUST explain how the consequence arises from its parent (or the assertion for Phase 1) AND how it is influenced by the \`currentSystemQualitativeStates\` and any relevant \`tensionAnalysis\`.
    *   Assess its \`validity\` ('high', 'medium', 'low') and provide \`reasoning\` for this, referencing system states and tensions.
    *   Include \`keyConcepts\` (2-4, name/type objects) and \`attributes\` (1-2 strings).
    *   Provide clear \`causalReasoning\` linking to its parent, system state, and tensions.
    *   **CRITICAL for Phase 2 & 3**: Include the \`parentId\` field, specifying the ID of the specific impact from the preceding phase.
2.  **Individual Impact's Effect on System State**:
    *   Based on THIS specific consequence, determine how the qualitative state of one or more key stocks in the \`systemModel\` would change.
    *   Document these changes internally for your aggregation step. (You will provide a cumulative \`updatedSystemQualitativeStates\` object later, or omit it if no states change overall).
3.  **Feedback Loop Identification (\`feedbackLoopInsights\`)**:
    *   Does this consequence, or the state changes it causes, create or significantly influence a feedback loop (reinforcing or balancing) that affects earlier conditions or other parts of the system?
    *   If yes, provide a brief (1-2 sentence) insight describing this feedback loop (e.g., "This decline in 'Public Trust' could reinforce 'Regulatory Scrutiny', creating a negative spiral." or "Improved 'Product Quality' positively feeds back to 'Customer Satisfaction', driving growth."). This will be collected into an array.

Output Structure:
Return all generated impacts in the 'generatedImpacts' array.

For the 'updatedSystemQualitativeStates' field in your final JSON output:
- If one or more impacts generated in this call cause a change in the qualitative state of any system stock, this field MUST be an object. This object should map the names of *all changed stocks* to their new qualitative states (e.g., {\"StockA\": \"Improved\", \"StockB\": \"Declining\"}), including only stocks whose states changed.
- **If NO stock states are changed by any impact generated in this call, you MUST OMIT the \`updatedSystemQualitativeStates\` field entirely from your JSON output.**

Return ALL identified feedback loop insights from ALL impacts generated in THIS call in the 'feedbackLoopInsights' array.

Ensure all generated impacts remain directly relevant to the overall assertion's domain.
`,
});

const generatePhaseConsequencesFlow = ai.defineFlow(
  {
    name: 'generatePhaseConsequencesFlow',
    inputSchema: GeneratePhaseConsequencesInputSchema,
    outputSchema: GeneratePhaseConsequencesOutputSchema, // Use the one from types
  },
  async (input: GeneratePhaseConsequencesInput): Promise<GeneratePhaseConsequencesOutput> => {
    if ((input.targetPhase === '2' || input.targetPhase === '3') && (!input.parentImpacts || input.parentImpacts.length === 0)) {
      console.warn(`generatePhaseConsequencesFlow called for phase ${input.targetPhase} without parentImpacts. Returning empty.`);
      return { generatedImpacts: [], feedbackLoopInsights: [] }; // updatedSystemQualitativeStates omitted
    }

    // Prepare the input for the prompt, including boolean flags for phase
    const promptInputForAI: PhasePromptInternalInput = {
      ...input,
      isPhase1: input.targetPhase === '1',
      isPhase2: input.targetPhase === '2',
      isPhase3: input.targetPhase === '3',
    };

    const result = await phasePrompt(promptInputForAI);

    if (!result || !result.output) { 
      console.error('Generate phase consequences prompt did not return an output object.', result);
      return { 
        generatedImpacts: [], 
        // Return current states as a fallback, AI might have just failed to produce output
        // updatedSystemQualitativeStates: input.currentSystemQualitativeStates, // Omit as per new strategy
        feedbackLoopInsights: [] 
      };
    }
    
    if (!result.output.generatedImpacts) {
        console.warn('Generate phase consequences prompt output is missing generatedImpacts. Assuming empty.', result.output);
    }
    
    let validatedUpdatedStates: Record<string, string> | undefined = undefined;
    if (result.output.updatedSystemQualitativeStates) {
      if (typeof result.output.updatedSystemQualitativeStates === 'object' &&
          !Array.isArray(result.output.updatedSystemQualitativeStates) &&
          result.output.updatedSystemQualitativeStates !== null) {
        
        let isValidMap = true;
        for (const key in result.output.updatedSystemQualitativeStates) {
          if (typeof result.output.updatedSystemQualitativeStates[key] !== 'string') {
            isValidMap = false;
            break;
          }
        }
        if (isValidMap) {
          validatedUpdatedStates = result.output.updatedSystemQualitativeStates as Record<string, string>;
        } else {
          console.warn('AI provided updatedSystemQualitativeStates but it was not a Record<string, string>. Ignoring.', result.output.updatedSystemQualitativeStates);
        }
      } else {
        console.warn('AI provided updatedSystemQualitativeStates but it was not an object. Ignoring.', result.output.updatedSystemQualitativeStates);
      }
    }
    
    const output: GeneratePhaseConsequencesOutput = {
        generatedImpacts: result.output.generatedImpacts || [],
        updatedSystemQualitativeStates: validatedUpdatedStates, 
        feedbackLoopInsights: result.output.feedbackLoopInsights || [],
    };
    
    // Basic validation for parentId on phase 2/3 impacts
    if (input.targetPhase === '2' || input.targetPhase === '3') {
        output.generatedImpacts.forEach(impact => {
            if (!impact.parentId) {
                console.warn(`Impact "${impact.label}" in phase ${input.targetPhase} is missing a parentId.`);
            }
        });
    }

    return output;
  }
);
