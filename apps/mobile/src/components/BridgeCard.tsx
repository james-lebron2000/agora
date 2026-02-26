/**
 * BridgeCard Component for Agora Mobile
 * Cross-chain bridge operation card with full UI
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useColorScheme,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBridge } from '../hooks/useBridge';
import type { 
  BridgeCardProps, 
  SupportedChain, 
  TokenType,
  ChainMetadata 
} from '../types/bridge';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  SHADOWS,
} from '../constants/theme';

// Chain metadata for UI
const CHAIN_METADATA: Record<SupportedChain, ChainMetadata> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    nativeToken: 'ETH',
    chainId: 1,
    explorerUrl: 'https://etherscan.io'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    nativeToken: 'ETH',
    chainId: 8453,
    explorerUrl: 'https://basescan.org'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    nativeToken: 'ETH',
    chainId: 10,
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    nativeToken: 'ETH',
    chainId: 42161,
    explorerUrl: 'https://arbiscan.io'
  }
};

const SUPPORTED_CHAINS: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum'];

export function BridgeCard({
  onBridgeComplete,
  onBridgeStart,
  defaultSourceChain = 'base',
  defaultDestChain = 'optimism',
  defaultToken = 'USDC',
  showBalances = true,
  compact = false
}: BridgeCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [showChainSelect, setShowChainSelect] = useState<'source' | 'dest' | null>(null);
  
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
    defaultSourceChain,
    defaultDestChain,
    defaultToken
  });

  const theme = {
    background: isDark ? COLORS.gray900 : COLORS.gray50,
    card: isDark ? COLORS.gray800 : COLORS.white,
    text: isDark ? COLORS.gray100 : COLORS.gray900,
    textSecondary: isDark ? COLORS.gray400 : COLORS.gray600,
    border: isDark ? COLORS.gray700 : COLORS.gray200,
    input: isDark ? COLORS.gray700 : COLORS.gray100,
  };

  const handleGetQuote = useCallback(async () => {
    const result = await getQuote();
    if (!result && errors.general) {
      Alert.alert('Quote Failed', errors.general);
    }
  }, [getQuote, errors.general]);

  const handleBridge = useCallback(async () => {
    onBridgeStart?.();
    
    const result = await executeBridge((status) => {
      // Optional: Handle status updates in real-time
      console.log('[BridgeCard] Status update:', status);
    });

    if (result.success) {
      Alert.alert(
        'Bridge Initiated',
        `Transaction: ${result.txHash?.slice(0, 20)}...`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Bridge Failed', result.error || 'Unknown error');
    }

    onBridgeComplete?.(result);
  }, [executeBridge, onBridgeStart, onBridgeComplete]);

  const sourceMeta = CHAIN_METADATA[sourceChain];
  const destMeta = CHAIN_METADATA[destinationChain];
  const availableBalance = getBalanceForChain(sourceChain, token);

  // Compact view
  if (compact) {
    return (
      <View style={[styles.compactCard, { backgroundColor: theme.card }]}>
        <View style={styles.compactHeader}>
          <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
          <Text style={[styles.compactTitle, { color: theme.text }]}>
            Bridge {token}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowChainSelect('source')}
          style={[styles.compactChain, { borderColor: theme.border }]}
        >
          <Text style={{ fontSize: 16 }}>{sourceMeta.icon}</Text>
          <Text style={[styles.compactChainText, { color: theme.text }]}>
            {sourceMeta.name}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          <Text style={{ fontSize: 16 }}>{destMeta.icon}</Text>
          <Text style={[styles.compactChainText, { color: theme.text }]}>
            {destMeta.name}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderChainSelector = () => {
    if (!showChainSelect) return null;

    const chains = showChainSelect === 'source' 
      ? SUPPORTED_CHAINS 
      : SUPPORTED_CHAINS.filter(c => c !== sourceChain);

    return (
      <View style={styles.chainSelectorOverlay}>
        <View style={[styles.chainSelector, { backgroundColor: theme.card }]}>
          <View style={[styles.chainSelectorHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.chainSelectorTitle, { color: theme.text }]}>
              Select {showChainSelect === 'source' ? 'Source' : 'Destination'} Chain
            </Text>
            <TouchableOpacity onPress={() => setShowChainSelect(null)}>
              <Ionicons name="close" size={24} color={theme.text} />
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
                  isSelected && { backgroundColor: `${COLORS.primary}20` }
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
                  <Text style={[styles.chainOptionName, { color: theme.text }]}>
                    {meta.name}
                  </Text>
                  <Text style={[styles.chainOptionToken, { color: theme.textSecondary }]}>
                    {meta.nativeToken}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: `${COLORS.primary}10` }]}>
        <View style={styles.headerIcon}>
          <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Cross-Chain Bridge
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Transfer assets across L2 networks
          </Text>
        </View>
      </View>

      {/* Token Selection */}
      <View style={[styles.tokenSelector, { backgroundColor: theme.input }]}>
        {(['USDC', 'ETH'] as TokenType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tokenButton,
              token === t && { 
                backgroundColor: theme.card,
                ...SHADOWS.sm
              }
            ]}
            onPress={() => {
              setToken(t);
              clearQuote();
            }}
          >
            <Text style={[
              styles.tokenButtonText,
              { color: token === t ? theme.text : theme.textSecondary }
            ]}>
              {t === 'USDC' ? '💲 USDC' : '♦ ETH'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Balance Display */}
      {showBalances && (
        <View style={[styles.balanceCard, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}30` }]}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.balanceTitle, { color: COLORS.primary }]}>
              Available Balance
            </Text>
            <TouchableOpacity onPress={refreshBalances} style={styles.refreshIcon}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.balanceValue, { color: theme.text }]}>
            {parseFloat(availableBalance).toFixed(4)} {token}
          </Text>
          <Text style={[styles.balanceChain, { color: theme.textSecondary }]}>
            on {sourceMeta.name}
          </Text>
        </View>
      )}

      {/* Chain Selection */}
      <View style={styles.chainSection}>
        {/* Source Chain */}
        <View style={[styles.chainBox, { backgroundColor: theme.input }]}>
          <Text style={[styles.chainLabel, { color: theme.textSecondary }]}>From</Text>
          <TouchableOpacity
            style={[styles.chainButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowChainSelect('source')}
          >
            <View style={[styles.chainButtonIcon, { backgroundColor: `${sourceMeta.color}20` }]}>
              <Text style={styles.chainButtonIconText}>{sourceMeta.icon}</Text>
            </View>
            <View style={styles.chainButtonInfo}>
              <Text style={[styles.chainButtonName, { color: theme.text }]}>
                {sourceMeta.name}
              </Text>
              <Text style={[styles.chainButtonMeta, { color: theme.textSecondary }]}>
                {sourceMeta.nativeToken} Network
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={swapChains}>
          <View style={[styles.swapButtonInner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Destination Chain */}
        <View style={[styles.chainBox, { backgroundColor: theme.input }]}>
          <Text style={[styles.chainLabel, { color: theme.textSecondary }]}>To</Text>
          <TouchableOpacity
            style={[styles.chainButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowChainSelect('dest')}
          >
            <View style={[styles.chainButtonIcon, { backgroundColor: `${destMeta.color}20` }]}>
              <Text style={styles.chainButtonIconText}>{destMeta.icon}</Text>
            </View>
            <View style={styles.chainButtonInfo}>
              <Text style={[styles.chainButtonName, { color: theme.text }]}>
                {destMeta.name}
              </Text>
              <Text style={[styles.chainButtonMeta, { color: theme.textSecondary }]}>
                {destMeta.nativeToken} Network
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.amountSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: theme.card, borderColor: errors.amount ? COLORS.error : theme.border }]}>
          <TextInput
            style={[styles.amountInput, { color: theme.text }]}
            value={amount}
            onChangeText={(text) => setAmount(text)}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            editable={!isBridging}
          />
          <View style={styles.amountRight}>
            <Text style={[styles.amountToken, { color: theme.textSecondary }]}>{token}</Text>
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
          useCustomRecipient && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
        ]}>
          {useCustomRecipient && (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          )}
        </View>
        <Text style={[styles.recipientToggleText, { color: theme.text }]}>
          Send to a different address
        </Text>
      </TouchableOpacity>

      {/* Custom Recipient Input */}
      {useCustomRecipient && (
        <View style={styles.recipientSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Recipient Address
          </Text>
          <TextInput
            style={[styles.recipientInput, { 
              backgroundColor: theme.card, 
              borderColor: errors.recipient ? COLORS.error : theme.border,
              color: theme.text
            }]}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="0x..."
            placeholderTextColor={theme.textSecondary}
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
        <View style={[styles.quoteCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <View style={styles.quoteRow}>
            <Text style={[styles.quoteLabel, { color: theme.textSecondary }]}>Estimated Fee</Text>
            <Text style={[styles.quoteValue, { color: theme.text }]}>
              {quote.estimatedFee} ETH
            </Text>
          </View>
          <View style={styles.quoteRow}>
            <Text style={[styles.quoteLabel, { color: theme.textSecondary }]}>Estimated Time</Text>
            <View style={styles.quoteTime}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.quoteValue, { color: theme.text }]}>
                {quote.estimatedTime}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Error Display */}
      {errors.general && (
        <View style={[styles.errorCard, { backgroundColor: `${COLORS.error}10` }]}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={[styles.errorCardText, { color: COLORS.error }]}>
            {errors.general}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.quoteButton,
            { backgroundColor: theme.input },
            (!amount || parseFloat(amount) <= 0 || isQuoting) && styles.buttonDisabled
          ]}
          onPress={handleGetQuote}
          disabled={!amount || parseFloat(amount) <= 0 || isQuoting}
        >
          {isQuoting ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={[styles.quoteButtonText, { color: theme.text }]}>
              Get Quote
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bridgeButton,
            { backgroundColor: COLORS.primary },
            (isBridging || !amount || parseFloat(amount) <= 0 || !quote) && styles.buttonDisabled
          ]}
          onPress={handleBridge}
          disabled={isBridging || !amount || parseFloat(amount) <= 0 || !quote}
        >
          {isBridging ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.bridgeButtonContent}>
              <Text style={styles.bridgeButtonText}>Bridge {token}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={16} color={theme.textSecondary} />
        <Text style={[styles.securityText, { color: theme.textSecondary }]}>
          Powered by LayerZero
        </Text>
      </View>

      {/* Chain Selector Modal */}
      {renderChainSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  compactCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  compactTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  compactChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  compactChainText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  tokenSelector: {
    flexDirection: 'row',
    margin: SPACING.md,
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  tokenButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  tokenButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  balanceCard: {
    margin: SPACING.md,
    marginTop: 0,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  refreshIcon: {
    marginLeft: 'auto',
    padding: SPACING.xs,
  },
  balanceTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  balanceChain: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  chainSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  chainBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  chainLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  chainButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainButtonIconText: {
    fontSize: 20,
  },
  chainButtonInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  chainButtonName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  chainButtonMeta: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  swapButton: {
    alignSelf: 'center',
    marginVertical: -SPACING.md,
    zIndex: 10,
  },
  swapButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  amountSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  amountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  amountToken: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  maxButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  maxButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  recipientToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientToggleText: {
    fontSize: FONT_SIZE.md,
  },
  recipientSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  recipientInput: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  quoteCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  quoteLabel: {
    fontSize: FONT_SIZE.md,
  },
  quoteValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  quoteTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  errorCardText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  quoteButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  quoteButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  bridgeButton: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  bridgeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bridgeButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  securityText: {
    fontSize: FONT_SIZE.sm,
  },
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
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '70%',
  },
  chainSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  chainSelectorTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  chainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  chainOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainOptionIconText: {
    fontSize: 24,
  },
  chainOptionInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  chainOptionName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  chainOptionToken: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
});

export default BridgeCard;
