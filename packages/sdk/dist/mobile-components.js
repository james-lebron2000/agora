import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Agora Mobile UI Components
 *
 * Provides React components optimized for mobile devices with 60fps animations
 * and touch-friendly interactions.
 *
 * @module mobile-components
 * @version 1.0.0
 */
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
// ============================================================================
// MobileContainer Component
// ============================================================================
/**
 * Mobile-optimized container with safe area support and bounce prevention
 */
export const MobileContainer = ({ children, safeArea = true, fullscreen = false, preventBounce = true, className = '', style = {}, }) => {
    const containerRef = useRef(null);
    useEffect(() => {
        if (!preventBounce || !containerRef.current)
            return;
        const container = containerRef.current;
        const handleTouchMove = (e) => {
            const target = e.target;
            const scrollable = target.closest('[data-scrollable="true"]');
            if (!scrollable) {
                e.preventDefault();
                return;
            }
            const atTop = scrollable.scrollTop <= 0;
            const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight;
            const scrollingUp = e.touches[0].clientY > e.touchStartY;
            const scrollingDown = e.touches[0].clientY < e.touchStartY;
            if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
                e.preventDefault();
            }
        };
        const handleTouchStart = (e) => {
            e.touchStartY = e.touches[0].clientY;
        };
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
        };
    }, [preventBounce]);
    const containerStyle = useMemo(() => ({
        position: fullscreen ? 'fixed' : 'relative',
        top: fullscreen ? 0 : undefined,
        left: fullscreen ? 0 : undefined,
        right: fullscreen ? 0 : undefined,
        bottom: fullscreen ? 0 : undefined,
        width: fullscreen ? '100vw' : '100%',
        height: fullscreen ? '100vh' : '100%',
        paddingTop: safeArea ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: safeArea ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: safeArea ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: safeArea ? 'env(safe-area-inset-right)' : undefined,
        overflow: preventBounce ? 'hidden' : 'auto',
        WebkitOverflowScrolling: 'touch',
        ...style,
    }), [fullscreen, safeArea, preventBounce, style]);
    return (_jsx("div", { ref: containerRef, className: `mobile-container ${className}`, style: containerStyle, children: children }));
};
// ============================================================================
// PullToRefresh Component
// ============================================================================
/**
 * Pull-to-refresh component with smooth animations
 */
export const PullToRefresh = ({ onRefresh, children, threshold = 80, maxPullDistance = 120, spinnerSize = 24, spinnerColor = '#007AFF', backgroundColor = '#f5f5f5', disabled = false, }) => {
    const containerRef = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startYRef = useRef(0);
    const currentYRef = useRef(0);
    const isDraggingRef = useRef(false);
    const isRefreshingRef = useRef(false);
    const animationRef = useRef(null);
    const animateToPosition = useCallback((target, duration = 200) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        const start = pullDistance;
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeOut;
            setPullDistance(current);
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };
        animationRef.current = requestAnimationFrame(animate);
    }, [pullDistance]);
    useEffect(() => {
        if (disabled || !containerRef.current)
            return;
        const container = containerRef.current;
        const scrollable = container.querySelector('[data-scrollable="true"]') || container;
        const handleTouchStart = (e) => {
            if (isRefreshingRef.current)
                return;
            const scrollTop = scrollable.scrollTop;
            if (scrollTop > 0)
                return;
            startYRef.current = e.touches[0].clientY;
            isDraggingRef.current = true;
        };
        const handleTouchMove = (e) => {
            if (!isDraggingRef.current || isRefreshingRef.current)
                return;
            currentYRef.current = e.touches[0].clientY;
            const delta = currentYRef.current - startYRef.current;
            if (delta > 0) {
                e.preventDefault();
                const resistance = 0.5;
                const newDistance = Math.min(delta * resistance, maxPullDistance);
                setPullDistance(newDistance);
            }
        };
        const handleTouchEnd = async () => {
            if (!isDraggingRef.current)
                return;
            isDraggingRef.current = false;
            if (pullDistance >= threshold && !isRefreshingRef.current) {
                isRefreshingRef.current = true;
                setRefreshing(true);
                animateToPosition(threshold * 0.8);
                try {
                    await onRefresh();
                }
                finally {
                    setRefreshing(false);
                    isRefreshingRef.current = false;
                    animateToPosition(0, 300);
                }
            }
            else {
                animateToPosition(0);
            }
        };
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [disabled, threshold, maxPullDistance, onRefresh, pullDistance, animateToPosition]);
    const spinnerRotation = Math.min((pullDistance / threshold) * 360, 360);
    const opacity = Math.min(pullDistance / (threshold * 0.5), 1);
    return (_jsxs("div", { ref: containerRef, style: { position: 'relative', overflow: 'hidden' }, children: [_jsx("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: pullDistance,
                    backgroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity,
                    transition: isDraggingRef.current ? 'none' : 'height 0.2s ease-out',
                    zIndex: 1,
                }, children: _jsx("div", { style: {
                        width: spinnerSize,
                        height: spinnerSize,
                        border: `2px solid ${spinnerColor}30`,
                        borderTopColor: spinnerColor,
                        borderRadius: '50%',
                        transform: `rotate(${refreshing ? '360deg' : `${spinnerRotation}deg`})`,
                        transition: refreshing ? 'transform 0.8s linear infinite' : 'none',
                    } }) }), _jsx("div", { style: {
                    transform: `translateY(${pullDistance}px)`,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
                    minHeight: '100%',
                }, children: children })] }));
};
// ============================================================================
// SwipeableList Component
// ============================================================================
/**
 * Swipeable list item with left/right actions
 */
