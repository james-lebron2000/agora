/**
 * Responsive Design Utilities for Agora Web
 * 
 * Provides hooks and utilities for responsive design,
 * mobile-first approach, and breakpoint management.
 * Aligns with mobile app responsive strategies.
 * 
 * @module responsive
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Breakpoint Definitions
// ============================================================================

export const breakpoints = {
  /** Extra small devices (phones, 360px and up) */
  xs: 360,
  /** Small devices (large phones, 375px and up) */
  sm: 375,
  /** Medium devices (tablets, 768px and up) */
  md: 768,
  /** Large devices (desktops, 1024px and up) */
  lg: 1024,
  /** Extra large devices (large desktops, 1280px and up) */
  xl: 1280,
  /** Extra extra large devices (4K, 1536px and up) */
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ============================================================================
// Hook: useBreakpoint
// ============================================================================

export interface UseBreakpointResult {
  /** Current breakpoint */
  breakpoint: Breakpoint;
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
  /** Checks if current width is >= specified breakpoint */
  isAbove: (bp: Breakpoint) => boolean;
  /** Checks if current width is < specified breakpoint */
  isBelow: (bp: Breakpoint) => boolean;
  /** Checks if current width is between two breakpoints */
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
  /** Boolean flags for common breakpoints */
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
}

/**
 * Hook to track current breakpoint and responsive state
 * 
 * @example
 * ```tsx
 * const { isMobile, isTablet, breakpoint } = useBreakpoint();
 * 
 * return (
 *   <div className={isMobile ? 'p-4' : 'p-8'}>
 *     {isTablet && <TabletLayout />}
 *   </div>
 * );
 * ```
 */
export function useBreakpoint(): UseBreakpointResult {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    // Initial measurement
    handleResize();

    // Use ResizeObserver for more accurate measurements
    let resizeObserver: ResizeObserver | null = null;
    
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }, [width]);

  const isAbove = useCallback((bp: Breakpoint) => {
    return width >= breakpoints[bp];
  }, [width]);

  const isBelow = useCallback((bp: Breakpoint) => {
    return width < breakpoints[bp];
  }, [width]);

  const isBetween = useCallback((min: Breakpoint, max: Breakpoint) => {
    return width >= breakpoints[min] && width < breakpoints[max];
  }, [width]);

  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const isWide = width >= breakpoints.xl;

  return {
    breakpoint,
    width,
    height,
    isAbove,
    isBelow,
    isBetween,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
  };
}

// ============================================================================
// Hook: useMediaQuery
// ============================================================================

/**
 * Hook to match CSS media queries in JavaScript
 * 
 * @example
 * ```tsx
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    
    const updateMatch = () => setMatches(media.matches);
    updateMatch();

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } 
    // Legacy browsers
    else {
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

// ============================================================================
// Hook: useOrientation
// ============================================================================

export type Orientation = 'portrait' | 'landscape';

export interface UseOrientationResult {
  /** Current orientation */
  orientation: Orientation;
  /** Is portrait mode */
  isPortrait: boolean;
  /** Is landscape mode */
  isLandscape: boolean;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
}

/**
 * Hook to track screen orientation
 * 
 * @example
 * ```tsx
 * const { isLandscape, aspectRatio } = useOrientation();
 * 
 * return (
 *   <div className={isLandscape ? 'flex-row' : 'flex-col'}>
 *     <VideoPlayer aspectRatio={aspectRatio} />
 *   </div>
 * );
 * ```
 */
export function useOrientation(): UseOrientationResult {
  const { width, height } = useBreakpoint();
  
  const isPortrait = height >= width;
  const isLandscape = width > height;
  const orientation: Orientation = isPortrait ? 'portrait' : 'landscape';
  const aspectRatio = width / height;

  return { orientation, isPortrait, isLandscape, aspectRatio };
}

// ============================================================================
// Hook: useSafeArea
// ============================================================================

export interface SafeAreaInsets {
  /** Top safe area inset */
  top: number;
  /** Bottom safe area inset */
  bottom: number;
  /** Left safe area inset */
  left: number;
  /** Right safe area inset */
  right: number;
}

export interface UseSafeAreaResult extends SafeAreaInsets {
  /** CSS env() values */
  cssValues: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  /** Combined padding styles */
  paddingStyle: React.CSSProperties;
}

