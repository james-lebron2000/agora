import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRightLeft, 
  Wallet, 
  History,
  RefreshCw,
  Clock,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Layers
} from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import { useBridgeHistory } from '../../hooks/useBridgeHistory'
import { BridgeCard } from '../../components/BridgeCard'
import { BridgeStatus } from '../../components/BridgeStatus'
import type { SupportedChain } from '@agora/sdk'

// Supported chains for display
const CHAIN_INFO: Record<SupportedChain, { name: string; icon: string; color: string }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0'
  }
}

export default function BridgePage() {
  const { address, isConnected } = useWallet()
  
  const { 
    transactions, 
    isLoading: isLoadingHistory,
    refreshHistory 
  } = useBridgeHistory(address ?? undefined)
  
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshHistory()
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  const handleBridgeComplete = (result: { success: boolean; txHash?: string; error?: string }) => {
    if (result.success) {
      // Refresh data after successful bridge
      setTimeout(() => {
        handleRefresh()
      }, 2000)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-base-blue to-blue-600 flex items-center justify-center shadow-xl">
            <ArrowRightLeft className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-agora-900 mb-3">Cross-Chain Bridge</h1>
          <p className="text-agora-600 mb-8">
            Transfer USDC seamlessly between Base, Optimism, Arbitrum, and Ethereum using LayerZero's secure cross-chain protocol.
          </p>
          <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-agora-200">
            <div className="flex items-center gap-3 text-agora-600">
              <Wallet className="w-5 h-5 text-base-blue" />
              <span>Connect your wallet to start bridging</span>
            </div>
          </div>
          
          {/* Supported Chains */}
          <div className="mt-8">
            <p className="text-sm text-agora-500 mb-4">Supported Chains</p>
            <div className="flex items-center justify-center gap-4">
              {Object.entries(CHAIN_INFO).map(([chain, info]) => (
                <div 
                  key={chain}
                  className="flex flex-col items-center gap-1"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${info.color}20` }}
                  >
                    {info.icon}
                  </div>
                  <span className="text-xs text-agora-500">{info.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-agora-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-base-blue to-blue-600 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-agora-900">Cross-Chain Bridge</h1>
                <p className="text-xs text-agora-500">Powered by LayerZero</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-agora-500">
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-agora-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-agora-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-base-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-agora-500">Supported Chains</p>
                    <p className="text-lg font-bold text-agora-900">4 Networks</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {Object.entries(CHAIN_INFO).map(([chain, info]) => (
                    <span key={chain} className="text-lg" title={info.name}>
                      {info.icon}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-agora-500">Bridge Speed</p>
                    <p className="text-lg font-bold text-agora-900">~60 seconds</p>
                  </div>
                </div>
                <p className="text-xs text-agora-500 mt-2">
                  Fast cross-chain transfers via LayerZero
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-agora-500">Security</p>
                    <p className="text-lg font-bold text-agora-900">LayerZero V2</p>
                  </div>
                </div>
                <p className="text-xs text-agora-500 mt-2">
                  Battle-tested cross-chain messaging
                </p>
              </motion.div>
            </div>

            {/* Main Bridge Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Bridge Card */}
              <div className="lg:col-span-2">
                <BridgeCard 
                  onBridgeComplete={handleBridgeComplete}
                  defaultSourceChain="base"
                  defaultDestChain="optimism"
                />
              </div>

              {/* Right Column - Status & History */}
              <div className="space-y-6">
                <BridgeStatus />
                
                {/* Supported Chains */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                >
                  <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-base-blue" />
                    Supported Chains
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(CHAIN_INFO).map(([chain, info]) => (
                      <div 
                        key={chain}
                        className="flex items-center justify-between p-3 bg-agora-50 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="text-sm font-medium text-agora-700">
                            {info.name}
                          </span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Transactions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-agora-900 flex items-center gap-2">
                      <History className="w-5 h-5 text-base-blue" />
                      Recent Transactions
                    </h3>
                    <a 
                      href="#" 
                      className="text-sm text-base-blue hover:underline flex items-center gap-1"
                      onClick={(e) => {
                        e.preventDefault()
                        handleRefresh()
                      }}
                    >
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-agora-200 border-t-base-blue rounded-full animate-spin" />
                    </div>
                  ) : transactions && transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 3).map((tx) => (
                        <div 
                          key={tx.txHash}
                          className="flex items-center justify-between p-3 bg-agora-50 rounded-xl hover:bg-agora-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <span className="text-sm">{CHAIN_INFO[tx.sourceChain]?.icon}</span>
                              <ArrowRight className="w-3 h-3 text-agora-400 mx-1" />
                              <span className="text-sm">{CHAIN_INFO[tx.destinationChain]?.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-agora-900">
                                {tx.amount} {tx.token}
                              </p>
                              <p className="text-xs text-agora-500">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-agora-500">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bridge transactions yet</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
