/**
 * BridgeScreen.tsx - Complete Bridge Integration
 * Cross-chain bridge screen with full SDK integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
} from '../utils/responsive';
import { useBridge } from '../hooks/useBridge';
import { useWalletStore } from '../store/walletStore';
import type { SupportedChain, TokenType } from '../types/bridge';

// Chain metadata for UI
const CHAIN_METADATA = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    nativeToken: 'ETH'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    nativeToken: 'ETH'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    nativeToken: 'ETH'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    nativeToken: 'ETH'
  }
} as const;

const SUPPORTED_CHAINS: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum'];

interface BridgeScreenProps {
  navigation?: any;
}

export default function BridgeScreen({ navigation }: BridgeScreenProps) {
  const { address, isConnected } = useWalletStore();
  const insets = useSafeAreaInsets();
  const [showChainSelect, setShowChainSelect] = useState<'source' | 'dest' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    sourceChain,
    destinationChain,
    token,
    amount,
    recipient,
    useCustomRecipient,
    quote,
    transaction,
    balances,
    errors,
    isQuoting,
    isBridging,
    isLoadingBalances,
    setSourceChain,
    setDestinationChain,
    setToken,
    setAmount,
    setRecipient,
    setUseCustomRecipient,
    swapChains,
    getQuote,
    executeBridge,
    clearQuote,
    getBalanceForChain,
    formatAmount,
    refreshBalances
  } = useBridge({
    address: address as `0x${string}` | null,
    defaultSourceChain: 'base',
    defaultDestChain: 'optimism',
    autoRefreshBalances: true,
    refreshInterval: 30000
  });

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setIsRefreshing(false);
  }, [refreshBalances]);

  // Handle bridge completion
  const handleBridgeComplete = useCallback(async (result: { success: boolean; txHash?: string; error?: string }) => {
    if (result.success) {
      Alert.alert(
        'Bridge Successful!',
        `Transaction: ${result.txHash?.slice(0, 10)}...${result.txHash?.slice(-8)}`,
        [{ text: 'OK' }]
      );
      // Refresh balances after successful bridge
      await refreshBalances();
    } else {
      Alert.alert('Bridge Failed', result.error || 'Unknown error occurred');
    }
  }, [refreshBalances]);

  // Get quote with validation
  const handleGetQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const result = await getQuote();
    if (!result && errors.general) {
      Alert.alert('Quote Failed', errors.general);
    }
  }, [amount, getQuote, errors.general]);

  // Execute bridge with confirmation
  const handleBridge = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!quote) {
      Alert.alert('No Quote', 'Please get a quote first');
      return;
    }

    Alert.alert(
      'Confirm Bridge',
      `Bridge ${amount} ${token} from ${CHAIN_METADATA[sourceChain].name} to ${CHAIN_METADATA[destinationChain].name}?\n\nEstimated fee: ${quote.estimatedFee} ETH\nEstimated time: ${quote.estimatedTime}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await executeBridge();
            await handleBridgeComplete(result);
          }
        }
      ]
    );
  }, [isConnected, amount, token, sourceChain, destinationChain, quote, handleBridgeComplete]);

  const sourceMeta = CHAIN_METADATA[sourceChain];
  const destMeta = CHAIN_METADATA[destinationChain];
  const availableBalance = getBalanceForChain(sourceChain, token);

  const renderChainSelector = () => {
    if (!showChainSelect) return null;

    const chains = showChainSelect === 'source' 
      ? SUPPORTED_CHAINS 
      : SUPPORTED_CHAINS.filter(c => c !== sourceChain);

    return (
      <View style={styles.chainSelectorOverlay}>
        <View style={styles.chainSelector}>
          <View style={styles.chainSelectorHeader}>
            <Text style={styles.chainSelectorTitle}>
              Select {showChainSelect === 'source' ? 'Source' : 'Destination'} Chain
            </Text>
            <TouchableOpacity onPress={() => setShowChainSelect(null)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          {chains.map((chain) => {
            const meta = CHAIN_METADATA[chain];
            const isSelected = showChainSelect === 'source' 
              ? sourceChain === chain 
              : destinationChain === chain;
            
            return (
              <TouchableOpacity
                key={chain}
                style={[
                  styles.chainOption,
                  isSelected && { backgroundColor: '#eef2ff' }
                ]}
                onPress={() => {
                  if (showChainSelect === 'source') {
                    setSourceChain(chain);
                  } else {
                    setDestinationChain(chain);
                  }
                  setShowChainSelect(null);
                  clearQuote();
                }}
              >
                <View style={[styles.chainOptionIcon, { backgroundColor: `${meta.color}20` }]}>
                  <Text style={styles.chainOptionIconText}>{meta.icon}</Text>
                </View>
                <View style={styles.chainOptionInfo}>
                  <Text style={styles.chainOptionName}>{meta.name}</Text>
                  <Text style={styles.chainOptionToken}>{meta.nativeToken}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={24} color="#6366f1" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="swap-horizontal" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Cross-Chain Bridge</Text>
              <Text style={styles.headerSubtitle}>Transfer assets across L2 networks</Text>
            </View>
          </View>

          {/* Balance Display */}
          {address && balances.length > 0 && (
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet-outline" size={18} color="#6366f1" />
                <Text style={styles.balanceTitle}>Your Balances</Text>
                <TouchableOpacity 
                  onPress={refreshBalances}
                  style={styles.refreshButton}
                  disabled={isLoadingBalances}
                >
                  <Ionicons 
                    name="refresh" 
                    size={16} 
                    color="#6366f1" 
                    style={isLoadingBalances && styles.refreshSpinning}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.balanceList}>
                {balances.map((bal) => {
                  const usdc = parseFloat(bal.usdcBalance || '0');
                  const native = parseFloat(bal.nativeBalance || '0');
                  if (usdc < 0.01 && native < 0.0001) return null;
                  return (
                    <View key={bal.chain} style={styles.balanceItem}>
                      <Text style={styles.balanceChain}>{CHAIN_METADATA[bal.chain].name}</Text>
                      <View style={styles.balanceValues}>
                        {usdc > 0.01 && (
                          <Text style={styles.balanceValue}>{usdc.toFixed(2)} USDC</Text>
                        )}
                        {native > 0.0001 && (
                          <Text style={styles.balanceNative}>{native.toFixed(4)} ETH</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Token Selection */}
          <View style={styles.tokenSelector}>
            {(['USDC', 'ETH'] as TokenType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tokenButton,
                  token === t && styles.tokenButtonActive
                ]}
                onPress={() => {
                  setToken(t);
                  clearQuote();
                }}
              >
                <Text style={[
                  styles.tokenButtonText,
                  token === t && styles.tokenButtonTextActive
                ]}>
                  {t === 'USDC' ? '💲 USDC' : '♦ ETH'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chain Selection */}
          <View style={styles.chainSection}>
            {/* Source Chain */}
            <View style={styles.chainBox}>
              <Text style={styles.chainLabel}>From</Text>
              <TouchableOpacity
                style={styles.chainButton}
                onPress={() => setShowChainSelect('source')}
              >
                <View style={[styles.chainButtonIcon, { backgroundColor: `${sourceMeta.color}20` }]}>
                  <Text style={styles.chainButtonIconText}>{sourceMeta.icon}</Text>
                </View>
                <View style={styles.chainButtonInfo}>
                  <Text style={styles.chainButtonName}>{sourceMeta.name}</Text>
                  <Text style={styles.chainButtonMeta}>{sourceMeta.nativeToken} Network</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Swap Button */}
            <TouchableOpacity style={styles.swapButton} onPress={swapChains}>
              <View style={styles.swapButtonInner}>
                <Ionicons name="swap-vertical" size={20} color="#6366f1" />
              </View>
            </TouchableOpacity>

            {/* Destination Chain */}
            <View style={styles.chainBox}>
              <Text style={styles.chainLabel}>To</Text>
              <TouchableOpacity
                style={styles.chainButton}
                onPress={() => setShowChainSelect('dest')}
              >
                <View style={[styles.chainButtonIcon, { backgroundColor: `${destMeta.color}20` }]}>
                  <Text style={styles.chainButtonIconText}>{destMeta.icon}</Text>
                </View>
                <View style={styles.chainButtonInfo}>
                  <Text style={styles.chainButtonName}>{destMeta.name}</Text>
                  <Text style={styles.chainButtonMeta}>{destMeta.nativeToken} Network</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(formatAmount(text))}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                editable={!isBridging}
              />
              <View style={styles.amountRight}>
                <Text style={styles.amountToken}>{token}</Text>
                <TouchableOpacity 
                  style={styles.maxButton}
                  onPress={() => setAmount(availableBalance)}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount}</Text>
            )}
          </View>

          {/* Custom Recipient Toggle */}
          <TouchableOpacity 
            style={styles.recipientToggle}
            onPress={() => setUseCustomRecipient(!useCustomRecipient)}
          >
            <View style={[
              styles.checkbox,
              useCustomRecipient && styles.checkboxChecked
            ]}>
              {useCustomRecipient && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={styles.recipientToggleText}>Send to a different address</Text>
          </TouchableOpacity>

          {/* Custom Recipient Input */}
          {useCustomRecipient && (
            <View style={styles.recipientSection}>
              <Text style={styles.sectionLabel}>Recipient Address</Text>
              <TextInput
                style={styles.recipientInput}
                value={recipient}
                onChangeText={setRecipient}
                placeholder="0x..."
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                editable={!isBridging}
              />
              {errors.recipient && (
                <Text style={styles.errorText}>{errors.recipient}</Text>
              )}
            </View>
          )}

          {/* Quote Display */}
          {quote && (
            <View style={styles.quoteCard}>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Estimated Fee</Text>
                <Text style={styles.quoteValue}>{quote.estimatedFee} ETH</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Estimated Time</Text>
                <Text style={styles.quoteValue}>{quote.estimatedTime}</Text>
              </View>
            </View>
          )}

          {/* Transaction Progress */}
          {transaction && (
            <View style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Ionicons name="swap-horizontal" size={20} color="#6366f1" />
                <Text style={styles.transactionTitle}>Bridge in Progress</Text>
                <Text style={styles.transactionStatus}>{transaction.status}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${transaction.progress}%` }]} />
              </View>
              <Text style={styles.transactionText}>
                {transaction.stage} • {transaction.progress}%
              </Text>
              <Text style={styles.transactionHash}>
                {transaction.txHash.slice(0, 10)}...{transaction.txHash.slice(-8)}
              </Text>
            </View>
          )}

          {/* Error Display */}
          {errors.general && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.quoteButton,
                (!amount || parseFloat(amount) <= 0 || isQuoting) && styles.buttonDisabled
              ]}
              onPress={handleGetQuote}
              disabled={!amount || parseFloat(amount) <= 0 || isQuoting}
            >
              {isQuoting ? (
                <ActivityIndicator size="small" color="#374151" />
              ) : (
                <Text style={styles.quoteButtonText}>Get Quote</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bridgeButton,
                (!isConnected || isBridging || !amount || parseFloat(amount) <= 0 || !quote) && styles.buttonDisabled
              ]}
              onPress={handleBridge}
              disabled={!isConnected || isBridging || !amount || parseFloat(amount) <= 0 || !quote}
            >
              {isBridging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : !isConnected ? (
                <Text style={styles.bridgeButtonText}>Connect Wallet</Text>
              ) : (
                <View style={styles.bridgeButtonContent}>
                  <Text style={styles.bridgeButtonText}>Bridge {token}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#9ca3af" />
            <Text style={styles.securityText}>Powered by LayerZero for secure cross-chain transfers</Text>
          </View>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Chain Selector Modal */}
        {renderChainSelector()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#f5f3ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  balanceCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  refreshButton: {
    marginLeft: 'auto',
  },
  refreshSpinning: {
    transform: [{ rotate: '360deg' }],
  },
  balanceList: {
    gap: 8,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
  },
  balanceChain: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  balanceValues: {
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  balanceNative: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tokenSelector: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  tokenButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tokenButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tokenButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tokenButtonTextActive: {
    color: '#111827',
  },
  chainSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chainBox: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chainLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chainButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainButtonIconText: {
    fontSize: 18,
  },
  chainButtonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chainButtonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  chainButtonMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  swapButton: {
    alignSelf: 'center',
    marginVertical: -12,
    zIndex: 10,
  },
  swapButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  amountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountToken: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
  },
  recipientToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  recipientToggleText: {
    fontSize: 14,
    color: '#374151',
  },
  recipientSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recipientInput: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#111827',
  },
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quoteLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transactionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
    flex: 1,
  },
  transactionStatus: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e7ff',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  transactionText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  transactionHash: {
    fontSize: 11,
    color: '#6366f1',
    fontFamily: 'monospace',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quoteButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  quoteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  bridgeButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
  },
  bridgeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  bridgeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bottomPadding: {
    height: 32,
  },
  // Chain Selector Modal
  chainSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chainSelector: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  chainSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chainSelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  chainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  chainOptionSelected: {
    backgroundColor: '#eef2ff',
  },
  chainOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainOptionIconText: {
    fontSize: 20,
  },
  chainOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chainOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  chainOptionToken: {
    fontSize: 12,
    color: '#6b7280',
  },
});
