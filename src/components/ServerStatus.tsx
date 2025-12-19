import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiResponse, HealthResponse, ModelsResponse } from '@/types';
import { ENV_CONFIG } from '@/types/constants';
import { useServerState } from '@/hooks/useServerState';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { useI18n } from '@/i18n';
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

  const { setModels, setSelectedModel } = useChatState();
  const { settings, updateOllamaConfig } = useSettingsState();
  const intervalId = useRef<number | null>(null);
  const hasGetModels = useRef<boolean>(false);
  const apiUrlRef = useRef<string>(apiUrl);

  useEffect(() => {
    apiUrlRef.current = apiUrl;
  }, [apiUrl]);

  useEffect(() => {
    initializeCheckServerStatusInterval();
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
    setPythonServerStatus('started');
    intervalId.current = window.setInterval(() => {
      checkPythonServerStatus();
    }, 5000);
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
        setPythonServerStatus('started');
        if (settings.ai.provider === 'ollama' && !hasGetModels.current) {
          fetchModels();
        }
      } else {
        setPythonServerStatus('error');
      }
    } catch (error) {
      setPythonServerStatus('error');
      setOllamaStatus('disconnected');
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
