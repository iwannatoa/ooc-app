import React from 'react';
import { PythonServerStatus, OllamaStatus } from '@/types';
import { useI18n } from '@/i18n';
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
  const { t } = useI18n();

  const getStatusMessage = () => {
    if (pythonStatus === 'starting') return `🟡 ${t('serverStatus.status.starting')}`;
    if (pythonStatus === 'error') return `🔴 ${t('serverStatus.status.serviceError')}`;

    if (provider === 'ollama') {
      if (ollamaStatus === 'connected') return `🟢 ${t('serverStatus.status.serviceNormal')}`;
      if (ollamaStatus === 'disconnected') return `🔴 ${t('serverStatus.status.ollamaNotConnected')}`;
    } else {
      if (pythonStatus === 'started') return `🟢 ${t('serverStatus.status.serviceNormal')}`;
    }

    return `🟡 ${t('serverStatus.status.checkingStatus')}`;
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
