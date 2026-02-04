import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'

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

// Base chain USDC contract address
export const USDC_CONTRACT_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Base chain ID
export const BASE_CHAIN_ID = '0x2105' // 8453 in hex

interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: string | null
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    error: null,
    balance: null,
  })

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !(window as any).ethereum) return

      try {
        const ethereum = (window as any).ethereum
        const accounts = await ethereum.request({ method: 'eth_accounts' })
        const chainId = await ethereum.request({ method: 'eth_chainId' })

        if (accounts.length > 0) {
          setState(prev => ({
            ...prev,
            address: accounts[0],
            isConnected: true,
            chainId,
          }))
          fetchBalance(accounts[0])
        }
      } catch (err) {
        console.error('Failed to check wallet connection:', err)
      }
    }

    checkConnection()
  }, [])

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return

    const ethereum = (window as any).ethereum

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(prev => ({
          ...prev,
          address: null,
          isConnected: false,
          balance: null,
        }))
      } else {
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
        }))
        fetchBalance(accounts[0])
      }
    }

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({ ...prev, chainId }))
      if (state.address) {
        fetchBalance(state.address)
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [state.address])

  const fetchBalance = async (address: string) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return

    try {
      const ethereum = (window as any).ethereum

      // Get USDC balance using eth_call
      const data = `0x70a08231${address.slice(2).padStart(64, '0')}`
      const result = await ethereum.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_BASE,
          data,
        }, 'latest'],
      })

      // USDC has 6 decimals
      const balanceRaw = BigInt(result)
      const balanceFormatted = Number(balanceRaw) / 1e6
      setState(prev => ({ ...prev, balance: balanceFormatted.toFixed(2) }))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
      setState(prev => ({ ...prev, balance: null }))
    }
  }

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setState(prev => ({ ...prev, error: 'No wallet detected. Please install MetaMask or another Web3 wallet.' }))
      return
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const ethereum = (window as any).ethereum
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      const chainId = await ethereum.request({ method: 'eth_chainId' })

      if (accounts.length > 0) {
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          chainId,
          isConnecting: false,
        }))
        fetchBalance(accounts[0])
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to connect wallet',
        isConnecting: false,
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      error: null,
      balance: null,
    })
  }, [])

  const switchToBaseChain = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return false

    try {
      const ethereum = (window as any).ethereum

      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        })
        return true
      } catch (switchError: any) {
        // Chain not added to wallet
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          })
          return true
        }
        throw switchError
      }
    } catch (err) {
      console.error('Failed to switch to Base chain:', err)
      return false
    }
  }, [])

  const sendUSDCTransfer = useCallback(async (to: string, amount: string): Promise<{ txHash: string }> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No wallet detected')
    }

    if (!state.address) {
      throw new Error('Wallet not connected')
    }

    const ethereum = (window as any).ethereum

    // Convert amount to USDC units (6 decimals)
    const amountUnits = BigInt(Math.floor(parseFloat(amount) * 1e6))

    // Encode transfer function call
    // transfer(address,uint256) = 0xa9059cbb
    const toPadded = to.slice(2).toLowerCase().padStart(64, '0')
    const amountHex = amountUnits.toString(16).padStart(64, '0')
    const data = `0xa9059cbb${toPadded}${amountHex}`

    const txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: state.address,
        to: USDC_CONTRACT_BASE,
        data,
      }],
    })

    return { txHash }
  }, [state.address])

  const isBaseChain = state.chainId === BASE_CHAIN_ID

  return (
    <WalletContext.Provider value={{
      ...state,
      connect,
      disconnect,
      switchToBaseChain,
      sendUSDCTransfer,
      isBaseChain,
    }}>
      {children}
    </WalletContext.Provider>
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
