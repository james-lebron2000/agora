import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  http,
  parseUnits,
  type Address,
  type Chain,
  type Hash,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

export type BaseNetwork = 'base' | 'base-sepolia';

export const USDC_DECIMALS = 6;

export const USDC_ADDRESSES: Record<BaseNetwork, Address> = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const NETWORK_CHAINS: Record<BaseNetwork, Chain> = {
  base,
  'base-sepolia': baseSepolia,
};

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

export interface TransferNativeOptions extends PaymentClientOptions {
  recipient: Address;
  amount: bigint | number | string;
  decimals?: number;
}

export function resolveBaseChain(options: PaymentClientOptions): Chain {
  if (options.chain) return options.chain;
  if (options.network) return NETWORK_CHAINS[options.network];
  return baseSepolia;
}

export function getUsdcAddressForChain(chain: Chain): Address {
  if (chain.id === base.id) return USDC_ADDRESSES.base;
  if (chain.id === baseSepolia.id) return USDC_ADDRESSES['base-sepolia'];
  throw new Error(`Unsupported chain ${chain.id} for USDC`);
}

function resolveRpcUrl(chain: Chain, rpcUrl?: string): string {
  return rpcUrl ?? chain.rpcUrls.default.http[0];
}

function resolveUsdcAddress(chain: Chain, override?: Address): Address {
  return override ?? getUsdcAddressForChain(chain);
}

function parseUsdcAmount(amount: bigint | number | string, decimals = USDC_DECIMALS): bigint {
  if (typeof amount === 'bigint') return amount;
  return parseUnits(amount.toString(), decimals);
}

function createClients(options: PaymentClientOptions) {
  const chain = resolveBaseChain(options);
  const rpcUrl = resolveRpcUrl(chain, options.rpcUrl);
  const account = privateKeyToAccount(options.privateKey);
  const transport = http(rpcUrl);
  const walletClient = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });
  const usdcAddress = resolveUsdcAddress(chain, options.usdcAddress);

  return { chain, account, walletClient, publicClient, usdcAddress };
}

export async function approveUSDC(options: ApproveUsdcOptions): Promise<Hash> {
  const { walletClient, account, usdcAddress } = createClients(options);
  const value = parseUsdcAmount(options.amount, options.decimals);

  return walletClient.writeContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [options.spender, value],
    account,
  });
}

export async function transferUSDC(options: TransferUsdcOptions): Promise<Hash> {
  const { walletClient, account, usdcAddress } = createClients(options);
  const value = parseUsdcAmount(options.amount, options.decimals);

  return walletClient.writeContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [options.recipient, value],
    account,
  });
}

function parseNativeAmount(amount: bigint | number | string, decimals = 18): bigint {
  if (typeof amount === 'bigint') return amount;
  return parseUnits(amount.toString(), decimals);
}

export async function transferNative(options: TransferNativeOptions): Promise<Hash> {
  const { walletClient, account } = createClients(options);
  const value = parseNativeAmount(options.amount, options.decimals);

  return walletClient.sendTransaction({
    account,
    to: options.recipient,
    value,
  });
}
