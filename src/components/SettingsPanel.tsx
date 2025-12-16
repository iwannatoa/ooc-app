import React, { useState } from 'react';
import { AIProvider, AISettings, AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
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
  const {
    updateAiProvider,
    updateOllamaConfig,
    updateDeepSeekConfig,
    updateOpenAIConfig,
    updateAnthropicConfig,
    updateCustomConfig,
    updateGeneralSettings,
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
    const updateActions = {
      ollama: updateOllamaConfig,
      deepseek: updateDeepSeekConfig,
      openai: updateOpenAIConfig,
      anthropic: updateAnthropicConfig,
      custom: updateCustomConfig,
    };

    updateActions[provider]?.({ apiKey });
  };

  const handleBaseUrlChange = (provider: AIProvider, baseUrl: string) => {
    const updateActions = {
      ollama: updateOllamaConfig,
      deepseek: updateDeepSeekConfig,
      openai: updateOpenAIConfig,
      anthropic: updateAnthropicConfig,
      custom: updateCustomConfig,
    };

    updateActions[provider]?.({ baseUrl });
  };

  const handleModelChange = (provider: AIProvider, model: string) => {
    const updateActions = {
      ollama: updateOllamaConfig,
      deepseek: updateDeepSeekConfig,
      openai: updateOpenAIConfig,
      anthropic: updateAnthropicConfig,
      custom: updateCustomConfig,
    };

    updateActions[provider]?.({ model });
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
          <h2>设置</h2>
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
            通用
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'ai' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('ai')}
          >
            AI 设置
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'appearance' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('appearance')}
          >
            外观
          </button>
          <button
            className={`${styles.tab} ${
              currentTab === 'advanced' ? styles.active : ''
            }`}
            onClick={() => setCurrentTab('advanced')}
          >
            高级
          </button>
        </div>

        <div className={styles.settingsContent}>
          {currentTab === 'general' && (
            <div className={styles.settingsSection}>
              <h3>通用设置</h3>
              <div className={styles.settingItem}>
                <label>语言</label>
                <select
                  value={settings.general.language}
                  onChange={(e) =>
                    updateGeneralSettings({ language: e.target.value })
                  }
                >
                  <option value='zh-CN'>中文</option>
                  <option value='en-US'>English</option>
                  <option value='ja-JP'>日本語</option>
                </select>
              </div>
            </div>
          )}

          {currentTab === 'ai' && (
            <div className={styles.settingsSection}>
              <h3>AI 提供商</h3>
              <div className={styles.settingItem}>
                <label>选择提供商</label>
                <select
                  value={currentProvider}
                  onChange={(e) =>
                    handleProviderChange(e.target.value as AIProvider)
                  }
                >
                  <option value='ollama'>Ollama (本地)</option>
                  <option value='deepseek'>DeepSeek</option>
                  <option value='openai'>OpenAI</option>
                  <option value='anthropic'>Anthropic</option>
                  <option value='custom'>自定义</option>
                </select>
              </div>

              <div className={styles.providerConfig}>
                <h4>{currentProvider.toUpperCase()} 配置</h4>

                <div className={styles.settingItem}>
                  <label>模型</label>
                  <input
                    type='text'
                    value={currentConfig.model}
                    onChange={(e) =>
                      handleModelChange(currentProvider, e.target.value)
                    }
                    placeholder='输入模型名称'
                  />
                </div>

                {currentProvider !== 'ollama' && (
                  <>
                    <div className={styles.settingItem}>
                      <label>API Key</label>
                      <input
                        type='password'
                        value={
                          (currentConfig as AISettings[typeof currentProvider])
                            .apiKey || ''
                        }
                        onChange={(e) =>
                          handleApiKeyChange(currentProvider, e.target.value)
                        }
                        placeholder={`输入 ${currentProvider} API Key`}
                      />
                    </div>
                    <div className={styles.settingItem}>
                      <label>API URL</label>
                      <input
                        type='text'
                        value={currentConfig.baseUrl}
                        onChange={(e) =>
                          handleBaseUrlChange(currentProvider, e.target.value)
                        }
                        placeholder='API 端点地址'
                      />
                    </div>
                  </>
                )}

                {currentProvider === 'ollama' && (
                  <div className={styles.settingItem}>
                    <label>Ollama 地址</label>
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
                <label>请求超时 (毫秒)</label>
                <input
                  type='number'
                  value={currentConfig.timeout}
                  onChange={(e) => {
                    const updateActions = {
                      ollama: updateOllamaConfig,
                      deepseek: updateDeepSeekConfig,
                      openai: updateOpenAIConfig,
                      anthropic: updateAnthropicConfig,
                      custom: updateCustomConfig,
                    };
                    updateActions[currentProvider]?.({
                      timeout: parseInt(e.target.value),
                    });
                  }}
                />
              </div>

              <div className={styles.settingItem}>
                <label>最大令牌数</label>
                <input
                  type='number'
                  value={currentConfig.maxTokens}
                  onChange={(e) => {
                    const updateActions = {
                      ollama: updateOllamaConfig,
                      deepseek: updateDeepSeekConfig,
                      openai: updateOpenAIConfig,
                      anthropic: updateAnthropicConfig,
                      custom: updateCustomConfig,
                    };
                    updateActions[currentProvider]?.({
                      maxTokens: parseInt(e.target.value),
                    });
                  }}
                />
              </div>

              <div className={styles.settingItem}>
                <label>
                  温度: {currentConfig.temperature}
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.1'
                    value={currentConfig.temperature}
                    onChange={(e) => {
                      const updateActions = {
                        ollama: updateOllamaConfig,
                        deepseek: updateDeepSeekConfig,
                        openai: updateOpenAIConfig,
                        anthropic: updateAnthropicConfig,
                        custom: updateCustomConfig,
                      };
                      updateActions[currentProvider]?.({
                        temperature: parseFloat(e.target.value),
                      });
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {currentTab === 'appearance' && (
            <div className={styles.settingsSection}>
              <h3>外观设置</h3>
              <div className={styles.settingItem}>
                <label>主题</label>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) =>
                    updateAppearanceSettings({ theme: e.target.value as any })
                  }
                >
                  <option value='dark'>深色</option>
                  <option value='light'>浅色</option>
                  <option value='auto'>跟随系统</option>
                </select>
              </div>
              <div className={styles.settingItem}>
                <label>字体大小</label>
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
                <label>字体</label>
                <input
                  type='text'
                  value={settings.appearance.fontFamily}
                  onChange={(e) =>
                    updateAppearanceSettings({ fontFamily: e.target.value })
                  }
                  placeholder='系统字体'
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
                  紧凑模式
                </label>
              </div>
            </div>
          )}

          {currentTab === 'advanced' && (
            <div className={styles.settingsSection}>
              <h3>高级设置</h3>
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
                  启用流式响应
                </label>
              </div>
              <div className={styles.settingItem}>
                <label>API 超时 (毫秒)</label>
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
                <label>最大重试次数</label>
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
                <label>日志级别</label>
                <select
                  value={settings.advanced.logLevel}
                  onChange={(e) =>
                    updateAdvancedSettings({ logLevel: e.target.value as any })
                  }
                >
                  <option value='error'>错误</option>
                  <option value='warn'>警告</option>
                  <option value='info'>信息</option>
                  <option value='debug'>调试</option>
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
                  启用诊断信息
                </label>
              </div>
            </div>
          )}
        </div>

        <div className={styles.settingsActions}>
          <button onClick={handleCancel}>取消</button>
          <button
            onClick={handleSave}
            className={styles.primary}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
