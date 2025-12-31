import {
  useState,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { AdvancedSettings as AdvancedSettingsType } from '@/types';
import { useI18n } from '@/i18n/i18n';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { SettingsInput, SelectOption } from './SettingsInput';
import styles from './SettingsPanel.module.scss';

interface AdvancedSettingsProps {
  settings: AdvancedSettingsType;
}

export interface AdvancedSettingsRef {
  getCurrentSettings: () => AdvancedSettingsType;
}

type FieldType = 'checkbox' | 'number' | 'select';
type FieldKey = keyof AdvancedSettingsType;

interface FieldConfig {
  key: FieldKey;
  type: FieldType;
  labelKey: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  getValue?: (settings: AdvancedSettingsType) => string | number | boolean;
  parseValue?: (value: string) => string | number | boolean;
  validate?: (value: string | number | boolean) => boolean;
}

/**
 * Advanced settings section component
 * Handles advanced configuration options
 * Maintains local state and exposes getCurrentSettings via ref
 */
export const AdvancedSettings = forwardRef<
  AdvancedSettingsRef,
  AdvancedSettingsProps
>(({ settings }, ref) => {
  const { t } = useI18n();

  // Merge with default values to ensure all fields are always present
  const initialSettings = useMemo<AdvancedSettingsType>(
    () => ({
      enableStreaming:
        settings?.enableStreaming ?? DEFAULT_SETTINGS.advanced.enableStreaming,
      apiTimeout: settings?.apiTimeout ?? DEFAULT_SETTINGS.advanced.apiTimeout,
      maxRetries: settings?.maxRetries ?? DEFAULT_SETTINGS.advanced.maxRetries,
      logLevel: settings?.logLevel ?? DEFAULT_SETTINGS.advanced.logLevel,
      enableDiagnostics:
        settings?.enableDiagnostics ??
        DEFAULT_SETTINGS.advanced.enableDiagnostics,
    }),
    [
      settings?.enableStreaming,
      settings?.apiTimeout,
      settings?.maxRetries,
      settings?.logLevel,
      settings?.enableDiagnostics,
    ]
  );

  // Local state for advanced settings
  const [localSettings, setLocalSettings] =
    useState<AdvancedSettingsType>(initialSettings);

  // Update local state when props change (e.g., when switching tabs or resetting)
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  // Expose getCurrentSettings method via ref
  useImperativeHandle(ref, () => ({
    getCurrentSettings: () => localSettings,
  }));

  // Generic field update handler
  const handleFieldChange = (
    fieldKey: FieldKey,
    value: string | number | boolean
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  // Field configuration
  const fieldConfigs: FieldConfig[] = [
    {
      key: 'enableStreaming',
      type: 'checkbox',
      labelKey: 'settingsPanel.enableStreaming',
      getValue: (settings) => settings.enableStreaming ?? false,
      parseValue: (value) => value === 'true',
      validate: () => true,
    },
    {
      key: 'apiTimeout',
      type: 'number',
      labelKey: 'settingsPanel.apiTimeout',
      required: true,
      getValue: (settings) => {
        const val = settings.apiTimeout;
        return val !== undefined && val !== null ? val : '';
      },
      parseValue: (value) => {
        if (value === '' || value === null || value === undefined) return '';
        const parsed = parseInt(value);
        return isNaN(parsed) ? '' : parsed;
      },
      validate: (value) => typeof value === 'number' && value > 0,
    },
    {
      key: 'maxRetries',
      type: 'number',
      labelKey: 'settingsPanel.maxRetries',
      required: true,
      min: 0,
      max: 10,
      getValue: (settings) => {
        const val = settings.maxRetries;
        return val !== undefined && val !== null ? val : '';
      },
      parseValue: (value) => {
        if (value === '' || value === null || value === undefined) return '';
        const parsed = parseInt(value);
        return isNaN(parsed) ? '' : parsed;
      },
      validate: (value) =>
        typeof value === 'number' && value >= 0 && value <= 10,
    },
    {
      key: 'logLevel',
      type: 'select',
      labelKey: 'settingsPanel.logLevel',
      required: true,
      options: [
        { value: 'error', labelKey: 'settingsPanel.logLevelError' },
        { value: 'warn', labelKey: 'settingsPanel.logLevelWarn' },
        { value: 'info', labelKey: 'settingsPanel.logLevelInfo' },
        { value: 'debug', labelKey: 'settingsPanel.logLevelDebug' },
      ],
      getValue: (settings) => settings.logLevel ?? 'info',
      parseValue: (value) => value,
      validate: (value) =>
        typeof value === 'string' &&
        ['error', 'warn', 'info', 'debug'].includes(value),
    },
    {
      key: 'enableDiagnostics',
      type: 'checkbox',
      labelKey: 'settingsPanel.enableDiagnostics',
      getValue: (settings) => settings.enableDiagnostics ?? false,
      parseValue: (value) => value === 'true',
      validate: () => true,
    },
  ];

  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.advanced')}</h3>

      {fieldConfigs.map((field) => {
        // Get value directly from settings (initialSettings ensures defaults are present)
        const value = field.getValue
          ? field.getValue(localSettings)
          : (localSettings[field.key] as string | number | boolean) ?? '';

        // Extract properties that don't belong to SettingsInput
        const { key, getValue, ...inputProps } = field;

        return (
          <SettingsInput
            key={key}
            {...inputProps}
            value={value}
            onChange={(newValue) => handleFieldChange(key, newValue)}
            placeholder={
              field.type === 'number'
                ? t('settingsPanel.fieldRequired')
                : undefined
            }
          />
        );
      })}
    </div>
  );
});

AdvancedSettings.displayName = 'AdvancedSettings';
