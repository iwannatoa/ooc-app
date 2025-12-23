import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Dialog Types
 * Each dialog type has its own payload structure
 */
export type DialogType =
  | 'conversationSettings'
  | 'summaryPrompt'
  | 'storySettingsView'
  | 'settingsPanel'
  | 'confirm';

/**
 * Base dialog structure
 */
export interface BaseDialog {
  id: string;
  type: DialogType;
  isOpen: boolean;
}

/**
 * Dialog payloads for each type
 */
export interface ConversationSettingsDialog extends BaseDialog {
  type: 'conversationSettings';
  payload: {
    conversationId: string;
    settings?: any;
    isNewConversation?: boolean;
  };
}

export interface SummaryPromptDialog extends BaseDialog {
  type: 'summaryPrompt';
  payload: {
    conversationId: string;
    messageCount: number;
  };
}

export interface StorySettingsViewDialog extends BaseDialog {
  type: 'storySettingsView';
  payload: {
    conversationId: string;
    settings: any;
  };
}

export interface SettingsPanelDialog extends BaseDialog {
  type: 'settingsPanel';
  payload?: never;
}

export interface ConfirmDialog extends BaseDialog {
  type: 'confirm';
  payload: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonStyle?: 'default' | 'danger';
    resolve?: (value: boolean) => void;
  };
}

/**
 * Union type for all dialogs
 */
export type Dialog =
  | ConversationSettingsDialog
  | SummaryPromptDialog
  | StorySettingsViewDialog
  | SettingsPanelDialog
  | ConfirmDialog;

/**
 * Dialog state
 */
interface DialogState {
  dialogs: Dialog[];
  // Track dialog stack for proper z-index management
  stack: string[];
}

const initialState: DialogState = {
  dialogs: [],
  stack: [],
};

const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    /**
     * Open a dialog
     */
    openDialog: (state, action: PayloadAction<Omit<Dialog, 'isOpen'>>) => {
      const dialog: Dialog = {
        ...action.payload,
        isOpen: true,
      } as Dialog;

      // Check if dialog of this type already exists
      const existingIndex = state.dialogs.findIndex(
        (d) => d.type === dialog.type && d.id === dialog.id
      );

      if (existingIndex >= 0) {
        // Update existing dialog
        state.dialogs[existingIndex] = dialog;
        // Move to top of stack if not already
        const stackIndex = state.stack.indexOf(dialog.id);
        if (stackIndex >= 0) {
          state.stack.splice(stackIndex, 1);
        }
        state.stack.push(dialog.id);
      } else {
        // Add new dialog
        state.dialogs.push(dialog);
        state.stack.push(dialog.id);
      }
    },

    /**
     * Close a specific dialog by ID
     */
    closeDialog: (state, action: PayloadAction<string>) => {
      const dialogId = action.payload;
      const dialogIndex = state.dialogs.findIndex((d) => d.id === dialogId);

      if (dialogIndex >= 0) {
        state.dialogs[dialogIndex].isOpen = false;
        // Remove from stack
        state.stack = state.stack.filter((id) => id !== dialogId);
      }
    },

    /**
     * Close all dialogs of a specific type
     */
    closeDialogByType: (state, action: PayloadAction<DialogType>) => {
      const dialogType = action.payload;
      state.dialogs.forEach((dialog) => {
        if (dialog.type === dialogType) {
          dialog.isOpen = false;
        }
      });
      state.stack = state.stack.filter(
        (id) => !state.dialogs.find((d) => d.id === id && d.type === dialogType)
      );
    },

    /**
     * Close the topmost dialog (last opened)
     */
    closeTopDialog: (state) => {
      if (state.stack.length > 0) {
        const topDialogId = state.stack[state.stack.length - 1];
        const dialogIndex = state.dialogs.findIndex(
          (d) => d.id === topDialogId
        );

        if (dialogIndex >= 0) {
          state.dialogs[dialogIndex].isOpen = false;
          state.stack.pop();
        }
      }
    },

    /**
     * Close all dialogs
     */
    closeAllDialogs: (state) => {
      state.dialogs.forEach((dialog) => {
        dialog.isOpen = false;
      });
      state.stack = [];
    },

    /**
     * Remove a dialog completely (after close animation)
     */
    removeDialog: (state, action: PayloadAction<string>) => {
      const dialogId = action.payload;
      state.dialogs = state.dialogs.filter((d) => d.id !== dialogId);
      state.stack = state.stack.filter((id) => id !== dialogId);
    },

    /**
     * Update dialog payload
     */
    updateDialog: (
      state,
      action: PayloadAction<{ id: string; payload: Partial<Dialog['payload']> }>
    ) => {
      const { id, payload } = action.payload;
      const dialogIndex = state.dialogs.findIndex((d) => d.id === id);

      if (dialogIndex >= 0) {
        const dialog = state.dialogs[dialogIndex];
        state.dialogs[dialogIndex] = {
          ...dialog,
          payload: {
            ...dialog.payload,
            ...payload,
          } as any,
        };
      }
    },
  },
});

export const {
  openDialog,
  closeDialog,
  closeDialogByType,
  closeTopDialog,
  closeAllDialogs,
  removeDialog,
  updateDialog,
} = dialogSlice.actions;

export default dialogSlice.reducer;
