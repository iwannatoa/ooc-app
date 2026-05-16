import React, { useCallback, useState } from 'react';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useI18n } from '@/i18n/i18n';
import styles from './ChatInterface.module.scss';

const ChatInput: React.FC = () => {
  const { t } = useI18n();
  const { handleSendMessage, activeConversationId } = useConversationManagement();
  const { isSending } = useChatState();
  const [text, setText] = useState('');

  const onSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    await handleSendMessage(content);
    setText('');
  }, [handleSendMessage, text]);

  // Keep UX focused on story flow; free-chat is available only after conversation starts.
  if (!activeConversationId) {
    return null;
  }

  return (
    <div className={styles.freeChatBar}>
      <input
        type='text'
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void onSubmit();
          }
        }}
        placeholder={t('messages.inputPlaceholder')}
        disabled={isSending}
        aria-label={t('messages.inputPlaceholder')}
      />
      <button
        type='button'
        onClick={() => void onSubmit()}
        disabled={isSending || !text.trim()}
      >
        {isSending ? t('messages.sending') : t('messages.send')}
      </button>
    </div>
  );
};

export default ChatInput;
