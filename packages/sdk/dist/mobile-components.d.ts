/**
 * Agora Mobile UI Components
 *
 * Provides React components optimized for mobile devices with 60fps animations
 * and touch-friendly interactions.
 *
 * @module mobile-components
 * @version 1.0.0
 */
import React from 'react';
/** Mobile container props */
export interface MobileContainerProps {
    children: React.ReactNode;
    safeArea?: boolean;
    fullscreen?: boolean;
    preventBounce?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
/** Pull to refresh props */
export interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    threshold?: number;
    maxPullDistance?: number;
    spinnerSize?: number;
    spinnerColor?: string;
    backgroundColor?: string;
    disabled?: boolean;
}
/** Swipeable item interface */
export interface SwipeableItem {
    id: string;
    [key: string]: any;
}
/** Swipeable list props */
export interface SwipeableListProps<T extends SwipeableItem> {
    items: T[];
    onSwipeLeft?: (item: T) => void;
    onSwipeRight?: (item: T) => void;
    renderItem: (item: T) => React.ReactNode;
    renderLeftAction?: (item: T) => React.ReactNode;
    renderRightAction?: (item: T) => React.ReactNode;
    leftThreshold?: number;
    rightThreshold?: number;
    overshootLeft?: boolean;
    overshootRight?: boolean;
    friction?: number;
    className?: string;
}
/** Mobile bottom sheet props */
export interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    snapPoints?: number[];
    initialSnap?: number;
    backdrop?: boolean;
    backdropOpacity?: number;
    enableDrag?: boolean;
    onSnapChange?: (index: number) => void;
    className?: string;
}
/** FAB action interface */
export interface FABAction {
    id: string;
    icon: React.ReactNode;
    label?: string;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
}
/** Floating action button props */
export interface FloatingActionButtonProps {
    actions: FABAction[];
    position?: 'bottom-right' | 'bottom-left';
    mainIcon?: React.ReactNode;
    closeIcon?: React.ReactNode;
    mainColor?: string;
    size?: number;
    offset?: number;
    className?: string;
}
/**
 * Mobile-optimized container with safe area support and bounce prevention
 */
export declare const MobileContainer: React.FC<MobileContainerProps>;
/**
 * Pull-to-refresh component with smooth animations
 */
export declare const PullToRefresh: React.FC<PullToRefreshProps>;
/**
 * Swipeable list component
 */
export declare function SwipeableList<T extends SwipeableItem>({ items, onSwipeLeft, onSwipeRight, renderItem, renderLeftAction, renderRightAction, leftThreshold, rightThreshold, overshootLeft, overshootRight, friction, className, }: SwipeableListProps<T>): React.ReactElement;
/**
 * Mobile bottom sheet with snap points and drag-to-dismiss
 */
export declare const MobileBottomSheet: React.FC<MobileBottomSheetProps>;
/**
 * Floating action button with expandable action menu
 */
export declare const FloatingActionButton: React.FC<FloatingActionButtonProps>;
/**
 * Hook to get window dimensions
 */
export declare function useWindowSize(): {
    width: number;
    height: number;
};
/**
 * Hook to detect touch device
 */
export declare function useIsTouchDevice(): boolean;
/**
 * Hook to lock body scroll when component is mounted
 */
export declare function useLockBodyScroll(locked: boolean): void;
declare const _default: {
    MobileContainer: React.FC<MobileContainerProps>;
    PullToRefresh: React.FC<PullToRefreshProps>;
    SwipeableList: typeof SwipeableList;
    MobileBottomSheet: React.FC<MobileBottomSheetProps>;
    FloatingActionButton: React.FC<FloatingActionButtonProps>;
};
export default _default;
//# sourceMappingURL=mobile-components.d.ts.map