/**
 * @fileOverview Dialogue Store
 *
 * Manages the conversational state following Paskian dialogue principles:
 * - Conversation turns with typed moves
 * - Agreement tracking (what's established vs. open)
 * - Phase management (seeding, reflecting, negotiating, etc.)
 *
 * NOTE: This store uses types from @/types/conversation.ts where possible
 * to maintain a unified type system across the application.
 */

import { create } from 'zustand';
import type { ConversationMoveType } from '@/types/conversation';

// Re-export the move type for consumers that import from this module
export type MoveType = ConversationMoveType | 'welcome_message';

/**
 * Conversation phases - extended from the base schema to include 'welcome'
 */
export type ConversationPhase =
  | 'welcome'       // Initial state, showing welcome message
  | 'seeding'       // User providing initial assertion
  | 'reflecting'    // AI showing understanding
  | 'negotiating'   // Back-and-forth refinement
  | 'expanding'     // Generating impacts/perspectives
  | 'grounding'     // Adding evidence
  | 'simulating'    // Exploring temporal dynamics
  | 'concluding';   // Synthesizing insights

/**
 * A conversation turn in the runtime state.
 * This is a simplified version of ConversationTurn from conversation.ts,
 * optimized for the Zustand store and UI rendering.
 */
export interface ConversationTurn {
  id: string;
  timestamp: string;
  actor: 'user' | 'ai';
  moveType: MoveType;
  content: string;

  // Optional structured data
  structuredContent?: {
    modelDelta?: Array<{
      operation: 'add' | 'remove' | 'modify';
      targetType: 'concept' | 'relationship' | 'perspective' | 'concern';
      data: unknown;
    }>;
    quickActions?: Array<{
      label: string;
      action: string;
    }>;
    questionsForUser?: string[];
  };

  // References to model elements
  references?: Array<{
    type: 'concept' | 'relationship' | 'perspective' | 'concern';
    id: string;
  }>;

  // Processing state
  isStreaming?: boolean;
  error?: string;
}

/**
 * An item that has been agreed upon in the conversation.
 * Maps to AgreementState.agreedConcepts/agreedRelationships in conversation.ts
 */
export interface AgreementItem {
  itemId: string;
  itemType: 'concept' | 'relationship' | 'perspective' | 'interpretation';
  description: string;
  agreedAt: string; // turn ID
  agreementType: 'explicit' | 'implicit' | 'provisional';
}

/**
 * An open question in the conversation.
 * Maps to AgreementState.pendingQuestions in conversation.ts
 */
export interface OpenQuestion {
  question: string;
  askedBy: 'user' | 'ai';
  askedAt: string; // turn ID
  relatedTo?: string[];
}

interface DialogueState {
  // Core state
  turns: ConversationTurn[];
  phase: ConversationPhase;
  isProcessing: boolean;

  // Agreement tracking
  agreedItems: AgreementItem[];
  openQuestions: OpenQuestion[];
  rejectedItems: Array<{ description: string; rejectedAt: string; reason?: string }>;

  // Session metadata
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;

  // Actions
  initializeSession: () => void;
  addUserTurn: (content: string, moveType?: MoveType) => string;
  addAITurn: (content: string, moveType: MoveType, structuredContent?: ConversationTurn['structuredContent']) => string;
  updateTurn: (turnId: string, updates: Partial<ConversationTurn>) => void;
  setPhase: (phase: ConversationPhase) => void;
  setProcessing: (isProcessing: boolean) => void;

  // Agreement management
  addAgreement: (item: Omit<AgreementItem, 'agreedAt'>, turnId: string) => void;
  addOpenQuestion: (question: string, askedBy: 'user' | 'ai', turnId: string, relatedTo?: string[]) => void;
  resolveQuestion: (question: string) => void;
  addRejection: (description: string, turnId: string, reason?: string) => void;

  // Session management
  resetSession: () => void;
  getLastTurn: () => ConversationTurn | null;
  getLastAITurn: () => ConversationTurn | null;
  getConversationContext: (maxTurns?: number) => ConversationTurn[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useDialogueStore = create<DialogueState>((set, get) => ({
  // Initial state
  turns: [],
  phase: 'welcome',
  isProcessing: false,

  agreedItems: [],
  openQuestions: [],
  rejectedItems: [],

  sessionId: generateId(),
  startedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),

  // Actions
  initializeSession: () => {
    const now = new Date().toISOString();
    set({
      turns: [],
      phase: 'welcome',
      isProcessing: false,
      agreedItems: [],
      openQuestions: [],
      rejectedItems: [],
      sessionId: generateId(),
      startedAt: now,
      lastActivityAt: now,
    });
  },

  addUserTurn: (content, moveType = 'assertion') => {
    const turnId = generateId();
    const now = new Date().toISOString();

    set((state) => ({
      turns: [
        ...state.turns,
        {
          id: turnId,
          timestamp: now,
          actor: 'user',
          moveType,
          content,
        },
      ],
      lastActivityAt: now,
      // Transition from welcome to seeding on first user input
      phase: state.phase === 'welcome' ? 'seeding' : state.phase,
    }));

    return turnId;
  },

  addAITurn: (content, moveType, structuredContent) => {
    const turnId = generateId();
    const now = new Date().toISOString();

    set((state) => ({
      turns: [
        ...state.turns,
        {
          id: turnId,
          timestamp: now,
          actor: 'ai',
          moveType,
          content,
          structuredContent,
        },
      ],
      lastActivityAt: now,
    }));

    return turnId;
  },

  updateTurn: (turnId, updates) => {
    set((state) => ({
      turns: state.turns.map((t) =>
        t.id === turnId ? { ...t, ...updates } : t
      ),
      lastActivityAt: new Date().toISOString(),
    }));
  },

  setPhase: (phase) => set({ phase }),
  setProcessing: (isProcessing) => set({ isProcessing }),

  // Agreement management
  addAgreement: (item, turnId) => {
    set((state) => ({
      agreedItems: [
        ...state.agreedItems,
        { ...item, agreedAt: turnId },
      ],
    }));
  },

  addOpenQuestion: (question, askedBy, turnId, relatedTo) => {
    set((state) => ({
      openQuestions: [
        ...state.openQuestions,
        { question, askedBy, askedAt: turnId, relatedTo },
      ],
    }));
  },

  resolveQuestion: (question) => {
    set((state) => ({
      openQuestions: state.openQuestions.filter((q) => q.question !== question),
    }));
  },

  addRejection: (description, turnId, reason) => {
    set((state) => ({
      rejectedItems: [
        ...state.rejectedItems,
        { description, rejectedAt: turnId, reason },
      ],
    }));
  },

  // Session management
  resetSession: () => {
    get().initializeSession();
  },

  getLastTurn: () => {
    const turns = get().turns;
    return turns.length > 0 ? turns[turns.length - 1] : null;
  },

  getLastAITurn: () => {
    const turns = get().turns;
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].actor === 'ai') return turns[i];
    }
    return null;
  },

  getConversationContext: (maxTurns = 20) => {
    const turns = get().turns;
    return turns.slice(-maxTurns);
  },
}));

// Selector hooks
export const useConversationPhase = () => useDialogueStore((state) => state.phase);
export const useIsProcessing = () => useDialogueStore((state) => state.isProcessing);
export const useTurns = () => useDialogueStore((state) => state.turns);
export const useAgreementState = () =>
  useDialogueStore((state) => ({
    agreed: state.agreedItems,
    open: state.openQuestions,
    rejected: state.rejectedItems,
  }));
