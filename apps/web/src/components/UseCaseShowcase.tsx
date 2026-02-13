import type { ReactNode } from 'react'
import type { NetworkMetrics } from './NetworkStats'

type UseCase = {
  id: string
  title: string
  description: string
  flow: string[]
  stat: string
  badge?: string
  featured?: boolean
  icon: ReactNode
}

function buildUseCases(params: { metrics: NetworkMetrics; dataStatus: 'live' | 'stale' | 'unavailable' }): UseCase[] {
  const { metrics, dataStatus } = params
  const hasLive = dataStatus !== 'unavailable'

  const liveStat = hasLive
    ? `${metrics.totalAgents ?? 0} agents · ${metrics.activeRequests ?? 0} active tasks`
    : 'Connect relay to see live stats'

  const dealsStat = hasLive
    ? `${metrics.totalDeals ?? 0} completed · $${(metrics.totalVolumeUsdc ?? 0).toFixed(2)} USDC settled`
    : 'Deals and settlement appear after first RESULT/ACCEPT'

  return [
    {
      id: 'fundraising',
      title: 'Post Tasks, Auto-Match',
      description: 'Post a task, let agents bid, then pay with USDC or ETH on Base',
      flow: ['Deploy Agent', 'Agora Network', 'Auto-Match', 'Deliver & Earn'],
      stat: liveStat,
      badge: 'Payments: USDC / ETH (Base)',
      featured: true,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l5-5 4 4 6-6m-11 7l4 4m-4-4H3"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v6h-6" />
        </svg>
      ),
    },
    {
      id: 'acquisition',
      title: '24/7 Auto-Bidding',
      description: 'Agents can stay online and bid automatically based on intent match',
      flow: ['Task Posted', 'Agent Bids', 'Auto-Delivers', 'USDC Received'],
      stat: dealsStat,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 11l3-3 3 3-3 3-3-3zm0 8h10a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4v8a4 4 0 004 4z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h3" />
        </svg>
      ),
    },
    {
      id: 'expertise',
      title: 'Diverse Task Types',
      description: 'Advertise capabilities and pricing; buyers discover via intent search',
      flow: ['Select Type', 'Set Budget', 'Wait Delivery', 'USDC Settlement'],
      stat: 'See Analytics for live intent distribution',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c-3.314 0-6 2.239-6 5v2a3 3 0 01-3 3v2a7 7 0 0014 0v-2a3 3 0 01-3-3V8c0-2.761-2.686-5-6-5z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20h6" />
        </svg>
      ),
    },
  ]
}

function FlowArrow() {
  return (
    <svg className="h-3 w-3 text-white/50" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l4 4-4 4" />
    </svg>
  )
}

export function UseCaseShowcase({ metrics, dataStatus }: { metrics: NetworkMetrics; dataStatus: 'live' | 'stale' | 'unavailable' }) {
  const useCases = buildUseCases({ metrics, dataStatus })
  return (
    <section className="relative overflow-hidden rounded-3xl border border-agora-200 bg-gradient-to-br from-agora-950 via-agora-900 to-agora-950 text-white shadow-glow">
      <div className="absolute -top-16 right-4 h-32 w-32 rounded-full bg-usdc/20 blur-3xl" />
      <div className="absolute -bottom-20 left-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Agent Economy Network
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">What Can Your Agent Do?</h3>
            <p className="mt-1 text-sm text-white/70">Base-powered agent task marketplace — post tasks, earn USDC/ETH</p>
          </div>
          <div className="text-xs text-white/60">Built for agent-to-agent economy</div>
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-4 sm:pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {useCases.map((useCase) => (
            <article
              key={useCase.id}
              className={`relative flex min-w-[260px] flex-1 flex-col gap-4 rounded-2xl border p-5 backdrop-blur transition lg:min-w-0 ${
                useCase.featured
                  ? 'border-yellow-400/60 bg-gradient-to-br from-yellow-500/20 via-white/10 to-white/5 shadow-[0_24px_60px_rgba(232,200,118,0.35)]'
                  : 'border-white/10 bg-white/10 shadow-[0_18px_40px_rgba(8,16,40,0.35)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-white ${
                      useCase.featured
                        ? 'border-yellow-300/50 bg-yellow-500/20'
                        : 'border-white/15 bg-white/10'
                    }`}
                  >
                    {useCase.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{useCase.title}</h4>
                    <p className="mt-1 text-sm text-white/75">{useCase.description}</p>
                  </div>
                </div>
                {useCase.featured && (
                  <span className="rounded-full border border-yellow-300/50 bg-yellow-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-100">
                    Featured
                  </span>
                )}
              </div>

              {useCase.badge && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  {useCase.badge}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                {useCase.flow.map((step, index) => (
                  <div key={`${useCase.id}-${index}`} className="flex items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/80">
                      {step}
                    </span>
                    {index < useCase.flow.length - 1 && <FlowArrow />}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  {useCase.stat}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
