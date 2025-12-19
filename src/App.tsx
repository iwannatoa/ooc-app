import { useState } from 'react';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useChatActions } from '@/hooks/useChatActions';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useStoryClient } from '@/hooks/useStoryClient';
import { useConversationClient } from '@/hooks/useConversationClient';
import { useMockMode } from '@/hooks/useMockMode';
import { useI18n } from '@/i18n';
import ChatInterface from './components/ChatInterface';
import ServerStatus from './components/ServerStatus';
import SettingsPanel from './components/SettingsPanel';
import ModelSelector from './components/ModelSelector';
import ConversationList from './components/ConversationList';
import ConversationSettingsForm from './components/ConversationSettingsForm';
import StorySettingsView from './components/StorySettingsView';
import StorySettingsSidebar from './components/StorySettingsSidebar';
import SummaryPrompt from './components/SummaryPrompt';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import styles from './styles.module.scss';

function App() {
  const { messages, models, isSending } = useChatState();
  const { settings, isSettingsOpen, setSettingsOpen, updateSettings } =
    useSettingsState();
  const { toasts, showError, showSuccess, removeToast } = useToast();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const storyClient = useStoryClient(settings);
  const conversationClient = useConversationClient();
  const { mockModeEnabled, toggleMockMode, isDev } = useMockMode();
  const { locale, setLocale, t } = useI18n();


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
    handleDeleteConversation,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
  } = useConversationManagement();

  const [showSettingsView, setShowSettingsView] = useState(false);
  const [settingsSidebarCollapsed, setSettingsSidebarCollapsed] =
    useState(false);
  const [conversationListCollapsed, setConversationListCollapsed] =
    useState(false);

  const currentSettings = pendingConversationId
    ? conversations.find((c) => c.id === pendingConversationId)?.settings
    : conversations.find((c) => c.id === activeConversationId)?.settings;

  const canGenerateStory = !!activeConversationId;
  const canConfirmSection = !!(
    activeConversationId &&
    currentSettings?.outline &&
    messages.length > 0
  );
  const handleGenerateStory = async () => {
    if (!activeConversationId) return;
    try {
      const result = await storyClient.generateStory(activeConversationId);
      if (result.success && result.response) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await handleSelectConversation(activeConversationId);
      }
    } catch (error) {
      console.error('Failed to generate story:', error);
    }
  };

  const handleConfirmSection = async () => {
    if (!activeConversationId) return;
    try {
      const result = await storyClient.confirmSection(activeConversationId);
      if (result.success && result.response) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await handleSelectConversation(activeConversationId);
      }
    } catch (error) {
      console.error('Failed to confirm section:', error);
    }
  };

  const handleRewriteSection = async (feedback: string) => {
    if (!activeConversationId) return;
    try {
      const result = await storyClient.rewriteSection(
        activeConversationId,
        feedback
      );
      if (result.success && result.response) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await handleSelectConversation(activeConversationId);
      }
    } catch (error) {
      console.error('Failed to rewrite section:', error);
    }
  };

  const handleModifySection = async (feedback: string) => {
    if (!activeConversationId) return;
    try {
      const result = await storyClient.modifySection(
        activeConversationId,
        feedback
      );
      if (result.success && result.response) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await handleSelectConversation(activeConversationId);
      }
    } catch (error) {
      console.error('Failed to modify section:', error);
    }
  };

  const handleDeleteLastMessage = async () => {
    if (!activeConversationId || messages.length === 0) return;
    if (!confirm(t('storyActions.confirmDeleteLastMessage', { defaultValue: '确定要删除最后一条消息吗？这将同时删除相关的人物记录。' }))) {
      return;
    }
    try {
      const success = await conversationClient.deleteLastMessage(activeConversationId);
      if (success) {
        showSuccess(t('storyActions.deleteLastMessageSuccess', { defaultValue: '删除成功' }));
        await handleSelectConversation(activeConversationId);
      } else {
        showError(t('storyActions.deleteLastMessageFailed', { defaultValue: '删除失败：未找到消息' }));
      }
    } catch (error) {
      console.error('Failed to delete last message:', error);
      showError(t('storyActions.deleteLastMessageFailed', { 
        defaultValue: '删除最后一条消息失败: ' + (error instanceof Error ? error.message : '未知错误')
      }));
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>{t('app.title')}</h1>
        <div className={styles.headerRight}>
          {isDev && (
            <button
              onClick={toggleMockMode}
              className={`${styles.mockToggleBtn} ${
                mockModeEnabled ? styles.active : ''
              }`}
              title={
                mockModeEnabled
                  ? t('app.mockModeTooltipOn')
                  : t('app.mockModeTooltipOff')
              }
            >
              {mockModeEnabled ? t('app.mockModeOn') : t('app.mockModeOff')}
            </button>
          )}
          <button
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className={styles.languageBtn}
            title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {locale === 'zh' ? 'EN' : '中'}
          </button>
          <ServerStatus />
          <button
            onClick={() => setSettingsOpen(true)}
            className={styles.settingsBtn}
          >
            {t('common.settings')}
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewConversation={handleNewConversation}
          isCollapsed={conversationListCollapsed}
          onToggleCollapse={() =>
            setConversationListCollapsed(!conversationListCollapsed)
          }
        />

        <div className={styles.chatArea}>
          <div className={styles.controls}>
            {conversationListCollapsed && (
              <button
                onClick={() => setConversationListCollapsed(false)}
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
            {conversationListCollapsed && activeConversationId && currentSettings && (
              <div className={styles.conversationTitle}>
                {currentSettings.title || t('conversation.unnamedConversation')}
              </div>
            )}
            {conversationListCollapsed && !activeConversationId && (
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
              settingsSidebarCollapsed && (
                <button
                  onClick={() => setSettingsSidebarCollapsed(false)}
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
                    setSettingsSidebarCollapsed(!settingsSidebarCollapsed)
                  }
                  collapsed={settingsSidebarCollapsed}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showSettingsForm && pendingConversationId && (
        <ConversationSettingsForm
          conversationId={pendingConversationId}
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

      {showSettingsView && currentSettings && activeConversationId && (
        <StorySettingsView
          conversationId={activeConversationId}
          settings={currentSettings}
          onEdit={() => {
            setShowSettingsView(false);
            setShowSettingsForm(true);
          }}
          onClose={() => setShowSettingsView(false)}
        />
      )}

      <SettingsPanel
        settings={settings}
        onSettingsChange={updateSettings}
        open={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
