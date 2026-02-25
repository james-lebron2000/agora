import { useState, useEffect, useCallback } from 'react'
import type { SupportedChain } from '@agora/sdk'

// Chain metadata
const CHAIN_METADATA: Record<SupportedChain, { name: string; icon: string; color: string; explorer: string }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    explorer: 'https://etherscan.io'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    explorer: 'https://basescan.org'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    explorer: 'https://optimistic.etherscan.io'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    explorer: 'https://arbiscan.io'
  }
}

type TransactionStatus = 'pending' | 'confirming' | 'completed' | 'failed'

interface BridgeTransaction {
  id: string
  txHash: string
  sourceChain: SupportedChain
  destinationChain: SupportedChain
  token: string
  amount: string
  status: TransactionStatus
  confirmations: number
  requiredConfirmations: number
  timestamp: number
  estimatedCompletion: string
}

interface BridgeStatusProps {
  transactions?: BridgeTransaction[]
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

// Mock transaction history
const MOCK_TRANSACTIONS: BridgeTransaction[] = [
  {
    id: '1',
    txHash: '0xabc123...def456',
    sourceChain: 'base',
    destinationChain: 'optimism',
    token: 'USDC',
    amount: '500',
    status: 'completed',
    confirmations: 32,
    requiredConfirmations: 20,
    timestamp: Date.now() - 86400000,
    estimatedCompletion: 'Completed'
  },
  {
    id: '2',
    txHash: '0xdef789...abc012',
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    token: 'ETH',
    amount: '0.25',
    status: 'confirming',
    confirmations: 12,
    requiredConfirmations: 20,
    timestamp: Date.now() - 300000,
    estimatedCompletion: '~5 minutes'
  },
  {
    id: '3',
    txHash: '0x345ghi...789jkl',
    sourceChain: 'ethereum',
    destinationChain: 'arbitrum',
    token: 'USDC',
    amount: '1000',
    status: 'pending',
    confirmations: 0,
    requiredConfirmations: 12,
    timestamp: Date.now() - 60000,
    estimatedCompletion: '~15 minutes'
  }
]

export function BridgeStatus({ 
  transactions: propTransactions,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 10000
}: BridgeStatusProps) {
  const [transactions, setTransactions] = useState<BridgeTransaction[]>(propTransactions || MOCK_TRANSACTIONS)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  
  // Filter transactions by status
  const pendingTransactions = transactions.filter(tx => 
    tx.status === 'pending' || tx.status === 'confirming'
  )
  const completedTransactions = transactions.filter(tx => 
    tx.status === 'completed' || tx.status === 'failed'
  )
  
  // Refresh transactions
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update mock transaction progress
      setTransactions(prev => prev.map(tx => {
        if (tx.status === 'pending' && tx.confirmations < 3) {
          return { ...tx, confirmations: tx.confirmations + 1, status: 'confirming' }
        }
        if (tx.status === 'confirming' && tx.confirmations < tx.requiredConfirmations) {
          const newConfirmations = tx.confirmations + Math.floor(Math.random() * 3) + 1
          return {
            ...tx,
            confirmations: Math.min(newConfirmations, tx.requiredConfirmations),
            status: newConfirmations >= tx.requiredConfirmations ? 'completed' : 'confirming'
          }
        }
        return tx
      }))
      
      onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh])
  
  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
  
  // Get status color
  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'completed': return 'bg-success text-success'
      case 'failed': return 'bg-red-100 text-red-600'
      case 'confirming': return 'bg-warning-light text-warning'
      default: return 'bg-agora-100 text-agora-500'
    }
  }
  
  // Get status icon
  const StatusIcon = ({ status }: { status: TransactionStatus }) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'confirming':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }
  
  // Progress bar component
  const ProgressBar = ({ current, total }: { current: number; total: number }) => {
    const percentage = Math.min((current / total) * 100, 100)
    return (
      <div className="w-full h-2 bg-agora-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-base-blue transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
  
  // Transaction card component
  const TransactionCard = ({ tx }: { tx: BridgeTransaction }) => {
    const sourceMeta = CHAIN_METADATA[tx.sourceChain]
    const destMeta = CHAIN_METADATA[tx.destinationChain]
    const isExpanded = expandedTx === tx.id
    
    return (
      <div 
        className={`p-4 bg-agora-50 rounded-xl border transition-all ${
          isExpanded ? 'border-base-blue shadow-md' : 'border-agora-200 hover:border-agora-300'
        }`}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
        >
          <div className="flex items-center gap-3">
            {/* Chain icons */}
            <div className="flex items-center">
              <span 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border-2 border-white"
                style={{ backgroundColor: `${sourceMeta.color}20` }}
              >
                {sourceMeta.icon}
              </span>
              <span 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border-2 border-white -ml-2"
                style={{ backgroundColor: `${destMeta.color}20` }}
              >
                {destMeta.icon}
              </span>
            </div>
            
            {/* Amount and chains */}
            <div>
              <div className="font-semibold text-agora-900">
                {tx.amount} {tx.token}
              </div>
              <div className="text-xs text-agora-500">
                {sourceMeta.name} → {destMeta.name}
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(tx.status)}`}>
            <StatusIcon status={tx.status} />
            <span className="capitalize">{tx.status}</span>
          </div>
        </div>
        
        {/* Progress bar for pending/confirming */}
        {(tx.status === 'pending' || tx.status === 'confirming') && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-agora-500 mb-1">
              <span>{tx.confirmations} / {tx.requiredConfirmations} confirmations</span>
              <span>{tx.estimatedCompletion}</span>
            </div>
            <ProgressBar current={tx.confirmations} total={tx.requiredConfirmations} />
          </div>
        )}
        
        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-agora-200 space-y-2 animate-slide-up">
            <div className="flex justify-between text-sm">
              <span className="text-agora-500">Transaction Hash</span>
              <a 
                href={`${sourceMeta.explorer}/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-base-blue hover:underline"
              >
                {tx.txHash}
              </a>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-agora-500">Started</span>
              <span className="text-agora-700">{formatTimeAgo(tx.timestamp)}</span>
            </div>
            {tx.status === 'completed' && (
              <div className="flex justify-between text-sm">
                <span className="text-agora-500">Completed</span>
                <span className="text-success font-medium">✓ Success</span>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <a
                href={`${sourceMeta.explorer}/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-center text-sm font-medium text-agora-600 bg-white border border-agora-200 rounded-lg hover:border-base-blue hover:text-base-blue transition-colors"
              >
                View Source
              </a>
              {tx.status === 'completed' && (
                <a
                  href={`${destMeta.explorer}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center text-sm font-medium text-agora-600 bg-white border border-agora-200 rounded-lg hover:border-base-blue hover:text-base-blue transition-colors"
                >
                  View Dest
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          <svg 
            className={`w-4 h-4 text-agora-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-base-light rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-base-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="font-bold text-agora-900">Bridge Status</h2>
        </div>
        
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="p-2 text-agora-500 hover:text-agora-700 hover:bg-agora-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-base-blue text-white'
              : 'bg-agora-100 text-agora-600 hover:bg-agora-200'
          }`}
        >
          Pending ({pendingTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-base-blue text-white'
              : 'bg-agora-100 text-agora-600 hover:bg-agora-200'
          }`}
        >
          History ({completedTransactions.length})
        </button>
      </div>
      
      {/* Transaction List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {activeTab === 'pending' ? (
          pendingTransactions.length > 0 ? (
            pendingTransactions.map(tx => (
              <TransactionCard key={tx.id} tx={tx} />
            ))
          ) : (
            <div className="text-center py-8 text-agora-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-agora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No pending transactions</p>
            </div>
          )
        ) : (
          completedTransactions.length > 0 ? (
            completedTransactions.map(tx => (
              <TransactionCard key={tx.id} tx={tx} />
            ))
          ) : (
            <div className="text-center py-8 text-agora-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-agora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No transaction history</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default BridgeStatus