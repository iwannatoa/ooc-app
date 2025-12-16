import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AppSettings,
  AIProvider,
  OllamaConfig,
  DeepSeekConfig,
  OpenAIConfig,
  AnthropicConfig,
  CustomConfig,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

interface SettingsState {
  settings: AppSettings;
  isSettingsOpen: boolean;
  hasUnsavedChanges: boolean;
  currentTab: string;
}

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
    // 整体设置
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

    // AI 提供商设置 - 使用类型安全的更新
    updateAiProvider: (state, action: PayloadAction<AIProvider>) => {
      state.settings.ai.provider = action.payload;
      state.hasUnsavedChanges = true;
    },

    // 为每个提供商单独创建更新函数
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
    updateCustomConfig: (
      state,
      action: PayloadAction<Partial<CustomConfig>>
    ) => {
      state.settings.ai.custom = {
        ...state.settings.ai.custom,
        ...action.payload,
      };
      state.hasUnsavedChanges = true;
    },

    // 通用设置
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

    // 设置面板状态
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

    // 保存状态
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
  updateOpenAIConfig,
  updateAnthropicConfig,
  updateCustomConfig,
  updateGeneralSettings,
  updateAppearanceSettings,
  updateAdvancedSettings,
  setSettingsOpen,
  setCurrentTab,
  setHasUnsavedChanges,
  markSettingsSaved,
} = settingsSlice.actions;

export default settingsSlice.reducer;
