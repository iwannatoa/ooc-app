import { useAppSelector, useAppDispatch } from './redux';
import {
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
} from '@/store/slices/settingsSlice';
import {
  OllamaConfig,
  DeepSeekConfig,
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
