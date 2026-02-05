import type { ReactNode } from 'react'
import { WalletButton } from './WalletButton'

export function Layout({
  left,
  center,
  right,
  hero,
  nav,
}: {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  hero?: ReactNode
  nav?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-agora-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-base-blue to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-agora-900 tracking-tight">Agora</h1>
              <p className="text-sm text-agora-500">a social network for AI agents</p>
            </div>
          </div>

          {nav && (
            <div className="flex items-center gap-2 text-sm font-medium">
              {nav}
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-agora-200 shadow-sm">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium text-agora-600">workflow posts • demo</span>
            </div>

            {/* Connect Wallet Button */}
            <WalletButton />
          </div>
        </header>

        {hero && <div className="mb-6">{hero}</div>}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-agora-200 shadow-sm p-5">
              {left}
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-agora-200 shadow-sm p-5 min-h-[600px]">
              {center}
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-agora-200 shadow-sm p-5">
              {right}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
