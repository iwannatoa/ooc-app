/**
 * Error Handler Service
 * 
 * Centralized error handling for the application.
 * Provides consistent error handling, logging, and user feedback.
 * 
 * Features:
 * - Automatic error logging
 * - User-friendly error messages
 * - Error categorization
 * - Error reporting (optional)
 */

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  API = 'api',
  UNKNOWN = 'unknown',
}

export interface ErrorInfo {
  message: string;
  category: ErrorCategory;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
}

class ErrorHandlerService {
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;

  /**
   * Handle an error
   */
  handleError(
    error: Error | string | unknown,
    context?: Record<string, any>
  ): ErrorInfo {
    const errorInfo = this.parseError(error, context);
    this.logError(errorInfo);
    this.addToHistory(errorInfo);
    return errorInfo;
  }

  /**
   * Parse error into ErrorInfo
   */
  private parseError(
    error: Error | string | unknown,
    context?: Record<string, any>
  ): ErrorInfo {
    let message = 'An unknown error occurred';
    let category = ErrorCategory.UNKNOWN;
    let originalError: Error | undefined;

    if (error instanceof Error) {
      originalError = error;
      message = error.message;
      
      // Categorize error
      if (error.message.includes('fetch') || error.message.includes('network')) {
        category = ErrorCategory.NETWORK;
      } else if (error.message.includes('validation') || error.message.includes('required')) {
        category = ErrorCategory.VALIDATION;
      } else if (error.message.includes('API') || error.message.includes('status')) {
        category = ErrorCategory.API;
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    return {
      message,
      category,
      originalError,
      context,
      timestamp: Date.now(),
    };
  }

  /**
   * Log error to console
   */
  private logError(errorInfo: ErrorInfo): void {
    const logMessage = `[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`;
    
    if (errorInfo.originalError) {
      console.error(logMessage, errorInfo.originalError, errorInfo.context);
    } else {
      console.error(logMessage, errorInfo.context);
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(errorInfo: ErrorInfo, t: (key: string) => string): string {
    const { category, message } = errorInfo;

    // Try to get localized message
    const categoryKey = `error.${category}`;
    const categoryMessage = t(categoryKey);

    // If we have a specific error message, use it
    if (message && message !== 'An unknown error occurred') {
      return message;
    }

    // Otherwise use category-based message
    return categoryMessage || t('error.unknown');
  }
}

// Singleton instance
const errorHandlerService = new ErrorHandlerService();

/**
 * Get error handler service instance
 */
export const getErrorHandlerService = () => errorHandlerService;

