import { useConversationClient } from '@/hooks/useConversationClient';
import { useI18n } from '@/i18n';
import React from 'react';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import { useConversationSettingsGeneration } from '@/hooks/useConversationSettingsGeneration';
import { useConversationSettingsConverter } from '@/hooks/useConversationSettingsConverter';
import { StoryBasicInfo } from './StoryBasicInfo';
import { CharacterManagement } from './CharacterManagement';
import { OutlineGeneration } from './OutlineGeneration';
import { AutoGenerationOptions } from './AutoGenerationOptions';
import styles from './ConversationSettingsForm.module.scss';

interface ConversationSettingsFormProps {
  onSave?: (settings: any) => void;
  onCancel?: () => void;
}

/**
 * Conversation Settings Form Component
 *
 * Main form for editing conversation/story settings including:
 * - Basic story information (title, background, supplement)
 * - Character management and AI generation
 * - Story outline and AI generation
 * - Auto-generation options
 *
 * Uses Redux to manage all form state and generation state.
 * No props needed except optional onSave and onCancel callbacks.
 */
const ConversationSettingsForm: React.FC<ConversationSettingsFormProps> = ({
  onSave,
  onCancel,
}) => {
  const { t } = useI18n();
  const conversationClient = useConversationClient();

  // Form state management (Redux)
  const { formData, conversationId, isNewConversation, updateFields } =
    useConversationSettingsForm();

  // AI generation logic (Redux)
  const { generateOutline } = useConversationSettingsGeneration();

  // Data conversion
  const { toApiFormat } = useConversationSettingsConverter();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!conversationId) {
      console.error('No conversation ID');
      return;
    }

    let finalOutline = formData.outline.trim();

    // Auto-generate outline for new conversations if not provided
    if (!finalOutline && isNewConversation) {
      const generated = await generateOutline();
      if (generated) {
        finalOutline = generated;
        updateFields({ outline: generated });
      } else {
        return; // Generation failed, don't submit
      }
    }

    // Convert form data to API format
    const apiData = toApiFormat(
      {
        ...formData,
        outline: finalOutline,
      },
      conversationId
    );

    try {
      if (onSave) {
        await onSave(apiData);
      }

      // Confirm outline if it was generated
      if (
        finalOutline &&
        (formData.outlineConfirmed || formData.generatedOutline)
      ) {
        try {
          await conversationClient.confirmOutline(conversationId);
        } catch (error) {
          console.error('Failed to confirm outline:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>
            {isNewConversation
              ? t('conversationSettingsForm.newConversationTitle')
              : t('conversationSettingsForm.editConversationTitle')}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <StoryBasicInfo />

          <CharacterManagement />

          <OutlineGeneration />

          <AutoGenerationOptions />

          <div className={styles.actions}>
            <button
              type='button'
              onClick={onCancel}
              className={styles.cancelButton}
            >
              {t('conversationSettingsForm.cancel')}
            </button>
            <button
              type='submit'
              className={styles.submitButton}
            >
              {t('conversationSettingsForm.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConversationSettingsForm;

