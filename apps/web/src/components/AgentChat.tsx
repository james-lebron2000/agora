import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '../hooks/useWallet'

const BASE_URL = 'http://45.32.219.241:8789/v1/messages'

// Default known agents
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

  const from =
    readString(raw, ['from', 'sender', 'source', 'from_did']) ||
    (sender ? readString(sender, ['id', 'did']) : null) ||
    ''

  const to =
    readString(raw, ['to', 'recipient', 'target', 'to_did']) ||
    (recipient ? readString(recipient, ['id', 'did']) : null) ||
    ''

  const text = extractText(raw)
  if (!text) return null

  const ts =
    readString(raw, ['ts', 'timestamp', 'created_at', 'createdAt', 'time']) ||
    new Date().toISOString()

  const id =
    readString(raw, ['id', 'message_id', 'messageId', 'uuid']) ||
    `${from || 'msg'}-${to || 'msg'}-${ts}-${index}`

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

function TradingSignalCard({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 border border-slate-200 dark:border-slate-700 text-xs mt-1">
      <div className="flex justify-between font-bold mb-1">
        <span className="text-blue-600">{data.signal || 'SIGNAL'}</span>
        <span className={data.action === 'BUY' ? 'text-green-600' : 'text-amber-600'}>{data.action}</span>
      </div>
      <div className="text-slate-600 dark:text-slate-300">Reason: {data.reason}</div>
      {data.coins && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {data.coins.map((c: string) => (
            <span key={c} className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function PayloadRenderer({ text }: { text: string }) {
  try {
    // Check if it looks like JSON
    if (!text.trim().startsWith('{')) return <p className="whitespace-pre-wrap break-words">{text}</p>
    
    const json = JSON.parse(text)
    if (json.type === 'TRADING_SIGNAL') {
       return <TradingSignalCard data={json.data} />
    }
    
    // Fallback for other JSON
    return (
      <div className="mt-1">
        <p className="text-[10px] opacity-70 mb-1 font-mono">{json.type || 'JSON Payload'}</p>
        <pre className="text-[10px] overflow-x-auto bg-black/5 dark:bg-white/5 p-2 rounded font-mono">
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    )
  } catch {
    return <p className="whitespace-pre-wrap break-words">{text}</p>
  }
}

export function AgentChat() {
  const { address, isConnected, connect } = useWallet()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  
  // Agent Management State
  const [myAgents, setMyAgents] = useState(DEFAULT_AGENTS)
  const [selectedAgentDid, setSelectedAgentDid] = useState(DEFAULT_AGENTS[0].did)
  const [isAddingAgent, setIsAddingAgent] = useState(false)
  const [newAgentDid, setNewAgentDid] = useState('')
  const [newAgentName, setNewAgentName] = useState('')

  const listRef = useRef<HTMLDivElement>(null)

  // My Identity (Wallet)
  const myDid = useMemo(() => {
    return isConnected && address ? `did:ethr:${address}` : null
  }, [isConnected, address])

  const addAgent = () => {
    if (!newAgentDid.trim()) return
    const name = newAgentName.trim() || `Agent ${myAgents.length + 1}`
    setMyAgents([...myAgents, { name, did: newAgentDid.trim() }])
    setNewAgentDid('')
    setNewAgentName('')
    setIsAddingAgent(false)
  }

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch incoming AND outgoing for the selected agent
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch(`${BASE_URL}?to=${selectedAgentDid}`, { cache: 'no-store' }),
        fetch(`${BASE_URL}?from=${selectedAgentDid}`, { cache: 'no-store' })
      ])

      const incomingPayload = incomingRes.ok ? await incomingRes.json() : {}
      const outgoingPayload = outgoingRes.ok ? await outgoingRes.json() : {}

      const incoming = extractMessages(incomingPayload)
        .map((entry, index) => normalizeMessage(entry, index))
        .filter((entry): entry is ChatMessage => entry !== null)

      const outgoing = extractMessages(outgoingPayload)
        .map((entry, index) => normalizeMessage(entry, index))
        .filter((entry): entry is ChatMessage => entry !== null)

      // Merge and dedupe by ID
      const merged = [...incoming, ...outgoing]
      const unique = Array.from(new Map(merged.map(m => [m.id, m])).values())
      
      setMessages(sortByTimestampAsc(unique))
      setLastRefresh(new Date().toISOString())
      setError(null)
    } catch {
      setError('Unable to fetch messages.')
    } finally {
      setLoading(false)
    }
  }, [selectedAgentDid])

  useEffect(() => {
    void loadMessages()
    const timer = window.setInterval(() => {
      void loadMessages()
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [loadMessages])

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    
    if (!isConnected || !myDid) {
      connect()
      return
    }

    setSending(true)
    setError(null)

    const now = new Date().toISOString()
    // Send TO the selected agent (from User Wallet)
    const payload = {
      from: myDid,
      to: selectedAgentDid,
      type: 'text/plain',
      body: text,
      ts: now 
    }

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('send_failed')
      setDraft('')
      // Wait a bit for relay to index
      setTimeout(() => void loadMessages(), 500)
    } catch {
      setError('Unable to send message.')
    } finally {
      setSending(false)
    }
  }, [draft, loadMessages, sending, isConnected, connect, myDid, selectedAgentDid])

  const selectedAgentName = myAgents.find(a => a.did === selectedAgentDid)?.name || shortDid(selectedAgentDid)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar: My Agents */}\n      <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-lg">My Agents</h2>
          <p className="text-xs text-slate-500">Select agent to monitor</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {myAgents.map(agent => (
            <button
              key={agent.did}
              onClick={() => setSelectedAgentDid(agent.did)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedAgentDid === agent.did
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 font-medium'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="truncate">{agent.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{shortDid(agent.did)}</div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {isAddingAgent ? (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
              <input
                placeholder="Agent Name"
                value={newAgentName}
                onChange={e => setNewAgentName(e.target.value)}
                className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700"
              />
              <input
                placeholder="Agent DID"
                value={newAgentDid}
                onChange={e => setNewAgentDid(e.target.value)}
                className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700"
              />
              <div className="flex gap-2">
                <button onClick={addAgent} className="flex-1 bg-blue-600 text-white text-xs py-1 rounded">Add</button>
                <button onClick={() => setIsAddingAgent(false)} className="flex-1 bg-slate-200 text-slate-800 text-xs py-1 rounded">Cancel</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingAgent(true)}
              className="w-full flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 p-2 rounded-lg border border-dashed border-blue-200 dark:border-blue-800"
            >
              + Add Agent
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <div>
            <h1 className="font-semibold flex items-center gap-2">
              Monitor: {selectedAgentName}
            </h1>
            <p className="text-xs text-slate-500 font-mono">{shortDid(selectedAgentDid)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-right">
              <p className="text-slate-500">My Identity</p>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {isConnected && address ? shortDid(`did:ethr:${address}`) : 'Not Connected'}
              </p>
            </div>
            {!isConnected && (
               <button
                  onClick={() => connect()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20"
        >
          {!loading && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <p>No messages found for this agent.</p>
              <p className="text-xs mt-1">Monitoring incoming & outgoing traffic...</p>
            </div>
          )}

          {messages.map((msg) => {
            // Determine direction relative to selected agent
            const isFromAgent = msg.from === selectedAgentDid
            const isToAgent = msg.to === selectedAgentDid
            const alignRight = isFromAgent
            
            return (
              <div key={msg.id} className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-mono text-slate-500">
                    {alignRight ? `To: ${shortDid(msg.to)}` : `From: ${shortDid(msg.from)}`}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    alignRight
                      ? 'rounded-br-sm bg-blue-600 text-white dark:bg-blue-500'
                      : 'rounded-bl-sm bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                  }`}
                >
                  <PayloadRenderer text={msg.text} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.ts).toLocaleTimeString()}\n                </p>
              </div>
            )
          })}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void sendMessage()
            }}
            className="flex gap-2"
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={1}
              placeholder={isConnected 
                ? `Send message to ${selectedAgentName} (as User)...` 
                : "Connect wallet to send message..."}
              className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type=\"submit\"
              disabled={sending || !draft.trim()}
              className="rounded-xl bg-blue-600 px-6 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Note: You are sending as your Wallet Identity, not as the Agent.
          </p>
        </div>
      </div>
    </div>
  )
}
