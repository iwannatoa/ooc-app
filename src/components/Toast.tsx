import React, { useEffect, useState } from 'react';
import styles from './Toast.module.scss';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isVisible ? styles.visible : ''}`}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => onClose(toast.id), 300);
      }}
    >
      <div className={styles.content}>
        <span className={styles.message}>{toast.message}</span>
        <button className={styles.closeBtn} onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}>
          ×
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

