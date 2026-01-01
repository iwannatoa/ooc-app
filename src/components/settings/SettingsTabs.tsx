import React, {
  Children,
  isValidElement,
  ReactElement,
  useMemo,
  useState,
} from 'react';
import styles from './SettingsPanel.module.scss';

export type SettingsTab = 'general' | 'ai' | 'appearance' | 'advanced';

interface SettingsTabPaneProps {
  tab: SettingsTab;
  label: string;
  children: React.ReactNode;
}

/**
 * Settings Tab Pane Component
 *
 * Represents a single tab panel. Only the pane matching currentTab will be rendered.
 */
export const SettingsTabPane: React.FC<SettingsTabPaneProps> = ({
  children,
}) => {
  return <>{children}</>;
};

// 添加 displayName 用于开发时调试
SettingsTabPane.displayName = 'SettingsTabPane';

interface SettingsTabsProps {
  defaultTab?: SettingsTab;
  children: React.ReactNode;
  onChange?: (tab: SettingsTab) => void;
}

/**
 * Settings Tabs Component
 *
 * Displays tab navigation and renders the content of the active tab.
 * Manages tab state internally. Children should be SettingsTabPane components,
 * each with a `tab` and `label` prop.
 *
 * @example
 * ```tsx
 * <SettingsTabs defaultTab="general">
 *   <SettingsTabPane tab="general" label={t('settingsPanel.tabs.general')}>
 *     <GeneralSettings ... />
 *   </SettingsTabPane>
 *   <SettingsTabPane tab="ai" label={t('settingsPanel.tabs.ai')}>
 *     <AISettings ... />
 *   </SettingsTabPane>
 * </SettingsTabs>
 * ```
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  defaultTab = 'general',
  children,
  onChange,
}) => {
  const [currentTab, setCurrentTab] = useState<SettingsTab>(defaultTab);

  const handleTabChange = (tab: SettingsTab) => {
    setCurrentTab(tab);
    onChange?.(tab);
  };

  // 使用 useMemo 优化性能，避免每次渲染都重新计算
  const { tabs, activePane } = useMemo(() => {
    // Extract tab information from children
    const tabPanes = Children.toArray(children).filter(
      (child): child is ReactElement<SettingsTabPaneProps> => {
        if (!isValidElement(child)) return false;

        // 类型检查：检查是否是 SettingsTabPane 组件
        const isTabPane =
          child.type === SettingsTabPane ||
          (typeof child.type !== 'string' &&
            typeof child.type === 'function' &&
            'displayName' in child.type &&
            (child.type as { displayName?: string }).displayName ===
              'SettingsTabPane');

        if (!isTabPane) return false;

        // 检查必需的 props
        const props = child.props as Partial<SettingsTabPaneProps>;
        return props.tab !== undefined && props.label !== undefined;
      }
    );

    // Build tabs array from children
    const tabs = tabPanes.map((pane) => ({
      key: pane.props.tab,
      label: pane.props.label,
    }));

    // Find the active tab pane
    const activePane = tabPanes.find((pane) => pane.props.tab === currentTab);

    return { tabs, activePane };
  }, [children, currentTab]);

  return (
    <>
      <div className={styles.settingsTabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${
              currentTab === tab.key ? styles.active : ''
            }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.settingsContent}>{activePane?.props.children}</div>
    </>
  );
};
