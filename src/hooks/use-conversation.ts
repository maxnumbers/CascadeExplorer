/**
 * @fileOverview Conversation Hook
 *
 * Provides the main interface for conversational interaction with the AI.
 * Handles message processing, model updates, and adaptive responses.
 */

'use client';

import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { useModelStore } from '@/store/model-store';
import { useUserModelStore } from '@/store/user-model-store';
import type { Message } from '@/ai/client';

// System prompts for different phases
const SYSTEM_PROMPTS = {
  welcome: `You are a collaborative thinking partner in a systems exploration tool called CascadeExplorer.

Your role is to help users think through complex decisions by:
1. Understanding their ideas and decisions
2. Mapping out the system dynamics (stocks, agents, incentives)
3. Exploring cascading impacts and consequences
4. Surfacing multiple perspectives
5. Grounding analysis when helpful

Start by warmly welcoming the user and explaining what you can help them with. Be conversational and approachable.

You should:
- Ask clarifying questions when needed
- Surface potential blind spots
- Challenge assumptions when appropriate
- Offer multiple perspectives
- Be concise but thorough

IMPORTANT: Structure your responses with clear paragraphs. When you have structured information to share (like identified concepts), format it clearly.`,

  reflecting: `You are analyzing the user's initial assertion to extract a system model.

Your task is to:
1. Summarize your understanding of what the user is exploring (1-2 sentences)
2. Identify key STOCKS (accumulations/resources that can change over time)
3. Identify key AGENTS (actors/entities that influence stocks)
4. Identify INCENTIVES (agent motivations toward stocks and resulting actions)
5. Ask a clarifying question to confirm your understanding

Format your response as JSON with this structure:
{
  "summary": "Brief summary of the assertion",
  "reflection": "Your interpretation in 1-2 sentences",
  "stocks": [{"name": "...", "description": "..."}],
  "agents": [{"name": "...", "description": "..."}],
  "incentives": [{"agentName": "...", "targetStockName": "...", "incentiveDescription": "...", "resultingFlow": "..."}],
  "confirmationQuestion": "A question to verify your understanding",
  "quickActions": [{"label": "Yes, that's right", "action": "confirm"}, {"label": "Let me clarify", "action": "refine"}]
}`,

  expanding: `You are generating cascading impacts from the user's assertion.

Based on the conversation context and the system model established, generate impacts for the specified order.

For each impact, provide:
- A concise label (2-3 lines max)
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

interface ConversationActions {
  sendMessage: (content: string) => Promise<void>;
  processInitialAssertion: (assertion: string) => Promise<void>;
  generateImpacts: (order: 1 | 2 | 3) => Promise<void>;
  requestPerspective: (perspectiveName: string) => Promise<void>;
}

export function useConversation(): ConversationActions {
  const getAIClient = useSettingsStore((s) => s.getAIClient);
  const compensationStrategy = useUserModelStore((s) => s.compensationStrategy);

  const {
    turns,
    phase,
    addUserTurn,
    addAITurn,
    updateTurn,
    setPhase,
    setProcessing,
    getConversationContext,
  } = useDialogueStore();

  const { model, initializeModel, addImpact, impacts } = useModelStore();

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

      const userTurnId = addUserTurn(content, 'assertion');
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

  // Process the initial assertion
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

        const response = await client.chatJSON<{
          summary: string;
          reflection: string;
          stocks: Array<{ name: string; description: string }>;
          agents: Array<{ name: string; description: string }>;
          incentives: Array<{
            agentName: string;
            targetStockName: string;
            incentiveDescription: string;
            resultingFlow: string;
          }>;
          confirmationQuestion: string;
          quickActions?: Array<{ label: string; action: string }>;
        }>([{ role: 'user', content: assertion }], {
          system: systemPrompt,
          maxTokens: 3000,
          temperature: 0.7,
        });

        const { data } = response;

        // Initialize the model
        initializeModel(assertion, data.summary);

        // Build a nice response
        const formattedResponse = `**I understand you're exploring:** ${data.reflection}

**Key Elements I've Identified:**

📊 **Stocks (Resources/Accumulations):**
${data.stocks.map((s) => `• **${s.name}**: ${s.description}`).join('\n')}

👥 **Agents (Actors/Entities):**
${data.agents.map((a) => `• **${a.name}**: ${a.description}`).join('\n')}

🔄 **Incentives & Dynamics:**
${data.incentives.map((i) => `• **${i.agentName}** → *${i.targetStockName}*: ${i.incentiveDescription} (${i.resultingFlow})`).join('\n')}

${data.confirmationQuestion}`;

        addAITurn(formattedResponse, 'reflection', {
          quickActions: data.quickActions || [
            { label: "That's right, continue", action: 'confirm' },
            { label: 'Let me refine this', action: 'refine' },
            { label: "What's missing?", action: 'question' },
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
    [getAIClient, addUserTurn, addAITurn, setPhase, setProcessing, initializeModel, getAdaptedSystemPrompt]
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
        // Get parent impacts
        const parentOrder = order - 1;
        const parentImpacts = impacts.filter((i) => i.order === parentOrder);

        const contextMessage = `Generate ${order === 1 ? 'first' : order === 2 ? 'second' : 'third'}-order impacts.

Original assertion: "${model.seedAssertion.text}"

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
          // Try to link to parent
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

        // Format response
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

Current impacts:
${impacts.map((i) => `[Order ${i.order}] ${i.label}`).join('\n')}

As a ${perspectiveName}, what would you:
1. See differently about this system?
2. Prioritize as concerns?
3. Potentially miss or overlook?
4. Recommend as actions?`;

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
    [getAIClient, model, impacts, addAITurn, setProcessing]
  );

  return {
    sendMessage,
    processInitialAssertion,
    generateImpacts,
    requestPerspective,
  };
}
