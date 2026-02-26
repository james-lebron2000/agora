/**
 * TouchFeedback - Provides visual feedback for touch interactions on mobile devices
 * Optimizes touch areas to meet minimum 44x44px accessibility requirements
 */
import { useState, useCallback, useRef } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useMobile } from '../hooks/useMobile'

interface TouchFeedbackProps {
  children: ReactNode
  className?: string
  /** Type of feedback effect */
  effect?: 'scale' | 'ripple' | 'opacity' | 'none'
  /** Minimum touch target size (44px default for accessibility) */
  minSize?: number
  /** Scale factor when pressed (for scale effect) */
  scale?: number
  /** Whether to show visual feedback on touch */
  feedback?: boolean
  /** Custom styles */
  style?: CSSProperties
  /** Click handler */
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void
  /** Touch start handler */
  onTouchStart?: (e: React.TouchEvent) => void
  /** Touch end handler */
  onTouchEnd?: (e: React.TouchEvent) => void
  /** Mouse down handler */
  onMouseDown?: (e: React.MouseEvent) => void
  /** Mouse up handler */
  onMouseUp?: (e: React.MouseEvent) => void
  /** Disabled state */
  disabled?: boolean
  /** HTML element to render as */
  as?: 'div' | 'button' | 'span' | 'a'
  /** Href for anchor element */
  href?: string
}

interface RippleState {
  x: number
  y: number
  id: number
}

export function TouchFeedback({
  children,
  className = '',
  effect = 'scale',
  minSize = 44,
  scale = 0.96,
  feedback = true,
  style = {},
  onClick,
  onTouchStart,
  onTouchEnd,
  onMouseDown,
  onMouseUp,
  disabled = false,
  as: Component = 'div',
  href,
}: TouchFeedbackProps) {
  const { isTouch } = useMobile()
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<RippleState[]>([])
  const rippleIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const addRipple = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    const newRipple: RippleState = {
      x,
      y,
      id: rippleIdRef.current++,
    }
    
    setRipples(prev => [...prev, newRipple])
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 600)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    
    setIsPressed(true)
    
    if (effect === 'ripple' && feedback) {
      const touch = e.touches[0]
      addRipple(touch.clientX, touch.clientY)
    }
    
    onTouchStart?.(e)
  }, [disabled, effect, feedback, addRipple, onTouchStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    
    setIsPressed(false)
    onTouchEnd?.(e)
  }, [disabled, onTouchEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    
    setIsPressed(true)
    
    if (effect === 'ripple' && feedback && !isTouch) {
      addRipple(e.clientX, e.clientY)
    }
    
    onMouseDown?.(e)
  }, [disabled, effect, feedback, isTouch, addRipple, onMouseDown])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    
    setIsPressed(false)
    onMouseUp?.(e)
  }, [disabled, onMouseUp])

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    onClick?.(e)
  }, [disabled, onClick])

  const getEffectStyles = (): CSSProperties => {
    if (!feedback || disabled) return {}
    
    switch (effect) {
      case 'scale':
        return {
          transform: isPressed ? `scale(${scale})` : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }
      case 'opacity':
        return {
          opacity: isPressed ? 0.7 : 1,
          transition: 'opacity 0.15s ease-out',
        }
      default:
        return {}
    }
  }

  const baseClasses = `
    relative
    overflow-hidden
    select-none
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim()

  const containerStyle: CSSProperties = {
    minWidth: minSize,
    minHeight: minSize,
    ...getEffectStyles(),
    ...style,
  }

  const Element = Component === 'a' ? 'a' : Component
  const elementProps = Component === 'a' ? { href } : {}

  return (
    <Element
      ref={containerRef as any}
      className={baseClasses}
      style={containerStyle}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...elementProps}
    >
      {children}
      
      {/* Ripple Effects */}
      {effect === 'ripple' && ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            marginLeft: -5,
            marginTop: -5,
          }}
        />
      ))}
    </Element>
  )
}

/**
 * Swipeable - Component that supports swipe gestures
 */
interface SwipeableProps {
  children: ReactNode
  className?: string
  /** Threshold for swipe detection (px) */
  threshold?: number
  /** Callback when swiped left */
  onSwipeLeft?: () => void
  /** Callback when swiped right */
  onSwipeRight?: () => void
  /** Callback when swiped up */
  onSwipeUp?: () => void
  /** Callback when swiped down */
  onSwipeDown?: () => void
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean
}

export function Swipeable({
  children,
  className = '',
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  preventDefault = false,
}: SwipeableProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchEnd = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }
  }, [preventDefault])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return

    const distanceX = touchStart.current.x - touchEnd.current.x
    const distanceY = touchStart.current.y - touchEnd.current.y
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) >= threshold) {
        if (distanceX > 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (distanceX < 0 && onSwipeRight) {
          onSwipeRight()
        }
      }
    } else {
      if (Math.abs(distanceY) >= threshold) {
        if (distanceY > 0 && onSwipeUp) {
          onSwipeUp()
        } else if (distanceY < 0 && onSwipeDown) {
          onSwipeDown()
        }
      }
    }
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

/**
 * Pressable - A button-like component with proper touch feedback
 */
interface PressableProps {
  children: ReactNode
  className?: string
  /** Variant style */
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Full width button */
  fullWidth?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Click handler */
  onClick?: () => void
  /** Type attribute for button element */
  type?: 'button' | 'submit' | 'reset'
}

const variantClasses = {
  default: 'bg-agora-100 text-agora-900 hover:bg-agora-200 active:bg-agora-300',
  primary: 'bg-agora-900 text-white hover:bg-agora-800 active:bg-agora-700 shadow-lg shadow-agora-900/25',
  secondary: 'bg-white text-agora-900 border border-agora-200 hover:bg-agora-50 active:bg-agora-100',
  ghost: 'bg-transparent text-agora-700 hover:bg-agora-100 active:bg-agora-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-lg shadow-red-500/25',
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[40px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[56px]',
}

export function Pressable({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}: PressableProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleTouchStart = () => {
    if (!disabled && !loading) setIsPressed(true)
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`
        relative
        inline-flex items-center justify-center
        gap-2
        font-medium
        rounded-xl
        transition-all duration-150
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isPressed ? 'scale-[0.96]' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `.trim()}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}

export default TouchFeedback
