# CascadeExplorer Architecture

## Overview

CascadeExplorer is a **second-order cybernetic decision support tool** that helps users think through complex decisions using conversational AI. This document defines the system architecture, component contracts, and data flow.

---

## 1. Current State Survey

### 1.1 Stores (Zustand State Management)

| Store | Purpose | Current Usage |
|-------|---------|---------------|
| `model-store.ts` | Manages PerspectivalSystemModel with concepts, relationships, perspectives, concerns, feedback loops, conflicts. Also has parallel `impacts` array. | Only `initializeModel()` and `addImpact()` are called. Rich methods like `addConcept()`, `addRelationship()`, `addPerspective()`, `addConcern()` exist but are never invoked. |
| `dialogue-store.ts` | Manages conversation state: turns, phases, agreements, rejections | Fully utilized. Has inline types that duplicate (simplified versions of) `conversation.ts` types. |
| `user-model-store.ts` | Adaptive bias compensation: detects cognitive style, computes compensation strategy | Integrated into `use-conversation.ts` for prompt adaptation. |
| `settings-store.ts` | Multi-provider AI configuration | Fully utilized. |

### 1.2 Types

| Type Module | Purpose | Status |
|-------------|---------|--------|
| `perspectival-model.ts` | Rich heterograph types: `SystemConcept` (with ontological modularity via `compositions`), `Perspective`, `ConceptRelationship`, `ConcernHyperedge`, `FeedbackLoop`, `PerspectiveConflict` | Well-designed but underutilized. AI prompts don't generate this structure. |
| `conversation.ts` | Paskian dialogue types: `ConversationTurn`, `AgreementState`, `TeachbackExchange`, `DialogueState`, `ConversationStrategy` | More comprehensive than `dialogue-store` inline types. Should be integrated. |
| `user-model.ts` | User cognitive model: `OptimismPessimism`, `CognitiveBias`, `ExpertiseProfile`, `UserRole`, `BiasCompensationStrategy` | Fully utilized by `user-model-store`. |

### 1.3 Hooks

| Hook | Purpose | Status |
|------|---------|--------|
| `use-conversation.ts` | Main AI interaction interface | Only uses `initializeModel()` and `addImpact()`. Never populates full model (concepts, relationships, perspectives, concerns). |

### 1.4 Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `ConversationPanel.tsx` | Chat interface with messages, quick actions, voice input | Functional |
| `VisualizationPanel.tsx` | Impact cascade visualization | Uses D3 force-directed graph. Needs replacement with dagre hypergraph. |
| `SystemModelGraph.tsx` | Heterograph visualization | Exists but unused |
| `SettingsPanel.tsx` | Multi-provider AI configuration | Functional |

### 1.5 Key Gaps Identified

1. **Type Duplication**: `dialogue-store.ts` has inline `ConversationTurn` that's simpler than `conversation.ts`
2. **Model Population**: AI prompts only generate impacts, not the full perspectival model
3. **Visualization**: Force-directed layout needs replacement with deterministic dagre-based hypergraph
4. **Missing Features**: No progressive disclosure, no perspective agreement flow, no hyperedge blobs

---

## 2. Target Architecture

### 2.1 Data Flow Overview

