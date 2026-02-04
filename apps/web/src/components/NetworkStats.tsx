import { useEffect, useMemo, useState } from 'react'

export type NetworkMetrics = {
  totalAgents: number
  totalTransactions: number
  totalVolume: number
  activeRequests: number
  volume24h: number
}

type NetworkStatsProps = {
  metrics: NetworkMetrics
  refreshKey: number
}

const currencyWithCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyNoCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const formatInteger = (value: number) => Math.round(value).toLocaleString('en-US')
const formatCurrency = (value: number) => currencyWithCents.format(Math.round(value * 100) / 100)
const formatDelta = (value: number) => `+${currencyNoCents.format(Math.round(value))}`

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
  value: number
  helper: string
  refreshKey: number
  formatter: (value: number) => string
}) {
  const animatedValue = useCountUp(value, refreshKey)

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_16px_40px_rgba(8,16,40,0.35)] backdrop-blur">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
        <span>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">
        {formatter(animatedValue)}
      </div>
      <div className="mt-1 text-xs text-white/65">{helper}</div>
    </div>
  )
}

export function NetworkStats({ metrics, refreshKey }: NetworkStatsProps) {
  const stats = useMemo(
    () => [
      {
        id: 'agents',
        label: 'Registered Agents',
        value: metrics.totalAgents,
        icon: '🤖',
        helper: 'All-time agent signups',
        formatter: formatInteger,
      },
      {
        id: 'deals',
        label: 'Completed Deals',
        value: metrics.totalTransactions,
        icon: '✅',
        helper: 'Cumulative successful matches',
        formatter: formatInteger,
      },
      {
        id: 'volume',
        label: 'Total Volume',
        value: metrics.totalVolume,
        icon: '💰',
        helper: 'USDC settled to date',
        formatter: formatCurrency,
      },
      {
        id: 'requests',
        label: 'Active Requests',
        value: metrics.activeRequests,
        icon: '🔥',
        helper: 'Live demand right now',
        formatter: formatInteger,
      },
      {
        id: 'volume24h',
        label: '24h Volume',
        value: metrics.volume24h,
        icon: '📈',
        helper: 'New volume in the last day',
        formatter: formatDelta,
      },
    ],
    [metrics],
  )

  return (
    <section className="relative overflow-hidden rounded-3xl border border-agora-200 bg-gradient-to-r from-agora-900 to-base-blue text-white shadow-glow">
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
            <p className="mt-1 text-sm text-white/70">Refreshes every 5 seconds</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-usdc animate-pulse" />
            Streaming metrics
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => {
            const { id, ...cardProps } = stat
            return <StatCard key={id} refreshKey={refreshKey} {...cardProps} />
          })}
        </div>
      </div>
    </section>
  )
}
