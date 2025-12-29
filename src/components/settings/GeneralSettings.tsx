import React from 'react';
import { AppSettings } from '@/types';
import { useI18n, availableLocales } from '@/i18n';
import styles from './SettingsPanel.module.scss';

interface GeneralSettingsProps {
  settings: AppSettings;
}

/**
 * General settings section component
 * Handles language selection and other general preferences
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
}) => {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.general')}</h3>
      <div className={styles.settingItem}>
        <label>{t('settingsPanel.language')}</label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'zh' | 'en')}
        >
          {availableLocales.map((loc) => (
            <option key={loc} value={loc}>
              {t(`language.${loc}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

