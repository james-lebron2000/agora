import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
  isLoading: boolean;
}

/**
 * Hook to monitor network connectivity state
 */
export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: null,
    isInternetReachable: null,
    type: 'unknown',
    details: null,
    isLoading: true,
  });

  useEffect(() => {
    let unsubscribe: NetInfoSubscription | null = null;

    const setupNetworkListener = async () => {
      try {
        const initialState = await NetInfo.fetch();
        setNetworkState({
          isConnected: initialState.isConnected,
          isInternetReachable: initialState.isInternetReachable,
          type: initialState.type,
          details: initialState.details,
          isLoading: false,
        });

        unsubscribe = NetInfo.addEventListener((state) => {
          setNetworkState({
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
            type: state.type,
            details: state.details,
            isLoading: false,
          });
        });
      } catch (error) {
        console.error('Error setting up network listener:', error);
        setNetworkState(prev => ({ ...prev, isLoading: false }));
      }
    };

    setupNetworkListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return networkState;
}

/**
 * Hook to check if device is online
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkState();
  return isConnected === true && isInternetReachable === true;
}

/**
 * Hook to check if device is offline
 */
export function useIsOffline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkState();
  return isConnected === false || isInternetReachable === false;
}

/**
 * Hook to get connection type
 */
export function useConnectionType(): string {
  const { type } = useNetworkState();
  return type;
}

/**
 * Hook to check if on WiFi
 */
export function useIsWifi(): boolean {
  const { type } = useNetworkState();
  return type === 'wifi';
}

/**
 * Hook to check if on cellular
 */
export function useIsCellular(): boolean {
  const { type } = useNetworkState();
  return type === 'cellular';
}

/**
 * Network offline fallback component
 */
export function NetworkOfflineFallback() {
  return (
    <View style={styles.offlineContainer}>
      <Ionicons name="cloud-offline" size={64} color="#94a3b8" />
      <Text style={styles.offlineTitle}>No Internet Connection</Text>
      <Text style={styles.offlineMessage}>
        Please check your connection and try again
      </Text>
    </View>
  );
}

/**
 * Alias for NetworkOfflineFallback
 */
export { NetworkOfflineFallback as OfflineFallback };

const styles = StyleSheet.create({
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  offlineMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});