/**
 * React Components for Agora Agent Profile Module
 * @module profile-components
 */
import React from 'react';
import { AgentProfile, Achievement, ProfileStats } from './profile.js';
export declare const breakpoints: {
    readonly xs: 0;
    readonly sm: 640;
    readonly md: 768;
    readonly lg: 1024;
    readonly xl: 1280;
    readonly '2xl': 1536;
};
export type Breakpoint = keyof typeof breakpoints;
export declare function useResponsive(): {
    breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    width: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLarge: boolean;
};
export type ThemeMode = 'light' | 'dark' | 'system';
export interface ThemeColors {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    borderLight: string;
}
export interface Theme {
    mode: Exclude<ThemeMode, 'system'>;
    colors: ThemeColors;
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
    };
    borderRadius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        full: string;
    };
    typography: {
        fontFamily: string;
        fontFamilyMono: string;
        sizes: {
            xs: string;
            sm: string;
            base: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
            '4xl': string;
            '5xl': string;
        };
        weights: {
            light: number;
            normal: number;
            medium: number;
            semibold: number;
            bold: number;
        };
        lineHeights: {
            none: number;
            tight: number;
            snug: number;
            normal: number;
            relaxed: number;
            loose: number;
        };
    };
    shadows: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        inner: string;
    };
    transitions: {
        fast: string;
        normal: string;
        slow: string;
    };
    zIndices: {
        hide: number;
        auto: string;
        base: number;
        docked: number;
        dropdown: number;
        sticky: number;
        banner: number;
        overlay: number;
        modal: number;
        popover: number;
        skipLink: number;
        toast: number;
        tooltip: number;
    };
}
export declare const lightTheme: Theme;
export declare const darkTheme: Theme;
export interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme | ThemeMode) => void;
    toggleTheme: () => void;
    systemPrefersDark: boolean;
}
export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: ThemeMode;
    enableSystem?: boolean;
    storageKey?: string;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => ThemeContextValue;
export declare function formatNumber(num: number, decimals?: number): string;
export declare function formatCurrency(value: string | number, currency?: string): string;
export declare function truncateAddress(address: string, start?: number, end?: number): string;
export declare function formatRelativeTime(timestamp: number): string;
export declare function formatDate(timestamp: number, format?: 'short' | 'medium' | 'long'): string;
export declare function getInitials(name: string, maxLength?: number): string;
export declare function stringToColor(str: string): string;
export interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetOnPropsChange?: boolean;
}
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}
export declare class ProfileErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    componentDidUpdate(prevProps: ErrorBoundaryProps): void;
    render(): React.ReactNode;
}
export interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    style?: React.CSSProperties;
    count?: number;
    animation?: 'pulse' | 'shimmer' | 'none';
}
export declare const Skeleton: React.FC<SkeletonProps>;
export interface ProfileCardProps {
    profile: AgentProfile;
    variant?: 'compact' | 'full' | 'minimal' | 'responsive';
    showAvatar?: boolean;
    showStats?: boolean;
    showLevel?: boolean;
    onEdit?: () => void;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const ProfileCard: React.FC<ProfileCardProps>;
export interface AchievementBadgeProps {
    achievement: Achievement;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const AchievementBadge: React.FC<AchievementBadgeProps>;
export interface ProfileAvatarProps {
    src?: string;
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    isOnline?: boolean;
    showStatus?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const ProfileAvatar: React.FC<ProfileAvatarProps>;
export interface LevelProgressBarProps {
    currentXP: number;
    level?: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    style?: React.CSSProperties;
}
export declare const LevelProgressBar: React.FC<LevelProgressBarProps>;
export interface StatsGridProps {
    stats: ProfileStats;
    columns?: 2 | 3 | 4;
    className?: string;
    style?: React.CSSProperties;
}
export declare const StatsGrid: React.FC<StatsGridProps>;
export * from './profile.js';
//# sourceMappingURL=profile-components.d.ts.map