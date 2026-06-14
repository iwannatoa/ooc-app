import React from 'react';
import { useI18n } from '@/i18n/i18n';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import styles from './ConversationSettingsForm.module.scss';

/**
 * Serialization length: open-ended vs fixed total section count (maps to ``total_sections``).
 */
export const StoryLengthMode: React.FC = () => {
  const { t } = useI18n();
  const { formData, updateFields } = useConversationSettingsForm();

  return (
    <fieldset className={styles.storyLengthFieldset}>
      <legend>{t('conversationSettingsForm.storyLengthMode')}</legend>
      <div className={styles.storyLengthOptions}>
        <label className={styles.radioLabel}>
          <input
            type='radio'
            name='serialization'
            checked={formData.serializationOpenEnded}
            onChange={() => updateFields({ serializationOpenEnded: true })}
          />
          {t('conversationSettingsForm.serializationOpen')}
        </label>
        <label className={styles.radioLabel}>
          <input
            type='radio'
            name='serialization'
            checked={!formData.serializationOpenEnded}
            onChange={() => updateFields({ serializationOpenEnded: false })}
          />
          {t('conversationSettingsForm.serializationFinite')}
        </label>
      </div>
      {!formData.serializationOpenEnded && (
        <label className={styles.totalSectionsRow}>
          <span>{t('conversationSettingsForm.totalSectionsLabel')}</span>
          <input
            type='number'
            min={1}
            max={999}
            value={formData.finiteTotalSections}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              const v = Number.isFinite(raw) ? Math.min(999, Math.max(1, raw)) : 1;
              updateFields({ finiteTotalSections: v });
            }}
          />
        </label>
      )}
      <p className={styles.fieldHint}>{t('conversationSettingsForm.totalSectionsHint')}</p>
    </fieldset>
  );
};
