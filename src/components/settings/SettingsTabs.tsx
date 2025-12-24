import React from 'react';
import styles from '../SettingsPanel.module.scss';

export type SettingsTab = 'general' | 'ai' | 'appearance' | 'advanced';

interface SettingsTabsProps {
  currentTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  t: (key: string) => string;
}

/**
 * Settings panel tab navigation component
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  currentTab,
  onTabChange,
  t,
}) => {
  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: t('settingsPanel.tabs.general') },
    { key: 'ai', label: t('settingsPanel.tabs.ai') },
    { key: 'appearance', label: t('settingsPanel.tabs.appearance') },
    { key: 'advanced', label: t('settingsPanel.tabs.advanced') },
  ];

  return (
    <div className={styles.settingsTabs}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`${styles.tab} ${currentTab === tab.key ? styles.active : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

