/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, Arbitrum, Polygon, Avalanche, and BSC chains
 * Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)
 * Features: Multi-token bridging, batch operations, cross-chain messaging, optimal route finding
 */
import { type Hex, type Address } from 'viem';
import { EventEmitter } from 'events';
export type BridgeEventType = 'quoteReceived' | 'transactionSent' | 'transactionConfirmed' | 'transactionFailed' | 'approvalRequired' | 'approvalConfirmed' | 'balanceInsufficient' | 'feeEstimated' | 'monitoringStarted' | 'monitorStatusUpdate' | 'monitorCompleted' | 'monitorFailed';
export interface BridgeQuoteEvent {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    amount: string;
    estimatedFee: string;
    estimatedTime: number;
}
export interface BridgeTransactionEvent {
    txHash: Hex;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    amount: string;
    token: SupportedToken;
    timestamp: number;
}
export interface BridgeErrorEvent {
    error: string;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    amount: string;
    token: SupportedToken;
}
export interface BridgeFeeEvent {
    nativeFee: string;
    lzTokenFee: string;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
}
export interface BridgeMonitoringEvent {
    txHash: Hex;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
}
export interface BridgeMonitoringStatusEvent extends BridgeTransactionStatusDetails {
}
export interface BridgeMonitoringFailedEvent {
    status: BridgeTransactionStatusDetails;
    error: BridgeError;
}
export type BridgeEventData = BridgeQuoteEvent | BridgeTransactionEvent | BridgeErrorEvent | BridgeFeeEvent | BridgeMonitoringEvent | BridgeMonitoringStatusEvent | BridgeMonitoringFailedEvent | {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    amount: string;
    token: SupportedToken;
};
export declare const SUPPORTED_CHAINS: {
    readonly base: {
        blockExplorers: {
            readonly default: {
                readonly name: "Basescan";
                readonly url: "https://basescan.org";
                readonly apiUrl: "https://api.basescan.org/api";
            };
        };
        blockTime: 2000;
        contracts: {
            readonly disputeGameFactory: {
                readonly 1: {
                    readonly address: "0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e";
                };
            };
            readonly l2OutputOracle: {
                readonly 1: {
                    readonly address: "0x56315b90c40730925ec5485cf004d835058518A0";
                };
            };
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 5022;
            };
            readonly portal: {
                readonly 1: {
                    readonly address: "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e";
                    readonly blockCreated: 17482143;
                };
            };
            readonly l1StandardBridge: {
                readonly 1: {
                    readonly address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
                    readonly blockCreated: 17482143;
                };
            };
            readonly gasPriceOracle: {
                readonly address: "0x420000000000000000000000000000000000000F";
            };
            readonly l1Block: {
                readonly address: "0x4200000000000000000000000000000000000015";
            };
            readonly l2CrossDomainMessenger: {
                readonly address: "0x4200000000000000000000000000000000000007";
            };
            readonly l2Erc721Bridge: {
                readonly address: "0x4200000000000000000000000000000000000014";
            };
            readonly l2StandardBridge: {
                readonly address: "0x4200000000000000000000000000000000000010";
            };
            readonly l2ToL1MessagePasser: {
                readonly address: "0x4200000000000000000000000000000000000016";
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 8453;
        name: "Base";
        nativeCurrency: {
            readonly name: "Ether";
            readonly symbol: "ETH";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://mainnet.base.org"];
            };
        };
        sourceId: 1;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters: {
            readonly block: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcBlock, action?: string | undefined) => {
                    baseFeePerGas: bigint | null;
                    blobGasUsed: bigint;
                    difficulty: bigint;
                    excessBlobGas: bigint;
                    extraData: import("viem").Hex;
                    gasLimit: bigint;
                    gasUsed: bigint;
                    hash: `0x${string}` | null;
                    logsBloom: `0x${string}` | null;
                    miner: import("abitype").Address;
                    mixHash: import("viem").Hash;
                    nonce: `0x${string}` | null;
                    number: bigint | null;
                    parentBeaconBlockRoot?: `0x${string}` | undefined;
                    parentHash: import("viem").Hash;
                    receiptsRoot: import("viem").Hex;
                    sealFields: import("viem").Hex[];
                    sha3Uncles: import("viem").Hash;
                    size: bigint;
                    stateRoot: import("viem").Hash;
                    timestamp: bigint;
                    totalDifficulty: bigint | null;
                    transactions: `0x${string}`[] | import("viem/chains").OpStackTransaction<boolean>[];
                    transactionsRoot: import("viem").Hash;
                    uncles: import("viem").Hash[];
                    withdrawals?: import("viem").Withdrawal[] | undefined | undefined;
                    withdrawalsRoot?: `0x${string}` | undefined;
                } & {};
                type: "block";
            };
            readonly transaction: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcTransaction, action?: string | undefined) => ({
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: boolean;
                    mint?: bigint | undefined | undefined;
                    sourceHash: import("viem").Hex;
                    type: "deposit";
                } | {
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    v: bigint;
                    to: import("abitype").Address | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    nonce: number;
                    value: bigint;
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    accessList?: undefined | undefined;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId?: number | undefined;
                    yParity?: undefined | undefined;
                    type: "legacy";
                    gasPrice: bigint;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas?: undefined | undefined;
                    maxPriorityFeePerGas?: undefined | undefined;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip2930";
                    gasPrice: bigint;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas?: undefined | undefined;
                    maxPriorityFeePerGas?: undefined | undefined;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip1559";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes: readonly import("viem").Hex[];
                    chainId: number;
                    type: "eip4844";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas: bigint;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList: import("viem").SignedAuthorizationList;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip7702";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                }) & {};
                type: "transaction";
            };
            readonly transactionReceipt: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcTransactionReceipt, action?: string | undefined) => {
                    blobGasPrice?: bigint | undefined;
                    blobGasUsed?: bigint | undefined;
                    blockHash: import("viem").Hash;
                    blockNumber: bigint;
                    contractAddress: import("abitype").Address | null | undefined;
                    cumulativeGasUsed: bigint;
                    effectiveGasPrice: bigint;
                    from: import("abitype").Address;
                    gasUsed: bigint;
                    logs: import("viem").Log<bigint, number, false>[];
                    logsBloom: import("viem").Hex;
                    root?: `0x${string}` | undefined;
                    status: "success" | "reverted";
                    to: import("abitype").Address | null;
                    transactionHash: import("viem").Hash;
                    transactionIndex: number;
                    type: import("viem").TransactionType;
                    l1GasPrice: bigint | null;
                    l1GasUsed: bigint | null;
                    l1Fee: bigint | null;
                    l1FeeScalar: number | null;
                } & {};
                type: "transactionReceipt";
            };
        };
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers: {
            readonly transaction: typeof import("viem/chains").serializeTransactionOpStack;
        };
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly optimism: {
        blockExplorers: {
            readonly default: {
                readonly name: "Optimism Explorer";
                readonly url: "https://optimistic.etherscan.io";
                readonly apiUrl: "https://api-optimistic.etherscan.io/api";
            };
        };
        blockTime: 2000;
        contracts: {
            readonly disputeGameFactory: {
                readonly 1: {
                    readonly address: "0xe5965Ab5962eDc7477C8520243A95517CD252fA9";
                };
            };
            readonly l2OutputOracle: {
                readonly 1: {
                    readonly address: "0xdfe97868233d1aa22e815a266982f2cf17685a27";
                };
            };
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 4286263;
            };
            readonly portal: {
                readonly 1: {
                    readonly address: "0xbEb5Fc579115071764c7423A4f12eDde41f106Ed";
                };
            };
            readonly l1StandardBridge: {
                readonly 1: {
                    readonly address: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1";
                };
            };
            readonly gasPriceOracle: {
                readonly address: "0x420000000000000000000000000000000000000F";
            };
            readonly l1Block: {
                readonly address: "0x4200000000000000000000000000000000000015";
            };
            readonly l2CrossDomainMessenger: {
                readonly address: "0x4200000000000000000000000000000000000007";
            };
            readonly l2Erc721Bridge: {
                readonly address: "0x4200000000000000000000000000000000000014";
            };
            readonly l2StandardBridge: {
                readonly address: "0x4200000000000000000000000000000000000010";
            };
            readonly l2ToL1MessagePasser: {
                readonly address: "0x4200000000000000000000000000000000000016";
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 10;
        name: "OP Mainnet";
        nativeCurrency: {
            readonly name: "Ether";
            readonly symbol: "ETH";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://mainnet.optimism.io"];
            };
        };
        sourceId: 1;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters: {
            readonly block: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcBlock, action?: string | undefined) => {
                    baseFeePerGas: bigint | null;
                    blobGasUsed: bigint;
                    difficulty: bigint;
                    excessBlobGas: bigint;
                    extraData: import("viem").Hex;
                    gasLimit: bigint;
                    gasUsed: bigint;
                    hash: `0x${string}` | null;
                    logsBloom: `0x${string}` | null;
                    miner: import("abitype").Address;
                    mixHash: import("viem").Hash;
                    nonce: `0x${string}` | null;
                    number: bigint | null;
                    parentBeaconBlockRoot?: `0x${string}` | undefined;
                    parentHash: import("viem").Hash;
                    receiptsRoot: import("viem").Hex;
                    sealFields: import("viem").Hex[];
                    sha3Uncles: import("viem").Hash;
                    size: bigint;
                    stateRoot: import("viem").Hash;
                    timestamp: bigint;
                    totalDifficulty: bigint | null;
                    transactions: `0x${string}`[] | import("viem/chains").OpStackTransaction<boolean>[];
                    transactionsRoot: import("viem").Hash;
                    uncles: import("viem").Hash[];
                    withdrawals?: import("viem").Withdrawal[] | undefined | undefined;
                    withdrawalsRoot?: `0x${string}` | undefined;
                } & {};
                type: "block";
            };
            readonly transaction: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcTransaction, action?: string | undefined) => ({
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: boolean;
                    mint?: bigint | undefined | undefined;
                    sourceHash: import("viem").Hex;
                    type: "deposit";
                } | {
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    v: bigint;
                    to: import("abitype").Address | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    nonce: number;
                    value: bigint;
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    accessList?: undefined | undefined;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId?: number | undefined;
                    yParity?: undefined | undefined;
                    type: "legacy";
                    gasPrice: bigint;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas?: undefined | undefined;
                    maxPriorityFeePerGas?: undefined | undefined;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip2930";
                    gasPrice: bigint;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas?: undefined | undefined;
                    maxPriorityFeePerGas?: undefined | undefined;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip1559";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList?: undefined | undefined;
                    blobVersionedHashes: readonly import("viem").Hex[];
                    chainId: number;
                    type: "eip4844";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas: bigint;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                } | {
                    blockHash: `0x${string}` | null;
                    blockNumber: bigint | null;
                    from: import("abitype").Address;
                    gas: bigint;
                    hash: import("viem").Hash;
                    input: import("viem").Hex;
                    nonce: number;
                    r: import("viem").Hex;
                    s: import("viem").Hex;
                    to: import("abitype").Address | null;
                    transactionIndex: number | null;
                    typeHex: import("viem").Hex | null;
                    v: bigint;
                    value: bigint;
                    yParity: number;
                    accessList: import("viem").AccessList;
                    authorizationList: import("viem").SignedAuthorizationList;
                    blobVersionedHashes?: undefined | undefined;
                    chainId: number;
                    type: "eip7702";
                    gasPrice?: undefined | undefined;
                    maxFeePerBlobGas?: undefined | undefined;
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                    isSystemTx?: undefined | undefined;
                    mint?: undefined | undefined;
                    sourceHash?: undefined | undefined;
                }) & {};
                type: "transaction";
            };
            readonly transactionReceipt: {
                exclude: [] | undefined;
                format: (args: import("viem/chains").OpStackRpcTransactionReceipt, action?: string | undefined) => {
                    blobGasPrice?: bigint | undefined;
                    blobGasUsed?: bigint | undefined;
                    blockHash: import("viem").Hash;
                    blockNumber: bigint;
                    contractAddress: import("abitype").Address | null | undefined;
                    cumulativeGasUsed: bigint;
                    effectiveGasPrice: bigint;
                    from: import("abitype").Address;
                    gasUsed: bigint;
                    logs: import("viem").Log<bigint, number, false>[];
                    logsBloom: import("viem").Hex;
                    root?: `0x${string}` | undefined;
                    status: "success" | "reverted";
                    to: import("abitype").Address | null;
                    transactionHash: import("viem").Hash;
                    transactionIndex: number;
                    type: import("viem").TransactionType;
                    l1GasPrice: bigint | null;
                    l1GasUsed: bigint | null;
                    l1Fee: bigint | null;
                    l1FeeScalar: number | null;
                } & {};
                type: "transactionReceipt";
            };
        };
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers: {
            readonly transaction: typeof import("viem/chains").serializeTransactionOpStack;
        };
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly arbitrum: {
        blockExplorers: {
            readonly default: {
                readonly name: "Arbiscan";
                readonly url: "https://arbiscan.io";
                readonly apiUrl: "https://api.arbiscan.io/api";
            };
        };
        blockTime: 250;
        contracts: {
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 7654707;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 42161;
        name: "Arbitrum One";
        nativeCurrency: {
            readonly name: "Ether";
            readonly symbol: "ETH";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://arb1.arbitrum.io/rpc"];
            };
        };
        sourceId?: number | undefined | undefined;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters?: undefined;
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly ethereum: {
        blockExplorers: {
            readonly default: {
                readonly name: "Etherscan";
                readonly url: "https://etherscan.io";
                readonly apiUrl: "https://api.etherscan.io/api";
            };
        };
        blockTime: 12000;
        contracts: {
            readonly ensUniversalResolver: {
                readonly address: "0xeeeeeeee14d718c2b47d9923deab1335e144eeee";
                readonly blockCreated: 23085558;
            };
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 14353601;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 1;
        name: "Ethereum";
        nativeCurrency: {
            readonly name: "Ether";
            readonly symbol: "ETH";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://eth.merkle.io"];
            };
        };
        sourceId?: number | undefined | undefined;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters?: undefined;
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly polygon: {
        blockExplorers: {
            readonly default: {
                readonly name: "PolygonScan";
                readonly url: "https://polygonscan.com";
                readonly apiUrl: "https://api.etherscan.io/v2/api";
            };
        };
        blockTime: 2000;
        contracts: {
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 25770160;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 137;
        name: "Polygon";
        nativeCurrency: {
            readonly name: "POL";
            readonly symbol: "POL";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://polygon-rpc.com"];
            };
        };
        sourceId?: number | undefined | undefined;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters?: undefined;
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly avalanche: {
        blockExplorers: {
            readonly default: {
                readonly name: "SnowTrace";
                readonly url: "https://snowtrace.io";
                readonly apiUrl: "https://api.snowtrace.io";
            };
        };
        blockTime: 1700;
        contracts: {
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 11907934;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 43114;
        name: "Avalanche";
        nativeCurrency: {
            readonly decimals: 18;
            readonly name: "Avalanche";
            readonly symbol: "AVAX";
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://api.avax.network/ext/bc/C/rpc"];
            };
        };
        sourceId?: number | undefined | undefined;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters?: undefined;
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
    readonly bsc: {
        blockExplorers: {
            readonly default: {
                readonly name: "BscScan";
                readonly url: "https://bscscan.com";
                readonly apiUrl: "https://api.bscscan.com/api";
            };
        };
        blockTime: 750;
        contracts: {
            readonly multicall3: {
                readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                readonly blockCreated: 15921452;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 56;
        name: "BNB Smart Chain";
        nativeCurrency: {
            readonly decimals: 18;
            readonly name: "BNB";
            readonly symbol: "BNB";
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://56.rpc.thirdweb.com"];
            };
        };
        sourceId?: number | undefined | undefined;
        testnet?: boolean | undefined | undefined;
        custom?: Record<string, unknown> | undefined;
        extendSchema?: Record<string, unknown> | undefined;
        fees?: import("viem").ChainFees<undefined> | undefined;
        formatters?: undefined;
        prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
            runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
        }] | undefined;
        serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
    };
};
export type SupportedChain = keyof typeof SUPPORTED_CHAINS;
export declare const USDC_ADDRESSES: Record<SupportedChain, Address>;
export declare const USDT_ADDRESSES: Record<SupportedChain, Address>;
export declare const DAI_ADDRESSES: Record<SupportedChain, Address>;
export declare const WETH_ADDRESSES: Record<SupportedChain, Address>;
export declare const TOKEN_ADDRESSES: Record<SupportedToken, Record<SupportedChain, Address>>;
export declare const SUPPORTED_TOKENS: readonly ["USDC", "USDT", "DAI", "WETH"];
export type SupportedToken = typeof SUPPORTED_TOKENS[number];
export declare const TOKEN_DECIMALS: Record<SupportedToken, number>;
export declare const LAYERZERO_ENDPOINTS: Record<SupportedChain, Address>;
export declare const LAYERZERO_CHAIN_IDS: Record<SupportedChain, number>;
export declare const LAYERZERO_USDC_OFT: Record<SupportedChain, Address>;
export declare const LAYERZERO_USDT_OFT: Record<SupportedChain, Address>;
export declare const LAYERZERO_DAI_OFT: Record<SupportedChain, Address>;
export declare const LAYERZERO_WETH_OFT: Record<SupportedChain, Address>;
export declare const LAYERZERO_OFT_ADDRESSES: Record<SupportedToken, Record<SupportedChain, Address>>;
export interface BridgeQuote {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    amount: string;
    estimatedFee: string;
    estimatedTime: number;
    path?: string[];
    lzFee?: {
        nativeFee: bigint;
        lzTokenFee: bigint;
    };
}
type BridgeTransactionStatus = 'pending' | 'source_confirmed' | 'message_sent' | 'message_delivered' | 'completed' | 'failed' | 'timeout';
export interface BridgeTransactionStatusDetails {
    txHash: Hex;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    status: BridgeTransactionStatus;
    stage: 'source' | 'cross_chain' | 'destination';
    progress: number;
    messageHash?: Hex;
    sourceConfirmations?: number;
    requiredConfirmations: number;
    estimatedCompletionTime: number;
    actualCompletionTime?: number;
    error?: string;
    retryCount: number;
    lastUpdated: number;
}
export interface BridgeTransaction {
    txHash: Hex;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    amount: string;
    token: SupportedToken;
    status: BridgeTransactionStatus;
    timestamp: number;
    fees?: {
        nativeFee: string;
        lzTokenFee: string;
    };
    senderAddress: Address;
    recipientAddress: Address;
}
export interface BridgeTransactionFilter {
    chain?: SupportedChain;
    status?: BridgeTransactionStatus;
    startTime?: number;
    endTime?: number;
}
export interface BridgeStatistics {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
    averageCompletionTimeMs: number;
    totalVolumeUSD: string;
    averageFeeUSD: string;
    chainStats: Record<SupportedChain, ChainStatistics>;
    tokenStats: Record<SupportedToken, TokenStatistics>;
    dailyStats: DailyStatistics[];
    lastUpdated: number;
}
export interface ChainStatistics {
    chain: SupportedChain;
    totalSent: number;
    totalReceived: number;
    totalVolumeUSD: string;
    averageFeeUSD: string;
    successRate: number;
}
export interface TokenStatistics {
    token: SupportedToken;
    totalTransactions: number;
    totalVolume: string;
    totalVolumeUSD: string;
    averageFeeUSD: string;
    successRate: number;
}
export interface DailyStatistics {
    date: string;
    transactions: number;
    successful: number;
    failed: number;
    volumeUSD: string;
    averageFeeUSD: string;
    averageCompletionTimeMs: number;
}
export interface FeeTrendDataPoint {
    timestamp: number;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    feeUSD: string;
    gasPriceGwei: string;
}
export interface BridgeAnalyticsConfig {
    enableFeeTracking: boolean;
    enableCompletionTimeTracking: boolean;
    maxHistoryDays: number;
    priceOracle?: PriceOracle;
}
export interface PriceOracle {
    getPrice(token: SupportedToken): Promise<number>;
    getNativeTokenPrice(chain: SupportedChain): Promise<number>;
}
export declare class CoinGeckoPriceOracle implements PriceOracle {
    private cache;
    private readonly CACHE_TTL;
    getPrice(token: SupportedToken): Promise<number>;
    getNativeTokenPrice(chain: SupportedChain): Promise<number>;
}
export declare class BridgeTransactionHistory {
    private storageKey;
    private transactions;
    constructor(address: Address);
    private loadFromStorage;
    private saveToStorage;
    addTransaction(tx: BridgeTransaction): void;
    getTransactions(filter?: BridgeTransactionFilter): BridgeTransaction[];
    getTransactionByHash(txHash: Hex): BridgeTransaction | undefined;
    updateTransactionStatus(txHash: Hex, status: BridgeTransactionStatus): boolean;
    clearHistory(): void;
    getPendingTransactions(): BridgeTransaction[];
    getTransactionCount(): number;
    /**
     * Get all transactions for analytics
     */
    getAllTransactions(): BridgeTransaction[];
}
export declare function getBridgeHistory(address: Address, chain?: SupportedChain): BridgeTransaction[];
/**
 * Bridge Analytics class for tracking statistics and trends
 * Provides comprehensive analytics on bridge transactions including:
 * - Success/failure rates
 * - Average completion times
 * - Volume and fee trends
 * - Chain and token-specific metrics
 *
 * @example
 * ```typescript
 * const analytics = new BridgeAnalytics(address);
 *
 * // Get overall statistics
 * const stats = await analytics.getStatistics();
 * console.log(`Success rate: ${stats.successRate}%`);
 *
 * // Track a new transaction
 * analytics.trackTransaction({
 *   txHash: '0x...',
 *   sourceChain: 'base',
 *   destinationChain: 'optimism',
 *   token: 'USDC',
 *   amount: '100',
 *   feeUSD: '0.50'
 * });
 *
 * // Get fee trends
 * const trends = analytics.getFeeTrends('base', 'optimism', 'USDC');
 * ```
 */
export declare class BridgeAnalytics {
    private history;
    private feeTrends;
    private config;
    private priceOracle;
    private readonly storageKey;
    constructor(address: Address, config?: Partial<BridgeAnalyticsConfig>);
    /**
     * Load fee trends from storage
     */
    private loadFeeTrends;
    /**
     * Save fee trends to storage
     */
    private saveFeeTrends;
    /**
     * Clean data older than maxHistoryDays
     */
    private cleanOldData;
    /**
     * Calculate USD value from token amount
     */
    private calculateUSDValue;
    /**
     * Get comprehensive bridge statistics
     */
    getStatistics(): Promise<BridgeStatistics>;
    /**
     * Calculate chain-specific statistics
     */
    private calculateChainStatistics;
    /**
     * Calculate token-specific statistics
     */
    private calculateTokenStatistics;
    /**
     * Calculate daily statistics
     */
    private calculateDailyStatistics;
    /**
     * Estimate completion time based on chain pair
     */
    private estimateCompletionTime;
    /**
     * Track a fee data point for trend analysis
     */
    trackFee(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken, nativeFee: string, gasPriceGwei: string): Promise<void>;
    /**
     * Get fee trends for a specific route
     */
    getFeeTrends(sourceChain?: SupportedChain, destinationChain?: SupportedChain, token?: SupportedToken, limit?: number): FeeTrendDataPoint[];
    /**
     * Get average fee for a route
     */
    getAverageFee(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken): string;
    /**
     * Get fee trend analysis (increasing/decreasing/stable)
     */
    getFeeTrendAnalysis(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken): {
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercent: number;
    };
    /**
     * Get best time to bridge (based on historical fee data)
     */
    getBestTimeToBridge(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken): {
        bestHour: number;
        averageFee: string;
    };
    /**
     * Track a new transaction for analytics
     */
    trackTransaction(data: {
        txHash: Hex;
        sourceChain: SupportedChain;
        destinationChain: SupportedChain;
        token: SupportedToken;
        amount: string;
        feeUSD?: string;
    }): void;
    /**
     * Export analytics data
     */
    exportData(): {
        statistics: BridgeStatistics | null;
        feeTrends: FeeTrendDataPoint[];
    };
    /**
     * Clear all analytics data
     */
    clearData(): void;
}
export declare const RPC_URLS: Record<SupportedChain, string[]>;
export interface ChainBalance {
    chain: SupportedChain;
    nativeBalance: string;
    usdcBalance: string;
    balances?: Record<SupportedToken, string>;
}
/**
 * Get token balance for any supported token
 */
export declare function getTokenBalance(address: Address, chain: SupportedChain, token: SupportedToken): Promise<string>;
/**
 * Get all token balances for an address across all chains
 */
export declare function getAllTokenBalances(address: Address): Promise<Record<SupportedChain, Record<SupportedToken, string>>>;
export interface BridgeResult {
    success: boolean;
    txHash?: Hex;
    error?: string;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    amount: string;
    token?: SupportedToken;
    fees?: {
        nativeFee: string;
        lzTokenFee: string;
    };
}
export interface LayerZeroMessageStatus {
    messageHash: Hex;
    srcEid: number;
    dstEid: number;
    nonce: bigint;
    status: 'pending' | 'verified' | 'delivered' | 'failed';
    confirmations: number;
    verifiedBlockNumber?: bigint;
    deliveredBlockNumber?: bigint;
    retryCount: number;
}
/**
 * Get native token balance
 */
export declare function getNativeBalance(address: Address, chain: SupportedChain): Promise<string>;
/**
 * Get all balances across chains
 */
export declare function getAllBalances(address: Address): Promise<ChainBalance[]>;
/**
 * Get bridge quote for cross-chain transfer
 * Uses LayerZero OFT quoteSend for accurate fee estimation
 */
export declare function getBridgeQuote(params: {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    amount: string;
}, senderAddress: Address): Promise<BridgeQuote>;
/**
 * Find cheapest chain for operation
 */
export declare function findCheapestChain(operation: 'send' | 'swap' | 'contract', excludeChains?: SupportedChain[]): Promise<{
    chain: SupportedChain;
    estimatedCost: string;
}>;
/**
 * Bridge fee estimate result
 */
export interface BridgeFeeEstimate {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    amount: string;
    nativeFee: string;
    lzTokenFee: string;
    totalFeeUSD: string;
    gasEstimate: string;
    estimatedTime: number;
    breakdown: {
        protocolFee: string;
        gasFee: string;
        bridgeFee: string;
    };
}
/**
 * Estimate bridge fees for cross-chain transfer
 * Provides comprehensive fee estimation including protocol fees, gas costs, and bridge fees
 *
 * @param params - Fee estimation parameters
 * @returns Detailed fee estimate
 *
 * @example
 * ```typescript
 * const estimate = await estimateBridgeFee({
 *   sourceChain: 'base',
 *   destinationChain: 'optimism',
 *   token: 'USDC',
 *   amount: '100'
 * });
 * console.log(`Total fee: ${estimate.totalFeeUSD} USD`);
 * ```
 */
export declare function estimateBridgeFee(params: {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: SupportedToken;
    amount: string;
    senderAddress?: Address;
}): Promise<BridgeFeeEstimate>;
/**
 * CrossChainBridge class
/**
 * Bridge error codes
 */
export type BridgeErrorCode = 'INSUFFICIENT_BALANCE' | 'INSUFFICIENT_ALLOWANCE' | 'INVALID_PARAMS' | 'NETWORK_ERROR' | 'TRANSACTION_FAILED' | 'TRANSACTION_TIMEOUT' | 'MESSAGE_VERIFICATION_FAILED' | 'DESTINATION_TX_FAILED' | 'RPC_ERROR' | 'UNKNOWN_ERROR';
/**
 * Custom Bridge Error class with error codes
 */
export declare class BridgeError extends Error {
    code: BridgeErrorCode;
    chain?: SupportedChain;
    txHash?: Hex;
    retryable: boolean;
    constructor(message: string, code?: BridgeErrorCode, options?: {
        chain?: SupportedChain;
        txHash?: Hex;
        retryable?: boolean;
    });
    /**
     * Check if error is retryable
     */
    isRetryable(): boolean;
}
/**
 * Bridge logger interface
 */
export interface BridgeLogger {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
}
/**
 * Default console logger
 */
export declare const defaultLogger: BridgeLogger;
/**
 * LayerZero message tracking status
 */
export interface LayerZeroTrackingStatus {
    messageHash: Hex;
    srcEid: number;
    dstEid: number;
    nonce: bigint;
    status: 'pending' | 'inflight' | 'delivered' | 'verified' | 'failed';
    blockNumber?: bigint;
    timestamp: number;
    retries: number;
}
/**
 * Transaction polling configuration
 */
export interface PollingConfig {
    intervalMs: number;
    maxRetries: number;
    sourceConfirmationTimeoutMs: number;
    messageDeliveryTimeoutMs: number;
    destinationConfirmationTimeoutMs: number;
    requiredConfirmations: number;
}
/**
 * Bridge Transaction Monitor
 * Monitors cross-chain transactions from source to destination
 * Tracks LayerZero message status and provides real-time updates
 *
 * Features:
 * - Automatic transaction status polling
 * - LayerZero message delivery tracking
 * - Cross-chain completion detection
 * - Configurable timeouts and retry logic
 * - Real-time progress updates via EventEmitter
 *
 * @example
 * ```typescript
 * const monitor = new BridgeTransactionMonitor('base', defaultLogger);
 *
 * monitor.on('statusUpdate', (status) => {
 *   console.log(`Progress: ${status.progress}%`);
 * });
 *
 * monitor.on('messageDelivered', (status) => {
 *   console.log('LayerZero message delivered!');
 * });
 *
 * const status = await monitor.monitorTransaction(
 *   '0x...', // txHash
 *   'base',
 *   'optimism',
 *   '100'
 * );
 * ```
 */
export declare class BridgeTransactionMonitor extends EventEmitter {
    private sourceChain;
    private logger;
    private activeMonitors;
    private statusCache;
    private lzStatusCache;
    private pollingConfig;
    private readonly DEFAULT_CONFIG;
    constructor(sourceChain: SupportedChain, logger?: BridgeLogger, pollingConfig?: Partial<PollingConfig>);
    /**
     * Update polling configuration
     */
    updatePollingConfig(config: Partial<PollingConfig>): void;
    /**
     * Get current polling configuration
     */
    getPollingConfig(): PollingConfig;
    /**
     * Monitor a bridge transaction end-to-end
     * Tracks source confirmation, message delivery, and destination confirmation
     */
    monitorTransaction(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain, amount: string, options?: {
        requiredConfirmations?: number;
        onStatusUpdate?: (status: BridgeTransactionStatusDetails) => void;
        timeout?: number;
    }): Promise<BridgeTransactionStatusDetails>;
    /**
     * Monitor source chain transaction confirmation
     * Implements polling with retry logic and progress events
     */
    private monitorSourceConfirmation;
    /**
     * Monitor LayerZero message delivery with enhanced tracking
     */
    private monitorMessageDelivery;
    /**
     * Monitor destination chain transaction confirmation
     * Implements polling for OFT receive events with progress tracking
     */
    private monitorDestinationConfirmation;
    /**
     * Check LayerZero message status
     */
    private checkLayerZeroMessageStatus;
    /**
     * Extract message hash from transaction logs
     */
    private extractMessageHash;
    /**
     * Estimate total bridge time
     */
    private estimateTotalTime;
    /**
     * Emit status update
     */
    private emitStatusUpdate;
    /**
     * Delay with abort support
     */
    private delay;
    /**
     * Stop monitoring a transaction
     */
    stopMonitoring(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain): void;
    /**
     * Stop all active monitoring
     */
    stopAllMonitoring(): void;
    /**
     * Get current status of a monitored transaction
     */
    getStatus(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain): BridgeTransactionStatusDetails | undefined;
    /**
     * Retry a failed monitoring attempt
     */
    retryMonitoring(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain, amount: string, options?: Parameters<typeof this.monitorTransaction>[4]): Promise<BridgeTransactionStatusDetails>;
}
/**
 * WebSocket connection states
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
/**
 * WebSocket message types for bridge updates
 */
export type BridgeWebSocketMessageType = 'transaction_update' | 'status_change' | 'confirmation' | 'error' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe';
/**
 * WebSocket message interface
 */
export interface BridgeWebSocketMessage {
    type: BridgeWebSocketMessageType;
    timestamp: number;
    data?: unknown;
    error?: string;
}
/**
 * Transaction update message data
 */
export interface TransactionUpdateData {
    txHash: Hex;
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    status: BridgeTransactionStatus;
    progress: number;
    stage: 'source' | 'cross_chain' | 'destination';
    confirmations?: number;
    messageHash?: Hex;
    error?: string;
}
/**
 * WebSocket subscription options
 */
export interface WebSocketSubscriptionOptions {
    txHash?: Hex;
    sourceChain?: SupportedChain;
    destinationChain?: SupportedChain;
    address?: Address;
}
/**
 * WebSocket manager for real-time bridge transaction tracking
 * Provides live updates on transaction status, confirmations, and errors
 *
 * @example
 * ```typescript
 * const wsManager = new BridgeWebSocketManager('wss://api.example.com/bridge');
 *
 * wsManager.on('message', (msg) => {
 *   console.log('Transaction update:', msg.data);
 * });
 *
 * wsManager.on('statusChange', (status) => {
 *   console.log('WebSocket status:', status);
 * });
 *
 * await wsManager.connect();
 * wsManager.subscribe({ txHash: '0x...' });
 * ```
 */
export declare class BridgeWebSocketManager extends EventEmitter {
    private url;
    private ws;
    private state;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private pingInterval;
    private pingTimeout;
    private subscriptions;
    private messageQueue;
    private logger;
    private readonly PING_INTERVAL;
    private readonly PING_TIMEOUT;
    private readonly MAX_RECONNECT_DELAY;
    constructor(url: string, logger?: BridgeLogger);
    /**
     * Get current WebSocket connection state
     */
    getState(): WebSocketState;
    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean;
    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void;
    /**
     * Subscribe to transaction updates
     */
    subscribe(options: WebSocketSubscriptionOptions): void;
    /**
     * Unsubscribe from transaction updates
     */
    unsubscribe(options: WebSocketSubscriptionOptions): void;
    /**
     * Send a message to the WebSocket server
     */
    send(message: BridgeWebSocketMessage): void;
    /**
     * Set up WebSocket event handlers
     */
    private setupEventHandlers;
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage;
    /**
     * Wait for WebSocket connection
     */
    private waitForConnection;
    /**
     * Handle reconnection with exponential backoff
     */
    private handleReconnect;
    /**
     * Start ping interval to keep connection alive
     */
    private startPingInterval;
    /**
     * Stop ping interval
     */
    private stopPingInterval;
    /**
     * Handle pong response
     */
    private handlePong;
    /**
     * Set state and emit event
     */
    private setState;
    /**
     * Create unique subscription key
     */
    private createSubscriptionKey;
    /**
     * Resubscribe to all active subscriptions after reconnection
     */
    private resubscribeAll;
    /**
     * Flush queued messages
     */
    private flushMessageQueue;
}
/**
 * Bridge WebSocket client factory
 * Creates a WebSocket manager with default configuration
 */
export declare function createBridgeWebSocketClient(url: string, logger?: BridgeLogger): BridgeWebSocketManager;
/**
 * Listen for LayerZero messages
 * Creates a listener that monitors for incoming LayerZero messages on a specific chain
 *
 * @param chain - Chain to listen on
 * @param callback - Callback function for new messages
 * @returns Cleanup function to stop listening
 */
export declare function listenLayerZeroMessages(chain: SupportedChain, callback: (message: {
    messageHash: Hex;
    srcEid: number;
    sender: Address;
    nonce: bigint;
    payload: string;
    blockNumber: bigint;
    transactionHash: Hex;
}) => void): () => void;
/**
 * CrossChainBridge class
 * Extends EventEmitter to provide event-based notifications for bridge operations
 *
 * @example
 * ```typescript
 * const bridge = new CrossChainBridge(privateKey, 'base');
 *
 * // Listen for events
 * bridge.on('quoteReceived', (quote) => console.log('Quote:', quote));
 * bridge.on('transactionSent', (tx) => console.log('Sent:', tx.txHash));
 * bridge.on('transactionConfirmed', (tx) => console.log('Confirmed:', tx.txHash));
 * bridge.on('transactionFailed', (error) => console.error('Failed:', error.error));
 *
 * // Execute bridge operation
 * const result = await bridge.bridgeUSDC('optimism', '100');
 * ```
 */
export declare class CrossChainBridge extends EventEmitter {
    private privateKey;
    private defaultChain;
    private history;
    logger: BridgeLogger;
    /**
     * Create a new CrossChainBridge instance
     * @param privateKey - Private key for signing transactions
     * @param defaultChain - Default source chain
     * @param logger - Optional custom logger
     */
    constructor(privateKey: Hex, defaultChain?: SupportedChain, logger?: BridgeLogger);
    /**
     * Subscribe to bridge events
     * @param event - Event type to listen for
     * @param listener - Callback function
     */
    on(event: BridgeEventType, listener: (data: BridgeEventData) => void): this;
    /**
     * Subscribe to bridge events (one-time)
     * @param event - Event type to listen for
     * @param listener - Callback function
     */
    once(event: BridgeEventType, listener: (data: BridgeEventData) => void): this;
    /**
     * Remove event listener
     * @param event - Event type
     * @param listener - Callback function to remove
     */
    off(event: BridgeEventType, listener: (data: BridgeEventData) => void): this;
    /**
     * Emit a bridge event
     * @param event - Event type
     * @param data - Event data
     */
    emit(event: BridgeEventType, data: BridgeEventData): boolean;
    /**
     * Get transaction history for the bridge's address
     */
    getTransactionHistory(filter?: BridgeTransactionFilter): BridgeTransaction[];
    /**
     * Update transaction status and emit event
     */
    private updateTransactionStatus;
    getBalances(address?: Address): Promise<ChainBalance[]>;
    findCheapestChain(operation: 'send' | 'swap' | 'contract'): Promise<{
        chain: SupportedChain;
        estimatedCost: string;
    }>;
    /**
     * Get bridge quote for cross-chain transfer
     * Instance method wrapper around getBridgeQuote function
     * Emits 'quoteReceived' and 'feeEstimated' events
     */
    getQuote(destinationChain: SupportedChain, token: SupportedToken, amount: string, sourceChain?: SupportedChain): Promise<BridgeQuote>;
    /**
     * Estimate bridge fees for a cross-chain transfer
     * Provides comprehensive fee breakdown including protocol fees, gas costs, and bridge fees
     *
     * @param destinationChain - Target chain for the bridge
     * @param token - Token to bridge (USDC | USDT | DAI | WETH)
     * @param amount - Amount to bridge
     * @param sourceChain - Source chain (defaults to defaultChain)
     * @returns Detailed fee estimate
     *
     * @example
     * ```typescript
     * const estimate = await bridge.estimateFee('optimism', 'USDC', '100');
     * console.log(`Total fee: ${estimate.totalFeeUSD} USD`);
     * console.log(`Gas estimate: ${estimate.gasEstimate} units`);
     * ```
     */
    estimateFee(destinationChain: SupportedChain, token: SupportedToken, amount: string, sourceChain?: SupportedChain): Promise<BridgeFeeEstimate>;
    /**
     * Monitor a bridge transaction
     * Tracks the transaction from source chain through destination chain
     *
     * @param txHash - Transaction hash to monitor
     * @param sourceChain - Source chain
     * @param destinationChain - Destination chain
     * @param amount - Amount bridged
     * @param options - Monitoring options
     * @returns Transaction status details
     *
     * @example
     * ```typescript
     * const result = await bridge.bridgeUSDC('optimism', '100');
     * if (result.success) {
     *   const status = await bridge.monitorTransaction(
     *     result.txHash!,
     *     'base',
     *     'optimism',
     *     '100'
     *   );
     *   console.log(`Bridge completed: ${status.status}`);
     * }
     * ```
     */
    monitorTransaction(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain, amount: string, options?: {
        requiredConfirmations?: number;
        onStatusUpdate?: (status: BridgeTransactionStatusDetails) => void;
        timeout?: number;
    }): Promise<BridgeTransactionStatusDetails>;
    /**
     * Bridge USDC using LayerZero OFT (Omnichain Fungible Token) protocol
     * Supports Base ↔ Optimism ↔ Arbitrum transfers
     * Uses LayerZero V2 for cross-chain messaging
     *
     * Emits events:
     * - 'approvalRequired' - When USDC approval is needed
     * - 'approvalConfirmed' - When USDC approval is confirmed
     * - 'transactionSent' - When bridge transaction is submitted
     * - 'transactionConfirmed' - When bridge transaction is confirmed
     * - 'transactionFailed' - When bridge transaction fails
     * - 'balanceInsufficient' - When balance is insufficient
     * - 'feeEstimated' - When fees are estimated
     *
     * @param destinationChain - Target chain
     * @param amount - Amount to bridge (in USDC, e.g., "10.5")
     * @param sourceChain - Source chain (defaults to defaultChain)
     * @returns BridgeResult with transaction details
     */
    bridgeUSDC(destinationChain: SupportedChain, amount: string, sourceChain?: SupportedChain): Promise<BridgeResult>;
    /**
     * Bridge any supported token using LayerZero OFT (Omnichain Fungible Token) protocol
     * Supports USDC, USDT, DAI, WETH across Base, Optimism, Arbitrum, Ethereum
     * Uses LayerZero V2 for cross-chain messaging
     *
     * Emits events:
     * - 'approvalRequired' - When token approval is needed
     * - 'approvalConfirmed' - When token approval is confirmed
     * - 'transactionSent' - When bridge transaction is submitted
     * - 'transactionConfirmed' - When bridge transaction is confirmed
     * - 'transactionFailed' - When bridge transaction fails
     * - 'balanceInsufficient' - When balance is insufficient
     * - 'feeEstimated' - When fees are estimated
     *
     * @param destinationChain - Target chain
     * @param token - Token to bridge (USDC | USDT | DAI | WETH)
     * @param amount - Amount to bridge (in token units, e.g., "10.5")
     * @param sourceChain - Source chain (defaults to defaultChain)
     * @returns BridgeResult with transaction details
     */
    bridgeToken(destinationChain: SupportedChain, token: SupportedToken, amount: string, sourceChain?: SupportedChain): Promise<BridgeResult>;
    /**
     * Internal method to bridge any OFT-supported token
     * Generic implementation that works for USDT, DAI, WETH, and future tokens
     */
    private bridgeOFTToken;
    /**
     * Get balance for any supported token
     * @param token - Token to check balance for
     * @param chain - Chain to check on (defaults to defaultChain)
     * @returns Token balance as string
     */
    getTokenBalance(token: SupportedToken, chain?: SupportedChain): Promise<string>;
    /**
     * Get all token balances across all chains
     * @returns Record of chain -> token -> balance
     */
    getAllTokenBalances(): Promise<Record<SupportedChain, Record<SupportedToken, string>>>;
    /**
     * Batch bridge multiple tokens in a single operation
     * @param operations - Array of bridge operations
     * @param options - Batch options
     * @returns Array of bridge results
     *
     * @example
     * ```typescript
     * const results = await bridge.batchBridge([
     *   { destinationChain: 'optimism', token: 'USDC', amount: '100' },
     *   { destinationChain: 'arbitrum', token: 'USDT', amount: '50' },
     *   { destinationChain: 'polygon', token: 'DAI', amount: '200' }
     * ]);
     * ```
     */
    batchBridge(operations: Array<{
        destinationChain: SupportedChain;
        token: SupportedToken;
        amount: string;
        sourceChain?: SupportedChain;
    }>, options?: {
        maxConcurrent?: number;
        stopOnError?: boolean;
    }): Promise<BridgeResult[]>;
    /**
     * Send arbitrary cross-chain messages via LayerZero
     * @param destinationChain - Target chain
     * @param message - Message payload (bytes)
     * @param options - Message options
     * @returns Transaction result
     *
     * @example
     * ```typescript
     * const result = await bridge.sendCrossChainMessage(
     *   'optimism',
     *   '0x1234...',
     *   { value: parseEther('0.01') }
     * );
     * ```
     */
    sendCrossChainMessage(destinationChain: SupportedChain, message: Hex, options?: {
        sourceChain?: SupportedChain;
        value?: bigint;
        extraOptions?: Hex;
    }): Promise<BridgeResult>;
    /**
     * Quote fee for cross-chain message
     * @param destinationChain - Target chain
     * @param message - Message payload
     * @param options - Quote options
     * @returns Fee estimate
     */
    quoteCrossChainMessage(destinationChain: SupportedChain, message: Hex, options?: {
        sourceChain?: SupportedChain;
    }): Promise<{
        nativeFee: bigint;
        lzTokenFee: bigint;
    }>;
    /**
     * Find the optimal bridge route based on cost, speed, or reliability
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @param criteria - Optimization criteria
     * @returns Optimal route recommendation
     *
     * @example
     * ```typescript
     * const route = await bridge.findOptimalRoute(
     *   'optimism',
     *   'USDC',
     *   '100',
     *   'cheapest'
     * );
     * console.log(`Best route: ${route.sourceChain} -> ${route.destinationChain}`);
     * console.log(`Estimated fee: ${route.estimatedFee}`);
     * ```
     */
    findOptimalRoute(destinationChain: SupportedChain, token: SupportedToken, amount: string, criteria?: 'cheapest' | 'fastest' | 'most_reliable'): Promise<{
        sourceChain: SupportedChain;
        destinationChain: SupportedChain;
        estimatedFee: string;
        estimatedTime: number;
        score: number;
        reason: string;
    }>;
    /**
     * Get route comparison for all possible paths
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @returns Array of route comparisons
     */
    compareRoutes(destinationChain: SupportedChain, token: SupportedToken, amount: string): Promise<Array<{
        sourceChain: SupportedChain;
        estimatedFee: string;
        estimatedTime: number;
        ranking: number;
    }>>;
}
export default CrossChainBridge;
//# sourceMappingURL=bridge.d.ts.map