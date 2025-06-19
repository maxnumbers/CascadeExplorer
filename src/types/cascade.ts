
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { z } from 'zod';
// Import ReflectAssertionOutput type from its flow file
import type { ReflectAssertionOutput as AIReflectAssertionOutputOriginal } from '@/ai/flows/assertion-reflection';

export const CORE_ASSERTION_ID = 'core-assertion'; // Exporting this

export const StructuredConceptSchema = z.object({
  name: z.string().describe("The name of the key concept or entity."),
  type: z.string().optional().describe("An optional type for the concept (e.g., 'Technology', 'Social Trend', 'Organization', 'Location', 'Person').")
});
export type StructuredConcept = z.infer<typeof StructuredConceptSchema>;

export const SystemStockSchema = z.object({
  name: z.string().describe("Name of the stock (e.g., 'Public Trust', 'Market Share')."),
  description: z.string().optional().describe("Brief description of what this stock represents or how it's measured."),
  qualitativeState: z.string().optional().describe("The qualitative state of the stock (e.g., Strong, Moderate, Weak, Strained, Critical, Stable, Volatile). This is inferred by AI.")
});
export type SystemStock = z.infer<typeof SystemStockSchema>;

export const SystemAgentSchema = z.object({
  name: z.string().describe("Name of the agent (e.g., 'Government', 'Consumers')."),
  description: z.string().optional().describe("Brief description of this agent's role or characteristics in the system.")
});
export type SystemAgent = z.infer<typeof SystemAgentSchema>;

export const SystemIncentiveSchema = z.object({
  agentName: z.string().describe("The name of the agent possessing the incentive."),
  targetStockName: z.string().describe("The name of the stock this incentive is directed towards affecting."),
  incentiveDescription: z.string().describe("Description of the agent's motivation or goal regarding the stock."),
  resultingFlow: z.string().optional().describe("A brief description of the flow or action this incentive typically drives from the agent, affecting the stock (e.g., 'Increases investment', 'Reduces consumption').")
});
export type SystemIncentive = z.infer<typeof SystemIncentiveSchema>;

export const StockToStockFlowSchema = z.object({
  sourceStockName: z.string().describe("The stock that is the source of the influence."),
  targetStockName: z.string().describe("The stock that is being influenced."),
  flowDescription: z.string().describe("Description of how the source stock influences the target stock (e.g., 'Depletion of X leads to increase in Y', 'Growth in A enables growth in B')."),
  drivingForceDescription: z.string().optional().describe("Brief explanation of the underlying mechanism or reason for this direct stock-to-stock interaction, if not obvious from their nature (e.g., 'Shared resource dependency', 'Natural ecological succession').")
});
export type StockToStockFlow = z.infer<typeof StockToStockFlowSchema>;

export const SystemModelSchema = z.object({
  stocks: z.array(SystemStockSchema).describe("Key accumulations or resources in the system that can change over time, each potentially with a qualitative state."),
  agents: z.array(SystemAgentSchema).describe("Actors or entities within the system that can influence stocks."),
  incentives: z.array(SystemIncentiveSchema).describe("Primary incentives of agents related to identified stocks, and the flows they drive."),
  stockToStockFlows: z.array(StockToStockFlowSchema).optional().describe("Direct influences or flows between different stocks, independent of direct agent actions (e.g., resource depletion leading to consequence, ecological dependencies).")
});
export type SystemModel = z.infer<typeof SystemModelSchema>;


export const ImpactSchema = z.object({
  id: z.string().describe('Unique identifier for the impact.'),
  label: z.string().describe('Short label for the impact (2-3 lines max).'),
  description: z.string().describe('Detailed description of the impact, potentially noting how it interacts with system states.'),
  validity: z.enum(['high', 'medium', 'low']).describe('Validity assessment (high/medium/low).'),
  reasoning: z.string().describe('Reasoning for validity assessment.'),
  parentIds: z.array(z.string()).optional().describe('The IDs of the parent impacts from the previous order/phase. Can be multiple if the impact is a confluence of several parents. If empty for a Phase 1 impact, it links to the core assertion.'),
  keyConcepts: z.array(StructuredConceptSchema).optional().describe('A list of structured key concepts (name, type) central to this specific impact.'),
  attributes: z.array(z.string()).optional().describe('A list of key attributes or defining characteristics of this specific impact.'),
  causalReasoning: z.string().optional().describe('Explanation of why this impact is a plausible consequence of its preceding impacts and current system state. For first-phase impacts, this explains their link to the initial assertion and state.'),
  order: z.enum(['0','1', '2', '3']).optional().describe("The hierarchical order (0 for core, 1 for Initial, 2 for Transition, 3 for Stabilization) this impact belongs to. This is often set programmatically rather than by AI for new impacts."),
});
export type Impact = z.infer<typeof ImpactSchema>;

