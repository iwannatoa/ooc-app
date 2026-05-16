import { useAppSelector, useAppDispatch } from './redux';
import {
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
} from '@/store/slices/settingsSlice';
import {
  OllamaConfig,
  DeepSeekConfig,
  OpenAICompatibleConfig,
  OpenAIConfig,
  AzureConfig,
  AnthropicConfig,
  GLMConfig,
  KimiConfig,
  MiniMaxConfig,
  AIProvider,
  AppSettings,
} from '@/types';

export const useSettingsState = () => {
  const dispatch = useAppDispatch();

  const settingsState = useAppSelector((state) => state.settings);

  return {
    ...settingsState,

    // Overall settings
    updateSettings: (settings: Partial<AppSettings>) =>
      dispatch(updateSettings(settings)),
    setSettings: (settings: AppSettings) => dispatch(setSettings(settings)),
    resetSettings: () => dispatch(resetSettings()),

    // AI settings
    updateAiProvider: (provider: AIProvider) =>
      dispatch(updateAiProvider(provider)),
    updateOllamaConfig: (config: Partial<OllamaConfig>) =>
      dispatch(updateOllamaConfig(config)),
    updateDeepSeekConfig: (config: Partial<DeepSeekConfig>) =>
      dispatch(updateDeepSeekConfig(config)),
    updateOpenAICompatibleConfig: (
      config: Partial<OpenAICompatibleConfig>
    ) => dispatch(updateOpenAICompatibleConfig(config)),
    updateOpenAIConfig: (config: Partial<OpenAIConfig>) =>
      dispatch(updateOpenAIConfig(config)),
    updateAzureConfig: (config: Partial<AzureConfig>) =>
      dispatch(updateAzureConfig(config)),
    updateAnthropicConfig: (config: Partial<AnthropicConfig>) =>
      dispatch(updateAnthropicConfig(config)),
    updateGLMConfig: (config: Partial<GLMConfig>) =>
      dispatch(updateGLMConfig(config)),
    updateKimiConfig: (config: Partial<KimiConfig>) =>
      dispatch(updateKimiConfig(config)),
    updateMiniMaxConfig: (config: Partial<MiniMaxConfig>) =>
      dispatch(updateMiniMaxConfig(config)),
    updateActiveAiProviderConfig: (
      config: Partial<{
        baseUrl: string;
        model: string;
        timeout: number;
        maxTokens: number;
        temperature: number;
        apiKey: string;
      }>
    ) => dispatch(updateActiveAiProviderConfig(config)),

    // Category settings
    updateGeneralSettings: (settings: Partial<AppSettings['general']>) =>
      dispatch(updateGeneralSettings(settings)),
    updateAppearanceSettings: (settings: Partial<AppSettings['appearance']>) =>
      dispatch(updateAppearanceSettings(settings)),
    updateAdvancedSettings: (settings: Partial<AppSettings['advanced']>) =>
      dispatch(updateAdvancedSettings(settings)),

    // Panel state
    setSettingsOpen: (open: boolean) => dispatch(setSettingsOpen(open)),
    setCurrentTab: (tab: string) => dispatch(setCurrentTab(tab)),

    // Save state
    setHasUnsavedChanges: (hasChanges: boolean) =>
      dispatch(setHasUnsavedChanges(hasChanges)),
    markSettingsSaved: () => dispatch(markSettingsSaved()),
  };
};
