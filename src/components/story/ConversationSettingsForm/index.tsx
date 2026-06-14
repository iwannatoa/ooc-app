import { useConversationClient } from '@/hooks/useConversationClient';
import { useI18n } from '@/i18n/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import { useConversationSettingsGeneration } from '@/hooks/useConversationSettingsGeneration';
import { useConversationSettingsConverter } from '@/hooks/useConversationSettingsConverter';
import { StoryBasicInfo } from './StoryBasicInfo';
import { CharacterManagement } from './CharacterManagement';
import { OutlineGeneration } from './OutlineGeneration';
import { StoryLengthMode } from './StoryLengthMode';
import { AutoGenerationOptions } from './AutoGenerationOptions';
import type { ConversationSettings } from '@/types';
import styles from './ConversationSettingsForm.module.scss';

interface ConversationSettingsFormProps {
  onSave?: (settings: Partial<ConversationSettings>) => void | Promise<void>;
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
  const [templates, setTemplates] = useState<
    Array<{
      id: string;
      title: string;
      background?: string;
      outline_hint?: string;
    }>
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [lastPresetSnapshot, setLastPresetSnapshot] = useState<{
    background: string;
    outline: string;
    characters: string[];
    characterPersonality: Record<string, string>;
    conversationTemperature: string;
    conversationMaxTokens: string;
  } | null>(null);

  // Form state management (Redux)
  const { formData, conversationId, isNewConversation, updateFields } =
    useConversationSettingsForm();
  // AI generation logic (Redux)
  const { generateOutline } = useConversationSettingsGeneration();

  // Data conversion
  const { toApiFormat } = useConversationSettingsConverter();

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    void conversationClient.getProgress(conversationId).then((p) => {
      if (cancelled || !p) return;
      const ts = p.total_sections;
      if (typeof ts === 'number' && ts >= 1) {
        updateFields({
          serializationOpenEnded: false,
          finiteTotalSections: ts,
        });
      } else {
        updateFields({ serializationOpenEnded: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, conversationClient, updateFields]);

  useEffect(() => {
    let cancelled = false;
    void conversationClient.getStoryTemplates().then((items) => {
      if (!cancelled) {
        setTemplates(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversationClient]);

  const selectedTemplate = useMemo(
    () => templates.find((x) => x.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

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

      const totalSections = formData.serializationOpenEnded
        ? null
        : Math.min(999, Math.max(1, formData.finiteTotalSections));
      try {
        await conversationClient.updateProgress(conversationId, {
          total_sections: totalSections,
        });
      } catch (err) {
        console.error('Failed to update story progress (total_sections):', err);
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
      <div className={styles.modal}>
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
          {templates.length > 0 && (
            <div className={styles.formGroup}>
              <label htmlFor='story-template-select'>Story Template</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  id='story-template-select'
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value=''>Select a template</option>
                  {templates.map((tpl) => (
                    <option
                      key={tpl.id}
                      value={tpl.id}
                    >
                      {tpl.title}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  className={styles.cancelButton}
                  disabled={!selectedTemplate}
                  onClick={() => {
                    if (!selectedTemplate) return;
                    setLastPresetSnapshot({
                      background: formData.background,
                      outline: formData.outline,
                      characters: [...formData.characters],
                      characterPersonality: { ...formData.characterPersonality },
                      conversationTemperature: formData.conversationTemperature,
                      conversationMaxTokens: formData.conversationMaxTokens,
                    });
                    const additional = selectedTemplate.additional_settings || {};
                    updateFields({
                      background:
                        selectedTemplate.background || formData.background,
                      outline:
                        selectedTemplate.outline_hint || formData.outline,
                      characters:
                        selectedTemplate.characters?.length
                          ? selectedTemplate.characters
                          : formData.characters,
                      characterPersonality:
                        selectedTemplate.character_personality &&
                        Object.keys(selectedTemplate.character_personality).length
                          ? selectedTemplate.character_personality
                          : formData.characterPersonality,
                      conversationTemperature:
                        (additional.conversationTemperature as
                          | string
                          | number
                          | undefined)?.toString() ||
                        formData.conversationTemperature,
                      conversationMaxTokens:
                        (additional.conversationMaxTokens as
                          | string
                          | number
                          | undefined)?.toString() || formData.conversationMaxTokens,
                    });
                  }}
                >
                  Apply
                </button>
                <button
                  type='button'
                  className={styles.cancelButton}
                  disabled={!lastPresetSnapshot}
                  onClick={() => {
                    if (!lastPresetSnapshot) return;
                    updateFields({
                      background: lastPresetSnapshot.background,
                      outline: lastPresetSnapshot.outline,
                      characters: [...lastPresetSnapshot.characters],
                      characterPersonality: {
                        ...lastPresetSnapshot.characterPersonality,
                      },
                      conversationTemperature:
                        lastPresetSnapshot.conversationTemperature,
                      conversationMaxTokens: lastPresetSnapshot.conversationMaxTokens,
                    });
                    setLastPresetSnapshot(null);
                  }}
                >
                  Undo Preset
                </button>
              </div>
            </div>
          )}

          <StoryBasicInfo />

          <CharacterManagement />

          <OutlineGeneration />

          <StoryLengthMode />

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

