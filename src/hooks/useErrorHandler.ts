/**
 * Hook for using error handler with toast notifications
 */

import { useToast } from './useToast';
import { useI18n } from '@/i18n';
import { getErrorHandlerService } from '@/services/errorHandler';

export const useErrorHandler = () => {
  const { showError } = useToast();
  const { t } = useI18n();
  const errorHandlerService = getErrorHandlerService();

  const handleError = (
    error: Error | string | unknown,
    context?: Record<string, any>
  ) => {
    const errorInfo = errorHandlerService.handleError(error, context);
    const userMessage = errorHandlerService.getUserMessage(errorInfo, t);
    showError(userMessage);
    return errorInfo;
  };

  return {
    handleError,
    getErrorHistory: () => errorHandlerService.getErrorHistory(),
    clearHistory: () => errorHandlerService.clearHistory(),
  };
};

