// ===== Business Logic Hooks =====
import { useAppLogic } from './hooks/useAppLogic';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useDialogState } from '@/hooks/useDialogState';
import { useUIState } from '@/hooks/useUIState';
import { useToast } from './hooks/useToast';
import { useAppearance } from './hooks/useAppearance';
import { useAppSettings } from './hooks/useAppSettings';

// ===== UI Components =====
import { TitleBar, AppHeader, ConversationList } from './components';
import { ChatControls, ChatInterface } from './components/chat';
import {
  ConversationSettingsForm,
  StorySettingsView,
  StorySettingsSidebar,
  SummaryPrompt,
} from './components/story';
import SettingsPanel from './components/SettingsPanel';
import { ConfirmDialog, ToastContainer } from './components/common';

// ===== Styles and Utilities =====
import styles from './styles.module.scss';

/**
 * Main application component
 *
 * Responsibilities:
 * - Integrate all business logic and UI state
 * - Render the main application layout
 * - Handle dialogs and modals display
 */
function App() {
  // ===== Business Logic =====
  const appLogic = useAppLogic();
  const {
    messages,
    conversations,
    activeConversationId,
    currentSettings,
    settings,
    showSettingsForm,
    isNewConversation,
    pendingConversationId,
    showSummaryPrompt,
    summaryMessageCount,
    canGenerate,
    canConfirm,
    canDeleteLast,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
    loadConversations,
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
    handleDeleteLastMessage,
    t,
  } = appLogic;

  // ===== UI State Management =====
  const { models, isSending } = useChatState();
  const { isSettingsOpen, setSettingsOpen, updateSettings } =
    useSettingsState();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const uiState = useUIState();

  // Load app settings from backend
  useAppSettings();

  // Apply appearance settings
  useAppearance();

  // ===== Toast Notifications =====
  const { toasts, removeToast } = useToast();

  // ===== Dialog State =====
  const {
    showDeleteLastMessageDialog,
    setShowDeleteLastMessageDialog,
    showDeleteConversationDialog,
    conversationToDelete,
    openDeleteConversationDialog,
    closeDeleteConversationDialog,
  } = useDialogState();

  // ===== Dialog Handler Functions =====
  const handleConfirmDeleteConversation = async () => {
    if (conversationToDelete) {
      closeDeleteConversationDialog();
      await handleDeleteConversation(conversationToDelete);
    }
  };

  const handleConfirmDeleteLastMessage = () => {
    setShowDeleteLastMessageDialog(false);
    handleDeleteLastMessage();
  };

  return (
    <div className={styles.app}>
      <TitleBar />
      <div className={styles.appContent}>
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

        <div className={styles.mainContent}>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={openDeleteConversationDialog}
            onNewConversation={handleNewConversation}
            onRefresh={loadConversations}
            isCollapsed={uiState.conversationListCollapsed}
            onToggleCollapse={() =>
              uiState.setConversationListCollapsed(
                !uiState.conversationListCollapsed
              )
            }
          />

          <div className={styles.chatArea}>
            {/* Chat controls bar */}
            <ChatControls
              conversationListCollapsed={uiState.conversationListCollapsed}
              settingsSidebarCollapsed={uiState.settingsSidebarCollapsed}
              activeConversationId={activeConversationId}
              currentSettings={currentSettings}
              appSettings={settings}
              models={models}
              currentModel={getCurrentModel()}
              onModelChange={handleModelChange}
              onExpandConversationList={() =>
                uiState.setConversationListCollapsed(false)
              }
              onNewConversation={handleNewConversation}
              onExpandSettingsSidebar={() =>
                uiState.setSettingsSidebarCollapsed(false)
              }
            />

            <div className={styles.conversationContainer}>
              <div className={styles.chatWithSidebar}>
                <ChatInterface
                  messages={messages}
                  onGenerate={handleGenerateStory}
                  onConfirm={handleConfirmSection}
                  onRewrite={handleRewriteSection}
                  onModify={handleModifySection}
                  onAddSettings={() => setShowSettingsForm(true)}
                  onDeleteLastMessage={() =>
                    setShowDeleteLastMessageDialog(true)
                  }
                  loading={isSending}
                  disabled={!activeConversationId}
                  canConfirm={canConfirm}
                  canGenerate={canGenerate}
                  canDeleteLast={canDeleteLast}
                />
                {activeConversationId && currentSettings && (
                  <StorySettingsSidebar
                    settings={currentSettings}
                    onEdit={() => setShowSettingsForm(true)}
                    onViewSettings={() => uiState.setShowSettingsView(true)}
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

      {showSettingsForm && (pendingConversationId || activeConversationId) && (
        <ConversationSettingsForm
          conversationId={pendingConversationId || activeConversationId!}
          settings={currentSettings}
          onSave={handleSaveSettings}
          onCancel={() => {
            setShowSettingsForm(false);
            if (isNewConversation) {
            }
          }}
          isNewConversation={isNewConversation}
        />
      )}

      {showSummaryPrompt && activeConversationId && (
        <SummaryPrompt
          conversationId={activeConversationId}
          messageCount={summaryMessageCount}
          onGenerate={handleGenerateSummary}
          onSave={handleSaveSummary}
          onCancel={() => setShowSummaryPrompt(false)}
        />
      )}

      {uiState.showSettingsView && currentSettings && activeConversationId && (
        <StorySettingsView
          conversationId={activeConversationId}
          settings={currentSettings}
          onEdit={() => {
            uiState.setShowSettingsView(false);
            setShowSettingsForm(true);
          }}
          onClose={() => uiState.setShowSettingsView(false)}
        />
      )}

      <SettingsPanel
        settings={settings}
        onSettingsChange={updateSettings}
        open={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />

      <ConfirmDialog
        isOpen={showDeleteLastMessageDialog}
        message={t('storyActions.confirmDeleteLastMessage')}
        onConfirm={handleConfirmDeleteLastMessage}
        onCancel={() => setShowDeleteLastMessageDialog(false)}
        confirmButtonStyle='danger'
      />

      <ConfirmDialog
        isOpen={showDeleteConversationDialog}
        message={t('conversation.confirmDeleteConversation')}
        onConfirm={handleConfirmDeleteConversation}
        onCancel={closeDeleteConversationDialog}
        confirmButtonStyle='danger'
      />
    </div>
  );
}

export default App;
