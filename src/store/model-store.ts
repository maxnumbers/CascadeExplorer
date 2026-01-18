/**
 * @fileOverview Model Store
 *
 * Manages the perspectival system model including:
 * - Concepts (with ontological modularity)
 * - Relationships
 * - Perspectives
 * - Concern hyperedges
 * - Feedback loops
 * - Perspective conflicts
 */

import { create } from 'zustand';
import type {
  PerspectivalSystemModel,
  SystemConcept,
  ConceptRelationship,
  Perspective,
  ConcernHyperedge,
  FeedbackLoop,
  PerspectiveConflict,
} from '@/types/perspectival-model';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ModelState {
  // The system model
  model: PerspectivalSystemModel | null;

  // Active perspective (null = show all)
  activePerspectiveId: string | null;

  // Progressive disclosure state
  expandedHyperedges: Set<string>;  // Which concern hyperedges are expanded
  expandedConcepts: Set<string>;     // Which composite concepts are expanded

  // Impact cascade (order-based)
  impacts: Array<{
    id: string;
    order: 0 | 1 | 2 | 3;
    label: string;
    description: string;
    parentId?: string;
    validity: 'high' | 'medium' | 'low';
    reasoning: string;
    causalReasoning?: string;
    keyConcepts: Array<{ name: string; type?: string }>;
    attributes: string[];
  }>;

  // Actions
  initializeModel: (seedAssertion: string, summary: string) => void;

  // Concept management
  addConcept: (concept: Omit<SystemConcept, 'id'>) => string;
  updateConcept: (id: string, updates: Partial<SystemConcept>) => void;
  removeConcept: (id: string) => void;

  // Relationship management
  addRelationship: (relationship: Omit<ConceptRelationship, 'id'>) => string;
  updateRelationship: (id: string, updates: Partial<ConceptRelationship>) => void;
  removeRelationship: (id: string) => void;

  // Perspective management
  addPerspective: (perspective: Omit<Perspective, 'id'>) => string;
  updatePerspective: (id: string, updates: Partial<Perspective>) => void;
  setActivePerspective: (id: string | null) => void;

  // Concern hyperedge management
  addConcern: (concern: Omit<ConcernHyperedge, 'id'>) => string;
  updateConcern: (id: string, updates: Partial<ConcernHyperedge>) => void;

  // Feedback loop management
  addFeedbackLoop: (loop: Omit<FeedbackLoop, 'id'>) => string;

  // Conflict management
  addConflict: (conflict: Omit<PerspectiveConflict, 'id'>) => string;

  // Impact cascade management
  addImpact: (impact: Omit<ModelState['impacts'][0], 'id'>) => string;
  updateImpact: (id: string, updates: Partial<ModelState['impacts'][0]>) => void;
  removeImpact: (id: string) => void;
  getImpactsByOrder: (order: 0 | 1 | 2 | 3) => ModelState['impacts'];

  // Progressive disclosure
  toggleHyperedgeExpansion: (hyperedgeId: string) => void;
  toggleConceptExpansion: (conceptId: string) => void;
  expandAllHyperedges: () => void;
  collapseAllHyperedges: () => void;

  // Selectors
  getFilteredConcepts: () => SystemConcept[];
  getFilteredRelationships: () => ConceptRelationship[];
  getConflictsForPerspective: (perspectiveId: string) => PerspectiveConflict[];

  // Reset
  resetModel: () => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: null,
  activePerspectiveId: null,
  expandedHyperedges: new Set<string>(),
  expandedConcepts: new Set<string>(),
  impacts: [],

  initializeModel: (seedAssertion, summary) => {
    const now = new Date().toISOString();
    set({
      model: {
        id: generateId(),
        name: summary,
        description: seedAssertion,
        seedAssertion: {
          text: seedAssertion,
          summary,
          timestamp: now,
        },
        concepts: [],
        perspectives: [],
        relationships: [],
        concerns: [],
        feedbackLoops: [],
        perspectiveConflicts: [],
        metadata: {
          createdAt: now,
          lastModifiedAt: now,
          version: 1,
          confidence: 0.5,
          completeness: 'sketch',
        },
      },
      impacts: [{
        id: 'core-assertion',
        order: 0,
        label: summary,
        description: seedAssertion,
        validity: 'high',
        reasoning: 'User-provided assertion',
        keyConcepts: [],
        attributes: [],
      }],
      activePerspectiveId: null,
    });
  },

  // Concept management
  addConcept: (concept) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          concepts: [...state.model.concepts, { ...concept, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  updateConcept: (id, updates) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          concepts: state.model.concepts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeConcept: (id) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          concepts: state.model.concepts.filter((c) => c.id !== id),
          // Also remove relationships involving this concept
          relationships: state.model.relationships.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          ),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // Relationship management
  addRelationship: (relationship) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          relationships: [...state.model.relationships, { ...relationship, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  updateRelationship: (id, updates) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          relationships: state.model.relationships.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeRelationship: (id) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          relationships: state.model.relationships.filter((r) => r.id !== id),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // Perspective management
  addPerspective: (perspective) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          perspectives: [...state.model.perspectives, { ...perspective, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  updatePerspective: (id, updates) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          perspectives: state.model.perspectives.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  setActivePerspective: (id) => set({ activePerspectiveId: id }),

  // Concern hyperedge management
  addConcern: (concern) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          concerns: [...state.model.concerns, { ...concern, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  updateConcern: (id, updates) => {
    set((state) => {
      if (!state.model) return state;
      return {
        model: {
          ...state.model,
          concerns: state.model.concerns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // Feedback loop management
  addFeedbackLoop: (loop) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      const loops = state.model.feedbackLoops || [];
      return {
        model: {
          ...state.model,
          feedbackLoops: [...loops, { ...loop, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  // Conflict management
  addConflict: (conflict) => {
    const id = generateId();
    set((state) => {
      if (!state.model) return state;
      const conflicts = state.model.perspectiveConflicts || [];
      return {
        model: {
          ...state.model,
          perspectiveConflicts: [...conflicts, { ...conflict, id }],
          metadata: {
            ...state.model.metadata,
            lastModifiedAt: new Date().toISOString(),
          },
        },
      };
    });
    return id;
  },

  // Impact cascade management
  addImpact: (impact) => {
    const id = generateId();
    set((state) => ({
      impacts: [...state.impacts, { ...impact, id }],
    }));
    return id;
  },

  updateImpact: (id, updates) => {
    set((state) => ({
      impacts: state.impacts.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }));
  },

  removeImpact: (id) => {
    set((state) => ({
      impacts: state.impacts.filter((i) => i.id !== id),
    }));
  },

  getImpactsByOrder: (order) => {
    return get().impacts.filter((i) => i.order === order);
  },

  // Selectors
  getFilteredConcepts: () => {
    const { model, activePerspectiveId } = get();
    if (!model) return [];
    if (!activePerspectiveId) return model.concepts;

    return model.concepts.filter((c) => {
      if (!c.visibleToPerspectives || c.visibleToPerspectives.length === 0) {
        return true; // Visible to all if not specified
      }
      return c.visibleToPerspectives.includes(activePerspectiveId);
    });
  },

  getFilteredRelationships: () => {
    const { model, activePerspectiveId } = get();
    if (!model) return [];
    if (!activePerspectiveId) return model.relationships;

    const visibleConceptIds = new Set(get().getFilteredConcepts().map((c) => c.id));

    return model.relationships.filter((r) => {
      // Check if both endpoints are visible
      if (!visibleConceptIds.has(r.sourceId) || !visibleConceptIds.has(r.targetId)) {
        return false;
      }
      // Check perspective visibility
      if (!r.visibleToPerspectives || r.visibleToPerspectives.length === 0) {
        return true;
      }
      return r.visibleToPerspectives.includes(activePerspectiveId);
    });
  },

  getConflictsForPerspective: (perspectiveId) => {
    const { model } = get();
    if (!model || !model.perspectiveConflicts) return [];

    return model.perspectiveConflicts.filter((c) =>
      c.perspectiveIds.includes(perspectiveId)
    );
  },

  // Progressive disclosure
  toggleHyperedgeExpansion: (hyperedgeId) => {
    set((state) => {
      const newSet = new Set(state.expandedHyperedges);
      if (newSet.has(hyperedgeId)) {
        newSet.delete(hyperedgeId);
      } else {
        newSet.add(hyperedgeId);
      }
      return { expandedHyperedges: newSet };
    });
  },

  toggleConceptExpansion: (conceptId) => {
    set((state) => {
      const newSet = new Set(state.expandedConcepts);
      if (newSet.has(conceptId)) {
        newSet.delete(conceptId);
      } else {
        newSet.add(conceptId);
      }
      return { expandedConcepts: newSet };
    });
  },

  expandAllHyperedges: () => {
    const { model } = get();
    if (!model) return;
    const allIds = new Set(model.concerns.map((c) => c.id));
    set({ expandedHyperedges: allIds });
  },

  collapseAllHyperedges: () => {
    set({ expandedHyperedges: new Set<string>() });
  },

  resetModel: () => {
    set({
      model: null,
      activePerspectiveId: null,
      expandedHyperedges: new Set<string>(),
      expandedConcepts: new Set<string>(),
      impacts: [],
    });
  },
}));

// Selector hooks
export const useSystemModel = () => useModelStore((state) => state.model);
export const useActivePerspective = () => useModelStore((state) => state.activePerspectiveId);
export const useImpacts = () => useModelStore((state) => state.impacts);
export const usePerspectives = () => useModelStore((state) => state.model?.perspectives ?? []);
export const useExpandedHyperedges = () => useModelStore((state) => state.expandedHyperedges);
export const useExpandedConcepts = () => useModelStore((state) => state.expandedConcepts);