```
User Input
    │
    ▼
┌──────────────────┐
│ ConversationPanel │  ◄─── Quick Actions, Voice Input
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ use-conversation │  ◄─── Compensation Strategy from user-model-store
└────────┬─────────┘
         │
         ├─────► dialogue-store (conversation state)
         │
         ▼
┌──────────────────┐
│    AI Client     │  ◄─── Settings from settings-store
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                     AI Response Processing                     │
│                                                                │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Concepts    │  │ Perspectives │  │ Concerns (Hyperedge)│ │
│  │ Relationships │  │   Conflicts  │  │   Feedback Loops    │ │
│  └───────┬───────┘  └──────┬───────┘  └──────────┬──────────┘ │
└──────────┼─────────────────┼─────────────────────┼────────────┘
           │                 │                     │
           ▼                 ▼                     ▼
     ┌─────────────────────────────────────────────────┐
     │                  model-store                     │
     │                                                  │
     │  PerspectivalSystemModel {                       │
     │    concepts: SystemConcept[]                     │
     │    relationships: ConceptRelationship[]          │
     │    perspectives: Perspective[]                   │
     │    concerns: ConcernHyperedge[]                  │
     │    feedbackLoops: FeedbackLoop[]                 │
     │    perspectiveConflicts: PerspectiveConflict[]   │
     │  }                                               │
     └────────────────────┬────────────────────────────┘
                          │
                          ▼
     ┌─────────────────────────────────────────────────┐
     │              HypergraphRenderer                  │
     │                                                  │
     │  ┌───────────────────────────────────────────┐  │
     │  │            Dagre Layout Engine            │  │
     │  │  (deterministic, hierarchical, LR)        │  │
     │  └───────────────────────────────────────────┘  │
     │                                                  │
     │  ┌───────────────────────────────────────────┐  │
     │  │          Hyperedge Blob Renderer          │  │
     │  │  (colored regions around grouped nodes)   │  │
     │  └───────────────────────────────────────────┘  │
     │                                                  │
     │  ┌───────────────────────────────────────────┐  │
     │  │        Progressive Disclosure             │  │
     │  │  (expand/collapse hypergraph regions)     │  │
     │  └───────────────────────────────────────────┘  │
     └─────────────────────────────────────────────────┘
```

### 2.2 State Shape

#### dialogue-store (using conversation.ts types)

```typescript
interface DialogueState {
  // From conversation.ts
  turns: ConversationTurn[];           // Full Paskian turn types
  phase: ConversationPhase;
  agreementState: AgreementState;      // Agreed items, open questions, rejections

  // Session
  sessionId: string;
  isProcessing: boolean;

  // Actions
  addTurn(turn: ConversationTurn): string;
  updateAgreement(update: Partial<AgreementState>): void;
  setPhase(phase: ConversationPhase): void;
}
```

#### model-store

```typescript
interface ModelState {
  model: PerspectivalSystemModel | null;
  activePerspectiveId: string | null;

  // Expansion/collapse state for progressive disclosure
  expandedHyperedges: Set<string>;    // Which concern hyperedges are expanded
  expandedConcepts: Set<string>;       // Which composite concepts are expanded

  // Layout positions (stable across views)
  nodePositions: Map<string, { x: number; y: number }>;

  // Actions - all must be wired to AI responses
  initializeModel(assertion: string, summary: string): void;

  // Concepts
  addConcept(concept: Omit<SystemConcept, 'id'>): string;
  updateConcept(id: string, updates: Partial<SystemConcept>): void;

  // Relationships
  addRelationship(rel: Omit<ConceptRelationship, 'id'>): string;

  // Perspectives
  addPerspective(perspective: Omit<Perspective, 'id'>): string;

  // Concerns (Hyperedges)
  addConcern(concern: Omit<ConcernHyperedge, 'id'>): string;

  // Feedback loops
  addFeedbackLoop(loop: Omit<FeedbackLoop, 'id'>): string;

  // Conflicts
  addConflict(conflict: Omit<PerspectiveConflict, 'id'>): string;

  // Progressive disclosure
  toggleHyperedgeExpansion(hyperedgeId: string): void;
  toggleConceptExpansion(conceptId: string): void;

  // Selectors
  getFilteredView(perspectiveId: string | null): PerspectiveFilteredView;
  getLayoutData(): DagreLayoutInput;
}
```

---

## 3. Component Contracts

### 3.1 ConversationPanel

**Responsibilities:**
- Render conversation turns from `dialogue-store`
- Handle user input (text, voice)
- Display quick actions from AI responses
- Show perspective agreement requests

