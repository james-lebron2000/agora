import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnChange?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetOnChange dependencies change
    if (this.state.hasError && this.props.resetOnChange) {
      const hasChanged = this.props.resetOnChange.some(
        (val, idx) => val !== prevProps.resetOnChange?.[idx]
      );
      if (hasChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <FallbackErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback screen for error boundary
 */
interface FallbackErrorScreenProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function FallbackErrorScreen({ error, errorInfo, onReset }: FallbackErrorScreenProps) {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { colors } = theme;

  const handleReportError = () => {
    // In a real app, this would send error to analytics service
    console.log('Reporting error:', {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
    alert('Error reported. Thank you for helping us improve!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="bug-outline" size={80} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Something went wrong
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onReset}
        >
          <Ionicons name="refresh" size={20} color={colors.textInverse} />
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={handleReportError}
        >
          <Ionicons name="flag" size={18} color={colors.textSecondary} />
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
            Report Issue
          </Text>
        </TouchableOpacity>

        {__DEV__ && error && (
          <View style={[styles.debugContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.debugTitle, { color: colors.error }]}>
              Debug Information (Development Only)
            </Text>
            <Text style={[styles.debugText, { color: colors.text }]}>
              {error.toString()}
            </Text>
            {errorInfo && (
              <Text style={[styles.debugStack, { color: colors.textTertiary }]}>
                {errorInfo.componentStack}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    padding: 24,
    borderRadius: 50,
    backgroundColor: '#fef2f2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  debugStack: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
