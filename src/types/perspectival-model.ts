/**
 * @fileOverview Perspectival Model Types for CascadeExplorer
 *
 * This module defines the type system for the perspectival heterograph model,
 * which allows the same underlying system to be viewed through different
 * ontological lenses. Key concepts:
 *
 * 1. ONTOLOGICAL MODULARITY: What appears as an atomic concept from one
 *    perspective may decompose into a subgraph from another perspective.
 *    Example: "Software" (executive view) → {Frontend, Backend, Database} (engineer view)
 *
 * 2. HYPEREDGES: Concerns/themes that connect multiple concepts simultaneously,
 *    not just pairwise relationships. Example: "System Reliability" connects
 *    Engineer, Infrastructure, User Satisfaction, and Budget all at once.
 *
 * 3. PERSPECTIVE-DEPENDENT VISIBILITY: Different observers see different
 *    subsets of the graph based on their expertise, role, and abstraction level.
 *
 * 4. ADAPTIVE BIAS COMPENSATION: The system learns about the user's cognitive
 *    style and adapts its outputs to provide appropriate counterbalance.
 *
 * Theoretical foundations:
 * - Ashby's Law of Requisite Variety
 * - Pask's Conversation Theory
 * - von Foerster's Second-Order Cybernetics
 * - Beer's Viable System Model
 */

import { z } from 'zod';

// =============================================================================
// DOMAIN & EXPERTISE TAXONOMY
// =============================================================================

/**
 * Knowledge domains that concepts and perspectives can belong to.
 * This enables filtering by what different observers understand.
 */
export const KnowledgeDomainSchema = z.enum([
  'technical',      // Engineering, software, infrastructure
  'business',       // Strategy, operations, finance
  'legal',          // Compliance, regulations, contracts
  'social',         // Human behavior, culture, relationships
  'environmental',  // Ecology, sustainability, resources
  'political',      // Governance, policy, power structures
  'economic',       // Markets, trade, value exchange
  'psychological',  // Cognition, motivation, behavior
  'organizational', // Structure, processes, management
  'temporal',       // Time-based concerns, scheduling, delays
]);
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

/**
 * Abstraction levels for perspectives and concepts.
 * Different stakeholders operate at different levels.
 */
export const AbstractionLevelSchema = z.enum([
  'strategic',    // Long-term, organization-wide, goal-setting
  'tactical',     // Medium-term, department-level, planning
  'operational',  // Short-term, team-level, execution
  'technical',    // Implementation details, code-level
]);
export type AbstractionLevel = z.infer<typeof AbstractionLevelSchema>;

// =============================================================================
// SYSTEM CONCEPTS (Nodes in the Heterograph)
// =============================================================================

/**
 * A SystemConcept is the fundamental building block of the perspectival model.
 * Unlike the original "stock" or "agent" types, a SystemConcept:
 * - Can be atomic or composite (depending on who's looking)
 * - Has domain associations (who understands it)
 * - Has perspective-dependent visibility and decomposition
 */
