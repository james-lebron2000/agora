import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
  useSwitchChain,
  useWriteContract,
} from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import {
  RainbowKitProvider,
  connectorsForWallets,
  useConnectModal,
  lightTheme,
} from '@rainbow-me/rainbowkit'
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { parseUnits, type Address } from 'viem'
import { PREFERRED_CHAIN, SUPPORTED_CHAINS, resolveUsdcAddress } from '../lib/chain'

// USDC Contract ABI (minimal for transfer and balanceOf)
export const USDC_ABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  // transfer
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  // approve
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  // allowance
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const

interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  error: string | null
  balance: string | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchToBaseChain: () => Promise<boolean>
  sendUSDCTransfer: (to: string, amount: string) => Promise<{ txHash: string }>
  isBaseChain: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

const walletConnectProjectId =
  (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000'

const chains = SUPPORTED_CHAINS

const baseRpcUrl =
  (import.meta as any).env?.VITE_BASE_RPC_URL || base.rpcUrls.default.http[0]
const baseSepoliaRpcUrl =
  (import.meta as any).env?.VITE_BASE_SEPOLIA_RPC_URL || baseSepolia.rpcUrls.default.http[0]

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Wallets',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        coinbaseWallet,
        trustWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    projectId: walletConnectProjectId,
    appName: 'Agora',
  },
)

const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(baseRpcUrl),
    [baseSepolia.id]: http(baseSepoliaRpcUrl),
  },
  ssr: false,
})

const queryClient = new QueryClient()

function WalletStateProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const { openConnectModal } = useConnectModal()
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const activeChainId = isConnected ? chainId : PREFERRED_CHAIN.id
  const usdcAddress = resolveUsdcAddress(activeChainId)
  const { data: balanceData } = useBalance({
    address: address as Address | undefined,
    token: usdcAddress,
    chainId: activeChainId,
    query: {
      enabled: Boolean(address),
    },
  })
  const { writeContractAsync } = useWriteContract()

  const balance = useMemo(() => {
    if (!balanceData) return null
    const formatted = Number(balanceData.formatted)
    if (Number.isNaN(formatted)) return null
    return formatted.toFixed(2)
  }, [balanceData])

  const connect = async () => {
    if (openConnectModal) {
      openConnectModal()
      return
    }
  }

  const disconnect = () => {
    disconnectAsync().catch(() => {})
  }

  const switchToBaseChain = async (): Promise<boolean> => {
    try {
      await switchChainAsync({ chainId: PREFERRED_CHAIN.id })
      return true
    } catch (err) {
      console.error('Failed to switch to Base chain:', err)
      return false
    }
  }

  const sendUSDCTransfer = async (to: string, amount: string): Promise<{ txHash: string }> => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    const amountUnits = parseUnits(amount, 6)
    const txHash = await writeContractAsync({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to as Address, amountUnits],
    })

    return { txHash }
  }

  const contextValue: WalletContextType = {
    address: address ?? null,
    isConnected,
    isConnecting,
    chainId: isConnected ? chainId : null,
    error: null,
    balance,
    connect,
    disconnect,
    switchToBaseChain,
    sendUSDCTransfer,
    isBaseChain: isConnected && chainId === PREFERRED_CHAIN.id,
  }

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={PREFERRED_CHAIN}
          appInfo={{ appName: 'Agora' }}
          theme={lightTheme({
            accentColor: '#0052FF',
            accentColorForeground: '#ffffff',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <WalletStateProvider>{children}</WalletStateProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Utility to truncate address
export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}
