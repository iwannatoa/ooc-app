import React from 'react';
import { useI18n } from '@/i18n';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import styles from './ConversationSettingsForm.module.scss';

/**
 * Auto Generation Options Section
 *
 * Handles options for automatic character generation during story generation.
 * Uses Redux to manage state directly.
 */
export const AutoGenerationOptions: React.FC = () => {
  const { t } = useI18n();
  const { formData, updateFields } = useConversationSettingsForm();
  const { allowAutoGenerateCharacters, allowAutoGenerateMainCharacters } =
    formData;
  return (
    <div className={styles.field}>
      <label>
        <div className={styles.checkboxContainer}>
          <input
            type='checkbox'
            checked={allowAutoGenerateCharacters}
            onChange={(e) => {
              const checked = e.target.checked;
              updateFields({
                allowAutoGenerateCharacters: checked,
                allowAutoGenerateMainCharacters: checked
                  ? allowAutoGenerateMainCharacters
                  : false,
              });
            }}
          />
          <span>
            {t('conversationSettingsForm.allowAutoGenerateCharacters')}
          </span>
        </div>
        <div className={styles.checkboxTooltip}>
          {t('conversationSettingsForm.allowAutoGenerateCharactersTooltip')}
        </div>
      </label>
      {allowAutoGenerateCharacters && (
        <label className={styles.checkboxLabel}>
          <div className={styles.checkboxContainer}>
            <input
              type='checkbox'
              checked={allowAutoGenerateMainCharacters}
              onChange={(e) =>
                updateFields({
                  allowAutoGenerateMainCharacters: e.target.checked,
                })
              }
              disabled={!allowAutoGenerateCharacters}
            />
            <span>
              {t('conversationSettingsForm.allowAutoGenerateMainCharacters')}
            </span>
          </div>
          <div className={styles.checkboxTooltip}>
            {t(
              'conversationSettingsForm.allowAutoGenerateMainCharactersTooltip'
            )}
          </div>
        </label>
      )}
    </div>
  );
};

