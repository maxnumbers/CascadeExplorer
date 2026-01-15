# CascadeExplorer: Implementation Roadmap

## Overview

This document provides a concrete implementation plan for transforming CascadeExplorer from a first-order cybernetic tool into a second-order cybernetic decision support system with:

1. **Conversational Interaction** (Paskian dialogue)
2. **Adaptive User Modeling** (Requisite variety)
3. **Ontological Modularity** (Perspectival heterograph)
4. **Research Grounding** (Evidence-based confidence)
5. **Clear UX** (Value proposition and interaction clarity)

## Phase 0: Preparation

### 0.1 Dependencies to Add

```bash
# Add to package.json

# For web search/grounding
npm install @anthropic-ai/sdk  # Or use existing Genkit with web search plugin

# For state management (conversation state is complex)
npm install zustand  # Lightweight, TypeScript-first state management

# For markdown rendering (in conversation)
npm install react-markdown remark-gfm

# For persistence (optional but recommended)
npm install idb  # IndexedDB wrapper for local persistence
```

### 0.2 File Structure Changes

```
src/
├── types/
│   ├── cascade.ts                # EXISTING - keep for backward compat
│   ├── perspectival-model.ts     # NEW - created in this analysis
│   ├── conversation.ts           # NEW - created in this analysis
│   └── user-model.ts             # NEW - created in this analysis
│
├── ai/
│   └── flows/
│       ├── assertion-reflection.ts      # MODIFY - make iterative
│       ├── generate-impacts-by-order.ts # MODIFY - add bias compensation
│       ├── process-user-message.ts      # NEW - handle conversation turns
│       ├── infer-user-model.ts          # NEW - learn user characteristics
│       ├── generate-perspectives.ts     # NEW - identify relevant perspectives
│       ├── ground-claims.ts             # NEW - evidence search
│       └── detect-feedback-loops.ts     # NEW - find cycles
│
├── store/
│   ├── dialogue-store.ts         # NEW - conversation state
│   ├── model-store.ts            # NEW - system model state
│   └── user-store.ts             # NEW - user model state
│
├── components/
│   └── cascade-explorer/
│       ├── ConversationPanel.tsx    # NEW - chat interface
│       ├── MessageBubble.tsx        # NEW - single message
│       ├── QuickActions.tsx         # NEW - contextual buttons
│       ├── PerspectiveSwitcher.tsx  # NEW - perspective tabs
│       ├── GroundingIndicator.tsx   # NEW - evidence badges
│       ├── AdaptationPanel.tsx      # NEW - show AI adaptation
│       ├── OnboardingFlow.tsx       # NEW - first-time experience
│       ├── StatusBar.tsx            # NEW - progress/state indicator
│       └── [existing components]    # MODIFY as needed
│
└── hooks/
    ├── use-dialogue.ts           # NEW - conversation logic
    ├── use-user-model.ts         # NEW - adaptive behavior
    └── use-grounding.ts          # NEW - evidence fetching
```

---

## Phase 1: Conversational Foundation

**Goal:** Replace linear wizard with dialogue-based interaction

**Duration:** Substantial effort - this is the core transformation

### Task 1.1: Create Zustand Stores

**File:** `src/store/dialogue-store.ts`
```typescript
import { create } from 'zustand';
import { DialogueState, ConversationTurn, AgreementState } from '@/types/conversation';

interface DialogueStore {
  dialogue: DialogueState | null;

  // Actions
  initializeDialogue: () => void;
  addTurn: (turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => void;
  updateAgreement: (update: Partial<AgreementState>) => void;
  setPhase: (phase: DialogueState['phase']) => void;

  // Selectors
  getLastTurn: () => ConversationTurn | null;
  getPendingQuestions: () => AgreementState['pendingQuestions'];
}

export const useDialogueStore = create<DialogueStore>((set, get) => ({
  // Implementation...
}));
```

