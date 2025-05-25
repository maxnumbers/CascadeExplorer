
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { z } from 'zod';
// Import ReflectAssertionOutput type from its flow file
import type { ReflectAssertionOutput as AIReflectAssertionOutputOriginal } from '@/ai/flows/assertion-reflection';
// Import SuggestImpactConsolidationOutput type from its flow file
import type { SuggestImpactConsolidationOutput as AISuggestImpactConsolidationOutputOriginal } from '@/ai/flows/suggest-impact-consolidation';
// Import types for the new generateImpactsByOrder flow
import type { GenerateImpactsByOrderInput as AIGenerateImpactsByOrderInputOriginal, GenerateImpactsByOrderOutput as AIGenerateImpactsByOrderOutputOriginal } from '@/ai/flows/generate-impacts-by-order';


export const ImpactSchema = z.object({
  id: z.string().describe('Unique identifier for the impact.'),
  label: z.string().describe('Short label for the impact (2-3 lines max).'),
  description: z.string().describe('Detailed description of the impact.'),
  validity: z.enum(['high', 'medium', 'low']).describe('Validity assessment (high/medium/low).'),
  reasoning: z.string().describe('Reasoning for validity assessment.'),
});
export type Impact = z.infer<typeof ImpactSchema>;

// This schema is still needed for the input of suggestImpactConsolidation flow
export const ImpactMappingInputForConsolidationSchema = z.object({
  firstOrder: z.array(ImpactSchema).describe('Immediate/direct impacts.'),
  secondOrder: z.array(ImpactSchema).describe('Downstream effects.'),
  thirdOrder: z.array(ImpactSchema).describe('Societal shifts.'),
});
export type ImpactMappingInputForConsolidation = z.infer<typeof ImpactMappingInputForConsolidationSchema>;


// Re-export AI types for easier access if needed elsewhere
export type AIReflectAssertionOutput = AIReflectAssertionOutputOriginal;
export type AISuggestImpactConsolidationOutput = AISuggestImpactConsolidationOutputOriginal;
export type AIGenerateImpactsByOrderInput = AIGenerateImpactsByOrderInputOriginal;
export type AIGenerateImpactsByOrderOutput = AIGenerateImpactsByOrderOutputOriginal;


export interface ImpactNode extends Impact, SimulationNodeDatum {
  order: 0 | 1 | 2 | 3; // 0 for core assertion
  type: 'assertion' | 'impact';
  originalColor?: string; 
}

export interface ImpactLink extends SimulationLinkDatum<ImpactNode> {
  source: string | ImpactNode; 
  target: string | ImpactNode; 
}

export const NODE_COLORS: Record<number, string> = {
  0: 'hsl(var(--accent))', 
  1: 'hsl(var(--primary))', 
  2: 'hsl(120 60% 50%)',    
  3: 'hsl(30 100% 50%)',   
};

export const VALIDITY_OPTIONS: Array<{ value: 'high' | 'medium' | 'low'; label: string }> = [
  { value: 'high', label: 'High Validity' },
  { value: 'medium', label: 'Medium Validity' },
  { value: 'low', label: 'Low Validity' },
];

// Enum for UI steps to manage the flow
export enum ExplorerStep {
  INITIAL = 'initial', // Before any assertion
  REFLECTION_INPUT = 'reflection_input', // User entered assertion, awaiting reflection
  REFLECTION_PENDING = 'reflection_pending', // AI reflecting
  REFLECTION_REVIEW = 'reflection_review', // User reviewing AI reflection
  ORDER_1_PENDING = 'order_1_pending', // AI generating 1st order
  ORDER_1_REVIEW = 'order_1_review', // User reviewing 1st order impacts (can consolidate)
  ORDER_2_PENDING = 'order_2_pending', // AI generating 2nd order
  ORDER_2_REVIEW = 'order_2_review', // User reviewing 2nd order impacts (can consolidate)
  ORDER_3_PENDING = 'order_3_pending', // AI generating 3rd order
  ORDER_3_REVIEW = 'order_3_review', // User reviewing 3rd order impacts (can consolidate)
  FINAL_REVIEW = 'final_review', // All orders generated, final review & consolidation
  CONSOLIDATION_PENDING = 'consolidation_pending', // AI suggesting consolidations
}
