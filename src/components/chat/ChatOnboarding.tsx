import React from 'react';
import { useI18n } from '@/i18n/i18n';
import { useChatState } from '@/hooks/useChatState';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useConversationSettingsDialog } from '@/hooks/useDialog';
import styles from './ChatOnboarding.module.scss';

const ChatOnboarding: React.FC = () => {
  const { t } = useI18n();
  const { messages } = useChatState();
  const {
    activeConversationId,
    conversationSettings,
    handleNewConversation,
  } = useConversationManagement();
  const settingsDialog = useConversationSettingsDialog();

  const hasOutline = Boolean(conversationSettings?.outline?.trim());
  const hasMessages = messages.length > 0;
  const ready = Boolean(activeConversationId && hasOutline && hasMessages);

  if (ready) return null;

  const openSettings = () => {
    if (activeConversationId) {
      settingsDialog.open(activeConversationId, {
        settings: conversationSettings,
      });
    }
  };

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>{t('onboarding.title')}</h3>
      <ol className={styles.list}>
        <li>{t('onboarding.stepPickStory')}</li>
        <li>{t('onboarding.stepOutline')}</li>
        <li>{t('onboarding.stepModel')}</li>
      </ol>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => handleNewConversation()}
        >
          {t('onboarding.newStory')}
        </button>
        <button
          type="button"
          className={styles.actionBtnGhost}
          onClick={openSettings}
          disabled={!activeConversationId}
        >
          {t('onboarding.openSettings')}
        </button>
      </div>
    </div>
  );
};

export default ChatOnboarding;
