/**
 * @fileOverview Conversation Hook
 *
 * Provides the main interface for conversational interaction with the AI.
 * Handles message processing, model updates, and adaptive responses.
 *
 * IMPORTANT: This hook now generates the FULL perspectival model including:
 * - Concepts (with types, domains, abstraction levels)
 * - Relationships (with polarity, strength)
 * - Perspectives (with archetypes, expertise domains, known biases)
 * - Concerns as hyperedges (connecting multiple concepts)
 */

'use client';

import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { useModelStore } from '@/store/model-store';
import { useUserModelStore } from '@/store/user-model-store';
import type { Message } from '@/ai/client';
import type {
  SystemConcept,
  ConceptRelationship,
  Perspective,
  ConcernHyperedge,
  KnowledgeDomain,
  AbstractionLevel,
} from '@/types/perspectival-model';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const SYSTEM_PROMPTS = {
  welcome: `You are a collaborative thinking partner in a systems exploration tool called CascadeExplorer.

Your role is to help users think through complex decisions by:
1. Understanding their ideas and decisions
2. Mapping out system concepts and relationships
3. Surfacing multiple stakeholder perspectives
4. Identifying shared concerns across perspectives
5. Grounding analysis when helpful

Start by warmly welcoming the user and explaining what you can help them with.

You should:
- Ask clarifying questions when needed
- Surface potential blind spots
- Challenge assumptions when appropriate
- Offer multiple perspectives
- Be concise but thorough`,

  reflecting: `You are analyzing the user's initial assertion to extract a comprehensive system model.

Your task is to generate a COMPLETE perspectival system model including:
1. CONCEPTS - Key entities, resources, actors, processes in the system
2. RELATIONSHIPS - How concepts influence each other
3. PERSPECTIVES - Different stakeholder viewpoints on the system
4. CONCERNS - Shared issues that connect multiple concepts (hyperedges)

DOMAIN OPTIONS: technical, business, legal, social, environmental, political, economic, psychological, organizational, temporal

ABSTRACTION LEVELS: strategic, tactical, operational, technical

CONCEPT TYPES: resource, actor, artifact, process, constraint, goal, risk, opportunity, metric, capability

RELATIONSHIP TYPES: influences, enables, constrains, competes_with, depends_on, produces, consumes, regulates, monitors, amplifies, dampens

PERSPECTIVE ARCHETYPES: decision_maker, implementer, operator, beneficiary, regulator, competitor, partner, observer

CONCERN ROLES: responsible_for, affected_by, contributes_to, constrains, measures, observes

Return as JSON with this structure:
{
  "summary": "Brief summary of the assertion",
  "reflection": "Your interpretation in 1-2 sentences",

  "concepts": [
    {
      "name": "...",
      "description": "...",
      "conceptType": "resource|actor|artifact|process|constraint|goal|risk|opportunity|metric|capability",
      "domains": ["technical", "business"],
      "abstractionLevel": "strategic|tactical|operational|technical"
    }
  ],

  "relationships": [
    {
      "sourceName": "Concept A",
      "targetName": "Concept B",
      "relationshipType": "influences|enables|constrains|...",
      "strength": "strong|moderate|weak",
      "polarity": "positive|negative|variable",
      "description": "How A affects B"
    }
  ],

  "perspectives": [
    {
      "name": "Executive Leadership",
      "description": "Senior decision-makers focused on strategic outcomes",
      "archetype": "decision_maker|implementer|operator|beneficiary|regulator|...",
      "expertiseDomains": ["business", "organizational"],
      "concerns": ["Revenue Growth", "Market Position"],
      "preferredAbstraction": "strategic|tactical|operational|technical",
      "knownBiases": [
        {
          "type": "short_term_focus",
          "description": "May prioritize quarterly results",
          "blindspots": ["Long-term technical debt", "Employee burnout"]
        }
      ],
      "terminology": [
        {
          "term": "ROI",
          "definition": "Return on Investment - ratio of profit to cost",
          "perspectiveView": "Primary metric for evaluating initiatives"
        }
      ]
    }
  ],

  "concerns": [
    {
      "concernName": "System Reliability",
      "description": "The ability of the system to function consistently",
      "connectedConceptNames": ["Engineering Team", "Infrastructure", "User Satisfaction"],
      "conceptRoles": [
        {"conceptName": "Engineering Team", "role": "responsible_for"},
        {"conceptName": "Infrastructure", "role": "contributes_to"},
        {"conceptName": "User Satisfaction", "role": "affected_by"}
      ],
      "perspectiveWeights": [
        {"perspectiveName": "Executive Leadership", "weight": "important", "reasoning": "Affects customer retention"},
        {"perspectiveName": "Engineering Team", "weight": "critical", "reasoning": "Core responsibility"}
      ],
      "primaryDomain": "technical"
    }
  ],

  "confirmationQuestion": "A question to verify your understanding",
  "quickActions": [
    {"label": "That's right, continue", "action": "confirm"},
    {"label": "Let me refine this", "action": "refine"}
  ]
}

Generate 4-8 concepts, 5-10 relationships, 2-4 perspectives, and 2-4 concerns.
Ensure perspectives have diverse viewpoints that may conflict on some issues.`,

  expanding: `You are generating cascading impacts from the user's assertion.

Based on the conversation context and the system model established, generate impacts for the specified order.

For each impact, provide:
- A concise label
- A detailed description
- Validity assessment (high/medium/low)
- Reasoning for validity
- Key concepts involved
- Causal reasoning explaining why this follows

Return as JSON:
{
  "impacts": [
    {
      "label": "...",
      "description": "...",
      "validity": "high|medium|low",
      "reasoning": "...",
      "keyConcepts": [{"name": "...", "type": "..."}],
      "causalReasoning": "..."
    }
  ],
  "followUpQuestion": "Optional question for user"
}`,

  conversing: `You are in an ongoing dialogue about a system model.

The user may be:
- Asking questions about the analysis
- Challenging your interpretations
- Refining the model
- Requesting different perspectives
- Asking for deeper exploration

Respond naturally and helpfully. If they're challenging something, consider their point carefully.
If they're asking for elaboration, provide it.
If they want to adjust the model, acknowledge the change and update your understanding.

Be conversational but substantive. Use the context of what's been discussed.`,
};

