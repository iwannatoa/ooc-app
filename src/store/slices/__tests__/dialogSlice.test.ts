import { describe, it, expect } from 'vitest';
import dialogReducer, {
  openDialog,
  closeDialog,
  closeAllDialogs,
  removeDialog,
  closeDialogByType,
  closeTopDialog,
  updateDialog,
} from '../dialogSlice';

describe('dialogSlice', () => {
  it('should open dialog', () => {
    const state = dialogReducer(
      undefined,
      openDialog({
        id: 'test-1',
        type: 'settingsPanel',
      })
    );
    expect(state.dialogs).toHaveLength(1);
    expect(state.dialogs[0].isOpen).toBe(true);
    expect(state.stack).toContain('test-1');
  });

  it('should close dialog', () => {
    const stateWithDialog = dialogReducer(
      undefined,
      openDialog({
        id: 'test-1',
        type: 'settingsPanel',
      })
    );
    const state = dialogReducer(stateWithDialog, closeDialog('test-1'));
    expect(state.dialogs[0].isOpen).toBe(false);
    expect(state.stack).not.toContain('test-1');
  });

  it('should close all dialogs', () => {
    const stateWithDialogs = dialogReducer(
      undefined,
      openDialog({
        id: 'test-1',
        type: 'settingsPanel',
      })
    );
    const state = dialogReducer(
      dialogReducer(
        stateWithDialogs,
        openDialog({
          id: 'test-2',
          type: 'confirm',
          payload: { message: 'Test' },
        })
      ),
      closeAllDialogs()
    );
    expect(state.dialogs.every((d) => !d.isOpen)).toBe(true);
    expect(state.stack).toHaveLength(0);
  });

  it('should remove dialog', () => {
    const stateWithDialog = dialogReducer(
      undefined,
      openDialog({
        id: 'test-1',
        type: 'settingsPanel',
      })
    );
    const state = dialogReducer(stateWithDialog, removeDialog('test-1'));
    expect(state.dialogs).toHaveLength(0);
    expect(state.stack).not.toContain('test-1');
  });

  it('should close dialogs by type', () => {
    const stateWithDialogs = dialogReducer(
      dialogReducer(
        undefined,
        openDialog({
          id: 'settings-1',
          type: 'settingsPanel',
        })
      ),
      openDialog({
        id: 'confirm-1',
        type: 'confirm',
        payload: { message: 'Confirm 1' },
      })
    );

    const state = dialogReducer(stateWithDialogs, closeDialogByType('confirm'));

    expect(
      state.dialogs.find((d) => d.id === 'confirm-1')?.isOpen
    ).toBe(false);
    // Other dialog should remain open
    expect(
      state.dialogs.find((d) => d.id === 'settings-1')?.isOpen
    ).toBe(true);
    // Stack should not contain closed confirm dialog
    expect(
      state.stack.includes('confirm-1')
    ).toBe(false);
  });

  it('should close top dialog', () => {
    const stateWithDialogs = dialogReducer(
      dialogReducer(
        undefined,
        openDialog({
          id: 'dialog-1',
          type: 'settingsPanel',
        })
      ),
      openDialog({
        id: 'dialog-2',
        type: 'confirm',
        payload: { message: 'Top dialog' },
      })
    );

    const state = dialogReducer(stateWithDialogs, closeTopDialog());

    // Top dialog should be closed and removed from stack
    expect(
      state.dialogs.find((d) => d.id === 'dialog-2')?.isOpen
    ).toBe(false);
    expect(state.stack).not.toContain('dialog-2');
    // Other dialog should remain open and still be in stack
    expect(
      state.dialogs.find((d) => d.id === 'dialog-1')?.isOpen
    ).toBe(true);
    expect(state.stack).toContain('dialog-1');
  });

  it('should update existing dialog payload', () => {
    const initialState = dialogReducer(
      undefined,
      openDialog({
        id: 'confirm-1',
        type: 'confirm',
        payload: {
          message: 'Original',
          confirmText: 'OK',
        },
      })
    );

    const state = dialogReducer(
      initialState,
      updateDialog({
        id: 'confirm-1',
        payload: {
          message: 'Updated message',
          cancelText: 'Cancel',
        },
      })
    );

    const dialog = state.dialogs.find((d) => d.id === 'confirm-1');
    expect(dialog).toBeDefined();
    expect(dialog?.payload).toEqual({
      message: 'Updated message',
      confirmText: 'OK',
      cancelText: 'Cancel',
    });
  });

  it('should update existing dialog and move it to top of stack when opening again', () => {
    const stateWithDialogs = dialogReducer(
      dialogReducer(
        undefined,
        openDialog({
          id: 'dialog-1',
          type: 'settingsPanel',
        })
      ),
      openDialog({
        id: 'dialog-2',
        type: 'settingsPanel',
      })
    );

    // Open dialog-1 again; it should move to top of stack
    const state = dialogReducer(
      stateWithDialogs,
      openDialog({
        id: 'dialog-1',
        type: 'settingsPanel',
      })
    );

    expect(state.stack[state.stack.length - 1]).toBe('dialog-1');
  });

  it('should do nothing when closing non-existing dialog', () => {
    const initialState = dialogReducer(
      undefined,
      openDialog({
        id: 'existing',
        type: 'settingsPanel',
      })
    );

    const state = dialogReducer(initialState, closeDialog('non-existing'));

    expect(state).toEqual(initialState);
  });
});

