import { useAppSelector, useAppDispatch } from './redux';
import {
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
} from '@/store/slices/settingsSlice';
import {
  OllamaConfig,
  DeepSeekConfig,
  OpenAIConfig,
  AnthropicConfig,
  CustomConfig,
  AIProvider,
  AppSettings,
} from '@/types';

export const useSettingsState = () => {
  const dispatch = useAppDispatch();

  const settingsState = useAppSelector((state) => state.settings);

  return {
    ...settingsState,

    // 整体设置
    updateSettings: (settings: Partial<AppSettings>) =>
      dispatch(updateSettings(settings)),
    setSettings: (settings: AppSettings) => dispatch(setSettings(settings)),
    resetSettings: () => dispatch(resetSettings()),

    // AI 设置
    updateAiProvider: (provider: AIProvider) =>
      dispatch(updateAiProvider(provider)),
    updateOllamaConfig: (config: Partial<OllamaConfig>) =>
      dispatch(updateOllamaConfig(config)),
    updateDeepSeekConfig: (config: Partial<DeepSeekConfig>) =>
      dispatch(updateDeepSeekConfig(config)),
    updateOpenAIConfig: (config: Partial<OpenAIConfig>) =>
      dispatch(updateOpenAIConfig(config)),
    updateAnthropicConfig: (config: Partial<AnthropicConfig>) =>
      dispatch(updateAnthropicConfig(config)),
    updateCustomConfig: (config: Partial<CustomConfig>) =>
      dispatch(updateCustomConfig(config)),

    // 分类设置
    updateGeneralSettings: (settings: Partial<AppSettings['general']>) =>
      dispatch(updateGeneralSettings(settings)),
    updateAppearanceSettings: (settings: Partial<AppSettings['appearance']>) =>
      dispatch(updateAppearanceSettings(settings)),
    updateAdvancedSettings: (settings: Partial<AppSettings['advanced']>) =>
      dispatch(updateAdvancedSettings(settings)),

    // 面板状态
    setSettingsOpen: (open: boolean) => dispatch(setSettingsOpen(open)),
    setCurrentTab: (tab: string) => dispatch(setCurrentTab(tab)),

    // 保存状态
    setHasUnsavedChanges: (hasChanges: boolean) =>
      dispatch(setHasUnsavedChanges(hasChanges)),
    markSettingsSaved: () => dispatch(markSettingsSaved()),
  };
};
