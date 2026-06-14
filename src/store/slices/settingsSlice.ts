import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AppSettings,
  AIProvider,
  OllamaConfig,
  DeepSeekConfig,
  OpenAICompatibleConfig,
  OpenAIConfig,
  AzureConfig,
  AnthropicConfig,
  GLMConfig,
  KimiConfig,
  MiniMaxConfig,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

interface SettingsState {
  settings: AppSettings;
  isSettingsOpen: boolean;
  hasUnsavedChanges: boolean;
  currentTab: string;
}

type ActiveAiProviderConfigPatch = Partial<{
  baseUrl: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}>;

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,
  hasUnsavedChanges: false,
  currentTab: 'general',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Overall settings
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    setSettings: (state, action: PayloadAction<AppSettings>) => {
      state.settings = action.payload;
      state.hasUnsavedChanges = true;
    },
    resetSettings: (state) => {
      state.settings = DEFAULT_SETTINGS;
      state.hasUnsavedChanges = false;
    },

    // AI provider settings - use type-safe updates
    updateAiProvider: (state, action: PayloadAction<AIProvider>) => {
      state.settings.ai.provider = action.payload;
      state.hasUnsavedChanges = true;
    },

    // Create separate update functions for each provider
    updateOllamaConfig: (
      state,
      action: PayloadAction<Partial<OllamaConfig>>
    ) => {
      state.settings.ai.ollama = {
        ...state.settings.ai.ollama,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateDeepSeekConfig: (
      state,
      action: PayloadAction<Partial<DeepSeekConfig>>
    ) => {
      state.settings.ai.deepseek = {
        ...state.settings.ai.deepseek,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateOpenAICompatibleConfig: (
      state,
      action: PayloadAction<Partial<OpenAICompatibleConfig>>
    ) => {
      state.settings.ai.openai_compatible = {
        ...state.settings.ai.openai_compatible,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateOpenAIConfig: (
      state,
      action: PayloadAction<Partial<OpenAIConfig>>
    ) => {
      state.settings.ai.openai = {
        ...state.settings.ai.openai,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateAzureConfig: (
      state,
      action: PayloadAction<Partial<AzureConfig>>
    ) => {
      state.settings.ai.azure = {
        ...state.settings.ai.azure,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateAnthropicConfig: (
      state,
      action: PayloadAction<Partial<AnthropicConfig>>
    ) => {
      state.settings.ai.anthropic = {
        ...state.settings.ai.anthropic,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateGLMConfig: (
      state,
      action: PayloadAction<Partial<GLMConfig>>
    ) => {
      state.settings.ai.glm = {
        ...state.settings.ai.glm,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateKimiConfig: (
      state,
      action: PayloadAction<Partial<KimiConfig>>
    ) => {
      state.settings.ai.kimi = {
        ...state.settings.ai.kimi,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateMiniMaxConfig: (
      state,
      action: PayloadAction<Partial<MiniMaxConfig>>
    ) => {
      state.settings.ai.minimax = {
        ...state.settings.ai.minimax,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateActiveAiProviderConfig: (
      state,
      action: PayloadAction<ActiveAiProviderConfigPatch>
    ) => {
      const provider = state.settings.ai.provider;
      if (provider === 'ollama') {
        const { apiKey: _apiKey, ...patch } = action.payload;
        state.settings.ai.ollama = {
          ...state.settings.ai.ollama,
          ...patch,
        };
      } else if (provider === 'deepseek') {
        state.settings.ai.deepseek = {
          ...state.settings.ai.deepseek,
          ...action.payload,
        };
      } else if (provider === 'openai_compatible') {
        state.settings.ai.openai_compatible = {
          ...state.settings.ai.openai_compatible,
          ...action.payload,
        };
      } else if (provider === 'openai') {
        state.settings.ai.openai = {
          ...state.settings.ai.openai,
          ...action.payload,
        };
      } else if (provider === 'azure') {
        state.settings.ai.azure = {
          ...state.settings.ai.azure,
          ...action.payload,
        };
      } else if (provider === 'anthropic') {
        state.settings.ai.anthropic = {
          ...state.settings.ai.anthropic,
          ...action.payload,
        };
      } else if (provider === 'glm') {
        state.settings.ai.glm = {
          ...state.settings.ai.glm,
          ...action.payload,
        };
      } else if (provider === 'kimi') {
        state.settings.ai.kimi = {
          ...state.settings.ai.kimi,
          ...action.payload,
        };
      } else if (provider === 'minimax') {
        state.settings.ai.minimax = {
          ...state.settings.ai.minimax,
          ...action.payload,
        };
      }
      state.hasUnsavedChanges = true;
    },

    // General settings
    updateGeneralSettings: (
      state,
      action: PayloadAction<Partial<AppSettings['general']>>
    ) => {
      state.settings.general = { ...state.settings.general, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateAppearanceSettings: (
      state,
      action: PayloadAction<Partial<AppSettings['appearance']>>
    ) => {
      state.settings.appearance = {
        ...state.settings.appearance,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },
    updateAdvancedSettings: (
      state,
      action: PayloadAction<Partial<AppSettings['advanced']>>
    ) => {
      state.settings.advanced = {
        ...state.settings.advanced,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },

    // Settings panel state
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.isSettingsOpen = action.payload;
      if (!action.payload) {
        state.hasUnsavedChanges = false;
        state.currentTab = 'general';
      }
    },
    setCurrentTab: (state, action: PayloadAction<string>) => {
      state.currentTab = action.payload;
    },

    // Save state
    setHasUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.hasUnsavedChanges = action.payload;
    },
    markSettingsSaved: (state) => {
      state.hasUnsavedChanges = false;
    },
  },
});

export const {
  updateSettings,
  setSettings,
  resetSettings,
  updateAiProvider,
  updateOllamaConfig,
  updateDeepSeekConfig,
  updateOpenAICompatibleConfig,
  updateOpenAIConfig,
  updateAzureConfig,
  updateAnthropicConfig,
  updateGLMConfig,
  updateKimiConfig,
  updateMiniMaxConfig,
  updateActiveAiProviderConfig,
  updateGeneralSettings,
  updateAppearanceSettings,
  updateAdvancedSettings,
  setSettingsOpen,
  setCurrentTab,
  setHasUnsavedChanges,
  markSettingsSaved,
} = settingsSlice.actions;

export default settingsSlice.reducer;
