import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConversationSettings } from '@/types';

/**
 * Conversation Settings Form Data
 */
export interface ConversationSettingsFormData {
  // Basic info
  title: string;
  background: string;
  supplement: string;

  // Characters
  characters: string[];
  characterPersonality: Record<string, string>;
  characterIsMain: Record<string, boolean>;
  characterGenerationHints: string;

  // Outline
  outline: string;
  generatedOutline: string | null;
  outlineConfirmed: boolean;

  // Auto-generation options
  allowAutoGenerateCharacters: boolean;
  allowAutoGenerateMainCharacters: boolean;
}

/**
 * Conversation Settings Form State
 */
interface ConversationSettingsFormState {
  // Current conversation being edited
  conversationId: string | null;
  isNewConversation: boolean;

  // Form data
  formData: ConversationSettingsFormData;

  // Generation states
  isGeneratingCharacter: boolean;
  isGeneratingOutline: boolean;

  // Initial settings (for reset)
  initialSettings?: ConversationSettings;
}

/**
 * Create initial form data from settings
 */
const createInitialFormData = (
  settings?: ConversationSettings
): ConversationSettingsFormData => ({
  title: settings?.title || '',
  background: settings?.background || '',
  supplement: settings?.additional_settings?.supplement || '',
  characters: settings?.characters || [''],
  characterPersonality: settings?.character_personality || {},
  characterIsMain: settings?.character_is_main || {},
  characterGenerationHints: '',
  outline: settings?.outline || '',
  generatedOutline: null,
  outlineConfirmed: false,
  allowAutoGenerateCharacters:
    settings?.allow_auto_generate_characters !== false,
  allowAutoGenerateMainCharacters:
    settings?.additional_settings?.allow_auto_generate_main_characters !== false,
});

const initialState: ConversationSettingsFormState = {
  conversationId: null,
  isNewConversation: false,
  formData: createInitialFormData(),
  isGeneratingCharacter: false,
  isGeneratingOutline: false,
  initialSettings: undefined,
};

const conversationSettingsFormSlice = createSlice({
  name: 'conversationSettingsForm',
  initialState,
  reducers: {
    /**
     * Initialize form with conversation data
     */
    initializeForm: (
      state,
      action: PayloadAction<{
        conversationId: string;
        settings?: ConversationSettings;
        isNewConversation?: boolean;
      }>
    ) => {
      const { conversationId, settings, isNewConversation = false } =
        action.payload;
      state.conversationId = conversationId;
      state.isNewConversation = isNewConversation;
      state.formData = createInitialFormData(settings);
      state.initialSettings = settings;
      state.isGeneratingCharacter = false;
      state.isGeneratingOutline = false;
    },

    /**
     * Update a single form field
     */
    updateFormField: <K extends keyof ConversationSettingsFormData>(
      state: ConversationSettingsFormState,
      action: PayloadAction<{
        field: K;
        value: ConversationSettingsFormData[K];
      }>
    ) => {
      const { field, value } = action.payload;
      state.formData[field] = value;
    },

    /**
     * Update multiple form fields
     */
    updateFormFields: (
      state,
      action: PayloadAction<Partial<ConversationSettingsFormData>>
    ) => {
      state.formData = {
        ...state.formData,
        ...action.payload,
      };
    },

    /**
     * Add a new character
     */
    addCharacter: (state) => {
      state.formData.characters = [...state.formData.characters, ''];
    },

    /**
     * Remove a character by index
     */
    removeCharacter: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      const newCharacters = [...state.formData.characters];
      const removedChar = newCharacters[index];
      newCharacters.splice(index, 1);

      if (removedChar) {
        const newPersonality = { ...state.formData.characterPersonality };
        const newIsMain = { ...state.formData.characterIsMain };
        delete newPersonality[removedChar];
        delete newIsMain[removedChar];
        state.formData.characterPersonality = newPersonality;
        state.formData.characterIsMain = newIsMain;
      }

      state.formData.characters = newCharacters;
    },

    /**
     * Update character name
     */
    updateCharacter: (
      state,
      action: PayloadAction<{ index: number; value: string }>
    ) => {
      const { index, value } = action.payload;
      const newCharacters = [...state.formData.characters];
      const oldChar = newCharacters[index];
      newCharacters[index] = value;

      if (oldChar && oldChar !== value) {
        const newPersonality = { ...state.formData.characterPersonality };
        const newIsMain = { ...state.formData.characterIsMain };
        if (newPersonality[oldChar]) {
          newPersonality[value] = newPersonality[oldChar];
          delete newPersonality[oldChar];
        }
        if (newIsMain[oldChar] !== undefined) {
          newIsMain[value] = newIsMain[oldChar];
          delete newIsMain[oldChar];
        }
        state.formData.characterPersonality = newPersonality;
        state.formData.characterIsMain = newIsMain;
      }

      state.formData.characters = newCharacters;
    },

    /**
     * Update character personality
     */
    updateCharacterPersonality: (
      state,
      action: PayloadAction<{ characterName: string; personality: string }>
    ) => {
      const { characterName, personality } = action.payload;
      state.formData.characterPersonality = {
        ...state.formData.characterPersonality,
        [characterName]: personality,
      };
    },

    /**
     * Update character isMain flag
     */
    updateCharacterIsMain: (
      state,
      action: PayloadAction<{ characterName: string; isMain: boolean }>
    ) => {
      const { characterName, isMain } = action.payload;
      state.formData.characterIsMain = {
        ...state.formData.characterIsMain,
        [characterName]: isMain,
      };
    },

    /**
     * Confirm generated outline
     */
    confirmOutline: (state) => {
      if (state.formData.generatedOutline) {
        state.formData.outline = state.formData.generatedOutline;
        state.formData.outlineConfirmed = true;
        state.formData.generatedOutline = null;
      }
    },

    /**
     * Set generating character state
     */
    setGeneratingCharacter: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingCharacter = action.payload;
    },

    /**
     * Set generating outline state
     */
    setGeneratingOutline: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingOutline = action.payload;
    },

    /**
     * Reset form to initial state
     */
    resetForm: (state) => {
      state.formData = createInitialFormData(state.initialSettings);
      state.isGeneratingCharacter = false;
      state.isGeneratingOutline = false;
    },

    /**
     * Clear form state (when dialog closes)
     */
    clearForm: () => initialState,
  },
});

export const {
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
} = conversationSettingsFormSlice.actions;

export default conversationSettingsFormSlice.reducer;

