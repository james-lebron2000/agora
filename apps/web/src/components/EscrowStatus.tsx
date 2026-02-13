import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPublicClient, formatUnits, http, isAddress, type Address } from 'viem'
import { useWriteContract } from 'wagmi'
import { useWallet, truncateAddress } from '../hooks/useWallet'
import { getChainLabel, getExplorerBaseUrl, PREFERRED_CHAIN, resolveRpcUrl } from '../lib/chain'
import { ESCROW_ABI, ESCROW_TIMEOUT_SEC, encodeRequestId, getEscrowAddress } from '../lib/escrow'

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: 'bg-agora-100', text: 'text-agora-600', border: 'border-agora-200' },
  DEPOSITED: { label: 'Deposited', bg: 'bg-base-light', text: 'text-base-blue', border: 'border-blue-200' },
  RELEASED: { label: 'Released', bg: 'bg-success-light', text: 'text-success', border: 'border-emerald-200' },
  REFUNDED: { label: 'Refunded', bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning/40' },
} as const

type EscrowUiStatus = keyof typeof STATUS_CONFIG

type EscrowData = {
  buyer: Address
  seller: Address
  token: Address
  amount: bigint
  createdAt: bigint
  status: EscrowUiStatus
}

interface EscrowStatusProps {
  requestId: string
  buyer?: string
  seller?: string
  className?: string
}

