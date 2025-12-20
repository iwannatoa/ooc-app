import { useState } from 'react';

export const useUIState = () => {
  const [showSettingsView, setShowSettingsView] = useState(false);
  const [settingsSidebarCollapsed, setSettingsSidebarCollapsed] =
    useState(false);
  const [conversationListCollapsed, setConversationListCollapsed] =
    useState(false);

  return {
    showSettingsView,
    setShowSettingsView,
    settingsSidebarCollapsed,
    setSettingsSidebarCollapsed,
    conversationListCollapsed,
    setConversationListCollapsed,
  };
};

