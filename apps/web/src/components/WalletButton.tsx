import { useState, useRef, useEffect } from 'react'
import { useWallet, truncateAddress } from '../hooks/useWallet'
import { getChainLabel, getExplorerBaseUrl } from '../lib/chain'

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, isBaseChain, balance, switchToBaseChain } = useWallet()
  const chainLabel = getChainLabel()
  const explorerBaseUrl = getExplorerBaseUrl()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isConnected) {
    return (
      <button
        onClick={() => connect()}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2.5 bg-agora-900 text-white rounded-xl font-semibold hover:bg-agora-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-agora-900/25 hover:shadow-agora-900/40 animate-fade-in"
      >
        {isConnecting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl animate-fade-in ${
          isBaseChain
            ? 'bg-white text-agora-900 border border-agora-200 hover:border-agora-400'
            : 'bg-warning-light text-warning border border-warning/20 hover:bg-warning/20'
        }`}
      >
        {/* Connection Status Indicator */}
        <span className={`w-2 h-2 rounded-full ${isBaseChain ? 'bg-success animate-pulse' : 'bg-warning'}`} />

        {/* Balance */}
        {balance && (
          <span className="text-agora-500 font-medium text-sm">
            ${balance}
          </span>
        )}

        {/* Address */}
        <span className="font-mono text-sm">
          {truncateAddress(address!, 4)}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-agora-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-agora-100 overflow-hidden animate-slide-up z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-agora-50 to-white border-b border-agora-100">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${isBaseChain ? 'bg-success' : 'bg-warning'}`} />
              <span className="text-xs font-semibold text-agora-600 uppercase tracking-wider">
                {isBaseChain ? 'Connected' : 'Wrong Network'}
              </span>
            </div>
            <div className="font-mono text-sm text-agora-900">
              {truncateAddress(address!, 8)}
            </div>
          </div>

          {/* Network Info */}
          <div className="px-4 py-3 border-b border-agora-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-agora-500">Network</span>
              <span className={`font-medium ${isBaseChain ? 'text-success' : 'text-warning'}`}>
                {isBaseChain ? chainLabel : 'Unsupported'}
              </span>
            </div>
            {balance && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-agora-500">USDC Balance</span>
                <span className="font-medium text-agora-900">${balance}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2">
            {!isBaseChain && (
              <button
                onClick={() => {
                  switchToBaseChain().catch(() => {})
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-agora-900 hover:bg-agora-50 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch to {chainLabel}
              </button>
            )}

            <a
              href={`${explorerBaseUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-agora-700 hover:bg-agora-50 transition-colors text-sm"
              onClick={() => setShowDropdown(false)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on BaseScan
            </a>

            <button
              onClick={() => {
                disconnect()
                setShowDropdown(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
