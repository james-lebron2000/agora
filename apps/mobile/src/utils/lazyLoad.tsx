/**
 * Lazy Loading Utilities
 * Component code splitting and preloading for React Native
 */

import React, { Suspense, ComponentType, lazy as reactLazy } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface LazyOptions {
  fallback?: React.ReactNode;
  delay?: number;
}

// Default fallback component
const DefaultFallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="large" color="#4f46e5" />
  </View>
);

/**
 * Lazy load a component with custom fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): React.LazyExoticComponent<T> {
  const { delay = 0 } = options;
  
  const lazyFactory = () =>
    new Promise<{ default: T }>((resolve) => {
      const load = () => factory().then(resolve);
      
      if (delay > 0) {
        setTimeout(load, delay);
      } else {
        load();
      }
    });
  
  return reactLazy(lazyFactory);
}

/**
 * Create a lazy component with Suspense wrapper
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazyLoad(factory, options);
  const fallback = options.fallback || <DefaultFallback />;
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Preload registry
const preloadRegistry = new Map<string, Promise<any>>();

/**
 * Preload a component for faster subsequent navigation
 */
export function preloadComponent<T extends ComponentType<any>>(
  id: string,
  factory: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  if (!preloadRegistry.has(id)) {
    preloadRegistry.set(id, factory());
  }
  return preloadRegistry.get(id) as Promise<{ default: T }>;
}

/**
 * Check if a component is preloaded
 */
export function isComponentPreloaded(id: string): boolean {
  return preloadRegistry.has(id);
}

/**
 * Clear preloaded component from registry
 */
export function clearPreloadedComponent(id: string): void {
  preloadRegistry.delete(id);
}

/**
 * Clear all preloaded components
 */
export function clearAllPreloadedComponents(): void {
  preloadRegistry.clear();
}

/**
 * Lazy load with automatic preloading on interaction
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  id: string,
  factory: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): {
  Component: React.FC<React.ComponentProps<T>>;
  preload: () => Promise<{ default: T }>;
} {
  const LazyComponent = lazyLoad(factory, options);
  const fallback = options.fallback || <DefaultFallback />;
  
  const Component: React.FC<React.ComponentProps<T>> = (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
  
  const preload = () => preloadComponent(id, factory);
  
  return { Component, preload };
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
});

export default {
  lazyLoad,
  createLazyComponent,
  preloadComponent,
  isComponentPreloaded,
  clearPreloadedComponent,
  clearAllPreloadedComponents,
  lazyWithPreload,
};
