/**
 * @fileOverview User Cognitive Model Types for CascadeExplorer
 *
 * This module defines the type system for modeling user characteristics,
 * enabling adaptive bias compensation as required by Ashby's Law of
 * Requisite Variety.
 *
 * The core insight: The original system was built with a fixed "pessimistic"
 * stance to counter the creator's optimism. This works only for users with
 * similar cognitive profiles. For requisite variety, the system must:
 *
 * 1. DETECT user cognitive style from their inputs
 * 2. ADAPT outputs to provide appropriate counterbalance
 * 3. SURFACE the adaptation so users can understand/override
 *
 * We model several dimensions:
 * - Optimism/Pessimism: Tendency to see positive vs. negative outcomes
 * - Cognitive biases: Common thinking patterns that skew analysis
 * - Domain expertise: What the user knows well vs. poorly
 * - Role/relationship: How the user relates to the system being modeled
 * - Information preferences: How much detail, what kind of visualization
 *
 * The goal is NOT to "fix" users but to provide complementary perspectives
 * that enrich their thinking without imposing our own biases.
 */

import { z } from 'zod';
import type { KnowledgeDomain, AbstractionLevel } from './perspectival-model';

// =============================================================================
// COGNITIVE PROFILE DIMENSIONS
// =============================================================================

/**
 * Optimism-Pessimism spectrum.
 * Affects how the user naturally frames outcomes.
 */
export const OptimismPessimismSchema = z.object({
  /**
   * -1 = strongly pessimistic, 0 = neutral, 1 = strongly optimistic
   */
  score: z.number().min(-1).max(1),

  /**
   * Confidence in this assessment.
   */
  confidence: z.number().min(0).max(1),

  /**
   * Evidence from conversation that informed this score.
   */
  evidence: z.array(z.object({
    turnId: z.string(),
    quote: z.string(),
    interpretation: z.string(),
    weight: z.number().min(-1).max(1),
  })),

  /**
   * Whether the user seems aware of their tendency.
   */
  apparentSelfAwareness: z.enum(['unaware', 'somewhat_aware', 'aware', 'compensating']),
});
export type OptimismPessimism = z.infer<typeof OptimismPessimismSchema>;

/**
 * Common cognitive biases that affect systems thinking.
 */
export const CognitiveBiasSchema = z.object({
  biasType: z.enum([
    // Judgment biases
    'confirmation_bias',      // Seeking info that confirms existing beliefs
    'anchoring_bias',         // Over-relying on first piece of information
    'availability_heuristic', // Overweighting easily recalled examples
    'hindsight_bias',         // "I knew it all along" after outcomes
    'overconfidence',         // Excessive certainty in own judgments
    'planning_fallacy',       // Underestimating time/cost/risk

    // Attribution biases
    'fundamental_attribution', // Over-attributing to personality vs. situation
    'self_serving_bias',       // Attributing success to self, failure to others

    // Group/social biases
    'bandwagon_effect',       // Following the crowd
    'authority_bias',         // Over-trusting authority figures
    'in_group_bias',          // Favoring one's own group

    // Cognitive shortcuts
    'representativeness',     // Judging by similarity to prototype
    'status_quo_bias',        // Preference for current state
    'sunk_cost_fallacy',      // Continuing due to past investment

    // Systems thinking specific
    'linear_thinking',        // Missing feedback loops and delays
    'event_focus',            // Focusing on events vs. patterns/structures
    'boundary_blindness',     // Not seeing system boundaries
    'reductionism',           // Breaking down vs. seeing emergence
  ]),

  /**
   * Strength of this bias (detected).
   */
  strength: z.enum(['weak', 'moderate', 'strong']),

  /**
   * Confidence in this assessment.
   */
  confidence: z.number().min(0).max(1),

  /**
   * Evidence for this bias.
   */
  evidence: z.array(z.object({
    turnId: z.string(),
    indicator: z.string(),
  })),

  /**
   * How this bias might affect their analysis.
   */
  likelyEffects: z.array(z.string()),
});
export type CognitiveBias = z.infer<typeof CognitiveBiasSchema>;

/**
 * User's expertise profile.
 */
export const ExpertiseProfileSchema = z.object({
  /**
   * Domains where user has expertise.
   */
  expertDomains: z.array(z.object({
    domain: z.string(), // KnowledgeDomain enum value
    level: z.enum(['novice', 'competent', 'proficient', 'expert']),
    evidence: z.array(z.string()), // Turn IDs showing expertise
  })),

  /**
   * Domains where user lacks expertise.
   */
  blindspotDomains: z.array(z.object({
    domain: z.string(),
    indicators: z.array(z.string()),
  })),

  /**
   * Technical sophistication level.
   */
  technicalSophistication: z.enum(['low', 'medium', 'high']),

  /**
   * Systems thinking experience.
   */
  systemsThinkingExperience: z.enum(['novice', 'familiar', 'experienced', 'expert']),
});
export type ExpertiseProfile = z.infer<typeof ExpertiseProfileSchema>;

