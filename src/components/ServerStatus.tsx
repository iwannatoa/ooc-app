import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiResponse, HealthResponse, ModelsResponse } from '@/types';
import { ENV_CONFIG } from '@/types/constants';
import { useServerState } from '@/hooks/useServerState';
import { useChatState } from '@/hooks/useChatState';
import { useSettingsState } from '@/hooks/useSettingsState';
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

  const { setModels, setSelectedModel } = useChatState();
  const { settings, updateOllamaConfig } = useSettingsState();
  const intervalId = useRef<number | null>(null);
  const hasGetModels = useRef<boolean>(false);

  useEffect(() => {
    initializeCheckServerStatusInterval();

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
        console.log('clear in effect');
      }
    };
  }, []);

  const initializeCheckServerStatusInterval = async (): Promise<void> => {
    console.log('init ');
    if (!intervalId.current) {
      setPythonServerStatus('started');
    } else {
      console.log('clear in init');
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    intervalId.current = window.setInterval(() => {
      console.log('check in interval');
      checkPythonServerStatus();
    }, 5000);
  };

  const checkPythonServerStatus = async (): Promise<void> => {
    try {
      let data: HealthResponse;
      
      if (isMockMode()) {
        data = await mockServerClient.checkHealth();
      } else {
        const response = await fetch(
          `${ENV_CONFIG.VITE_FLASK_API_URL}/api/health`
        );
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
      let data: ModelsResponse;
      
      if (isMockMode()) {
        data = await mockServerClient.getModels('ollama');
      } else {
        const response = await fetch(
          `${ENV_CONFIG.VITE_FLASK_API_URL}/api/models`
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
      console.error('获取模型列表失败:', error);
    }
  };

  const restartServer = async (): Promise<void> => {
    try {
      setPythonServerStatus('restarting');
      await invoke<ApiResponse<string>>('stop_python_server');
      await invoke<ApiResponse<string>>('start_python_server');
    } catch (error) {
      setPythonServerStatus('error');
      setError('重启服务器失败');
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
          重启服务
        </button>
      )}
      {ENV_CONFIG.VITE_DEV_MODE && (
        <>
          <span className={styles.devBadge}>开发模式</span>
          {isMockMode() && (
            <span className={styles.mockBadge}>Mock 模式</span>
          )}
        </>
      )}

      {ollamaStatus === 'disconnected' &&
        pythonServerStatus === 'started' &&
        settings.ai.provider === 'ollama' && (
          <div className={styles.connectionHelp}>
            <h4>无法连接到Ollama</h4>
            <p>请确保：</p>
            <ul>
              <li>已安装Ollama</li>
              <li>
                Ollama服务正在运行 (运行命令: <code>ollama serve</code>)
              </li>
              <li>服务运行在默认端口 11434</li>
            </ul>
          </div>
        )}
    </div>
  );
};

export default ServerStatus;
