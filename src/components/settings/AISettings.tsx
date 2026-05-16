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
type ProviderConfigKey = Exclude<keyof AISettingsType, 'provider'>;
type FieldKey =
  | keyof AISettingsType[ProviderConfigKey]
  | 'apiKey';

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

const providerOptions: Array<{ value: AIProvider; labelKey: string }> = [
  { value: 'ollama', labelKey: 'settingsPanel.providerOllama' },
  { value: 'deepseek', labelKey: 'settingsPanel.providerDeepSeek' },
  { value: 'openai_compatible', labelKey: 'settingsPanel.providerOpenAICompatible' },
  { value: 'openai', labelKey: 'settingsPanel.providerOpenAI' },
  { value: 'azure', labelKey: 'settingsPanel.providerAzure' },
  { value: 'anthropic', labelKey: 'settingsPanel.providerAnthropic' },
  { value: 'glm', labelKey: 'settingsPanel.providerGLM' },
  { value: 'kimi', labelKey: 'settingsPanel.providerKimi' },
  { value: 'minimax', labelKey: 'settingsPanel.providerMiniMax' },
];

const providersWithApiKey: AIProvider[] = [
  'deepseek',
  'openai_compatible',
  'openai',
  'azure',
  'anthropic',
  'glm',
  'kimi',
  'minimax',
];

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
      const filterUndefined = <T extends Record<string, unknown>>(
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
        openai_compatible: {
          ...DEFAULT_SETTINGS.ai.openai_compatible,
          ...(settings?.openai_compatible
            ? filterUndefined(settings.openai_compatible)
            : {}),
        },
        openai: {
          ...DEFAULT_SETTINGS.ai.openai,
          ...(settings?.openai ? filterUndefined(settings.openai) : {}),
        },
        azure: {
          ...DEFAULT_SETTINGS.ai.azure,
          ...(settings?.azure ? filterUndefined(settings.azure) : {}),
        },
        anthropic: {
          ...DEFAULT_SETTINGS.ai.anthropic,
          ...(settings?.anthropic ? filterUndefined(settings.anthropic) : {}),
        },
        glm: {
          ...DEFAULT_SETTINGS.ai.glm,
          ...(settings?.glm ? filterUndefined(settings.glm) : {}),
        },
        kimi: {
          ...DEFAULT_SETTINGS.ai.kimi,
          ...(settings?.kimi ? filterUndefined(settings.kimi) : {}),
        },
        minimax: {
          ...DEFAULT_SETTINGS.ai.minimax,
          ...(settings?.minimax ? filterUndefined(settings.minimax) : {}),
        },
      };
    }, [
      settings?.provider,
      settings?.ollama,
      settings?.deepseek,
      settings?.openai_compatible,
      settings?.openai,
      settings?.azure,
      settings?.anthropic,
      settings?.glm,
      settings?.kimi,
      settings?.minimax,
    ]);

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
    const providerDisplayName = t(
      providerOptions.find((option) => option.value === currentProvider)
        ?.labelKey ?? 'settingsPanel.provider'
    );

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
        const typedValue = value as string | number;
        if (currentProvider === 'ollama' && fieldKey === 'apiKey') {
          return prev;
        }
        if (currentProvider === 'ollama') {
          return {
            ...prev,
            ollama: {
              ...prev.ollama,
              [fieldKey]: typedValue,
            },
          };
        }
        return {
          ...prev,
          [currentProvider]: {
            ...prev[currentProvider],
            [fieldKey]: typedValue,
          },
        };
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
          providers: providersWithApiKey,
          required: true,
          validate: (value) =>
            currentProvider === 'openai_compatible' ||
            (typeof value === 'string' && value.trim().length > 0),
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
              : currentProvider === 'openai_compatible'
                ? 'settingsPanel.apiUrlOpenAICompatiblePlaceholder'
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
            {providerOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {t(option.labelKey)}
              </option>
            ))}
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
                ? currentProvider !== 'ollama'
                  ? (localSettings[currentProvider] as { apiKey?: string })
                      .apiKey ?? ''
                  : ''
                : (currentConfig[field.key] as string | number) ?? '';

            // Extract properties that don't belong to SettingsInput
            const { key, providers, ...inputProps } = field;
            void providers;

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
