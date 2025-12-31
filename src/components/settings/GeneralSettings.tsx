import {
  useState,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { GeneralSettings as GeneralSettingsType } from '@/types';
import { useI18n, availableLocales } from '@/i18n/i18n';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { SettingsInput, SelectOption } from './SettingsInput';
import styles from './SettingsPanel.module.scss';

interface GeneralSettingsProps {
  settings: GeneralSettingsType;
}

export interface GeneralSettingsRef {
  getCurrentSettings: () => GeneralSettingsType;
}

/**
 * General settings section component
 * Handles language selection and other general preferences
 * Maintains local state and exposes getCurrentSettings via ref
 */
export const GeneralSettings = forwardRef<
  GeneralSettingsRef,
  GeneralSettingsProps
>(({ settings }, ref) => {
  const { t } = useI18n();

  // Merge with default values to ensure all fields are always present
  // Use useMemo to prevent recreating the object on every render
  const initialSettings = useMemo<GeneralSettingsType>(
    () => ({
      language: settings?.language ?? DEFAULT_SETTINGS.general.language,
      autoStart: settings?.autoStart ?? DEFAULT_SETTINGS.general.autoStart,
      minimizeToTray:
        settings?.minimizeToTray ?? DEFAULT_SETTINGS.general.minimizeToTray,
      startWithSystem:
        settings?.startWithSystem ?? DEFAULT_SETTINGS.general.startWithSystem,
    }),
    [
      settings?.language,
      settings?.autoStart,
      settings?.minimizeToTray,
      settings?.startWithSystem,
    ]
  );

  // Local state for general settings
  const [localSettings, setLocalSettings] =
    useState<GeneralSettingsType>(initialSettings);

  // Update local state when props change (e.g., when switching tabs or resetting)
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  // Expose getCurrentSettings method via ref
  useImperativeHandle(ref, () => ({
    getCurrentSettings: () => localSettings,
  }));

  // Convert availableLocales to SelectOption format
  const languageOptions: SelectOption[] = useMemo(
    () =>
      availableLocales.map((loc) => ({
        value: loc,
        labelKey: `language.${loc}`,
      })),
    []
  );

  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.general')}</h3>
      <SettingsInput
        type='select'
        labelKey='settingsPanel.language'
        value={localSettings.language}
        onChange={(newValue) =>
          setLocalSettings((prev) => ({
            ...prev,
            language: newValue as string,
          }))
        }
        options={languageOptions}
      />
    </div>
  );
});

GeneralSettings.displayName = 'GeneralSettings';
