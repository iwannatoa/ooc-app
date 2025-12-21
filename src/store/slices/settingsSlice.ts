import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AppSettings,
  AIProvider,
  OllamaConfig,
  DeepSeekConfig,
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
  updateGeneralSettings,
  updateAppearanceSettings,
  updateAdvancedSettings,
  setSettingsOpen,
  setCurrentTab,
  setHasUnsavedChanges,
  markSettingsSaved,
} = settingsSlice.actions;

export default settingsSlice.reducer;