**Inputs (from stores):**
- `dialogue-store.turns` → Message list
- `dialogue-store.phase` → Current phase indicator
- `dialogue-store.isProcessing` → Loading state
- `settings-store.isConfigured` → Enable/disable input

**Outputs (via hooks):**
- Calls `useConversation().sendMessage(content)` for user messages
- Calls `useConversation().processInitialAssertion(assertion)` for first message
- Calls `useConversation().handleQuickAction(action)` for quick action buttons
- Calls `useConversation().handlePerspectiveAgreement(perspectiveId, agreed)` for agreement flow

**Contract:**
```typescript
interface ConversationPanelProps {
  // No props - all state from hooks/stores
}

// Internal state
interface ConversationPanelState {
  input: string;
  isListening: boolean;  // voice input
}
```

### 3.2 HypergraphRenderer (New Component)

**Responsibilities:**
- Render the perspectival model as a hypergraph with dagre layout
- Draw hyperedge blobs (colored regions) around grouped concepts
- Support progressive disclosure (expand/collapse)
- Maintain uni-positional nodes across perspective switches
- Handle node selection/interaction

**Inputs (from stores):**
- `model-store.model` → Full perspectival model
- `model-store.activePerspectiveId` → Current perspective filter
- `model-store.expandedHyperedges` → Which hyperedges are expanded
- `model-store.expandedConcepts` → Which composite concepts are expanded
- `model-store.nodePositions` → Stable positions

**Outputs:**
- Calls `model-store.toggleHyperedgeExpansion(id)` on hyperedge click
- Calls `model-store.toggleConceptExpansion(id)` on concept click
- Calls `model-store.setActivePerspective(id)` on perspective switch
- Emits `onNodeSelect(nodeId)` for detail panel

**Contract:**
```typescript
interface HypergraphRendererProps {
  onNodeSelect?: (nodeId: string) => void;
  onConflictSurface?: (conflictId: string) => void;
}

// Internal state managed by component
interface HypergraphRendererState {
  hoveredNode: string | null;
  selectedNode: string | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
}
```

**Visual Contract:**
- Nodes positioned deterministically via dagre (LR orientation)
- Hyperedge blobs: Convex hulls around connected nodes with 50% transparent fill
- Collapsed hyperedges: Single "super-node" with edge count badge
- Expanded hyperedges: Individual nodes visible within blob boundary
- Relationships from collapsed internal nodes appear to originate from hyperedge boundary
- Text wrapping at ~100px width to prevent overlap
- Tooltips on hover with perspective-specific definitions

### 3.3 PerspectiveAgreementFlow (New Component)

**Responsibilities:**
- Present AI-generated perspectives for user agreement/rejection
- Show tooltips explaining perspective-specific terminology
- Track which perspectives the user has reviewed

**Inputs:**
- `model-store.model.perspectives` → Generated perspectives
- `dialogue-store.agreementState` → What's been agreed/rejected

**Outputs:**
- Calls `dialogue-store.addAgreement()` when user agrees
- Calls `dialogue-store.addRejection()` when user rejects
- Triggers AI follow-up via `useConversation()` for disputes

**Contract:**
```typescript
interface PerspectiveAgreementFlowProps {
  perspectiveId: string;
  onComplete: () => void;
}

// Perspective agreement item
interface PerspectiveReviewItem {
  perspectiveId: string;
  perspective: Perspective;
  status: 'pending' | 'reviewing' | 'agreed' | 'rejected' | 'disputed';
  userFeedback?: string;
}
```

### 3.4 use-conversation Hook

**Responsibilities:**
- Orchestrate all AI interactions
- Apply bias compensation to prompts
- Parse AI responses into model updates
- Trigger agreement flows for new perspectives/concerns

