import { useState, useCallback } from 'react'

export type SupportedChain = 'ethereum' | 'base' | 'optimism' | 'arbitrum'
export type TokenType = 'USDC' | 'ETH'

interface BridgeQuote {
  quoteId: string
  sourceChain: SupportedChain
  destinationChain: SupportedChain
  token: TokenType
  amount: string
  senderAddress: string
  estimatedFee: number
  estimatedTime: number
  path: string[]
  expiresAt: number
}

interface BridgeTransaction {
  txHash: string
  sourceChain: SupportedChain
  destinationChain: SupportedChain
  token: TokenType
  amount: string
  senderAddress: string
  recipientAddress: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_found'
  createdAt: string
  estimatedCompletion: string
  progress?: number
}

interface BridgeExecuteRequest {
  sourceChain: SupportedChain
  destinationChain: SupportedChain
  token: TokenType
  amount: string
  senderAddress: string
  recipientAddress?: string
}

interface UseBridgeReturn {
  getQuote: (params: {
    sourceChain: SupportedChain
    destinationChain: SupportedChain
    token: TokenType
    amount: string
    senderAddress: string
  }) => Promise<BridgeQuote | null>
  executeBridge: (params: BridgeExecuteRequest) => Promise<BridgeTransaction | null>
  getTransactionHistory: (address: string) => Promise<BridgeTransaction[]>
  getTransactionStatus: (txHash: string) => Promise<BridgeTransaction | null>
  getSupportedChains: () => Promise<ChainInfo[]>
  isLoading: boolean
  error: string | null
}

export interface ChainInfo {
  id: SupportedChain
  name: string
  icon: string
  color: string
  nativeToken: string
  usdcAddress: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useBridge(): UseBridgeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getQuote = useCallback(async (params: {
    sourceChain: SupportedChain
    destinationChain: SupportedChain
    token: TokenType
    amount: string
    senderAddress: string
  }): Promise<BridgeQuote | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bridge/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        throw new Error(`Failed to get quote: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get quote'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const executeBridge = useCallback(async (params: BridgeExecuteRequest): Promise<BridgeTransaction | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bridge/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        throw new Error(`Failed to execute bridge: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to execute bridge'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getTransactionHistory = useCallback(async (address: string): Promise<BridgeTransaction[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bridge/transactions/${address}`, {
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to get history: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get history'
      setError(msg)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getTransactionStatus = useCallback(async (txHash: string): Promise<BridgeTransaction | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bridge/status/${txHash}`, {
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get status'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSupportedChains = useCallback(async (): Promise<ChainInfo[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bridge/chains`, {
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to get chains: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get chains'
      setError(msg)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    getQuote,
    executeBridge,
    getTransactionHistory,
    getTransactionStatus,
    getSupportedChains,
    isLoading,
    error
  }
}

export default useBridge
