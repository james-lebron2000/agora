import { useEffect, useMemo, useState } from 'react'

export type NetworkMetrics = {
  totalAgents: number | null
  totalDeals: number | null
  totalVolumeUsdc: number | null
  totalVolumeEth: number | null
  activeRequests: number | null
  volume24hUsdc: number | null
  volume24hEth: number | null
}

type NetworkStatsProps = {
  metrics: NetworkMetrics
  refreshKey: number
  dataStatus: 'live' | 'stale' | 'unavailable'
}

const currencyWithCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatInteger = (value: number | null) => (value == null ? '--' : Math.round(value).toLocaleString('en-US'))
const formatCurrency = (value: number | null) => (value == null ? '--' : currencyWithCents.format(Math.round(value * 100) / 100))
const formatEth = (value: number | null) => (value == null ? '--' : `${(Math.round(value * 1e6) / 1e6).toLocaleString('en-US')} ETH`)
const formatVolume24h = (value: number | null) => formatCurrency(value)

function useCountUp(target: number, refreshKey: number, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    let start: number | null = null
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setValue(target)
      return
    }

    const from = 0
    const delta = target - from

    const step = (timestamp: number) => {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + delta * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    setValue(from)
    raf = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf)
  }, [target, refreshKey, duration])

  return value
}

function StatCard({
  icon,
  label,
  value,
  helper,
  refreshKey,
  formatter,
}: {
  icon: string
  label: string
  value: number | null
  helper: string
  refreshKey: number
  formatter: (value: number | null) => string
}) {
  const animatedValue = useCountUp(value == null ? 0 : value, refreshKey)

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_16px_40px_rgba(8,16,40,0.35)] backdrop-blur">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
        <span>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">
        {formatter(value == null ? null : animatedValue)}
      </div>
      <div className="mt-1 text-xs text-white/65">{helper}</div>
    </div>
  )
}

export function NetworkStats({ metrics, refreshKey, dataStatus }: NetworkStatsProps) {
  const stats = useMemo(
    () => [
      {
        id: 'agents',
        label: 'Registered Agents',
        value: metrics.totalAgents,
        icon: '🤖',
        helper: 'From agent registry and relay providers',
        formatter: formatInteger,
      },
      {
        id: 'deals',
        label: 'Completed Deals',
        value: metrics.totalDeals,
        icon: '✅',
        helper: 'Threads with RESULT events',
        formatter: formatInteger,
      },
      {
        id: 'volume_usdc',
        label: 'Total Settled (USDC)',
        value: metrics.totalVolumeUsdc,
        icon: '💰',
        helper: 'Accepted payments with USDC token',
        formatter: formatCurrency,
      },
      {
        id: 'requests',
        label: 'Active Requests',
        value: metrics.activeRequests,
        icon: '🔥',
        helper: 'OPEN + ACTIVE threads',
        formatter: formatInteger,
      },
      {
        id: 'volume_eth',
        label: 'Total Settled (ETH)',
        value: metrics.totalVolumeEth,
        icon: '⛓',
        helper: 'Accepted payments with ETH token',
        formatter: formatEth,
      },
      {
        id: 'volume24h_usdc',
        label: '24h Settled (USDC)',
        value: metrics.volume24hUsdc,
        icon: '📈',
        helper: 'Accepted USDC payments in last 24h',
        formatter: formatVolume24h,
      },
      {
        id: 'volume24h_eth',
        label: '24h Settled (ETH)',
        value: metrics.volume24hEth,
        icon: '🕒',
        helper: 'Accepted ETH payments in last 24h',
        formatter: formatEth,
      },
    ],
    [metrics],
  )

  const statusLabel = dataStatus === 'live' ? 'live'
    : dataStatus === 'stale' ? 'stale'
      : 'offline'
  const statusColor = dataStatus === 'live' ? 'bg-success'
    : dataStatus === 'stale' ? 'bg-warning'
      : 'bg-agora-400'

  return (
    <section className="relative overflow-hidden rounded-3xl border border-agora-200 bg-gradient-to-r from-agora-900 to-agora-950 text-white shadow-glow">
      <div className="absolute -top-20 right-8 h-40 w-40 rounded-full bg-usdc/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Live Network Pulse
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">
              Real-time Agora Activity
            </h3>
            <p className="mt-1 text-sm text-white/70">Auto-updates from relay events</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className={`h-2 w-2 rounded-full ${statusColor} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
            {statusLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {stats.map((stat) => {
            const { id, ...cardProps } = stat
            return <StatCard key={id} refreshKey={refreshKey} {...cardProps} />
          })}
        </div>
      </div>
    </section>
  )
}
