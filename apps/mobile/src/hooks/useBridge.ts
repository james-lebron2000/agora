/**
 * useBridge Hook for Agora Mobile
 * React hook for managing bridge operations with SDK integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Address } from 'viem';
import {
  type SupportedChain,
  type ChainBalance,
  getAllBalances,
  getBridgeQuote as sdkGetBridgeQuote,
  estimateBridgeFee as sdkEstimateBridgeFee,
  findCheapestChain as sdkFindCheapestChain,
  type BridgeQuote as SDKBridgeQuote,
  type BridgeFeeEstimate,
  BridgeTransactionMonitor,
  type BridgeTransactionStatusDetails
} from '@agora/sdk/bridge';
import {
  type MobileBridgeQuote,
  type MobileBridgeTransaction,
  type BridgeStatus,
  type BridgeValidationErrors,
  type TransactionStatusCallback,
  type BridgeOperationResult,
  type TokenType
} from '../types/bridge';

// Format time from seconds to human readable
function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.ceil(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

// Convert SDK quote to mobile quote
function convertToMobileQuote(
  sdkQuote: SDKBridgeQuote,
  token: TokenType
): MobileBridgeQuote {
  return {
    sourceChain: sdkQuote.sourceChain,
    destinationChain: sdkQuote.destinationChain,
    token,
    amount: sdkQuote.amount,
    estimatedFee: sdkQuote.estimatedFee,
    estimatedTime: formatEstimatedTime(sdkQuote.estimatedTime),
    estimatedTimeSeconds: sdkQuote.estimatedTime,
    nativeFee: sdkQuote.lzFee?.nativeFee?.toString() || sdkQuote.estimatedFee,
    lzTokenFee: sdkQuote.lzFee?.lzTokenFee?.toString() || '0',
    slippage: 0.005, // 0.5% default slippage
  };
}

interface UseBridgeOptions {
  address?: Address | null;
  defaultSourceChain?: SupportedChain;
  defaultDestChain?: SupportedChain;
  defaultToken?: TokenType;
  autoRefreshBalances?: boolean;
  refreshInterval?: number;
}

interface UseBridgeReturn {
  // State
  status: BridgeStatus;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: TokenType;
  amount: string;
  recipient: string;
  useCustomRecipient: boolean;
  quote: MobileBridgeQuote | null;
  feeEstimate: BridgeFeeEstimate | null;
  transaction: MobileBridgeTransaction | null;
  balances: ChainBalance[];
  errors: BridgeValidationErrors;
  
  // Loading states
  isQuoting: boolean;
  isBridging: boolean;
  isLoadingBalances: boolean;
  
  // Actions
  setSourceChain: (chain: SupportedChain) => void;
  setDestinationChain: (chain: SupportedChain) => void;
  setToken: (token: TokenType) => void;
  setAmount: (amount: string) => void;
  setRecipient: (recipient: string) => void;
  setUseCustomRecipient: (use: boolean) => void;
  swapChains: () => void;
  getQuote: () => Promise<MobileBridgeQuote | null>;
  estimateFees: () => Promise<BridgeFeeEstimate | null>;
  executeBridge: (statusCallback?: TransactionStatusCallback) => Promise<BridgeOperationResult>;
  clearQuote: () => void;
  clearErrors: () => void;
  refreshBalances: () => Promise<void>;
  findCheapestChain: (excludeChains?: SupportedChain[]) => Promise<{ chain: SupportedChain; estimatedCost: string }>;
  
  // Validation
  validateForm: () => boolean;
  
  // Helpers
  getBalanceForChain: (chain: SupportedChain, token: TokenType) => string;
  formatAmount: (value: string) => string;
}

export function useBridge(options: UseBridgeOptions = {}): UseBridgeReturn {
  const {
    address,
    defaultSourceChain = 'base',
    defaultDestChain = 'optimism',
    defaultToken = 'USDC',
    autoRefreshBalances = true,
    refreshInterval = 30000
  } = options;

  // State
  const [status, setStatus] = useState<BridgeStatus>('idle');
  const [sourceChain, setSourceChainState] = useState<SupportedChain>(defaultSourceChain);
  const [destinationChain, setDestinationChainState] = useState<SupportedChain>(defaultDestChain);
  const [token, setTokenState] = useState<TokenType>(defaultToken);
  const [amount, setAmountState] = useState('');
  const [recipient, setRecipientState] = useState('');
  const [useCustomRecipient, setUseCustomRecipientState] = useState(false);
  const [quote, setQuote] = useState<MobileBridgeQuote | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<BridgeFeeEstimate | null>(null);
  const [transaction, setTransaction] = useState<MobileBridgeTransaction | null>(null);
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [errors, setErrors] = useState<BridgeValidationErrors>({});
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const monitorRef = useRef<BridgeTransactionMonitor | null>(null);

  // Format amount input
  const formatAmount = useCallback((value: string): string => {
    // Remove non-numeric characters except decimal point
    let cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places based on token
    const decimals = token === 'USDC' ? 6 : 18;
    if (parts[1] && parts[1].length > decimals) {
      cleaned = parts[0] + '.' + parts[1].slice(0, decimals);
    }
    
    return cleaned;
  }, [token]);

  // Get balance for specific chain and token
  const getBalanceForChain = useCallback((chain: SupportedChain, tokenType: TokenType): string => {
    const balance = balances.find(b => b.chain === chain);
    if (!balance) return '0';
    return tokenType === 'USDC' ? balance.usdcBalance : balance.nativeBalance;
  }, [balances]);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!address) return;
    
    setIsLoadingBalances(true);
    try {
      const allBalances = await getAllBalances(address);
      setBalances(allBalances);
    } catch (error) {
      console.error('[useBridge] Failed to fetch balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [address]);

  // Auto-refresh balances
  useEffect(() => {
    if (autoRefreshBalances && address) {
      refreshBalances();
      const interval = setInterval(refreshBalances, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefreshBalances, address, refreshBalances, refreshInterval]);

  // Set source chain with validation
  const setSourceChain = useCallback((chain: SupportedChain) => {
    setSourceChainState(chain);
    // If destination is same as source, switch destination
    if (chain === destinationChain) {
      const availableChains: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum'];
      const newDest = availableChains.find(c => c !== chain) || 'optimism';
      setDestinationChainState(newDest);
    }
    setQuote(null);
    setFeeEstimate(null);
    setErrors(prev => ({ ...prev, chain: undefined }));
  }, [destinationChain]);

  // Set destination chain
  const setDestinationChain = useCallback((chain: SupportedChain) => {
    setDestinationChainState(chain);
    setQuote(null);
    setFeeEstimate(null);
  }, []);

  // Set token
  const setToken = useCallback((newToken: TokenType) => {
    setTokenState(newToken);
    setQuote(null);
    setFeeEstimate(null);
  }, []);

  // Set amount with formatting
  const setAmount = useCallback((value: string) => {
    const formatted = formatAmount(value);
    setAmountState(formatted);
    setQuote(null);
    setFeeEstimate(null);
    setErrors(prev => ({ ...prev, amount: undefined }));
  }, [formatAmount]);

  // Set recipient
  const setRecipient = useCallback((value: string) => {
    setRecipientState(value);
    setErrors(prev => ({ ...prev, recipient: undefined }));
  }, []);

  // Set use custom recipient
  const setUseCustomRecipient = useCallback((use: boolean) => {
    setUseCustomRecipientState(use);
    if (!use) {
      setRecipient('');
    } else if (address) {
      setRecipient(address);
    }
  }, [address]);

  // Swap source and destination
  const swapChains = useCallback(() => {
    const newSource = destinationChain;
    const newDest = sourceChain;
    setSourceChainState(newSource);
    setDestinationChainState(newDest);
    setQuote(null);
    setFeeEstimate(null);
  }, [sourceChain, destinationChain]);

  // Clear quote
  const clearQuote = useCallback(() => {
    setQuote(null);
    setFeeEstimate(null);
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: BridgeValidationErrors = {};

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else {
      const balance = parseFloat(getBalanceForChain(sourceChain, token));
      if (amountNum > balance) {
        newErrors.amount = `Insufficient balance. Max: ${balance.toFixed(4)} ${token}`;
      }
    }

    // Validate recipient if custom
    if (useCustomRecipient && recipient) {
      if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        newErrors.recipient = 'Invalid Ethereum address';
      }
    }

    // Validate chains
    if (sourceChain === destinationChain) {
      newErrors.chain = 'Source and destination must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amount, sourceChain, destinationChain, token, useCustomRecipient, recipient, getBalanceForChain]);

  // Get quote from SDK
  const getQuote = useCallback(async (): Promise<MobileBridgeQuote | null> => {
    if (!address || !validateForm()) return null;

    setIsQuoting(true);
    setStatus('quoting');
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const sdkQuote = await sdkGetBridgeQuote({
        sourceChain,
        destinationChain,
        token,
        amount
      }, address);

      const mobileQuote = convertToMobileQuote(sdkQuote, token);
      setQuote(mobileQuote);
      setStatus('quoted');
      return mobileQuote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get quote';
      setErrors(prev => ({ ...prev, general: message }));
      setStatus('idle');
      return null;
    } finally {
      setIsQuoting(false);
    }
  }, [address, sourceChain, destinationChain, token, amount, validateForm]);

  // Estimate fees
  const estimateFees = useCallback(async (): Promise<BridgeFeeEstimate | null> => {
    if (!address) return null;

    try {
      const estimate = await sdkEstimateBridgeFee({
        sourceChain,
        destinationChain,
        token,
        amount,
        senderAddress: address
      });
      setFeeEstimate(estimate);
      return estimate;
    } catch (error) {
      console.error('[useBridge] Failed to estimate fees:', error);
      return null;
    }
  }, [address, sourceChain, destinationChain, token, amount]);

  // Find cheapest chain
  const findCheapestChain = useCallback(async (excludeChains?: SupportedChain[]) => {
    return sdkFindCheapestChain('send', excludeChains);
  }, []);

  // Execute bridge
  // TODO: 当前为 mock 实现，需要集成真实钱包签名和链上执行
  const executeBridge = useCallback(async (
    statusCallback?: TransactionStatusCallback
  ): Promise<BridgeOperationResult> => {
    if (!address || !validateForm()) {
      return { success: false, error: 'Validation failed' };
    }

    setIsBridging(true);
    setStatus('bridging');

    try {
      // Simulate bridge execution delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock transaction hash
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}` as `0x${string}`;

      const now = Date.now();
      const mockTransaction: MobileBridgeTransaction = {
        id: `tx-${now}`,
        txHash: mockTxHash,
        sourceChain,
        destinationChain,
        amount,
        token,
        status: 'pending',
        timestamp: now,
        senderAddress: address,
        recipientAddress: (useCustomRecipient && recipient ? recipient : address) as `0x${string}`,
        progress: 0,
        stage: 'source',
        estimatedCompletionTime: now + 60000,
        fees: quote ? {
          nativeFee: quote.nativeFee,
          lzTokenFee: quote.lzTokenFee || '0'
        } : undefined,
        sourceExplorerUrl: `https://${sourceChain}.etherscan.io/tx/${mockTxHash}`,
        destinationExplorerUrl: `https://${destinationChain}.etherscan.io/tx/${mockTxHash}`
      };

      setTransaction(mockTransaction);
      setStatus('confirming');

      // Simulate progress updates
      const stages: Array<{
        progress: number;
        stage: MobileBridgeTransaction['stage'];
        status: MobileBridgeTransaction['status'];
        message: string;
      }> = [
        { progress: 25, stage: 'source', status: 'pending', message: 'Waiting for source confirmation...' },
        { progress: 50, stage: 'cross_chain', status: 'source_confirmed', message: 'Bridge in progress...' },
        { progress: 75, stage: 'cross_chain', status: 'message_sent', message: 'Waiting for destination...' },
        { progress: 100, stage: 'destination', status: 'completed', message: 'Bridge completed!' }
      ];

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setTransaction(prev => prev ? { ...prev, ...stage } : null);
        statusCallback?.(stage);
      }

      setStatus('completed');
      setAmount('');
      clearQuote();

      return {
        success: true,
        txHash: mockTxHash,
        transaction: mockTransaction
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bridge failed';
      setErrors(prev => ({ ...prev, general: message }));
      setStatus('failed');
      return { success: false, error: message };
    } finally {
      setIsBridging(false);
    }
  }, [address, validateForm, sourceChain, destinationChain, amount, token, useCustomRecipient, recipient, quote, clearQuote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      monitorRef.current?.stopAllMonitoring();
    };
  }, []);

  return {
    status,
    sourceChain,
    destinationChain,
    token,
    amount,
    recipient,
    useCustomRecipient,
    quote,
    feeEstimate,
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
    estimateFees,
    executeBridge,
    clearQuote,
    clearErrors,
    refreshBalances,
    findCheapestChain,
    validateForm,
    getBalanceForChain,
    formatAmount
  };
}

export default useBridge;
