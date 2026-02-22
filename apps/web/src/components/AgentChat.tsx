import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const BASE_URL = 'http://45.32.219.241:8789/messages'
const INBOX_DID = 'did:key:z6MkqSwk2L3Vqm6StiPYLmioJNYuBnhF1SQoigmUHwnKUfmk'
const BOT_DID = 'did:key:z6MkqCaishenTradingBot'
const REFRESH_INTERVAL_MS = 5000

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

  const topLevel = ['messages', 'items', 'results']
  for (const key of topLevel) {
    const value = input[key]
    if (Array.isArray(value)) return value
  }

  const data = input.data
  if (Array.isArray(data)) return data
  if (isRecord(data)) {
    for (const key of topLevel) {
      const value = data[key]
      if (Array.isArray(value)) return value
    }
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
  if (did.length <= 26) return did
  return `${did.slice(0, 14)}...${did.slice(-10)}`
}

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const inboxUrl = useMemo(() => {
    const url = new URL(BASE_URL)
    url.searchParams.set('to', INBOX_DID)
    return url.toString()
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(inboxUrl, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

      const payload = (await response.json()) as unknown
      const normalized = extractMessages(payload)
        .map((entry, index) => normalizeMessage(entry, index))
        .filter((entry): entry is ChatMessage => entry !== null)

      setMessages(sortByTimestampAsc(normalized))
      setLastRefresh(new Date().toISOString())
      setError(null)
    } catch {
      setError('Unable to fetch messages from relay.')
    } finally {
      setLoading(false)
    }
  }, [inboxUrl])

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

    setSending(true)
    setError(null)

    const now = new Date().toISOString()
    const payloads = [
      { from: INBOX_DID, to: BOT_DID, message: text, ts: now },
      { from: INBOX_DID, to: BOT_DID, text, timestamp: now },
      { sender: INBOX_DID, to: BOT_DID, content: text, ts: now },
    ]

    try {
      let delivered = false
      for (const payload of payloads) {
        const response = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (response.ok) {
          delivered = true
          break
        }
      }

      if (!delivered) throw new Error('send_failed')
      setDraft('')
      await loadMessages()
    } catch {
      setError('Unable to send message to bot DID.')
    } finally {
      setSending(false)
    }
  }, [draft, loadMessages, sending])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Agent Chat</h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Inbox: {shortDid(INBOX_DID)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Sending To</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{shortDid(BOT_DID)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {loading ? 'Loading messages...' : `Auto-refresh: ${REFRESH_INTERVAL_MS / 1000}s`}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {lastRefresh ? `Last sync ${new Date(lastRefresh).toLocaleTimeString()}` : 'Not synced yet'}
            </span>
          </div>
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </p>
          )}
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
        >
          {!loading && messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No messages yet.
            </div>
          )}

          {messages.map((msg) => {
            const outgoing = msg.from === INBOX_DID || msg.to === BOT_DID
            return (
              <div key={msg.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    outgoing
                      ? 'rounded-br-md bg-blue-600 text-white dark:bg-blue-500'
                      : 'rounded-bl-md bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`mt-2 text-[11px] ${outgoing ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {shortDid(msg.from || 'unknown')} • {new Date(msg.ts).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <form
          className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage()
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Type a message for Caishen Trading Bot..."
              className="min-h-[52px] flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
