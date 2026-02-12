/**
 * @fileOverview Model-agnostic AI Client using OpenAI-compatible API format
 *
 * This module provides a unified interface for AI model interactions using
 * the OpenAI API format, which is now supported by most providers including:
 * - OpenAI (native)
 * - Anthropic (via OpenAI-compatible endpoint)
 * - LiteLLM proxy
 * - Together AI, Groq, Fireworks, etc.
 * - Local models via Ollama, LM Studio, vLLM
 *
 * Users can select any provider and provide their own API key.
 */

// Supported model providers and their configurations
export const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable GPT-4 model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation flagship' },
      { id: 'o1', name: 'o1', description: 'Advanced reasoning model' },
      { id: 'o1-mini', name: 'o1 Mini', description: 'Faster reasoning model' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    apiKeyPrefix: 'sk-',
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest balanced model' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, most affordable' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyPrefix: 'sk-ant-',
    // Anthropic requires specific headers
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', description: 'Fast open model' },
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', description: 'Most capable open model' },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', description: 'Strong reasoning' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', description: 'Multilingual capable' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'your-together-api-key',
    apiKeyPrefix: '',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Fast inference' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Ultra-fast inference' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Extended context' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google open model' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'gsk_...',
    apiKeyPrefix: 'gsk_',
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B', description: 'Fast and capable' },
      { id: 'accounts/fireworks/models/llama-v3p1-405b-instruct', name: 'Llama 3.1 405B', description: 'Most capable' },
      { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', description: 'Strong reasoning' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'fw_...',
    apiKeyPrefix: 'fw_',
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', description: 'Local Llama model' },
      { id: 'mistral', name: 'Mistral', description: 'Local Mistral model' },
      { id: 'codellama', name: 'Code Llama', description: 'Code-focused model' },
      { id: 'phi3', name: 'Phi-3', description: 'Microsoft small model' },
    ],
    requiresApiKey: false,
    apiKeyPlaceholder: '',
    apiKeyPrefix: '',
  },
  litellm: {
    name: 'LiteLLM Proxy',
    baseUrl: 'http://localhost:4000/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (via proxy)', description: 'Routes through LiteLLM' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (via proxy)', description: 'Routes through LiteLLM' },
      { id: 'gemini/gemini-pro', name: 'Gemini Pro (via proxy)', description: 'Routes through LiteLLM' },
    ],
    requiresApiKey: false,
    apiKeyPlaceholder: 'optional-litellm-key',
    apiKeyPrefix: '',
    note: 'Run LiteLLM proxy locally: litellm --model gpt-4o',
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    models: [
      { id: 'custom', name: 'Custom Model', description: 'Enter model ID manually' },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'your-api-key',
    apiKeyPrefix: '',
    note: 'Use any OpenAI-compatible endpoint',
  },
} as const;

export type ModelProvider = keyof typeof MODEL_PROVIDERS;
export type ModelId = string;

export interface AIConfig {
  provider: ModelProvider;
  modelId: string;
  apiKey: string;
  customBaseUrl?: string;
  customModelId?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
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
 * Uses OpenAI-compatible API format which is supported by most providers
 */
export function createAIClient(config: AIConfig) {
  const { provider, modelId, apiKey, customBaseUrl, customModelId } = config;

  const providerConfig = MODEL_PROVIDERS[provider];
  const baseUrl = provider === 'custom' ? customBaseUrl : providerConfig.baseUrl;
  const actualModelId = provider === 'custom' && customModelId ? customModelId : modelId;

  if (!baseUrl) {
    throw new Error(`No base URL configured for provider: ${provider}`);
  }

  // Build headers based on provider
  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if API key is provided
    if (apiKey) {
      if (provider === 'anthropic') {
        // Anthropic uses x-api-key header
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        // Most providers use Bearer token
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    return headers;
  };

  return {
    /**
     * Send a message and get a response using OpenAI-compatible chat completions
     */
    async chat(
      messages: Message[],
      options?: {
        system?: string;
        maxTokens?: number;
        temperature?: number;
      }
    ): Promise<AIResponse> {
      const endpoint = provider === 'anthropic'
        ? `${baseUrl}/messages`  // Anthropic uses /messages endpoint
        : `${baseUrl}/chat/completions`;

      // Build messages array with optional system message
      const formattedMessages: Message[] = [];
      if (options?.system && provider !== 'anthropic') {
        formattedMessages.push({ role: 'system', content: options.system });
      }
      formattedMessages.push(...messages);

      // Build request body based on provider
      let body: Record<string, unknown>;

      if (provider === 'anthropic') {
        // Anthropic has its own API format
        body = {
          model: actualModelId,
          max_tokens: options?.maxTokens ?? 4096,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        };
        if (options?.system) {
          body.system = options.system;
        }
        if (options?.temperature !== undefined) {
          body.temperature = options.temperature;
        }
      } else {
        // OpenAI-compatible format
        body = {
          model: actualModelId,
          messages: formattedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
        };
      }

      // Use server-side proxy in browser to avoid CORS issues
      let response: Response;
      if (typeof window !== 'undefined') {
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            headers: buildHeaders(),
            body,
          }),
        });
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Parse response based on provider
      if (provider === 'anthropic') {
        const content = data.content?.[0]?.text ?? '';
        return {
          content,
          usage: data.usage ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          } : undefined,
        };
      } else {
        // OpenAI-compatible format
        const content = data.choices?.[0]?.message?.content ?? '';
        return {
          content,
          usage: data.usage ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          } : undefined,
        };
      }
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
        temperature: options?.temperature ?? 0.3, // Lower temperature for JSON
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
      } catch (error) {
        console.error('Connection test failed:', error);
        return false;
      }
    },

    /**
     * Get provider information
     */
    getProviderInfo() {
      return {
        provider,
        baseUrl,
        modelId: actualModelId,
        providerName: providerConfig.name,
      };
    },
  };
}

export type AIClient = ReturnType<typeof createAIClient>;

/**
 * Validate an API key format (basic check)
 */
export function validateApiKey(provider: ModelProvider, apiKey: string): boolean {
  if (provider === 'ollama' || provider === 'litellm') {
    // These providers may not require API keys
    return true;
  }

  if (!apiKey || apiKey.trim() === '') return false;

  const providerConfig = MODEL_PROVIDERS[provider];
  if (providerConfig.apiKeyPrefix && !apiKey.startsWith(providerConfig.apiKeyPrefix)) {
    // Warn but don't fail - user might have a different key format
    console.warn(`API key doesn't match expected prefix for ${provider}`);
  }

  return true;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: ModelProvider): string {
  return MODEL_PROVIDERS[provider].models[0].id;
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Array<{ id: ModelProvider; name: string; note?: string }> {
  return Object.entries(MODEL_PROVIDERS).map(([id, config]) => ({
    id: id as ModelProvider,
    name: config.name,
    note: 'note' in config ? config.note : undefined,
  }));
}
