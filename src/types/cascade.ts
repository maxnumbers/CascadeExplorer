import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { z } from 'zod'; // Changed from 'genkit'
// Import ReflectAssertionOutput type from its flow file, as it's not a shared schema object.
import type { ReflectAssertionOutput as AIReflectAssertionOutputOriginal } from '@/ai/flows/assertion-reflection';
// Import SuggestImpactConsolidationOutput type from its flow file.
import type { SuggestImpactConsolidationOutput as AISuggestImpactConsolidationOutputOriginal } from '@/ai/flows/suggest-impact-consolidation';

// Define Zod schemas here, so they are not exported from 'use server' files.

export const ImpactSchema = z.object({
  id: z.string().describe('Unique identifier for the impact.'),
  label: z.string().describe('Short label for the impact (2-3 lines max).'),
  description: z.string().describe('Detailed description of the impact.'),
  validity: z.enum(['high', 'medium', 'low']).describe('Validity assessment (high/medium/low).'),
  reasoning: z.string().describe('Reasoning for validity assessment.'),
});
export type Impact = z.infer<typeof ImpactSchema>;

export const ImpactMappingOutputSchema = z.object({
  firstOrder: z.array(ImpactSchema).describe('Immediate/direct impacts.'),
  secondOrder: z.array(ImpactSchema).describe('Downstream effects.'),
  thirdOrder: z.array(ImpactSchema).describe('Societal shifts.'),
});
export type ImpactMappingOutput = z.infer<typeof ImpactMappingOutputSchema>;


// Re-export AI types for easier access if needed elsewhere
export type AIImpactMappingOutput = ImpactMappingOutput; // Now derived from local Zod schema
export type AIReflectAssertionOutput = AIReflectAssertionOutputOriginal;
export type AISuggestImpactConsolidationOutput = AISuggestImpactConsolidationOutputOriginal;


export interface ImpactNode extends Impact, SimulationNodeDatum {
  order: 0 | 1 | 2 | 3; // 0 for core assertion
  type: 'assertion' | 'impact';
  originalColor?: string; // Store original color for hover effects if any
}

export interface ImpactLink extends SimulationLinkDatum<ImpactNode> {
  source: string | ImpactNode; // D3 can handle string IDs or node objects
  target: string | ImpactNode; // D3 can handle string IDs or node objects
}

export const NODE_COLORS: Record<number, string> = {
  0: 'hsl(var(--accent))', // Soft Purple for core assertion
  1: 'hsl(var(--primary))', // Electric Blue for 1st order
  2: 'hsl(120 60% 50%)',    // Green for 2nd order (e.g. #4CAF50)
  3: 'hsl(30 100% 50%)',   // Orange for 3rd order (e.g. #FF9800)
};

export const VALIDITY_OPTIONS: Array<{ value: 'high' | 'medium' | 'low'; label: string }> = [
  { value: 'high', label: 'High Validity' },
  { value: 'medium', label: 'Medium Validity' },
  { value: 'low', label: 'Low Validity' },
];