export const SystemConceptSchema = z.object({
  id: z.string().describe('Unique identifier for this concept'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('Detailed description of what this concept represents'),

  /**
   * The semantic type of this concept.
   * Unlike the fixed stock/agent dichotomy, this is more flexible.
   */
  conceptType: z.enum([
    'resource',       // Something that accumulates (like a stock)
    'actor',          // Something that takes action (like an agent)
    'artifact',       // Something created (code, document, product)
    'process',        // An ongoing activity or flow
    'constraint',     // A limiting factor
    'goal',           // A desired state
    'risk',           // A potential negative outcome
    'opportunity',    // A potential positive outcome
    'metric',         // Something measurable
    'capability',     // An ability to do something
  ]).describe('Semantic type of the concept'),

  /**
   * Which knowledge domains this concept belongs to.
   * A concept like "Technical Debt" might be in both 'technical' and 'business'.
   */
  domains: z.array(KnowledgeDomainSchema).describe('Knowledge domains this concept touches'),

  /**
   * The abstraction level this concept naturally lives at.
   * "Revenue Growth" is strategic; "Database Query Optimization" is technical.
   */
  abstractionLevel: AbstractionLevelSchema.describe('Natural abstraction level of this concept'),

  /**
   * ONTOLOGICAL MODULARITY: Composition rules.
   * This is the key innovation - the same concept can decompose differently
   * depending on who is looking at it.
   *
   * Example:
   * - From Executive perspective: "Software" is atomic
   * - From Engineer perspective: "Software" → [Frontend, Backend, Database]
   * - From DevOps perspective: "Software" → [Code, Infrastructure, Config]
   */
  compositions: z.array(z.object({
    perspectiveId: z.string().describe('Which perspective sees this decomposition'),
    subConceptIds: z.array(z.string()).describe('The child concepts in this decomposition'),
    decompositionRationale: z.string().describe('Why this perspective decomposes this way'),
  })).optional().describe('How this concept decomposes from different perspectives'),

  /**
   * Which perspectives can "see" this concept at all.
   * If empty, visible to all perspectives.
   */
  visibleToPerspectives: z.array(z.string()).optional().describe('Perspectives that can see this concept'),

  /**
   * Concepts that must exist for this concept to be meaningful.
   * Used for maintaining coherence when switching perspectives.
   */
  dependsOn: z.array(z.string()).optional().describe('Other concepts this depends on'),

  /**
   * Optional quantification for concepts that are measurable.
   */
  quantification: z.object({
    currentValue: z.number().optional(),
    unit: z.string().optional(),
    direction: z.enum(['increasing', 'decreasing', 'stable', 'unknown']).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional().describe('Quantitative attributes if measurable'),
});
export type SystemConcept = z.infer<typeof SystemConceptSchema>;

// =============================================================================
// PERSPECTIVES (Observers of the System)
// =============================================================================

/**
 * A Perspective represents an observer's viewpoint on the system.
 * Different perspectives:
 * - See different concepts (visibility filtering)
 * - See different decompositions (ontological modularity)
 * - Have different concerns and priorities
 * - Operate at different abstraction levels
 */
export const PerspectiveSchema = z.object({
  id: z.string().describe('Unique identifier for this perspective'),
  name: z.string().describe('Human-readable name (e.g., "Executive", "Engineer")'),
  description: z.string().describe('What this perspective represents'),

  /**
   * Archetype: A general category this perspective falls into.
   * Helps with generating appropriate viewpoints.
   */
  archetype: z.enum([
    'decision_maker',   // Strategic authority, makes key choices
    'implementer',      // Technical execution, builds things
    'operator',         // Day-to-day running, maintains things
    'beneficiary',      // Receives value from the system
    'regulator',        // External oversight, enforces rules
    'competitor',       // External opposition, competing goals
    'partner',          // External collaboration, aligned goals
    'observer',         // Analytical, monitors but doesn't act
  ]).describe('General archetype of this perspective'),

  /**
   * Which knowledge domains this perspective has expertise in.
   * Determines what concepts they can meaningfully engage with.
   */
  expertiseDomains: z.array(KnowledgeDomainSchema).describe('Domains this perspective understands'),

  /**
   * Primary concerns this perspective prioritizes.
   * Used for filtering and highlighting relevant impacts.
   */
  concerns: z.array(z.string()).describe('Key concerns/priorities of this perspective'),

  /**
   * How this perspective relates to the system being modeled.
   */
  systemRelationship: z.enum([
    'internal',   // Part of the system
    'external',   // Outside the system boundary
    'boundary',   // At the interface (e.g., customer-facing)
    'meta',       // Observing the observation (e.g., auditor)
  ]).describe('Relationship to the system boundary'),

  /**
   * Preferred abstraction level for this perspective.
   */
  preferredAbstraction: AbstractionLevelSchema.describe('Typical abstraction level'),

  /**
   * Known biases or blindspots of this perspective.
   * Used for surfacing potential oversights.
   */
  knownBiases: z.array(z.object({
    type: z.string().describe('Type of bias'),
    description: z.string().describe('How this bias manifests'),
    blindspots: z.array(z.string()).describe('What this perspective tends to miss'),
  })).optional().describe('Known cognitive biases of this perspective'),

  /**
   * Information typically available to this perspective.
   * Helps model information asymmetry.
   */
  informationAccess: z.array(z.object({
    domain: KnowledgeDomainSchema,
    accessLevel: z.enum(['full', 'partial', 'none', 'delayed']),
  })).optional().describe('What information this perspective has access to'),
});
export type Perspective = z.infer<typeof PerspectiveSchema>;

// =============================================================================
// RELATIONSHIPS (Edges in the Heterograph)
// =============================================================================

/**
 * Standard edge between two concepts.
 * Unlike the original incentives, these relationships:
 * - Are perspective-dependent (some relationships are only visible to some observers)
 * - Have semantic types beyond just "incentive"
 * - Can have temporal characteristics (delays, cycles)
 */
export const ConceptRelationshipSchema = z.object({
  id: z.string().describe('Unique identifier'),
  sourceId: z.string().describe('Source concept ID'),
  targetId: z.string().describe('Target concept ID'),

  relationshipType: z.enum([
    'influences',       // Source affects target (general causation)
    'enables',          // Source makes target possible
    'constrains',       // Source limits target
    'competes_with',    // Source and target vie for same resources
    'depends_on',       // Source requires target
    'produces',         // Source creates target
    'consumes',         // Source uses up target
    'regulates',        // Source controls target
    'monitors',         // Source observes target
    'amplifies',        // Source strengthens target
    'dampens',          // Source weakens target
  ]).describe('Semantic type of relationship'),

  strength: z.enum(['strong', 'moderate', 'weak']).describe('Relationship strength'),

  /**
   * Polarity: Does this relationship increase or decrease the target?
   */
  polarity: z.enum(['positive', 'negative', 'variable']).describe('Effect direction'),

  description: z.string().describe('Human-readable description of the relationship'),

  /**
   * Which perspectives can see this relationship.
   * If empty, visible to all.
   */
  visibleToPerspectives: z.array(z.string()).optional(),

  /**
   * Temporal characteristics for dynamic modeling.
   */
  temporalProperties: z.object({
    delay: z.number().optional().describe('Time delay before effect manifests'),
    delayUnit: z.enum(['hours', 'days', 'weeks', 'months', 'years']).optional(),
    isImmediate: z.boolean().optional(),
    hasFeedback: z.boolean().optional().describe('Does this relationship loop back?'),
  }).optional(),

  /**
   * Confidence in this relationship existing/being correct.
   */
  confidence: z.object({
    level: z.number().min(0).max(1),
    basis: z.enum(['empirical', 'theoretical', 'analogical', 'speculative']),
    evidenceIds: z.array(z.string()).optional(),
  }).optional(),
});
export type ConceptRelationship = z.infer<typeof ConceptRelationshipSchema>;

// =============================================================================
// CONCERN HYPEREDGES
// =============================================================================

/**
 * A ConcernHyperedge represents a shared concern that connects multiple concepts.
 * Unlike binary edges, a hyperedge captures n-ary relationships.
 *
 * Example: "System Reliability" concerns:
 * - Engineer (responsible for it)
 * - Infrastructure (embodies it)
 * - Budget (constrains resources for it)
 * - User Satisfaction (depends on it)
 * - Reputation (affected by it)
 *
 * Different perspectives weight this concern differently.
 */
export const ConcernHyperedgeSchema = z.object({
  id: z.string().describe('Unique identifier'),
  concernName: z.string().describe('Name of the shared concern'),
  description: z.string().describe('What this concern represents'),

  /**
   * All concepts touched by this concern.
   */
  connectedConceptIds: z.array(z.string()).describe('Concepts involved in this concern'),

  /**
   * How each concept relates to this concern.
   */
  conceptRoles: z.array(z.object({
    conceptId: z.string(),
    role: z.enum([
      'responsible_for',  // Has duty to address this concern
      'affected_by',      // Impacted by this concern
      'contributes_to',   // Influences this concern
      'constrains',       // Limits options for this concern
      'measures',         // Quantifies this concern
      'observes',         // Monitors this concern
    ]),
  })).describe('How each concept relates to the concern'),

  /**
   * How different perspectives weight this concern.
   */
  perspectiveWeights: z.array(z.object({
    perspectiveId: z.string(),
    weight: z.enum(['critical', 'important', 'minor', 'invisible']),
    reasoning: z.string().describe('Why this perspective weights it this way'),
  })).describe('Importance of concern to different perspectives'),

  /**
   * Domain this concern primarily belongs to.
   */
  primaryDomain: KnowledgeDomainSchema,

  /**
   * Potential conflicts this concern creates between concepts.
   */
  tensions: z.array(z.object({
    conceptIds: z.array(z.string()).length(2),
    tensionDescription: z.string(),
  })).optional().describe('Conflicts between concepts around this concern'),
});
export type ConcernHyperedge = z.infer<typeof ConcernHyperedgeSchema>;

// =============================================================================
// FEEDBACK LOOPS
// =============================================================================

/**
 * Explicit representation of feedback loops in the system.
 * These are cycles in the relationship graph that create
 * reinforcing (positive feedback) or balancing (negative feedback) dynamics.
 */
export const FeedbackLoopSchema = z.object({
  id: z.string().describe('Unique identifier'),
  name: z.string().describe('Name for this loop'),

  /**
   * The concepts in the loop, in order.
   * Last concept connects back to first.
   */
  conceptIds: z.array(z.string()).min(2).describe('Ordered concepts in the loop'),

  /**
   * The relationship IDs that form the loop.
   */
  relationshipIds: z.array(z.string()).describe('Relationships that form this loop'),

  loopType: z.enum([
    'reinforcing',  // Positive feedback - growth or decline accelerates
    'balancing',    // Negative feedback - tends toward equilibrium
    'complex',      // Contains both types (multi-loop structure)
  ]).describe('Type of feedback loop'),

  description: z.string().describe('What this loop represents and how it behaves'),

  /**
   * Example narrative of how this loop plays out.
   */
  narrativeExample: z.string().optional().describe('Story illustrating the loop dynamics'),

  /**
   * Current state of the loop.
   */
  currentState: z.enum([
    'dormant',      // Loop exists but not active
    'activating',   // Loop beginning to engage
    'active',       // Loop fully engaged
    'saturating',   // Loop hitting limits
    'stabilizing',  // Loop approaching equilibrium
  ]).optional(),

  /**
   * Time scale of this loop.
   */
  timeScale: z.object({
    minimum: z.number(),
    maximum: z.number(),
    unit: z.enum(['hours', 'days', 'weeks', 'months', 'years']),
  }).optional(),
});
export type FeedbackLoop = z.infer<typeof FeedbackLoopSchema>;

// =============================================================================
// PERSPECTIVE CONFLICT
// =============================================================================

/**
 * Represents a conflict between how different perspectives see the system.
 * These are crucial for surfacing blind spots and facilitating dialogue.
 */
export const PerspectiveConflictSchema = z.object({
  id: z.string().describe('Unique identifier'),

  perspectiveIds: z.array(z.string()).min(2).describe('Perspectives in conflict'),

  conflictType: z.enum([
    'ontological',      // See different structures (decomposition mismatch)
    'causal',           // See different cause-effect relationships
    'priority',         // Prioritize different concerns
    'boundary',         // Draw system boundaries differently
    'temporal',         // Operate on different time horizons
    'informational',    // Have different information
  ]).describe('Type of conflict'),

  description: z.string().describe('What the conflict is about'),

  /**
   * The specific point of disagreement.
   */
  disagreementPoint: z.object({
    conceptIds: z.array(z.string()).optional(),
    relationshipIds: z.array(z.string()).optional(),
    concernIds: z.array(z.string()).optional(),
  }).describe('What specifically is in dispute'),

  /**
   * Each perspective's view on the disputed point.
   */
  perspectiveViews: z.array(z.object({
    perspectiveId: z.string(),
    view: z.string(),
    reasoning: z.string(),
  })).describe('How each perspective sees the disputed point'),

  /**
   * Potential resolution approaches.
   */
  resolutionApproaches: z.array(z.object({
    approach: z.string(),
    tradeoffs: z.string(),
    favorsPerspectives: z.array(z.string()),
  })).optional(),
});
export type PerspectiveConflict = z.infer<typeof PerspectiveConflictSchema>;

// =============================================================================
// THE FULL PERSPECTIVAL SYSTEM MODEL
// =============================================================================

/**
 * The complete perspectival system model.
 * This is the top-level structure that contains everything.
 */
export const PerspectivalSystemModelSchema = z.object({
  id: z.string().describe('Model identifier'),
  name: z.string().describe('Name of this model'),
  description: z.string().describe('What system this model represents'),

  /**
   * The original assertion/idea that seeded this model.
   */
  seedAssertion: z.object({
    text: z.string(),
    summary: z.string(),
    timestamp: z.string(),
  }).describe('The original input that created this model'),

  /**
   * All concepts in the model.
   */
  concepts: z.array(SystemConceptSchema),

  /**
   * All perspectives that can view this model.
   */
  perspectives: z.array(PerspectiveSchema),

  /**
   * All binary relationships between concepts.
   */
  relationships: z.array(ConceptRelationshipSchema),

  /**
   * All concern hyperedges.
   */
  concerns: z.array(ConcernHyperedgeSchema),

  /**
   * All identified feedback loops.
   */
  feedbackLoops: z.array(FeedbackLoopSchema).optional(),

  /**
   * Conflicts between perspectives.
   */
  perspectiveConflicts: z.array(PerspectiveConflictSchema).optional(),

  /**
   * Metadata about the model.
   */
  metadata: z.object({
    createdAt: z.string(),
    lastModifiedAt: z.string(),
    version: z.number(),
    confidence: z.number().min(0).max(1),
    completeness: z.enum(['sketch', 'partial', 'substantial', 'comprehensive']),
  }),
});
export type PerspectivalSystemModel = z.infer<typeof PerspectivalSystemModelSchema>;

// =============================================================================
// UTILITY TYPES FOR VIEWS
// =============================================================================

/**
 * A filtered view of the model from a specific perspective.
 * Generated by filtering the full model through a perspective's lens.
 */
export interface PerspectiveFilteredView {
  perspectiveId: string;
  perspectiveName: string;

  // Concepts visible from this perspective (with appropriate decomposition)
  visibleConcepts: SystemConcept[];

  // Relationships visible from this perspective
  visibleRelationships: ConceptRelationship[];

  // Concerns weighted by this perspective
  relevantConcerns: Array<ConcernHyperedge & { weight: 'critical' | 'important' | 'minor' }>;

  // What this perspective can't see (for surfacing blindspots)
  hiddenConcepts: Array<{ id: string; name: string; reason: string }>;
  hiddenRelationships: Array<{ id: string; reason: string }>;

  // Conflicts this perspective is involved in
  conflicts: PerspectiveConflict[];
}

/**
 * Configuration for generating a perspective-filtered view.
 */
export interface ViewGenerationConfig {
  perspectiveId: string;

  // Whether to show concepts outside this perspective's expertise (dimmed)
  showOutOfExpertise: boolean;

  // Whether to show conflicts involving this perspective
  surfaceConflicts: boolean;

  // Abstraction level to render at (may differ from perspective default)
  renderAbstraction: AbstractionLevel;

  // Whether to include temporal information
  includeTemporalProperties: boolean;
}
