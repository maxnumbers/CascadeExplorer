/**
 * @fileOverview Conversation Types for CascadeExplorer
 *
 * This module defines the type system for conversational interaction,
 * implementing principles from Gordon Pask's Conversation Theory.
 *
 * Key concepts from Conversation Theory:
 * 1. TEACHBACK: After receiving information, the learner must demonstrate
 *    understanding by "teaching back" to the teacher. This ensures genuine
 *    comprehension rather than surface agreement.
 *
 * 2. ENTAILMENT MESH: Understanding is not linear but a mesh of interconnected
 *    concepts where each concept is explained by (entailed by) others.
 *
 * 3. AGREEMENT OVER UNDERSTANDING: The conversation continues until both
 *    parties agree they have the same understanding. Not just "do you get it?"
 *    but "do we both see the same thing?"
 *
 * 4. CONVERSATION FOR ACTION: Dialogue isn't just exchange of information;
 *    it's the coordination of action through mutual understanding.
 *
 * Applied to CascadeExplorer:
 * - User presents nucleus idea
 * - AI proposes understanding
 * - User can challenge, refine, or agree
 * - Model evolves through dialogue
 * - Both parties track what's been agreed vs. what's still open
 */

import { z } from 'zod';
import type { PerspectivalSystemModel, SystemConcept, ConceptRelationship, Perspective, ConcernHyperedge } from './perspectival-model';

// =============================================================================
// CONVERSATION TURN TYPES
// =============================================================================

/**
 * Types of conversational moves.
 * Each type represents a different kind of speech act.
 */
export const ConversationMoveTypeSchema = z.enum([
  // User moves
  'assertion',        // User states something to be explored
  'question',         // User asks for clarification/information
  'challenge',        // User disputes AI's interpretation
  'refinement',       // User adjusts AI's interpretation
  'agreement',        // User confirms AI's interpretation
  'rejection',        // User rejects AI's interpretation entirely
  'elaboration',      // User adds more detail to their assertion
  'priority_shift',   // User indicates different priority/focus
  'perspective_request', // User asks to see from different perspective

  // AI moves
  'reflection',       // AI shows its understanding back
  'clarification_request', // AI asks user to clarify
  'proposal',         // AI proposes additions to the model
  'explanation',      // AI explains reasoning/causal chain
  'alternative',      // AI offers alternative interpretation
  'synthesis',        // AI combines multiple ideas
  'conflict_surface', // AI surfaces a conflict between perspectives
  'grounding_offer',  // AI offers evidence for a claim
  'teachback_request', // AI asks user to confirm understanding
]);
export type ConversationMoveType = z.infer<typeof ConversationMoveTypeSchema>;

/**
 * A single turn in the conversation.
 */