/**
 * User's role relative to the system being modeled.
 */
export const UserRoleSchema = z.object({
  /**
   * General role category.
   */
  roleCategory: z.enum([
    'decision_maker',   // Has authority to act
    'analyst',          // Studies but doesn't directly act
    'implementer',      // Will execute decisions
    'stakeholder',      // Affected by outcomes
    'observer',         // External interest
    'unknown',          // Not yet determined
  ]),

  /**
   * Relationship to the assertion/system.
   */
  relationshipToSystem: z.enum([
    'architect',        // Designing the system
    'operator',         // Running the system
    'user',             // Using the system
    'affected_party',   // Impacted by the system
    'regulator',        // Overseeing the system
    'external',         // Outside the system
    'unknown',
  ]),

  /**
   * What the user seems to want from this analysis.
   */
  apparentGoal: z.enum([
    'explore_consequences', // "What might happen if..."
    'validate_decision',    // "Is this a good idea?"
    'find_risks',           // "What could go wrong?"
    'find_opportunities',   // "What could go right?"
    'persuade_others',      // "Help me make my case"
    'understand_system',    // "Help me understand this"
    'plan_intervention',    // "How can I change this?"
    'unknown',
  ]),

  /**
   * Stakes the user has in the outcome.
   */
  perceivedStakes: z.enum(['low', 'medium', 'high', 'unknown']),
});
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * User's information preferences.
 */
export const InformationPreferencesSchema = z.object({
  /**
   * Preferred level of detail.
   */
  detailLevel: z.enum(['summary', 'moderate', 'comprehensive']),

  /**
   * Preferred abstraction level.
   */
  preferredAbstraction: z.enum(['strategic', 'tactical', 'operational', 'technical']),

  /**
   * Preference for visual vs. textual information.
   */
  visualVsTextual: z.enum(['highly_visual', 'balanced', 'text_preferred']),

  /**
   * Preference for certainty vs. exploration.
   */
  certaintyVsExploration: z.enum([
    'wants_definitive_answers',
    'tolerates_uncertainty',
    'embraces_exploration',
  ]),

  /**
   * Pace preference.
   */
  pace: z.enum(['quick', 'moderate', 'thorough']),
});
export type InformationPreferences = z.infer<typeof InformationPreferencesSchema>;

// =============================================================================
// COMPLETE USER COGNITIVE MODEL
// =============================================================================

/**
 * The complete user cognitive model.
 * This is learned through conversation and used for adaptation.
 */
export const UserCognitiveModelSchema = z.object({
  id: z.string().describe('Model identifier'),

  /**
   * Optimism/pessimism profile.
   */
  optimismPessimism: OptimismPessimismSchema,

  /**
   * Detected cognitive biases.
   */
  cognitiveBiases: z.array(CognitiveBiasSchema),

  /**
   * Expertise profile.
   */
  expertiseProfile: ExpertiseProfileSchema,

  /**
   * Role information.
   */
  userRole: UserRoleSchema,

  /**
   * Information preferences.
   */
  informationPreferences: InformationPreferencesSchema,

  /**
   * Overall confidence in this model.
   */
  modelConfidence: z.object({
    overall: z.number().min(0).max(1),
    turnsAnalyzed: z.number(),
    lastUpdated: z.string(),
  }),

  /**
   * Notes/observations that don't fit categories.
   */
  freeformObservations: z.array(z.object({
    observation: z.string(),
    turnId: z.string(),
    relevance: z.string(),
  })),
});
export type UserCognitiveModel = z.infer<typeof UserCognitiveModelSchema>;

// =============================================================================
// BIAS COMPENSATION STRATEGY
// =============================================================================

/**
 * Strategy for how to compensate for user biases.
 * Computed from the user model.
 */