/**
 * Hook to get CSS safe area insets for notched devices
 * 
 * @example
 * ```tsx
 * const { top, bottom, paddingStyle } = useSafeArea();
 * 
 * return (
 *   <header style={{ paddingTop: top }}>
 *     Safe content
 *   </header>
 * );
 * ```
 */
export function useSafeArea(): UseSafeAreaResult {
  // Use CSS env() values for safe area
  const cssValues = {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  };

  // Parse pixel values (approximate for SSR compatibility)
  const parseValue = (value: string): number => {
    if (typeof window === 'undefined') return 0;
    
    // Try to get computed value
    const testDiv = document.createElement('div');
    testDiv.style.padding = value;
    document.body.appendChild(testDiv);
    const computed = window.getComputedStyle(testDiv);
    const px = parseInt(computed.paddingTop, 10) || 0;
    document.body.removeChild(testDiv);
    return px;
  };

  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateInsets = () => {
      setInsets({
        top: parseValue(cssValues.top),
        bottom: parseValue(cssValues.bottom),
        left: parseValue(cssValues.left),
        right: parseValue(cssValues.right),
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets, { passive: true });
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  const paddingStyle: React.CSSProperties = {
    paddingTop: cssValues.top,
    paddingBottom: cssValues.bottom,
    paddingLeft: cssValues.left,
    paddingRight: cssValues.right,
  };

  return {
    ...insets,
    cssValues,
    paddingStyle,
  };
}

// ============================================================================
// Hook: useTouchDevice
// ============================================================================

export interface UseTouchDeviceResult {
  /** Is touch device */
  isTouch: boolean;
  /** Has pointer events support */
  hasPointerEvents: boolean;
  /** Has hover capability */
  hasHover: boolean;
  /** Primary input type */
  primaryInput: 'touch' | 'mouse' | 'unknown';
}

/**
 * Hook to detect touch device capabilities
 * 
 * @example
 * ```tsx
 * const { isTouch, hasHover } = useTouchDevice();
 * 
 * return (
 *   <button className={isTouch ? 'p-4' : 'p-2'}>
 *     {hasHover ? 'Hover me' : 'Tap me'}
 *   </button>
 * );
 * ```
 */
export function useTouchDevice(): UseTouchDeviceResult {
  const [state, setState] = useState<UseTouchDeviceResult>({
    isTouch: false,
    hasPointerEvents: false,
    hasHover: true,
    primaryInput: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasPointerEvents = 'PointerEvent' in window;
      
      // Check hover capability via media query
      const hasHover = window.matchMedia('(hover: hover)').matches;
      
      // Determine primary input
      let primaryInput: 'touch' | 'mouse' | 'unknown' = 'unknown';
      if (isTouch && !hasHover) {
        primaryInput = 'touch';
      } else if (!isTouch && hasHover) {
        primaryInput = 'mouse';
      }

      setState({ isTouch, hasPointerEvents, hasHover, primaryInput });
    };

    detect();
  }, []);

  return state;
}

// ============================================================================
// Hook: useScrollDirection
// ============================================================================

export type ScrollDirection = 'up' | 'down' | 'none';

export interface UseScrollDirectionResult {
  /** Current scroll direction */
  direction: ScrollDirection;
  /** Is scrolling up */
  isScrollingUp: boolean;
  /** Is scrolling down */
  isScrollingDown: boolean;
  /** Current scroll Y position */
  scrollY: number;
  /** Previous scroll Y position */
  prevScrollY: number;
  /** Scroll threshold crossed */
  isPastThreshold: boolean;
}

/**
 * Hook to track scroll direction
 * Useful for auto-hiding headers/navigation
 * 
 * @example
 * ```tsx
 * const { isScrollingUp, isPastThreshold } = useScrollDirection(100);
 * 
 * return (
 *   <header className={isScrollingUp || !isPastThreshold ? 'translate-y-0' : '-translate-y-full'}>
 *     Navigation
 *   </header>
 * );
 * ```
 */
export function useScrollDirection(threshold = 50): UseScrollDirectionResult {
  const [scrollY, setScrollY] = useState(0);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const [direction, setDirection] = useState<ScrollDirection>('none');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const current = window.scrollY;
          setPrevScrollY(scrollY);
          setScrollY(current);
          
          if (current > scrollY) {
            setDirection('down');
          } else if (current < scrollY) {
            setDirection('up');
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollY]);

  const isScrollingUp = direction === 'up';
  const isScrollingDown = direction === 'down';
  const isPastThreshold = scrollY > threshold;

  return {
    direction,
    isScrollingUp,
    isScrollingDown,
    scrollY,
    prevScrollY,
    isPastThreshold,
  };
}

