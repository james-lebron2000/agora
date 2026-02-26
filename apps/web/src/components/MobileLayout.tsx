import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { MobileHeader } from './MobileHeader'
import { MobileBottomNav } from './MobileBottomNav'
import { PullToRefresh } from './PullToRefresh'

type Route = 'home' | 'analytics' | 'tokenomics' | 'echo' | 'ar' | 'bridge' | 'profile'

interface MobileLayoutProps {
  children: ReactNode
  currentRoute: Route
  onNavigate: (route: Route) => void
  onRefresh?: () => Promise<void>
  headerTitle?: string
  showBottomNav?: boolean
  showHeader?: boolean
  className?: string
  contentClassName?: string
}

/**
 * MobileLayout Component
 * 
 * Provides a comprehensive mobile layout with:
 * - Fixed header with navigation drawer
 * - Pull-to-refresh support
 * - Fixed bottom navigation
 * - Safe area insets handling
 * - Smooth page transitions
 */
export function MobileLayout({
  children,
  currentRoute,
  onNavigate,
  onRefresh,
  headerTitle,
  showBottomNav = true,
  showHeader = true,
  className = '',
  contentClassName = '',
}: MobileLayoutProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle refresh
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className={`min-h-screen bg-agora-50 ${className}`}>
      {/* Mobile Header */}
      {showHeader && (
        <MobileHeader 
          currentRoute={currentRoute} 
          onNavigate={onNavigate}
          title={headerTitle}
        />
      )}

      {/* Main Content Area */}
      <main 
        className={`
          min-h-screen
          ${showHeader ? 'pt-[72px]' : ''}
          ${showBottomNav ? 'pb-20' : ''}
          ${contentClassName}
        `}
      >
        {onRefresh ? (
          <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
            {children}
          </PullToRefresh>
        ) : (
          children
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {showBottomNav && (
        <MobileBottomNav
          currentRoute={currentRoute}
          onNavigate={onNavigate}
        />
      )}

      {/* Safe Area Spacer for iOS */}
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-lg z-40 lg:hidden" />
    </div>
  )
}

/**
 * MobileContentCard
 * 
 * A card component optimized for mobile viewing with:
 * - Proper touch targets (44px minimum)
 * - Rounded corners for modern feel
 * - Shadow and border for depth
 * - Padding optimized for mobile
 */
export function MobileContentCard({
  children,
  className = '',
  onClick,
  padding = 'normal',
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  padding?: 'none' | 'small' | 'normal' | 'large'
}) {
  const paddingClasses = {
    none: '',
    small: 'p-3',
    normal: 'p-4',
    large: 'p-5',
  }

  return (
    <motion.div
      className={`
        bg-white rounded-2xl border border-agora-200 shadow-sm
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  )
}

/**
 * MobileSection
 * 
 * A section wrapper for mobile content with:
 * - Consistent spacing
 * - Optional title
 * - Divider support
 */
export function MobileSection({
  children,
  title,
  className = '',
  showDivider = false,
  action,
}: {
  children: ReactNode
  title?: string
  className?: string
  showDivider?: boolean
  action?: ReactNode
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-1">
          {title && (
            <h2 className="text-lg font-bold text-agora-900">{title}</h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
      {showDivider && <div className="h-px bg-agora-200 mx-4" />}
    </section>
  )
}

/**
 * MobileList
 * 
 * A list component optimized for mobile with:
 * - Proper row height for touch
 * - Dividers between items
 * - Chevron indicators for navigable items
 */
export function MobileList({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <MobileContentCard padding="none" className={className}>
      <div className="divide-y divide-agora-100">
        {children}
      </div>
    </MobileContentCard>
  )
}

/**
 * MobileListItem
 * 
 * Individual list item with:
 * - 44px minimum touch target
 * - Icon support
 * - Value/label display
 * - Chevron for navigation
 */
export function MobileListItem({
  icon,
  label,
  value,
  onClick,
  showChevron = false,
  isDestructive = false,
  className = '',
}: {
  icon?: ReactNode
  label: string
  value?: ReactNode
  onClick?: () => void
  showChevron?: boolean
  isDestructive?: boolean
  className?: string
}) {
  return (
    <motion.button
      className={`
        w-full flex items-center gap-3 px-4 py-3.5
        ${onClick ? 'active:bg-agora-50' : ''}
        ${isDestructive ? 'text-red-600' : 'text-agora-900'}
        ${className}
      `}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {icon && (
        <div className={`flex-shrink-0 ${isDestructive ? 'text-red-500' : 'text-agora-500'}`}>
          {icon}
        </div>
      )}
      <span className="flex-1 text-left font-medium">{label}</span>
      {value && (
        <span className="text-agora-500 text-sm">{value}</span>
      )}
      {showChevron && (
        <svg 
          className="w-5 h-5 text-agora-400 flex-shrink-0" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </motion.button>
  )
}

/**
 * MobileGrid
 * 
 * A responsive grid for mobile with:
 * - 2 columns on mobile
 * - Proper spacing
 * - Consistent card sizing
 */
export function MobileGrid({
  children,
  columns = 2,
  gap = 3,
  className = '',
}: {
  children: ReactNode
  columns?: 1 | 2 | 3
  gap?: 2 | 3 | 4
  className?: string
}) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }

  const gapClasses = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
  }

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

/**
 * MobileFab (Floating Action Button)
 * 
 * A floating action button for primary actions
 */
export function MobileFab({
  onClick,
  icon,
  label,
  position = 'bottom-right',
}: {
  onClick: () => void
  icon: ReactNode
  label?: string
  position?: 'bottom-right' | 'bottom-center'
}) {
  const positionClasses = {
    'bottom-right': 'right-4 bottom-24',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-24',
  }

  return (
    <motion.button
      className={`
        fixed ${positionClasses[position]}
        z-30 flex items-center gap-2
        px-4 py-3 bg-agora-900 text-white
        rounded-full shadow-lg shadow-agora-900/30
        lg:hidden
      `}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </motion.button>
  )
}

/**
 * MobileTabs
 * 
 * Horizontal scrollable tabs for mobile
 */
export function MobileTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
}: {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>
  activeTab: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-1 p-1 bg-agora-100 rounded-xl min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-colors whitespace-nowrap
                ${isActive 
                  ? 'bg-white text-agora-900 shadow-sm' 
                  : 'text-agora-600 hover:text-agora-900'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * MobileSearchBar
 * 
 * A search bar optimized for mobile
 */
export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onFocus,
  onBlur,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-agora-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-4 py-3 bg-white border border-agora-200 rounded-xl
          text-agora-900 placeholder-agora-400
          focus:outline-none focus:border-agora-500 focus:ring-2 focus:ring-agora-500/20
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-agora-100"
        >
          <svg className="w-4 h-4 text-agora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * MobileEmptyState
 * 
 * Empty state component for mobile screens
 */
export function MobileEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-agora-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-agora-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-agora-500 mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}

/**
 * MobileToast
 * 
 * Toast notification for mobile
 */
export function MobileToast({
  message,
  type = 'info',
  isVisible,
  onClose,
}: {
  message: string
  type?: 'info' | 'success' | 'error' | 'warning'
  isVisible: boolean
  onClose: () => void
}) {
  const typeStyles = {
    info: 'bg-agora-900 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`
            fixed top-20 left-4 right-4 z-50
            ${typeStyles[type]}
            px-4 py-3 rounded-xl shadow-lg
            flex items-center justify-between
          `}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <span className="font-medium text-sm">{message}</span>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MobileLayout
