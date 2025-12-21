import React from 'react';
import { AIProvider, AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
import styles from '../SettingsPanel.module.scss';

interface AISettingsProps {
  settings: AppSettings;
  t: (key: string) => string;
}

/**
 * AI settings section component
 * Handles AI provider selection and configuration
 */
export const AISettings: React.FC<AISettingsProps> = ({ settings, t }) => {
  const {
    updateAiProvider,
    updateOllamaConfig,
    updateDeepSeekConfig,
  } = useSettingsState();

  const currentProvider = settings.ai.provider;
  const currentConfig = settings.ai[currentProvider];
  const providerDisplayName = currentProvider === 'ollama' 
    ? t('settingsPanel.providerOllama')
    : t('settingsPanel.providerDeepSeek');

  const handleProviderChange = (provider: AIProvider) => {
    updateAiProvider(provider);
  };

  const handleApiKeyChange = (provider: AIProvider, apiKey: string) => {
    if (provider === 'deepseek') {
      updateDeepSeekConfig({ apiKey });
    }
  };

  const handleBaseUrlChange = (provider: AIProvider, baseUrl: string) => {
    if (provider === 'ollama') {
      updateOllamaConfig({ baseUrl });
    } else if (provider === 'deepseek') {
      updateDeepSeekConfig({ baseUrl });
    }
  };

  const handleModelChange = (provider: AIProvider, model: string) => {
    if (provider === 'ollama') {
      updateOllamaConfig({ model });
    } else if (provider === 'deepseek') {
      updateDeepSeekConfig({ model });
    }
  };

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

        {currentProvider === 'deepseek' && (
          <div className={styles.settingItem}>
            <label>{t('settingsPanel.apiKey')}</label>
            <input
              type='password'
              value={currentConfig.apiKey || ''}
              onChange={(e) =>
                handleApiKeyChange(currentProvider, e.target.value)
              }
              placeholder={t('settingsPanel.apiKeyPlaceholder', {
                provider: providerDisplayName,
              })}
            />
          </div>
        )}

        {currentProvider === 'ollama' ? (
          <div className={styles.settingItem}>
            <label>{t('settingsPanel.ollamaAddress')}</label>
            <input
              type='text'
              value={currentConfig.baseUrl || ''}
              onChange={(e) => handleBaseUrlChange('ollama', e.target.value)}
              placeholder='http://localhost:11434'
            />
          </div>
        ) : (
          <div className={styles.settingItem}>
            <label>{t('settingsPanel.apiUrl')}</label>
            <input
              type='text'
              value={currentConfig.baseUrl || ''}
              onChange={(e) =>
                handleBaseUrlChange(currentProvider, e.target.value)
              }
              placeholder={t('settingsPanel.apiUrlPlaceholder')}
            />
          </div>
        )}

        <div className={styles.settingItem}>
          <label>{t('settingsPanel.model')}</label>
          <input
            type='text'
            value={currentConfig.model || ''}
            onChange={(e) =>
              handleModelChange(currentProvider, e.target.value)
            }
            placeholder={t('settingsPanel.modelPlaceholder')}
          />
        </div>

        <div className={styles.settingItem}>
          <label>{t('settingsPanel.timeout')}</label>
          <input
            type='number'
            value={currentConfig.timeout || 60}
            onChange={(e) => {
              if (currentProvider === 'ollama') {
                updateOllamaConfig({ timeout: parseInt(e.target.value) });
              } else if (currentProvider === 'deepseek') {
                updateDeepSeekConfig({
                  timeout: parseInt(e.target.value),
                });
              }
            }}
          />
        </div>

        <div className={styles.settingItem}>
          <label>{t('settingsPanel.maxTokens')}</label>
          <input
            type='number'
            value={currentConfig.maxTokens || 2000}
            onChange={(e) => {
              if (currentProvider === 'ollama') {
                updateOllamaConfig({
                  maxTokens: parseInt(e.target.value),
                });
              } else if (currentProvider === 'deepseek') {
                updateDeepSeekConfig({
                  maxTokens: parseInt(e.target.value),
                });
              }
            }}
          />
        </div>

        <div className={styles.settingItem}>
          <label>{t('settingsPanel.temperature')}</label>
          <input
            type='number'
            step='0.1'
            min='0'
            max='2'
            value={currentConfig.temperature || 0.7}
            onChange={(e) => {
              if (currentProvider === 'ollama') {
                updateOllamaConfig({
                  temperature: parseFloat(e.target.value),
                });
              } else if (currentProvider === 'deepseek') {
                updateDeepSeekConfig({
                  temperature: parseFloat(e.target.value),
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

