# CascadeExplorer: UX Design & Research Grounding

## Part 1: UX Problems & Solutions

### 1.1 Current UX Issues

Based on the analysis, the current UX has several fundamental problems:

| Issue | Description | Impact |
|-------|-------------|--------|
| **Unclear Value Proposition** | Landing page doesn't explain what the tool does or why | Users don't know if this is useful for them |
| **Ambiguous Interaction Model** | Mix of wizard steps and passive viewing | Users don't know what actions are available |
| **Missing Conversation** | User can only input once then watch | Users can't refine, challenge, or explore |
| **No Progress Indication** | Linear steps without context | Users don't know where they are or what's next |
| **Goal Options Are Abstract** | "Test a Decision" etc. don't communicate clearly | Users can't map their need to the right option |
| **No Onboarding** | Tool assumes familiarity with systems thinking | New users are lost |
| **Passive Graph Viewing** | Graph is shown but not explained | Users don't know how to interpret or interact |

### 1.2 Core UX Principles for Redesign

1. **Show, Don't Tell** - Demonstrate value through interaction, not explanation
2. **Progressive Disclosure** - Reveal complexity as user needs it
3. **Conversational Primary** - Chat as the main interaction, visualization as enrichment
4. **Transparent AI** - Show what the AI is thinking and why
5. **User Agency** - User can always challenge, refine, redirect
6. **Clear State** - Always obvious what mode we're in and what's possible

### 1.3 Redesigned Information Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: CascadeExplorer - Dynamic Systems Thinking Partner             │
│  [New Exploration] [History] [Settings] [Help]                         │
├────────────────────────────────────────┬────────────────────────────────┤
│                                        │                                │
│  CONVERSATION PANEL (60%)              │  VISUALIZATION PANEL (40%)     │
│                                        │                                │
│  ┌──────────────────────────────────┐  │  ┌────────────────────────────┐│
│  │ Welcome! I'm your thinking       │  │  │                            ││
│  │ partner. Share an idea,          │  │  │   [Graph renders here]     ││
│  │ decision, or question you'd      │  │  │                            ││
│  │ like to explore...               │  │  │                            ││
│  └──────────────────────────────────┘  │  └────────────────────────────┘│
│                                        │                                │
│  ┌──────────────────────────────────┐  │  ┌────────────────────────────┐│
│  │ User: "We're thinking about      │  │  │  PERSPECTIVE SWITCHER      ││
│  │        switching to microservices│  │  │  [All] [Tech] [Exec] [Ops] ││
│  │        for our platform"         │  │  └────────────────────────────┘│
│  └──────────────────────────────────┘  │                                │
│                                        │  ┌────────────────────────────┐│
│  ┌──────────────────────────────────┐  │  │  CURRENT FOCUS             ││
│  │ AI: "I see you're considering a  │  │  │  ► System Model (3 stocks, ││
│  │      significant architecture    │  │  │    4 agents, 7 incentives) ││
│  │      change. Let me understand:  │  │  │  ○ 1st Order Impacts       ││
│  │      Is this driven by scaling   │  │  │  ○ 2nd Order Impacts       ││
│  │      needs, team organization,   │  │  │  ○ 3rd Order Impacts       ││
│  │      or something else?          │  │  └────────────────────────────┘│
│  │                                  │  │                                │
│  │  [Scaling] [Team] [Something Else]│  │  ┌────────────────────────────┐│
│  └──────────────────────────────────┘  │  │  ACTIONS                   ││
│                                        │  │  [Deepen] [Ground] [Simulate]│
│  ┌──────────────────────────────────┐  │  └────────────────────────────┘│
│  │ [Type a response or question...] │  │                                │
│  │                              [📎][🎤]│  │                               │
│  └──────────────────────────────────┘  │                                │
│                                        │                                │
├────────────────────────────────────────┴────────────────────────────────┤
│  STATUS BAR: Phase: Exploring | Agreed: 5 concepts | Open: 2 questions  │
│              Adaptation: Balanced (click to adjust)                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Conversational UX Flow

**Phase 1: Welcome & Seeding**
```
AI: "Welcome! I'm your thinking partner for exploring complex ideas.

    I can help you:
    • Explore consequences of decisions before you make them
    • Find blind spots and risks you might be missing
    • Understand systems from multiple perspectives
    • Ground your thinking in evidence

    What would you like to explore today?"

User: [Types or speaks their idea]
```

