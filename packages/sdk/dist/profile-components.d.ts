/**
 * React Components for Agora Agent Profile Module
 *
 * Provides reusable UI components for displaying agent profiles,
 * achievements, stats, and related data.
 *
 * @module profile-components
 */
import React from 'react';
import { AgentProfile, Achievement, ProfileStats } from './profile.js';
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
    border: string;
    borderLight: string;
}
export interface Theme {
    mode: ThemeMode;
    colors: ThemeColors;
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        full: string;
    };
    typography: {
        fontFamily: string;
        sizes: {
            xs: string;
            sm: string;
            base: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
        };
        weights: {
            normal: number;
            medium: number;
            semibold: number;
            bold: number;
        };
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}
export declare const lightTheme: Theme;
export declare const darkTheme: Theme;
export interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme | ThemeMode) => void;
}
export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: ThemeMode;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => ThemeContextValue;
export declare function formatNumber(num: number, decimals?: number): string;
export declare function formatCurrency(value: string | number, currency?: string): string;
export declare function truncateAddress(address: string, start?: number, end?: number): string;
export interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}
export declare class ProfileErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    render(): React.ReactNode;
}
export interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const Skeleton: React.FC<SkeletonProps>;
export interface ProfileCardProps {
    profile: AgentProfile;
    variant?: 'compact' | 'full' | 'minimal';
    showAvatar?: boolean;
    showStats?: boolean;
    onEdit?: () => void;
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
export interface LevelProgressProps {
    level: number;
    xp: number;
    showDetails?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare const LevelProgress: React.FC<LevelProgressProps>;
export interface ReputationScoreProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showTrend?: boolean;
    trend?: 'up' | 'down' | 'stable';
    className?: string;
    style?: React.CSSProperties;
}
export declare const ReputationScore: React.FC<ReputationScoreProps>;
export interface ProfileStatsGridProps {
    stats: ProfileStats;
    columns?: 2 | 3 | 4;
    className?: string;
    style?: React.CSSProperties;
}
export declare const ProfileStatsGrid: React.FC<ProfileStatsGridProps>;
export interface SkillTagsProps {
    skills: string[];
    maxDisplay?: number;
    onTagClick?: (skill: string) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const SkillTags: React.FC<SkillTagsProps>;
export { AgentProfile, Achievement, ProfileStats, calculateLevel, levelProgress, xpForNextLevel, getTierColor, } from './profile.js';
declare const _default: {
    ProfileCard: React.FC<ProfileCardProps>;
    AchievementBadge: React.FC<AchievementBadgeProps>;
    LevelProgress: React.FC<LevelProgressProps>;
    ReputationScore: React.FC<ReputationScoreProps>;
    ProfileStatsGrid: React.FC<ProfileStatsGridProps>;
    SkillTags: React.FC<SkillTagsProps>;
    ThemeProvider: React.FC<ThemeProviderProps>;
    useTheme: () => ThemeContextValue;
    lightTheme: Theme;
    darkTheme: Theme;
    formatNumber: typeof formatNumber;
    formatCurrency: typeof formatCurrency;
    truncateAddress: typeof truncateAddress;
    ProfileErrorBoundary: typeof ProfileErrorBoundary;
    Skeleton: React.FC<SkeletonProps>;
};
export default _default;
//# sourceMappingURL=profile-components.d.ts.map