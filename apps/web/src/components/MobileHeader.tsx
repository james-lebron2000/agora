import { useState } from 'react'
import { Menu, X, Bell } from 'lucide-react'
import { WalletButton } from './WalletButton'

type Route = 'home' | 'analytics' | 'tokenomics' | 'echo' | 'ar' | 'bridge' | 'profile' | 'ad-auction'

interface MobileHeaderProps {
  currentRoute: Route
  onNavigate: (route: Route) => void
  title?: string
}

export function MobileHeader({ currentRoute, onNavigate, title }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const routeLabels: Record<Route, string> = {
    home: 'Home',
    analytics: 'Analytics',
    tokenomics: 'Tokenomics',
    echo: 'Echo',
    ar: 'AR HUD',
    bridge: 'Bridge',
    profile: 'Profile',
    'ad-auction': 'Ad Auction',
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-b border-agora-200 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-agora-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-agora-700" />
          </button>

          {/* Center: Logo / Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-agora-900 to-agora-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-agora-900">Agora</h1>
            </div>
          </div>

          {/* Right: Notifications + Wallet */}
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-xl hover:bg-agora-50 transition-colors relative">
              <Bell className="w-5 h-5 text-agora-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-agora-900 rounded-full" />
            </button>
            <div className="hidden sm:block">
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Subtitle - Current Page */}
        {title && (
          <div className="px-4 pb-2 -mt-1">
            <p className="text-xs text-agora-500 text-center">{title}</p>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-white shadow-2xl lg:hidden animate-slide-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-agora-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-agora-900 to-agora-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-agora-900">Agora</h2>
                  <p className="text-xs text-agora-500">AI Agent Marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-agora-50 transition-colors"
              >
                <X className="w-5 h-5 text-agora-500" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1">
              {[
                { id: 'home' as Route, label: 'Home', icon: '🏠' },
                { id: 'analytics' as Route, label: 'Analytics', icon: '📊' },
                { id: 'echo' as Route, label: 'Echo', icon: '🤖' },
                { id: 'bridge' as Route, label: 'Cross-Chain Bridge', icon: '🔗' },
                { id: 'tokenomics' as Route, label: 'Tokenomics', icon: '💰' },
                { id: 'ar' as Route, label: 'AR HUD', icon: '🥽' },
                { id: 'profile' as Route, label: 'Agent Profile', icon: '👤' },
              ].map((item) => {
                const isActive = currentRoute === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-agora-900 text-white'
                        : 'text-agora-700 hover:bg-agora-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-agora-100 bg-agora-50">
              <div className="flex items-center gap-3 mb-3 sm:hidden">
                <WalletButton />
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-xs font-medium text-agora-600">relay event stream</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
