import { useState, useEffect, useCallback } from 'react';

export interface MobileState {
  /** Whether the device is mobile (< 1024px) */
  isMobile: boolean;
  /** Whether the device is a tablet (768px - 1024px) */
  isTablet: boolean;
  /** Whether the device is a phone (< 768px) */
  isPhone: boolean;
  /** Whether the device is in portrait orientation */
  isPortrait: boolean;
  /** Whether the device is in landscape orientation */
  isLandscape: boolean;
  /** Whether the device supports touch */
  isTouch: boolean;
  /** Whether the device is iOS */
  isIOS: boolean;
  /** Whether the device is Android */
  isAndroid: boolean;
  /** Whether the keyboard is open (estimated) */
  isKeyboardOpen: boolean;
  /** Safe area insets for notched devices */
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Whether standalone PWA mode */
  isStandalone: boolean;
  /** Whether the app can be installed as PWA */
  canInstall: boolean;
}

/**
 * Hook for detecting mobile device capabilities and state
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTouch, safeArea } = useMobile();
 *   
 *   return (
 *     <div style={{ paddingTop: safeArea.top }}>
 *       {isMobile ? <MobileView /> : <DesktopView />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(() => ({
    isMobile: window.innerWidth < 1024,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isPhone: window.innerWidth < 768,
    isPortrait: window.innerHeight > window.innerWidth,
    isLandscape: window.innerHeight <= window.innerWidth,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isAndroid: /Android/.test(navigator.userAgent),
    isKeyboardOpen: false,
    safeArea: {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0'),
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true,
    canInstall: false,
  }));

  useEffect(() => {
    let keyboardOpen = false;
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const visualHeight = window.visualViewport?.height || height;
      
      // Detect keyboard open (visual viewport is significantly smaller)
      const heightDiff = initialViewportHeight - visualHeight;
      const newKeyboardOpen = heightDiff > 150 && width < 1024;
      
      if (newKeyboardOpen !== keyboardOpen) {
        keyboardOpen = newKeyboardOpen;
      }

      setState(prev => ({
        ...prev,
        isMobile: width < 1024,
        isTablet: width >= 768 && width < 1024,
        isPhone: width < 768,
        isPortrait: height > width,
        isLandscape: height <= width,
        isKeyboardOpen: keyboardOpen,
        viewport: { width, height: visualHeight },
      }));
    };

    const handleOrientationChange = () => {
      setTimeout(handleResize, 100); // Delay for orientation change animation
    };

    // Check PWA installability
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Update safe area insets from CSS variables
    const updateSafeArea = () => {
      const root = document.documentElement;
      setState(prev => ({
        ...prev,
        safeArea: {
          top: parseInt(getComputedStyle(root).getPropertyValue('--sat') || '0'),
          bottom: parseInt(getComputedStyle(root).getPropertyValue('--sab') || '0'),
          left: parseInt(getComputedStyle(root).getPropertyValue('--sal') || '0'),
          right: parseInt(getComputedStyle(root).getPropertyValue('--sar') || '0'),
        },
      }));
    };

    // Listen for safe area changes
    const safeAreaObserver = new MutationObserver(updateSafeArea);
    safeAreaObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      safeAreaObserver.disconnect();
    };
  }, []);

  return state;
}

/**
 * Hook for handling pull-to-refresh gesture
 * 
 * @example
 * ```tsx
 * function PullableList() {
 *   const { isPulling, pullDistance, containerRef } = usePullToRefresh(() => {
 *     return fetchNewData();
 *   });
 *   
 *   return (
 *     <div ref={containerRef}>
 *       <RefreshIndicator progress={pullDistance / 80} />
 *       <List />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; maxDistance?: number; disabled?: boolean } = {}
) {
  const { threshold = 80, maxDistance = 150, disabled = false } = options;
  
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);

  const containerRef = useCallback((node: HTMLElement | null) => {
    if (!node || disabled) return;

    const isAtTop = () => {
      return window.scrollY <= 0 || node.scrollTop <= 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      
      const touch = e.touches[0];
      setStartY(touch.clientY);
      setStartX(touch.clientX);
      setIsScrollingDown(false);
      
      if (isAtTop()) {
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = Math.abs(touch.clientX - startX);

      // Prevent pull-to-refresh if horizontal scrolling
      if (deltaX > Math.abs(deltaY)) return;

      // Only allow pulling when at top and pulling down
      if (deltaY > 0 && isAtTop()) {
        // Calculate resistance for natural feel
        const resistance = 0.5;
        const newDistance = Math.min(deltaY * resistance, maxDistance);
        setPullDistance(newDistance);
        setIsScrollingDown(true);
        
        // Prevent default only if we're actually pulling
        if (newDistance > 5) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      setPullDistance(0);
      setIsScrollingDown(false);
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, maxDistance, disabled, isRefreshing, isPulling, onRefresh, pullDistance, startX, startY]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    canRefresh: pullDistance >= threshold,
  };
}

/**
 * Hook for managing swipe gestures
 */
export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = threshold;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) >= minSwipeDistance) {
        if (distanceX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (distanceX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    } else {
      if (Math.abs(distanceY) >= minSwipeDistance) {
        if (distanceY > 0 && onSwipeUp) {
          onSwipeUp();
        } else if (distanceY < 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, minSwipeDistance]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Hook for handling bottom sheet / drawer behavior
 */
export function useBottomSheet(
  options: { snapPoints?: number[]; initialSnap?: number } = {}
) {
  const { snapPoints = [0.25, 0.5, 0.85], initialSnap = 0 } = options;
  
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const snapTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, snapPoints.length - 1));
    setCurrentSnap(clampedIndex);
    setTranslateY(0);
  }, [snapPoints.length]);

  const close = useCallback(() => {
    snapTo(-1);
  }, [snapTo]);

  const open = useCallback(() => {
    snapTo(initialSnap);
  }, [snapTo, initialSnap]);

  return {
    currentSnap,
    snapTo,
    close,
    open,
    isOpen: currentSnap >= 0,
    snapPoints,
    isDragging,
    setIsDragging,
    translateY,
    setTranslateY,
  };
}

export default useMobile;
