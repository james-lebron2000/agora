import { useState, useEffect, useCallback } from 'react'
import type { SupportedChain, ChainBalance } from '@agora/sdk'

// Chain metadata
const CHAIN_METADATA: Record<SupportedChain, { name: string; icon: string; color: string; chainId: number }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    chainId: 1
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    chainId: 8453
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    chainId: 10
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    chainId: 42161
  }
}

const SUPPORTED_CHAINS: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum']

interface MultiChainBalanceProps {
  address?: string
  onChainSelect?: (chain: SupportedChain) => void
  autoRefresh?: boolean
  refreshInterval?: number
}

// Mock balance data
const generateMockBalances = (_address?: string): ChainBalance[] => {
  return SUPPORTED_CHAINS.map(chain => ({
    chain,
    nativeBalance: (Math.random() * 2 + 0.01).toFixed(4),
    usdcBalance: (Math.random() * 5000 + 100).toFixed(2)
  }))
}

export function MultiChainBalance({ 
  address,
  onChainSelect,
  autoRefresh = true,
  refreshInterval = 30000
}: MultiChainBalanceProps) {
  const [balances, setBalances] = useState<ChainBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  
  // Calculate totals
  const totals = balances.reduce(
    (acc, bal) => {
      const usdc = parseFloat(bal.usdcBalance) || 0
      const native = parseFloat(bal.nativeBalance) || 0
      return {
        usdc: acc.usdc + usdc,
        native: acc.native + native
      }
    },
    { usdc: 0, native: 0 }
  )
  
  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances(generateMockBalances())
      setLastUpdated(new Date())
      return
    }
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, this would call the SDK
      // const balances = await getAllBalances(address as Address)
      setBalances(generateMockBalances(address))
      setLastUpdated(new Date())
    } finally {
      setIsLoading(false)
    }
  }, [address])
  
  // Initial load
  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchBalances, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchBalances])
  
  // Handle chain selection
  const handleChainClick = (chain: SupportedChain) => {
    setSelectedChain(chain)
    onChainSelect?.(chain)
  }
  
  // Format currency
  const formatCurrency = (value: number, decimals = 2) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`
    }
    return `$${value.toFixed(decimals)}`
  }
  
  // Sort balances by USDC value (descending)
  const sortedBalances = [...balances].sort((a, b) => 
    parseFloat(b.usdcBalance) - parseFloat(a.usdcBalance)
  )
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-usdc-light rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-usdc" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-agora-900">Multi-Chain Balance</h2>
            {lastUpdated && (
              <p className="text-xs text-agora-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="p-2 text-agora-500 hover:text-agora-700 hover:bg-agora-100 rounded-lg transition-colors"
            title={expandedView ? 'Collapse view' : 'Expand view'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${expandedView ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={fetchBalances}
            disabled={isLoading}
            className="p-2 text-agora-500 hover:text-agora-700 hover:bg-agora-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh balances"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Total Balance Card */}
      <div className="p-4 bg-gradient-to-br from-base-blue to-blue-600 rounded-xl text-white mb-4 shadow-lg shadow-blue-500/25">
        <div className="text-sm text-blue-100 mb-1">Total USDC Balance</div>
        <div className="text-2xl font-bold mb-2">
          {formatCurrency(totals.usdc)}
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-100">
          <span>~{totals.native.toFixed(4)} ETH</span>
          <span className="w-1 h-1 rounded-full bg-blue-200" />
          <span>Across {balances.length} chains</span>
        </div>
      </div>
      
      {/* Chain Balances */}
      <div className="space-y-2">
        {sortedBalances.map((balance) => {
          const meta = CHAIN_METADATA[balance.chain]
          const isSelected = selectedChain === balance.chain
          const usdcValue = parseFloat(balance.usdcBalance)
          const totalUsdc = totals.usdc || 1
          const percentage = (usdcValue / totalUsdc) * 100
          
          return (
            <button
              key={balance.chain}
              onClick={() => handleChainClick(balance.chain)}
              className={`w-full p-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'bg-base-light border-base-blue shadow-md'
                  : 'bg-agora-50 border-agora-200 hover:border-agora-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${meta.color}20` }}
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <div className="font-semibold text-agora-900">{meta.name}</div>
                    <div className="text-xs text-agora-500">Chain ID: {meta.chainId}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-agora-900">
                    ${parseFloat(balance.usdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-agora-500">
                    {parseFloat(balance.nativeBalance).toFixed(4)} ETH
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-agora-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: meta.color
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-agora-500 w-10 text-right">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              
              {/* Expanded details */}
              {expandedView && (
                <div className="mt-3 pt-3 border-t border-agora-200 grid grid-cols-2 gap-3 animate-slide-up">
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-xs text-agora-500 mb-1">USDC Balance</div>
                    <div className="font-semibold text-agora-900">
                      ${parseFloat(balance.usdcBalance).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-xs text-agora-500 mb-1">Native Balance</div>
                    <div className="font-semibold text-agora-900">
                      {parseFloat(balance.nativeBalance).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            const highestBalanceChain = sortedBalances[0]?.chain
            if (highestBalanceChain) {
              handleChainClick(highestBalanceChain)
            }
          }}
          className="py-2 px-3 bg-agora-100 text-agora-700 rounded-lg text-sm font-medium hover:bg-agora-200 transition-colors"
        >
          Highest Balance
        </button>
        <button
          onClick={fetchBalances}
          disabled={isLoading}
          className="py-2 px-3 bg-base-light text-base-blue rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>
      
      {/* Info footer */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-agora-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Prices are estimates. Refresh for latest balances.</span>
      </div>
    </div>
  )
}

export default MultiChainBalance