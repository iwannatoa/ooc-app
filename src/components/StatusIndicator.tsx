import React from 'react';
import { PythonServerStatus, OllamaStatus } from '@/types';
import styles from './StatusIndicator.module.scss';

interface StatusIndicatorProps {
  pythonStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  provider: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  pythonStatus,
  ollamaStatus,
  provider,
}) => {
  const getStatusMessage = () => {
    if (pythonStatus === 'starting') return '🟡 启动服务...';
    if (pythonStatus === 'error') return '🔴 服务错误';

    if (provider === 'ollama') {
      if (ollamaStatus === 'connected') return '🟢 服务正常';
      if (ollamaStatus === 'disconnected') return '🔴 Ollama未连接';
    } else {
      if (pythonStatus === 'started') return '🟢 服务正常';
    }

    return '🟡 检查状态...';
  };

  const isReady =
    pythonStatus === 'started' &&
    (provider !== 'ollama' || ollamaStatus === 'connected');

  return (
    <div
      className={`${styles.statusIndicator} ${
        isReady ? styles.connected : styles.disconnected
      }`}
    >
      {getStatusMessage()}
    </div>
  );
};

export default StatusIndicator;
