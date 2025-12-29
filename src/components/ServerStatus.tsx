import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiResponse } from '@/types';
import { ENV_CONFIG } from '@/types/constants';
import { useServerState } from '@/hooks/useServerState';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { useI18n } from '@/i18n/i18n';
import { useConversationClient } from '@/hooks/useConversationClient';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useApiClients } from '@/hooks/useApiClients';
import { isMockMode } from '@/mock';
import StatusIndicator from './common/StatusIndicator';
import styles from './ServerStatus.module.scss';

const ServerStatus: React.FC = () => {
  const {
    pythonServerStatus,
    ollamaStatus,
    setPythonServerStatus,
    setOllamaStatus,
    setError,
  } = useServerState();
  const { apiUrl, refetch: refetchPort } = useFlaskPort();
  const { t } = useI18n();

  const { setModels, setSelectedModel, activeConversationId, setMessages } =
    useChatState();
  const { settings, updateOllamaConfig } = useSettingsState();
  const conversationClient = useConversationClient();
  const { loadConversations } = useConversationManagement();
  const { serverApi } = useApiClients();
  const intervalId = useRef<number | null>(null);
  const hasGetModels = useRef<boolean>(false);
  const isServerHealthy = useRef<boolean>(false);
  const lastReloadedConversationId = useRef<string | null>(null);

  // Short interval: used when server is not healthy (3 seconds)
  const SHORT_INTERVAL = 3000;
  // Long interval: used when server is healthy (15 seconds)
  const LONG_INTERVAL = 15000;

  useEffect(() => {
    initializeCheckServerStatusInterval();
    // Execute check immediately
    checkPythonServerStatus();
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [apiUrl]);

  const initializeCheckServerStatusInterval = async (): Promise<void> => {
    refetchPort();
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    // Reset health status, start checking with short interval
    isServerHealthy.current = false;
    setPythonServerStatus('started');
    startHealthCheckInterval();
  };

  const startHealthCheckInterval = (): void => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    // Choose interval based on server health status
    const interval = isServerHealthy.current ? LONG_INTERVAL : SHORT_INTERVAL;
    intervalId.current = window.setInterval(() => {
      checkPythonServerStatus();
    }, interval);
  };

  const checkPythonServerStatus = async (): Promise<void> => {
    try {
      const data = await serverApi.checkHealth(settings.ai.provider);

      setOllamaStatus(
        settings.ai.provider !== 'ollama' || data.ollama_available
          ? 'connected'
          : 'disconnected'
      );
      if (data.status === 'healthy') {
        const wasHealthy = isServerHealthy.current;
        setPythonServerStatus('started');
        isServerHealthy.current = true;
        // If changed from unhealthy to healthy, switch to long interval
        if (!wasHealthy) {
          startHealthCheckInterval();
          // Refresh port first to ensure using correct port number
          refetchPort()
            .then(() => {
              // Wait a bit to ensure React state is updated
              setTimeout(() => {
                // Reload conversations list
                loadConversations().catch((error) => {
                  console.error('Failed to reload conversations list:', error);
                });
                // Reload current conversation history
                if (activeConversationId) {
                  reloadConversationHistory(activeConversationId);
                  lastReloadedConversationId.current = activeConversationId;
                }
              }, 100);
            })
            .catch((error) => {
              console.error('Failed to refetch port:', error);
            });
        }
        if (settings.ai.provider === 'ollama' && !hasGetModels.current) {
          fetchModels();
        }
      } else {
        const wasHealthy = isServerHealthy.current;
        setPythonServerStatus('error');
        isServerHealthy.current = false;
        // If changed from healthy to unhealthy, switch to short interval
        if (wasHealthy) {
          startHealthCheckInterval();
          lastReloadedConversationId.current = null;
        }
      }
    } catch (error) {
      const wasHealthy = isServerHealthy.current;
      setPythonServerStatus('error');
      setOllamaStatus('disconnected');
      isServerHealthy.current = false;
      // 如果从正常状态变为异常状态，切换到短 interval
      if (wasHealthy) {
        startHealthCheckInterval();
        lastReloadedConversationId.current = null;
      }
    }
  };

  const reloadConversationHistory = async (
    conversationId: string
  ): Promise<void> => {
    try {
      const messages = await conversationClient.getConversationMessages(
        conversationId
      );
      setMessages(messages);
    } catch (error) {
      console.error('Failed to reload conversation history:', error);
    }
  };

  const fetchModels = async (): Promise<void> => {
    if (settings.ai.provider !== 'ollama') return;

    try {
      const data = await serverApi.getModels('ollama');

      if (data.success) {
        setModels(data.models);
        hasGetModels.current = true;
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].name);
          updateOllamaConfig({
            ...settings.ai.ollama,
            model: data.models[0].name,
          });
        }
      }
    } catch (error) {
      console.error(t('serverStatus.fetchModelsFailed'), error);
    }
  };

  const restartServer = async (): Promise<void> => {
    try {
      setPythonServerStatus('restarting');
      await invoke<ApiResponse<string>>('stop_python_server');
      await invoke<ApiResponse<string>>('start_python_server');
    } catch (error) {
      setPythonServerStatus('error');
      setError(t('serverStatus.restartFailed'));
    }
  };

  return (
    <div className={styles.serverStatus}>
      <StatusIndicator
        pythonStatus={pythonServerStatus}
        ollamaStatus={ollamaStatus}
        provider={settings.ai.provider}
      />
      {(pythonServerStatus === 'error' || ollamaStatus === 'disconnected') && (
        <button
          onClick={restartServer}
          className={styles.retryBtn}
        >
          {t('serverStatus.restartServer')}
        </button>
      )}
      {ENV_CONFIG.VITE_DEV_MODE && (
        <>
          <span className={styles.devBadge}>{t('serverStatus.devMode')}</span>
          {isMockMode() && (
            <span className={styles.mockBadge}>
              {t('serverStatus.mockMode')}
            </span>
          )}
        </>
      )}

      {ollamaStatus === 'disconnected' &&
        pythonServerStatus === 'started' &&
        settings.ai.provider === 'ollama' && (
          <div className={styles.connectionHelp}>
            <h4>{t('serverStatus.cannotConnectToOllama')}</h4>
            <p>{t('serverStatus.pleaseEnsure')}</p>
            <ul>
              <li>{t('serverStatus.ollamaInstalled')}</li>
              <li>{t('serverStatus.ollamaRunning')}</li>
              <li>{t('serverStatus.defaultPort')}</li>
            </ul>
          </div>
        )}
    </div>
  );
};

export default ServerStatus;
