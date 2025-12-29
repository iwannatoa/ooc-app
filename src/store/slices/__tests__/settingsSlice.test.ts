import { describe, it, expect } from 'vitest';
import settingsReducer, {
  updateSettings,
  setSettings,
  updateAiProvider,
  updateOllamaConfig,
  setSettingsOpen,
  markSettingsSaved,
} from '../settingsSlice';
import { DEFAULT_SETTINGS } from '@/types/constants';

describe('settingsSlice', () => {
  it('should update settings', () => {
    const state = settingsReducer(
      undefined,
      updateSettings({ general: { language: 'en' } })
    );
    expect(state.settings.general.language).toBe('en');
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('should set full settings', () => {
    const newSettings = { ...DEFAULT_SETTINGS };
    const state = settingsReducer(undefined, setSettings(newSettings));
    expect(state.settings).toEqual(newSettings);
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('should update AI provider', () => {
    const state = settingsReducer(undefined, updateAiProvider('deepseek'));
    expect(state.settings.ai.provider).toBe('deepseek');
  });

  it('should update Ollama config', () => {
    const state = settingsReducer(
      undefined,
      updateOllamaConfig({ model: 'new-model' })
    );
    expect(state.settings.ai.ollama.model).toBe('new-model');
  });

  it('should open settings panel', () => {
    const state = settingsReducer(undefined, setSettingsOpen(true));
    expect(state.isSettingsOpen).toBe(true);
  });

  it('should mark settings as saved', () => {
    const stateWithChanges = settingsReducer(
      undefined,
      updateSettings({ general: { language: 'en' } })
    );
    const state = settingsReducer(stateWithChanges, markSettingsSaved());
    expect(state.hasUnsavedChanges).toBe(false);
  });
});