**File:** `src/store/model-store.ts`
```typescript
import { create } from 'zustand';
import { PerspectivalSystemModel, SystemConcept } from '@/types/perspectival-model';

interface ModelStore {
  model: PerspectivalSystemModel | null;
  activePerspectiveId: string | null;

  // Actions
  initializeModel: (seedAssertion: string) => void;
  addConcept: (concept: SystemConcept) => void;
  updateConcept: (id: string, updates: Partial<SystemConcept>) => void;
  removeConcept: (id: string) => void;
  setActivePerspective: (id: string | null) => void;

  // Selectors
  getFilteredView: () => PerspectiveFilteredView | null;
  getConflicts: () => PerspectiveConflict[];
}

export const useModelStore = create<ModelStore>((set, get) => ({
  // Implementation...
}));
```

### Task 1.2: Create Conversation AI Flow

**File:** `src/ai/flows/process-user-message.ts`
```typescript
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ConversationTurnSchema, DialogueStateSchema } from '@/types/conversation';
import { PerspectivalSystemModelSchema } from '@/types/perspectival-model';

const ProcessUserMessageInputSchema = z.object({
  userMessage: z.string(),
  dialogueHistory: z.array(ConversationTurnSchema),
  currentModel: PerspectivalSystemModelSchema.nullable(),
  userModel: z.any(), // UserCognitiveModel
});

const ProcessUserMessageOutputSchema = z.object({
  aiResponse: z.string(),
  responseType: z.enum(['reflection', 'clarification', 'proposal', 'explanation', 'teachback_request']),
  modelUpdates: z.array(z.object({
    operation: z.enum(['add', 'remove', 'modify']),
    targetType: z.enum(['concept', 'relationship', 'perspective', 'concern']),
    data: z.any(),
  })).optional(),
  suggestedQuickActions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })).optional(),
  questionsForUser: z.array(z.string()).optional(),
});

const processUserMessagePrompt = ai.definePrompt({
  name: 'processUserMessage',
  input: { schema: ProcessUserMessageInputSchema },
  output: { schema: ProcessUserMessageOutputSchema },
  prompt: `You are a collaborative thinking partner in a systems exploration dialogue.

