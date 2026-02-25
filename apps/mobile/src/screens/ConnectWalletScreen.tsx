import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useWalletStore } from '../store/walletStore';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Supported wallets for WalletConnect
const SUPPORTED_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/wallets/metamask.png',
    scheme: 'metamask://',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/wallets/rainbow.png',
    scheme: 'rainbow://',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/wallets/trust-wallet.png',
    scheme: 'trust://',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/wallets/coinbase-wallet.png',
    scheme: 'cbwallet://',
  },
];

export default function ConnectWalletScreen() {
  const { connect, setLoading } = useWalletStore();
  const { registerForPushNotifications } = usePushNotifications();

  useEffect(() => {
    // Check if already connected
    setLoading(false);
  }, []);

  const handleConnect = useCallback(async (walletId: string) => {
    setLoading(true);
    
    try {
      // In a real implementation, this would use WalletConnect
      // For now, we'll simulate a connection
      Alert.alert(
        'Connect Wallet',
        `Connecting to ${walletId}...`,
        [
          {
            text: 'Simulate Connect',
            onPress: async () => {
              // Simulate wallet connection
              const mockAddress = '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A0';
              const mockChainId = 1;
              
              connect(mockAddress, mockChainId);
              
              // Register for push notifications
              await registerForPushNotifications();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to connect wallet. Please try again.');
    }
  }, [connect, registerForPushNotifications]);

  const handleManualConnect = useCallback(() => {
    Alert.alert(
      'Enter Wallet Address',
      'For testing, enter a wallet address:',
      [
        {
          text: 'Connect',
          onPress: () => {
            connect('0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A0', 1);
            registerForPushNotifications();
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [connect, registerForPushNotifications]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo Area */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.title}>Welcome to Agora</Text>
        <Text style={styles.subtitle}>
          Connect your wallet to start hiring AI agents and posting tasks
        </Text>
      </View>

      {/* Wallet Options */}
      <View style={styles.walletsContainer}>
        <Text style={styles.sectionTitle}>Connect Wallet</Text>
        
        {SUPPORTED_WALLETS.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={styles.walletButton}
            onPress={() => handleConnect(wallet.id)}
          >
            <View style={styles.walletIconPlaceholder}>
              <Text style={styles.walletIconText}>{wallet.name[0]}</Text>
            </View>
            <Text style={styles.walletName}>{wallet.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.manualButton}
          onPress={handleManualConnect}
        >
          <Ionicons name="enter-outline" size={24} color="#6366f1" />
          <Text style={styles.manualButtonText}>Enter Address Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Info Cards */}
      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#10b981" />
          <Text style={styles.infoTitle}>Secure</Text>
          <Text style={styles.infoText}>
            Your keys, your control. We never store your private keys.
          </Text>
        </View>
        
        <View style={styles.infoCard}>
          <Ionicons name="flash" size={24} color="#f59e0b" />
          <Text style={styles.infoTitle}>Fast</Text>
          <Text style={styles.infoText}>
            Instantly connect and start hiring AI agents.
          </Text>
        </View>
        
        <View style={styles.infoCard}>
          <Ionicons name="git-network" size={24} color="#6366f1" />
          <Text style={styles.infoTitle}>Multi-Chain</Text>
          <Text style={styles.infoText}>
            Support for Ethereum, Base, Arbitrum, and more.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        By connecting, you agree to our Terms of Service and Privacy Policy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  walletsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  walletIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  walletName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  manualButtonText: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
