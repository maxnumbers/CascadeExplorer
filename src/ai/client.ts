/**
 * @fileOverview AI Client abstraction layer
 *
 * This module provides a unified interface for AI model interactions,
 * supporting multiple providers (Anthropic, OpenAI, etc.) through a
 * common interface. Users can configure their preferred model and API key.
 */

import Anthropic from '@anthropic-ai/sdk';

// Supported model providers and their models
export const MODEL_PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest balanced model' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Fast and capable' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, most affordable' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-...',
  },
} as const;

export type ModelProvider = keyof typeof MODEL_PROVIDERS;
export type ModelId = typeof MODEL_PROVIDERS[ModelProvider]['models'][number]['id'];

export interface AIConfig {
  provider: ModelProvider;
  modelId: string;
  apiKey: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StructuredAIResponse<T> {
  data: T;
  raw: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Create an AI client with the given configuration
 */
export function createAIClient(config: AIConfig) {
  const { provider, modelId, apiKey } = config;

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });

    return {
      /**
       * Send a message and get a response
       */
      async chat(
        messages: Message[],
        options?: {
          system?: string;
          maxTokens?: number;
          temperature?: number;
        }
      ): Promise<AIResponse> {
        const response = await client.messages.create({
          model: modelId,
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
          system: options?.system,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        });

        const textContent = response.content.find(c => c.type === 'text');

        return {
          content: textContent?.text ?? '',
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      },

      /**
       * Send a message and parse the response as JSON
       */
      async chatJSON<T>(
        messages: Message[],
        options?: {
          system?: string;
          maxTokens?: number;
          temperature?: number;
        }
      ): Promise<StructuredAIResponse<T>> {
        const systemWithJSON = `${options?.system ?? ''}\n\nIMPORTANT: You must respond with valid JSON only. No markdown code blocks, no explanatory text before or after. Just the raw JSON object.`;

        const response = await this.chat(messages, {
          ...options,
          system: systemWithJSON,
        });

        // Try to parse JSON from response
        let jsonContent = response.content.trim();

        // Remove markdown code blocks if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.slice(7);
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.slice(3);
        }
        if (jsonContent.endsWith('```')) {
          jsonContent = jsonContent.slice(0, -3);
        }
        jsonContent = jsonContent.trim();

        try {
          const data = JSON.parse(jsonContent) as T;
          return {
            data,
            raw: response.content,
            usage: response.usage,
          };
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', jsonContent);
          throw new Error(`AI returned invalid JSON: ${parseError}`);
        }
      },

      /**
       * Test the connection with a simple request
       */
      async testConnection(): Promise<boolean> {
        try {
          await this.chat([{ role: 'user', content: 'Hello' }], {
            maxTokens: 10,
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export type AIClient = ReturnType<typeof createAIClient>;

/**
 * Validate an API key format (basic check)
 */
export function validateApiKey(provider: ModelProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim() === '') return false;

  if (provider === 'anthropic') {
    return apiKey.startsWith('sk-ant-');
  }

  return true;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: ModelProvider): string {
  return MODEL_PROVIDERS[provider].models[0].id;
}
