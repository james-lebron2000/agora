import { useState, useCallback, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import type { SupportedChain, BridgeTransaction } from '@agora/sdk'
import { useBridgeHistory } from '../hooks/useBridgeHistory'

// Local BridgeQuote type (mirror of SDK)
interface BridgeQuote {
  sourceChain: SupportedChain
  destinationChain: SupportedChain
  token: string
  amount: string
  estimatedFee: string
  estimatedTime: string
  nativeFee: bigint
}

// Chain metadata for UI display
const CHAIN_METADATA: Record<SupportedChain, { name: string; icon: string; color: string; nativeToken: string }> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    nativeToken: 'ETH'
  },
  base: {
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    nativeToken: 'ETH'
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    nativeToken: 'ETH'
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '💠',
    color: '#28A0F0',
    nativeToken: 'ETH'
  }
}

const SUPPORTED_CHAINS: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum']
type TokenType = 'USDC' | 'ETH'

interface BridgeCardProps {
  onBridgeComplete?: (result: { success: boolean; txHash?: string; error?: string }) => void
  defaultSourceChain?: SupportedChain
  defaultDestChain?: SupportedChain
}

export function BridgeCard({ 
  onBridgeComplete, 
  defaultSourceChain = 'base',
  defaultDestChain = 'optimism' 
}: BridgeCardProps) {
  const { address, isConnected } = useWallet()
  const { addPendingTx } = useBridgeHistory(address ?? undefined)
  
  // Form state
  const [sourceChain, setSourceChain] = useState<SupportedChain>(defaultSourceChain)
  const [destChain, setDestChain] = useState<SupportedChain>(defaultDestChain)
  const [token, setToken] = useState<TokenType>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [useCustomRecipient, setUseCustomRecipient] = useState(false)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [showChainSelect, setShowChainSelect] = useState<'source' | 'dest' | null>(null)
  const [quote, setQuote] = useState<BridgeQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Get available destination chains (exclude source)
  const availableDestChains = useMemo(() => 
    SUPPORTED_CHAINS.filter(c => c !== sourceChain),
    [sourceChain]
  )
  
  // Update destination if it matches source
  const handleSourceChange = useCallback((newSource: SupportedChain) => {
    setSourceChain(newSource)
    if (destChain === newSource) {
      setDestChain(availableDestChains[0])
    }
    setQuote(null)
  }, [destChain, availableDestChains])
  
  // Swap source and destination
  const handleSwapChains = useCallback(() => {
    const newSource = destChain
    const newDest = sourceChain
    setSourceChain(newSource)
    setDestChain(newDest)
    setQuote(null)
  }, [sourceChain, destChain])
  
  // Get quote for bridging
  const getQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    setIsQuoting(true)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock quote calculation
      const baseFee = token === 'USDC' ? 0.0005 : 0.001
      const multiplier = sourceChain === 'ethereum' || destChain === 'ethereum' ? 1.5 : 1
      const estimatedFee = (baseFee * multiplier).toFixed(6)
      
      const mockQuote: BridgeQuote = {
        sourceChain,
        destinationChain: destChain,
        token,
        amount,
        estimatedFee,
        estimatedTime: sourceChain === 'ethereum' || destChain === 'ethereum' ? '10-30 min' : '5-15 min',
        nativeFee: BigInt(Math.floor(parseFloat(estimatedFee) * 1e18))
      }
      
      setQuote(mockQuote)
    } catch (err) {
      setError('Failed to get quote. Please try again.')
    } finally {
      setIsQuoting(false)
    }
  }, [amount, token, sourceChain, destChain])
  
  // Execute bridge
  const executeBridge = useCallback(async () => {
    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate bridge execution
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock successful transaction
      const mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      
      const result = {
        success: true,
        txHash: mockTxHash,
        sourceChain,
        destinationChain: destChain,
        amount,
        token
      }
      
      // Save transaction to history
      const bridgeTx: BridgeTransaction = {
        txHash: mockTxHash as `0x${string}`,
        sourceChain,
        destinationChain: destChain,
        amount,
        token,
        status: 'pending',
        timestamp: Date.now(),
        fees: quote ? {
          nativeFee: quote.estimatedFee,
          lzTokenFee: '0'
        } : undefined,
        senderAddress: (address || mockTxHash) as `0x${string}`,
        recipientAddress: (useCustomRecipient && recipient ? recipient : (address || mockTxHash)) as `0x${string}`
      }
      addPendingTx(bridgeTx)
      
      onBridgeComplete?.(result)
      setAmount('')
      setQuote(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bridge failed'
      setError(errorMsg)
      onBridgeComplete?.({ success: false, error: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, amount, sourceChain, destChain, token, onBridgeComplete])
  
  // Format amount with token decimals
  const formatAmount = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    // Limit decimals based on token
    if (parts[1] && parts[1].length > (token === 'USDC' ? 6 : 18)) {
      return parts[0] + '.' + parts[1].slice(0, token === 'USDC' ? 6 : 18)
    }
    return cleaned
  }
  
  const sourceMeta = CHAIN_METADATA[sourceChain]
  const destMeta = CHAIN_METADATA[destChain]
  
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-agora-200 shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-base-light to-white border-b border-agora-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-base-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-agora-900">Cross-Chain Bridge</h2>
              <p className="text-xs text-agora-500">Transfer assets across L2 networks</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Token Selection */}
          <div className="flex gap-2 p-1 bg-agora-100 rounded-xl">
            {(['USDC', 'ETH'] as TokenType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setToken(t)
                  setQuote(null)
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                  token === t
                    ? 'bg-white text-agora-900 shadow-sm'
                    : 'text-agora-500 hover:text-agora-700'
                }`}
              >
                {t === 'USDC' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-usdc flex items-center justify-center text-[8px] text-white font-bold">$</span>
                    USDC
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-agora-400 flex items-center justify-center text-[8px] text-white font-bold">♦</span>
                    ETH
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Chain Selection */}
          <div className="relative">
            {/* Source Chain */}
            <div className="p-4 bg-agora-50 rounded-xl border border-agora-200">
              <label className="text-xs font-semibold text-agora-500 uppercase tracking-wider mb-2 block">
                From
              </label>
              <button
                onClick={() => setShowChainSelect(showChainSelect === 'source' ? null : 'source')}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-agora-200 hover:border-base-blue transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${sourceMeta.color}20` }}
                  >
                    {sourceMeta.icon}
                  </span>
                  <div className="text-left">
                    <div className="font-semibold text-agora-900">{sourceMeta.name}</div>
                    <div className="text-xs text-agora-500">{sourceMeta.nativeToken} Network</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-agora-400 transition-transform ${showChainSelect === 'source' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Source Chain Dropdown */}
              {showChainSelect === 'source' && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-agora-200 overflow-hidden z-20 animate-slide-up">
                  {SUPPORTED_CHAINS.map((chain) => {
                    const meta = CHAIN_METADATA[chain]
                    return (
                      <button
                        key={chain}
                        onClick={() => {
                          handleSourceChange(chain)
                          setShowChainSelect(null)
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-agora-50 transition-colors ${
                          sourceChain === chain ? 'bg-base-light' : ''
                        }`}
                      >
                        <span 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${meta.color}20` }}
                        >
                          {meta.icon}
                        </span>
                        <div className="text-left">
                          <div className="font-semibold text-agora-900">{meta.name}</div>
                          <div className="text-xs text-agora-500">{meta.nativeToken}</div>
                        </div>
                        {sourceChain === chain && (
                          <svg className="w-5 h-5 text-base-blue ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Swap Button */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                onClick={handleSwapChains}
                className="w-10 h-10 bg-white rounded-full border-2 border-agora-200 shadow-lg flex items-center justify-center hover:border-base-blue hover:shadow-xl transition-all group"
              >
                <svg className="w-5 h-5 text-agora-400 group-hover:text-base-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>
            
            {/* Destination Chain */}
            <div className="p-4 bg-agora-50 rounded-xl border border-agora-200 mt-2">
              <label className="text-xs font-semibold text-agora-500 uppercase tracking-wider mb-2 block">
                To
              </label>
              <button
                onClick={() => setShowChainSelect(showChainSelect === 'dest' ? null : 'dest')}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-agora-200 hover:border-base-blue transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${destMeta.color}20` }}
                  >
                    {destMeta.icon}
                  </span>
                  <div className="text-left">
                    <div className="font-semibold text-agora-900">{destMeta.name}</div>
                    <div className="text-xs text-agora-500">{destMeta.nativeToken} Network</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-agora-400 transition-transform ${showChainSelect === 'dest' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Destination Chain Dropdown */}
              {showChainSelect === 'dest' && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-agora-200 overflow-hidden z-20 animate-slide-up">
                  {availableDestChains.map((chain) => {
                    const meta = CHAIN_METADATA[chain]
                    return (
                      <button
                        key={chain}
                        onClick={() => {
                          setDestChain(chain)
                          setShowChainSelect(null)
                          setQuote(null)
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-agora-50 transition-colors ${
                          destChain === chain ? 'bg-base-light' : ''
                        }`}
                      >
                        <span 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${meta.color}20` }}
                        >
                          {meta.icon}
                        </span>
                        <div className="text-left">
                          <div className="font-semibold text-agora-900">{meta.name}</div>
                          <div className="text-xs text-agora-500">{meta.nativeToken}</div>
                        </div>
                        {destChain === chain && (
                          <svg className="w-5 h-5 text-base-blue ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-agora-500 uppercase tracking-wider mb-2 block">
              Amount
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  setAmount(formatAmount(e.target.value))
                  setQuote(null)
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 pr-20 bg-white border border-agora-200 rounded-xl text-lg font-semibold text-agora-900 placeholder:text-agora-300 focus:outline-none focus:border-base-blue focus:ring-2 focus:ring-base-blue/20 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-sm font-medium text-agora-500">{token}</span>
                <button
                  onClick={() => {
                    // Set max balance (mock)
                    setAmount(token === 'USDC' ? '1000' : '0.5')
                    setQuote(null)
                  }}
                  className="text-xs font-semibold text-base-blue hover:text-blue-600"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
          
          {/* Custom Recipient Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setUseCustomRecipient(!useCustomRecipient)
                if (!useCustomRecipient) {
                  setRecipient('')
                } else {
                  setRecipient(address || '')
                }
              }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                useCustomRecipient 
                  ? 'bg-base-blue border-base-blue' 
                  : 'border-agora-300 hover:border-agora-400'
              }`}
            >
              {useCustomRecipient && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="text-sm text-agora-600">Send to a different address</span>
          </div>
          
          {/* Custom Recipient Input */}
          {useCustomRecipient && (
            <div className="animate-slide-up">
              <label className="text-xs font-semibold text-agora-500 uppercase tracking-wider mb-2 block">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white border border-agora-200 rounded-xl text-sm font-mono text-agora-900 placeholder:text-agora-300 focus:outline-none focus:border-base-blue focus:ring-2 focus:ring-base-blue/20 transition-all"
              />
            </div>
          )}
          
          {/* Quote Display */}
          {quote && (
            <div className="p-4 bg-agora-50 rounded-xl border border-agora-200 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-agora-500">Estimated Fee</span>
                <span className="font-semibold text-agora-900">{quote.estimatedFee} ETH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-agora-500">Estimated Time</span>
                <span className="font-semibold text-agora-900 flex items-center gap-1">
                  <svg className="w-4 h-4 text-agora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {quote.estimatedTime}
                </span>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={getQuote}
              disabled={!amount || parseFloat(amount) <= 0 || isQuoting}
              className="flex-1 py-3 px-4 bg-agora-100 text-agora-700 rounded-xl font-semibold hover:bg-agora-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isQuoting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Getting Quote...
                </span>
              ) : (
                'Get Quote'
              )}
            </button>
            
            <button
              onClick={executeBridge}
              disabled={!isConnected || isLoading || !amount || parseFloat(amount) <= 0}
              className="flex-[2] py-3 px-4 bg-base-blue text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Bridging...
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Bridge {token}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </div>
          
          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-agora-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Powered by LayerZero for secure cross-chain transfers</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BridgeCard