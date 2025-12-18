import { useEffect } from 'react';
import { ENV_CONFIG } from '@/types/constants';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useChatActions } from '@/hooks/useChatActions';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { isMockMode } from '@/mock';
import ChatInterface from './components/ChatInterface';
import ServerStatus from './components/ServerStatus';
import SettingsPanel from './components/SettingsPanel';
import ModelSelector from './components/ModelSelector';
import ConversationList from './components/ConversationList';
import ConversationSettingsForm from './components/ConversationSettingsForm';
import SummaryPrompt from './components/SummaryPrompt';
import styles from './styles.module.scss';

function App() {
  const { messages, models, isSending } = useChatState();
  const { settings, isSettingsOpen, setSettingsOpen, updateSettings } =
    useSettingsState();
  const {
    handleModelChange,
    getCurrentModel,
  } = useChatActions();

  // 开发模式提示
  useEffect(() => {
    if (isMockMode()) {
      console.log('%c[Mock Mode] Mock 数据模式已启用', 'color: #4CAF50; font-weight: bold;');
      console.log('所有 API 调用将使用模拟数据，不会连接真实后端');
    }
  }, []);

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
    handleSendMessage,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
  } = useConversationManagement();

  // 获取当前会话的设置
  const currentSettings = pendingConversationId
    ? conversations.find((c) => c.id === pendingConversationId)?.settings
    : conversations.find((c) => c.id === activeConversationId)?.settings;

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>{ENV_CONFIG.VITE_APP_NAME}</h1>
        <ServerStatus />
      </div>

      <div className={styles.mainContent}>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewConversation={handleNewConversation}
        />

        <div className={styles.chatArea}>
          <div className={styles.controls}>
            {settings.ai.provider === 'ollama' && (
              <ModelSelector
                models={models}
                selectedModel={getCurrentModel()}
                onModelChange={handleModelChange}
                disabled={models.length === 0}
              />
            )}
            {settings.ai.provider !== 'ollama' && (
              <div className={styles.modelInfo}>当前模型: {getCurrentModel()}</div>
            )}
            {activeConversationId && currentSettings && (
              <button
                onClick={() => setShowSettingsForm(true)}
                className={styles.editSettingsBtn}
              >
                编辑设置
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className={styles.settingsBtn}
            >
              设置
            </button>
          </div>

          <div className={styles.conversationContainer}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={isSending}
              disabled={false}
              maxLength={ENV_CONFIG.VITE_MAX_MESSAGE_LENGTH}
            />
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
              // 如果是新会话且取消，清除待处理的会话ID
              // 这里可以添加清理逻辑
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

      <SettingsPanel
        settings={settings}
        onSettingsChange={updateSettings}
        open={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
