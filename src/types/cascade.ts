import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import type { ImpactMappingOutput as AIImpactMappingOutput, ReflectAssertionOutput as AIReflectAssertionOutput } from '@/ai/flows/impact-mapping';

// Re-export AI types for easier access if needed elsewhere
export type { AIImpactMappingOutput, AIReflectAssertionOutput };

export interface Impact {
  id: string;
  label: string;
  description: string;
  validity: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ImpactNode extends Impact, SimulationNodeDatum {
  order: 0 | 1 | 2 | 3; // 0 for core assertion
  type: 'assertion' | 'impact';
  originalColor?: string; // Store original color for hover effects if any
}

export interface ImpactLink extends SimulationLinkDatum<ImpactNode> {
  source: string | ImpactNode; // D3 can handle string IDs or node objects
  target: string | ImpactNode; // D3 can handle string IDs or node objects
}

export type ImpactData = AIImpactMappingOutput;

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
