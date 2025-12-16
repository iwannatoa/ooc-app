import { ENV_CONFIG } from '@/types/constants';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useChatActions } from '@/hooks/useChatActions';
import ChatInterface from './components/ChatInterface';
import ServerStatus from './components/ServerStatus';
import SettingsPanel from './components/SettingsPanel';
import ModelSelector from './components/ModelSelector';
import styles from './styles.module.scss';

function App() {
  const { messages, models, isSending } = useChatState();
  const { settings, isSettingsOpen, setSettingsOpen, updateSettings } =
    useSettingsState();
  const {
    handleSendMessage,
    handleModelChange,
    getCurrentModel,
    clearMessages,
  } = useChatActions();

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>{ENV_CONFIG.VITE_APP_NAME}</h1>
        <ServerStatus />
      </div>

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
        <button
          onClick={clearMessages}
          className={styles.clearBtn}
        >
          清空对话
        </button>
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
