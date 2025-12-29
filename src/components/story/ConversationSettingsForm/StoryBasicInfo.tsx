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
  const { title, background, supplement } = formData;
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
    </>
  );
};