**Contract:**
```typescript
interface ConversationActions {
  // Initial assertion processing
  processInitialAssertion(assertion: string): Promise<void>;

  // General message
  sendMessage(content: string): Promise<void>;

  // Impact generation (legacy, kept for compatibility)
  generateImpacts(order: 1 | 2 | 3): Promise<void>;

  // Full model generation (new)
  expandModel(): Promise<void>;  // Generates concepts, relationships, perspectives, concerns

  // Perspective exploration
  requestPerspective(perspectiveName: string): Promise<void>;

  // Agreement handling
  handlePerspectiveAgreement(perspectiveId: string, agreed: boolean, feedback?: string): Promise<void>;
  handleConcernAgreement(concernId: string, agreed: boolean, feedback?: string): Promise<void>;

  // Challenge/dispute
  challengeElement(elementType: 'concept' | 'relationship' | 'perspective' | 'concern', elementId: string, challenge: string): Promise<void>;
}
```

---

## 4. AI Response Schema

The AI must return structured responses that map to the model types.

### 4.1 Initial Reflection Response

```typescript
interface InitialReflectionResponse {
  summary: string;
  reflection: string;

  // Core model elements
  concepts: Array<{
    name: string;
    description: string;
    conceptType: SystemConcept['conceptType'];
    domains: KnowledgeDomain[];
    abstractionLevel: AbstractionLevel;
  }>;

  relationships: Array<{
    sourceName: string;  // Reference by name, resolve to ID later
    targetName: string;
    relationshipType: ConceptRelationship['relationshipType'];
    strength: 'strong' | 'moderate' | 'weak';
    polarity: 'positive' | 'negative' | 'variable';
    description: string;
  }>;

  // Perspectives - generated immediately
  perspectives: Array<{
    name: string;
    description: string;
    archetype: Perspective['archetype'];
    expertiseDomains: KnowledgeDomain[];
    concerns: string[];  // Key concerns for this perspective
    preferredAbstraction: AbstractionLevel;
    knownBiases?: Array<{
      type: string;
      description: string;
      blindspots: string[];
    }>;
  }>;

  // Concerns as hyperedges
  concerns: Array<{
    concernName: string;
    description: string;
    connectedConceptNames: string[];  // Reference by name
    conceptRoles: Array<{
      conceptName: string;
      role: ConcernHyperedge['conceptRoles'][0]['role'];
    }>;
    perspectiveWeights: Array<{
      perspectiveName: string;
      weight: 'critical' | 'important' | 'minor' | 'invisible';
      reasoning: string;
    }>;
    primaryDomain: KnowledgeDomain;
  }>;

  // Feedback loops if detected
  feedbackLoops?: Array<{
    name: string;
    conceptNames: string[];  // Ordered cycle
    loopType: 'reinforcing' | 'balancing' | 'complex';
    description: string;
  }>;

  // Questions for user
  confirmationQuestion: string;
  quickActions: Array<{ label: string; action: string }>;
}
```

### 4.2 Perspective-Specific Terminology

Each perspective should include a `terminology` map for tooltips:

```typescript
interface PerspectiveTerminology {
  perspectiveId: string;
  terms: Array<{
    term: string;           // e.g., "Technical Debt"
    definition: string;     // Plain language definition
    perspectiveView: string; // How this perspective sees it
    otherViews?: Array<{
      perspectiveName: string;
      view: string;
    }>;
  }>;
}
```

---

## 5. Layout Algorithm Contract

### 5.1 Dagre Configuration

```typescript
interface DagreLayoutConfig {
  rankdir: 'LR';           // Left-to-right hierarchy
  ranksep: 80;             // Space between ranks
  nodesep: 40;             // Space between nodes in same rank
  marginx: 20;
  marginy: 20;
  align: 'UL';             // Upper-left alignment
}

interface DagreNode {
  id: string;
  width: number;           // Computed from text + padding
  height: number;
  label: string;
  type: 'concept' | 'hyperedge-collapsed' | 'hyperedge-header';
}

interface DagreEdge {
  source: string;
  target: string;
  label?: string;
}
```

### 5.2 Hyperedge Blob Rendering

