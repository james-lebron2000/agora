import { useEffect, useMemo, useState } from 'react'
import { resolveRelayUrl } from '../lib/relayUrl'

type DirectoryAgent = {
  id: string
  name?: string | null
  description?: string | null
  url?: string | null
  portfolio_url?: string | null
  intents?: string[]
  pricing?: Array<{
    intent?: string
    amount?: number
    currency?: string
    unit?: string
  }>
  status?: 'online' | 'offline' | 'unknown'
  last_seen?: string | null
  reputation?: {
    total_orders?: number
    success_orders?: number
    rating_count?: number
    score?: number
    tier?: string
  } | null
}

type DirectoryResponse = {
  ok: boolean
  total?: number
  agents?: DirectoryAgent[]
  error?: string
  message?: string
}

function truncateMiddle(value: string, left = 10, right = 8) {
  if (!value) return value
  if (value.length <= left + right + 3) return value
  return `${value.slice(0, left)}...${value.slice(-right)}`
}

function isCoreIntent(intent: string) {
  const value = String(intent || '').toLowerCase()
  return (
    value.startsWith('code.')
    || value.startsWith('security.')
    || value.startsWith('dev.')
    || value.startsWith('ops.')
  )
}

function buildPricingLabel(agent: DirectoryAgent) {
  const pricing = Array.isArray(agent.pricing) ? agent.pricing : []
  if (pricing.length === 0) return null
  const first = pricing[0]
  const amount = typeof first.amount === 'number' ? first.amount : null
  const currency = typeof first.currency === 'string' && first.currency ? first.currency.toUpperCase() : 'USDC'
  const unit = typeof first.unit === 'string' && first.unit ? first.unit : 'turn'
  if (amount == null) return null
  return `${amount} ${currency}/${unit}`
}

export function AgentDirectory({ relayUrl: relayUrlProp }: { relayUrl?: string }) {
  const relayUrl = useMemo(() => (relayUrlProp ? relayUrlProp : resolveRelayUrl()), [relayUrlProp])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'online' | 'offline'>('online')
  const [showAllIntents, setShowAllIntents] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<DirectoryAgent[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('limit', '50')
        if (query.trim()) params.set('q', query.trim())
        if (status !== 'all') params.set('status', status)
        const res = await fetch(`${relayUrl.replace(/\/$/, '')}/v1/directory?${params.toString()}`)
        const json = (await res.json()) as DirectoryResponse
        if (!res.ok || !json.ok) {
          throw new Error(json.message || json.error || `Failed to fetch agents (${res.status})`)
        }
        const incoming = Array.isArray(json.agents) ? json.agents : []
        if (!active) return
        setAgents(incoming)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to fetch agents')
        setAgents([])
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      load().catch(() => {})
    }, 150)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, relayUrl, status])

  const filtered = useMemo(() => {
    if (showAllIntents) return agents
    return agents.filter((agent) => {
      const intents = Array.isArray(agent.intents) ? agent.intents : []
      return intents.some(isCoreIntent)
    })
  }, [agents, showAllIntents])

  return (
    <section id="agents" className="rounded-3xl border border-agora-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-agora-200 bg-agora-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-agora-600">
            Agent Directory
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-agora-900">Browse Agents</h3>
          <p className="mt-1 text-sm text-agora-600">
            Search by name, DID, or intent. Defaults to core intents (code, security, dev, ops).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-agora-200 bg-white px-3 py-2 text-sm">
            <span className="text-agora-500">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="ml-2 bg-transparent text-agora-900 focus:outline-none"
            >
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="all">all</option>
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-agora-200 bg-white px-3 py-2 text-sm text-agora-700">
            <input
              type="checkbox"
              checked={showAllIntents}
              onChange={(e) => setShowAllIntents(e.target.checked)}
            />
            Show all intents
          </label>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents (name, did, intent)..."
          className="w-full rounded-2xl border border-agora-200 bg-agora-50 px-4 py-3 text-sm text-agora-900 placeholder:text-agora-400 focus:border-agora-400 focus:outline-none focus:ring-2 focus:ring-agora-200/60"
        />
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-agora-200 bg-agora-50 p-5 text-sm text-agora-600">
          Loading agent directory...
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-warning/40 bg-warning-light/30 p-5 text-sm text-agora-700">
          Failed to load agent directory: {error}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-agora-200 bg-agora-50 p-6 text-center">
          <div className="text-sm font-semibold text-agora-700">No agents found</div>
          <div className="mt-1 text-xs text-agora-500">
            Try widening your search or enable "Show all intents".
          </div>
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((agent) => {
            const intents = Array.isArray(agent.intents) ? agent.intents : []
            const pricing = buildPricingLabel(agent)
            const score = agent.reputation?.score
            const totalOrders = agent.reputation?.total_orders ?? 0
            const statusLabel = agent.status || 'unknown'
            const statusColor =
              statusLabel === 'online' ? 'bg-success/15 text-success border-emerald-200'
              : statusLabel === 'offline' ? 'bg-agora-100 text-agora-600 border-agora-200'
              : 'bg-warning/15 text-warning border-warning/30'

            return (
              <article key={agent.id} className="rounded-2xl border border-agora-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-agora-900">
                      {agent.name || 'Unnamed Agent'}
                    </div>
                    <div className="mt-1 text-xs font-mono text-agora-500">
                      {truncateMiddle(agent.id, 16, 12)}
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                {agent.description ? (
                  <p className="mt-3 text-sm text-agora-600">{agent.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-agora-600">
                  {pricing ? (
                    <span className="rounded-full border border-agora-200 bg-agora-50 px-3 py-1">
                      {pricing}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-agora-200 bg-agora-50 px-3 py-1">
                    orders: {totalOrders}
                  </span>
                  {typeof score === 'number' ? (
                    <span className="rounded-full border border-agora-200 bg-agora-50 px-3 py-1">
                      score: {score}
                    </span>
                  ) : null}
                  {agent.reputation?.tier ? (
                    <span className="rounded-full border border-agora-200 bg-agora-50 px-3 py-1">
                      tier: {agent.reputation.tier}
                    </span>
                  ) : null}
                </div>

                {intents.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {intents.slice(0, 8).map((intent) => (
                      <span
                        key={`${agent.id}-${intent}`}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          isCoreIntent(intent)
                            ? 'border-agora-300 bg-agora-900 text-white'
                            : 'border-agora-200 bg-agora-50 text-agora-700'
                        }`}
                      >
                        {intent}
                      </span>
                    ))}
                    {intents.length > 8 ? (
                      <span className="rounded-full border border-agora-200 bg-agora-50 px-3 py-1 text-xs text-agora-600">
                        +{intents.length - 8} more
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-agora-500">No intents declared.</div>
                )}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
