import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/i18n';
import { useChatState } from '@/hooks/useChatState';
import { parseThinkContent } from '@/utils/parseThinkContent';
import ThinkContent from '../ThinkContent';
import styles from './MessageList.module.scss';

const MessageList: React.FC = () => {
  const { t } = useI18n();
  const { messages, isSending: loading } = useChatState();
  const messageListRef = useRef<HTMLDivElement>(null);

  // Only show AI messages, filter out user messages
  const aiMessages = messages.filter(
    (msg) => msg.role === 'assistant' || msg.role === 'ai'
  );

  // Auto scroll to bottom when messages update or loading state changes
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