```typescript
interface HyperedgeBlobConfig {
  paddingX: 20;            // Horizontal padding around contained nodes
  paddingY: 20;            // Vertical padding
  borderRadius: 15;        // Corner radius
  opacity: 0.15;           // Fill opacity
  strokeWidth: 2;
  strokeOpacity: 0.5;
}

// Color scheme per concern type
const CONCERN_COLORS: Record<KnowledgeDomain, string> = {
  technical: '#3b82f6',    // Blue
  business: '#22c55e',     // Green
  legal: '#f59e0b',        // Amber
  social: '#ec4899',       // Pink
  environmental: '#10b981', // Emerald
  political: '#8b5cf6',    // Violet
  economic: '#f97316',     // Orange
  psychological: '#06b6d4', // Cyan
  organizational: '#6366f1', // Indigo
  temporal: '#84cc16',     // Lime
};
```

### 5.3 Progressive Disclosure Logic

```typescript
interface ProgressiveDisclosureState {
  // Which hyperedges are expanded to show internal nodes
  expandedHyperedges: Set<string>;

  // Which composite concepts are expanded
  expandedConcepts: Set<string>;
}

// When collapsed:
// - Hyperedge rendered as single node with badge showing internal count
// - Edges to internal nodes rerouted to hyperedge boundary
// - Tooltip shows contained concepts

// When expanded:
// - Internal nodes visible within blob
// - Edges connect to actual nodes
// - Blob boundary contains all internal nodes with convex hull
```

---

## 6. Migration Path

### Phase 1: Type Unification
1. Update `dialogue-store` to use types from `conversation.ts`
2. Add missing fields (`agreementState`, etc.)
3. Ensure backward compatibility during transition

### Phase 2: AI Prompt Update
1. Update prompts to request full model (concepts, relationships, perspectives, concerns)
2. Wire response parsing to call all model-store methods
3. Add perspective agreement flow after initial reflection

### Phase 3: Visualization Replacement
1. Install dagre
2. Create `HypergraphRenderer` component
3. Implement progressive disclosure
4. Replace `VisualizationPanel` usage of `ImpactGraph`

### Phase 4: Polish
1. Add tooltips for perspective terminology
2. Implement uni-positional node behavior
3. Clean up dead code
4. End-to-end testing

---

## 7. Testing Strategy

### Unit Tests
- `model-store`: All CRUD operations, filtering, expansion toggle
- `dialogue-store`: Turn management, agreement tracking
- Dagre layout: Node positioning, edge routing

### Integration Tests
- AI response parsing → model-store updates
- Perspective agreement flow → dialogue-store + model-store
- Progressive disclosure → layout recalculation

### Visual Tests
- Hyperedge blob rendering
- Node positioning consistency across perspectives
- Text wrapping at boundaries

---

## 8. File Structure

```
src/
├── ai/
│   └── client.ts                 # Multi-provider AI client
├── components/
│   └── cascade-explorer/
│       ├── ConversationPanel.tsx # Chat interface
│       ├── HypergraphRenderer.tsx # NEW: Dagre-based hypergraph
│       ├── HyperedgeBlob.tsx     # NEW: Blob rendering
│       ├── PerspectiveAgreementFlow.tsx # NEW: Agreement UI
│       ├── NodeTooltip.tsx       # NEW: Perspective terminology
│       ├── SettingsPanel.tsx     # AI configuration
│       └── VisualizationPanel.tsx # Container (wraps HypergraphRenderer)
├── hooks/
│   └── use-conversation.ts       # AI interaction orchestration
├── store/
│   ├── dialogue-store.ts         # Conversation state
│   ├── model-store.ts            # Perspectival model + expansion state
│   ├── settings-store.ts         # AI settings
│   └── user-model-store.ts       # Cognitive model
├── types/
│   ├── conversation.ts           # Paskian dialogue types
│   ├── perspectival-model.ts     # Heterograph types
│   └── user-model.ts             # Cognitive model types
└── lib/
    └── dagre-layout.ts           # NEW: Dagre wrapper with hyperedge support
```