const SwipeableListItem = ({ item, renderItem, renderLeftAction, renderRightAction, onSwipeLeft, onSwipeRight, leftThreshold = 80, rightThreshold = 80, friction = 0.8, }) => {
    const itemRef = useRef(null);
    const [translateX, setTranslateX] = useState(0);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);
    const isDraggingRef = useRef(false);
    const velocityRef = useRef(0);
    const lastXRef = useRef(0);
    const lastTimeRef = useRef(0);
    const animationRef = useRef(null);
    const animateToPosition = useCallback((target, duration = 200) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        const start = translateX;
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeOut;
            setTranslateX(current);
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };
        animationRef.current = requestAnimationFrame(animate);
    }, [translateX]);
    const handleTouchStart = useCallback((e) => {
        startXRef.current = e.touches[0].clientX;
        currentXRef.current = translateX;
        lastXRef.current = e.touches[0].clientX;
        lastTimeRef.current = performance.now();
        isDraggingRef.current = true;
        velocityRef.current = 0;
    }, [translateX]);
    const handleTouchMove = useCallback((e) => {
        if (!isDraggingRef.current)
            return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startXRef.current;
        // Calculate velocity
        const now = performance.now();
        const dt = now - lastTimeRef.current;
        if (dt > 0) {
            velocityRef.current = (touch.clientX - lastXRef.current) / dt;
        }
        lastXRef.current = touch.clientX;
        lastTimeRef.current = now;
        // Apply resistance
        let newTranslateX = currentXRef.current + deltaX * friction;
        // Limit the swipe distance
        const maxLeft = renderRightAction ? rightThreshold * 1.5 : 0;
        const maxRight = renderLeftAction ? -leftThreshold * 1.5 : 0;
        newTranslateX = Math.max(maxRight, Math.min(maxLeft, newTranslateX));
        setTranslateX(newTranslateX);
    }, [friction, renderLeftAction, renderRightAction, leftThreshold, rightThreshold]);
    const handleTouchEnd = useCallback(() => {
        if (!isDraggingRef.current)
            return;
        isDraggingRef.current = false;
        const velocity = velocityRef.current;
        const shouldSnapOpen = Math.abs(translateX) > Math.min(leftThreshold, rightThreshold) * 0.5;
        const shouldFling = Math.abs(velocity) > 0.5;
        let target = 0;
        if (shouldSnapOpen || shouldFling) {
            if (translateX > 0 && renderRightAction) {
                target = rightThreshold;
                if (shouldFling && velocity > 0) {
                    onSwipeRight?.(item);
                }
            }
            else if (translateX < 0 && renderLeftAction) {
                target = -leftThreshold;
                if (shouldFling && velocity < 0) {
                    onSwipeLeft?.(item);
                }
            }
        }
        animateToPosition(target);
    }, [translateX, leftThreshold, rightThreshold, renderLeftAction, renderRightAction, onSwipeLeft, onSwipeRight, item, animateToPosition]);
    return (_jsxs("div", { style: { position: 'relative', overflow: 'hidden' }, children: [_jsxs("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: translateX > 0 ? 'flex-end' : 'flex-start',
                    backgroundColor: translateX > 0 ? '#34C759' : '#FF3B30',
                }, children: [translateX > 0 && renderRightAction && (_jsx("div", { style: { width: rightThreshold, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: renderRightAction(item) })), translateX < 0 && renderLeftAction && (_jsx("div", { style: { width: leftThreshold, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: renderLeftAction(item) }))] }), _jsx("div", { ref: itemRef, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, style: {
                    transform: `translateX(${translateX}px)`,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
                    backgroundColor: 'white',
                    position: 'relative',
                    zIndex: 1,
                }, children: renderItem(item) })] }));
};
/**
 * Swipeable list component
 */
