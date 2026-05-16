// ===== Business Logic Hooks =====
import { useConversationManagement } from './hooks/useConversationManagement';
import { useUIState } from '@/hooks/useUIState';
import { useToast } from './hooks/useToast';
import { useI18n } from '@/i18n/i18n';
import { useAppearance } from './hooks/useAppearance';
import { useAppSettings } from './hooks/useAppSettings';

// ===== UI Components =====
import { TitleBar } from './components/TitleBar';
import FlaskConnectionBanner from './components/FlaskConnectionBanner';
import { AppHeader } from './components/AppHeader';
import ConversationList from './components/ConversationList';
import { ChatControls, ChatInterface } from './components/chat';
import { StorySettingsSidebar } from './components/story';
import {
  ConfirmDialogContainer,
  ToastContainer,
  DialogContainer,
} from './components/common';

// ===== Styles and Utilities =====
import styles from './styles.module.scss';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { trackTelemetryEvent } from './services/telemetryService';

/**
 * Main application component
 *
 * Responsibilities:
 * - Render the main application layout
 * - Compose business logic hooks and UI components
 * - Provide global containers (Toast, ConfirmDialog)
 *
 * Note: Most state is managed by Redux or component-level hooks.
 * Components use hooks directly instead of receiving props from App.
 */
function App() {
  // ===== UI State Management =====
  const uiState = useUIState();
  const { activeConversationId, conversationSettings } =
    useConversationManagement();

  // Load app settings from backend
  useAppSettings();

  // Apply appearance settings
  useAppearance();

  // ===== Toast Notifications =====
  const { toasts, removeToast, showWarning } = useToast();
  const { languageBackendNotice, clearLanguageBackendNotice } = useI18n();

  useEffect(() => {
    if (!languageBackendNotice) return;
    showWarning(languageBackendNotice);
    clearLanguageBackendNotice();
  }, [
    languageBackendNotice,
    showWarning,
    clearLanguageBackendNotice,
  ]);

  // Show window after content is loaded
  useEffect(() => {
    void trackTelemetryEvent('app_started');
  }, []);

  useEffect(() => {
    const showWindow = async () => {
      try {
        const window = getCurrentWindow();
        // Wait for React to render, then show window
        await new Promise((resolve) => setTimeout(resolve, 100));
        await window.show();
      } catch (error) {
        console.error('Failed to show window:', error);
      }
    };
    showWindow();
  }, []);

  return (
    <div className={styles.app}>
      <TitleBar />
      <div className={styles.appContent}>
        <FlaskConnectionBanner />
        <AppHeader />

        <div className={styles.mainContent}>
          <ConversationList />

          <div className={styles.chatArea}>
            {/* Chat controls bar */}
            <ChatControls />

            <div className={styles.conversationContainer}>
              <div className={styles.chatWithSidebar}>
                <ChatInterface />
                {activeConversationId && conversationSettings && (
                  <StorySettingsSidebar
                    settings={conversationSettings}
                    onToggle={() =>
                      uiState.setSettingsSidebarCollapsed(
                        !uiState.settingsSidebarCollapsed
                      )
                    }
                    collapsed={uiState.settingsSidebarCollapsed}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogContainer />

      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />

      <ConfirmDialogContainer />
    </div>
  );
}

export default App;