export const BiasCompensationStrategySchema = z.object({
  /**
   * Balance of risk vs. opportunity emphasis.
   * -1 = heavy risk focus (for optimistic users)
   * +1 = heavy opportunity focus (for pessimistic users)
   */
  riskOpportunityBalance: z.number().min(-1).max(1),

  /**
   * How much to surface disconfirming evidence.
   * Higher = more actively challenge user's assumptions.
   */
  disconfirmationStrength: z.number().min(0).max(1),

  /**
   * How much to expand uncertainty ranges.
   * Higher = present wider confidence intervals.
   */
  uncertaintyAmplification: z.number().min(0).max(2),

  /**
   * Specific bias countermeasures.
   */
  biasCountermeasures: z.array(z.object({
    targetBias: z.string(),
    countermeasure: z.string(),
    applicationTrigger: z.string(),
  })),

  /**
   * Domains to especially highlight (where user has blindspots).
   */
  blindspotHighlighting: z.array(z.object({
    domain: z.string(),
    highlightStrength: z.enum(['subtle', 'moderate', 'prominent']),
    reason: z.string(),
  })),

  /**
   * Abstraction level adjustments.
   */
  abstractionAdjustment: z.object({
    direction: z.enum(['more_concrete', 'no_change', 'more_abstract']),
    reason: z.string(),
  }),

  /**
   * Explanation of the overall strategy.
   * This can be shown to users for transparency.
   */
  strategyExplanation: z.string(),

  /**
   * Whether user can see/adjust this strategy.
   */
  isTransparentToUser: z.boolean(),
});
export type BiasCompensationStrategy = z.infer<typeof BiasCompensationStrategySchema>;

// =============================================================================
// DEFAULT/INITIAL USER MODEL
// =============================================================================

/**
 * Default user model for when we have no information.
 * Conservative/neutral assumptions.
 */
export const DEFAULT_USER_MODEL: UserCognitiveModel = {
  id: 'default',

  optimismPessimism: {
    score: 0, // Assume neutral
    confidence: 0.2, // Low confidence
    evidence: [],
    apparentSelfAwareness: 'unaware',
  },

  cognitiveBiases: [],

  expertiseProfile: {
    expertDomains: [],
    blindspotDomains: [],
    technicalSophistication: 'medium',
    systemsThinkingExperience: 'familiar',
  },

  userRole: {
    roleCategory: 'unknown',
    relationshipToSystem: 'unknown',
    apparentGoal: 'unknown',
    perceivedStakes: 'unknown',
  },

  informationPreferences: {
    detailLevel: 'moderate',
    preferredAbstraction: 'tactical',
    visualVsTextual: 'balanced',
    certaintyVsExploration: 'tolerates_uncertainty',
    pace: 'moderate',
  },

  modelConfidence: {
    overall: 0.1,
    turnsAnalyzed: 0,
    lastUpdated: new Date().toISOString(),
  },

  freeformObservations: [],
};

/**
 * Default (neutral) bias compensation strategy.
 * Applied when we don't know enough about the user.
 */
export const DEFAULT_COMPENSATION_STRATEGY: BiasCompensationStrategy = {
  riskOpportunityBalance: 0, // Balanced
  disconfirmationStrength: 0.3, // Mild challenging
  uncertaintyAmplification: 1.0, // No amplification
  biasCountermeasures: [],
  blindspotHighlighting: [],
  abstractionAdjustment: {
    direction: 'no_change',
    reason: 'Default strategy - insufficient data about user',
  },
  strategyExplanation:
    'Using balanced approach - showing both risks and opportunities equally. ' +
    'As I learn more about your thinking style through our conversation, ' +
    'I\'ll adapt to provide more useful counterpoints.',
  isTransparentToUser: true,
};

// =============================================================================
// INFERENCE SIGNALS
// =============================================================================

/**
 * Signals that can be extracted from user messages to infer cognitive model.
 */
export const InferenceSignalSchema = z.object({
  signalType: z.enum([
    // Optimism/pessimism signals
    'positive_outcome_focus',
    'negative_outcome_focus',
    'best_case_assumption',
    'worst_case_assumption',
    'conditional_optimism',
    'conditional_pessimism',

    // Bias signals
    'confirmation_seeking',
    'anchoring_on_initial',
    'recent_event_weighting',
    'overconfidence_marker',
    'underestimation_marker',

    // Expertise signals
    'domain_jargon_use',
    'conceptual_simplification',
    'nuanced_distinction',
    'misconception_indicator',

    // Goal signals
    'validation_seeking',
    'exploration_seeking',
    'risk_focus_explicit',
    'opportunity_focus_explicit',

    // Preference signals
    'detail_request',
    'summary_request',
    'visual_preference',
    'textual_preference',
  ]),

  /**
   * The text that triggered this signal.
   */
  sourceText: z.string(),

  /**
   * Which user model dimension this updates.
   */
  affectsDimension: z.enum([
    'optimism_pessimism',
    'cognitive_biases',
    'expertise',
    'role',
    'preferences',
  ]),

  /**
   * How strong this signal is.
   */
  strength: z.enum(['weak', 'moderate', 'strong']),

  /**
   * Interpretation of what this signal means.
   */
  interpretation: z.string(),
});
export type InferenceSignal = z.infer<typeof InferenceSignalSchema>;
