import React from 'react';
import { AppearanceSettings as AppearanceSettingsType } from '@/types';
import styles from '../SettingsPanel.module.scss';

interface AppearanceSettingsProps {
  settings: AppearanceSettingsType;
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  onFontSizeChange: (fontSize: 'small' | 'medium' | 'large') => void;
  onFontFamilyChange: (fontFamily: string) => void;
  t: (key: string) => string;
}

/**
 * Appearance settings section component
 * Handles theme, font size, and font family settings
 */
export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  onThemeChange,
  onFontSizeChange,
  onFontFamilyChange,
  t,
}) => {
  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.appearance')}</h3>
      <div className={styles.settingItem}>
        <label>{t('settingsPanel.theme')}</label>
        <select
          value={settings.theme}
          onChange={(e) =>
            onThemeChange(e.target.value as 'light' | 'dark' | 'auto')
          }
        >
          <option value='dark'>{t('settingsPanel.themeDark')}</option>
          <option value='light'>{t('settingsPanel.themeLight')}</option>
          <option value='auto'>{t('settingsPanel.themeAuto')}</option>
        </select>
      </div>
      <div className={styles.settingItem}>
        <label>{t('settingsPanel.fontSize')}</label>
        <select
          value={settings.fontSize}
          onChange={(e) =>
            onFontSizeChange(e.target.value as 'small' | 'medium' | 'large')
          }
        >
          <option value='small'>{t('settingsPanel.fontSizeSmall')}</option>
          <option value='medium'>{t('settingsPanel.fontSizeMedium')}</option>
          <option value='large'>{t('settingsPanel.fontSizeLarge')}</option>
        </select>
      </div>
      <div className={styles.settingItem}>
        <label>{t('settingsPanel.fontFamily')}</label>
        <input
          type='text'
          value={settings.fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          placeholder={t('settingsPanel.fontFamilyPlaceholder')}
        />
      </div>
    </div>
  );
};

