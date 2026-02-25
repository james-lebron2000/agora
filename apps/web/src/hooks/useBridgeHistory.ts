import { useState, useEffect, useCallback, useRef } from 'react'
import type { BridgeTransaction } from '@agora/sdk'

// Storage key prefix for bridge history
const STORAGE_KEY_PREFIX = 'bridge-history-'

interface UseBridgeHistoryReturn {
  transactions: BridgeTransaction[]
  pendingCount: number
  isLoading: boolean
  error: string | null
  refreshHistory: () => void
  addPendingTx: (tx: BridgeTransaction) => void
  updateTxStatus: (txHash: string, status: 'pending' | 'completed' | 'failed') => void
}

export function useBridgeHistory(address: string | undefined): UseBridgeHistoryReturn {
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load transactions from localStorage
  const loadTransactions = useCallback((): BridgeTransaction[] => {
    if (!address || typeof window === 'undefined') return []
    
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as BridgeTransaction[]
        // Sort by timestamp descending
        return parsed.sort((a, b) => b.timestamp - a.timestamp)
      }
      return []
    } catch (err) {
      console.error('[useBridgeHistory] Failed to load transactions:', err)
      setError('Failed to load transaction history')
      return []
    }
  }, [address])

  // Refresh history from localStorage
  const refreshHistory = useCallback(() => {
    setIsLoading(true)
    const txs = loadTransactions()
    setTransactions(txs)
    setIsLoading(false)
  }, [loadTransactions])

  // Add a pending transaction
  const addPendingTx = useCallback((tx: BridgeTransaction) => {
    if (!address || typeof window === 'undefined') return

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`
      const stored = localStorage.getItem(storageKey)
      const existing: BridgeTransaction[] = stored ? JSON.parse(stored) : []
      
      // Check for duplicates
      const exists = existing.some(
        t => t.txHash.toLowerCase() === tx.txHash.toLowerCase()
      )
      
      if (!exists) {
        const updated = [tx, ...existing]
        // Keep only last 100 transactions
        const trimmed = updated.slice(0, 100)
        localStorage.setItem(storageKey, JSON.stringify(trimmed))
        setTransactions(trimmed)
      }
    } catch (err) {
      console.error('[useBridgeHistory] Failed to add transaction:', err)
      setError('Failed to save transaction')
    }
  }, [address])

  // Update transaction status
  const updateTxStatus = useCallback((txHash: string, status: 'pending' | 'completed' | 'failed') => {
    if (!address || typeof window === 'undefined') return

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`
      const stored = localStorage.getItem(storageKey)
      if (!stored) return

      const existing: BridgeTransaction[] = JSON.parse(stored)
      const updated = existing.map(tx => 
        tx.txHash.toLowerCase() === txHash.toLowerCase()
          ? { ...tx, status }
          : tx
      )
      
      localStorage.setItem(storageKey, JSON.stringify(updated))
      setTransactions(updated)
    } catch (err) {
      console.error('[useBridgeHistory] Failed to update status:', err)
      setError('Failed to update transaction status')
    }
  }, [address])

  // Auto-refresh pending transactions
  useEffect(() => {
    const checkPendingTransactions = () => {
      const pending = transactions.filter(tx => tx.status === 'pending')
      if (pending.length === 0) return

      // In a real implementation, this would check the blockchain for status
      // For now, we'll simulate completion after a delay
      pending.forEach(tx => {
        const timeSinceCreation = Date.now() - tx.timestamp
        // Auto-complete after 2 minutes (for demo purposes)
        if (timeSinceCreation > 120000) {
          updateTxStatus(tx.txHash, 'completed')
        }
      })
    }

    // Set up interval to check every 30 seconds
    refreshIntervalRef.current = setInterval(checkPendingTransactions, 30000)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [transactions, updateTxStatus])

  // Initial load
  useEffect(() => {
    if (address) {
      refreshHistory()
    } else {
      setTransactions([])
      setIsLoading(false)
    }
  }, [address, refreshHistory])

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (address && e.key === `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`) {
        refreshHistory()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [address, refreshHistory])

  const pendingCount = transactions.filter(tx => tx.status === 'pending').length

  return {
    transactions,
    pendingCount,
    isLoading,
    error,
    refreshHistory,
    addPendingTx,
    updateTxStatus
  }
}

export default useBridgeHistory
