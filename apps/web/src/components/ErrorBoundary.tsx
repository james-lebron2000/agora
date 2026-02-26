import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.reset();
    }

    if (hasError && resetKeys) {
      const hasKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // Send to error tracking service
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Example: Send to Sentry
    // Sentry.captureException(error, { extra: errorInfo });

    // Example: Send to custom endpoint
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return <DefaultErrorFallback error={error} errorInfo={errorInfo} onReset={this.reset} />;
    }

    return children;
  }
}

// ============================================================================
// DEFAULT ERROR FALLBACK UI
// ============================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4"
    >
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1 className="text-xl font-bold">Something went wrong</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={onReset}
              className="flex-1 bg-agora-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-agora-800 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
            <svg
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Technical Details */}
          {showDetails && errorInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
                <pre className="text-xs text-gray-300 font-mospace whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </div>
              {error?.stack && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Stack Trace:</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
          If this problem persists, please contact support.
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// ASYNC ERROR BOUNDARY (for handling async errors)
// ============================================================================

export interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  suspenseFallback?: ReactNode;
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps> {
  render(): ReactNode {
    const { children, suspenseFallback, ...props } = this.props;

    return (
      <React.Suspense fallback={suspenseFallback || <LoadingFallback />}>
        <ErrorBoundary {...props}>{children}</ErrorBoundary>
      </React.Suspense>
    );
  }
}

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-agora-300 border-t-agora-900 rounded-full animate-spin" />
      <p className="text-sm text-agora-600">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// HOOK FOR ERROR BOUNDARY (functional component usage)
// ============================================================================

export interface UseErrorBoundaryReturn {
  ErrorBoundaryWrapper: React.FC<{ children: ReactNode }>;
  reset: () => void;
  error: Error | null;
}

export function useErrorBoundary(
  onError?: (error: Error, errorInfo: ErrorInfo) => void
): UseErrorBoundaryReturn {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback(
    (err: Error, errInfo: ErrorInfo) => {
      setError(err);
      onError?.(err, errInfo);
    },
    [onError]
  );

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  const ErrorBoundaryWrapper = React.useCallback(
    ({ children }: { children: ReactNode }) => (
      <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>
    ),
    [handleError]
  );

  return { ErrorBoundaryWrapper, reset, error };
}

// ============================================================================
// SECTION ERROR BOUNDARY (for wrapping specific sections)
// ============================================================================

export interface SectionErrorBoundaryProps extends ErrorBoundaryProps {
  sectionName: string;
  compact?: boolean;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps> {
  render(): ReactNode {
    const { sectionName, compact, fallback, ...props } = this.props;

    const sectionFallback = compact ? (
      <CompactSectionFallback sectionName={sectionName} onReset={this.reset} />
    ) : (
      <SectionFallback sectionName={sectionName} onReset={this.reset} />
    );

    return (
      <ErrorBoundary {...props} fallback={fallback || sectionFallback} />
    );
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
}

const SectionFallback: React.FC<{ sectionName: string; onReset: () => void }> = ({
  sectionName,
  onReset,
}) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h3 className="font-medium text-red-900">{sectionName} failed to load</h3>
        <p className="text-sm text-red-700 mt-1">
          There was an error loading this section. You can try refreshing it.
        </p>
        <button
          onClick={onReset}
          className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

const CompactSectionFallback: React.FC<{ sectionName: string; onReset: () => void }> = ({
  sectionName,
  onReset,
}) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
    <span className="text-sm text-red-700">{sectionName} error</span>
    <button
      onClick={onReset}
      className="text-sm text-red-600 hover:text-red-800 font-medium"
    >
      Retry
    </button>
  </div>
);

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ErrorBoundary,
  AsyncErrorBoundary,
  SectionErrorBoundary,
  useErrorBoundary,
};