export const ConversationTurnSchema = z.object({
  id: z.string().describe('Unique turn identifier'),
  timestamp: z.string().describe('When this turn occurred'),

  actor: z.enum(['user', 'ai']).describe('Who made this move'),

  moveType: ConversationMoveTypeSchema.describe('Type of conversational move'),

  /**
   * The content of the turn (what was said).
   */
  content: z.string().describe('The text content of this turn'),

  /**
   * Optional structured data associated with this turn.
   * For example, an AI proposal might include the actual model changes.
   */
  structuredContent: z.object({
    // For proposals/refinements - what model changes are suggested
    modelDelta: z.array(z.object({
      operation: z.enum(['add', 'remove', 'modify']),
      targetType: z.enum(['concept', 'relationship', 'perspective', 'concern', 'feedback_loop']),
      targetId: z.string().optional(),
      before: z.any().optional(),
      after: z.any().optional(),
      rationale: z.string().optional(),
    })).optional(),

    // For questions - what specifically is being asked
    questionTarget: z.object({
      type: z.enum(['concept', 'relationship', 'boundary', 'priority', 'clarification']),
      relatedIds: z.array(z.string()).optional(),
    }).optional(),

    // For agreements/rejections - what specifically is being agreed/rejected
    agreementTarget: z.object({
      agreementScope: z.enum(['full', 'partial', 'none']),
      agreedItems: z.array(z.string()).optional(), // IDs of agreed items
      disputedItems: z.array(z.string()).optional(), // IDs of disputed items
      reason: z.string().optional(),
    }).optional(),

    // For perspective requests
    perspectiveRequest: z.object({
      requestedPerspectiveId: z.string().optional(),
      requestedPerspectiveName: z.string().optional(),
      reason: z.string().optional(),
    }).optional(),

    // For grounding offers
    evidence: z.array(z.object({
      sourceType: z.enum(['academic', 'news', 'report', 'case_study', 'data']),
      source: z.string(),
      relevance: z.string(),
      url: z.string().optional(),
    })).optional(),

  }).optional().describe('Structured data associated with this turn'),

  /**
   * What concepts/relationships this turn references.
   * Used for tracking what parts of the model are being discussed.
   */
  references: z.array(z.object({
    type: z.enum(['concept', 'relationship', 'perspective', 'concern']),
    id: z.string(),
  })).optional().describe('Model elements referenced in this turn'),

  /**
   * Confidence/certainty markers.
   */
  confidence: z.object({
    level: z.enum(['certain', 'confident', 'uncertain', 'speculative']),
    hedges: z.array(z.string()).optional(), // Words like "might", "perhaps"
  }).optional(),
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

// =============================================================================
// AGREEMENT TRACKING
// =============================================================================

/**
 * Tracks what has been agreed upon in the conversation.
 * This is crucial for Paskian dialogue - we need to know
 * what understanding has been established vs. what's still open.
 */
export const AgreementStateSchema = z.object({
  /**
   * Concepts that both parties agree on.
   */
  agreedConcepts: z.array(z.object({
    conceptId: z.string(),
    agreedAt: z.string(), // Turn ID where agreement was reached
    agreementType: z.enum([
      'explicit',     // User explicitly agreed
      'implicit',     // User didn't dispute after proposal
      'provisional',  // Agreed for now, may revisit
    ]),
  })),

  /**
   * Relationships that both parties agree on.
   */
  agreedRelationships: z.array(z.object({
    relationshipId: z.string(),
    agreedAt: z.string(),
    agreementType: z.enum(['explicit', 'implicit', 'provisional']),
  })),

  /**
   * Items currently under discussion/dispute.
   */
  openItems: z.array(z.object({
    itemType: z.enum(['concept', 'relationship', 'perspective', 'concern', 'boundary']),
    itemId: z.string().optional(),
    description: z.string(),
    raisedAt: z.string(), // Turn ID
    status: z.enum([
      'raised',       // Just brought up
      'discussing',   // Actively being worked through
      'blocked',      // Can't proceed without more info
      'deferred',     // Agreed to revisit later
    ]),
  })),

  /**
   * Questions that have been asked but not yet answered.
   */
  pendingQuestions: z.array(z.object({
    question: z.string(),
    askedBy: z.enum(['user', 'ai']),
    askedAt: z.string(),
    relatedTo: z.array(z.string()).optional(), // Related item IDs
  })),

  /**
   * Things explicitly rejected (so we don't propose them again).
   */
  rejectedItems: z.array(z.object({
    itemType: z.enum(['concept', 'relationship', 'interpretation']),
    description: z.string(),
    rejectedAt: z.string(),
    reason: z.string().optional(),
  })),
});
export type AgreementState = z.infer<typeof AgreementStateSchema>;

// =============================================================================
// DIALOGUE STATE
// =============================================================================

/**
 * The complete state of the conversation.
 */
export const DialogueStateSchema = z.object({
  id: z.string().describe('Unique dialogue identifier'),

  /**
   * All turns in the conversation, in order.
   */
  turns: z.array(ConversationTurnSchema),

  /**
   * The current state of the model (evolved through conversation).
   */
  currentModel: z.any(), // PerspectivalSystemModel - use any to avoid circular ref

  /**
   * What has been agreed upon.
   */
  agreementState: AgreementStateSchema,

  /**
   * Current phase of the exploration.
   */
  phase: z.enum([
    'seeding',        // User is providing initial assertion
    'reflecting',     // AI is showing understanding
    'negotiating',    // Back-and-forth refinement
    'expanding',      // Generating impacts/cascades
    'grounding',      // Adding evidence
    'simulating',     // Exploring temporal dynamics
    'concluding',     // Synthesizing insights
  ]),

  /**
   * What perspective is currently active (if any).
   */
  activePerspectiveId: z.string().optional(),

  /**
   * Metadata about the dialogue.
   */
  metadata: z.object({
    startedAt: z.string(),
    lastActivityAt: z.string(),
    turnCount: z.number(),
    agreementRatio: z.number().min(0).max(1), // Proportion of proposed items agreed
  }),
});
export type DialogueState = z.infer<typeof DialogueStateSchema>;

// =============================================================================
// CONVERSATION ACTIONS (What the UI can trigger)
// =============================================================================

/**
 * Actions the user can take in the conversation.
 * These correspond to UI buttons/inputs.
 */
export type UserConversationAction =
  | { type: 'submit_assertion'; text: string }
  | { type: 'ask_question'; question: string }
  | { type: 'challenge'; targetId: string; challenge: string }
  | { type: 'refine'; targetId: string; refinement: string }
  | { type: 'agree'; targetIds: string[] }
  | { type: 'reject'; targetIds: string[]; reason: string }
  | { type: 'elaborate'; elaboration: string }
  | { type: 'request_perspective'; perspectiveName: string }
  | { type: 'request_expansion'; depth: 'shallow' | 'deep' }
  | { type: 'request_grounding' }
  | { type: 'request_simulation' };

/**
 * AI response types.
 */
export type AIConversationResponse =
  | { type: 'reflection'; reflection: string; modelDelta: any[] }
  | { type: 'clarification_request'; question: string; context: string }
  | { type: 'proposal'; proposals: any[]; rationale: string }
  | { type: 'explanation'; explanation: string; references: string[] }
  | { type: 'alternative'; alternative: any; rationale: string }
  | { type: 'conflict_surface'; conflict: any; perspectives: string[] }
  | { type: 'grounding'; evidence: any[]; confidence: number }
  | { type: 'teachback_request'; understanding: string; question: string };

// =============================================================================
// CONVERSATION STRATEGIES
// =============================================================================

/**
 * Configuration for how the AI should conduct the conversation.
 * This allows adapting the conversational style to the user.
 */
export const ConversationStrategySchema = z.object({
  /**
   * How much the AI should lead vs. follow.
   */
  leadingStyle: z.enum([
    'directive',    // AI proposes, user reacts
    'collaborative', // AI and user co-create
    'facilitative',  // AI asks questions, user provides
  ]),

  /**
   * How detailed explanations should be.
   */
  explanationDepth: z.enum([
    'minimal',   // Brief, assumes expertise
    'moderate',  // Standard explanations
    'thorough',  // Detailed, educational
  ]),

  /**
   * How much to surface conflicts and alternatives.
   */
  conflictSurfacing: z.enum([
    'proactive',  // Actively surface disagreements
    'responsive', // Surface when relevant
    'minimal',    // Only when critical
  ]),

  /**
   * How much to push back on user assertions.
   */
  challengeLevel: z.enum([
    'supportive',  // Generally accept user framing
    'balanced',    // Gentle pushback
    'rigorous',    // Strong critical examination
  ]),

  /**
   * How much to ground in evidence.
   */
  groundingLevel: z.enum([
    'speculative', // Explore freely
    'balanced',    // Some grounding
    'empirical',   // Strong evidence focus
  ]),
});
export type ConversationStrategy = z.infer<typeof ConversationStrategySchema>;

// =============================================================================
// TEACHBACK PROTOCOL
// =============================================================================

/**
 * Structure for teachback exchanges.
 * Following Pask, true understanding requires demonstration.
 */
export const TeachbackExchangeSchema = z.object({
  id: z.string(),

  /**
   * What understanding is being verified.
   */
  topic: z.object({
    type: z.enum(['concept', 'relationship', 'system', 'perspective']),
    id: z.string().optional(),
    description: z.string(),
  }),

  /**
   * The understanding that was presented.
   */
  presentedUnderstanding: z.object({
    presenter: z.enum(['user', 'ai']),
    content: z.string(),
    turnId: z.string(),
  }),

  /**
   * The teachback response.
   */
  teachbackResponse: z.object({
    responder: z.enum(['user', 'ai']),
    content: z.string(),
    turnId: z.string(),
    assessment: z.enum([
      'accurate',       // Teachback matches
      'partial',        // Some mismatch
      'misunderstood',  // Significant mismatch
    ]),
    discrepancies: z.array(z.string()).optional(),
  }).optional(),

  /**
   * Resolution status.
   */
  status: z.enum([
    'pending_teachback',
    'teachback_received',
    'resolved_match',
    'resolved_after_correction',
    'unresolved',
  ]),
});
export type TeachbackExchange = z.infer<typeof TeachbackExchangeSchema>;
