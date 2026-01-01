/**
 * Hook for managing conversation settings form state via Redux
 *
 * This hook provides a Redux-based interface for managing form state,
 * replacing the local useState approach.
 */

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  initializeForm,
  updateFormField,
  updateFormFields,
  addCharacter,
  removeCharacter,
  updateCharacter,
  updateCharacterPersonality,
  updateCharacterIsMain,
  confirmOutline,
  setGeneratingCharacter,
  setGeneratingOutline,
  resetForm,
  clearForm,
  type ConversationSettingsFormData,
} from '@/store/slices/conversationSettingsFormSlice';
import { ConversationSettings } from '@/types';

/**
 * Hook for managing conversation settings form via Redux
 */
export const useConversationSettingsForm = () => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.conversationSettingsForm);

  // Initialize form
  const initialize = useCallback(
    (
      conversationId: string,
      settings?: ConversationSettings,
      isNewConversation?: boolean
    ) => {
      dispatch(initializeForm({ conversationId, settings, isNewConversation }));
    },
    [dispatch]
  );

  // Update a single field
  const updateField = useCallback(
    <K extends keyof ConversationSettingsFormData>(
      field: K,
      value: ConversationSettingsFormData[K]
    ) => {
      dispatch(updateFormField({ field, value }));
    },
    [dispatch]
  );

  // Update multiple fields
  const updateFields = useCallback(
    (updates: Partial<ConversationSettingsFormData>) => {
      dispatch(updateFormFields(updates));
    },
    [dispatch]
  );

  // Character management
  const handleAddCharacter = useCallback(() => {
    dispatch(addCharacter());
  }, [dispatch]);

  const handleRemoveCharacter = useCallback(
    (index: number) => {
      dispatch(removeCharacter(index));
    },
    [dispatch]
  );

  const handleCharacterChange = useCallback(
    (index: number, value: string) => {
      dispatch(updateCharacter({ index, value }));
    },
    [dispatch]
  );

  const handlePersonalityChange = useCallback(
    (characterName: string, personality: string) => {
      dispatch(updateCharacterPersonality({ characterName, personality }));
    },
    [dispatch]
  );

  const handleIsMainChange = useCallback(
    (characterName: string, isMain: boolean) => {
      dispatch(updateCharacterIsMain({ characterName, isMain }));
    },
    [dispatch]
  );

  // Outline management
  const handleConfirmOutline = useCallback(() => {
    dispatch(confirmOutline());
  }, [dispatch]);

  // Generation state management
  const setGeneratingCharacterState = useCallback(
    (isGenerating: boolean) => {
      dispatch(setGeneratingCharacter(isGenerating));
    },
    [dispatch]
  );

  const setGeneratingOutlineState = useCallback(
    (isGenerating: boolean) => {
      dispatch(setGeneratingOutline(isGenerating));
    },
    [dispatch]
  );

  // Reset and clear
  const handleResetForm = useCallback(() => {
    dispatch(resetForm());
  }, [dispatch]);

  const handleClearForm = useCallback(() => {
    dispatch(clearForm());
  }, [dispatch]);

  // Computed values
  const validCharacters = useMemo(
    () => formState.formData.characters.filter((c) => c.trim() !== ''),
    [formState.formData.characters]
  );

  const validPersonality = useMemo(() => {
    const result: Record<string, string> = {};
    validCharacters.forEach((char) => {
      if (formState.formData.characterPersonality[char]) {
        result[char] = formState.formData.characterPersonality[char];
      }
    });
    return result;
  }, [validCharacters, formState.formData.characterPersonality]);

  const validIsMain = useMemo(() => {
    const result: Record<string, boolean> = {};
    validCharacters.forEach((char) => {
      if (formState.formData.characterIsMain[char]) {
        result[char] = formState.formData.characterIsMain[char];
      }
    });
    return result;
  }, [validCharacters, formState.formData.characterIsMain]);

  return {
    // State
    formData: formState.formData,
    conversationId: formState.conversationId,
    isNewConversation: formState.isNewConversation,
    isGeneratingCharacter: formState.isGeneratingCharacter,
    isGeneratingOutline: formState.isGeneratingOutline,

    // Actions
    initialize,
    updateField,
    updateFields,
    addCharacter: handleAddCharacter,
    removeCharacter: handleRemoveCharacter,
    updateCharacter: handleCharacterChange,
    updateCharacterPersonality: handlePersonalityChange,
    updateCharacterIsMain: handleIsMainChange,
    confirmOutline: handleConfirmOutline,
    setGeneratingCharacter: setGeneratingCharacterState,
    setGeneratingOutline: setGeneratingOutlineState,
    resetForm: handleResetForm,
    clearForm: handleClearForm,

    // Computed
    validCharacters,
    validPersonality,
    validIsMain,
  };
};
