/**
 * @fileOverview Settings Store
 *
 * Manages user preferences including:
 * - AI provider and model selection (multi-provider support)
 * - API key storage
 * - Custom endpoint configuration
 * - UI preferences
 * - Adaptation preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelProvider } from '@/ai/client';
import { MODEL_PROVIDERS, getDefaultModel, validateApiKey, createAIClient, type AIClient } from '@/ai/client';

interface SettingsState {
  // AI Configuration
  provider: ModelProvider;
  modelId: string;
  apiKey: string;
  isConfigured: boolean;

  // Custom endpoint configuration (for 'custom' provider or overrides)
  customBaseUrl: string;
  customModelId: string;

  // UI Preferences
  theme: 'dark' | 'light' | 'system';
  showAdaptationPanel: boolean;
  conversationPanelWidth: number; // percentage

  // Grounding Preferences
  groundingLevel: 'speculative' | 'balanced' | 'empirical';
  preferredSourceTypes: string[];

  // Cached AI client
  _aiClient: AIClient | null;

  // Actions
  setProvider: (provider: ModelProvider) => void;
  setModelId: (modelId: string) => void;
  setApiKey: (apiKey: string) => void;
  setCustomBaseUrl: (url: string) => void;
  setCustomModelId: (modelId: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setShowAdaptationPanel: (show: boolean) => void;
  setConversationPanelWidth: (width: number) => void;
  setGroundingLevel: (level: 'speculative' | 'balanced' | 'empirical') => void;
  setPreferredSourceTypes: (types: string[]) => void;

  // AI Client
  getAIClient: () => AIClient | null;
  validateAndConnect: () => Promise<{ success: boolean; error?: string }>;
  clearConfiguration: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      provider: 'anthropic',
      modelId: getDefaultModel('anthropic'),
      apiKey: '',
      isConfigured: false,

      customBaseUrl: '',
      customModelId: '',

      theme: 'dark',
      showAdaptationPanel: true,
      conversationPanelWidth: 60,

      groundingLevel: 'balanced',
      preferredSourceTypes: ['academic', 'industry_report', 'government_data'],

      _aiClient: null,

      // Provider actions
      setProvider: (provider) => {
        set({
          provider,
          modelId: getDefaultModel(provider),
          isConfigured: false,
          _aiClient: null,
        });
      },

      setModelId: (modelId) => {
        set({ modelId, isConfigured: false, _aiClient: null });
      },

      setApiKey: (apiKey) => {
        set({ apiKey, isConfigured: false, _aiClient: null });
      },

      setCustomBaseUrl: (url) => {
        set({ customBaseUrl: url, isConfigured: false, _aiClient: null });
      },

      setCustomModelId: (modelId) => {
        set({ customModelId: modelId, isConfigured: false, _aiClient: null });
      },

      // UI preference actions
      setTheme: (theme) => set({ theme }),
      setShowAdaptationPanel: (show) => set({ showAdaptationPanel: show }),
      setConversationPanelWidth: (width) => set({ conversationPanelWidth: Math.max(30, Math.min(70, width)) }),

      // Grounding preference actions
      setGroundingLevel: (level) => set({ groundingLevel: level }),
      setPreferredSourceTypes: (types) => set({ preferredSourceTypes: types }),

      // AI Client management
      getAIClient: () => {
        const state = get();
        if (state._aiClient) return state._aiClient;

        if (!state.isConfigured) return null;

        try {
          const client = createAIClient({
            provider: state.provider,
            modelId: state.modelId,
            apiKey: state.apiKey,
            customBaseUrl: state.customBaseUrl || undefined,
            customModelId: state.customModelId || undefined,
          });
          set({ _aiClient: client });
          return client;
        } catch {
          return null;
        }
      },

      validateAndConnect: async () => {
        const state = get();

        // For custom provider, check that base URL is provided
        if (state.provider === 'custom' && !state.customBaseUrl) {
          return {
            success: false,
            error: 'Please provide a custom endpoint URL.',
          };
        }

        // Validate API key format (some providers don't require it)
        const providerConfig = MODEL_PROVIDERS[state.provider];
        if (providerConfig.requiresApiKey && !validateApiKey(state.provider, state.apiKey)) {
          return {
            success: false,
            error: 'Invalid API key format. Please check your API key.',
          };
        }

        try {
          const client = createAIClient({
            provider: state.provider,
            modelId: state.modelId,
            apiKey: state.apiKey,
            customBaseUrl: state.customBaseUrl || undefined,
            customModelId: state.customModelId || undefined,
          });

          const isConnected = await client.testConnection();

          if (isConnected) {
            set({ isConfigured: true, _aiClient: client });
            return { success: true };
          } else {
            return {
              success: false,
              error: 'Could not connect to the AI service. Please verify your configuration.',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error connecting to AI service',
          };
        }
      },

      clearConfiguration: () => {
        set({
          apiKey: '',
          customBaseUrl: '',
          customModelId: '',
          isConfigured: false,
          _aiClient: null,
        });
      },
    }),
    {
      name: 'cascade-explorer-settings',
      // Don't persist the AI client instance
      partialize: (state) => ({
        provider: state.provider,
        modelId: state.modelId,
        apiKey: state.apiKey,
        isConfigured: state.isConfigured,
        customBaseUrl: state.customBaseUrl,
        customModelId: state.customModelId,
        theme: state.theme,
        showAdaptationPanel: state.showAdaptationPanel,
        conversationPanelWidth: state.conversationPanelWidth,
        groundingLevel: state.groundingLevel,
        preferredSourceTypes: state.preferredSourceTypes,
      }),
    }
  )
);

// Selector hooks for convenience
export const useAIClient = () => useSettingsStore((state) => state.getAIClient());
export const useIsConfigured = () => useSettingsStore((state) => state.isConfigured);
export const useSelectedModel = () =>
  useSettingsStore((state) => {
    const providerConfig = MODEL_PROVIDERS[state.provider];
    const models = providerConfig.models;
    return models.find((m) => m.id === state.modelId) ?? models[0];
  });
export const useProviderConfig = () =>
  useSettingsStore((state) => MODEL_PROVIDERS[state.provider]);