export function SwipeableList({ items, onSwipeLeft, onSwipeRight, renderItem, renderLeftAction, renderRightAction, leftThreshold = 80, rightThreshold = 80, overshootLeft = false, overshootRight = false, friction = 0.8, className = '', }) {
    return (_jsx("div", { className: `swipeable-list ${className}`, style: { overflow: 'hidden' }, children: items.map((item) => (_jsx(SwipeableListItem, { item: item, renderItem: renderItem, renderLeftAction: renderLeftAction, renderRightAction: renderRightAction, onSwipeLeft: onSwipeLeft, onSwipeRight: onSwipeRight, leftThreshold: leftThreshold, rightThreshold: rightThreshold, friction: friction }, item.id))) }));
}
// ============================================================================
// MobileBottomSheet Component
// ============================================================================
/**
 * Mobile bottom sheet with snap points and drag-to-dismiss
 */
export const MobileBottomSheet = ({ isOpen, onClose, children, snapPoints = [25, 50, 85], initialSnap = 0, backdrop = true, backdropOpacity = 0.5, enableDrag = true, onSnapChange, className = '', }) => {
    const sheetRef = useRef(null);
    const [currentSnap, setCurrentSnap] = useState(initialSnap);
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const startTranslateYRef = useRef(0);
    const animationRef = useRef(null);
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    const snapValues = useMemo(() => snapPoints.map(point => windowHeight * (1 - point / 100)), [snapPoints, windowHeight]);
    const animateToSnap = useCallback((snapIndex, duration = 300) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        const target = snapValues[snapIndex];
        const start = translateY;
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeOut;
            setTranslateY(current);
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
            else {
                setCurrentSnap(snapIndex);
                onSnapChange?.(snapIndex);
            }
        };
        animationRef.current = requestAnimationFrame(animate);
    }, [snapValues, translateY, onSnapChange]);
    useEffect(() => {
        if (isOpen) {
            animateToSnap(initialSnap, 300);
        }
        else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            setTranslateY(windowHeight);
        }
    }, [isOpen, initialSnap, windowHeight, animateToSnap]);
    const handleTouchStart = useCallback((e) => {
        if (!enableDrag)
            return;
        startYRef.current = e.touches[0].clientY;
        startTranslateYRef.current = translateY;
        setIsDragging(true);
    }, [enableDrag, translateY]);
    const handleTouchMove = useCallback((e) => {
        if (!isDragging)
            return;
        const deltaY = e.touches[0].clientY - startYRef.current;
        const newTranslateY = Math.max(0, startTranslateYRef.current + deltaY);
        setTranslateY(newTranslateY);
    }, [isDragging]);
    const handleTouchEnd = useCallback(() => {
        if (!isDragging)
            return;
        setIsDragging(false);
        const currentPosition = translateY;
        const threshold = windowHeight * 0.15;
        // Check if should close
        if (currentPosition > snapValues[0] + threshold) {
            onClose();
            return;
        }
        // Find nearest snap point
        let nearestSnap = 0;
        let minDistance = Math.abs(currentPosition - snapValues[0]);
        for (let i = 1; i < snapValues.length; i++) {
            const distance = Math.abs(currentPosition - snapValues[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestSnap = i;
            }
        }
        animateToSnap(nearestSnap);
    }, [isDragging, translateY, snapValues, windowHeight, onClose, animateToSnap]);
    if (!isOpen && translateY >= windowHeight) {
        return null;
    }
    const backdropStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 999,
    };
    const sheetStyle = {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: windowHeight,
        backgroundColor: 'white',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom)',
    };
    const handleStyle = {
        width: '100%',
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: enableDrag ? 'grab' : 'default',
    };
    const handleBarStyle = {
        width: 36,
        height: 4,
        backgroundColor: '#D1D1D6',
        borderRadius: 2,
    };
    return (_jsxs(_Fragment, { children: [backdrop && (_jsx("div", { style: backdropStyle, onClick: onClose })), _jsxs("div", { ref: sheetRef, className: `mobile-bottom-sheet ${className}`, style: sheetStyle, children: [_jsx("div", { style: handleStyle, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, children: _jsx("div", { style: handleBarStyle }) }), _jsx("div", { style: { flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }, children: children })] })] }));
};
// ============================================================================
// FloatingActionButton Component
// ============================================================================
/**
 * Floating action button with expandable action menu
 */
