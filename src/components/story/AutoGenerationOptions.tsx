import React from 'react';
import styles from './ConversationSettingsForm.module.scss';

interface AutoGenerationOptionsProps {
  allowAutoGenerateCharacters: boolean;
  allowAutoGenerateMainCharacters: boolean;
  onAllowAutoGenerateCharactersChange: (value: boolean) => void;
  onAllowAutoGenerateMainCharactersChange: (value: boolean) => void;
  t: (key: string) => string;
}

/**
 * Auto Generation Options Section
 *
 * Handles options for automatic character generation during story generation.
 */
export const AutoGenerationOptions: React.FC<AutoGenerationOptionsProps> = ({
  allowAutoGenerateCharacters,
  allowAutoGenerateMainCharacters,
  onAllowAutoGenerateCharactersChange,
  onAllowAutoGenerateMainCharactersChange,
  t,
}) => {
  return (
    <div className={styles.field}>
      <label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type='checkbox'
            checked={allowAutoGenerateCharacters}
            onChange={(e) =>
              onAllowAutoGenerateCharactersChange(e.target.checked)
            }
          />
          <span>
            {t('conversationSettingsForm.allowAutoGenerateCharacters')}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {t('conversationSettingsForm.allowAutoGenerateCharactersTooltip')}
        </div>
      </label>
      {allowAutoGenerateCharacters && (
        <label style={{ marginTop: '12px', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type='checkbox'
              checked={allowAutoGenerateMainCharacters}
              onChange={(e) =>
                onAllowAutoGenerateMainCharactersChange(e.target.checked)
              }
              disabled={!allowAutoGenerateCharacters}
            />
            <span>
              {t('conversationSettingsForm.allowAutoGenerateMainCharacters')}
            </span>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '4px',
              marginLeft: '24px',
            }}
          >
            {t(
              'conversationSettingsForm.allowAutoGenerateMainCharactersTooltip'
            )}
          </div>
        </label>
      )}
    </div>
  );
};
