import {
  useState,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { AIProvider, AISettings as AISettingsType } from '@/types';
import { useI18n } from '@/i18n/i18n';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { SettingsInput } from './SettingsInput';
import styles from './SettingsPanel.module.scss';

interface AISettingsProps {
  settings: AISettingsType;
}

export interface AISettingsRef {
  getCurrentSettings: () => AISettingsType;
}

type FieldType = 'text' | 'number' | 'password';
type FieldKey = keyof AISettingsType['ollama'] | 'apiKey';

interface FieldConfig {
  key: FieldKey;
  type: FieldType;
  labelKey: string;
  placeholderKey?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  providers?: AIProvider[];
  required?: boolean;
  parseValue?: (value: string) => string | number;
  validate?: (value: string | number | boolean) => boolean;
}

/**
 * AI settings section component
 * Handles AI provider selection and configuration
 * Maintains local state and exposes getCurrentSettings via ref
 */
export const AISettings = forwardRef<AISettingsRef, AISettingsProps>(
  ({ settings }, ref) => {
    const { t } = useI18n();

    // Merge with default values to ensure all fields are always present
    // Filter out undefined values to preserve defaults
    const initialSettings = useMemo<AISettingsType>(() => {
      const filterUndefined = <T extends Record<string, any>>(
        obj: T
      ): Partial<T> => {
        return Object.fromEntries(
          Object.entries(obj).filter(([_, value]) => value !== undefined)
        ) as Partial<T>;
      };

      return {
        provider: settings?.provider ?? DEFAULT_SETTINGS.ai.provider,
        ollama: {
          ...DEFAULT_SETTINGS.ai.ollama,
          ...(settings?.ollama ? filterUndefined(settings.ollama) : {}),
        },
        deepseek: {
          ...DEFAULT_SETTINGS.ai.deepseek,
          ...(settings?.deepseek ? filterUndefined(settings.deepseek) : {}),
        },
      };
    }, [settings?.provider, settings?.ollama, settings?.deepseek]);

    // Local state for AI settings
    const [localSettings, setLocalSettings] =
      useState<AISettingsType>(initialSettings);

    // Update local state when props change (e.g., when switching tabs or resetting)
    useEffect(() => {
      setLocalSettings(initialSettings);
    }, [initialSettings]);

    // Expose getCurrentSettings method via ref
    useImperativeHandle(ref, () => ({
      getCurrentSettings: () => localSettings,
    }));

    const currentProvider = localSettings.provider;
    const currentConfig = localSettings[currentProvider];
    const providerDisplayName =
      currentProvider === 'ollama'
        ? t('settingsPanel.providerOllama')
        : t('settingsPanel.providerDeepSeek');

    const handleProviderChange = (provider: AIProvider) => {
      setLocalSettings((prev) => ({
        ...prev,
        provider,
      }));
    };

    // Generic field update handler
    const handleFieldChange = (
      fieldKey: FieldKey,
      value: string | number | boolean
    ) => {
      // AISettings only uses string | number, so filter out boolean
      if (typeof value === 'boolean') return;

      setLocalSettings((prev) => {
        if (currentProvider === 'ollama') {
          if (fieldKey === 'apiKey') return prev; // apiKey doesn't exist for ollama
          return {
            ...prev,
            ollama: {
              ...prev.ollama,
              [fieldKey]: value as string | number,
            },
          };
        } else {
          return {
            ...prev,
            deepseek: {
              ...prev.deepseek,
              [fieldKey]: value as string | number,
            },
          };
        }
      });
    };

    // Field configuration
    const getFieldConfigs = useCallback(
      (): FieldConfig[] => [
        {
          key: 'apiKey',
          type: 'password',
          labelKey: 'settingsPanel.apiKey',
          placeholderKey: 'settingsPanel.apiKeyPlaceholder',
          providers: ['deepseek'],
          required: true,
          validate: (value) =>
            typeof value === 'string' && value.trim().length > 0,
        },
        {
          key: 'baseUrl',
          type: 'text',
          labelKey:
            currentProvider === 'ollama'
              ? 'settingsPanel.ollamaAddress'
              : 'settingsPanel.apiUrl',
          placeholder:
            currentProvider === 'ollama' ? 'http://localhost:11434' : undefined,
          placeholderKey:
            currentProvider === 'deepseek'
              ? 'settingsPanel.apiUrlPlaceholder'
              : undefined,
          required: true,
          validate: (value) =>
            typeof value === 'string' && value.trim().length > 0,
        },
        {
          key: 'model',
          type: 'text',
          labelKey: 'settingsPanel.model',
          placeholderKey: 'settingsPanel.modelPlaceholder',
          required: true,
          validate: (value) =>
            typeof value === 'string' && value.trim().length > 0,
        },
        {
          key: 'timeout',
          type: 'number',
          labelKey: 'settingsPanel.timeout',
          required: true,
          parseValue: (value) => {
            if (!value) return '';
            const parsed = parseInt(value);
            return isNaN(parsed) ? '' : parsed;
          },
          validate: (value) => typeof value === 'number' && value > 0,
        },
        {
          key: 'maxTokens',
          type: 'number',
          labelKey: 'settingsPanel.maxTokens',
          required: true,
          parseValue: (value) => {
            if (!value) return '';
            const parsed = parseInt(value);
            return isNaN(parsed) ? '' : parsed;
          },
          validate: (value) => typeof value === 'number' && value > 0,
        },
        {
          key: 'temperature',
          type: 'number',
          labelKey: 'settingsPanel.temperature',
          min: 0,
          max: 2,
          step: 0.1,
          required: true,
          parseValue: (value) => {
            if (!value) return '';
            const parsed = parseFloat(value);
            return isNaN(parsed) ? '' : parsed;
          },
          validate: (value) =>
            typeof value === 'number' && value >= 0 && value <= 2,
        },
      ],
      [currentProvider]
    );

    const fieldConfigs = getFieldConfigs();

    // Filter fields based on provider
    const visibleFields = fieldConfigs.filter(
      (field) => !field.providers || field.providers.includes(currentProvider)
    );

    return (
      <div className={styles.settingsSection}>
        <h3>{t('settingsPanel.tabs.ai')}</h3>
        <div className={styles.settingItem}>
          <label>{t('settingsPanel.provider')}</label>
          <select
            value={currentProvider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
          >
            <option value='ollama'>{t('settingsPanel.providerOllama')}</option>
            <option value='deepseek'>
              {t('settingsPanel.providerDeepSeek')}
            </option>
          </select>
        </div>

        <div className={styles.providerConfig}>
          <h4>
            {currentProvider.toUpperCase()} {t('settingsPanel.config')}
          </h4>

          {visibleFields.map((field) => {
            // Get value directly from config (initialSettings ensures defaults are present)
            const value =
              field.key === 'apiKey'
                ? currentProvider === 'deepseek'
                  ? localSettings.deepseek.apiKey ?? ''
                  : ''
                : (currentConfig[field.key] as string | number) ?? '';

            // Extract properties that don't belong to SettingsInput
            const { key, providers, ...inputProps } = field;

            return (
              <SettingsInput
                key={key}
                {...inputProps}
                value={value}
                onChange={(newValue) => handleFieldChange(key, newValue)}
                placeholderParams={
                  key === 'apiKey'
                    ? { provider: providerDisplayName }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    );
  }
);

AISettings.displayName = 'AISettings';