Your role is to help the user understand the system they're describing through Paskian conversation:
- Listen and reflect back your understanding
- Ask clarifying questions when needed
- Propose additions to the system model
- Challenge assumptions when appropriate (based on user's cognitive profile)
- Surface potential blindspots

Current dialogue history:
{{#each dialogueHistory}}
{{actor}}: {{content}}
{{/each}}

Current system model:
{{#if currentModel}}
Concepts: {{json currentModel.concepts}}
Relationships: {{json currentModel.relationships}}
{{else}}
[No model yet - this may be the first message]
{{/if}}

User's cognitive profile (for adaptive responses):
{{json userModel}}

User's latest message: "{{userMessage}}"

Respond conversationally. If this is early in the dialogue, focus on understanding.
If the model is taking shape, focus on refinement and expansion.
Always offer quick action buttons for common responses.

Your response must include:
1. Natural language response (aiResponse)
2. Type of response (responseType)
3. Any model updates you're proposing (modelUpdates)
4. Suggested quick action buttons (suggestedQuickActions)
5. Any questions you need answered (questionsForUser)
`,
});

export async function processUserMessage(input: z.infer<typeof ProcessUserMessageInputSchema>) {
  const { output } = await processUserMessagePrompt(input);
  return output!;
}
```

### Task 1.3: Create Conversation Panel Component

**File:** `src/components/cascade-explorer/ConversationPanel.tsx`
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useDialogueStore } from '@/store/dialogue-store';
import { useModelStore } from '@/store/model-store';
import { processUserMessage } from '@/ai/flows/process-user-message';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Send } from 'lucide-react';

export function ConversationPanel() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { dialogue, addTurn } = useDialogueStore();
  const { model, addConcept, updateConcept } = useModelStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [dialogue?.turns]);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    // Add user turn
    addTurn({
      actor: 'user',
      moveType: 'assertion', // or determine from context
      content: input,
    });

    setInput('');
    setIsProcessing(true);

    try {
      const response = await processUserMessage({
        userMessage: input,
        dialogueHistory: dialogue?.turns || [],
        currentModel: model,
        userModel: {}, // Get from user store
      });

      // Add AI turn
      addTurn({
        actor: 'ai',
        moveType: response.responseType,
        content: response.aiResponse,
        structuredContent: {
          modelDelta: response.modelUpdates,
        },
      });

      // Apply model updates
      response.modelUpdates?.forEach(update => {
        if (update.operation === 'add' && update.targetType === 'concept') {
          addConcept(update.data);
        }
        // Handle other operations...
      });

    } catch (error) {
      console.error('Error processing message:', error);
      // Handle error...
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {dialogue?.turns.map(turn => (
          <MessageBubble key={turn.id} turn={turn} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {dialogue?.turns.length > 0 && (
        <QuickActions
          lastTurn={dialogue.turns[dialogue.turns.length - 1]}
          onAction={(action) => setInput(action)}
        />
      )}

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share an idea, ask a question, or challenge something..."
            className="flex-1 resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <Button size="icon" variant="outline">
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Task 1.4: Modify Main Page Layout

**File:** `src/app/page.tsx` - Restructure to use new components

```typescript
// Key changes:
// 1. Split into ConversationPanel (left) and VisualizationPanel (right)
// 2. Remove linear wizard steps
// 3. Add status bar at bottom
// 4. Initialize stores instead of useState

export default function CascadeExplorerPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b p-4">
        <h1>CascadeExplorer</h1>
        <nav>{/* New nav items */}</nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">
        {/* Conversation - 60% */}
        <div className="w-3/5 border-r">
          <ConversationPanel />
        </div>

        {/* Visualization - 40% */}
        <div className="w-2/5">
          <PerspectiveSwitcher />
          <PerspectivalGraph /> {/* Modified from NetworkGraph */}
          <FocusIndicator />
        </div>
      </main>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
```

---

## Phase 2: Adaptive User Modeling

**Goal:** Learn about users and adapt outputs

### Task 2.1: User Model Inference Flow

**File:** `src/ai/flows/infer-user-model.ts`
```typescript
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { UserCognitiveModelSchema, InferenceSignalSchema } from '@/types/user-model';
import { ConversationTurnSchema } from '@/types/conversation';

const InferUserModelInputSchema = z.object({
  recentTurns: z.array(ConversationTurnSchema),
  currentModel: UserCognitiveModelSchema,
});

const InferUserModelOutputSchema = z.object({
  signals: z.array(InferenceSignalSchema),
  updatedModel: UserCognitiveModelSchema,
  reasoning: z.string(),
});

const inferUserModelPrompt = ai.definePrompt({
  name: 'inferUserModel',
  input: { schema: InferUserModelInputSchema },
  output: { schema: InferUserModelOutputSchema },
  prompt: `Analyze the user's messages to update our understanding of their cognitive profile.

Look for signals of:
1. OPTIMISM/PESSIMISM: Do they focus on positive or negative outcomes?
2. COGNITIVE BIASES: Confirmation seeking, anchoring, overconfidence, etc.
3. EXPERTISE: Domain jargon, nuanced vs. simplified understanding
4. ROLE: Are they a decision-maker, analyst, implementer?
5. PREFERENCES: Do they want detail or summary? Visual or textual?

Current user model:
{{json currentModel}}

Recent conversation turns:
{{#each recentTurns}}
{{actor}}: {{content}}
{{/each}}

For each signal you detect:
- Quote the specific text
- Identify what dimension it affects
- Rate signal strength
- Explain your interpretation

Then update the user model accordingly. Be conservative - only update with moderate+ confidence signals.
`,
});

export async function inferUserModel(input: z.infer<typeof InferUserModelInputSchema>) {
  const { output } = await inferUserModelPrompt(input);
  return output!;
}
```

### Task 2.2: Bias Compensation Logic

**File:** `src/ai/flows/compute-compensation-strategy.ts`
```typescript
import { UserCognitiveModel, BiasCompensationStrategy, DEFAULT_COMPENSATION_STRATEGY } from '@/types/user-model';

export function computeCompensationStrategy(userModel: UserCognitiveModel): BiasCompensationStrategy {
  const { optimismPessimism, cognitiveBiases, expertiseProfile, userRole } = userModel;

  // Start with defaults
  let strategy = { ...DEFAULT_COMPENSATION_STRATEGY };

  // Adjust for optimism/pessimism
  if (optimismPessimism.confidence > 0.5) {
    // If user is optimistic, lean toward surfacing risks
    // If pessimistic, lean toward opportunities
    strategy.riskOpportunityBalance = -optimismPessimism.score * 0.5;

    if (optimismPessimism.score > 0.3) {
      strategy.strategyExplanation =
        "I notice you tend toward optimistic framing, so I'm surfacing more risks and challenges " +
        "to balance your analysis.";
    } else if (optimismPessimism.score < -0.3) {
      strategy.strategyExplanation =
        "I notice you tend toward cautious/pessimistic framing, so I'm highlighting more " +
        "opportunities and positive outcomes to balance your analysis.";
    }
  }

  // Adjust for confirmation bias
  const confirmationBias = cognitiveBiases.find(b => b.biasType === 'confirmation_bias');
  if (confirmationBias && confirmationBias.strength !== 'weak') {
    strategy.disconfirmationStrength = confirmationBias.strength === 'strong' ? 0.7 : 0.5;
    strategy.biasCountermeasures.push({
      targetBias: 'confirmation_bias',
      countermeasure: 'Actively present evidence and scenarios that challenge stated assumptions',
      applicationTrigger: 'When user makes confident assertions',
    });
  }

  // Highlight blindspot domains
  for (const blindspot of expertiseProfile.blindspotDomains) {
    strategy.blindspotHighlighting.push({
      domain: blindspot.domain,
      highlightStrength: 'moderate',
      reason: `User shows limited awareness of ${blindspot.domain} considerations`,
    });
  }

  // Adjust abstraction level
  if (userRole.roleCategory === 'decision_maker') {
    strategy.abstractionAdjustment = {
      direction: 'more_abstract',
      reason: 'User appears to be in decision-maker role, prioritizing strategic view',
    };
  } else if (userRole.roleCategory === 'implementer') {
    strategy.abstractionAdjustment = {
      direction: 'more_concrete',
      reason: 'User appears to be in implementer role, prioritizing actionable detail',
    };
  }

  return strategy;
}
```

### Task 2.3: Adaptation Panel Component

**File:** `src/components/cascade-explorer/AdaptationPanel.tsx`
```typescript
'use client';

import { useUserStore } from '@/store/user-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function AdaptationPanel() {
  const { userModel, compensationStrategy, updateStrategy, resetStrategy } = useUserStore();

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">How I'm Adapting to You</h3>

      <div className="space-y-4">
        {/* Detected characteristics */}
        <div>
          <h4 className="text-sm text-muted-foreground">Based on our conversation:</h4>
          <ul className="text-sm mt-2 space-y-1">
            {userModel.optimismPessimism.score > 0.2 && (
              <li>• You seem optimistic about outcomes</li>
            )}
            {userModel.optimismPessimism.score < -0.2 && (
              <li>• You seem cautious about outcomes</li>
            )}
            {userModel.expertiseProfile.expertDomains.map(d => (
              <li key={d.domain}>• Strong expertise in {d.domain}</li>
            ))}
            {userModel.expertiseProfile.blindspotDomains.map(d => (
              <li key={d.domain}>• Less focus on {d.domain} considerations</li>
            ))}
          </ul>
        </div>

        {/* Current strategy */}
        <div>
          <h4 className="text-sm text-muted-foreground">So I'm:</h4>
          <p className="text-sm mt-2">{compensationStrategy.strategyExplanation}</p>
        </div>

        {/* Manual adjustment */}
        <div>
          <h4 className="text-sm text-muted-foreground mb-2">Adjust balance:</h4>
          <div className="flex items-center gap-4">
            <span className="text-xs">More risks</span>
            <Slider
              value={[compensationStrategy.riskOpportunityBalance]}
              min={-1}
              max={1}
              step={0.1}
              onValueChange={([v]) => updateStrategy({ riskOpportunityBalance: v })}
            />
            <span className="text-xs">More opportunities</span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={resetStrategy}>
          Reset to Balanced
        </Button>
      </div>
    </Card>
  );
}
```

---

## Phase 3: Ontological Modularity

**Goal:** Implement perspective-dependent views

### Task 3.1: Perspective Generation Flow

**File:** `src/ai/flows/generate-perspectives.ts`
```typescript
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PerspectiveSchema } from '@/types/perspectival-model';

const GeneratePerspectivesInputSchema = z.object({
  assertion: z.string(),
  currentConcepts: z.array(z.object({
    name: z.string(),
    conceptType: z.string(),
  })),
});

const GeneratePerspectivesOutputSchema = z.object({
  perspectives: z.array(PerspectiveSchema),
  reasoning: z.string(),
});

const generatePerspectivesPrompt = ai.definePrompt({
  name: 'generatePerspectives',
  input: { schema: GeneratePerspectivesInputSchema },
  output: { schema: GeneratePerspectivesOutputSchema },
  prompt: `Given a user's assertion and the concepts identified, determine the relevant perspectives (stakeholders/viewpoints) that should be considered.

Assertion: "{{assertion}}"

Identified concepts:
{{#each currentConcepts}}
- {{name}} ({{conceptType}})
{{/each}}

For each perspective, identify:
1. A clear name (e.g., "Executive Leadership", "End User", "Technical Team")
2. Which archetype they fit (decision_maker, implementer, operator, etc.)
3. Their expertise domains
4. Their key concerns and priorities
5. Their relationship to the system (internal, external, boundary)
6. Their preferred abstraction level
7. Known biases or blindspots this perspective might have
8. What information they typically have access to

Generate 3-5 distinct perspectives that would see this system differently.
Ensure at least one internal and one external perspective.
`,
});

export async function generatePerspectives(input: z.infer<typeof GeneratePerspectivesInputSchema>) {
  const { output } = await generatePerspectivesPrompt(input);
  return output!;
}
```

### Task 3.2: Perspective-Specific Analysis Flow

**File:** `src/ai/flows/perspective-specific-analysis.ts`
```typescript
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PerspectiveSchema, SystemConceptSchema, ConceptRelationshipSchema, ConcernHyperedgeSchema } from '@/types/perspectival-model';

const PerspectiveAnalysisInputSchema = z.object({
  perspective: PerspectiveSchema,
  baseConcepts: z.array(SystemConceptSchema),
  baseRelationships: z.array(ConceptRelationshipSchema),
});

const PerspectiveAnalysisOutputSchema = z.object({
  // Concepts specific to this perspective's view
  additionalConcepts: z.array(SystemConceptSchema),

  // How this perspective decomposes existing concepts
  decompositions: z.array(z.object({
    parentConceptId: z.string(),
    childConcepts: z.array(SystemConceptSchema),
    decompositionRationale: z.string(),
  })),

  // Relationships this perspective sees
  visibleRelationships: z.array(z.string()), // IDs of base relationships
  additionalRelationships: z.array(ConceptRelationshipSchema),

  // Concerns this perspective prioritizes
  prioritizedConcerns: z.array(ConcernHyperedgeSchema),

  // What this perspective can't see (for surfacing blindspots)
  blindspots: z.array(z.object({
    description: z.string(),
    relatedConceptIds: z.array(z.string()),
    reason: z.string(),
  })),
});

const perspectiveAnalysisPrompt = ai.definePrompt({
  name: 'perspectiveAnalysis',
  input: { schema: PerspectiveAnalysisInputSchema },
  output: { schema: PerspectiveAnalysisOutputSchema },
  prompt: `Analyze the system from a specific perspective.

Perspective: {{json perspective}}

Base concepts:
{{#each baseConcepts}}
- {{name}} ({{conceptType}}): {{description}}
{{/each}}

Base relationships:
{{#each baseRelationships}}
- {{sourceId}} --{{relationshipType}}--> {{targetId}}
{{/each}}

From this perspective:

1. ADDITIONAL CONCEPTS: What concepts would this perspective add that aren't in the base model?
   (Think: what do they care about that others might not?)

2. DECOMPOSITIONS: How would this perspective break down existing concepts?
   (e.g., an engineer might decompose "Software" into "Frontend, Backend, Database")
   Only decompose where it makes sense for this perspective's expertise.

3. VISIBLE RELATIONSHIPS: Which base relationships would this perspective see?
   (Some relationships are invisible to certain perspectives)

4. ADDITIONAL RELATIONSHIPS: What relationships does this perspective see that aren't in base?

5. PRIORITIZED CONCERNS: What shared concerns (hyperedges) does this perspective prioritize?
   Rate them: critical, important, minor, invisible

6. BLINDSPOTS: What can't or won't this perspective see?
   This is crucial for surfacing gaps.
`,
});

export async function perspectiveSpecificAnalysis(input: z.infer<typeof PerspectiveAnalysisInputSchema>) {
  const { output } = await perspectiveAnalysisPrompt(input);
  return output!;
}
```

### Task 3.3: Perspective Switcher Component

**File:** `src/components/cascade-explorer/PerspectiveSwitcher.tsx`
```typescript
'use client';

import { useModelStore } from '@/store/model-store';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

export function PerspectiveSwitcher() {
  const { model, activePerspectiveId, setActivePerspective } = useModelStore();

  if (!model || model.perspectives.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-b">
      <h3 className="text-sm font-medium mb-2">View From Perspective:</h3>
      <Tabs value={activePerspectiveId || 'all'} onValueChange={setActivePerspective}>
        <TabsList>
          <TabsTrigger value="all">
            <Eye className="h-4 w-4 mr-1" />
            All
          </TabsTrigger>
          {model.perspectives.map(p => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.name}
              {p.knownBiases && p.knownBiases.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {p.knownBiases.length} blindspots
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activePerspectiveId && activePerspectiveId !== 'all' && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>
            Showing what "{model.perspectives.find(p => p.id === activePerspectiveId)?.name}" sees.
            <button className="underline ml-1" onClick={() => {/* show blindspots */}}>
              View their blindspots
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
```

### Task 3.4: Conflict Surfacing Component

**File:** `src/components/cascade-explorer/ConflictSurface.tsx`
```typescript
'use client';

import { useModelStore } from '@/store/model-store';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function ConflictSurface() {
  const { model } = useModelStore();

  if (!model?.perspectiveConflicts?.length) {
    return null;
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-sm font-medium">Perspective Conflicts</h3>
      {model.perspectiveConflicts.map(conflict => (
        <Alert key={conflict.id} variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {conflict.conflictType.charAt(0).toUpperCase() + conflict.conflictType.slice(1)} Conflict
          </AlertTitle>
          <AlertDescription>
            <p>{conflict.description}</p>
            <div className="mt-2 space-y-1">
              {conflict.perspectiveViews.map(pv => (
                <div key={pv.perspectiveId} className="text-xs">
                  <strong>{pv.perspectiveId}</strong>: {pv.view}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## Phase 4: Research Grounding

**Goal:** Connect claims to evidence

### Task 4.1: Evidence Search Flow

**File:** `src/ai/flows/ground-claims.ts`
```typescript
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GroundClaimsInputSchema = z.object({
  claims: z.array(z.object({
    id: z.string(),
    claim: z.string(),
    context: z.string().optional(),
  })),
  searchPreferences: z.object({
    sourceTypes: z.array(z.enum(['academic', 'news', 'industry_report', 'case_study', 'government_data'])),
    maxSourcesPerClaim: z.number(),
  }).optional(),
});

const GroundClaimsOutputSchema = z.object({
  groundedClaims: z.array(z.object({
    claimId: z.string(),
    searchQueries: z.array(z.string()),
    evidence: z.array(z.object({
      sourceType: z.string(),
      title: z.string(),
      summary: z.string(),
      relevance: z.number(),
      relationship: z.enum(['supports', 'contradicts', 'complicates', 'contextualizes']),
      url: z.string().optional(),
    })),
    priorConfidence: z.number(),
    posteriorConfidence: z.number(),
    confidenceReasoning: z.string(),
  })),
});

// Note: This would integrate with web search capabilities
// The implementation depends on available search APIs

export async function groundClaims(input: z.infer<typeof GroundClaimsInputSchema>) {
  // 1. Generate search queries for each claim
  // 2. Execute searches (web search, academic API, etc.)
  // 3. Evaluate relevance and quality of results
  // 4. Synthesize evidence for each claim
  // 5. Update confidence scores

  // Placeholder implementation
  return {
    groundedClaims: input.claims.map(c => ({
      claimId: c.id,
      searchQueries: [],
      evidence: [],
      priorConfidence: 0.5,
      posteriorConfidence: 0.5,
      confidenceReasoning: 'No search performed - implementation pending',
    })),
  };
}
```

### Task 4.2: Grounding Indicator Component

**File:** `src/components/cascade-explorer/GroundingIndicator.tsx`
```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface GroundingIndicatorProps {
  status: 'ungrounded' | 'partially_grounded' | 'well_grounded' | 'contradicted';
  confidence: number;
  evidenceCount: number;
  onClick?: () => void;
}

export function GroundingIndicator({ status, confidence, evidenceCount, onClick }: GroundingIndicatorProps) {
  const config = {
    ungrounded: { icon: BookOpen, color: 'bg-gray-500', label: 'Speculative' },
    partially_grounded: { icon: AlertCircle, color: 'bg-yellow-500', label: 'Partial Evidence' },
    well_grounded: { icon: CheckCircle, color: 'bg-green-500', label: 'Well Grounded' },
    contradicted: { icon: XCircle, color: 'bg-red-500', label: 'Contradicted' },
  }[status];

  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`cursor-pointer ${config.color} text-white`}
          onClick={onClick}
        >
          <Icon className="h-3 w-3 mr-1" />
          {Math.round(confidence * 100)}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
        <p className="text-xs">{evidenceCount} sources</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## Phase 5: UX Polish

### Task 5.1: Onboarding Flow

**File:** `src/components/cascade-explorer/OnboardingFlow.tsx`

A multi-step introduction for new users demonstrating the tool's value.

### Task 5.2: Status Bar

**File:** `src/components/cascade-explorer/StatusBar.tsx`

Shows current phase, agreement state, and adaptation mode.

### Task 5.3: Updated Landing/Welcome

Modify `src/app/page.tsx` to include clear value proposition before user starts exploring.

---

## Testing Strategy

### Unit Tests
- Zustand store actions
- Compensation strategy computation
- Perspective filtering logic

### Integration Tests
- Conversation flow (user message → AI response → model update)
- Perspective generation and switching
- Evidence grounding pipeline

### E2E Tests
- Complete user journey (new user onboarding)
- Returning user session resume
- Multi-perspective exploration

---

## Migration Strategy

1. **Phase 1** can be developed alongside existing code
2. Feature flag to switch between old wizard and new conversation
3. Gradually migrate users as new features stabilize
4. Keep old flow for fallback during transition

---

## Success Metrics

1. **Engagement**: Time spent in tool, turns per session
2. **Refinement**: % of AI proposals that get refined vs. accepted as-is
3. **Perspective Usage**: How often users switch perspectives
4. **Grounding**: How often users request evidence
5. **Return Usage**: Users coming back for new explorations
6. **User Feedback**: Qualitative satisfaction with adaptation

---

*This roadmap provides a concrete path from current state to the vision of a second-order cybernetic decision support tool.*