// Schema for the input to the consolidation flow
// Renamed from ImpactMappingInputForConsolidationSchema
export const SuggestImpactConsolidationInputSchema = z.object({
  impactsForCurrentOrder: z.array(ImpactSchema).describe('Impacts from the current order/phase to consider for consolidation.'),
  currentOrder: z.enum(['1', '2', '3']).describe("The order/phase these impacts belong to ('1' for Initial, '2' for Transition, '3' for Stabilization)."),
});
export type SuggestImpactConsolidationInput = z.infer<typeof SuggestImpactConsolidationInputSchema>;


// Schema for the input of the cascade summary generation AI flow
export const CascadeSummaryInputSchema = z.object({
    initialAssertion: z.object({
        summary: z.string().describe("The AI's concise summary/title of the user's initial assertion."),
        fullText: z.string().describe("The user's original full assertion text."),
    }).describe("The starting point of the cascade."),
    initialSystemStatesSummary: z.string().optional().describe("AI-generated summary of the initial qualitative states of the system's stocks."),
    firstPhaseImpacts: z.array(ImpactSchema).optional().describe("List of impacts from the first phase (formerly 1st order)."),
    transitionPhaseImpacts: z.array(ImpactSchema).optional().describe("List of impacts from the transition phase (formerly 2nd order)."),
    stabilizationPhaseImpacts: z.array(ImpactSchema).optional().describe("List of impacts from the stabilization phase (formerly 3rd order)."),
    feedbackLoopInsights: z.array(z.string()).optional().describe("Collected insights or descriptions of feedback loops identified during the phase progression."),
    finalSystemQualitativeStates: z.record(z.string()).optional().describe("The final qualitative states of key system stocks after all phases.")
});
export type CascadeSummaryInput = z.infer<typeof CascadeSummaryInputSchema>;

// Schema for the output of the cascade summary generation AI flow
export const CascadeSummaryOutputSchema = z.object({
  narrativeSummary: z.string().describe("A cohesive narrative summary explaining the system's evolution through phases, incorporating feedback loops, and discussing potential equilibrium states."),
});
export type CascadeSummaryOutput = z.infer<typeof CascadeSummaryOutputSchema>;

// Schemas for revising system model with feedback
export const ReviseSystemModelInputSchema = z.object({
  currentSystemModel: SystemModelSchema.describe("The current system model to be revised."),
  userFeedback: z.string().describe("User's textual feedback outlining desired changes or pointing out inaccuracies/omissions in the current system model.")
});
export type ReviseSystemModelInput = z.infer<typeof ReviseSystemModelInputSchema>;

export const ReviseSystemModelOutputSchema = z.object({
  revisedSystemModel: SystemModelSchema.describe("The system model after incorporating user feedback."),
  revisionSummary: z.string().describe("A brief summary from the AI explaining what changes were made to the system model based on the feedback, and why.")
});
export type ReviseSystemModelOutput = z.infer<typeof ReviseSystemModelOutputSchema>;

// Schemas for Tension Analysis
const CompetingStakeholderResponseSchema = z.object({
  agentName: z.string().describe("Name of the agent from the SystemModel."),
  supportiveResponse: z.object({
    description: z.string().describe("How this agent would likely support or further the assertion."),
    reasoning: z.string().describe("Why this agent would respond supportively (motivations, interests).")
  }).describe("Likely supportive actions or stance of the agent towards the assertion."),
  resistantResponse: z.object({
    description: z.string().describe("How this agent would likely resist, hinder, or subvert the assertion."),
    reasoning: z.string().describe("Why this agent would respond with resistance (motivations, fears, conflicting interests).")
  }).describe("Likely resistant actions or stance of the agent towards the assertion."),
  keyAssumptions: z.string().optional().describe("Key assumptions made about this agent's behavior or context influencing these responses.")
});
export type CompetingStakeholderResponse = z.infer<typeof CompetingStakeholderResponseSchema>;

