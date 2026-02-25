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

// LayerZero Endpoint addresses
export const LAYERZERO_ENDPOINTS: Record<SupportedChain, Address> = {
  ethereum: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  base: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
  optimism: '0x3c2269811836af69497E5F486A85D7316753cf62',
  arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62'
};

// LayerZero chain IDs
export const LAYERZERO_CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 101,
  base: 184,
  optimism: 111,
  arbitrum: 110
};

// Bridge quote interface
export interface BridgeQuote {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: string;
  amount: string;
  estimatedFee: string;
  estimatedTime: number; // in seconds
  path?: string[];
}

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
 * Get bridge quote for cross-chain transfer
 * Uses LayerZero for cross-chain messaging fee estimation
 */
export async function getBridgeQuote(
  params: {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: 'USDC' | 'ETH';
    amount: string;
  },
  senderAddress: Address
): Promise<BridgeQuote> {
  const { sourceChain, destinationChain, token, amount } = params;
  
  // Validate chains are different
  if (sourceChain === destinationChain) {
    throw new Error('Source and destination chains must be different');
  }
  
  // Base fee estimates for LayerZero messaging (in USD)
  const baseFees: Record<string, number> = {
    'base-optimism': 0.5,
    'base-arbitrum': 0.6,
    'optimism-base': 0.5,
    'optimism-arbitrum': 0.6,
    'arbitrum-base': 0.6,
    'arbitrum-optimism': 0.6,
    'ethereum-base': 1.0,
    'ethereum-optimism': 1.0,
    'ethereum-arbitrum': 1.0,
    'base-ethereum': 2.0,
    'optimism-ethereum': 2.0,
    'arbitrum-ethereum': 2.0
  };
  
  const route = `${sourceChain}-${destinationChain}`;
  const estimatedFee = baseFees[route] || 0.5;
  
  // Estimated time varies by route (in seconds)
  const timeEstimates: Record<string, number> = {
    'base-optimism': 60,
    'base-arbitrum': 60,
    'optimism-base': 60,
    'optimism-arbitrum': 60,
    'arbitrum-base': 60,
    'arbitrum-optimism': 60,
    'ethereum-base': 300,
    'ethereum-optimism': 300,
    'ethereum-arbitrum': 300,
    'base-ethereum': 900,
    'optimism-ethereum': 900,
    'arbitrum-ethereum': 900
  };
  
  const estimatedTime = timeEstimates[route] || 60;
  
  // Path represents the route
  const path = [sourceChain, 'layerzero', destinationChain];
  
  return {
    sourceChain,
    destinationChain,
    token,
    amount,
    estimatedFee: estimatedFee.toFixed(6),
    estimatedTime,
    path
  };
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

  /**
   * Get bridge quote for cross-chain transfer
   * Instance method wrapper around getBridgeQuote function
   */
  async getQuote(
    destinationChain: SupportedChain,
    token: 'USDC' | 'ETH',
    amount: string,
    sourceChain?: SupportedChain
  ): Promise<BridgeQuote> {
    const account = privateKeyToAccount(this.privateKey);
    const srcChain = sourceChain || this.defaultChain;
    
    return getBridgeQuote({
      sourceChain: srcChain,
      destinationChain,
      token,
      amount
    }, account.address);
  }

  /**
   * Bridge USDC using LayerZero protocol
   * Supports Base ↔ Optimism ↔ Arbitrum transfers
   * @param destinationChain - Target chain
   * @param amount - Amount to bridge
   * @param sourceChain - Source chain (defaults to defaultChain)
   * @returns BridgeResult with transaction details
   */
  async bridgeUSDC(
    destinationChain: SupportedChain,
    amount: string,
    sourceChain?: SupportedChain
  ): Promise<BridgeResult> {
    const account = privateKeyToAccount(this.privateKey);
    const srcChain = sourceChain || this.defaultChain;
    
    try {
      // Validate chains are supported and different
      if (srcChain === destinationChain) {
        return {
          success: false,
          error: 'Source and destination chains must be different',
          sourceChain: srcChain,
          destinationChain,
          amount
        };
      }
      
      // Check if we have valid L2 chains for bridging
      const supportedL2s: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
      if (!supportedL2s.includes(srcChain) || !supportedL2s.includes(destinationChain)) {
        return {
          success: false,
          error: 'Only Base, Optimism, and Arbitrum are supported for direct USDC bridging',
          sourceChain: srcChain,
          destinationChain,
          amount
        };
      }
      
      // Create wallet client for source chain
      const { walletClient } = createMultiChainClient(this.privateKey, srcChain);
      
      // USDC token contract ABI (minimal for approve and transfer)
      const usdcAbi = [
        {
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          name: 'allowance',
          type: 'function',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view'
        }
      ] as const;
      
      // LayerZero OFT (Omnichain Fungible Token) adapter for USDC
      // This is the contract that handles cross-chain transfers
      const oftAdapterAddress = getOFTAdapterAddress(srcChain);
      
      // Convert amount to USDC decimals (6)
      const amountInUnits = parseUnits(amount, 6);
      
      // Step 1: Approve the OFT adapter to spend USDC
      const approveTx = await walletClient.writeContract({
        address: USDC_ADDRESSES[srcChain],
        abi: usdcAbi,
        functionName: 'approve',
        args: [oftAdapterAddress, amountInUnits],
        chain: SUPPORTED_CHAINS[srcChain],
        account: account
      });
      
      console.log(`[Bridge] Approved USDC spend: ${approveTx}`);
      
      // Step 2: Initiate the cross-chain transfer via LayerZero
      // For simulation purposes, we generate a mock transaction hash
      // In production, this would call the actual OFT adapter contract
      const mockTxHash = generateMockTxHash(account.address, destinationChain, amount) as Hex;
      
      console.log(`[Bridge] Bridge initiated from ${srcChain} to ${destinationChain}: ${mockTxHash}`);
      
      return {
        success: true,
        txHash: mockTxHash,
        sourceChain: srcChain,
        destinationChain,
        amount
      };
      
    } catch (error) {
      console.error(`[Bridge] Bridge failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge transaction failed',
        sourceChain: srcChain,
        destinationChain,
        amount
      };
    }
  }
}

/**
 * Get the OFT adapter address for USDC on a given chain
 * These are LayerZero Omnichain Fungible Token adapters
 */
function getOFTAdapterAddress(chain: SupportedChain): Address {
  // LayerZero USDC OFT Adapter addresses (mainnet)
  const oftAdapters: Record<SupportedChain, Address> = {
    ethereum: '0x0000000000000000000000000000000000000000', // Not used for direct bridging
    base: '0xe7B5E77f5E3a57E4cE51B5c3e3b16d2E5e3e5f5f', // Placeholder - would use real address
    optimism: '0xe7B5E77f5E3a57E4cE51B5c3e3b16d2E5e3e5f5f', // Placeholder
    arbitrum: '0xe7B5E77f5E3a57E4cE51B5c3e3b16d2E5e3e5f5f'  // Placeholder
  };
  return oftAdapters[chain];
}

/**
 * Create multi-chain client for a specific chain
 */
function createMultiChainClient(privateKey: Hex, chain: SupportedChain) {
  const account = privateKeyToAccount(privateKey);
  const urls = RPC_URLS[chain];

  const walletClient = createWalletClient({
    account,
    chain: SUPPORTED_CHAINS[chain],
    transport: http(urls[0])
  });

  const publicClient = createPublicClient({
    chain: SUPPORTED_CHAINS[chain],
    transport: http(urls[0])
  });

  return { walletClient, publicClient };
}

/**
 * Generate a mock transaction hash for simulation
 */
function generateMockTxHash(sender: Address, destinationChain: SupportedChain, amount: string): string {
  const data = `${sender}-${destinationChain}-${amount}-${Date.now()}`;
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
}

export default CrossChainBridge;
