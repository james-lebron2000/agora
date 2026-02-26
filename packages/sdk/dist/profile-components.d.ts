/**
 * Profile Components for Agora SDK
 *
 * React components for displaying agent profiles, achievements, and stats.
 * Requires React 18+ as a peer dependency.
 */
import React from 'react';
import { type AgentProfile, type Achievement } from './profile.js';
export type ThemeMode = 'light' | 'dark';
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
    textMuted: string;
    border: string;
    borderLight: string;
    shadow: string;
}
export interface ThemeTypography {
    fontFamily: string;
    sizes: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    weights: {
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}
export interface Theme {
    mode: ThemeMode;
    colors: ThemeColors;
    typography: ThemeTypography;
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        full: string;
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
}
export declare const lightTheme: Theme;
export declare const darkTheme: Theme;
export interface ThemeProviderProps {
    children: React.ReactNode;
    theme?: Theme;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};
export declare const breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
};
export type Breakpoint = keyof typeof breakpoints;
export declare const useResponsive: () => {
    windowWidth: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
    isAbove: (bp: Breakpoint) => boolean;
    isBelow: (bp: Breakpoint) => boolean;
};
export declare function formatNumber(num: number): string;
export declare function formatCurrency(amount: string | number, currency?: string): string;
export declare function truncateAddress(address: string, chars?: number): string;
export declare function formatRelativeTime(timestamp: number): string;
export declare function formatDate(timestamp: number): string;
export declare function getInitials(name: string): string;
export declare function stringToColor(str: string): string;
export interface ProfileErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}
export interface ProfileErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}
export declare class ProfileErrorBoundary extends React.Component<ProfileErrorBoundaryProps, ProfileErrorBoundaryState> {
    constructor(props: ProfileErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ProfileErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
export interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const Skeleton: React.FC<SkeletonProps>;
export interface ProfileAvatarProps {
    profile?: AgentProfile;
    src?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    showStatus?: boolean;
    status?: 'online' | 'away' | 'offline' | 'busy';
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}
export declare const ProfileAvatar: React.FC<ProfileAvatarProps>;
export interface StatItem {
    label: string;
    value: string | number;
    icon?: string;
    change?: number;
    suffix?: string;
}
export interface StatsGridProps {
    stats: StatItem[];
    columns?: 2 | 3 | 4;
    className?: string;
    style?: React.CSSProperties;
}
export declare const StatsGrid: React.FC<StatsGridProps>;
export interface ProfileCardProps {
    profile: AgentProfile;
    achievements?: Achievement[];
    showAchievements?: boolean;
    showStats?: boolean;
    maxAchievements?: number;
    onEdit?: () => void;
    onViewProfile?: () => void;
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
export interface LevelProgressBarProps {
    level: number;
    xp: number;
    showDetails?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const LevelProgressBar: React.FC<LevelProgressBarProps>;
export { AgentProfile, Achievement, ProfileStats, calculateLevel, levelProgress, xpForNextLevel, getTierColor, } from './profile.js';
declare const _default: {
    ProfileCard: React.FC<ProfileCardProps>;
    AchievementBadge: React.FC<AchievementBadgeProps>;
    LevelProgressBar: React.FC<LevelProgressBarProps>;
    ProfileAvatar: React.FC<ProfileAvatarProps>;
    StatsGrid: React.FC<StatsGridProps>;
    ThemeProvider: React.FC<ThemeProviderProps>;
    useTheme: () => {
        theme: Theme;
        setTheme: (theme: Theme) => void;
    };
    useResponsive: () => {
        windowWidth: number;
        isMobile: boolean;
        isTablet: boolean;
        isDesktop: boolean;
        isLargeDesktop: boolean;
        isAbove: (bp: Breakpoint) => boolean;
        isBelow: (bp: Breakpoint) => boolean;
    };
    lightTheme: Theme;
    darkTheme: Theme;
    formatNumber: typeof formatNumber;
    formatCurrency: typeof formatCurrency;
    truncateAddress: typeof truncateAddress;
    formatRelativeTime: typeof formatRelativeTime;
    formatDate: typeof formatDate;
    getInitials: typeof getInitials;
    stringToColor: typeof stringToColor;
    ProfileErrorBoundary: typeof ProfileErrorBoundary;
    Skeleton: React.FC<SkeletonProps>;
    breakpoints: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        '2xl': number;
    };
};
export default _default;
//# sourceMappingURL=profile-components.d.ts.map