**Phase 2: Collaborative Reflection**
```
AI: "I'm hearing [summary of assertion]. Let me share how I'm understanding this...

    Key elements I see:
    • [Stock 1]: [description]
    • [Stock 2]: [description]

    Key players:
    • [Agent 1]: motivated by [incentive]
    • [Agent 2]: motivated by [incentive]

    Does this match your understanding? [Yes, mostly] [Let me clarify] [You're missing something]"

    [Visual: System model graph appears in visualization panel]

User: [Selects or types response]
```

**Phase 3: Iterative Refinement**
```
AI: "You mentioned I'm missing something - what should I include?"

User: "There's also the regulatory angle - we need to consider compliance."

AI: "Ah, important point. Adding 'Regulatory Compliance' as a stock and 'Regulators' as an agent.
    They have an incentive to [inferred incentive].
    Is that right, or does it work differently in your context?"

    [Visual: Graph updates with new elements highlighted]
```

**Phase 4: Impact Exploration**
```
AI: "Now let's explore what might happen. I'll generate some potential first-order impacts.

    Based on [assertion], some immediate effects might be:
    1. [Impact 1] - [brief explanation]
    2. [Impact 2] - [brief explanation]
    3. [Impact 3] - [brief explanation]

    Which of these feel most relevant? Any I should add or remove?
    [All look right] [Challenge #X] [Add something]"
```

**Phase 5: Perspective Switching**
```
AI: "Let me show you this from different angles.

    From the Engineering perspective:
    • [Technical concerns highlighted]

    From the Executive perspective:
    • [Strategic concerns highlighted]

    From the Operations perspective:
    • [Operational concerns highlighted]

    Notice how [conflict/blindspot]. This is worth examining."

    [Visual: Perspective tabs active, different views showing]
```

### 1.5 Key UI Components

#### 1.5.1 Conversation Panel

**Design:**
- Chat-style interface on the left (60% width)
- AI messages include:
  - Natural language explanation
  - Quick-action buttons for common responses
  - Inline model updates (highlighted in chat)
- User messages can be:
  - Free text
  - Voice input
  - Button selections
  - Model element references (clickable from graph)

