import { useState, useCallback } from 'react';

/**
 * Error information structure
 */
export interface ErrorInfo {
  /** The error object */
  error: Error | null;
  /** User-friendly error message */
  message: string;
  /** Timestamp when the error occurred */
  timestamp: number;
  /** Optional context about where the error occurred */
  context?: string;
}

/**
 * Return type for useErrorHandler hook
 */
export interface UseErrorHandlerReturn {
  /** The current error information */
  error: ErrorInfo | null;
  /** Whether an error has occurred */
  hasError: boolean;
  /** Handle an error */
  handleError: (err: unknown, message?: string, context?: string) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Retry a function that previously failed */
  retry: <T>(fn: () => Promise<T> | T, retryMessage?: string) => Promise<T>;
}

/**
 * A React hook for handling errors in components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { error, hasError, handleError, clearError, retry } = useErrorHandler();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitData();
 *     } catch (err) {
 *       handleError(err, '提交数据失败');
 *     }
 *   };
 *
 *   if (hasError) {
 *     return (
 *       <div>
 *         <p>{error?.message}</p>
 *         <button onClick={clearError}>Dismiss</button>
 *       </div>
 *     );
 *   }
 *
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const hasError = error !== null;

  /**
   * Handle an error by setting error state and logging to console
   */
  const handleError = useCallback((err: unknown, message?: string, context?: string) => {
    const errorMessage = message || (err instanceof Error ? err.message : '发生未知错误');
    const errorObj = err instanceof Error ? err : new Error(String(err));

    const errorInfo: ErrorInfo = {
      error: errorObj,
      message: errorMessage,
      timestamp: Date.now(),
      context,
    };

    // Log error to console
    console.error('[useErrorHandler]', errorMessage, {
      error: errorObj,
      context,
      timestamp: errorInfo.timestamp,
    });

    setError(errorInfo);
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry a function that previously failed
   * Automatically clears error before retry and handles any new errors
   */
  const retry = useCallback(async <T>(fn: () => Promise<T> | T, retryMessage?: string): Promise<T> => {
    clearError();

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = retryMessage || '重试失败';
      handleError(err, message, 'retry');
      throw err;
    }
  }, [clearError, handleError]);

  return {
    error,
    hasError,
    handleError,
    clearError,
    retry,
  };
}

export default useErrorHandler;
