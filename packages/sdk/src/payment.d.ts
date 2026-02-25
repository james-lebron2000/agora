import { type Address, type Chain, type Hash, type Hex } from 'viem';
export type BaseNetwork = 'base' | 'base-sepolia';
export declare const USDC_DECIMALS = 6;
export declare const USDC_ADDRESSES: Record<BaseNetwork, Address>;
export interface PaymentClientOptions {
    privateKey: Hex;
    network?: BaseNetwork;
    chain?: Chain;
    rpcUrl?: string;
    usdcAddress?: Address;
}
export interface ApproveUsdcOptions extends PaymentClientOptions {
    spender: Address;
    amount: bigint | number | string;
    decimals?: number;
}
export interface TransferUsdcOptions extends PaymentClientOptions {
    recipient: Address;
    amount: bigint | number | string;
    decimals?: number;
}
export declare function resolveBaseChain(options: PaymentClientOptions): Chain;
export declare function getUsdcAddressForChain(chain: Chain): Address;
export declare function approveUSDC(options: ApproveUsdcOptions): Promise<Hash>;
export declare function transferUSDC(options: TransferUsdcOptions): Promise<Hash>;
//# sourceMappingURL=payment.d.ts.map