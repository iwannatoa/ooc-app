/**
 * Confirm Dialog Service
 *
 * A centralized service for managing confirmation dialogs.
 * This service provides a programmatic API for showing confirmation dialogs
 * without requiring component-level state management.
 *
 * Benefits:
 * - No need to manage dialog state in components
 * - Consistent dialog behavior across the app
 * - Easy to use from anywhere (hooks, services, components)
 * - Supports promise-based API for async operations
 *
 * Trade-offs:
 * - Requires a global dialog container component
 * - Less React-idiomatic (uses imperative API)
 * - Harder to customize per-instance (but can be extended)
 *
 * Usage:
 *   import { confirmDialog } from '@/services/confirmDialogService';
 *
 *   // Simple usage
 *   const confirmed = await confirmDialog('Are you sure?');
 *   if (confirmed) {
 *     // User confirmed
 *   }
 *
 *   // With options
 *   const confirmed = await confirmDialog({
 *     message: 'Delete this item?',
 *     title: 'Confirm Delete',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     confirmButtonStyle: 'danger'
 *   });
 */

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: 'default' | 'danger';
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

type StateChangeCallback = (state: ConfirmDialogState) => void;

class ConfirmDialogService {
  private dialogState: ConfirmDialogState = {
    isOpen: false,
    message: '',
  };

  private listeners: Set<StateChangeCallback> = new Set();

  /**
   * Show a confirmation dialog
   * @param options Dialog options or simple message string
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  async confirm(options: string | ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const dialogOptions: ConfirmDialogOptions =
        typeof options === 'string' ? { message: options } : options;

      this.dialogState = {
        ...dialogOptions,
        isOpen: true,
        resolve,
      };

      this.notifyListeners();
    });
  }

  /**
   * Close the current dialog
   * @param confirmed Whether the user confirmed or cancelled
   */
  close(confirmed: boolean = false): void {
    if (this.dialogState.resolve) {
      this.dialogState.resolve(confirmed);
    }

    this.dialogState = {
      isOpen: false,
      message: '',
    };

    this.notifyListeners();
  }

  /**
   * Get current dialog state
   */
  getState(): ConfirmDialogState {
    return { ...this.dialogState };
  }

  /**
   * Subscribe to dialog state changes
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = { ...this.dialogState };
    this.listeners.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in confirm dialog listener:', error);
      }
    });
  }
}

// Singleton instance
const confirmDialogService = new ConfirmDialogService();

/**
 * Show a confirmation dialog
 */
export const confirmDialog = (
  options: string | ConfirmDialogOptions
): Promise<boolean> => {
  return confirmDialogService.confirm(options);
};

/**
 * Get the dialog service instance (for advanced usage)
 */
export const getConfirmDialogService = () => confirmDialogService;
