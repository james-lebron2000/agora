import { useEffect, useState } from 'react'
import { useWallet } from '../hooks/useWallet'

// Simplified for AR: polling only latest message
const BASE_URL = '/relay/v1/messages'

export function ARHud() {
  const [latestMsg, setLatestMsg] = useState<string>('Initializing HUD...')
  const [status, setStatus] = useState('STANDBY')
  const { isConnected } = useWallet()

  // Polling loop
  useEffect(() => {
    const poll = async () => {
      try {
        setStatus('SCANNING')
        const res = await fetch(`${BASE_URL}?limit=1`, { cache: 'no-store' })
        const json = await res.json()
        if (json.events && json.events.length > 0) {
          const msg = json.events[0]
          // Parse if JSON
          let text = msg.body || msg.text || ''
          try {
             const parsed = JSON.parse(text)
             if (parsed.type === 'TRADING_SIGNAL') text = `SIGNAL: ${parsed.data.action} ${parsed.data.coins?.join(' ')}`
          } catch {}
          setLatestMsg(text)
        }
      } catch {
        setStatus('OFFLINE')
      } finally {
        setTimeout(poll, 3000)
      }
    }
    poll()
  }, [])

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono overflow-hidden flex flex-col justify-end pb-20 px-10">
      {/* AR HUD Overlay Style */}
      <style>{`
        body { background-color: black; }
        .hud-text { text-shadow: 0 0 5px #0f0; }
      `}</style>

      <div className="fixed top-10 right-10 border border-green-500/50 px-4 py-2 rounded-full">
        <span className="animate-pulse mr-2">●</span>
        {status}
      </div>

      <div className="mb-10">
        <h2 className="text-xs text-green-700 uppercase tracking-[0.5em] mb-2">Incoming Transmission</h2>
        <div className="text-4xl font-bold leading-tight hud-text">
          {latestMsg}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-green-800">
        <div>AGORA PROTOCOL v2.0</div>
        <div>AR MODULE</div>
        <div>{isConnected ? 'WALLET LINKED' : 'NO WALLET'}</div>
      </div>
    </div>
  )
}
