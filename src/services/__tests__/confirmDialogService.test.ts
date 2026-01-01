import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  confirmDialog,
  getConfirmDialogService,
  ConfirmDialogOptions,
} from '../confirmDialogService';

describe('confirmDialogService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    const service = getConfirmDialogService();
    service.close(false);
  });

  describe('confirmDialog', () => {
    it('should accept a string message', async () => {
      const promise = confirmDialog('Are you sure?');
      
      const service = getConfirmDialogService();
      const state = service.getState();
      
      expect(state.isOpen).toBe(true);
      expect(state.message).toBe('Are you sure?');
      
      // Close the dialog
      service.close(true);
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should accept ConfirmDialogOptions', async () => {
      const options: ConfirmDialogOptions = {
        message: 'Delete this item?',
        title: 'Confirm Delete',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonStyle: 'danger',
      };

      const promise = confirmDialog(options);
      
      const service = getConfirmDialogService();
      const state = service.getState();
      
      expect(state.isOpen).toBe(true);
      expect(state.message).toBe('Delete this item?');
      expect(state.title).toBe('Confirm Delete');
      expect(state.confirmText).toBe('Delete');
      expect(state.cancelText).toBe('Cancel');
      expect(state.confirmButtonStyle).toBe('danger');
      
      // Close the dialog
      service.close(false);
      const result = await promise;
      expect(result).toBe(false);
    });

    it('should resolve with true when confirmed', async () => {
      const promise = confirmDialog('Test message');
      const service = getConfirmDialogService();
      
      service.close(true);
      const result = await promise;
      
      expect(result).toBe(true);
    });

    it('should resolve with false when cancelled', async () => {
      const promise = confirmDialog('Test message');
      const service = getConfirmDialogService();
      
      service.close(false);
      const result = await promise;
      
      expect(result).toBe(false);
    });
  });

  describe('getConfirmDialogService', () => {
    it('should return the same service instance', () => {
      const service1 = getConfirmDialogService();
      const service2 = getConfirmDialogService();
      
      expect(service1).toBe(service2);
    });

    it('should allow subscribing to state changes', () => {
      const service = getConfirmDialogService();
      const callback = vi.fn();
      
      const unsubscribe = service.subscribe(callback);
      
      // Trigger a state change
      confirmDialog('Test');
      
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          message: 'Test',
        })
      );
      
      // Unsubscribe
      unsubscribe();
      
      // Clear previous calls
      callback.mockClear();
      
      // Trigger another state change
      service.close(false);
      
      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const service = getConfirmDialogService();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.subscribe(callback1);
      service.subscribe(callback2);
      
      confirmDialog('Test');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle errors in listeners gracefully', () => {
      const service = getConfirmDialogService();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();
      
      service.subscribe(errorCallback);
      service.subscribe(normalCallback);
      
      // This should not throw, but should log the error
      confirmDialog('Test');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in confirm dialog listener:',
        expect.any(Error)
      );
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should get current state', () => {
      const service = getConfirmDialogService();
      
      // Initial state should be closed
      let state = service.getState();
      expect(state.isOpen).toBe(false);
      expect(state.message).toBe('');
      
      // Open a dialog
      confirmDialog('Test message');
      
      state = service.getState();
      expect(state.isOpen).toBe(true);
      expect(state.message).toBe('Test message');
    });

    it('should close dialog and reset state', () => {
      const service = getConfirmDialogService();
      
      confirmDialog('Test message');
      expect(service.getState().isOpen).toBe(true);
      
      service.close(true);
      
      const state = service.getState();
      expect(state.isOpen).toBe(false);
      expect(state.message).toBe('');
    });

    it('should handle close without resolve', () => {
      const service = getConfirmDialogService();
      
      // Close when no dialog is open (should not throw)
      expect(() => {
        service.close(false);
      }).not.toThrow();
    });
  });
});

