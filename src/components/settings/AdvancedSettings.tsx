import React from 'react';
import { AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
import styles from '../SettingsPanel.module.scss';

interface AdvancedSettingsProps {
  settings: AppSettings;
  t: (key: string) => string;
}

/**
 * Advanced settings section component
 * Handles advanced configuration options
 */
export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  settings,
  t,
}) => {
  const { updateAdvancedSettings } = useSettingsState();

  return (
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
            updateAdvancedSettings({
              logLevel: e.target.value as 'error' | 'warn' | 'info' | 'debug',
            })
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
  );
};

