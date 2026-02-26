/**
 * Performance monitoring utilities for Agora Web App
 * Tracks Web Vitals and custom performance metrics
 */

// Type definitions for performance metrics
export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  entries: PerformanceEntry[]
}

type MetricHandler = (metric: PerformanceMetric) => void

// Thresholds based on Core Web Vitals
const THRESHOLDS = {
  // Largest Contentful Paint
  LCP: { good: 2500, poor: 4000 },
  // First Input Delay
  FID: { good: 100, poor: 300 },
  // Cumulative Layout Shift
  CLS: { good: 0.1, poor: 0.25 },
  // First Contentful Paint
  FCP: { good: 1800, poor: 3000 },
  // Time to First Byte
  TTFB: { good: 800, poor: 1800 },
  // Interaction to Next Paint (new metric)
  INP: { good: 200, poor: 500 },
}

// Store handlers
const metricHandlers: Set<MetricHandler> = new Set()

/**
 * Get rating based on value and thresholds
 */
function getRating(
  value: number,
  thresholds: { good: number; poor: number }
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Subscribe to performance metrics
 */
export function onPerformanceMetric(handler: MetricHandler): () => void {
  metricHandlers.add(handler)
  return () => metricHandlers.delete(handler)
}

/**
 * Report metric to all handlers
 */
function reportMetric(metric: PerformanceMetric): void {
  metricHandlers.forEach((handler) => {
    try {
      handler(metric)
    } catch (e) {
      console.error('Error in performance metric handler:', e)
    }
  })

  // Also log to console in development
  if (import.meta.env.DEV) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
    console.log(`[Performance] ${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`)
  }

  // Send to analytics in production
  if (import.meta.env.PROD && 'gtag' in window) {
    const gtag = (window as any).gtag
    gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value),
      custom_parameter_1: metric.rating,
    })
  }
}

/**
 * Observe Largest Contentful Paint (LCP)
 */
function observeLCP(): void {
  if (!('PerformanceObserver' in window)) return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
    
    if (lastEntry) {
      const value = lastEntry.startTime
      reportMetric({
        name: 'LCP',
        value,
        rating: getRating(value, THRESHOLDS.LCP),
        entries,
      })
    }
  })

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] as any })
  } catch (e) {
    // Fallback for browsers that don't support LCP
  }
}

/**
 * Observe First Input Delay (FID)
 */
function observeFID(): void {
  if (!('PerformanceObserver' in window)) return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    
    entries.forEach((entry) => {
      const firstEntry = entry as PerformanceEntry & { processingStart: number; startTime: number }
      const value = firstEntry.processingStart - firstEntry.startTime
      
      reportMetric({
        name: 'FID',
        value,
        rating: getRating(value, THRESHOLDS.FID),
        entries: [entry],
      })
    })
  })

  try {
    observer.observe({ entryTypes: ['first-input'] as any })
  } catch (e) {
    // Fallback for browsers that don't support FID
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 */
function observeCLS(): void {
  if (!('PerformanceObserver' in window)) return

  let clsValue = 0
  let sessionEntries: PerformanceEntry[] = []

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries() as PerformanceEntry[]
    
    entries.forEach((entry) => {
      const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
      
      // Only count layout shifts without recent user input
      if (!layoutShift.hadRecentInput) {
        clsValue += layoutShift.value
        sessionEntries.push(entry)
      }
    })
  })

  try {
    observer.observe({ entryTypes: ['layout-shift'] as any })

    // Report CLS on page visibility change (as per spec)
    const reportCLS = () => {
      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating(clsValue, THRESHOLDS.CLS),
        entries: sessionEntries,
      })
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS()
      }
    })

    // Also report on page unload
    window.addEventListener('pagehide', reportCLS)
  } catch (e) {
    // Fallback for browsers that don't support CLS
  }
}

/**
 * Observe First Contentful Paint (FCP)
 */
