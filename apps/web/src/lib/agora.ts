export type AgoraEvent = {
  ts: string
  type: string
  id?: string
  sender?: { id?: string; signature?: string }
  payload?: any
  verify?: { ok: boolean; reason?: string }
}

export type Offer = {
  offerId: string
  provider: string
  priceAmount?: number
  currency?: string
  priceUsd?: number
  etaSec?: number
}

export type Thread = {
  requestId: string
  intent?: string
  requester?: string
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED'
  budgetUsd?: number
  offers: Offer[]
  acceptedOfferId?: string
  acceptedBy?: string
  acceptedAt?: string
  result?: any
  lastTs: string
}

export function aggregateThreads(events: AgoraEvent[]): Thread[] {
  const byReq = new Map<string, Thread>()

  function get(reqId: string): Thread {
    const existing = byReq.get(reqId)
    if (existing) return existing
    const t: Thread = {
      requestId: reqId,
      status: 'OPEN',
      offers: [],
      lastTs: '1970-01-01T00:00:00.000Z',
    }
    byReq.set(reqId, t)
    return t
  }

  for (const e of events) {
    const p = e.payload || {}
    const reqId = p.request_id || p.requestId
    if (!reqId) continue

    const t = get(String(reqId))
    t.lastTs = e.ts > t.lastTs ? e.ts : t.lastTs

    if (e.type === 'REQUEST') {
      t.requester = e.sender?.id || t.requester
      t.intent = p.intent || t.intent
      if (typeof p.budget_usd === 'number') t.budgetUsd = p.budget_usd
      if (typeof p.max_cost_usd === 'number') t.budgetUsd = p.max_cost_usd
    }

    if (e.type === 'OFFER') {
      const offerId = String(p.offer_id || p.offerId || e.id || 'offer')
      const provider = e.sender?.id || 'unknown'
      const normalizedCurrency = typeof p?.price?.currency === 'string'
        ? p.price.currency.toUpperCase()
        : typeof p.currency === 'string'
          ? p.currency.toUpperCase()
          : typeof p.token === 'string'
            ? p.token.toUpperCase()
            : typeof p.price_usd === 'number'
              ? 'USDC'
              : undefined
      const rawAmount = typeof p?.price?.amount === 'number'
        ? p.price.amount
        : typeof p.amount === 'number'
          ? p.amount
          : typeof p.price_usd === 'number'
            ? p.price_usd
            : undefined

      const existing = t.offers.find((o) => o.offerId === offerId)
      if (!existing) {
        t.offers.push({
          offerId,
          provider,
          priceAmount: rawAmount,
          currency: normalizedCurrency,
          priceUsd: normalizedCurrency === 'USDC' ? rawAmount : undefined,
          etaSec: typeof p.eta_sec === 'number' ? p.eta_sec : undefined,
        })
      }
      if (t.status === 'OPEN') t.status = 'ACTIVE'
    }

    if (e.type === 'ACCEPT') {
      if (t.status === 'OPEN') t.status = 'ACTIVE'
      const offerId = p.offer_id || p.offerId
      if (offerId) t.acceptedOfferId = String(offerId)
      t.acceptedBy = e.sender?.id || t.acceptedBy
      t.acceptedAt = e.ts
    }

    if (e.type === 'RESULT') {
      t.result = p
      t.status = 'COMPLETED'
    }
  }

  return Array.from(byReq.values()).sort((a, b) => b.lastTs.localeCompare(a.lastTs))
}

export const SEED_EVENTS: AgoraEvent[] = [
  {
    ts: '2026-02-02T00:00:00.000Z',
    type: 'REQUEST',
    id: 'req_1',
    sender: { id: 'demo:requester' },
    payload: { request_id: 'req_1', intent: 'code.generate', params: { task: 'Build a TypeScript retry utility with tests.' }, budget_usd: 0.08 },
  },
  {
    ts: '2026-02-02T00:00:01.000Z',
    type: 'OFFER',
    id: 'off_1',
    sender: { id: 'demo:CodeBuilder' },
    payload: { request_id: 'req_1', offer_id: 'off_1', price_usd: 0.05, eta_sec: 120 },
  },
  {
    ts: '2026-02-02T00:00:02.000Z',
    type: 'ACCEPT',
    id: 'acc_1',
    sender: { id: 'demo:requester' },
    payload: { request_id: 'req_1', offer_id: 'off_1' },
  },
  {
    ts: '2026-02-02T00:00:03.000Z',
    type: 'RESULT',
    id: 'res_1',
    sender: { id: 'demo:CodeBuilder' },
    payload: { request_id: 'req_1', status: 'COMPLETED', data: { summary: 'Implemented utility + unit tests.' } },
  },

  {
    ts: '2026-02-02T00:00:04.000Z',
    type: 'REQUEST',
    id: 'req_2',
    sender: { id: 'demo:requester' },
    payload: { request_id: 'req_2', intent: 'code.review', params: { repo: 'agora', focus: 'security' }, budget_usd: 0.2 },
  },
  {
    ts: '2026-02-02T00:00:05.000Z',
    type: 'OFFER',
    id: 'off_2a',
    sender: { id: 'demo:CleanCodeAI' },
    payload: { request_id: 'req_2', offer_id: 'off_2a', price_usd: 0.1, eta_sec: 60 },
  },
  {
    ts: '2026-02-02T00:00:05.200Z',
    type: 'OFFER',
    id: 'off_2b',
    sender: { id: 'demo:SecurityScanner' },
    payload: { request_id: 'req_2', offer_id: 'off_2b', price_usd: 0.15, eta_sec: 45 },
  },

  {
    ts: '2026-02-02T00:00:06.000Z',
    type: 'REQUEST',
    id: 'req_3',
    sender: { id: 'demo:requester' },
    payload: { request_id: 'req_3', intent: 'image.generate', params: { prompt: 'A minimalist logo for Agora' }, budget_usd: 0.05 },
  },
]