const ResourceConstraintSchema = z.object({
  resourceName: z.string().describe("Name of a key resource (e.g., 'Funding', 'Public Support', 'Skilled Labor', 'Time', 'Political Capital')."),
  potentialScarcityImpact: z.string().describe("How scarcity or competition for this resource could negatively impact the assertion's success or lead to unintended consequences."),
  demandsOnResource: z.string().describe("Briefly explain how the assertion or its direct intended outcomes would demand this resource.")
});
export type ResourceConstraint = z.infer<typeof ResourceConstraintSchema>;

const IdentifiedTradeOffSchema = z.object({
  primaryPositiveOutcome: z.string().describe("A primary intended positive outcome or goal of the assertion."),
  potentialNegativeConsequenceOrOpportunityCost: z.string().describe("A significant negative consequence, trade-off, or opportunity cost directly associated with achieving the positive outcome."),
  explanation: z.string().describe("Explanation of why this trade-off exists or how the negative consequence arises from pursuing the positive outcome.")
});
export type IdentifiedTradeOff = z.infer<typeof IdentifiedTradeOffSchema>;

export const TensionAnalysisInputSchema = z.object({
  assertionText: z.string().describe("The initial user assertion text."),
  systemModel: SystemModelSchema.describe("The system model (stocks with their qualitative states, agents, incentives, stock-to-stock flows) generated from the assertion.")
});
export type TensionAnalysisInput = z.infer<typeof TensionAnalysisInputSchema>;

export const TensionAnalysisOutputSchema = z.object({
  competingStakeholderResponses: z.array(CompetingStakeholderResponseSchema).describe("Analysis of how key agents might support or resist the assertion."),
  resourceConstraints: z.array(ResourceConstraintSchema).describe("Identification of key resource constraints and their potential impact."),
  identifiedTradeOffs: z.array(IdentifiedTradeOffSchema).describe("Explicitly identified trade-offs or negative consequences of pursuing the assertion's goals.")
});
export type TensionAnalysisOutput = z.infer<typeof TensionAnalysisOutputSchema>;

// AI Flow related types (TypeScript types, not Zod schemas here unless for inference)

// For reflectAssertion output used in page.tsx
export type AIReflectAssertionOutput = Omit<AIReflectAssertionOutputOriginal, 'keyConcepts' | 'systemModel'> & {
  systemModel: SystemModel; // Ensure this is our defined SystemModel TS type
  keyConcepts: StructuredConcept[]; // Ensure this is our defined StructuredConcept TS type
  initialSystemStatesSummary?: string;
};

// For inferInitialQualitativeStates flow
export const InferInitialQualitativeStateInputSchema = z.object({
    assertionText: z.string(),
    systemModel: SystemModelSchema, // Input is a Zod schema validated SystemModel
});
export type InferInitialQualitativeStateInput = z.infer<typeof InferInitialQualitativeStateInputSchema>;

export const InferInitialQualitativeStateOutputSchema = z.object({
    systemModelWithQualitativeStates: SystemModelSchema, // Output is also Zod schema validated
    initialStatesSummary: z.string().describe("A brief summary from the AI explaining the inferred initial qualitative states of the stocks.")
});
export type InferInitialQualitativeStateOutput = z.infer<typeof InferInitialQualitativeStateOutputSchema>;


// For generateImpactsByOrder flow (conceptually GeneratePhaseConsequences)
export type AIGenerateImpactsByOrderInput = {
  assertionText: string;
  targetPhase: '1' | '2' | '3';
  parentImpacts?: Impact[];
  currentSystemQualitativeStates: Record<string, string>;
  tensionAnalysis?: TensionAnalysisOutput;
  systemModel: SystemModel;
};


