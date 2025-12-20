import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useChatActions } from '@/hooks/useChatActions';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useConversationClient } from '@/hooks/useConversationClient';
import { useStoryActions } from '@/hooks/useStoryActions';
import { useDialogState } from '@/hooks/useDialogState';
import { useUIState } from '@/hooks/useUIState';
import { useI18n } from '@/i18n';
import ChatInterface from './components/ChatInterface';
import { AppHeader } from './components/AppHeader';
import SettingsPanel from './components/SettingsPanel';
import ModelSelector from './components/ModelSelector';
import ConversationList from './components/ConversationList';
import ConversationSettingsForm from './components/ConversationSettingsForm';
import StorySettingsView from './components/StorySettingsView';
import StorySettingsSidebar from './components/StorySettingsSidebar';
import SummaryPrompt from './components/SummaryPrompt';
import ConfirmDialog from './components/ConfirmDialog';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import styles from './styles.module.scss';

function App() {
  const { messages, models, isSending, setMessages } = useChatState();
  const { settings, isSettingsOpen, setSettingsOpen, updateSettings } =
    useSettingsState();
  const { toasts, showError, showSuccess, removeToast } = useToast();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const conversationClient = useConversationClient();
  const { t } = useI18n();

  const {
    conversations,
    activeConversationId,
    showSettingsForm,
    isNewConversation,
    pendingConversationId,
    showSummaryPrompt,
    summaryMessageCount,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation: deleteConversationInternal,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
    loadConversations,
  } = useConversationManagement();

  const uiState = useUIState();
  const {
    showDeleteLastMessageDialog,
    setShowDeleteLastMessageDialog,
    showDeleteConversationDialog,
    conversationToDelete,
    openDeleteConversationDialog,
    closeDeleteConversationDialog,
  } = useDialogState();

  const handleConfirmDeleteConversation = async () => {
    if (conversationToDelete) {
      closeDeleteConversationDialog();
      await deleteConversationInternal(conversationToDelete);
    }
  };

  const currentSettings = pendingConversationId
    ? conversations.find((c) => c.id === pendingConversationId)?.settings
    : conversations.find((c) => c.id === activeConversationId)?.settings;

  const canGenerateStory = !!activeConversationId;
  const canConfirmSection = !!(
    activeConversationId &&
    currentSettings?.outline &&
    messages.length > 0
  );

  const {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
  } = useStoryActions({
    activeConversationId,
    messages,
    setMessages,
    settings,
    showError,
    onConversationSelect: handleSelectConversation,
  });

  const handleDeleteLastMessage = () => {
    if (!activeConversationId || messages.length === 0) return;
    setShowDeleteLastMessageDialog(true);
  };

  const handleConfirmDeleteLastMessage = async () => {
    setShowDeleteLastMessageDialog(false);
    if (!activeConversationId) return;
    try {
      const success = await conversationClient.deleteLastMessage(
        activeConversationId
      );
      if (success) {
        showSuccess(
          t('storyActions.deleteLastMessageSuccess', {
            defaultValue: '删除成功',
          })
        );
        await handleSelectConversation(activeConversationId);
      } else {
        showError(
          t('storyActions.deleteLastMessageFailed', {
            defaultValue: '删除失败：未找到消息',
          })
        );
      }
    } catch (error) {
      console.error('Failed to delete last message:', error);
      showError(
        t('storyActions.deleteLastMessageFailed', {
          defaultValue:
            '删除最后一条消息失败: ' +
            (error instanceof Error ? error.message : '未知错误'),
        })
      );
    }
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
            uiState.setConversationListCollapsed(!uiState.conversationListCollapsed)
          }
        />

        <div className={styles.chatArea}>
          <div className={styles.controls}>
            {uiState.conversationListCollapsed && (
              <button
                onClick={() => uiState.setConversationListCollapsed(false)}
                className={styles.expandButton}
                title={t('common.expand') + ' ' + t('conversation.title')}
              >
                ▶ {t('conversation.titleShort')}
              </button>
            )}
            {settings.ai.provider === 'ollama' && (
              <ModelSelector
                models={models}
                selectedModel={getCurrentModel()}
                onModelChange={handleModelChange}
                disabled={models.length === 0}
              />
            )}
            {settings.ai.provider !== 'ollama' && (
              <div className={styles.modelInfo}>
                {t('settingsPanel.currentModel')}: {getCurrentModel()}
              </div>
            )}
            {uiState.conversationListCollapsed &&
              activeConversationId &&
              currentSettings && (
                <div className={styles.conversationTitle}>
                  {currentSettings.title ||
                    t('conversation.unnamedConversation')}
                </div>
              )}
            {uiState.conversationListCollapsed && !activeConversationId && (
              <button
                onClick={handleNewConversation}
                className={styles.newButton}
                title={t('conversation.newConversation')}
              >
                + {t('common.new')}
              </button>
            )}
            {activeConversationId &&
              currentSettings &&
              uiState.settingsSidebarCollapsed && (
                <button
                  onClick={() => uiState.setSettingsSidebarCollapsed(false)}
                  className={styles.expandButton}
                  title={t('common.expand') + ' ' + t('storySettings.title')}
                >
                  ▶ {t('storySettings.titleShort')}
                </button>
              )}
          </div>

          <div className={styles.conversationContainer}>
            <div className={styles.chatWithSidebar}>
              <ChatInterface
                messages={messages}
                onGenerate={handleGenerateStory}
                onConfirm={handleConfirmSection}
                onRewrite={handleRewriteSection}
                onModify={handleModifySection}
                onAddSettings={() => setShowSettingsForm(true)}
                onDeleteLastMessage={handleDeleteLastMessage}
                loading={isSending}
                disabled={!activeConversationId}
                canConfirm={canConfirmSection}
                canGenerate={canGenerateStory}
                canDeleteLast={messages.length > 0}
              />
              {activeConversationId && currentSettings && (
                <StorySettingsSidebar
                  settings={currentSettings}
                  onEdit={() => setShowSettingsForm(true)}
                  onToggle={() =>
                    uiState.setSettingsSidebarCollapsed(!uiState.settingsSidebarCollapsed)
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
