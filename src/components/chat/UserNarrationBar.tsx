/**
 * Optional user narration / note (appends a user-role chat row via /api/story/user-note).
 */
import React, { useCallback, useState } from 'react';
import { useApiClients } from '@/hooks/useApiClients';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useChatState } from '@/hooks/useChatState';
import { useI18n } from '@/i18n/i18n';
import styles from './ChatInterface.module.scss';

export const UserNarrationBar: React.FC = () => {
  const { settings } = useSettingsState();
  const { activeConversationId } = useConversationManagement();
  const { storyApi, conversationApi } = useApiClients();
  const { setMessages } = useChatState();
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    const v = text.trim();
    if (!activeConversationId || !v) return;
    setBusy(true);
    try {
      const res = await storyApi.saveUserNote(activeConversationId, v);
      if (!res.success) {
        return;
      }
      setText('');
      const msgs = await conversationApi.getConversationMessages(
        activeConversationId
      );
      setMessages(msgs);
    } finally {
      setBusy(false);
    }
  }, [
    activeConversationId,
    conversationApi,
    setMessages,
    storyApi,
    text,
  ]);

  if (!settings.advanced.enableFreeformNote || !activeConversationId) {
    return null;
  }

  return (
    <div className={styles.narrationBar}>
      <input
        type='text'
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('chat.userNotePlaceholder')}
        disabled={busy}
        aria-label={t('chat.userNotePlaceholder')}
      />
      <button
        type='button'
        onClick={() => void onSubmit()}
        disabled={busy || !text.trim()}
      >
        {t('chat.userNoteSubmit')}
      </button>
    </div>
  );
};

UserNarrationBar.displayName = 'UserNarrationBar';
