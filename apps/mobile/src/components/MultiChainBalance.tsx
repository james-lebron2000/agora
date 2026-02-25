import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletBalance } from '../hooks/useApi';

// Chain metadata for display
const CHAIN_METADATA: Record<string, { name: string; icon: string; color: string; chainId: number }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    chainId: 1
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    chainId: 8453
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    chainId: 10
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    chainId: 42161
  }
};

interface ChainBalance {
  chain: string;
  nativeBalance: string;
  usdcBalance: string;
}

interface MultiChainBalanceProps {
  address: string | null;
  onChainSelect?: (chain: string) => void;
  showHeader?: boolean;
}

export function MultiChainBalance({ 
  address, 
  onChainSelect,
  showHeader = true 
}: MultiChainBalanceProps) {
  const { multiChainBalances, isLoading, error, refetch } = useWalletBalance(address);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  // Calculate totals
  const totals = multiChainBalances.reduce(
    (acc, bal) => {
      const usdc = parseFloat(bal.usdcBalance) || 0;
      const native = parseFloat(bal.nativeBalance) || 0;
      return {
        usdc: acc.usdc + usdc,
        native: acc.native + native
      };
    },
    { usdc: 0, native: 0 }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleChainPress = (chain: string) => {
    setSelectedChain(chain);
    onChainSelect?.(chain);
  };

  const formatCurrency = (value: number, decimals = 2) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(decimals)}`;
  };

  const formatNumber = (value: string | number, decimals = 4) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(decimals);
  };

  // Sort balances by USDC value (descending)
  const sortedBalances = [...multiChainBalances].sort((a, b) => 
    parseFloat(b.usdcBalance || '0') - parseFloat(a.usdcBalance || '0')
  );

  if (isLoading && !refreshing && multiChainBalances.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading balances...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet-outline" size={20} color="#6366f1" />
            </View>
            <View>
              <Text style={styles.title}>Multi-Chain Balance</Text>
              <Text style={styles.subtitle}>
                {multiChainBalances.length > 0 
                  ? `Across ${multiChainBalances.length} chains` 
                  : 'No balances loaded'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setExpandedView(!expandedView)}
              style={styles.iconButton}
            >
              <Ionicons 
                name={expandedView ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onRefresh}
              style={styles.iconButton}
            >
              <Ionicons name="refresh" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Total Balance Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total USDC Balance</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totals.usdc)}</Text>
        <View style={styles.totalMeta}>
          <Text style={styles.totalMetaText}>~{formatNumber(totals.native, 4)} ETH</Text>
          <View style={styles.dot} />
          <Text style={styles.totalMetaText}>Across {multiChainBalances.length} chains</Text>
        </View>
      </View>

      {/* Chain Balances */}
      <View style={styles.balancesContainer}>
        {sortedBalances.map((balance) => {
          const meta = CHAIN_METADATA[balance.chain] || {
            name: balance.chain,
            icon: '⛓️',
            color: '#6366f1',
            chainId: 0
          };
          const isSelected = selectedChain === balance.chain;
          const usdcValue = parseFloat(balance.usdcBalance || '0');
          const totalUsdc = totals.usdc || 1;
          const percentage = totalUsdc > 0 ? (usdcValue / totalUsdc) * 100 : 0;

          return (
            <TouchableOpacity
              key={balance.chain}
              onPress={() => handleChainPress(balance.chain)}
              style={[
                styles.chainCard,
                isSelected && styles.chainCardSelected
              ]}
            >
              <View style={styles.chainHeader}>
                <View style={styles.chainInfo}>
                  <View style={[styles.chainIcon, { backgroundColor: `${meta.color}20` }]}>
                    <Text style={styles.chainIconText}>{meta.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.chainName}>{meta.name}</Text>
                    <Text style={styles.chainId}>Chain ID: {meta.chainId}</Text>
                  </View>
                </View>
                <View style={styles.chainBalances}>
                  <Text style={styles.chainUsdcBalance}>
                    ${formatNumber(balance.usdcBalance, 2)}
                  </Text>
                  <Text style={styles.chainNativeBalance}>
                    {formatNumber(balance.nativeBalance, 4)} ETH
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(percentage, 100)}%`, backgroundColor: meta.color }
                    ]} 
                  />
                </View>
                <Text style={styles.percentage}>{percentage.toFixed(1)}%</Text>
              </View>

              {/* Expanded details */}
              {expandedView && (
                <View style={styles.expandedDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>USDC Balance</Text>
                      <Text style={styles.detailValue}>
                        ${formatNumber(balance.usdcBalance, 2)}
                      </Text>
                    </View>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Native Balance</Text>
                      <Text style={styles.detailValue}>
                        {formatNumber(balance.nativeBalance, 4)} ETH
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            const highest = sortedBalances[0];
            if (highest) handleChainPress(highest.chain);
          }}
        >
          <Ionicons name="trophy-outline" size={16} color="#374151" />
          <Text style={styles.actionText}>Highest Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={16} color="#6366f1" />
          <Text style={[styles.actionText, styles.actionTextPrimary]}>Refresh All</Text>
        </TouchableOpacity>
      </View>

      {/* Info footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
        <Text style={styles.footerText}>
          Prices are estimates. Pull to refresh for latest balances.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  totalCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#e0e7ff',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  totalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalMetaText: {
    fontSize: 12,
    color: '#e0e7ff',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c7d2fe',
  },
  balancesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  chainCard: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chainCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chainIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainIconText: {
    fontSize: 20,
  },
  chainName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  chainId: {
    fontSize: 12,
    color: '#6b7280',
  },
  chainBalances: {
    alignItems: 'flex-end',
  },
  chainUsdcBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chainNativeBalance: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    width: 40,
    textAlign: 'right',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailBox: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#e0e7ff',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  actionTextPrimary: {
    color: '#6366f1',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default MultiChainBalance;