// =============================================================================
// TYPES
// =============================================================================

interface AIModelResponse {
  summary: string;
  reflection: string;
  concepts: Array<{
    name: string;
    description: string;
    conceptType: SystemConcept['conceptType'];
    domains: KnowledgeDomain[];
    abstractionLevel: AbstractionLevel;
  }>;
  relationships: Array<{
    sourceName: string;
    targetName: string;
    relationshipType: ConceptRelationship['relationshipType'];
    strength: 'strong' | 'moderate' | 'weak';
    polarity: 'positive' | 'negative' | 'variable';
    description: string;
  }>;
  perspectives: Array<{
    name: string;
    description: string;
    archetype: Perspective['archetype'];
    expertiseDomains: KnowledgeDomain[];
    concerns: string[];
    preferredAbstraction: AbstractionLevel;
    knownBiases?: Array<{
      type: string;
      description: string;
      blindspots: string[];
    }>;
    terminology?: Array<{
      term: string;
      definition: string;
      perspectiveView: string;
    }>;
  }>;
  concerns: Array<{
    concernName: string;
    description: string;
    connectedConceptNames: string[];
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
  confirmationQuestion: string;
  quickActions?: Array<{ label: string; action: string }>;
}

interface ConversationActions {
  sendMessage: (content: string) => Promise<void>;
  processInitialAssertion: (assertion: string) => Promise<void>;
  generateImpacts: (order: 1 | 2 | 3) => Promise<void>;
  requestPerspective: (perspectiveName: string) => Promise<void>;
  expandModel: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useConversation(): ConversationActions {
  const getAIClient = useSettingsStore((s) => s.getAIClient);
  const compensationStrategy = useUserModelStore((s) => s.compensationStrategy);

  const {
    addUserTurn,
    addAITurn,
    setPhase,
    setProcessing,
    getConversationContext,
  } = useDialogueStore();

  const {
    model,
    initializeModel,
    addConcept,
    addRelationship,
    addPerspective,
    addConcern,
    addImpact,
    impacts,
  } = useModelStore();

  // Build conversation history for AI
  const buildMessages = useCallback(
    (additionalContext?: string): Message[] => {
      const contextTurns = getConversationContext(15);
      const messages: Message[] = contextTurns.map((t) => ({
        role: t.actor === 'user' ? 'user' : 'assistant',
        content: t.content,
      }));

      if (additionalContext) {
        messages.push({ role: 'user', content: additionalContext });
      }

      return messages;
    },
    [getConversationContext]
  );

  // Apply compensation strategy to system prompt
  const getAdaptedSystemPrompt = useCallback(
    (basePrompt: string): string => {
      const adaptations: string[] = [];

      if (compensationStrategy.riskOpportunityBalance < -0.2) {
        adaptations.push('Surface more risks and potential challenges than opportunities.');
      } else if (compensationStrategy.riskOpportunityBalance > 0.2) {
        adaptations.push('Highlight more opportunities and positive outcomes.');
      }

      if (compensationStrategy.disconfirmationStrength > 0.4) {
        adaptations.push('Actively present evidence that challenges the user\'s assumptions.');
      }

      if (compensationStrategy.blindspotHighlighting.length > 0) {
        const domains = compensationStrategy.blindspotHighlighting.map((b) => b.domain).join(', ');
        adaptations.push(`Pay special attention to ${domains} considerations that the user may be overlooking.`);
      }

      if (adaptations.length > 0) {
        return `${basePrompt}\n\nADAPTATION NOTES (based on user's cognitive profile):\n${adaptations.map((a) => `- ${a}`).join('\n')}`;
      }

      return basePrompt;
    },
    [compensationStrategy]
  );

  // Send a general message
  const sendMessage = useCallback(
    async (content: string) => {
      const client = getAIClient();
      if (!client) {
        console.error('No AI client configured');
        return;
      }

      addUserTurn(content, 'assertion');
      setProcessing(true);

      try {
        const messages = buildMessages();
        const systemPrompt = getAdaptedSystemPrompt(SYSTEM_PROMPTS.conversing);

        const response = await client.chat(messages, {
          system: systemPrompt,
          maxTokens: 2048,
          temperature: 0.7,
        });

        addAITurn(response.content, 'explanation');
      } catch (error) {
        console.error('Error sending message:', error);
        addAITurn(
          'I encountered an error processing your message. Please try again.',
          'explanation'
        );
      } finally {
        setProcessing(false);
      }
    },
    [getAIClient, addUserTurn, addAITurn, setProcessing, buildMessages, getAdaptedSystemPrompt]
  );

  // Process the initial assertion - generates FULL model
  const processInitialAssertion = useCallback(
    async (assertion: string) => {
      const client = getAIClient();
      if (!client) {
        console.error('No AI client configured');
        return;
      }

      addUserTurn(assertion, 'assertion');
      setPhase('reflecting');
      setProcessing(true);

      try {
        const systemPrompt = getAdaptedSystemPrompt(SYSTEM_PROMPTS.reflecting);

        const response = await client.chatJSON<AIModelResponse>(
          [{ role: 'user', content: assertion }],
          {
            system: systemPrompt,
            maxTokens: 6000,
            temperature: 0.7,
          }
        );

        const { data } = response;

        // Initialize the model
        initializeModel(assertion, data.summary);

        // Create a map for concept name -> ID resolution
        const conceptIdMap = new Map<string, string>();

        // Add concepts
        for (const concept of data.concepts) {
          const id = addConcept({
            name: concept.name,
            description: concept.description,
            conceptType: concept.conceptType,
            domains: concept.domains,
            abstractionLevel: concept.abstractionLevel,
          });
          conceptIdMap.set(concept.name.toLowerCase(), id);
        }

        // Create a map for perspective name -> ID resolution
        const perspectiveIdMap = new Map<string, string>();

        // Add perspectives
        for (const perspective of data.perspectives) {
          const id = addPerspective({
            name: perspective.name,
            description: perspective.description,
            archetype: perspective.archetype,
            expertiseDomains: perspective.expertiseDomains,
            concerns: perspective.concerns,
            preferredAbstraction: perspective.preferredAbstraction,
            systemRelationship: 'internal',
            knownBiases: perspective.knownBiases,
          });
          perspectiveIdMap.set(perspective.name.toLowerCase(), id);
        }

        // Add relationships (resolve names to IDs)
        for (const rel of data.relationships) {
          const sourceId = conceptIdMap.get(rel.sourceName.toLowerCase());
          const targetId = conceptIdMap.get(rel.targetName.toLowerCase());

          if (sourceId && targetId) {
            addRelationship({
              sourceId,
              targetId,
              relationshipType: rel.relationshipType,
              strength: rel.strength,
              polarity: rel.polarity,
              description: rel.description,
            });
          }
        }

        // Add concerns (hyperedges)
        for (const concern of data.concerns) {
          const connectedConceptIds = concern.connectedConceptNames
            .map(name => conceptIdMap.get(name.toLowerCase()))
            .filter((id): id is string => id !== undefined);

          const conceptRoles = concern.conceptRoles
            .map(role => {
              const conceptId = conceptIdMap.get(role.conceptName.toLowerCase());
              if (conceptId) {
                return { conceptId, role: role.role };
              }
              return null;
            })
            .filter((r): r is { conceptId: string; role: typeof r.role } => r !== null);

          const perspectiveWeights = concern.perspectiveWeights
            .map(pw => {
              const perspectiveId = perspectiveIdMap.get(pw.perspectiveName.toLowerCase());
              if (perspectiveId) {
                return {
                  perspectiveId,
                  weight: pw.weight,
                  reasoning: pw.reasoning,
                };
              }
              return null;
            })
            .filter((pw): pw is NonNullable<typeof pw> => pw !== null);

          if (connectedConceptIds.length > 0) {
            addConcern({
              concernName: concern.concernName,
              description: concern.description,
              connectedConceptIds,
              conceptRoles,
              perspectiveWeights,
              primaryDomain: concern.primaryDomain,
            });
          }
        }

        // Build a nice response for the user
        const formattedResponse = `**I understand you're exploring:** ${data.reflection}

**System Model Generated:**

📊 **Concepts** (${data.concepts.length} identified):
${data.concepts.slice(0, 5).map((c) => `• **${c.name}** (${c.conceptType}): ${c.description.substring(0, 80)}...`).join('\n')}
${data.concepts.length > 5 ? `  ...and ${data.concepts.length - 5} more` : ''}

🔗 **Relationships** (${data.relationships.length} identified):
${data.relationships.slice(0, 4).map((r) => `• ${r.sourceName} → ${r.targetName}: ${r.description.substring(0, 60)}...`).join('\n')}
${data.relationships.length > 4 ? `  ...and ${data.relationships.length - 4} more` : ''}

👁️ **Perspectives** (${data.perspectives.length} viewpoints):
${data.perspectives.map((p) => `• **${p.name}** (${p.archetype}): ${p.description.substring(0, 60)}...`).join('\n')}

🎯 **Shared Concerns** (${data.concerns.length} hyperedges):
${data.concerns.map((c) => `• **${c.concernName}**: Connects ${c.connectedConceptNames.join(', ')}`).join('\n')}

---
⚡ **Review the Perspectives:** Click the "Review" tab in the visualization panel to validate that these stakeholder viewpoints make sense for your situation. Each perspective includes tooltips explaining their domain-specific terminology and known biases.

${data.confirmationQuestion}`;

        addAITurn(formattedResponse, 'reflection', {
          quickActions: data.quickActions || [
            { label: 'Review perspectives', action: 'review_perspectives' },
            { label: "That's right, expand the model", action: 'confirm' },
            { label: 'Let me refine this', action: 'refine' },
          ],
        });

        setPhase('negotiating');
      } catch (error) {
        console.error('Error processing assertion:', error);
        addAITurn(
          'I had trouble analyzing your assertion. Could you try rephrasing it or providing more context?',
          'clarification_request'
        );
        setPhase('seeding');
      } finally {
        setProcessing(false);
      }
    },
    [
      getAIClient,
      addUserTurn,
      addAITurn,
      setPhase,
      setProcessing,
      initializeModel,
      addConcept,
      addRelationship,
      addPerspective,
      addConcern,
      getAdaptedSystemPrompt,
    ]
  );

  // Generate impacts for a specific order
  const generateImpacts = useCallback(
    async (order: 1 | 2 | 3) => {
      const client = getAIClient();
      if (!client || !model) {
        console.error('No AI client or model');
        return;
      }

      setPhase('expanding');
      setProcessing(true);

      try {
        const parentOrder = order - 1;
        const parentImpacts = impacts.filter((i) => i.order === parentOrder);

        const contextMessage = `Generate ${order === 1 ? 'first' : order === 2 ? 'second' : 'third'}-order impacts.

Original assertion: "${model.seedAssertion.text}"

Current concepts in model: ${model.concepts.map(c => c.name).join(', ')}

${order > 1 ? `Parent impacts (order ${parentOrder}):\n${parentImpacts.map((p) => `- ${p.label}: ${p.description}`).join('\n')}` : ''}

Generate ${order === 1 ? '3-5' : order === 2 ? '2-3 per parent' : '1-2 per parent'} distinct impacts.`;

        const response = await client.chatJSON<{
          impacts: Array<{
            label: string;
            description: string;
            validity: 'high' | 'medium' | 'low';
            reasoning: string;
            keyConcepts: Array<{ name: string; type?: string }>;
            causalReasoning: string;
            parentLabel?: string;
          }>;
          followUpQuestion?: string;
        }>([{ role: 'user', content: contextMessage }], {
          system: getAdaptedSystemPrompt(SYSTEM_PROMPTS.expanding),
          maxTokens: 4000,
          temperature: 0.8,
        });

        const { data } = response;

        // Add impacts to the model
        for (const impact of data.impacts) {
          let parentId: string | undefined;
          if (order > 1 && impact.parentLabel) {
            const parent = parentImpacts.find((p) =>
              p.label.toLowerCase().includes(impact.parentLabel!.toLowerCase()) ||
              impact.parentLabel!.toLowerCase().includes(p.label.toLowerCase())
            );
            parentId = parent?.id;
          }
          if (order === 1) {
            parentId = 'core-assertion';
          }

          addImpact({
            order,
            label: impact.label,
            description: impact.description,
            validity: impact.validity,
            reasoning: impact.reasoning,
            keyConcepts: impact.keyConcepts,
            attributes: [],
            causalReasoning: impact.causalReasoning,
            parentId,
          });
        }

        const orderName = order === 1 ? 'First' : order === 2 ? 'Second' : 'Third';
        const formattedResponse = `**${orderName}-Order Impacts Generated:**

${data.impacts.map((i, idx) => `${idx + 1}. **${i.label}**
   ${i.description}
   *Validity: ${i.validity}* - ${i.reasoning}`).join('\n\n')}

${data.followUpQuestion || 'Would you like to explore deeper impacts, or discuss any of these?'}`;

        addAITurn(formattedResponse, 'proposal', {
          quickActions: order < 3
            ? [
                { label: `Generate ${order === 1 ? 'second' : 'third'}-order impacts`, action: `generate_${order + 1}` },
                { label: 'Discuss these impacts', action: 'discuss' },
                { label: 'Challenge an impact', action: 'challenge' },
              ]
            : [
                { label: 'Generate summary', action: 'summarize' },
                { label: 'Discuss the cascade', action: 'discuss' },
                { label: 'Explore a different perspective', action: 'perspective' },
              ],
        });

        setPhase('negotiating');
      } catch (error) {
        console.error('Error generating impacts:', error);
        addAITurn(
          `I encountered an error generating ${order === 1 ? 'first' : order === 2 ? 'second' : 'third'}-order impacts. Let me try again or you can refine the context.`,
          'explanation'
        );
      } finally {
        setProcessing(false);
      }
    },
    [getAIClient, model, impacts, addImpact, addAITurn, setPhase, setProcessing, getAdaptedSystemPrompt]
  );

  // Request a specific perspective
  const requestPerspective = useCallback(
    async (perspectiveName: string) => {
      const client = getAIClient();
      if (!client || !model) {
        console.error('No AI client or model');
        return;
      }

      setProcessing(true);

      try {
        const contextMessage = `Analyze the system from the perspective of a ${perspectiveName}.

Original assertion: "${model.seedAssertion.text}"

Current concepts: ${model.concepts.map(c => `${c.name} (${c.conceptType})`).join(', ')}

Current perspectives in model: ${model.perspectives.map(p => p.name).join(', ')}

As a ${perspectiveName}, what would you:
1. See differently about this system?
2. Prioritize as concerns?
3. Potentially miss or overlook?
4. Recommend as actions?

Also provide any terminology this perspective would use that others might not understand.`;

        const response = await client.chat([{ role: 'user', content: contextMessage }], {
          system: `You are adopting the perspective of a ${perspectiveName} analyzing a system. Think about what this perspective would uniquely see, care about, and potentially miss. Be specific and grounded in the actual system being discussed.`,
          maxTokens: 2000,
          temperature: 0.8,
        });

        addAITurn(`**From the ${perspectiveName} Perspective:**\n\n${response.content}`, 'explanation', {
          quickActions: [
            { label: 'Try another perspective', action: 'perspective' },
            { label: 'Compare perspectives', action: 'compare' },
            { label: 'Continue exploration', action: 'continue' },
          ],
        });
      } catch (error) {
        console.error('Error generating perspective:', error);
        addAITurn(
          `I had trouble analyzing from the ${perspectiveName} perspective. Let me try a different approach.`,
          'explanation'
        );
      } finally {
        setProcessing(false);
      }
    },
    [getAIClient, model, addAITurn, setProcessing]
  );

  // Expand the model with additional concepts, relationships, and concerns
  const expandModel = useCallback(
    async () => {
      const client = getAIClient();
      if (!client || !model) {
        console.error('No AI client or model');
        return;
      }

      setProcessing(true);

      try {
        const contextMessage = `Expand the current system model with additional insights.

Original assertion: "${model.seedAssertion.text}"

Current concepts (${model.concepts.length}): ${model.concepts.map(c => c.name).join(', ')}
Current relationships (${model.relationships.length})
Current perspectives (${model.perspectives.length}): ${model.perspectives.map(p => p.name).join(', ')}
Current concerns (${model.concerns.length}): ${model.concerns.map(c => c.concernName).join(', ')}

Suggest:
1. 2-3 additional concepts that might be important
2. 2-3 additional relationships
3. Any missing perspectives
4. Any additional shared concerns (hyperedges)

Focus on what might have been overlooked in the initial analysis.`;

        const response = await client.chat([{ role: 'user', content: contextMessage }], {
          system: 'You are helping expand a system model. Focus on insights that complement the existing analysis rather than repeating it.',
          maxTokens: 2000,
          temperature: 0.8,
        });

        addAITurn(`**Model Expansion Suggestions:**\n\n${response.content}`, 'proposal', {
          quickActions: [
            { label: 'Accept suggestions', action: 'accept_expansion' },
            { label: 'Explore a perspective', action: 'perspective' },
            { label: 'Generate impacts', action: 'confirm' },
          ],
        });
      } catch (error) {
        console.error('Error expanding model:', error);
        addAITurn(
          'I had trouble expanding the model. Let me try a different approach.',
          'explanation'
        );
      } finally {
        setProcessing(false);
      }
    },
    [getAIClient, model, addAITurn, setProcessing]
  );

  return {
    sendMessage,
    processInitialAssertion,
    generateImpacts,
    requestPerspective,
    expandModel,
  };
}
