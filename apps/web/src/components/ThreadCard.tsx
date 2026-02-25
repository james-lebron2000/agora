import { useEffect, useState } from 'react'
import type { Thread, Offer } from '../lib/agora'
import { PaymentModal, type PaymentReceipt } from './PaymentModal'
import { EscrowStatus } from './EscrowStatus'
import { SandboxExecuteModal } from './SandboxExecuteModal'
import { useWallet } from '../hooks/useWallet'
import { BASE_NETWORK } from '../lib/chain'

interface ThreadCardProps {
  thread: Thread
  relayUrl: string
  onAcceptComplete?: () => void
}

type SettlementSnapshot = {
  request_id: string
  currency?: string
  amount_gross?: number
  amount_fee?: number
  amount_seller?: number
  status?: 'HELD' | 'RELEASED' | 'REFUNDED'
  held_at?: string | null
  released_at?: string | null
  refunded_at?: string | null
}

function StatusPill({ status }: { status: Thread['status'] }) {
  const config = {
    OPEN: { bg: 'bg-agora-100', text: 'text-agora-600', border: 'border-agora-200', label: 'Open' },
    ACTIVE: { bg: 'bg-base-light', text: 'text-base-blue', border: 'border-blue-200', label: 'Active' },
    COMPLETED: { bg: 'bg-success-light', text: 'text-success', border: 'border-emerald-200', label: 'Completed' },
  }
  const c = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'COMPLETED' ? 'bg-success' : status === 'ACTIVE' ? 'bg-base-blue' : 'bg-agora-400'}`} />
      {c.label}
    </span>
  )
}

function OfferRow({
  offer,
  onAccept,
  canAccept,
}: {
  offer: Offer
  onAccept: () => void
  canAccept: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-agora-50 rounded-xl group hover:bg-agora-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-agora-200 to-agora-300 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-agora-600">
            {offer.provider.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="font-medium text-agora-900 text-sm">{offer.provider}</div>
          {offer.etaSec !== undefined && (
            <div className="text-xs text-agora-500">ETA: {offer.etaSec}s</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {offer.priceAmount !== undefined ? (
            <div className="font-semibold text-agora-900">
              {offer.currency === 'ETH'
                ? `${offer.priceAmount.toFixed(6)} ETH`
                : `$${offer.priceAmount.toFixed(4)} ${offer.currency || 'USDC'}`}
            </div>
          ) : (
            <div className="text-agora-400 text-sm">No price</div>
          )}
        </div>

        {canAccept && (
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-base-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            Accept
          </button>
        )}
      </div>
    </div>
  )
}

export function ThreadCard({ thread, relayUrl, onAcceptComplete }: ThreadCardProps) {
  const { isConnected, address, chainId } = useWallet()
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false)
  const [settlement, setSettlement] = useState<SettlementSnapshot | null>(null)

  const canAcceptOffers = thread.status === 'OPEN' && thread.offers.length > 0
  const acceptedOffer = thread.acceptedOfferId
    ? thread.offers.find((o) => o.offerId === thread.acceptedOfferId)
    : null
  const escrowBuyer = thread.requester
  const escrowSeller = acceptedOffer?.provider

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null
    const fetchSettlement = async () => {
      try {
        const res = await fetch(`${relayUrl.replace(/\/$/, '')}/v1/settlements/${encodeURIComponent(thread.requestId)}`)
        if (res.status === 404) {
          if (active) setSettlement(null)
          return
        }
        const json = await res.json()
        if (res.ok && json?.ok && json?.settlement) {
          if (active) setSettlement(json.settlement as SettlementSnapshot)
        }
      } catch {
        // best-effort display only
      }
    }
    fetchSettlement().catch(() => {})
    timer = setInterval(() => {
      fetchSettlement().catch(() => {})
    }, 8000)
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [relayUrl, thread.requestId, thread.acceptedAt, thread.settlementStatus])

  const handleAcceptClick = (offer: Offer) => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    setSelectedOffer(offer)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentConfirm = async (payment: PaymentReceipt) => {
    if (!selectedOffer) return

    setIsSubmitting(true)

    try {
      const senderId = address
        ? `eip155:${chainId ?? 84532}:${address.toLowerCase()}`
        : 'web:unknown'
      const payoutToken = payment.token
      const payoutAmount = selectedOffer.priceAmount ?? selectedOffer.priceUsd ?? payment.amount
      const chain = chainId === 8453
        ? 'base'
        : chainId === 84532
          ? 'base-sepolia'
          : payment.chain || BASE_NETWORK

      const acceptPayload = {
        request_id: thread.requestId,
        offer_id: selectedOffer.offerId,
        accepted_at: new Date().toISOString(),
        payment_tx: payment.txHash,
        chain,
        token: payoutToken,
        amount: payoutAmount,
        payer: address?.toLowerCase(),
        payee: selectedOffer.provider,
        terms: {
          offer_id: selectedOffer.offerId,
          provider: selectedOffer.provider,
          payer: address?.toLowerCase(),
          payee: selectedOffer.provider,
          token: payoutToken,
          chain,
          amount: payoutAmount,
          amount_usdc: payoutToken === 'USDC' ? payoutAmount : null,
          amount_eth: payoutToken === 'ETH' ? payoutAmount : null,
        },
      }

      const acceptEnvelope = {
        version: '1.0',
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ts: new Date().toISOString(),
        type: 'ACCEPT',
        sender: { id: senderId },
        thread: { id: thread.requestId },
        payload: acceptPayload,
      }

      const response = await fetch(`${relayUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope: acceptEnvelope }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit acceptance')
      }

      setIsPaymentModalOpen(false)
      setSelectedOffer(null)

      onAcceptComplete?.()
    } catch (error) {
      console.error('Failed to submit acceptance:', error)
      alert('Failed to submit acceptance. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-agora-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="px-5 py-4 border-b border-agora-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-agora-900 text-lg">{thread.intent || 'unknown.intent'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-agora-500 font-mono">{thread.requestId}</span>
                <span className="text-agora-300">•</span>
                <span className="text-xs text-agora-500">{thread.requester || 'Unknown'}</span>
              </div>
            </div>
            <StatusPill status={thread.status} />
          </div>

          {typeof thread.budgetUsd === 'number' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-agora-500 uppercase tracking-wider">Budget</span>
              <span className="text-sm font-semibold text-agora-900">${thread.budgetUsd.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Offers Section */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-agora-700 uppercase tracking-wider">
              Offers ({thread.offers.length})
            </h4>
            {canAcceptOffers && (
              <span className="text-xs text-base-blue font-medium">Click accept to pay with USDC or ETH</span>
            )}
          </div>

          {thread.offers.length > 0 ? (
            <div className="space-y-2">
              {thread.offers.map((offer) => (
                <OfferRow
                  key={offer.offerId}
                  offer={offer}
                  onAccept={() => handleAcceptClick(offer)}
                  canAccept={canAcceptOffers}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-agora-50 rounded-xl">
              <div className="w-12 h-12 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-agora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-agora-500 text-sm">No offers yet. Waiting for agents...</p>
            </div>
          )}
        </div>

        {/* Accepted Offer */}
        {acceptedOffer && (
          <div className="px-5 py-4 bg-gradient-to-r from-success-light/50 to-emerald-50/50 border-t border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-success">Offer Accepted</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-agora-700">
                Provider: <span className="font-medium">{acceptedOffer.provider}</span>
              </div>
              {acceptedOffer.priceAmount !== undefined && (
                <div className="text-sm font-semibold text-agora-900">
                  {acceptedOffer.currency === 'ETH'
                    ? `${acceptedOffer.priceAmount.toFixed(6)} ETH`
                    : `$${acceptedOffer.priceAmount.toFixed(4)} ${acceptedOffer.currency || 'USDC'}`}
                </div>
              )}
            </div>
            {thread.acceptedAt && (
              <div className="text-xs text-agora-500 mt-2">
                Accepted at {new Date(thread.acceptedAt).toLocaleString()}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-agora-500">
                If the provider is allowlisted for sandbox execution, you can run code and publish a RESULT.
              </div>
              <button
                onClick={() => setIsSandboxModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-agora-900 text-white text-sm font-semibold hover:bg-agora-800"
              >
                Execute (Sandbox)
              </button>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-agora-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-agora-500">Payment TX</div>
                <div className="text-xs font-mono text-agora-700 break-all">
                  {thread.paymentTx || 'Pending'}
                </div>
              </div>
              <div className="rounded-lg border border-agora-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-agora-500">Settlement Status</div>
                <div className="text-sm font-semibold text-agora-800">
                  {settlement?.status || thread.settlementStatus || 'PENDING'}
                </div>
              </div>
              <div className="rounded-lg border border-agora-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-agora-500">Buyer Frozen</div>
                <div className="text-sm font-semibold text-agora-900">
                  {typeof settlement?.amount_gross === 'number'
                    ? `${settlement.amount_gross.toFixed(6)} ${settlement.currency || thread.paymentToken || 'USDC'}`
                    : 'Pending'}
                </div>
              </div>
              <div className="rounded-lg border border-agora-200 bg-white px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-agora-500">Seller Net / Platform Fee</div>
                <div className="text-sm font-semibold text-agora-900">
                  {(typeof settlement?.amount_seller === 'number' && typeof settlement?.amount_fee === 'number')
                    ? `${settlement.amount_seller.toFixed(6)} / ${settlement.amount_fee.toFixed(6)} ${settlement.currency || thread.paymentToken || 'USDC'}`
                    : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        )}

        <EscrowStatus requestId={thread.requestId} buyer={escrowBuyer} seller={escrowSeller} />

        {/* Result Section */}
        {thread.result && (
          <div className="border-t border-agora-100">
            <details className="group">
              <summary className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-agora-50 transition-colors list-none">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-agora-700">View Result</span>
                </div>
                <svg className="w-5 h-5 text-agora-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <pre className="bg-agora-950 text-agora-100 p-4 rounded-xl overflow-x-auto text-xs font-mono">
                  {JSON.stringify(thread.result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsPaymentModalOpen(false)
            setSelectedOffer(null)
          }
        }}
        onConfirm={handlePaymentConfirm}
        offer={selectedOffer}
        thread={{ requestId: thread.requestId, intent: thread.intent }}
      />

      {acceptedOffer && (
        <SandboxExecuteModal
          isOpen={isSandboxModalOpen}
          onClose={() => setIsSandboxModalOpen(false)}
          relayUrl={relayUrl}
          agentId={acceptedOffer.provider}
          requestId={thread.requestId}
          intent={thread.intent}
        />
      )}
    </>
  )
}
