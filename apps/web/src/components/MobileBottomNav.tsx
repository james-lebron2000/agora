import { useState, useEffect } from 'react'
import {
  Home,
  BarChart3,
  Coins,
  Bot,
  ArrowLeftRight,
  Menu,
  X,
  User,
  Settings,
  Bell
} from 'lucide-react'

type Route = 'home' | 'analytics' | 'tokenomics' | 'echo' | 'ar' | 'bridge' | 'profile'

interface MobileBottomNavProps {
  currentRoute: Route
  onNavigate: (route: Route) => void
}

export function MobileBottomNav({ currentRoute, onNavigate }: MobileBottomNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollThreshold = 100

      if (currentScrollY < scrollThreshold) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const navItems = [
    { id: 'home' as Route, label: 'Home', icon: Home },
    { id: 'analytics' as Route, label: 'Analytics', icon: BarChart3 },
    { id: 'echo' as Route, label: 'Echo', icon: Bot },
    { id: 'bridge' as Route, label: 'Bridge', icon: ArrowLeftRight },
  ]

  const menuItems = [
    { id: 'tokenomics' as Route, label: 'Tokenomics', icon: Coins },
    { id: 'profile' as Route, label: 'Profile', icon: User },
  ]

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-agora-200 safe-area-bottom transition-transform duration-300 lg:hidden ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentRoute === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-xl transition-all ${
                  isActive
                    ? 'text-agora-900 bg-agora-50'
                    : 'text-agora-400 hover:text-agora-600'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </button>
            )
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-xl transition-all ${
              isMenuOpen
                ? 'text-agora-900 bg-agora-50'
                : 'text-agora-400 hover:text-agora-600'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl lg:hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-agora-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-agora-100">
              <h3 className="font-semibold text-agora-900">More Options</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-agora-50"
              >
                <X className="w-5 h-5 text-agora-500" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentRoute === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-agora-900 text-white'
                        : 'bg-agora-50 text-agora-700 hover:bg-agora-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}

              <div className="border-t border-agora-100 my-3" />

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-agora-50 text-agora-700 hover:bg-agora-100 transition-all">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-agora-50 text-agora-700 hover:bg-agora-100 transition-all">
                <Bell className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
                <span className="ml-auto bg-agora-900 text-white text-xs px-2 py-0.5 rounded-full">
                  3
                </span>
              </button>
            </div>

            {/* Safe area spacer */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>
        </>
      )}
    </>
  )
}
