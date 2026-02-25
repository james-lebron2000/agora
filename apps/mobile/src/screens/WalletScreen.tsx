import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { walletApi } from '../services/api';
import { useWalletStore } from '../store/walletStore';
import { MultiChainBalance } from '../components';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
  { id: 8453, name: 'Base', symbol: 'ETH', color: '#0052ff' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: '#28a0f0' },
  { id: 10, name: 'Optimism', symbol: 'ETH', color: '#ff0420' },
];

export default function WalletScreen() {
  const { address, balance, usdcBalance, setBalance, setUsdcBalance } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChain, setActiveChain] = useState(1);
  const navigation = useNavigation();

  const refreshBalance = async () => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      const data = await walletApi.getBalance(address);
      setBalance(data.native);
      setUsdcBalance(data.usdc);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [address]);

  const handleDeposit = () => {
    Alert.alert(
      'Deposit Funds',
      'Send USDC to your wallet address:\n\n' + address,
      [
        { text: 'Copy Address', onPress: () => console.log('Copy address') },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Funds',
      'This feature will be available soon!',
      [{ text: 'OK', style: 'cancel' }]
    );
  };

  const handleBridge = () => {
    navigation.navigate('Bridge' as never);
  };

  const handleChainSelect = (chain: string) => {
    console.log('Selected chain:', chain);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshBalance} />
      }
    >
      {/* Multi-Chain Balance Component */}
      <MultiChainBalance 
        address={address}
        onChainSelect={handleChainSelect}
        showHeader={true}
      />

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDeposit}>
          <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
            <Ionicons name="arrow-down" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
          <View style={[styles.actionIcon, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="arrow-up" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="swap-horizontal" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Swap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleBridge}>
          <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="git-compare" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Bridge</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyActivity}>
          <Ionicons name="time-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      </View>

      {/* Security Note */}
      <View style={styles.securityCard}>
        <Ionicons name="shield-checkmark" size={24} color="#10b981" />
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>Secure Wallet</Text>
          <Text style={styles.securityDescription}>
            Your wallet is secured by WalletConnect. Never share your private keys.
          </Text>
        </View>
      </View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  seeAll: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
  },
  securityCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  securityText: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  securityDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
});