export const GeneratePhaseConsequencesOutputSchema = z.object({
    generatedImpacts: z.array(ImpactSchema),
    updatedSystemQualitativeStates: z.any().optional().describe("An object mapping changed stock names to their new qualitative states (e.g., {\"StockA\": \"Improved\", \"StockB\": \"Declining\"}). Omit this field entirely if NO stock states are changed by any impact generated in this call."),
    feedbackLoopInsights: z.array(z.string()).optional().describe("Brief descriptions of any feedback loops identified or significantly affected by these impacts.")
});
export type GeneratePhaseConsequencesOutput = z.infer<typeof GeneratePhaseConsequencesOutputSchema>;


export interface ImpactNode extends Impact, SimulationNodeDatum {
  order: 0 | 1 | 2 | 3; // Conceptually: 0 for core, 1 for Initial Phase, 2 for Transition, 3 for Stabilization
  nodeSystemType: 'CORE_ASSERTION' | 'GENERATED_IMPACT';
  properties: {
    fullAssertionText?: string;
    systemModel?: SystemModel; // This SystemModel should have stocks with up-to-date qualitativeStates
    keyConcepts?: StructuredConcept[];
    attributes?: string[];
    tensionAnalysis?: TensionAnalysisOutput;
    feedbackLoopInsights?: string[];
    initialSystemStatesSummary?: string; // Added here for CORE_ASSERTION node
    [key: string]: any;
  };
  originalColor?: string;
}

export interface ImpactLink extends SimulationLinkDatum<ImpactNode> {
  source: string | ImpactNode;
  target: string | ImpactNode;
}

export const NODE_COLORS: Record<number, string> = {
  0: 'hsl(var(--accent))',       // Core Assertion / Initial State
  1: 'hsl(var(--primary))',      // Phase 1 (Initial Consequences)
  2: 'hsl(120 60% 50%)', // Phase 2 (Transition)
  3: 'hsl(30 100% 50%)', // Phase 3 (Stabilization)
};

export const VALIDITY_OPTIONS: Array<{ value: 'high' | 'medium' | 'low'; label: string }> = [
  { value: 'high', label: 'High Plausibility' },
  { value: 'medium', label: 'Medium Plausibility' },
  { value: 'low', label: 'Low Plausibility' },
];

export enum ExplorerStep {
  INITIAL = 'initial',
  REFLECTION_PENDING = 'reflection_pending',
  REFLECTION_REVIEW = 'reflection_review',
  REVISING_SYSTEM_MODEL = 'revising_system_model',
  INFERRING_INITIAL_STATE = 'inferring_initial_state',
  INITIAL_STATE_REVIEW = 'initial_state_review', 
  TENSION_ANALYSIS_PENDING = 'tension_analysis_pending',
  TENSION_ANALYSIS_REVIEW = 'tension_analysis_review',
  ORDER_1_PENDING = 'order_1_pending', 
  ORDER_1_REVIEW = 'order_1_review',   
  ORDER_2_PENDING = 'order_2_pending', 
  ORDER_2_REVIEW = 'order_2_review',   
  ORDER_3_PENDING = 'order_3_pending', 
  ORDER_3_REVIEW = 'order_3_review',   
  GENERATING_SUMMARY = 'generating_summary',
  FINAL_REVIEW = 'final_review',
  CONSOLIDATION_PENDING = 'consolidation_pending',
}

export interface GoalOption {
  id: string;
  title: string;
  description: string;
  promptLabel: string;
  placeholder: string;
  icon?: React.ElementType;
}

// Specific types for SystemModelGraph
export interface SystemGraphNode extends SimulationNodeDatum {
  id: string; // Unique ID for D3 (e.g., "stock-Public Trust", "agent-Government")
  originalId: string; // The actual name of the stock/agent
  label: string;
  type: 'stock' | 'agent';
  description?: string;
  qualitativeState?: string; // For stocks
  baseColor: string;
}

export interface SystemGraphLink extends SimulationLinkDatum<SystemGraphNode> {
  source: string; // ID of source SystemGraphNode
  target: string; // ID of target SystemGraphNode
  label: string;  // incentiveDescription or flowDescription
  flow?: string;   // resultingFlow (for agent-stock) or drivingForce (for stock-stock)
  type: 'incentive' | 'stock-to-stock';
}

```