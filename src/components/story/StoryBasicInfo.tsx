import React from 'react';
import styles from './ConversationSettingsForm.module.scss';

interface StoryBasicInfoProps {
  title: string;
  background: string;
  supplement: string;
  onTitleChange: (title: string) => void;
  onBackgroundChange: (background: string) => void;
  onSupplementChange: (supplement: string) => void;
  t: (key: string) => string;
}

/**
 * Story Basic Information Section
 *
 * Handles story title, background, and supplementary settings input.
 */
export const StoryBasicInfo: React.FC<StoryBasicInfoProps> = ({
  title,
  background,
  supplement,
  onTitleChange,
  onBackgroundChange,
  onSupplementChange,
  t,
}) => {
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
          onChange={(e) => onTitleChange(e.target.value)}
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
          onChange={(e) => onBackgroundChange(e.target.value)}
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
          onChange={(e) => onSupplementChange(e.target.value)}
          placeholder={t('conversationSettingsForm.supplementPlaceholder')}
          rows={3}
        />
      </div>
    </>
  );
};
