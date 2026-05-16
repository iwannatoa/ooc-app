import React from 'react';
import { useI18n } from '@/i18n/i18n';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import styles from './ConversationSettingsForm.module.scss';

/**
 * Story Basic Information Section
 *
 * Handles story title, background, and supplementary settings input.
 * Uses Redux to manage state directly.
 */
export const StoryBasicInfo: React.FC = () => {
  const { t } = useI18n();
  const { formData, updateFields } = useConversationSettingsForm();
  const {
    title,
    background,
    supplement,
    conversationTemperature,
    conversationMaxTokens,
    conversationStopWords,
  } = formData;
  return (
    <>
      <div className={styles.field}>
        <label htmlFor='title'>
          {t('conversationSettingsForm.storyTitle')}
        </label>
        <input
          id='title'
          type='text'
          value={title}
          onChange={(e) => updateFields({ title: e.target.value })}
          placeholder={t('conversationSettingsForm.storyTitlePlaceholder')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='background'>
          {t('conversationSettingsForm.background')} *
        </label>
        <textarea
          id='background'
          value={background}
          onChange={(e) => updateFields({ background: e.target.value })}
          placeholder={t('conversationSettingsForm.backgroundPlaceholder')}
          rows={4}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='supplement'>
          {t('conversationSettingsForm.supplement')}
        </label>
        <textarea
          id='supplement'
          value={supplement}
          onChange={(e) => updateFields({ supplement: e.target.value })}
          placeholder={t('conversationSettingsForm.supplementPlaceholder')}
          rows={3}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='conversation-temperature'>
          Conversation Temperature (optional)
        </label>
        <input
          id='conversation-temperature'
          type='number'
          min='0'
          max='2'
          step='0.1'
          value={conversationTemperature}
          onChange={(e) =>
            updateFields({ conversationTemperature: e.target.value })
          }
          placeholder='0.7'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='conversation-max-tokens'>
          Conversation Max Tokens (optional)
        </label>
        <input
          id='conversation-max-tokens'
          type='number'
          min='1'
          value={conversationMaxTokens}
          onChange={(e) =>
            updateFields({ conversationMaxTokens: e.target.value })
          }
          placeholder='2048'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='conversation-stop-words'>
          Conversation Stop Words (optional)
        </label>
        <textarea
          id='conversation-stop-words'
          value={conversationStopWords}
          onChange={(e) => updateFields({ conversationStopWords: e.target.value })}
          placeholder='END, STOP, ###'
          rows={2}
        />
      </div>
    </>
  );
};

