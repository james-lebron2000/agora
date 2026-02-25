import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Home, ArrowLeft } from 'lucide-react'

/**
 * OfflinePage - Displayed when the app is offline
 * Provides user-friendly messaging and actions to retry or navigate
 */
export function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get last sync time from localStorage
    const syncTime = localStorage.getItem('last-sync-time')
    if (syncTime) {
      setLastSync(new Date(parseInt(syncTime)).toLocaleString())
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoBack = () => {
    window.history.back()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  // If back online, show reconnection message
  if (isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Connection Restored</h1>
          <p className="text-neutral-400">
            You are back online. Reloading the app...
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Icon and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center">
              <WifiOff className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">You are offline</h1>
          <p className="text-neutral-400 text-lg">
            Unable to connect to the network. Some features may be unavailable.
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-neutral-800/50 rounded-2xl p-6 space-y-4 border border-neutral-700/50">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 animate-pulse" />
            <div>
              <p className="text-white font-medium">Offline Mode</p>
              <p className="text-sm text-neutral-400">
                Bridge transactions and agent actions will be queued and synced when you reconnect.
              </p>
            </div>
          </div>
          {lastSync && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-neutral-500 mt-2" />
              <div>
                <p className="text-white font-medium">Last Sync</p>
                <p className="text-sm text-neutral-400">{lastSync}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleGoBack}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-neutral-500 space-y-1">
          <p>Tips:</p>
          <ul className="space-y-1">
            <li>• Check your internet connection</li>
            <li>• Make sure Airplane Mode is off</li>
            <li>• Try connecting to a different network</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default OfflinePage
