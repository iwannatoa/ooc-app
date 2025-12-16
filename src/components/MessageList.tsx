import React from 'react';
import { ChatMessage } from '@/types';
import styles from './MessageList.module.scss';

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading }) => {
  return (
    <div className={styles.messageList}>
      {messages.map((message, index) => (
        <div
          key={message.id || index}
          className={`${styles.message} ${styles[message.role]}`}
        >
          <div className={styles.messageHeader}>
            <strong>{message.role === 'user' ? '你' : 'AI'}</strong>
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
          思考中...
        </div>
      )}
    </div>
  );
};

export default MessageList;
