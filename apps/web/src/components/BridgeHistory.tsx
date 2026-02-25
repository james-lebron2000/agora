import { useState, useMemo } from 'react'
import type { BridgeTransaction, SupportedChain } from '@agora/sdk'

type TransactionStatus = 'all' | 'pending' | 'completed' | 'failed'

interface BridgeHistoryProps {
  transactions: BridgeTransaction[]
  isLoading?: boolean
  onRefresh?: () => void
}

// Chain metadata for display
const CHAIN_METADATA: Record<SupportedChain, { name: string; icon: string; color: string; explorer: string }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    explorer: 'https://etherscan.io/tx/'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    explorer: 'https://basescan.org/tx/'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    explorer: 'https://optimistic.etherscan.io/tx/'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    explorer: 'https://arbiscan.io/tx/'
  }
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(timestamp).toLocaleDateString()
}

// Format address for display
function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-red-100 text-red-700 border-red-200'
  }
  
  const icons = {
    pending: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    completed: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Chain icon component
function ChainIcon({ chain, size = 'md' }: { chain: SupportedChain; size?: 'sm' | 'md' }) {
  const meta = CHAIN_METADATA[chain]
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-sm' : 'w-7 h-7 text-lg'
  
  return (
    <div 
      className={`${sizeClass} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: `${meta.color}20` }}
      title={meta.name}
    >
      {meta.icon}
    </div>
  )
}

// Transaction item component
function TransactionItem({ tx }: { tx: BridgeTransaction }) {
  const sourceMeta = CHAIN_METADATA[tx.sourceChain]
  const destMeta = CHAIN_METADATA[tx.destinationChain]
  
  const handleClick = () => {
    const explorerUrl = sourceMeta.explorer + tx.txHash
    window.open(explorerUrl, '_blank')
  }
  
  return (
    <div 
      onClick={handleClick}
      className="group p-4 bg-white rounded-xl border border-agora-200 hover:border-base-blue hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <ChainIcon chain={tx.sourceChain} size="sm" />
            <div className="w-4 h-4 bg-agora-100 rounded-full flex items-center justify-center border-2 border-white">
              <svg className="w-2 h-2 text-agora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <ChainIcon chain={tx.destinationChain} size="sm" />
          </div>
          <div>
            <div className="font-semibold text-agora-900 text-sm">
              {sourceMeta.name} → {destMeta.name}
            </div>
            <div className="text-xs text-agora-500">
              {formatRelativeTime(tx.timestamp)}
            </div>
          </div>
        </div>
        <StatusBadge status={tx.status} />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-agora-900">{tx.amount}</span>
          <span className="text-sm font-medium text-agora-500">{tx.token}</span>
        </div>
        <div className="text-xs text-agora-400 font-mono">
          {formatAddress(tx.txHash)}
        </div>
      </div>
      
      {tx.fees && (
        <div className="mt-2 pt-2 border-t border-agora-100 flex items-center justify-between text-xs text-agora-400">
          <span>Fee: {parseFloat(tx.fees.nativeFee).toFixed(6)} ETH</span>
          <span className="group-hover:text-base-blue transition-colors flex items-center gap-1">
            View on Explorer
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        </div>
      )}
    </div>
  )
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-agora-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-agora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-agora-900 mb-1">No Bridge History</h3>
      <p className="text-sm text-agora-500 text-center max-w-xs">
        Your cross-chain bridge transactions will appear here. Start by bridging assets between networks.
      </p>
    </div>
  )
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 bg-white rounded-xl border border-agora-200 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-7 h-7 bg-agora-200 rounded-full" />
                <div className="w-7 h-7 bg-agora-200 rounded-full" />
              </div>
              <div className="w-24 h-4 bg-agora-200 rounded" />
            </div>
            <div className="w-16 h-5 bg-agora-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="w-20 h-5 bg-agora-200 rounded" />
            <div className="w-24 h-3 bg-agora-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BridgeHistory({ transactions, isLoading = false, onRefresh }: BridgeHistoryProps) {
  const [activeFilter, setActiveFilter] = useState<TransactionStatus>('all')
  
  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions
    return transactions.filter(tx => tx.status === activeFilter)
  }, [transactions, activeFilter])
  
  const filterCounts = useMemo(() => ({
    all: transactions.length,
    pending: transactions.filter(tx => tx.status === 'pending').length,
    completed: transactions.filter(tx => tx.status === 'completed').length,
    failed: transactions.filter(tx => tx.status === 'failed').length
  }), [transactions])
  
  const filters: { key: TransactionStatus; label: string }[] = [
    { key: 'all', label: `All (${filterCounts.all})` },
    { key: 'pending', label: `Pending (${filterCounts.pending})` },
    { key: 'completed', label: `Completed (${filterCounts.completed})` },
    { key: 'failed', label: `Failed (${filterCounts.failed})` }
  ]
  
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-agora-50 to-white border-b border-agora-100 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-base-blue to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-agora-900">Bridge History</h2>
              <p className="text-xs text-agora-500">
                {filterCounts.pending > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    {filterCounts.pending} pending transaction{filterCounts.pending > 1 ? 's' : ''}
                  </span>
                ) : (
                  `${filterCounts.completed} completed bridge${filterCounts.completed !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-agora-400 hover:text-agora-600 hover:bg-agora-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh history"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="bg-white border-x border-b border-agora-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === key
                  ? 'text-base-blue border-b-2 border-base-blue bg-blue-50/50'
                  : 'text-agora-500 hover:text-agora-700 hover:bg-agora-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="bg-agora-50 border-x border-b border-agora-200 rounded-b-2xl p-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredTransactions.map(tx => (
              <TransactionItem key={tx.txHash} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BridgeHistory
