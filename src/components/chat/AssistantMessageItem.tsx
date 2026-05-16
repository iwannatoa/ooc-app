import React, { memo, useMemo } from 'react';
import { useI18n } from '@/i18n/i18n';
import type { ChatMessage } from '@/types';
import { parseThinkContent } from '@/utils/parseThinkContent';
import ThinkContent from '../ThinkContent';
import styles from './MessageList.module.scss';

export interface AssistantMessageItemProps {
  message: ChatMessage;
  /** Fallback list index when `message.id` is missing */
  listIndex: number;
}

function renderParsedContent(content: string) {
  if (!content || content.trim() === '') {
    return null;
  }

  const parts = parseThinkContent(content);

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
        }
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
      })}
    </>
  );
}

const AssistantMessageItem = memo(function AssistantMessageItem({
  message,
  listIndex: _listIndex,
}: AssistantMessageItemProps) {
  const { t } = useI18n();

  const body = useMemo(
    () => (message.content ? renderParsedContent(message.content) : null),
    [message.content]
  );

  return (
    <div className={`${styles.message} ${styles.assistant}`}>
      <div className={styles.messageHeader}>
        <strong>{t('messages.ai')}</strong>
        {message.timestamp ? (
          <span className={styles.messageTime}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      <div className={styles.messageContent}>{body}</div>
    </div>
  );
}, areEqual);

function areEqual(
  prev: AssistantMessageItemProps,
  next: AssistantMessageItemProps
) {
  return (
    prev.listIndex === next.listIndex &&
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.timestamp === next.message.timestamp &&
    prev.message.role === next.message.role
  );
}

export default AssistantMessageItem;
