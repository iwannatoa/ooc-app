import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiResponse, HealthResponse, ModelsResponse } from '@/types';
import { ENV_CONFIG } from '@/types/constants';
import { useServerState } from '@/hooks/useServerState';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { useI18n } from '@/i18n';
import { useConversationClient } from '@/hooks/useConversationClient';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { isMockMode, mockServerClient } from '@/mock';
import StatusIndicator from './StatusIndicator';
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

  const { setModels, setSelectedModel, activeConversationId, setMessages } = useChatState();
  const { settings, updateOllamaConfig } = useSettingsState();
  const conversationClient = useConversationClient();
  const { loadConversations } = useConversationManagement();
  const intervalId = useRef<number | null>(null);
  const hasGetModels = useRef<boolean>(false);
  const apiUrlRef = useRef<string>(apiUrl);
  const isServerHealthy = useRef<boolean>(false);
  const lastReloadedConversationId = useRef<string | null>(null);
  
  // 短 interval：服务器未正常时使用（3秒）
  const SHORT_INTERVAL = 3000;
  // 长 interval：服务器正常后使用（15秒）
  const LONG_INTERVAL = 15000;

  useEffect(() => {
    apiUrlRef.current = apiUrl;
  }, [apiUrl]);

  useEffect(() => {
    initializeCheckServerStatusInterval();
    // 立即执行一次检查
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
    // 重置健康状态，使用短 interval 开始检查
    isServerHealthy.current = false;
    setPythonServerStatus('started');
    startHealthCheckInterval();
  };

  const startHealthCheckInterval = (): void => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    // 根据服务器健康状态选择 interval
    const interval = isServerHealthy.current ? LONG_INTERVAL : SHORT_INTERVAL;
    intervalId.current = window.setInterval(() => {
      checkPythonServerStatus();
    }, interval);
  };

  const checkPythonServerStatus = async (): Promise<void> => {
    try {
      const currentApiUrl = apiUrlRef.current;
      
      let data: HealthResponse;
      
      if (isMockMode()) {
        data = await mockServerClient.checkHealth();
      } else {
        const response = await fetch(
          `${currentApiUrl}/api/health`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
      }
      
      setOllamaStatus(
        settings.ai.provider !== 'ollama' || data.ollama_available
          ? 'connected'
          : 'disconnected'
      );
      if (data.status === 'healthy') {
        const wasHealthy = isServerHealthy.current;
        setPythonServerStatus('started');
        isServerHealthy.current = true;
        // 如果从异常状态变为正常状态，切换到长 interval
        if (!wasHealthy) {
          startHealthCheckInterval();
          // 先刷新端口，确保使用正确的端口号
          refetchPort().then(() => {
            // 等待一小段时间确保 React 状态已更新
            setTimeout(() => {
              // 重新加载会话列表
              loadConversations().catch((error) => {
                console.error('Failed to reload conversations list:', error);
              });
              // 重新加载当前会话的历史记录
              if (activeConversationId) {
                reloadConversationHistory(activeConversationId);
                lastReloadedConversationId.current = activeConversationId;
              }
            }, 100);
          }).catch((error) => {
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
        // 如果从正常状态变为异常状态，切换到短 interval
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
  
  const reloadConversationHistory = async (conversationId: string): Promise<void> => {
    try {
      const messages = await conversationClient.getConversationMessages(conversationId);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to reload conversation history:', error);
    }
  };

  const fetchModels = async (): Promise<void> => {
    if (settings.ai.provider !== 'ollama') return;

    try {
      const currentApiUrl = apiUrlRef.current;
      let data: ModelsResponse;
      
      if (isMockMode()) {
        data = await mockServerClient.getModels('ollama');
      } else {
        const response = await fetch(
          `${currentApiUrl}/api/models`
        );
        data = await response.json();
      }
      
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
            <span className={styles.mockBadge}>{t('serverStatus.mockMode')}</span>
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
              <li>
                {t('serverStatus.ollamaRunning')}
              </li>
              <li>{t('serverStatus.defaultPort')}</li>
            </ul>
          </div>
        )}
    </div>
  );
};

export default ServerStatus;