function StatusPill({ status }: { status: EscrowUiStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'RELEASED' ? 'bg-success' : status === 'DEPOSITED' ? 'bg-base-blue' : status === 'REFUNDED' ? 'bg-warning' : 'bg-agora-400'}`} />
      {cfg.label}
    </span>
  )
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function statusFromValue(value: number): EscrowUiStatus {
  switch (value) {
    case 1:
      return 'DEPOSITED'
    case 2:
      return 'RELEASED'
    case 3:
      return 'REFUNDED'
    default:
      return 'PENDING'
  }
}

export function EscrowStatus({ requestId, buyer, seller, className }: EscrowStatusProps) {
  const { address, isConnected, isBaseChain, switchToBaseChain } = useWallet()
  const { writeContractAsync } = useWriteContract()
  const [escrow, setEscrow] = useState<EscrowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<string | null>(null)

  const escrowAddress = getEscrowAddress()
  const requestIdHash = useMemo(() => encodeRequestId(requestId), [requestId])

  const publicClient = useMemo(() => {
    const rpcUrl = resolveRpcUrl(PREFERRED_CHAIN.id)
    return createPublicClient({ chain: PREFERRED_CHAIN, transport: http(rpcUrl) })
  }, [])

  const refreshEscrow = useCallback(async () => {
    if (!escrowAddress) {
      setError('Escrow contract not configured')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'escrows',
        args: [requestIdHash],
      })
      const [buyerAddr, sellerAddr, tokenAddr, amount, createdAt, status] = result as [
        Address,
        Address,
        Address,
        bigint,
        bigint,
        number,
      ]

      setEscrow({
        buyer: buyerAddr,
        seller: sellerAddr,
        token: tokenAddr,
        amount,
        createdAt,
        status: statusFromValue(Number(status)),
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch escrow')
    } finally {
      setLoading(false)
    }
  }, [escrowAddress, publicClient, requestIdHash])

  useEffect(() => {
    refreshEscrow().catch(() => {})
    const timer = setInterval(() => {
      refreshEscrow().catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [refreshEscrow])

  useEffect(() => {
    if (!escrowAddress) return
    const unwatchDeposit = publicClient.watchContractEvent({
      address: escrowAddress,
      abi: ESCROW_ABI,
      eventName: 'Deposited',
      args: { requestId: requestIdHash },
      onLogs: () => refreshEscrow().catch(() => {}),
    })
    const unwatchRelease = publicClient.watchContractEvent({
      address: escrowAddress,
      abi: ESCROW_ABI,
      eventName: 'Released',
      args: { requestId: requestIdHash },
      onLogs: () => refreshEscrow().catch(() => {}),
    })
    const unwatchRefund = publicClient.watchContractEvent({
      address: escrowAddress,
      abi: ESCROW_ABI,
      eventName: 'Refunded',
      args: { requestId: requestIdHash },
      onLogs: () => refreshEscrow().catch(() => {}),
    })

    return () => {
      unwatchDeposit()
      unwatchRelease()
      unwatchRefund()
    }
  }, [escrowAddress, publicClient, refreshEscrow, requestIdHash])

  useEffect(() => {
    if (escrow?.status !== 'DEPOSITED') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [escrow?.status])

  const hasEscrow = escrow?.status && escrow.status !== 'PENDING'
  const isNativeEth = escrow ? escrow.token.toLowerCase() === '0x0000000000000000000000000000000000000000' : false
  const amountDisplay = escrow
    ? Number(formatUnits(escrow.amount, isNativeEth ? 18 : 6))
    : 0
  const createdAtMs = escrow ? Number(escrow.createdAt) * 1000 : 0
  const expiresAtMs = createdAtMs + ESCROW_TIMEOUT_SEC * 1000
  const timeLeftMs = escrow?.status === 'DEPOSITED' ? expiresAtMs - now : 0
  const countdown = escrow?.status === 'DEPOSITED' ? formatCountdown(timeLeftMs) : '--'
  const timedOut = escrow?.status === 'DEPOSITED' && timeLeftMs <= 0

  const walletAddress = address?.toLowerCase() || ''
  const buyerAddress = (isAddress(buyer || '') ? (buyer as string) : escrow?.buyer || '')
  const sellerAddress = (isAddress(seller || '') ? (seller as string) : escrow?.seller || '')

  const isBuyer = Boolean(buyerAddress) && walletAddress === buyerAddress.toLowerCase()
  const isSeller = Boolean(sellerAddress) && walletAddress === sellerAddress.toLowerCase()

  const canRelease = escrow?.status === 'DEPOSITED' && (isBuyer || (isSeller && timedOut))
  const canRefund = escrow?.status === 'DEPOSITED' && isBuyer && timedOut

  const handleSwitchChain = async () => {
    await switchToBaseChain()
  }

  const handleRelease = async () => {
    if (!escrowAddress) return
    if (!window.confirm('Release escrow to seller? This cannot be undone.')) return
    setActionBusy(true)
    setActionError(null)
    try {
      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'release',
        args: [requestIdHash],
      })
      setLastTx(txHash)
    } catch (err: any) {
      setActionError(err?.shortMessage || err?.message || 'Release failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleRefund = async () => {
    if (!escrowAddress) return
    if (!window.confirm('Refund escrow to buyer? This cannot be undone.')) return
    setActionBusy(true)
    setActionError(null)
    try {
      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [requestIdHash],
      })
      setLastTx(txHash)
    } catch (err: any) {
      setActionError(err?.shortMessage || err?.message || 'Refund failed')
    } finally {
      setActionBusy(false)
    }
  }

  const explorerBaseUrl = getExplorerBaseUrl(PREFERRED_CHAIN.id)
  const chainLabel = getChainLabel(PREFERRED_CHAIN.id)

  return (
    <div className={className}>
      <div className="border-t border-agora-100">
        <details className="group">
          <summary className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-agora-50 transition-colors list-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-agora-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-agora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-agora-700">Escrow</span>
                  <StatusPill status={escrow?.status || 'PENDING'} />
                </div>
                <div className="text-xs text-agora-500 mt-1">
                  {hasEscrow ? 'Funds held' : 'No funds locked'} • {chainLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
	              <div className="text-right">
	                <div className="text-xs text-agora-500">Amount</div>
	                <div className="text-sm font-semibold text-agora-900">
	                  {isNativeEth ? `${amountDisplay.toFixed(6)} ETH` : `$${amountDisplay.toFixed(4)}`}
	                </div>
	              </div>
              <svg className="w-5 h-5 text-agora-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>

          <div className="px-5 pb-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-agora-50 rounded-xl p-4">
                <div className="text-xs text-agora-500 uppercase tracking-wide">Participants</div>
                <div className="mt-2 text-sm text-agora-700">
                  Buyer: <span className="font-mono">{buyerAddress ? truncateAddress(buyerAddress, 4) : 'Unknown'}</span>
                </div>
                <div className="mt-1 text-sm text-agora-700">
                  Seller: <span className="font-mono">{sellerAddress ? truncateAddress(sellerAddress, 4) : 'Unknown'}</span>
                </div>
              </div>
              <div className="bg-agora-50 rounded-xl p-4">
                <div className="text-xs text-agora-500 uppercase tracking-wide">Window</div>
                <div className="mt-2 text-sm text-agora-700">
                  Timeout: <span className="font-semibold">24 hours</span>
                </div>
                <div className="mt-1 text-sm text-agora-700">
                  Countdown: <span className={timedOut ? 'text-warning font-semibold' : 'text-agora-900 font-semibold'}>{countdown}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={`${explorerBaseUrl}/address/${escrowAddress || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-base-blue hover:underline"
              >
                View on BaseScan
              </a>
              {lastTx && (
                <a
                  href={`${explorerBaseUrl}/tx/${lastTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-base-blue hover:underline"
                >
                  Latest TX
                </a>
              )}
            </div>

            {loading && (
              <div className="mt-4 text-xs text-agora-500">Loading escrow status...</div>
            )}
            {error && (
              <div className="mt-4 text-xs text-red-600">{error}</div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!isConnected && (
                <div className="text-xs text-agora-500">Connect wallet to manage escrow.</div>
              )}
              {isConnected && !isBaseChain && (
                <button
                  onClick={handleSwitchChain}
                  className="px-3 py-2 rounded-lg border border-warning/40 text-warning text-xs font-semibold hover:bg-warning-light transition-colors"
                >
                  Switch to {chainLabel}
                </button>
              )}
              {isConnected && isBaseChain && canRelease && (
                <button
                  onClick={handleRelease}
                  disabled={actionBusy}
                  className="px-4 py-2 rounded-lg bg-success text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50"
                >
                  Release
                </button>
              )}
              {isConnected && isBaseChain && canRefund && (
                <button
                  onClick={handleRefund}
                  disabled={actionBusy}
                  className="px-4 py-2 rounded-lg bg-warning text-white text-xs font-semibold hover:bg-amber-500 disabled:opacity-50"
                >
                  Refund
                </button>
              )}
              {actionError && (
                <span className="text-xs text-red-600">{actionError}</span>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
