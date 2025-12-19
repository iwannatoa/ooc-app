import React from 'react';
import { ChatMessage } from '@/types';
import { useI18n } from '@/i18n';
import styles from './MessageList.module.scss';

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading }) => {
  const { t } = useI18n();
  
  return (
    <div className={styles.messageList}>
      {messages.map((message, index) => (
        <div
          key={message.id || index}
          className={`${styles.message} ${styles[message.role]}`}
        >
          <div className={styles.messageHeader}>
            <strong>{message.role === 'user' ? t('messages.user') : t('messages.ai')}</strong>
            {message.timestamp && (
              <span className={styles.messageTime}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className={styles.messageContent}>{message.content}</div>
        </div>
      ))}
      {loading && (
        <div
          className={`${styles.message} ${styles.assistant} ${styles.loading}`}
        >
          <div className={styles.typingIndicator}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          {t('messages.thinking')}
        </div>
      )}
    </div>
  );
};

export default MessageList;
