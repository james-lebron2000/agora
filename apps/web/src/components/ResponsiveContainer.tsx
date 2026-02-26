/**
 * ResponsiveContainer - A responsive layout system for Agora Web App
 * Provides breakpoints: sm(640px), md(768px), lg(1024px)
 * with mobile-first design approach
 */
import type { ReactNode, CSSProperties } from 'react'
import { useMobile } from '../hooks/useMobile'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  /** Maximum width of the container */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Padding size - responsive by default */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Whether to add safe area insets for notched devices */
  safeArea?: boolean | 'top' | 'bottom' | 'both'
  /** Center the container horizontally */
  centered?: boolean
  /** Add bottom padding for mobile bottom nav */
  bottomNavSpacing?: boolean
  /** Add top padding for mobile header */
  headerSpacing?: boolean
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
}

const paddingClasses = {
  none: '',
  sm: 'px-3 sm:px-4 lg:px-6',
  md: 'px-4 sm:px-6 lg:px-8',
  lg: 'px-4 sm:px-8 lg:px-12',
}

export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = 'lg',
  padding = 'md',
  safeArea = false,
  centered = true,
  bottomNavSpacing = false,
  headerSpacing = false,
}: ResponsiveContainerProps) {
  const { safeArea: safeAreaInsets } = useMobile()

  const getSafeAreaStyles = (): CSSProperties => {
    const styles: CSSProperties = {}
    
    if (safeArea === true || safeArea === 'top' || safeArea === 'both') {
      styles.paddingTop = safeAreaInsets.top > 0 ? safeAreaInsets.top : undefined
    }
    if (safeArea === true || safeArea === 'bottom' || safeArea === 'both') {
      styles.paddingBottom = safeAreaInsets.bottom > 0 ? safeAreaInsets.bottom : undefined
    }
    
    return styles
  }

  const getSpacingClasses = () => {
    const classes: string[] = []
    
    if (headerSpacing) {
      classes.push('pt-20 lg:pt-6') // Space for mobile header
    }
    if (bottomNavSpacing) {
      classes.push('pb-24 lg:pb-6') // Space for mobile bottom nav
    }
    
    return classes.join(' ')
  }

  return (
    <div
      className={`
        w-full
        ${maxWidthClasses[maxWidth]}
        ${paddingClasses[padding]}
        ${centered ? 'mx-auto' : ''}
        ${getSpacingClasses()}
        ${className}
      `.trim()}
      style={getSafeAreaStyles()}
    >
      {children}
    </div>
  )
}

/**
 * ResponsiveGrid - A responsive grid layout that adapts to screen size
 */
interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  /** Number of columns on mobile (default: 1) */
  cols?: 1 | 2 | 3 | 4 | 6
  /** Number of columns on tablet (default: 2) */
  mdCols?: 1 | 2 | 3 | 4 | 6
  /** Number of columns on desktop (default: 3) */
  lgCols?: 1 | 2 | 3 | 4 | 6
  /** Gap between grid items */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

const gapClasses = {
  none: '',
  sm: 'gap-2',
  md: 'gap-3 sm:gap-4',
  lg: 'gap-4 sm:gap-6',
  xl: 'gap-6 sm:gap-8',
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
}

export function ResponsiveGrid({
  children,
  className = '',
  cols = 1,
  mdCols = 2,
  lgCols = 3,
  gap = 'md',
}: ResponsiveGridProps) {
  return (
    <div
      className={`
        grid
        ${colClasses[cols]}
        md:${colClasses[mdCols]}
        lg:${colClasses[lgCols]}
        ${gapClasses[gap]}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}

/**
 * ResponsiveStack - A flexbox stack that can be horizontal or vertical based on screen size
 */
interface ResponsiveStackProps {
  children: ReactNode
  className?: string
  /** Direction on mobile */
  direction?: 'row' | 'col'
  /** Direction on tablet and up */
  mdDirection?: 'row' | 'col'
  /** Direction on desktop */
  lgDirection?: 'row' | 'col'
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** Vertical alignment */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Horizontal justification */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /** Whether to wrap items */
  wrap?: boolean
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

export function ResponsiveStack({
  children,
  className = '',
  direction = 'col',
  mdDirection,
  lgDirection,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
}: ResponsiveStackProps) {
  const getDirectionClasses = () => {
    const classes: string[] = []
    
    classes.push(direction === 'row' ? 'flex-row' : 'flex-col')
    
    if (mdDirection) {
      classes.push(`md:${mdDirection === 'row' ? 'flex-row' : 'flex-col'}`)
    }
    if (lgDirection) {
      classes.push(`lg:${lgDirection === 'row' ? 'flex-row' : 'flex-col'}`)
    }
    
    return classes.join(' ')
  }

  return (
    <div
      className={`
        flex
        ${getDirectionClasses()}
        ${gapClasses[gap]}
        ${alignClasses[align]}
        ${justifyClasses[justify]}
        ${wrap ? 'flex-wrap' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}

/**
 * MobileOnly - Only render children on mobile devices
 */
interface MobileOnlyProps {
  children: ReactNode
  className?: string
}

export function MobileOnly({ children, className = '' }: MobileOnlyProps) {
  return <div className={`lg:hidden ${className}`}>{children}</div>
}

/**
 * DesktopOnly - Only render children on desktop devices
 */
interface DesktopOnlyProps {
  children: ReactNode
  className?: string
}

export function DesktopOnly({ children, className = '' }: DesktopOnlyProps) {
  return <div className={`hidden lg:block ${className}`}>{children}</div>
}

/**
 * TabletAndUp - Only render children on tablet and larger screens
 */
interface TabletAndUpProps {
  children: ReactNode
  className?: string
}

export function TabletAndUp({ children, className = '' }: TabletAndUpProps) {
  return <div className={`hidden md:block ${className}`}>{children}</div>
}

/**
 * TouchTarget - Ensures minimum 44x44px touch target for accessibility
 */
interface TouchTargetProps {
  children: ReactNode
  className?: string
  /** Size of the touch target (minimum 44px) */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the element is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
}

const touchTargetSizes = {
  sm: 'min-w-[44px] min-h-[44px]',
  md: 'min-w-[48px] min-h-[48px]',
  lg: 'min-w-[56px] min-h-[56px]',
}

export function TouchTarget({
  children,
  className = '',
  size = 'md',
  disabled = false,
  onClick,
}: TouchTargetProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${touchTargetSizes[size]}
        flex items-center justify-center
        rounded-lg
        transition-all duration-200
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
    >
      {children}
    </button>
  )
}

export default ResponsiveContainer
