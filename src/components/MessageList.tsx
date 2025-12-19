import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { useI18n } from '@/i18n';
import { parseThinkContent } from '@/utils/parseThinkContent';
import ThinkContent from './ThinkContent';
import styles from './MessageList.module.scss';

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading }) => {
  const { t } = useI18n();
  const messageListRef = useRef<HTMLDivElement>(null);

  // 只显示AI消息，过滤掉用户消息
  const aiMessages = messages.filter(
    (msg) => msg.role === 'assistant' || msg.role === 'ai'
  );

  // 自动滚动到底部，当消息更新或加载状态变化时
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const renderContent = (content: string) => {
    // If content is empty, don't render anything
    if (!content || content.trim() === '') {
      return null;
    }

    const parts = parseThinkContent(content);

    // If no parts parsed, render content as-is
    if (parts.length === 0) {
      return <div className={styles.textContent}>{content}</div>;
    }

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'think') {
            return (
              <ThinkContent
                key={`think-${index}`}
                content={part.content}
                isOpen={part.isOpen}
              />
            );
          } else {
            // Only render text content if it's not empty
            if (part.content.trim()) {
              return (
                <div
                  key={`text-${index}`}
                  className={styles.textContent}
                >
                  {part.content}
                </div>
              );
            }
            return null;
          }
        })}
      </>
    );
  };

  return (
    <div
      ref={messageListRef}
      className={styles.messageList}
    >
      {aiMessages.map((message, index) => {
        return (
          <div
            key={message.id || index}
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageHeader}>
              <strong>{t('messages.ai')}</strong>
              {message.timestamp && (
                <span className={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className={styles.messageContent}>
              {message.content ? renderContent(message.content) : null}
            </div>
          </div>
        );
      })}
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
