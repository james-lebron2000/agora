import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '../hooks/useWallet'

const BASE_URL = '/relay/v1/messages'

// Default known agents (Pisa & Caishen)
const DEFAULT_AGENTS = [
  { name: 'Pisa (System)', did: 'did:key:z6MkqSwk2L3Vqm6StiPYLmioJNYuBnhF1SQoigmUHwnKUfmk' },
  { name: 'Caishen (Trading Bot)', did: 'did:key:z6MkqCaishenTradingBot' },
]

const REFRESH_INTERVAL_MS = 3000

type JsonRecord = Record<string, unknown>

type ChatMessage = {
  id: string
  from: string
  to: string
  text: string
  ts: string
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readString(obj: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function extractText(raw: JsonRecord): string {
  const direct = readString(raw, ['text', 'message', 'content', 'body'])
  if (direct) return direct
  const payload = raw.payload
  if (isRecord(payload)) {
    const nested = readString(payload, ['text', 'message', 'content', 'body'])
    if (nested) return nested
  }
  return ''
}

function extractMessages(input: unknown): unknown[] {
  if (Array.isArray(input)) return input
  if (!isRecord(input)) return []
  const topLevel = ['messages', 'items', 'results', 'events']
  for (const key of topLevel) {
    const value = input[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function normalizeMessage(raw: unknown, index: number): ChatMessage | null {
  if (!isRecord(raw)) return null
  const sender = isRecord(raw.sender) ? raw.sender : null
  const recipient = isRecord(raw.recipient) ? raw.recipient : null
  const from = readString(raw, ['from', 'sender', 'source', 'from_did']) || (sender ? readString(sender, ['id', 'did']) : null) || ''
  const to = readString(raw, ['to', 'recipient', 'target', 'to_did']) || (recipient ? readString(recipient, ['id', 'did']) : null) || ''
  const text = extractText(raw)
  if (!text) return null
  const ts = readString(raw, ['ts', 'timestamp', 'created_at', 'createdAt', 'time']) || new Date().toISOString()
  const id = readString(raw, ['id', 'message_id', 'messageId', 'uuid']) || `${from || 'msg'}-${to || 'msg'}-${ts}-${index}`
  return { id, from, to, text, ts }
}

function sortByTimestampAsc(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aTs = Date.parse(a.ts)
    const bTs = Date.parse(b.ts)
    if (Number.isNaN(aTs) || Number.isNaN(bTs)) return a.ts.localeCompare(b.ts)
    return aTs - bTs
  })
}

function shortDid(did: string): string {
  if (!did) return 'unknown'
  if (did.length <= 26) return did
  return `${did.slice(0, 14)}...${did.slice(-10)}`
}

// --- UI Components ---
function TradingSignalCard({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="bg-emerald-950/30 rounded p-3 border border-emerald-500/30 text-xs mt-2 font-mono shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      <div className="flex justify-between font-bold mb-2 items-center">
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {data.signal || 'SIGNAL'}
        </span>
        <span className={`px-2 py-0.5 rounded ${data.action === 'BUY' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
          {data.action}
        </span>
      </div>
      <div className="text-emerald-200/70 mb-2">{data.reason}</div>
      {data.coins && (
        <div className="flex gap-2 flex-wrap">
          {data.coins.map((c: string) => (
            <span key={c} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-[10px]">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PayloadRenderer({ text }: { text: string }) {
  try {
    if (!text.trim().startsWith('{')) return <p className="whitespace-pre-wrap break-words font-sans">{text}</p>
    const json = JSON.parse(text)
    if (json.type === 'TRADING_SIGNAL') {
       return <TradingSignalCard data={json.data} />
    }
    return (
      <div className="mt-1 font-mono">
        <p className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">{json.type || 'DATA'}</p>
        <pre className="text-[10px] overflow-x-auto bg-black/20 p-2 rounded border border-white/5 text-slate-300">
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    )
  } catch {
    return <p className="whitespace-pre-wrap break-words font-sans">{text}</p>
  }
}

// --- Main Component ---
export function AgentChat() {
  const { address, isConnected, connect } = useWallet()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  
  const [myAgents, setMyAgents] = useState(DEFAULT_AGENTS)
  const [selectedAgentDid, setSelectedAgentDid] = useState(DEFAULT_AGENTS[0].did)
  const [isAddingAgent, setIsAddingAgent] = useState(false)
  const [newAgentDid, setNewAgentDid] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  
  // Connection Token UI State
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectToken, setConnectToken] = useState('')

  const listRef = useRef<HTMLDivElement>(null)

  // Guest Identity Logic
  const [guestDid, setGuestDid] = useState<string | null>(null)
  useEffect(() => {
    const stored = localStorage.getItem('agora_guest_did')
    if (stored) {
      setGuestDid(stored)
    } else {
      const newId = `did:key:guest-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('agora_guest_did', newId)
      setGuestDid(newId)
    }
  }, [])

  const myDid = useMemo(() => {
    if (isConnected && address) return `did:ethr:${address}`
    return guestDid
  }, [isConnected, address, guestDid])

  const addAgent = () => {
    if (!newAgentDid.trim()) return
    const name = newAgentName.trim() || `Agent ${myAgents.length + 1}`
    setMyAgents([...myAgents, { name, did: newAgentDid.trim() }])
    setNewAgentDid('')
    setNewAgentName('')
    setIsAddingAgent(false)
  }

  const generateConnectToken = () => {
    // Simulate API Key generation
    const key = `agora_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    const owner = myDid || 'unknown'
    const token = `agora://connect?key=${key}&owner=${owner}&relay=wss://relay.agora.network`
    setConnectToken(token)
    setShowConnectModal(true)
  }

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch(`${BASE_URL}?to=${selectedAgentDid}`, { cache: 'no-store' }),
        fetch(`${BASE_URL}?from=${selectedAgentDid}`, { cache: 'no-store' })
      ])
      const incomingPayload = incomingRes.ok ? await incomingRes.json() : {}
      const outgoingPayload = outgoingRes.ok ? await outgoingRes.json() : {}
      const incoming = extractMessages(incomingPayload).map((e, i) => normalizeMessage(e, i)).filter((e): e is ChatMessage => e !== null)
      const outgoing = extractMessages(outgoingPayload).map((e, i) => normalizeMessage(e, i)).filter((e): e is ChatMessage => e !== null)
      const unique = Array.from(new Map([...incoming, ...outgoing].map(m => [m.id, m])).values())
      setMessages(sortByTimestampAsc(unique))
      setLastRefresh(new Date().toISOString())
      setError(null)
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }, [selectedAgentDid])

  useEffect(() => {
    void loadMessages()
    const timer = setInterval(() => void loadMessages(), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [loadMessages])

  useEffect(() => {
    if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!myDid) return

    setSending(true); setError(null)
    try {
      const payload = { id: crypto.randomUUID(), from: myDid, to: selectedAgentDid, type: 'text/plain', body: text, ts: new Date().toISOString() }
      const res = await fetch(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envelope: payload }) })
      if (!res.ok) throw new Error('Failed')
      setDraft('')
      setTimeout(() => void loadMessages(), 500)
    } catch { setError('Send failed') }
    finally { setSending(false) }
  }, [draft, sending, myDid, selectedAgentDid, loadMessages])

  const selectedAgentName = myAgents.find(a => a.did === selectedAgentDid)?.name || shortDid(selectedAgentDid)
  const isGuest = !isConnected && !!guestDid

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-[#111] border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-bold text-sm tracking-wider text-emerald-500 uppercase flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Fleet Command
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {myAgents.map(agent => (
            <button
              key={agent.did}
              onClick={() => setSelectedAgentDid(agent.did)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all border ${selectedAgentDid === agent.did ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
            >
              <div className="font-medium">{agent.name}</div>
              <div className="text-[10px] opacity-50 truncate font-mono mt-0.5">{shortDid(agent.did)}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/5 space-y-2">
          {isAddingAgent ? (
            <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <input placeholder="Name" value={newAgentName} onChange={e => setNewAgentName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-emerald-500/50 outline-none" />
              <input placeholder="DID (did:key:...)" value={newAgentDid} onChange={e => setNewAgentDid(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-emerald-500/50 outline-none font-mono" />
              <div className="flex gap-2">
                <button onClick={addAgent} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded transition">Add</button>
                <button onClick={() => setIsAddingAgent(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-slate-300 text-xs py-1.5 rounded transition">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={generateConnectToken} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-emerald-900/20">
                ⚡️ Connect Agent
              </button>
              <button onClick={() => setIsAddingAgent(true)} className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition">
                + Track ID
              </button>
            </>
          )}
        </div>
      </div>

      {/* Connect Modal Overlay */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-emerald-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-900/20 relative">
            <button 
              onClick={() => setShowConnectModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Connect Agent
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste this connection string into your agent to instantly link it to your account.
            </p>
            
            <div className="bg-black/50 border border-white/10 rounded-lg p-3 mb-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Connection String</p>
              <div className="font-mono text-xs text-emerald-400 break-all select-all">
                {connectToken}
              </div>
            </div>

            <button 
              onClick={() => { navigator.clipboard.writeText(connectToken); setShowConnectModal(false) }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}

      {/* Main Terminal */}
      <div className="flex-1 flex flex-col h-screen relative bg-[#0a0a0a]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent" />
        
        {/* Top Bar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <div>
              <h1 className="font-bold text-sm text-slate-200 tracking-tight">{selectedAgentName}</h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                {shortDid(selectedAgentDid)}
                {lastRefresh && <span className="text-emerald-500/50">• LIVE</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {error && <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/30">{error}</div>}
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Controller ID</div>
              <div className="text-xs font-mono text-emerald-500/80 flex items-center gap-2">
                {isGuest && <span className="px-1.5 rounded bg-amber-500/20 text-amber-400 text-[9px]">GUEST</span>}
                {shortDid(myDid || '...')}
                {!isConnected && <button onClick={() => connect()} className="ml-2 text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-white transition">Connect Wallet</button>}
              </div>
            </div>
          </div>
        </div>

        {/* Log Feed */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth z-0">
          {!loading && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 opacity-50" fill="none" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={1.5} d=\"M13 10V3L4 14h7v7l9-11h-7z\" /></svg>
              </div>
              <p className=\"text-sm\">No signal intercepted.</p>
              <p className=\"text-xs mt-1 opacity-50\">Waiting for agent transmissions...</p>
            </div>
          )}
          {messages.map((msg) => {
            const isFromAgent = msg.from === selectedAgentDid
            return (
              <div key={msg.id} className={`flex flex-col ${isFromAgent ? 'items-end' : 'items-start'} group`}>
                <div className=\"flex items-center gap-2 mb-1 px-1\">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isFromAgent ? 'text-emerald-500' : 'text-blue-400'}`}>
                    {isFromAgent ? 'OUTBOUND' : 'INBOUND'}
                  </span>
                  <span className=\"text-[10px] text-slate-600\">{shortDid(isFromAgent ? msg.to : msg.from)}</span>
                </div>
                <div className={`max-w-2xl rounded-lg p-3 text-sm shadow-lg backdrop-blur-sm transition-all ${isFromAgent ? 'bg-emerald-900/10 border border-emerald-500/20 text-emerald-100 rounded-br-none' : 'bg-white/5 border border-white/10 text-slate-300 rounded-bl-none'}`}>
                  <PayloadRenderer text={msg.text} />
                </div>
                <div className=\"text-[9px] text-slate-700 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono\">
                  TS: {new Date(msg.ts).toISOString()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Command Input */}
        <div className=\"p-4 bg-[#0a0a0a] border-t border-white/5 z-10\">
          <form onSubmit={(e) => { e.preventDefault(); void sendMessage() }} className=\"relative\">
            <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none\">
              <span className=\"text-emerald-500 font-mono\">$</span>
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Inject command as ${isGuest ? 'Guest' : 'User'}...`}
              className=\"w-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-lg pl-8 pr-24 py-3 text-sm text-emerald-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-900/50 font-mono\"
            />
            <div className=\"absolute inset-y-0 right-1 flex items-center\">
              <button
                type=\"submit\"
                disabled={sending || !draft.trim()}
                className=\"bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed\"
              >
                EXEC
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
