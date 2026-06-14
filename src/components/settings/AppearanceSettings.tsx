import {
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { AppearanceSettings as AppearanceSettingsType } from '@/types';
import { useI18n } from '@/i18n/i18n';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { SettingsInput, SelectOption } from './SettingsInput';
import styles from './SettingsPanel.module.scss';

interface AppearanceSettingsProps {
  settings: AppearanceSettingsType;
}

export interface AppearanceSettingsRef {
  getCurrentSettings: () => AppearanceSettingsType;
}

/**
 * Appearance settings section component
 * Handles theme, font size, and font family settings
 * Maintains local state and exposes getCurrentSettings via ref
 */
export const AppearanceSettings = forwardRef<
  AppearanceSettingsRef,
  AppearanceSettingsProps
>(({ settings }, ref) => {
  const { t } = useI18n();

  // Merge with default values to ensure all fields are always present
  const initialSettings = useMemo(
    () => ({
      theme: settings?.theme ?? DEFAULT_SETTINGS.appearance.theme,
      fontSize: settings?.fontSize ?? DEFAULT_SETTINGS.appearance.fontSize,
      fontFamily:
        settings?.fontFamily ?? DEFAULT_SETTINGS.appearance.fontFamily,
    }),
    [settings]
  );

  // Local state for appearance settings
  const [localSettings, setLocalSettings] =
    useState<AppearanceSettingsType>(initialSettings);

  // Update local state when props change (e.g., when switching tabs or resetting)
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  // Expose getCurrentSettings method via ref
  useImperativeHandle(ref, () => ({
    getCurrentSettings: () => localSettings,
  }));

  const themeOptions: SelectOption[] = useMemo(
    () => [
      { value: 'dark', labelKey: 'settingsPanel.themeDark' },
      { value: 'light', labelKey: 'settingsPanel.themeLight' },
      { value: 'auto', labelKey: 'settingsPanel.themeAuto' },
    ],
    []
  );

  const fontSizeOptions: SelectOption[] = useMemo(
    () => [
      { value: 'small', labelKey: 'settingsPanel.fontSizeSmall' },
      { value: 'medium', labelKey: 'settingsPanel.fontSizeMedium' },
      { value: 'large', labelKey: 'settingsPanel.fontSizeLarge' },
    ],
    []
  );

  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.appearance')}</h3>
      <SettingsInput
        type='select'
        labelKey='settingsPanel.theme'
        value={localSettings.theme}
        onChange={(newValue) =>
          setLocalSettings((prev) => ({
            ...prev,
            theme: newValue as 'light' | 'dark' | 'auto',
          }))
        }
        options={themeOptions}
      />
      <SettingsInput
        type='select'
        labelKey='settingsPanel.fontSize'
        value={localSettings.fontSize}
        onChange={(newValue) =>
          setLocalSettings((prev) => ({
            ...prev,
            fontSize: newValue as 'small' | 'medium' | 'large',
          }))
        }
        options={fontSizeOptions}
      />
      <SettingsInput
        type='text'
        labelKey='settingsPanel.fontFamily'
        value={localSettings.fontFamily}
        onChange={(newValue) =>
          setLocalSettings((prev) => ({
            ...prev,
            fontFamily: newValue as string,
          }))
        }
        placeholderKey='settingsPanel.fontFamilyPlaceholder'
      />
    </div>
  );
});

AppearanceSettings.displayName = 'AppearanceSettings';
