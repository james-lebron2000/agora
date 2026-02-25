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
import { Ionicons } from '@expo/vectoricons';

import { walletApi } from '../services/api';
import { useWalletStore } from '../store/walletStore';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
  { id: 8453, name: 'Base', symbol: 'ETH', color: '#0052ff' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: '#28a0f0' },
  { id: 10, name: 'Optimism', symbol: 'ETH', color: '#ff0420' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', color: '#8247e5' },
];

export default function WalletScreen() {
  const { address, balance, usdcBalance, setBalance, setUsdcBalance } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChain, setActiveChain] = useState(1);

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

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === activeChain) || SUPPORTED_CHAINS[0];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshBalance} />
      }
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.chainSelector}>
          <View style={[styles.chainIndicator, { backgroundColor: currentChain.color }]}>
            <Text style={styles.chainSymbol}>{currentChain.symbol}</Text>
          </View>
          <Text style={styles.chainName}>{currentChain.name}</Text>
          <Ionicons name="chevron-down" size={20} color="white" />
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>${usdcBalance}</Text>
          <Text style={styles.nativeBalance}>{balance} {currentChain.symbol}</Text>
        </View>

        <View style={styles.addressContainer}>
          <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.address}>
            {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
          </Text>
          <TouchableOpacity>
            <Ionicons name="copy-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>

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
        <TouchableOpacity style={styles.actionButton}>
          <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="git-compare" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Bridge</Text>
        </TouchableOpacity>
      </View>

      {/* Assets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assets</Text>
        <View style={styles.assetCard}>
          <View style={styles.assetIcon}>
            <Text style={styles.assetIconText}>$</Text>
          </View>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName}>USDC</Text>
            <Text style={styles.assetChain}>Across chains</Text>
          </View>
          <View style={styles.assetValue}>
            <Text style={styles.assetAmount}>${usdcBalance}</Text>
            <Text style={styles.assetUsd}>${usdcBalance} USD</Text>
          </View>
        </View>
        <View style={styles.assetCard}>
          <View style={[styles.assetIcon, { backgroundColor: currentChain.color }]}>
            <Text style={styles.assetIconText}>{currentChain.symbol[0]}</Text>
          </View>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName}>{currentChain.symbol}</Text>
            <Text style={styles.assetChain}>{currentChain.name}</Text>
          </View>
          <View style={styles.assetValue}>
            <Text style={styles.assetAmount}>{balance}</Text>
            <Text style={styles.assetUsd}>~${(parseFloat(balance) * 3000).toFixed(2)} USD</Text>
          </View>
        </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  balanceCard: {
    backgroundColor: '#6366f1',
    margin: 16,
    borderRadius: 20,
    padding: 24,
  },
  chainSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  chainIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chainSymbol: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chainName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  nativeBalance: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
  },
  address: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
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
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2775ca',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  assetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  assetChain: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  assetValue: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  assetUsd: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
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
});
