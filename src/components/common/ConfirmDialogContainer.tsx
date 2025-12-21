/**
 * Confirm Dialog Container
 *
 * Global container component for the confirm dialog service.
 * This component should be rendered once at the app root level.
 *
 * Usage:
 *   <ConfirmDialogContainer />
 */

import React, { useEffect, useState } from 'react';
import {
  getConfirmDialogService,
  ConfirmDialogState,
} from '@/services/confirmDialogService';
import ConfirmDialog from './ConfirmDialog';

export const ConfirmDialogContainer: React.FC = () => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    const service = getConfirmDialogService();

    // Subscribe to dialog state changes
    const unsubscribe = service.subscribe((state) => {
      setDialogState(state);
    });

    // Initialize with current state
    setDialogState(service.getState());

    return unsubscribe;
  }, []);

  const handleConfirm = () => {
    const service = getConfirmDialogService();
    service.close(true);
  };

  const handleCancel = () => {
    const service = getConfirmDialogService();
    service.close(false);
  };

  return (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      confirmButtonStyle={dialogState.confirmButtonStyle}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};
