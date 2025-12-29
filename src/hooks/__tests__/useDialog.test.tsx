import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useDialog,
  useConversationSettingsDialog,
  useSummaryPromptDialog,
  useStorySettingsViewDialog,
  useSettingsPanelDialog,
} from '../useDialog';
import { createTestStore } from '@/test/utils';
import * as useSettingsState from '../useSettingsState';

// Mock dependencies
vi.mock('../useSettingsState');

describe('useDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = (store: ReturnType<typeof createTestStore>) => {
    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  describe('useDialog', () => {
    it('should return all dialog methods and state', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.open).toBeDefined();
      expect(result.current.close).toBeDefined();
      expect(result.current.closeByType).toBeDefined();
      expect(result.current.closeTop).toBeDefined();
      expect(result.current.closeAll).toBeDefined();
      expect(result.current.remove).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.getDialog).toBeDefined();
      expect(result.current.getOpenDialogs).toBeDefined();
      expect(result.current.getDialogsByType).toBeDefined();
      expect(result.current.isOpen).toBeDefined();
      expect(result.current.getTopDialog).toBeDefined();
      expect(result.current.dialogs).toBeDefined();
      expect(result.current.stack).toBeDefined();
    });

    it('should open a dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined);
      });

      expect(result.current.dialogs).toHaveLength(1);
      expect(result.current.dialogs[0].type).toBe('settingsPanel');
      expect(result.current.dialogs[0].isOpen).toBe(true);
    });

    it('should open a dialog with custom ID', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined, 'custom-id');
      });

      expect(result.current.dialogs[0].id).toBe('custom-id');
    });

    it('should open a conversation settings dialog with payload', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conversationSettings', {
          conversationId: 'conv_001',
          settings: { title: 'Test' },
          isNewConversation: false,
        });
      });

      expect(result.current.dialogs[0].type).toBe('conversationSettings');
      const dialog = result.current.dialogs[0] as any;
      expect(dialog.payload.conversationId).toBe('conv_001');
    });

    it('should close a dialog by ID', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('settingsPanel', undefined);
      });

      act(() => {
        result.current.close(dialogId!);
      });

      expect(result.current.dialogs[0].isOpen).toBe(false);
      expect(result.current.stack).not.toContain(dialogId!);
    });

    it('should close all dialogs of a type', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined);
        result.current.open('confirm', { message: 'Test' });
        result.current.open('settingsPanel', undefined);
      });

      act(() => {
        result.current.closeByType('settingsPanel');
      });

      const settingsDialogs = result.current.dialogs.filter(
        (d) => d.type === 'settingsPanel'
      );
      expect(settingsDialogs.every((d) => !d.isOpen)).toBe(true);
    });

    it('should close top dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId1: string;
      let dialogId2: string;
      act(() => {
        dialogId1 = result.current.open('settingsPanel', undefined);
        dialogId2 = result.current.open('confirm', { message: 'Test' });
      });

      expect(result.current.stack[result.current.stack.length - 1]).toBe(
        dialogId2
      );

      act(() => {
        result.current.closeTop();
      });

      const topDialog = result.current.dialogs.find((d) => d.id === dialogId2);
      expect(topDialog?.isOpen).toBe(false);
    });

    it('should close all dialogs', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined);
        result.current.open('confirm', { message: 'Test' });
      });

      act(() => {
        result.current.closeAll();
      });

      expect(result.current.dialogs.every((d) => !d.isOpen)).toBe(true);
      expect(result.current.stack).toHaveLength(0);
    });

    it('should remove a dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('settingsPanel', undefined);
      });

      act(() => {
        result.current.remove(dialogId!);
      });

      expect(result.current.dialogs).toHaveLength(0);
      expect(result.current.stack).not.toContain(dialogId!);
    });

    it('should update dialog payload', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('conversationSettings', {
          conversationId: 'conv_001',
          settings: { title: 'Old Title' },
        });
      });

      act(() => {
        result.current.update(dialogId!, {
          settings: { title: 'New Title' },
        });
      });

      const dialog = result.current.dialogs.find(
        (d) => d.id === dialogId
      ) as any;
      expect(dialog.payload.settings.title).toBe('New Title');
    });

    it('should get dialog by ID', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('settingsPanel', undefined);
      });

      const dialog = result.current.getDialog(dialogId!);
      expect(dialog).toBeDefined();
      expect(dialog?.id).toBe(dialogId);
    });

    it('should get open dialogs', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined);
        result.current.open('confirm', { message: 'Test' });
      });

      act(() => {
        result.current.close(result.current.dialogs[0].id);
      });

      const openDialogs = result.current.getOpenDialogs();
      expect(openDialogs).toHaveLength(1);
      expect(openDialogs[0].isOpen).toBe(true);
    });

    it('should get dialogs by type', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('settingsPanel', undefined);
        result.current.open('settingsPanel', undefined);
        result.current.open('confirm', { message: 'Test' });
      });

      const settingsDialogs = result.current.getDialogsByType('settingsPanel');
      expect(settingsDialogs).toHaveLength(2);
      expect(settingsDialogs.every((d) => d.type === 'settingsPanel')).toBe(
        true
      );
    });

    it('should check if dialog is open', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('settingsPanel', undefined);
      });

      expect(result.current.isOpen(dialogId!)).toBe(true);

      act(() => {
        result.current.close(dialogId!);
      });

      expect(result.current.isOpen(dialogId!)).toBe(false);
    });

    it('should get top dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId1: string;
      let dialogId2: string;
      act(() => {
        dialogId1 = result.current.open('settingsPanel', undefined);
        dialogId2 = result.current.open('confirm', { message: 'Test' });
      });

      const topDialog = result.current.getTopDialog();
      expect(topDialog?.id).toBe(dialogId2);
    });

    it('should return undefined for top dialog when stack is empty', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.getTopDialog()).toBeUndefined();
    });
  });

  describe('useConversationSettingsDialog', () => {
    it('should open conversation settings dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useConversationSettingsDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001', {
          settings: { title: 'Test' },
          isNewConversation: true,
        });
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should close conversation settings dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useConversationSettingsDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001');
      });

      expect(result.current.isOpen()).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen()).toBe(false);
    });

    it('should check if conversation settings dialog is open', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useConversationSettingsDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.isOpen()).toBe(false);

      act(() => {
        result.current.open('conv_001');
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should open with custom ID', () => {
      const store = createTestStore();
      const { result: dialogResult } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });
      const { result } = renderHook(() => useConversationSettingsDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('conv_001', { id: 'custom-id' });
      });

      expect(dialogId).toBe('custom-id');
      const dialogById = dialogResult.current.getDialog('custom-id');
      expect(dialogById).toBeDefined();
      expect(dialogById?.id).toBe('custom-id');
    });
  });

  describe('useSummaryPromptDialog', () => {
    it('should open summary prompt dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useSummaryPromptDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001', 50);
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should close summary prompt dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useSummaryPromptDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001', 50);
      });

      expect(result.current.isOpen()).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen()).toBe(false);
    });

    it('should check if summary prompt dialog is open', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useSummaryPromptDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.isOpen()).toBe(false);

      act(() => {
        result.current.open('conv_001', 50);
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should open with custom ID', () => {
      const store = createTestStore();
      const { result: dialogResult } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });
      const { result } = renderHook(() => useSummaryPromptDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open('conv_001', 50, 'custom-id');
      });

      expect(dialogId).toBe('custom-id');
      const dialogById = dialogResult.current.getDialog('custom-id');
      expect(dialogById).toBeDefined();
      expect(dialogById?.id).toBe('custom-id');
    });
  });

  describe('useStorySettingsViewDialog', () => {
    it('should open story settings view dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useStorySettingsViewDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001', { title: 'Story Title' });
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should close story settings view dialog', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useStorySettingsViewDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open('conv_001', { title: 'Story Title' });
      });

      expect(result.current.isOpen()).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen()).toBe(false);
    });

    it('should check if story settings view dialog is open', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useStorySettingsViewDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.isOpen()).toBe(false);

      act(() => {
        result.current.open('conv_001', { title: 'Story Title' });
      });

      expect(result.current.isOpen()).toBe(true);
    });

    it('should open with custom ID', () => {
      const store = createTestStore();
      const { result: dialogResult } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });
      const { result } = renderHook(() => useStorySettingsViewDialog(), {
        wrapper: createWrapper(store),
      });

      let dialogId: string;
      act(() => {
        dialogId = result.current.open(
          'conv_001',
          { title: 'Story Title' },
          'custom-id'
        );
      });

      expect(dialogId).toBe('custom-id');
      const dialogById = dialogResult.current.getDialog('custom-id');
      expect(dialogById).toBeDefined();
      expect(dialogById?.id).toBe('custom-id');
    });
  });

  describe('useSettingsPanelDialog', () => {
    beforeEach(() => {
      (useSettingsState.useSettingsState as any).mockReturnValue({
        isSettingsOpen: false,
        setSettingsOpen: vi.fn(),
      });
    });

    it('should open settings panel dialog', () => {
      const mockSetSettingsOpen = vi.fn();
      (useSettingsState.useSettingsState as any).mockReturnValue({
        isSettingsOpen: false,
        setSettingsOpen: mockSetSettingsOpen,
      });

      const store = createTestStore();
      const { result } = renderHook(() => useSettingsPanelDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open();
      });

      expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);
      const { result: dialogResult } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });
      const dialogs = dialogResult.current.getDialogsByType('settingsPanel');
      expect(dialogs.length).toBeGreaterThan(0);
    });

    it('should close settings panel dialog', () => {
      const mockSetSettingsOpen = vi.fn();
      (useSettingsState.useSettingsState as any).mockReturnValue({
        isSettingsOpen: true,
        setSettingsOpen: mockSetSettingsOpen,
      });

      const store = createTestStore();
      const { result } = renderHook(() => useSettingsPanelDialog(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.open();
      });

      act(() => {
        result.current.close();
      });

      expect(mockSetSettingsOpen).toHaveBeenCalledWith(false);
      const { result: dialogResult } = renderHook(() => useDialog(), {
        wrapper: createWrapper(store),
      });
      const dialogs = dialogResult.current.getDialogsByType('settingsPanel');
      expect(dialogs.every((d) => !d.isOpen)).toBe(true);
    });

    it('should return isOpen from settings state', () => {
      (useSettingsState.useSettingsState as any).mockReturnValue({
        isSettingsOpen: true,
        setSettingsOpen: vi.fn(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useSettingsPanelDialog(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.isOpen).toBe(true);
    });
  });
});
