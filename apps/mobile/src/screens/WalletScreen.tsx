import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { walletApi } from '../services/api';
import { useWalletStore } from '../store/walletStore';
import { MultiChainBalance } from '../components';
import { getBridgeQuote, findCheapestChain, SUPPORTED_CHAINS, type SupportedChain } from '@agora/sdk';

// Chain metadata for display
const CHAIN_METADATA: Record<number, { name: string; icon: string; color: string; symbol: string }> = {
  1: { name: 'Ethereum', icon: '🔷', color: '#627EEA', symbol: 'ETH' },
  8453: { name: 'Base', icon: '🔵', color: '#0052FF', symbol: 'ETH' },
  42161: { name: 'Arbitrum', icon: '💠', color: '#28A0F0', symbol: 'ETH' },
  10: { name: 'Optimism', icon: '🔴', color: '#FF0420', symbol: 'ETH' },
};

// Echo Survival status types
type SurvivalStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface EchoStatus {
  status: SurvivalStatus;
  message: string;
  lastHeartbeat: number;
  economicHealth: number;
  actionRequired: boolean;
}

export default function WalletScreen() {
  const { address, balance, usdcBalance, setBalance, setUsdcBalance } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(1);
  const [echoStatus, setEchoStatus] = useState<EchoStatus>({
    status: 'unknown',
    message: 'Loading Echo status...',
    lastHeartbeat: 0,
    economicHealth: 0,
    actionRequired: false,
  });
  const [bridgeQuote, setBridgeQuote] = useState<{
    cheapestChain: SupportedChain | null;
    quote: { fee: string; estimatedTime: number } | null;
    loading: boolean;
  }>({
    cheapestChain: null,
    quote: null,
    loading: false,
  });
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

  // Fetch Echo Survival status
  const fetchEchoStatus = useCallback(async () => {
    if (!address) return;
    
    try {
      // In real implementation, this would call the survival API
      // For now, simulate with mock data
      const mockStatus: EchoStatus = {
        status: 'healthy',
        message: 'Agent is operating normally',
        lastHeartbeat: Date.now() - 300000, // 5 minutes ago
        economicHealth: 0.85,
        actionRequired: false,
      };
      
      setEchoStatus(mockStatus);
    } catch (error) {
      console.error('Failed to fetch Echo status:', error);
      setEchoStatus({
        status: 'unknown',
        message: 'Unable to fetch Echo status',
        lastHeartbeat: 0,
        economicHealth: 0,
        actionRequired: false,
      });
    }
  }, [address]);

  // Fetch bridge quote for the cheapest chain
  const fetchBridgeQuote = useCallback(async () => {
    if (!address) return;
    
    setBridgeQuote(prev => ({ ...prev, loading: true }));
    try {
      // In a real implementation, these would be actual SDK calls
      // const cheapest = await findCheapestChain(address, 1000); // $1000 USDC
      // const quote = await getBridgeQuote(selectedChain as SupportedChain, cheapest, 1000);
      
      // Mock data for now
      const mockCheapestChain: SupportedChain = 'base';
      const mockQuote = {
        fee: '2.50',
        estimatedTime: 180, // 3 minutes
      };
      
      setBridgeQuote({
        cheapestChain: mockCheapestChain,
        quote: mockQuote,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch bridge quote:', error);
      setBridgeQuote({
        cheapestChain: null,
        quote: null,
        loading: false,
      });
    }
  }, [address, selectedChain]);

  useEffect(() => {
    refreshBalance();
    fetchEchoStatus();
  }, [address, fetchEchoStatus]);

  useEffect(() => {
    fetchBridgeQuote();
  }, [selectedChain, fetchBridgeQuote]);

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
    navigation.navigate('Bridge' as never, { mode: 'withdraw' } as never);
  };

  const handleBridge = () => {
    navigation.navigate('Bridge' as never, { 
      mode: 'bridge',
      sourceChain: selectedChain,
    } as never);
  };

  const handleChainSelect = (chain: string) => {
    // Map chain names to chain IDs
    const chainIdMap: Record<string, number> = {
      'ethereum': 1,
      'base': 8453,
      'optimism': 10,
      'arbitrum': 42161,
    };
    setSelectedChain(chainIdMap[chain] || 1);
  };

  const navigateToEcho = () => {
    navigation.navigate('Echo' as never);
  };

  // Get status color
  const getStatusColor = (status: SurvivalStatus) => {
    switch (status) {
      case 'healthy':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  // Get status icon
  const getStatusIcon = (status: SurvivalStatus) => {
    switch (status) {
      case 'healthy':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={() => {
            refreshBalance();
            fetchEchoStatus();
            fetchBridgeQuote();
          }} 
        />
      }
    >
      {/* Echo Survival Status Card */}
      <TouchableOpacity 
        style={[styles.echoCard, { borderColor: getStatusColor(echoStatus.status) }]} 
        onPress={navigateToEcho}
      >
        <View style={styles.echoHeader}>
          <View style={[styles.echoIcon, { backgroundColor: `${getStatusColor(echoStatus.status)}20` }]}>
            <Ionicons 
              name={getStatusIcon(echoStatus.status) as any} 
              size={24} 
              color={getStatusColor(echoStatus.status)} 
            />
          </View>
          <View style={styles.echoInfo}>
            <Text style={styles.echoTitle}>Echo Survival Status</Text>
            <Text style={[styles.echoStatus, { color: getStatusColor(echoStatus.status) }]}>
              {echoStatus.status.charAt(0).toUpperCase() + echoStatus.status.slice(1)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
        <Text style={styles.echoMessage}>{echoStatus.message}</Text>
        {echoStatus.status !== 'unknown' && (
          <View style={styles.echoMetrics}>
            <View style={styles.echoMetric}>
              <Text style={styles.echoMetricLabel}>Economic Health</Text>
              <Text style={styles.echoMetricValue}>
                {(echoStatus.economicHealth * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.echoMetric}>
              <Text style={styles.echoMetricLabel}>Last Heartbeat</Text>
              <Text style={styles.echoMetricValue}>
                {echoStatus.lastHeartbeat > 0 
                  ? `${Math.floor((Date.now() - echoStatus.lastHeartbeat) / 60000)}m ago`
                  : 'Never'}
              </Text>
            </View>
          </View>
        )}
        {echoStatus.actionRequired && (
          <View style={styles.actionRequired}>
            <Ionicons name="alert" size={16} color="#ef4444" />
            <Text style={styles.actionRequiredText}>Action required</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Multi-Chain Balance Component */}
      <MultiChainBalance 
        address={address}
        onChainSelect={handleChainSelect}
        showHeader={true}
      />

      {/* Cross-Chain Bridge Quote Card */}
      <View style={styles.bridgeCard}>
        <View style={styles.bridgeHeader}>
          <Ionicons name="git-compare" size={20} color="#6366f1" />
          <Text style={styles.bridgeTitle}>Bridge Recommendation</Text>
        </View>
        {bridgeQuote.loading ? (
          <View style={styles.bridgeLoading}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.bridgeLoadingText}>Finding best route...</Text>
          </View>
        ) : bridgeQuote.cheapestChain && bridgeQuote.quote ? (
          <View style={styles.bridgeContent}>
            <View style={styles.bridgeRoute}>
              <View style={styles.chainBadge}>
                <Text style={styles.chainBadgeText}>
                  {CHAIN_METADATA[selectedChain]?.name || 'Source'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
              <View style={[styles.chainBadge, styles.chainBadgeHighlighted]}>
                <Text style={[styles.chainBadgeText, styles.chainBadgeTextHighlighted]}>
                  {CHAIN_METADATA[SUPPORTED_CHAINS[bridgeQuote.cheapestChain]]?.name || bridgeQuote.cheapestChain}
                </Text>
              </View>
            </View>
            <View style={styles.bridgeDetails}>
              <View style={styles.bridgeDetail}>
                <Text style={styles.bridgeDetailLabel}>Fee</Text>
                <Text style={styles.bridgeDetailValue}>${bridgeQuote.quote.fee}</Text>
              </View>
              <View style={styles.bridgeDetail}>
                <Text style={styles.bridgeDetailLabel}>Time</Text>
                <Text style={styles.bridgeDetailValue}>
                  {Math.ceil(bridgeQuote.quote.estimatedTime / 60)} min
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bridgeButton} onPress={handleBridge}>
              <Text style={styles.bridgeButtonText}>Bridge Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bridgeEmpty}>
            <Ionicons name="information-circle-outline" size={24} color="#9ca3af" />
            <Text style={styles.bridgeEmptyText}>
              Bridge quotes unavailable. Try again later.
            </Text>
          </View>
        )}
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
        <TouchableOpacity style={styles.actionButton} onPress={handleBridge}>
          <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="git-compare" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Bridge</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Chain Info */}
      {selectedChain && (
        <View style={styles.chainInfoCard}>
          <View style={styles.chainInfoHeader}>
            <Text style={styles.chainInfoTitle}>Active Chain</Text>
            <View style={[styles.chainBadge, { backgroundColor: CHAIN_METADATA[selectedChain]?.color + '20' }]}>
              <Text style={[styles.chainBadgeText, { color: CHAIN_METADATA[selectedChain]?.color }]}>
                {CHAIN_METADATA[selectedChain]?.icon} {CHAIN_METADATA[selectedChain]?.name}
              </Text>
            </View>
          </View>
          <Text style={styles.chainInfoDescription}>
            Transactions will be executed on {CHAIN_METADATA[selectedChain]?.name}. 
            Gas fees are paid in {CHAIN_METADATA[selectedChain]?.symbol}.
          </Text>
        </View>
      )}

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
  // Echo Survival Card Styles
  echoCard: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  echoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  echoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  echoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  echoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  echoStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  echoMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  echoMetrics: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  echoMetric: {
    flex: 1,
  },
  echoMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  echoMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  actionRequiredText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 6,
  },
  // Bridge Card Styles
  bridgeCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bridgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bridgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  bridgeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  bridgeLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  bridgeContent: {
    gap: 16,
  },
  bridgeRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chainBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  chainBadgeHighlighted: {
    backgroundColor: '#6366f1',
  },
  chainBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  chainBadgeTextHighlighted: {
    color: 'white',
  },
  bridgeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 12,
  },
  bridgeDetail: {
    alignItems: 'center',
  },
  bridgeDetailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bridgeDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  bridgeButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bridgeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  bridgeEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bridgeEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  // Chain Info Card
  chainInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
  },
  chainInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chainInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  chainInfoDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  // Action Styles
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
  // Section Styles
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
