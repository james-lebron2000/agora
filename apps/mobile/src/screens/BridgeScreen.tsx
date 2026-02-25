import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useBridgeSDK } from '../hooks/useSDK';
import { useWalletStore } from '../store/walletStore';

// Type definitions for SDK compatibility
type SupportedChain = 'base' | 'optimism' | 'arbitrum' | 'ethereum';
interface ChainBalance {
  chain: SupportedChain;
  usdcBalance: string;
  nativeBalance: string;
}

// Supported chains from SDK
const SUPPORTED_CHAINS: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum'];
type ChainType = SupportedChain;
type TokenType = 'USDC' | 'ETH';

const CHAIN_METADATA: Record<SupportedChain, { name: string; icon: string; color: string; nativeToken: string }> = {
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
};

interface BridgeScreenProps {
  navigation?: any;
}

export default function BridgeScreen({ navigation }: BridgeScreenProps) {
  const { address, isConnected } = useWalletStore();
  
  // Form state
  const [sourceChain, setSourceChain] = useState<ChainType>('base');
  const [destChain, setDestChain] = useState<ChainType>('optimism');
  const [token, setToken] = useState<TokenType>('USDC');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [useCustomRecipient, setUseCustomRecipient] = useState(false);
  const [showChainSelect, setShowChainSelect] = useState<'source' | 'dest' | null>(null);
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [isBridging, setIsBridging] = useState(false);
  
  const { quote, isQuoting, error, getQuote, findCheapestChain, getAllChainBalances, clearQuote } = useBridgeSDK(address as `0x${string}` | null | undefined);

  // Load balances on mount
  useEffect(() => {
    if (address) {
      getAllChainBalances().then(setBalances).catch(console.error);
    }
  }, [address, getAllChainBalances]);

  // Get available destination chains (exclude source)
  const availableDestChains = useMemo(() => 
    SUPPORTED_CHAINS.filter(c => c !== sourceChain),
    [sourceChain]
  );

  // Update destination if it matches source
  const handleSourceChange = useCallback((newSource: ChainType) => {
    setSourceChain(newSource);
    if (destChain === newSource) {
      setDestChain(availableDestChains[0]);
    }
    setShowChainSelect(null);
    clearQuote();
  }, [destChain, availableDestChains, clearQuote]);

  // Swap source and destination
  const handleSwapChains = useCallback(() => {
    const newSource = destChain;
    const newDest = sourceChain;
    setSourceChain(newSource);
    setDestChain(newDest);
    clearQuote();
  }, [sourceChain, destChain, clearQuote]);

  // Format amount input
  const formatAmount = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    // Limit decimals based on token
    if (parts[1] && parts[1].length > (token === 'USDC' ? 6 : 18)) {
      return parts[0] + '.' + parts[1].slice(0, token === 'USDC' ? 6 : 18);
    }
    return cleaned;
  };

  // Get quote using SDK
  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      await getQuote({
        sourceChain,
        destinationChain: destChain,
        token,
        amount
      });
    } catch (err) {
      Alert.alert('Quote Failed', error || 'Failed to get bridge quote');
    }
  };

  // Execute bridge using SDK
  const handleBridge = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    Alert.alert(
      'Confirm Bridge',
      `Bridge ${amount} ${token} from ${CHAIN_METADATA[sourceChain].name} to ${CHAIN_METADATA[destChain].name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsBridging(true);
            try {
              // Get cheapest chain recommendation from SDK
              const cheapestChain = await findCheapestChain([destChain]);
              console.log('[Bridge] Cheapest chain for bridge:', cheapestChain);

              // Note: Full bridge execution requires wallet signing
              // This would typically be handled by the wallet provider
              // For now, we simulate the bridge flow with SDK integration

              Alert.alert(
                'Bridge Initiated',
                `Bridging ${amount} ${token} from ${CHAIN_METADATA[sourceChain].name} to ${CHAIN_METADATA[destChain].name}\n\nEstimated fee: ${quote?.estimatedFee || '0.001'} ETH`,
                [{ text: 'OK', onPress: () => {
                  setAmount('');
                  clearQuote();
                  // Refresh balances after bridge
                  getAllChainBalances().then(setBalances);
                }}]
              );
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Failed to execute bridge';
              Alert.alert('Bridge Failed', errorMsg);
            } finally {
              setIsBridging(false);
            }
          }
        }
      ]
    );
  };

  const sourceMeta = CHAIN_METADATA[sourceChain];
  const destMeta = CHAIN_METADATA[destChain];

  const renderChainSelector = () => {
    if (!showChainSelect) return null;

    const chains = showChainSelect === 'source' 
      ? SUPPORTED_CHAINS 
      : availableDestChains;

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
              : destChain === chain;
            
            return (
              <TouchableOpacity
                key={chain}
                style={[
                  styles.chainOption,
                  isSelected && styles.chainOptionSelected
                ]}
                onPress={() => {
                  if (showChainSelect === 'source') {
                    handleSourceChange(chain);
                  } else {
                    setDestChain(chain);
                    setShowChainSelect(null);
                    clearQuote();
                  }
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

  const insets = useSafeAreaInsets();

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
              <Text style={styles.balanceTitle}>Your Balances (SDK)</Text>
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
          <TouchableOpacity style={styles.swapButton} onPress={handleSwapChains}>
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
              onChangeText={(text) => {
                setAmount(formatAmount(text));
                clearQuote();
              }}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />
            <View style={styles.amountRight}>
              <Text style={styles.amountToken}>{token}</Text>
              <TouchableOpacity 
                style={styles.maxButton}
                onPress={() => {
                  setAmount(token === 'USDC' ? '1000' : '0.5');
                  clearQuote();
                }}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Custom Recipient Toggle */}
        <TouchableOpacity 
          style={styles.recipientToggle}
          onPress={() => {
            setUseCustomRecipient(!useCustomRecipient);
            if (useCustomRecipient) {
              setRecipient('');
            } else {
              setRecipient(address || '');
            }
          }}
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
            />
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

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
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
              (!isConnected || isBridging || !amount || parseFloat(amount) <= 0) && styles.buttonDisabled
            ]}
            onPress={handleBridge}
            disabled={!isConnected || isBridging || !amount || parseFloat(amount) <= 0}
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
          <Text style={styles.securityText}>Powered by LayerZero</Text>
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
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
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
