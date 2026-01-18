# CascadeExplorer - Claude Code Context

This document provides essential context for Claude Code sessions working on CascadeExplorer.

## Project Vision

CascadeExplorer is a **second-order cybernetic decision support tool** that helps users think through complex decisions. It is NOT a simple chatbot or visualization tool - it's a **cognitive partner** that:

1. **Co-constructs understanding** through Paskian dialogue (teachback, agreement tracking)
2. **Adapts to user variety** via Ashby's Law of Requisite Variety (bias compensation)
3. **Models systems dynamically** with feedback loops and temporal properties
4. **Surfaces multiple valid perspectives** (ontological modularity)
5. **Makes boundary judgments explicit** (Critical Systems Thinking)
6. **Grounds claims in evidence** (uncertainty reduction)
7. **Includes the observer** in the observation (second-order cybernetics)

## Core Theoretical Foundations

See `docs/THEORETICAL_FOUNDATIONS.md` for deep background. Key concepts:

- **Pask's Conversation Theory**: Understanding through dialogue, not monologue
- **Ashby's Requisite Variety**: System must adapt to user cognitive style
- **Ontological Modularity**: Different observers see different structures
- **Hypergraph Model**: N-ary relationships via concern hyperedges
- **Progressive Disclosure**: Collapse/expand to manage complexity

## Architecture

See `docs/ARCHITECTURE.md` for detailed contracts. Key points:

### Stores (Zustand)
- `model-store.ts`: PerspectivalSystemModel with concepts, relationships, perspectives, concerns
- `dialogue-store.ts`: Conversation turns, phases, agreement tracking
- `user-model-store.ts`: User cognitive profile, bias compensation
- `settings-store.ts`: Multi-provider AI configuration

### Key Types
- `perspectival-model.ts`: SystemConcept, Perspective, ConcernHyperedge, FeedbackLoop
- `conversation.ts`: ConversationTurn, AgreementState, TeachbackExchange

### Visualization Requirements
- **Dagre layout**: Deterministic, hierarchical, left-to-right
- **Hyperedge blobs**: Colored regions (like hypergraphx) around grouped concepts
- **Progressive disclosure**: Hyperedges collapse to single nodes, expand to show contents
- **Uni-positional nodes**: Same concept at same coordinates across perspectives
- **Text wrapping**: All text readable, no overlap

## Critical Implementation Rules

### 1. AI Provider Independence
**Use OpenAI-compatible API format only.** The user explicitly requires:
- Support for ANY provider via LiteLLM-compatible approach
- User selects provider and enters their own API key
- NO provider-specific SDKs (don't import @anthropic-ai/sdk, etc.)
- See `src/ai/client.ts` for the multi-provider implementation

### 2. Full Model Population
The AI must generate the FULL perspectival model, not just impacts:
- Concepts with types, domains, abstraction levels
- Relationships with polarity, strength, temporal properties
- Perspectives with archetypes, expertise domains, known biases
- Concerns as hyperedges connecting multiple concepts
- Feedback loops when detected

Currently broken: `use-conversation.ts` only calls `initializeModel()` and `addImpact()`.
Must also call: `addConcept()`, `addRelationship()`, `addPerspective()`, `addConcern()`, etc.

### 3. Perspective Agreement Flow
When AI generates perspectives:
1. Present to user for agreement/rejection
2. Include tooltips explaining perspective-specific terminology
3. Track agreement state in `dialogue-store.agreementState`
4. Allow challenge/dispute with follow-up dialogue

### 4. Visualization Must Be Deterministic
**NO force-directed floating layouts.** Requirements:
- Use dagre for layout algorithm
- Hierarchical, left-to-right orientation
- Positions stable across interactions
- Text wraps at ~100px to prevent overlap

### 5. Type System Consistency
- `dialogue-store.ts` should USE types from `conversation.ts`
- Don't duplicate type definitions
- All model operations through `model-store.ts`

## Common Mistakes to Avoid

1. **Using provider-specific SDKs** - Always use `src/ai/client.ts`
2. **Force-directed graphs** - Use dagre for deterministic layout
3. **Generating only impacts** - Generate full model (concepts, perspectives, concerns)
4. **Ignoring agreement tracking** - Use `dialogue-store.agreementState`
5. **Floating node positions** - Use stable dagre-computed positions
6. **Duplicating types** - Import from canonical type files
7. **Missing tooltips** - Perspectives need terminology definitions

## File Structure

```
src/
├── ai/client.ts                 # Multi-provider AI client (OpenAI-compatible)
├── components/cascade-explorer/
│   ├── ConversationPanel.tsx    # Chat interface
│   ├── VisualizationPanel.tsx   # Container for graph
│   └── HypergraphRenderer.tsx   # NEW: Dagre-based hypergraph (to create)
├── hooks/use-conversation.ts    # AI orchestration (needs enhancement)
├── store/
│   ├── model-store.ts           # Perspectival model
│   ├── dialogue-store.ts        # Conversation state
│   ├── user-model-store.ts      # Cognitive model
│   └── settings-store.ts        # AI settings
└── types/
    ├── perspectival-model.ts    # Heterograph types
    ├── conversation.ts          # Paskian dialogue types
    └── user-model.ts            # Cognitive model types
```

## Testing Checklist

Before considering a feature complete:

1. [ ] TypeScript compiles without errors
2. [ ] Build succeeds (`npm run build`)
3. [ ] Dev server starts (`npm run dev`)
4. [ ] Manual UI test: Can enter assertion, see response
5. [ ] Manual UI test: Visualization updates correctly
6. [ ] Manual UI test: Perspective switching works
7. [ ] No force-directed floating - positions are stable

## Current Implementation Status

### Completed
- [x] Multi-provider AI client
- [x] Rich type system (perspectival-model, conversation, user-model)
- [x] Basic conversation flow
- [x] Bias compensation strategy computation

### In Progress
- [ ] Full model generation from AI responses
- [ ] Dagre-based hypergraph renderer
- [ ] Progressive disclosure
- [ ] Perspective agreement flow

### Not Started
- [ ] Hyperedge blob visualization
- [ ] Uni-positional node tracking
- [ ] Terminology tooltips
- [ ] Feedback loop detection/visualization

## Quick Start for New Sessions

1. Read this file first
2. Check `docs/ARCHITECTURE.md` for contracts
3. Check `docs/THEORETICAL_FOUNDATIONS.md` if unclear on concepts
4. Run `npm run dev` to start development
5. Test changes in browser at `http://localhost:3000`

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run linter
npm run typecheck # Check TypeScript types
```
