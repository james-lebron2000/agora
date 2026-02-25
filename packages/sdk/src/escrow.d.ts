import { type Address, type Chain, type Hash, type Hex } from 'viem';
export type EscrowNetwork = 'base' | 'base-sepolia';
export type EscrowStatus = 'NONE' | 'DEPOSITED' | 'RELEASED' | 'REFUNDED';
export declare const ESCROW_TIMEOUT_SEC: number;
export declare const ESCROW_ADDRESSES: Record<EscrowNetwork, Address>;
export declare const ESCROW_ABI: readonly [{
    readonly type: "function";
    readonly name: "deposit";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
    }, {
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "release";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "refund";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "batchRelease";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestIds";
        readonly type: "bytes32[]";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "batchRefund";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestIds";
        readonly type: "bytes32[]";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "escrows";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [{
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly name: "createdAt";
        readonly type: "uint64";
    }, {
        readonly name: "status";
        readonly type: "uint8";
    }];
}, {
    readonly type: "event";
    readonly name: "Deposited";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "buyer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "seller";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Released";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "seller";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fee";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Refunded";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "buyer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BatchReleased";
    readonly inputs: readonly [{
        readonly name: "requestIds";
        readonly type: "bytes32[]";
        readonly indexed: false;
    }, {
        readonly name: "totalAmount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "totalFee";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BatchRefunded";
    readonly inputs: readonly [{
        readonly name: "requestIds";
        readonly type: "bytes32[]";
        readonly indexed: false;
    }, {
        readonly name: "totalAmount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
export interface EscrowClientOptions {
    privateKey?: Hex;
    network?: EscrowNetwork;
    chain?: Chain;
    rpcUrl?: string;
    escrowAddress?: Address;
}
export interface DepositOptions extends EscrowClientOptions {
    requestId: string | Hex;
    amount: bigint | number | string;
    seller: Address;
    decimals?: number;
}
export interface EscrowActionOptions extends EscrowClientOptions {
    requestId: string | Hex;
}
export interface EscrowStatusResult {
    requestId: Hex;
    buyer: Address;
    seller: Address;
    amount: bigint;
    createdAt: bigint;
    status: EscrowStatus;
}
export interface EscrowEventHandlers {
    requestId?: string | Hex;
    onDeposited?: (log: {
        requestId: Hex;
        buyer: Address;
        seller: Address;
        amount: bigint;
    }) => void;
    onReleased?: (log: {
        requestId: Hex;
        seller: Address;
        amount: bigint;
        fee: bigint;
    }) => void;
    onRefunded?: (log: {
        requestId: Hex;
        buyer: Address;
        amount: bigint;
    }) => void;
    onBatchReleased?: (log: {
        requestIds: Hex[];
        totalAmount: bigint;
        totalFee: bigint;
    }) => void;
    onBatchRefunded?: (log: {
        requestIds: Hex[];
        totalAmount: bigint;
    }) => void;
}
export interface BatchEscrowOptions extends EscrowClientOptions {
    requestIds: (string | Hex)[];
}
export declare function encodeRequestId(requestId: string | Hex): Hex;
export declare function deposit(options: DepositOptions): Promise<Hash>;
export declare function release(options: EscrowActionOptions): Promise<Hash>;
export declare function refund(options: EscrowActionOptions): Promise<Hash>;
export declare function batchRelease(options: BatchEscrowOptions): Promise<Hash>;
export declare function batchRefund(options: BatchEscrowOptions): Promise<Hash>;
export declare function getEscrowStatus(options: EscrowActionOptions): Promise<EscrowStatusResult>;
export declare function watchEscrowEvents(options: EscrowClientOptions & EscrowEventHandlers): () => void;
//# sourceMappingURL=escrow.d.ts.map