export const FloatingActionButton = ({ actions, position = 'bottom-right', mainIcon = '+', closeIcon = '×', mainColor = '#007AFF', size = 56, offset = 24, className = '', }) => {
    const [isOpen, setIsOpen] = useState(false);
    const animationRef = useRef(null);
    const toggleOpen = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);
    const handleActionClick = useCallback((action) => {
        if (!action.disabled) {
            action.onClick();
            setIsOpen(false);
        }
    }, []);
    const containerStyle = {
        position: 'fixed',
        [position === 'bottom-right' ? 'right' : 'left']: offset,
        bottom: `calc(${offset}px + env(safe-area-inset-bottom))`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position === 'bottom-right' ? 'flex-end' : 'flex-start',
        gap: 12,
        zIndex: 1000,
    };
    const mainButtonStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: mainColor,
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        cursor: 'pointer',
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        WebkitTapHighlightColor: 'transparent',
    };
    return (_jsxs("div", { className: `fab-container ${className}`, style: containerStyle, children: [isOpen && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: actions.map((action, index) => {
                    const delay = index * 50;
                    return (_jsxs("button", { onClick: () => handleActionClick(action), disabled: action.disabled, style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            backgroundColor: action.color || '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: 24,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            cursor: action.disabled ? 'not-allowed' : 'pointer',
                            opacity: action.disabled ? 0.5 : 1,
                            animation: `fabSlideIn 0.3s ease-out ${delay}ms both`,
                            WebkitTapHighlightColor: 'transparent',
                        }, children: [_jsx("span", { style: { fontSize: 20 }, children: action.icon }), action.label && (_jsx("span", { style: { fontSize: 14, whiteSpace: 'nowrap' }, children: action.label }))] }, action.id));
                }) })), _jsx("button", { onClick: toggleOpen, style: mainButtonStyle, "aria-label": isOpen ? 'Close actions' : 'Open actions', children: isOpen ? closeIcon : mainIcon }), _jsx("style", { children: `
        @keyframes fabSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      ` })] }));
};
// ============================================================================
// Utility Hooks
// ============================================================================
/**
 * Hook to get window dimensions
 */
export function useWindowSize() {
    const [size, setSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });
    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);
    return size;
}
/**
 * Hook to detect touch device
 */
export function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);
    return isTouch;
}
/**
 * Hook to lock body scroll when component is mounted
 */
export function useLockBodyScroll(locked) {
    useEffect(() => {
        if (!locked)
            return;
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [locked]);
}
export default {
    MobileContainer,
    PullToRefresh,
    SwipeableList,
    MobileBottomSheet,
    FloatingActionButton,
};
//# sourceMappingURL=mobile-components.js.map