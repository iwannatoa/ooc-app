import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { useSettingsState } from './useSettingsState';
import {
  Dialog,
  DialogType,
  openDialog,
  closeDialog,
  closeDialogByType,
  closeTopDialog,
  closeAllDialogs,
  removeDialog,
  updateDialog,
} from '@/store/slices/dialogSlice';

/**
 * Generate unique dialog ID
 */
let dialogIdCounter = 0;
const generateDialogId = (type: DialogType): string => {
  return `${type}-${++dialogIdCounter}-${Date.now()}`;
};

/**
 * Hook for managing dialogs
 *
 * Provides a clean API for opening, closing, and managing dialogs.
 * Supports dialog stacking and type-safe dialog payloads.
 *
 * Usage:
 *   const dialog = useDialog();
 *
 *   // Open a dialog
 *   const dialogId = dialog.open('conversationSettings', {
 *     conversationId: '123',
 *     settings: {...},
 *   });
 *
 *   // Close a dialog
 *   dialog.close(dialogId);
 *
 *   // Close all dialogs of a type
 *   dialog.closeByType('conversationSettings');
 */
export const useDialog = () => {
  const dispatch = useAppDispatch();
  const dialogs = useAppSelector((state) => state.dialog.dialogs);
  const stack = useAppSelector((state) => state.dialog.stack);

  /**
   * Open a dialog
   */
  const open = useCallback(
    <T extends DialogType>(
      type: T,
      payload: Extract<Dialog, { type: T }>['payload'],
      id?: string
    ): string => {
      const dialogId = id || generateDialogId(type);
      dispatch(
        openDialog({
          id: dialogId,
          type,
          payload: payload as any,
        } as Omit<Dialog, 'isOpen'>)
      );
      return dialogId;
    },
    [dispatch]
  );

  /**
   * Close a dialog by ID
   */
  const close = useCallback(
    (id: string) => {
      dispatch(closeDialog(id));
    },
    [dispatch]
  );

  /**
   * Close all dialogs of a specific type
   */
  const closeByType = useCallback(
    (type: DialogType) => {
      dispatch(closeDialogByType(type));
    },
    [dispatch]
  );

  /**
   * Close the topmost dialog
   */
  const closeTop = useCallback(() => {
    dispatch(closeTopDialog());
  }, [dispatch]);

  /**
   * Close all dialogs
   */
  const closeAll = useCallback(() => {
    dispatch(closeAllDialogs());
  }, [dispatch]);

  /**
   * Remove a dialog completely (after close animation)
   */
  const remove = useCallback(
    (id: string) => {
      dispatch(removeDialog(id));
    },
    [dispatch]
  );

  /**
   * Update dialog payload
   */
  const update = useCallback(
    <T extends DialogType>(
      id: string,
      payload: Partial<Extract<Dialog, { type: T }>['payload']>
    ) => {
      dispatch(updateDialog({ id, payload }));
    },
    [dispatch]
  );

  /**
   * Get a dialog by ID
   */
  const getDialog = useCallback(
    (id: string): Dialog | undefined => {
      return dialogs.find((d) => d.id === id);
    },
    [dialogs]
  );

  /**
   * Get all open dialogs
   */
  const getOpenDialogs = useCallback((): Dialog[] => {
    return dialogs.filter((d) => d.isOpen);
  }, [dialogs]);

  /**
   * Get dialogs by type
   */
  const getDialogsByType = useCallback(
    (type: DialogType): Dialog[] => {
      return dialogs.filter((d) => d.type === type && d.isOpen);
    },
    [dialogs]
  );

  /**
   * Check if a dialog is open
   */
  const isOpen = useCallback(
    (id: string): boolean => {
      const dialog = dialogs.find((d) => d.id === id);
      return dialog?.isOpen ?? false;
    },
    [dialogs]
  );

  /**
   * Get the topmost dialog
   */
  const getTopDialog = useCallback((): Dialog | undefined => {
    if (stack.length === 0) return undefined;
    const topId = stack[stack.length - 1];
    return dialogs.find((d) => d.id === topId);
  }, [dialogs, stack]);

  return {
    // Actions
    open,
    close,
    closeByType,
    closeTop,
    closeAll,
    remove,
    update,

    // Getters
    getDialog,
    getOpenDialogs,
    getDialogsByType,
    isOpen,
    getTopDialog,

    // State
    dialogs,
    stack,
  };
};

/**
 * Convenience hooks for specific dialog types
 */

export const useConversationSettingsDialog = () => {
  const dialog = useDialog();

  const open = useCallback(
    (
      conversationId: string,
      options?: {
        settings?: any;
        isNewConversation?: boolean;
        id?: string;
      }
    ) => {
      return dialog.open('conversationSettings', {
        conversationId,
        settings: options?.settings,
        isNewConversation: options?.isNewConversation,
      }, options?.id);
    },
    [dialog]
  );

  const close = useCallback(() => {
    dialog.closeByType('conversationSettings');
  }, [dialog]);

  const isOpen = useCallback(() => {
    return dialog.getDialogsByType('conversationSettings').length > 0;
  }, [dialog]);

  return { open, close, isOpen };
};

export const useSummaryPromptDialog = () => {
  const dialog = useDialog();

  const open = useCallback(
    (
      conversationId: string,
      messageCount: number,
      id?: string
    ) => {
      return dialog.open('summaryPrompt', {
        conversationId,
        messageCount,
      }, id);
    },
    [dialog]
  );

  const close = useCallback(() => {
    dialog.closeByType('summaryPrompt');
  }, [dialog]);

  const isOpen = useCallback(() => {
    return dialog.getDialogsByType('summaryPrompt').length > 0;
  }, [dialog]);

  return { open, close, isOpen };
};

export const useStorySettingsViewDialog = () => {
  const dialog = useDialog();

  const open = useCallback(
    (
      conversationId: string,
      settings: any,
      id?: string
    ) => {
      return dialog.open('storySettingsView', {
        conversationId,
        settings,
      }, id);
    },
    [dialog]
  );

  const close = useCallback(() => {
    dialog.closeByType('storySettingsView');
  }, [dialog]);

  const isOpen = useCallback(() => {
    return dialog.getDialogsByType('storySettingsView').length > 0;
  }, [dialog]);

  return { open, close, isOpen };
};

export const useSettingsPanelDialog = () => {
  const dialog = useDialog();
  const { isSettingsOpen, setSettingsOpen } = useSettingsState();

  const open = useCallback(() => {
    dialog.open('settingsPanel', undefined);
    // Also update settings state for backward compatibility
    setSettingsOpen(true);
  }, [dialog, setSettingsOpen]);

  const close = useCallback(() => {
    dialog.closeByType('settingsPanel');
    setSettingsOpen(false);
  }, [dialog, setSettingsOpen]);

  return { open, close, isOpen: isSettingsOpen };
};

