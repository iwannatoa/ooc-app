import React, { useState } from 'react';
import { AIProvider, AISettings, AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useI18n, availableLocales } from '@/i18n';
import styles from './SettingsPanel.module.scss';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onClose: () => void;
  open: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose,
  open,
}) => {
  const { locale, setLocale, t } = useI18n();
  const {
    updateAiProvider,
    updateOllamaConfig,
    updateDeepSeekConfig,
    updateAppearanceSettings,
    updateAdvancedSettings,
  } = useSettingsState();

  const [currentTab, setCurrentTab] = useState<
    'general' | 'ai' | 'appearance' | 'advanced'
  >('general');
  const [localSettings, setLocalSettings] = useState(settings);

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

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    onClose();
  };

  if (!open) return null;

  const currentProvider = settings.ai.provider;
  const currentConfig = settings.ai[currentProvider];

  return (
    <div className={styles.settingsPanelOverlay}>
      <div className={styles.settingsPanel}>
        <div className={styles.settingsHeader}>
          <h2>{t('settingsPanel.title')}</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div className={styles.settingsTabs}>
          <button
            className={`${styles.tab} ${
              currentTab === 'general' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('general')}
          >
            {t('settingsPanel.tabs.general')}
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'ai' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('ai')}
          >
            {t('settingsPanel.tabs.ai')}
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'appearance' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('appearance')}
          >
            {t('settingsPanel.tabs.appearance')}
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'advanced' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('advanced')}
          >
            {t('settingsPanel.tabs.advanced')}
          </button>
        </div>

        <div className={styles.settingsContent}>
          {currentTab === 'general' && (
            <div className={styles.settingsSection}>
              <h3>{t('settingsPanel.tabs.general')}</h3>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.language')}</label>
                <select
                  value={locale}
                  onChange={(e) => {
                    const newLocale = e.target.value;
                    if (availableLocales.includes(newLocale as any)) {
                      setLocale(newLocale as any);
                    }
                  }}
                >
                  {availableLocales.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === 'zh' ? '中文' : loc === 'en' ? 'English' : loc.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentTab === 'ai' && (
            <div className={styles.settingsSection}>
              <h3>{t('settingsPanel.provider')}</h3>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.selectProvider')}</label>
                <select
                  value={currentProvider}
                  onChange={(e) =>
                    handleProviderChange(e.target.value as AIProvider)
                  }
                >
                  <option value='ollama'>{t('settingsPanel.providerOllama')}</option>
                  <option value='deepseek'>{t('settingsPanel.providerDeepSeek')}</option>
                </select>
              </div>

              <div className={styles.providerConfig}>
                <h4>{currentProvider.toUpperCase()} {t('settingsPanel.config')}</h4>

                <div className={styles.settingItem}>
                  <label>{t('settingsPanel.model')}</label>
                  <input
                    type='text'
                    value={currentConfig.model}
                    onChange={(e) =>
                      handleModelChange(currentProvider, e.target.value)
                    }
                    placeholder={t('settingsPanel.modelPlaceholder')}
                  />
                </div>

                {currentProvider !== 'ollama' && (
                  <>
                    <div className={styles.settingItem}>
                      <label>{t('settingsPanel.apiKey')}</label>
                      <input
                        type='password'
                        value={
                          (currentConfig as AISettings[typeof currentProvider])
                            .apiKey || ''
                        }
                        onChange={(e) =>
                          handleApiKeyChange(currentProvider, e.target.value)
                        }
                        placeholder={t('settingsPanel.apiKeyPlaceholder', { provider: currentProvider })}
                      />
                    </div>
                    <div className={styles.settingItem}>
                      <label>{t('settingsPanel.apiUrl')}</label>
                      <input
                        type='text'
                        value={currentConfig.baseUrl}
                        onChange={(e) =>
                          handleBaseUrlChange(currentProvider, e.target.value)
                        }
                        placeholder={t('settingsPanel.apiUrlPlaceholder')}
                      />
                    </div>
                  </>
                )}

                {currentProvider === 'ollama' && (
                  <div className={styles.settingItem}>
                    <label>{t('settingsPanel.ollamaAddress')}</label>
                    <input
                      type='text'
                      value={currentConfig.baseUrl}
                      onChange={(e) =>
                        handleBaseUrlChange('ollama', e.target.value)
                      }
                      placeholder='http://localhost:11434'
                    />
                  </div>
                )}
              </div>

              <div className={styles.settingItem}>
                <label>{t('settingsPanel.timeout')}</label>
                <input
                  type='number'
                  value={currentConfig.timeout}
                  onChange={(e) => {
                    if (currentProvider === 'ollama') {
                      updateOllamaConfig({ timeout: parseInt(e.target.value) });
                    } else if (currentProvider === 'deepseek') {
                      updateDeepSeekConfig({ timeout: parseInt(e.target.value) });
                    }
                  }}
                />
              </div>

              <div className={styles.settingItem}>
                <label>{t('settingsPanel.maxTokens')}</label>
                <input
                  type='number'
                  value={currentConfig.maxTokens}
                  onChange={(e) => {
                    if (currentProvider === 'ollama') {
                      updateOllamaConfig({ maxTokens: parseInt(e.target.value) });
                    } else if (currentProvider === 'deepseek') {
                      updateDeepSeekConfig({ maxTokens: parseInt(e.target.value) });
                    }
                  }}
                />
              </div>

              <div className={styles.settingItem}>
                <label>
                  {t('settingsPanel.temperature')}: {currentConfig.temperature}
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.1'
                    value={currentConfig.temperature}
                    onChange={(e) => {
                      if (currentProvider === 'ollama') {
                        updateOllamaConfig({ temperature: parseFloat(e.target.value) });
                      } else if (currentProvider === 'deepseek') {
                        updateDeepSeekConfig({ temperature: parseFloat(e.target.value) });
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {currentTab === 'appearance' && (
            <div className={styles.settingsSection}>
              <h3>{t('settingsPanel.tabs.appearance')}</h3>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.theme')}</label>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) =>
                    updateAppearanceSettings({ theme: e.target.value as any })
                  }
                >
                  <option value='dark'>{t('settingsPanel.themeDark')}</option>
                  <option value='light'>{t('settingsPanel.themeLight')}</option>
                  <option value='auto'>{t('settingsPanel.themeAuto')}</option>
                </select>
              </div>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.fontSize')}</label>
                <input
                  type='number'
                  value={settings.appearance.fontSize}
                  onChange={(e) =>
                    updateAppearanceSettings({
                      fontSize: parseInt(e.target.value),
                    })
                  }
                  min='12'
                  max='24'
                />
              </div>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.fontFamily')}</label>
                <input
                  type='text'
                  value={settings.appearance.fontFamily}
                  onChange={(e) =>
                    updateAppearanceSettings({ fontFamily: e.target.value })
                  }
                  placeholder={t('settingsPanel.fontFamilyPlaceholder')}
                />
              </div>
              <div className={styles.settingItem}>
                <label>
                  <input
                    type='checkbox'
                    checked={settings.appearance.compactMode}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        compactMode: e.target.checked,
                      })
                    }
                  />
                  {t('settingsPanel.compactMode')}
                </label>
              </div>
            </div>
          )}

          {currentTab === 'advanced' && (
            <div className={styles.settingsSection}>
              <h3>{t('settingsPanel.tabs.advanced')}</h3>
              <div className={styles.settingItem}>
                <label>
                  <input
                    type='checkbox'
                    checked={settings.advanced.enableStreaming}
                    onChange={(e) =>
                      updateAdvancedSettings({
                        enableStreaming: e.target.checked,
                      })
                    }
                  />
                  {t('settingsPanel.enableStreaming')}
                </label>
              </div>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.apiTimeout')}</label>
                <input
                  type='number'
                  value={settings.advanced.apiTimeout}
                  onChange={(e) =>
                    updateAdvancedSettings({
                      apiTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.maxRetries')}</label>
                <input
                  type='number'
                  value={settings.advanced.maxRetries}
                  onChange={(e) =>
                    updateAdvancedSettings({
                      maxRetries: parseInt(e.target.value),
                    })
                  }
                  min='0'
                  max='10'
                />
              </div>
              <div className={styles.settingItem}>
                <label>{t('settingsPanel.logLevel')}</label>
                <select
                  value={settings.advanced.logLevel}
                  onChange={(e) =>
                    updateAdvancedSettings({ logLevel: e.target.value as any })
                  }
                >
                  <option value='error'>{t('settingsPanel.logLevelError')}</option>
                  <option value='warn'>{t('settingsPanel.logLevelWarn')}</option>
                  <option value='info'>{t('settingsPanel.logLevelInfo')}</option>
                  <option value='debug'>{t('settingsPanel.logLevelDebug')}</option>
                </select>
              </div>
              <div className={styles.settingItem}>
                <label>
                  <input
                    type='checkbox'
                    checked={settings.advanced.enableDiagnostics}
                    onChange={(e) =>
                      updateAdvancedSettings({
                        enableDiagnostics: e.target.checked,
                      })
                    }
                  />
                  {t('settingsPanel.enableDiagnostics')}
                </label>
              </div>
            </div>
          )}
        </div>

        <div className={styles.settingsActions}>
          <button onClick={handleCancel}>{t('common.cancel')}</button>
          <button
            onClick={handleSave}
            className={styles.primary}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
