import { useState, useCallback, useEffect, useRef } from 'react';
import { Toast, ToastType } from '@/components/Toast';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);
    
    // Auto remove after duration
    if (duration !== undefined && duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }
    
    return id;
  }, [removeToast]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration || 5000);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration || 3000);
  }, [showToast]);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  };
};