**Quick Actions (contextual buttons):**
- Agreement: [Yes, exactly] [Mostly right] [Not quite]
- Challenge: [I disagree because...] [What about...?]
- Redirect: [Let's focus on...] [Show me from X perspective]
- Deepen: [Tell me more] [What are the risks?] [What's the evidence?]

#### 1.5.2 Visualization Panel

**Design:**
- On the right (40% width)
- Shows current model state
- Synchronized with conversation (highlights as discussed)

**Elements:**
- **Perspective Tabs**: Switch between viewpoints
- **Focus Indicator**: Shows current depth (system → 1st order → etc.)
- **Graph View**: D3 visualization with:
  - Clickable nodes → shows details in conversation
  - Draggable for user arrangement
  - Perspective-dependent coloring/visibility
- **Legend**: Always visible, explains current visualization

#### 1.5.3 Status Bar

**Design:**
- Fixed at bottom
- Shows:
  - Current phase (with progress dots)
  - Agreement state (X concepts agreed, Y open questions)
  - Adaptation mode (click to see/adjust AI compensation)

**Adaptation Panel (expandable):**
```
┌─────────────────────────────────────────────────────────────┐
│  HOW I'M ADAPTING TO YOU                                    │
│                                                             │
│  Based on our conversation, I've noticed:                   │
│  • You seem moderately optimistic about outcomes            │
│  • You have strong technical expertise                      │
│  • You're less familiar with operational concerns           │
│                                                             │
│  So I'm:                                                    │
│  • Surfacing slightly more risks than opportunities         │
│  • Giving you technical detail                              │
│  • Highlighting operational blind spots                     │
│                                                             │
│  [Adjust] [Reset to Balanced] [Learn More]                 │
└─────────────────────────────────────────────────────────────┘
```

#### 1.5.4 Onboarding Flow (First Visit)

**Step 1: Welcome**
```
"CascadeExplorer helps you think through complex decisions by:
 1. Mapping out the system you're operating in
 2. Exploring cascading effects of your choices
 3. Seeing things from multiple perspectives
 4. Grounding your analysis in evidence

 Ready to try? Let's explore a sample decision together."
 [Start Interactive Demo] [Skip to Main Tool]
```

**Step 2: Interactive Demo**
- Uses a concrete example ("Should we adopt remote-first work policy?")
- Walks through each phase
- Shows what each visualization element means
- Takes 2-3 minutes

**Step 3: Main Tool**
- User now has context for what each element does
- Tooltips available for reminders

### 1.6 Mobile Considerations

**Responsive Behavior:**
- On mobile: Single-panel mode (conversation primary)
- Visualization accessible via bottom sheet (swipe up)
- Voice input becomes primary input method
- Simplified graph (list view option)

---

## Part 2: Research Grounding Mechanism

### 2.1 The Problem

Currently, all system models and impacts are AI-generated speculation. While this is useful for exploration, it limits:
- **Credibility**: User can't distinguish fact from fiction
- **Decision Support**: No connection to empirical reality
- **Learning**: User doesn't gain new factual knowledge

### 2.2 Grounding Types

Not all claims need the same kind of grounding:

| Grounding Type | Description | Example |
|----------------|-------------|---------|
| **Empirical** | Backed by data/research | "Remote work increases productivity by 13% (Stanford, 2020)" |
| **Theoretical** | Based on established theory | "According to Ashby's Law of Requisite Variety..." |
| **Analogical** | Similar case/precedent | "When Netflix shifted to streaming, they faced similar..." |
| **Expert Opinion** | Domain expert view | "According to Martin Fowler, microservices are best when..." |
| **Speculative** | Plausible but ungrounded | "This might lead to reduced team cohesion" |

### 2.3 Grounding Pipeline Architecture

```
User Assertion → System Model → Impacts → Claims to Ground
                                              ↓
                                    ┌─────────────────────┐
                                    │ Claim Prioritization│
                                    │ (What needs grounding?)
                                    └─────────┬───────────┘
                                              ↓
                                    ┌─────────────────────┐
                                    │ Evidence Search     │
                                    │ (Web, Academic, Cases)
                                    └─────────┬───────────┘
                                              ↓
                                    ┌─────────────────────┐
                                    │ Evidence Evaluation │
                                    │ (Relevance, Quality)│
                                    └─────────┬───────────┘
                                              ↓
                                    ┌─────────────────────┐
                                    │ Confidence Scoring  │
                                    │ (Update claim conf.)│
                                    └─────────┬───────────┘
                                              ↓
                                    ┌─────────────────────┐
                                    │ Presentation        │
                                    │ (Show to user)      │
                                    └─────────────────────┘
```

### 2.4 Grounding Schema

```typescript
interface GroundedClaim {
  id: string;
  claim: string;  // The statement being evaluated

  groundingStatus: 'ungrounded' | 'searching' | 'partially_grounded' | 'well_grounded' | 'contradicted';

  evidence: Evidence[];

  confidence: {
    priorConfidence: number;     // Before evidence (AI's initial assessment)
    posteriorConfidence: number; // After evidence (updated)
    confidenceChange: number;    // How much evidence changed it
    reasoning: string;
  };

  // What would change this assessment
  sensitivities: {
    whatWouldStrengthen: string[];
    whatWouldWeaken: string[];
  };
}

interface Evidence {
  id: string;
  sourceType: 'academic' | 'news' | 'industry_report' | 'case_study' | 'government_data' | 'expert_opinion';

  source: {
    title: string;
    authors?: string[];
    publication?: string;
    date?: string;
    url?: string;
  };

  relevance: {
    score: number;  // 0-1
    reasoning: string;  // Why this is relevant
  };

  quality: {
    score: number;  // 0-1
    factors: {
      recency: number;
      authority: number;
      methodology?: number;
      sampleSize?: number;
    };
  };

  summary: string;  // Key point from this evidence

  relationship: 'supports' | 'contradicts' | 'complicates' | 'contextualizes';
}
```

### 2.5 Claim Prioritization

Not all claims are worth grounding. Priority based on:

1. **Impact on Decision**: How much would this change the user's choice?
2. **User Uncertainty**: Did user express doubt about this?
3. **Controversy**: Is this contested among perspectives?
4. **Specificity**: Specific claims are more groundable than vague ones

**Priority Score = Impact × (1 + Uncertainty) × (1 + Controversy) × Specificity**

### 2.6 Evidence Search Strategy

**Sources (in priority order):**
1. Academic databases (Google Scholar, Semantic Scholar)
2. Government/institutional data (WHO, OECD, national statistics)
3. Industry reports (McKinsey, Gartner, etc.)
4. News (recent, from reputable sources)
5. Case studies (Harvard Business Review, etc.)

**Search Process:**
```
1. Extract key terms from claim
2. Generate search queries (multiple phrasings)
3. Execute searches across sources
4. Rank results by relevance
5. Extract summaries from top results
6. Evaluate evidence quality
7. Synthesize findings
```

### 2.7 Presentation of Grounded Claims

**In Conversation:**
```
AI: "You mentioned [claim]. Let me check what evidence exists...

    📊 I found relevant data:

    SUPPORTING:
    • A 2023 Stanford study found [finding] among [sample]
    • McKinsey reports that [statistic]

    COMPLICATING:
    • However, a Harvard case study of [company] showed [contrary finding]

    My confidence in [claim] is now MEDIUM (was HIGH before evidence search).

    Sources: [expandable links]

    Does this change your thinking?"
```

**In Visualization:**
```
[Impact node with grounding indicator]

● High confidence (well-grounded)
◐ Medium confidence (partially grounded)
○ Low confidence (speculation)
⊘ Contradicted by evidence
```

### 2.8 User Control Over Grounding

```
┌─────────────────────────────────────────────────────────────┐
│  GROUNDING PREFERENCES                                      │
│                                                             │
│  How much should I verify claims?                           │
│  ○ Exploration Mode - Generate freely, ground key claims    │
│  ● Balanced Mode - Ground most claims, flag speculation     │
│  ○ Evidence-First - Only present well-grounded claims       │
│                                                             │
│  Source preferences:                                        │
│  ☑ Academic/Research                                        │
│  ☑ Industry Reports                                         │
│  ☐ News Articles                                            │
│  ☑ Government Data                                          │
│                                                             │
│  [Save Preferences]                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Complete User Journey

### 3.1 New User Journey

```
1. LAND
   - See clear value proposition
   - "Think through decisions before you make them"
   - [Start Exploring] [See Demo]

2. ONBOARD (optional, ~2 min)
   - Interactive demo with sample decision
   - Learn what each element means

3. SEED
   - Welcome message invites input
   - User shares their idea/decision
   - Voice or text input

4. REFLECT
   - AI shares understanding
   - System model visualizes
   - User can refine/challenge

5. EXPAND
   - Impacts generated conversationally
   - Each can be challenged/refined
   - Grounding available on request

6. PERSPECTIVE
   - Multiple viewpoints shown
   - Conflicts surfaced
   - User chooses focus

7. GROUND (optional)
   - Key claims verified
   - Evidence presented
   - Confidence updated

8. SIMULATE (optional)
   - Temporal progression
   - "What happens over time?"
   - Intervention scenarios

9. SYNTHESIZE
   - Summary narrative
   - Key insights highlighted
   - Actionable takeaways

10. EXPORT/CONTINUE
    - Save session
    - Export report
    - Continue exploring
```

### 3.2 Returning User Journey

```
1. RESUME
   - See past explorations
   - Continue where left off
   - Or start new

2. SHORTCUT
   - Quick access to deepen existing
   - "What happened since last time?"
   - Compare evolved thinking
```

### 3.3 Expert User Journey

```
1. CONFIGURE
   - Set preferences upfront
   - Enable advanced features
   - Custom perspectives

2. RAPID INPUT
   - Paste complex context
   - Multiple assertions
   - Structured input option

3. POWER FEATURES
   - Direct model editing
   - Custom feedback loops
   - Export to other tools
```

---

## Part 4: Implementation Priorities

### High Priority (Foundation)
1. Conversational UI redesign
2. Iterative reflection flow
3. Agreement tracking
4. Clear value proposition

### Medium Priority (Enhancement)
5. Perspective switching
6. Basic evidence grounding
7. User model inference
8. Adaptive compensation

### Lower Priority (Advanced)
9. Temporal simulation
10. Full heterograph model
11. Multi-user collaboration
12. API/export features
