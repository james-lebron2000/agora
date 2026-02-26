import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useTheme } from './src/constants/theme';
import { usePerformanceMonitor } from './src/hooks/usePerformanceMonitor';
import { PERFORMANCE_CONFIG, getOptimizedConfig } from './src/config/performance';

// Global error handler for uncaught errors
const globalErrorHandler = (error: Error, isFatal?: boolean) => {
  if (__DEV__) {
    console.error('Global Error Handler:', error);
  } else {
    // In production, you might want to send this to an error tracking service
    console.log('Error caught (production):', error.message);
  }
};

// Performance monitoring setup
const setupPerformanceMonitoring = () => {
  if (!PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR) return;

  // Log performance config on startup
  const deviceTier = getOptimizedConfig();
  console.log('[Performance] Device tier:', deviceTier);
  console.log('[Performance] Monitoring enabled');

  // Suppress specific warnings in development for cleaner console
  if (__DEV__) {
    LogBox.ignoreLogs([
      '[Performance]', // Ignore our own performance logs in LogBox
    ]);
  }
};

// Create a client with optimized defaults for mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Mobile doesn't have window focus events
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * App initialization loader
 * Handles async setup tasks before rendering the app
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const theme = useTheme();
  const initStartTime = useRef(performance.now());

  // Initialize performance monitoring
  const {
    metrics,
    isMonitoring,
    alerts,
    startMonitoring,
    stopMonitoring,
    getReport,
  } = usePerformanceMonitor({
    enableFps: PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR,
    enableMemory: PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR,
    enableRenderTime: PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR,
    enableJSThread: PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR,
    onAlert: (alert) => {
      if (__DEV__) {
        console.warn(`[Performance Alert] ${alert.type}: ${alert.message}`);
      }
    },
  });

  const initializeApp = useCallback(async () => {
    try {
      // Setup performance monitoring
      setupPerformanceMonitoring();

      // Perform any async initialization here
      // e.g., loading persisted state, checking auth, etc.
      
      // Simulate a minimum splash time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Log startup time
      const startupTime = performance.now() - initStartTime.current;
      if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
        console.log(`[Performance] App startup time: ${startupTime.toFixed(2)}ms`);
      }
      
      setIsReady(true);
      
      // Start performance monitoring after app is ready
      if (PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR) {
        startMonitoring();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize app'));
      setIsReady(true);
    }
  }, [startMonitoring]);

  useEffect(() => {
    initializeApp();
    
    // Cleanup monitoring on unmount
    return () => {
      if (isMonitoring) {
        stopMonitoring();
        if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
          const report = getReport();
          console.log('[Performance] Session report:', report);
        }
      }
    };
  }, [initializeApp, isMonitoring, stopMonitoring, getReport]);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading Agora...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
          Failed to Start
        </Text>
        <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
          {error.message}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Main App Component
 */
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppInitializer>
            <AppNavigator />
            <StatusBar style="auto" />
          </AppInitializer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
});
