import { describe, it, expect } from 'vitest';
import conversationSettingsFormReducer, {
  initializeForm,
  updateFormField,
  addCharacter,
  removeCharacter,
  confirmOutline,
  clearForm,
} from '../conversationSettingsFormSlice';

describe('conversationSettingsFormSlice', () => {
  it('should initialize form', () => {
    const state = conversationSettingsFormReducer(
      undefined,
      initializeForm({
        conversationId: 'conv-1',
        settings: {
          conversation_id: 'conv-1',
          title: 'Test',
        },
      })
    );
    expect(state.conversationId).toBe('conv-1');
    expect(state.formData.title).toBe('Test');
  });

  it('should update form field', () => {
    const state = conversationSettingsFormReducer(
      undefined,
      updateFormField({ field: 'title', value: 'New Title' })
    );
    expect(state.formData.title).toBe('New Title');
  });

  it('should add character', () => {
    const state = conversationSettingsFormReducer(
      undefined,
      addCharacter()
    );
    expect(state.formData.characters.length).toBeGreaterThan(0);
  });

  it('should remove character', () => {
    // Initial state already has one empty string
    const initialState = conversationSettingsFormReducer(undefined, { type: 'unknown' } as any);
    const stateWithChar = conversationSettingsFormReducer(
      initialState,
      addCharacter()
    );
    // Now should have 2 characters, remove the first one
    const state = conversationSettingsFormReducer(
      stateWithChar,
      removeCharacter(0)
    );
    // Should have 1 left (initial empty string)
    expect(state.formData.characters.length).toBe(1);
  });

  it('should confirm outline', () => {
    const stateWithGenerated = conversationSettingsFormReducer(
      undefined,
      updateFormField({ field: 'generatedOutline', value: 'Generated outline' })
    );
    const state = conversationSettingsFormReducer(
      stateWithGenerated,
      confirmOutline()
    );
    expect(state.formData.outline).toBe('Generated outline');
    expect(state.formData.outlineConfirmed).toBe(true);
  });

  it('should clear form', () => {
    const stateWithData = conversationSettingsFormReducer(
      undefined,
      initializeForm({
        conversationId: 'conv-1',
        settings: { conversation_id: 'conv-1', title: 'Test' },
      })
    );
    const state = conversationSettingsFormReducer(stateWithData, clearForm());
    expect(state.conversationId).toBeNull();
    expect(state.formData.title).toBe('');
  });
});

