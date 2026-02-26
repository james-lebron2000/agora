/**
 * Payment Module for Agora SDK
 *
 * Provides USDC and native token transfer functionality on Base network.
 * Supports both mainnet and testnet (Base Sepolia) environments.
 *
 * @module payment
 */
import { type Address, type Chain, type Hash, type Hex } from 'viem';
/** Supported Base network environments */
export type BaseNetwork = 'base' | 'base-sepolia';
/** USDC token decimals (6 for standard USDC) */
export declare const USDC_DECIMALS = 6;
export declare const USDC_ADDRESSES: Record<BaseNetwork, Address>;
/** Options for creating a payment client */
export interface PaymentClientOptions {
    /** Private key for signing transactions */
    privateKey: Hex;
    /** Network to use (base or base-sepolia) */
    network?: BaseNetwork;
    /** Custom chain configuration (overrides network) */
    chain?: Chain;
    /** Custom RPC URL */
    rpcUrl?: string;
    /** Override USDC contract address */
    usdcAddress?: Address;
}
/** Options for approving USDC spending */
export interface ApproveUsdcOptions extends PaymentClientOptions {
    /** Address authorized to spend USDC */
    spender: Address;
    /** Amount to approve */
    amount: bigint | number | string;
    /** Token decimals (default: 6) */
    decimals?: number;
}
/** Options for transferring USDC */
export interface TransferUsdcOptions extends PaymentClientOptions {
    /** Recipient address */
    recipient: Address;
    /** Amount to transfer */
    amount: bigint | number | string;
    /** Token decimals (default: 6) */
    decimals?: number;
}
/** Options for transferring native ETH */
export interface TransferNativeOptions extends PaymentClientOptions {
    /** Recipient address */
    recipient: Address;
    /** Amount to transfer */
    amount: bigint | number | string;
    /** Token decimals (default: 18 for ETH) */
    decimals?: number;
}
/**
 * Resolve the appropriate chain configuration from options
 * @param options - Payment client options
 * @returns Chain configuration
 */
export declare function resolveBaseChain(options: PaymentClientOptions): Chain;
/**
 * Get the USDC contract address for a given chain
 * @param chain - Chain configuration
 * @returns USDC contract address
 * @throws Error if chain is not supported
 */
export declare function getUsdcAddressForChain(chain: Chain): Address;
/**
 * Approve a spender to transfer USDC on behalf of the wallet
 * @param options - Approval options including spender and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await approveUSDC({
 *   privateKey: '0x...',
 *   network: 'base',
 *   spender: '0x...',
 *   amount: 100
 * });
 * ```
 */
export declare function approveUSDC(options: ApproveUsdcOptions): Promise<Hash>;
/**
 * Transfer USDC to a recipient
 * @param options - Transfer options including recipient and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await transferUSDC({
 *   privateKey: '0x...',
 *   network: 'base',
 *   recipient: '0x...',
 *   amount: 50.5
 * });
 * ```
 */
export declare function transferUSDC(options: TransferUsdcOptions): Promise<Hash>;
/**
 * Transfer native ETH to a recipient
 * @param options - Transfer options including recipient and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await transferNative({
 *   privateKey: '0x...',
 *   network: 'base',
 *   recipient: '0x...',
 *   amount: 0.01  // in ETH
 * });
 * ```
 */
export declare function transferNative(options: TransferNativeOptions): Promise<Hash>;
//# sourceMappingURL=payment.d.ts.map