// ============================================================================
// Hook: useContainerQuery
// ============================================================================

export interface ContainerQueryResult {
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Current size class */
  sizeClass: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Hook to track container size (similar to container queries)
 * 
 * @example
 * ```tsx
 * const { ref, width, sizeClass } = useContainerQuery();
 * 
 * return (
 *   <div ref={ref} className={sizeClass === 'sm' ? 'grid-cols-1' : 'grid-cols-3'}>
 *     {children}
 *   </div>
 * );
 * ```
 */
export function useContainerQuery<T extends HTMLElement = HTMLDivElement>(): 
  ContainerQueryResult & { ref: React.RefObject<T> } {
  
  const ref = React.useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(element);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const sizeClass = useMemo(() => {
    if (size.width < 300) return 'xs';
    if (size.width < 500) return 'sm';
    if (size.width < 700) return 'md';
    return 'lg';
  }, [size.width]);

  return { ref, ...size, sizeClass };
}

// ============================================================================
// Utility: Responsive Value Selector
// ============================================================================

export type ResponsiveValue<T> = T | { [K in Breakpoint]?: T };

/**
 * Select value based on current breakpoint
 * 
 * @example
 * ```tsx
 * const padding = useResponsiveValue({ xs: 16, md: 24, lg: 32 });
 * // Returns 16 on mobile, 24 on tablet, 32 on desktop
 * ```
 */
export function useResponsiveValue<T>(value: ResponsiveValue<T>): T {
  const { breakpoint, isAbove } = useBreakpoint();

  return useMemo(() => {
    if (typeof value !== 'object' || value === null) {
      return value as T;
    }

    const breakpoints_order: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const valueMap = value as { [K in Breakpoint]?: T };

    // Find the best matching breakpoint
    for (const bp of breakpoints_order) {
      if (valueMap[bp] !== undefined && (bp === 'xs' || isAbove(bp))) {
        return valueMap[bp] as T;
      }
    }

    // Fallback to xs if nothing matches
    return (valueMap.xs ?? valueMap.sm ?? valueMap.md ?? valueMap.lg ?? valueMap.xl ?? valueMap['2xl']) as T;
  }, [value, breakpoint, isAbove]);
}

// ============================================================================
// Utility: CSS Class Builder
// ============================================================================

export interface ResponsiveClasses {
  /** Base classes */
  base?: string;
  /** xs breakpoint classes */
  xs?: string;
  /** sm breakpoint classes */
  sm?: string;
  /** md breakpoint classes */
  md?: string;
  /** lg breakpoint classes */
  lg?: string;
  /** xl breakpoint classes */
  xl?: string;
  /** 2xl breakpoint classes */
  '2xl'?: string;
}

/**
 * Build responsive class string
 * 
 * @example
 * ```tsx
 * const className = buildResponsiveClasses({
 *   base: 'p-4',
 *   md: 'p-6',
 *   lg: 'p-8'
 * });
 * // Returns 'p-4 md:p-6 lg:p-8'
 * ```
 */
export function buildResponsiveClasses(classes: ResponsiveClasses): string {
  const parts: string[] = [];

  if (classes.base) parts.push(classes.base);
  if (classes.xs) parts.push(classes.xs);
  if (classes.sm) parts.push(`sm:${classes.sm}`);
  if (classes.md) parts.push(`md:${classes.md}`);
  if (classes.lg) parts.push(`lg:${classes.lg}`);
  if (classes.xl) parts.push(`xl:${classes.xl}`);
  if (classes['2xl']) parts.push(`2xl:${classes['2xl']}`);

  return parts.join(' ');
}

// ============================================================================
// React Import for Container Query Hook
// ============================================================================

import * as React from 'react';

// ============================================================================
// Default Export
// ============================================================================

export default {
  useBreakpoint,
  useMediaQuery,
  useOrientation,
  useSafeArea,
  useTouchDevice,
  useScrollDirection,
  useContainerQuery,
  useResponsiveValue,
  buildResponsiveClasses,
  breakpoints,
};
