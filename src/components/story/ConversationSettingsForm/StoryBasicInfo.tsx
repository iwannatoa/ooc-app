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
    contextRecentMessagesWithSummary,
    contextMaxMessageHistory,
    contextMaxContextTokens,
    contextEffectiveBudgetRatio,
    contextRecentBudgetRatio,
    contextSummaryBudgetRatio,
    summaryRefreshDeltaMessages,
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

      <div className={styles.field}>
        <label htmlFor='context-recent-messages-with-summary'>
          Context Recent Messages With Summary (optional)
        </label>
        <input
          id='context-recent-messages-with-summary'
          type='number'
          min='1'
          value={contextRecentMessagesWithSummary}
          onChange={(e) =>
            updateFields({ contextRecentMessagesWithSummary: e.target.value })
          }
          placeholder='12'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='context-max-message-history'>
          Context Max Message History (optional)
        </label>
        <input
          id='context-max-message-history'
          type='number'
          min='1'
          value={contextMaxMessageHistory}
          onChange={(e) =>
            updateFields({ contextMaxMessageHistory: e.target.value })
          }
          placeholder='50'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='context-max-context-tokens'>
          Context Max Tokens Budget (optional)
        </label>
        <input
          id='context-max-context-tokens'
          type='number'
          min='256'
          value={contextMaxContextTokens}
          onChange={(e) =>
            updateFields({ contextMaxContextTokens: e.target.value })
          }
          placeholder='12000'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='context-effective-budget-ratio'>
          Context Effective Budget Ratio (optional)
        </label>
        <input
          id='context-effective-budget-ratio'
          type='number'
          min='0.5'
          max='0.95'
          step='0.05'
          value={contextEffectiveBudgetRatio}
          onChange={(e) =>
            updateFields({ contextEffectiveBudgetRatio: e.target.value })
          }
          placeholder='0.8'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='context-recent-budget-ratio'>
          Context Recent Budget Ratio (optional)
        </label>
        <input
          id='context-recent-budget-ratio'
          type='number'
          min='0.1'
          max='0.9'
          step='0.05'
          value={contextRecentBudgetRatio}
          onChange={(e) =>
            updateFields({ contextRecentBudgetRatio: e.target.value })
          }
          placeholder='0.4'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='context-summary-budget-ratio'>
          Context Summary Budget Ratio (optional)
        </label>
        <input
          id='context-summary-budget-ratio'
          type='number'
          min='0.05'
          max='0.8'
          step='0.05'
          value={contextSummaryBudgetRatio}
          onChange={(e) =>
            updateFields({ contextSummaryBudgetRatio: e.target.value })
          }
          placeholder='0.3'
        />
      </div>

      <div className={styles.field}>
        <label htmlFor='summary-refresh-delta-messages'>
          Summary Refresh Delta Messages (optional)
        </label>
        <input
          id='summary-refresh-delta-messages'
          type='number'
          min='1'
          value={summaryRefreshDeltaMessages}
          onChange={(e) =>
            updateFields({ summaryRefreshDeltaMessages: e.target.value })
          }
          placeholder='20'
        />
      </div>
    </>
  );
};

