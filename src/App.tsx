// ===== Business Logic Hooks =====
import { useAppLogic } from './hooks/useAppLogic';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useDialogState } from '@/hooks/useDialogState';
import { useUIState } from '@/hooks/useUIState';
import { useToast } from './hooks/useToast';

// ===== UI Components =====
import { AppHeader } from './components/AppHeader';
import { ChatControls } from './components/ChatControls';
import ChatInterface from './components/ChatInterface';
import ConversationList from './components/ConversationList';
import ConversationSettingsForm from './components/ConversationSettingsForm';
import StorySettingsView from './components/StorySettingsView';
import StorySettingsSidebar from './components/StorySettingsSidebar';
import SummaryPrompt from './components/SummaryPrompt';
import SettingsPanel from './components/SettingsPanel';
import ConfirmDialog from './components/ConfirmDialog';
import { ToastContainer } from './components/Toast';

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
                onDeleteLastMessage={() => setShowDeleteLastMessageDialog(true)}
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
        message={t('storyActions.confirmDeleteLastMessage', {
          defaultValue:
            '确定要删除最后一条消息吗？这将同时删除相关的人物记录。',
        })}
        onConfirm={handleConfirmDeleteLastMessage}
        onCancel={() => setShowDeleteLastMessageDialog(false)}
        confirmButtonStyle='danger'
      />

      <ConfirmDialog
        isOpen={showDeleteConversationDialog}
        message={t('conversation.confirmDeleteConversation', {
          defaultValue: '确定要删除这个故事吗？此操作不可撤销。',
        })}
        onConfirm={handleConfirmDeleteConversation}
        onCancel={closeDeleteConversationDialog}
        confirmButtonStyle='danger'
      />
    </div>
  );
}

export default App;
