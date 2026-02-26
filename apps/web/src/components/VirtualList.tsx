import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  overscan?: number
  className?: string
  containerHeight?: number | string
  onEndReached?: () => void
  endReachedThreshold?: number
  keyExtractor?: (item: T, index: number) => string
  emptyComponent?: React.ReactNode
  loadingComponent?: React.ReactNode
  isLoading?: boolean
}

interface WindowSize {
  width: number
  height: number
}

// ============================================================================
// useWindowSize Hook
// ============================================================================

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

// ============================================================================
// useIntersectionObserver Hook
// ============================================================================

function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback()
        }
      })
    }, options)

    observer.observe(target)
    return () => observer.disconnect()
  }, [callback, options])

  return targetRef
}

// ============================================================================
// VirtualList Component
// ============================================================================

/**
 * VirtualList Component
 * 
 * Efficiently renders large lists by only rendering visible items.
 * Features:
 * - Virtual scrolling (only renders visible items)
 * - Overscan for smooth scrolling
 * - Dynamic height support
 * - End reached detection for infinite scroll
 * - Smooth animations
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={largeArray}
 *   itemHeight={80}
 *   renderItem={(item, index) => <MyItem key={item.id} data={item} />}
 *   onEndReached={loadMore}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 3,
  className = '',
  containerHeight = '100vh',
  onEndReached,
  endReachedThreshold = 200,
  keyExtractor,
  emptyComponent,
  loadingComponent,
  isLoading = false,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeightValue, setContainerHeightValue] = useState(0)

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeightValue(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight, { passive: true })
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Calculate visible range
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeightValue / itemHeight) + overscan * 2
    const endIndex = Math.min(items.length, startIndex + visibleCount)

    const virtualItems = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      },
    }))

    return { virtualItems, totalHeight, startIndex, endIndex }
  }, [items, itemHeight, scrollTop, containerHeightValue, overscan])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // End reached detection
  useEffect(() => {
    if (!onEndReached) return

    const scrollBottom = scrollTop + containerHeightValue
    const threshold = totalHeight - endReachedThreshold

    if (scrollBottom >= threshold && endIndex >= items.length - 1) {
      onEndReached()
    }
  }, [scrollTop, containerHeightValue, totalHeight, endReachedThreshold, onEndReached, items.length, endIndex])

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <p>No items to display</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={style}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {isLoading && (
        <div className="py-4">
          {loadingComponent || (
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// VirtualGrid Component
// ============================================================================

interface VirtualGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  columnWidth: number
  rowHeight: number
  gap?: number
  overscan?: number
  className?: string
  containerHeight?: number | string
  keyExtractor?: (item: T, index: number) => string
  emptyComponent?: React.ReactNode
}

/**
 * VirtualGrid Component
 * 
 * Efficiently renders large grids by only rendering visible items.
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  columnWidth,
  rowHeight,
  gap = 16,
  overscan = 2,
  className = '',
  containerHeight = '100vh',
  keyExtractor,
  emptyComponent,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize, { passive: true })
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Calculate columns
  const columns = Math.max(1, Math.floor((containerSize.width + gap) / (columnWidth + gap)))
  const rows = Math.ceil(items.length / columns)

  // Calculate visible range
  const { virtualItems, totalHeight, totalWidth } = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - overscan)
    const visibleRows = Math.ceil(containerSize.height / (rowHeight + gap)) + overscan * 2
    const endRow = Math.min(rows, startRow + visibleRows)

    const startCol = Math.max(0, Math.floor(scrollLeft / (columnWidth + gap)) - overscan)
    const visibleCols = Math.ceil(containerSize.width / (columnWidth + gap)) + overscan * 2
    const endCol = Math.min(columns, startCol + visibleCols)

    const virtualItems: Array<{ item: T; index: number; style: React.CSSProperties }> = []

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const index = row * columns + col
        if (index >= items.length) continue

        virtualItems.push({
          item: items[index],
          index,
          style: {
            position: 'absolute' as const,
            top: row * (rowHeight + gap),
            left: col * (columnWidth + gap),
            width: columnWidth,
            height: rowHeight,
          },
        })
      }
    }

    return {
      virtualItems,
      totalHeight: rows * (rowHeight + gap) - gap,
      totalWidth: columns * (columnWidth + gap) - gap,
    }
  }, [items, columns, rows, columnWidth, rowHeight, gap, scrollTop, scrollLeft, containerSize, overscan])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    setScrollLeft(e.currentTarget.scrollLeft)
  }, [])

  // Empty state
  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <p>No items to display</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, width: totalWidth, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={style}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// OptimizedImage Component
// ============================================================================

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
  loading?: 'eager' | 'lazy'
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

/**
 * OptimizedImage Component
 * 
 * Performance-optimized image component with:
 * - Lazy loading
 * - Placeholder support
 * - Priority loading for above-fold images
 * - Error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div
        className={`bg-white/10 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-white/40 text-sm">Failed to load</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {!isLoaded && placeholder && (
        <div className="absolute inset-0">
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover blur-sm"
          />
        </div>
      )}
      {!isLoaded && !placeholder && (
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
      )}
      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        className="w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

// ============================================================================
// LazyComponent HOC
// ============================================================================

interface LazyComponentOptions {
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
}

/**
 * LazyComponent HOC
 * 
 * Wraps a component to lazy load it when it enters the viewport.
 * 
 * @example
 * ```tsx
 * const LazyHeavyComponent = LazyComponent(() => import('./HeavyComponent'), {
 *   fallback: <LoadingSpinner />
 * })
 * ```
 */
export function LazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const { fallback, threshold = 0, rootMargin = '100px' } = options

  return function LazyWrapper(props: React.ComponentProps<T>) {
    const [Component, setComponent] = useState<T | null>(null)
    const [shouldLoad, setShouldLoad] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!ref.current || shouldLoad) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setShouldLoad(true)
          }
        },
        { threshold, rootMargin }
      )

      observer.observe(ref.current)
      return () => observer.disconnect()
    }, [shouldLoad, threshold, rootMargin])

    useEffect(() => {
      if (!shouldLoad) return

      factory().then((module) => {
        setComponent(() => module.default)
      })
    }, [shouldLoad])

    if (!Component) {
      return (
        <div ref={ref}>
          {fallback || (
            <div className="flex items-center justify-center p-8">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )
    }

    return <Component {...props} />
  }
}

// ============================================================================
// Exports
// ============================================================================

export { useWindowSize, useIntersectionObserver }
export default VirtualList
