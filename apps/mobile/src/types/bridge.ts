/**
 * Mobile Bridge Types for Agora
 * TypeScript type definitions for cross-chain bridge operations
 */

import type { SupportedChain, ChainBalance, BridgeQuote as SDKBridgeQuote, BridgeTransaction as SDKBridgeTransaction } from '@agora/sdk';

// Re-export SDK types for mobile use
export type { SupportedChain, ChainBalance };

// Token types supported for bridging
export type TokenType = 'USDC' | 'ETH';

// Bridge status types
export type BridgeStatus = 
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'approving'
  | 'bridging'
  | 'confirming'
  | 'completed'
  | 'failed';

// Chain metadata for UI display
export interface ChainMetadata {
  name: string;
  icon: string;
  color: string;
  nativeToken: string;
  chainId: number;
  explorerUrl: string;
}

// Bridge quote with mobile-friendly formatting
export interface MobileBridgeQuote {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: TokenType;
  amount: string;
  estimatedFee: string;
  estimatedFeeUSD?: string;
  estimatedTime: string; // Human readable format
  estimatedTimeSeconds: number;
  nativeFee: string;
  lzTokenFee?: string;
  minAmount?: string; // Minimum amount after slippage
  slippage: number;
}

// Bridge transaction with mobile-specific fields
export interface MobileBridgeTransaction {
  id: string;
  txHash: `0x${string}`;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  token: TokenType;
  status: 'pending' | 'source_confirmed' | 'message_sent' | 'message_delivered' | 'completed' | 'failed';
  timestamp: number;
  senderAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  fees?: {
    nativeFee: string;
    lzTokenFee: string;
  };
  // UI progress tracking
  progress: number; // 0-100
  stage: 'source' | 'cross_chain' | 'destination';
  estimatedCompletionTime: number;
  actualCompletionTime?: number;
  errorMessage?: string;
  // Links
  sourceExplorerUrl?: string;
  destinationExplorerUrl?: string;
}

// Bridge history filter
export interface BridgeHistoryFilter {
  chain?: SupportedChain;
  status?: MobileBridgeTransaction['status'];
  startTime?: number;
  endTime?: number;
  token?: TokenType;
}

// Bridge state for UI management
export interface BridgeState {
  status: BridgeStatus;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: TokenType;
  amount: string;
  recipient?: string;
  quote: MobileBridgeQuote | null;
  transaction: MobileBridgeTransaction | null;
  error: string | null;
  balances: ChainBalance[];
}

// Bridge form validation errors
export interface BridgeValidationErrors {
  amount?: string;
  recipient?: string;
  chain?: string;
  general?: string;
}

// Bridge card props
export interface BridgeCardProps {
  onBridgeComplete?: (result: { success: boolean; txHash?: string; error?: string }) => void;
  onBridgeStart?: () => void;
  defaultSourceChain?: SupportedChain;
  defaultDestChain?: SupportedChain;
  defaultToken?: TokenType;
  showBalances?: boolean;
  compact?: boolean;
}

// Transaction status update callback
export type TransactionStatusCallback = (status: {
  progress: number;
  stage: string;
  status: string;
  message?: string;
}) => void;

// Chain selector props
export interface ChainSelectorProps {
  selected: SupportedChain;
  onSelect: (chain: SupportedChain) => void;
  exclude?: SupportedChain[];
  label?: string;
  testID?: string;
}

// Token selector props
export interface TokenSelectorProps {
  selected: TokenType;
  onSelect: (token: TokenType) => void;
  supported?: TokenType[];
}

// Amount input props
export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  token: TokenType;
  balance?: string;
  maxAmount?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

// Fee breakdown for detailed display
export interface FeeBreakdown {
  protocolFee: string;
  gasFee: string;
  bridgeFee: string;
  totalFee: string;
  totalFeeUSD?: string;
}

// Bridge operation result
export interface BridgeOperationResult {
  success: boolean;
  txHash?: string;
  error?: string;
  transaction?: MobileBridgeTransaction;
}