function observeFCP(): void {
  if (!('PerformanceObserver' in window)) return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const firstEntry = entries[0] as PerformanceEntry & { startTime: number }
    
    if (firstEntry) {
      const value = firstEntry.startTime
      reportMetric({
        name: 'FCP',
        value,
        rating: getRating(value, THRESHOLDS.FCP),
        entries,
      })
    }
  })

  try {
    observer.observe({ entryTypes: ['paint'] as any })
  } catch (e) {
    // Fallback for browsers that don't support paint timing
  }
}

/**
 * Measure Time to First Byte (TTFB)
 */
function measureTTFB(): void {
  if (!('performance' in window)) return

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  
  if (navigation) {
    const value = navigation.responseStart - navigation.startTime
    reportMetric({
      name: 'TTFB',
      value,
      rating: getRating(value, THRESHOLDS.TTFB),
      entries: [navigation],
    })
  }
}

/**
 * Observe Interaction to Next Paint (INP) - newer metric
 */
function observeINP(): void {
  if (!('PerformanceObserver' in window)) return

  let maxDuration = 0
  const entries: PerformanceEntry[] = []

  const observer = new PerformanceObserver((list) => {
    const newEntries = list.getEntries() as PerformanceEntry[]
    
    newEntries.forEach((entry) => {
      const eventEntry = entry as PerformanceEntry & { duration: number }
      if (eventEntry.duration > maxDuration) {
        maxDuration = eventEntry.duration
      }
      entries.push(entry)
    })
  })

  try {
    observer.observe({ entryTypes: ['event'] as any })

    // Report INP on page visibility change
    const reportINP = () => {
      reportMetric({
        name: 'INP',
        value: maxDuration,
        rating: getRating(maxDuration, THRESHOLDS.INP),
        entries,
      })
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportINP()
      }
    })
  } catch (e) {
    // Fallback for browsers that don't support event timing
  }
}

/**
 * Measure custom application metrics
 */
export function measureCustomMetric(name: string, value: number): void {
  reportMetric({
    name: `custom_${name}`,
    value,
    rating: 'good',
    entries: [],
  })
}

/**
 * Mark a performance milestone
 */
export function mark(name: string): void {
  if ('performance' in window) {
    performance.mark(name)
  }
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark: string): void {
  if ('performance' in window) {
    try {
      performance.measure(name, startMark, endMark)
      const entries = performance.getEntriesByName(name)
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { duration: number }
      
      if (lastEntry) {
        measureCustomMetric(name, lastEntry.duration)
      }
    } catch (e) {
      // Ignore measurement errors
    }
  }
}

/**
 * Get all performance entries for debugging
 */
export function getPerformanceEntries(): PerformanceEntryList {
  if (!('performance' in window)) return []
  return performance.getEntries()
}

/**
 * Clear all performance marks and measures
 */
export function clearPerformanceMetrics(): void {
  if ('performance' in window) {
    performance.clearMarks()
    performance.clearMeasures()
  }
}

/**
 * Initialize all performance observers
 */
export function initPerformanceMonitoring(): void {
  // Use requestIdleCallback to avoid blocking main thread
  const schedule = (window as any).requestIdleCallback || setTimeout

  schedule(() => {
    observeLCP()
    observeFID()
    observeCLS()
    observeFCP()
    observeINP()
    measureTTFB()

    // Mark initialization complete
    mark('app_initialized')
  })
}

/**
 * Utility to measure component render time
 */
export function measureRenderTime(componentName: string): () => void {
  const startMark = `${componentName}_render_start`
  const endMark = `${componentName}_render_end`
  
  mark(startMark)
  
  return () => {
    mark(endMark)
    measure(`${componentName}_render_time`, startMark, endMark)
  }
}

/**
 * Hook-compatible performance tracking
 * Usage: const endTracking = trackRender('MyComponent')
 *        useEffect(() => { endTracking() }, [])
 */
export function trackRender(componentName: string): () => void {
  return measureRenderTime(componentName)
}

// Export thresholds for reference
export { THRESHOLDS }

// Default export for convenience
export default {
  init: initPerformanceMonitoring,
  onMetric: onPerformanceMetric,
  mark,
  measure,
  measureCustomMetric,
  trackRender,
  getEntries: getPerformanceEntries,
  clear: clearPerformanceMetrics,
}