import React, { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/i18n/i18n';
import { useChatState } from '@/hooks/useChatState';
import AssistantMessageItem from './AssistantMessageItem';
import styles from './MessageList.module.scss';

const MessageList: React.FC = () => {
  const { t } = useI18n();
  const { messages, isSending: loading, storyOperation } = useChatState();
  const messageListRef = useRef<HTMLDivElement>(null);

  const aiMessages = useMemo(
    () =>
      messages.filter(
        (msg) => msg.role === 'assistant' || msg.role === 'ai'
      ),
    [messages]
  );

  const lastAssistantScrollKey = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' || m.role === 'ai') {
        const len = m.content?.length ?? 0;
        return `${m.id ?? `i-${i}`}-${len}`;
      }
    }
    return '';
  }, [messages]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [lastAssistantScrollKey, loading, storyOperation]);

  return (
    <div
      ref={messageListRef}
      className={styles.messageList}
      aria-busy={loading}
      aria-live="polite"
    >
      {aiMessages.map((message, index) => (
        <AssistantMessageItem
          key={message.id || `idx-${index}`}
          message={message}
          listIndex={index}
        />
      ))}
      {loading && (
        <div
          className={`${styles.message} ${styles.assistant} ${styles.loading}`}
          aria-live="polite"
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
