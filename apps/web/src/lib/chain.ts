import { base, baseSepolia } from 'viem/chains'
import type { Address, Chain } from 'viem'

export type BaseNetwork = 'base' | 'base-sepolia'

const envNetwork = (import.meta as any).env?.VITE_BASE_NETWORK as BaseNetwork | undefined

export const BASE_NETWORK: BaseNetwork = envNetwork === 'base' ? 'base' : 'base-sepolia'

export const SUPPORTED_CHAINS = [baseSepolia, base] as const

export const PREFERRED_CHAIN: Chain = BASE_NETWORK === 'base' ? base : baseSepolia

export const USDC_ADDRESSES: Record<BaseNetwork, Address> = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

export function resolveUsdcAddress(chainId?: number): Address {
  if (chainId === base.id) return USDC_ADDRESSES.base
  if (chainId === baseSepolia.id) return USDC_ADDRESSES['base-sepolia']
  return USDC_ADDRESSES[BASE_NETWORK]
}

export function getExplorerBaseUrl(chainId?: number): string {
  if (chainId === base.id) return 'https://basescan.org'
  if (chainId === baseSepolia.id) return 'https://sepolia.basescan.org'
  return BASE_NETWORK === 'base' ? 'https://basescan.org' : 'https://sepolia.basescan.org'
}

export function getChainLabel(chainId?: number): string {
  if (chainId === base.id) return 'Base'
  if (chainId === baseSepolia.id) return 'Base Sepolia'
  return BASE_NETWORK === 'base' ? 'Base' : 'Base Sepolia'
}

export function resolveRpcUrl(chainId?: number): string {
  if (chainId === base.id) {
    return (import.meta as any).env?.VITE_BASE_RPC_URL || base.rpcUrls.default.http[0]
  }
  if (chainId === baseSepolia.id) {
    return (import.meta as any).env?.VITE_BASE_SEPOLIA_RPC_URL || baseSepolia.rpcUrls.default.http[0]
  }
  return BASE_NETWORK === 'base'
    ? (import.meta as any).env?.VITE_BASE_RPC_URL || base.rpcUrls.default.http[0]
    : (import.meta as any).env?.VITE_BASE_SEPOLIA_RPC_URL || baseSepolia.rpcUrls.default.http[0]
}
