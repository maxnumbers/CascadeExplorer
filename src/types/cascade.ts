
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { z } from 'zod';
// Import ReflectAssertionOutput type from its flow file
import type { ReflectAssertionOutput as AIReflectAssertionOutputOriginal } from '@/ai/flows/assertion-reflection';
// Import types for the new generateImpactsByOrder flow
import type { GenerateImpactsByOrderInput as AIGenerateImpactsByOrderInputOriginal, GenerateImpactsByOrderOutput as AIGenerateImpactsByOrderOutputOriginal } from '@/ai/flows/generate-impacts-by-order';


export const StructuredConceptSchema = z.object({
  name: z.string().describe("The name of the key concept or entity."),
  type: z.string().optional().describe("An optional type for the concept (e.g., 'Technology', 'Social Trend', 'Organization', 'Location', 'Person').")
});
export type StructuredConcept = z.infer<typeof StructuredConceptSchema>;

export const ImpactSchema = z.object({
  id: z.string().describe('Unique identifier for the impact.'),
  label: z.string().describe('Short label for the impact (2-3 lines max).'),
  description: z.string().describe('Detailed description of the impact.'),
  validity: z.enum(['high', 'medium', 'low']).describe('Validity assessment (high/medium/low).'),
  reasoning: z.string().describe('Reasoning for validity assessment.'),
  parentId: z.string().optional().describe('The ID of the parent impact from the previous order, if applicable and generating for order > 1.'),
  keyConcepts: z.array(StructuredConceptSchema).optional().describe('A list of structured key concepts (name, type) central to this specific impact.'),
  attributes: z.array(z.string()).optional().describe('A list of key attributes or defining characteristics of this specific impact.'),
});
export type Impact = z.infer<typeof ImpactSchema>;

// Schema for the input to the consolidation flow (all impacts grouped by order)
export const ImpactMappingInputForConsolidationSchema = z.object({
  firstOrder: z.array(ImpactSchema).describe('Immediate/direct impacts of order 1.'),
  secondOrder: z.array(ImpactSchema).describe('Downstream effects of order 2.'),
  thirdOrder: z.array(ImpactSchema).describe('Societal shifts of order 3.'),
});
export type ImpactMappingInputForConsolidation = z.infer<typeof ImpactMappingInputForConsolidationSchema>;


// Schema for the input of the cascade summary generation AI flow
export const CascadeSummaryInputSchema = z.object({
    initialAssertion: z.object({
        summary: z.string().describe("The AI's concise summary/title of the user's initial assertion."),
        fullText: z.string().describe("The user's original full assertion text."),
    }).describe("The starting point of the cascade."),
    firstOrderImpacts: z.array(ImpactSchema).optional().describe("List of first-order impacts."),
    secondOrderImpacts: z.array(ImpactSchema).optional().describe("List of second-order impacts, with parentId linking to first-order."),
    thirdOrderImpacts: z.array(ImpactSchema).optional().describe("List of third-order impacts, with parentId linking to second-order."),
});
export type CascadeSummaryInput = z.infer<typeof CascadeSummaryInputSchema>;

// Schema for the output of the cascade summary generation AI flow
export const CascadeSummaryOutputSchema = z.object({
  narrativeSummary: z.string().describe("A cohesive narrative summary explaining the logical progression from the initial assertion through its cascading impacts."),
});
export type CascadeSummaryOutput = z.infer<typeof CascadeSummaryOutputSchema>;


// Re-export AI types for easier access if needed elsewhere
export type AIReflectAssertionOutput = Omit<AIReflectAssertionOutputOriginal, 'keyConcepts'> & {
  keyConcepts: StructuredConcept[];
};

export type AIGenerateImpactsByOrderInput = AIGenerateImpactsByOrderInputOriginal;
export type AIGenerateImpactsByOrderOutput = AIGenerateImpactsByOrderOutputOriginal;


export interface ImpactNode extends Impact, SimulationNodeDatum {
  order: 0 | 1 | 2 | 3; // 0 for core assertion
  nodeSystemType: 'CORE_ASSERTION' | 'GENERATED_IMPACT';
  // Properties store data that might not be on ImpactSchema directly or is specific to UI/type (like fullAssertionText)
  properties?: {
    fullAssertionText?: string;
    coreComponents?: string[];
    // keyConcepts and attributes from Impact will also be often mirrored here for CORE_ASSERTION or if dynamically added
    keyConcepts?: StructuredConcept[]; 
    attributes?: string[];
    [key: string]: any; 
  };
  originalColor?: string;
}

export interface ImpactLink extends SimulationLinkDatum<ImpactNode> {
  source: string | ImpactNode;
  target: string | ImpactNode;
}

export const NODE_COLORS: Record<number, string> = {
  0: 'hsl(var(--accent))',       // Core Assertion - Soft Purple
  1: 'hsl(var(--primary))',      // 1st Order - Electric Blue
  2: 'hsl(120 60% 50%)', // 2nd Order - Green
  3: 'hsl(30 100% 50%)', // 3rd Order - Orange
};

export const VALIDITY_OPTIONS: Array<{ value: 'high' | 'medium' | 'low'; label: string }> = [
  { value: 'high', label: 'High Validity' },
  { value: 'medium', label: 'Medium Validity' },
  { value: 'low', label: 'Low Validity' },
];

export enum ExplorerStep {
  INITIAL = 'initial',
  REFLECTION_PENDING = 'reflection_pending',
  REFLECTION_REVIEW = 'reflection_review',
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
