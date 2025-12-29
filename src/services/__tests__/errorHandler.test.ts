import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getErrorHandlerService,
  ErrorCategory,
  ErrorInfo,
} from '../errorHandler';

describe('ErrorHandlerService', () => {
  let errorHandler: ReturnType<typeof getErrorHandlerService>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorHandler = getErrorHandlerService();
    errorHandler.clearHistory();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should handle Error objects', () => {
    const error = new Error('Test error');
    const errorInfo = errorHandler.handleError(error);

    expect(errorInfo.message).toBe('Test error');
    expect(errorInfo.category).toBe(ErrorCategory.UNKNOWN);
    expect(errorInfo.originalError).toBe(error);
    expect(errorInfo.timestamp).toBeGreaterThan(0);
  });

  it('should handle string errors', () => {
    const errorInfo = errorHandler.handleError('String error');

    expect(errorInfo.message).toBe('String error');
    expect(errorInfo.category).toBe(ErrorCategory.UNKNOWN);
    expect(errorInfo.originalError).toBeUndefined();
  });

  it('should handle unknown errors', () => {
    const errorInfo = errorHandler.handleError(null);

    expect(errorInfo.message).toBe('An unknown error occurred');
    expect(errorInfo.category).toBe(ErrorCategory.UNKNOWN);
  });

  it('should categorize network errors', () => {
    const error = new Error('fetch failed');
    const errorInfo = errorHandler.handleError(error);

    expect(errorInfo.category).toBe(ErrorCategory.NETWORK);
  });

  it('should categorize validation errors', () => {
    const error = new Error('validation required');
    const errorInfo = errorHandler.handleError(error);

    expect(errorInfo.category).toBe(ErrorCategory.VALIDATION);
  });

  it('should categorize API errors', () => {
    const error = new Error('API status 500');
    const errorInfo = errorHandler.handleError(error);

    expect(errorInfo.category).toBe(ErrorCategory.API);
  });

  it('should include context in error info', () => {
    const context = { userId: '123', action: 'test' };
    const errorInfo = errorHandler.handleError('Error', context);

    expect(errorInfo.context).toEqual(context);
  });

  it('should log errors to console', () => {
    const error = new Error('Test error');
    errorHandler.handleError(error);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should add errors to history', () => {
    const error = new Error('Test error');
    errorHandler.handleError(error);

    const history = errorHandler.getErrorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].message).toBe('Test error');
  });

  it('should limit history size', () => {
    for (let i = 0; i < 150; i++) {
      errorHandler.handleError(`Error ${i}`);
    }

    const history = errorHandler.getErrorHistory();
    expect(history.length).toBeLessThanOrEqual(100);
  });

  it('should clear error history', () => {
    errorHandler.handleError('Error 1');
    errorHandler.handleError('Error 2');

    expect(errorHandler.getErrorHistory()).toHaveLength(2);

    errorHandler.clearHistory();

    expect(errorHandler.getErrorHistory()).toHaveLength(0);
  });

  it('should return user-friendly message', () => {
    const errorInfo: ErrorInfo = {
      message: 'Test error',
      category: ErrorCategory.NETWORK,
      timestamp: Date.now(),
    };

    const mockT = vi.fn((key: string) => {
      if (key === 'error.network') return 'Network error occurred';
      return key;
    });

    const userMessage = errorHandler.getUserMessage(errorInfo, mockT);

    expect(userMessage).toBe('Test error');
    expect(mockT).toHaveBeenCalledWith('error.network');
  });

  it('should use category message when error message is generic', () => {
    const errorInfo: ErrorInfo = {
      message: 'An unknown error occurred',
      category: ErrorCategory.NETWORK,
      timestamp: Date.now(),
    };

    const mockT = vi.fn((key: string) => {
      if (key === 'error.network') return 'Network error occurred';
      return 'Unknown error';
    });

    const userMessage = errorHandler.getUserMessage(errorInfo, mockT);

    expect(userMessage).toBe('Network error occurred');
  });

  it('should return default message when translation fails', () => {
    const errorInfo: ErrorInfo = {
      message: 'An unknown error occurred',
      category: ErrorCategory.UNKNOWN,
      timestamp: Date.now(),
    };

    const mockT = vi.fn((key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    });

    const userMessage = errorHandler.getUserMessage(errorInfo, mockT);

    expect(userMessage).toBe('error.unknown');
  });
});
