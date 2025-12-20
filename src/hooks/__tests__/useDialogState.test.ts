import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialogState } from '../useDialogState';

describe('useDialogState', () => {
  beforeEach(() => {
    // Reset before each test
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDialogState());

    expect(result.current.showDeleteLastMessageDialog).toBe(false);
    expect(result.current.showDeleteConversationDialog).toBe(false);
    expect(result.current.conversationToDelete).toBe(null);
  });

  it('should open delete conversation dialog', () => {
    const { result } = renderHook(() => useDialogState());

    act(() => {
      result.current.openDeleteConversationDialog('conv_001');
    });

    expect(result.current.showDeleteConversationDialog).toBe(true);
    expect(result.current.conversationToDelete).toBe('conv_001');
  });

  it('should close delete conversation dialog', () => {
    const { result } = renderHook(() => useDialogState());

    act(() => {
      result.current.openDeleteConversationDialog('conv_001');
    });

    expect(result.current.showDeleteConversationDialog).toBe(true);

    act(() => {
      result.current.closeDeleteConversationDialog();
    });

    expect(result.current.showDeleteConversationDialog).toBe(false);
    expect(result.current.conversationToDelete).toBe(null);
  });

  it('should update showDeleteLastMessageDialog', () => {
    const { result } = renderHook(() => useDialogState());

    act(() => {
      result.current.setShowDeleteLastMessageDialog(true);
    });

    expect(result.current.showDeleteLastMessageDialog).toBe(true);

    act(() => {
      result.current.setShowDeleteLastMessageDialog(false);
    });

    expect(result.current.showDeleteLastMessageDialog).toBe(false);
  });
});

