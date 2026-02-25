/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, and Arbitrum chains
 * Uses LayerZero for cross-chain messaging and USDC transfers
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Hex,
  type WalletClient,
  type Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';

// Supported chains
export const SUPPORTED_CHAINS = { base, optimism, arbitrum, ethereum: mainnet } as const;
export type SupportedChain = keyof typeof SUPPORTED_CHAINS;

// USDC addresses
export const USDC_ADDRESSES: Record<SupportedChain, Address> = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// RPC endpoints
export const RPC_URLS: Record<SupportedChain, string[]> = {
  ethereum: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
  base: ['https://base.llamarpc.com', 'https://mainnet.base.org'],
  optimism: ['https://optimism.llamarpc.com', 'https://mainnet.optimism.io'],
  arbitrum: ['https://arbitrum.llamarpc.com', 'https://arb1.arbitrum.io/rpc']
};

export interface ChainBalance {
  chain: SupportedChain;
  nativeBalance: string;
  usdcBalance: string;
}

export interface BridgeResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
}

/**
 * Create public client for chain
 */
export function createChainPublicClient(chain: SupportedChain) {
  return createPublicClient({
    chain: SUPPORTED_CHAINS[chain],
    transport: http(RPC_URLS[chain][0])
  });
}

/**
 * Get USDC balance
 */
export async function getUSDCBalance(address: Address, chain: SupportedChain): Promise<string> {
  const client = createChainPublicClient(chain);
  const abi = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const;
  
  try {
    const balance = await client.readContract({
      address: USDC_ADDRESSES[chain],
      abi,
      functionName: 'balanceOf',
      args: [address]
    }) as bigint;
    return formatUnits(balance, 6);
  } catch (error) {
    console.error(`[Bridge] Failed to get USDC balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get native token balance
 */
export async function getNativeBalance(address: Address, chain: SupportedChain): Promise<string> {
  const client = createChainPublicClient(chain);
  try {
    const balance = await client.getBalance({ address });
    return formatUnits(balance, 18);
  } catch (error) {
    console.error(`[Bridge] Failed to get native balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get all balances across chains
 */
export async function getAllBalances(address: Address): Promise<ChainBalance[]> {
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
  const balances: ChainBalance[] = [];
  
  for (const chain of chains) {
    const [nativeBalance, usdcBalance] = await Promise.all([
      getNativeBalance(address, chain),
      getUSDCBalance(address, chain)
    ]);
    balances.push({ chain, nativeBalance, usdcBalance });
  }
  
  return balances;
}

/**
 * Find cheapest chain for operation
 */
export async function findCheapestChain(
  operation: 'send' | 'swap' | 'contract',
  excludeChains?: SupportedChain[]
): Promise<{ chain: SupportedChain; estimatedCost: string }> {
  const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
  const filtered = excludeChains ? chains.filter(c => !excludeChains.includes(c)) : chains;
  
  // Cost estimates in USD
  const costs: Record<string, number> = {
    'send-base': 0.001, 'send-optimism': 0.002, 'send-arbitrum': 0.003,
    'contract-base': 0.005, 'contract-optimism': 0.008, 'contract-arbitrum': 0.012
  };
  
  let cheapest = filtered[0];
  let lowestCost = Infinity;
  
  for (const chain of filtered) {
    const cost = costs[`${operation}-${chain}`] || 0.01;
    if (cost < lowestCost) {
      lowestCost = cost;
      cheapest = chain;
    }
  }
  
  return { chain: cheapest, estimatedCost: lowestCost.toFixed(4) };
}

/**
 * CrossChainBridge class
 */
export class CrossChainBridge {
  private privateKey: Hex;
  private defaultChain: SupportedChain;
  
  constructor(privateKey: Hex, defaultChain: SupportedChain = 'base') {
    this.privateKey = privateKey;
    this.defaultChain = defaultChain;
  }
  
  async getBalances(address?: Address): Promise<ChainBalance[]> {
    const account = privateKeyToAccount(this.privateKey);
    return getAllBalances(address || account.address);
  }
  
  async findCheapestChain(operation: 'send' | 'swap' | 'contract'): Promise<{ chain: SupportedChain; estimatedCost: string }> {
    return findCheapestChain(operation);
  }
}

export default CrossChainBridge;
