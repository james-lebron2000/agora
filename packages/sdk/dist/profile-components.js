import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * React Components for Agora Agent Profile Module
 * @module profile-components
 */
import React, { useCallback, useMemo, useState, useEffect, memo } from 'react';
import { calculateLevel, levelProgress, xpForNextLevel, getTierColor, } from './profile.js';
// ============================================================================
// Responsive Breakpoints & Utilities
// ============================================================================
export const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};
export function useResponsive() {
    const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const breakpoint = useMemo(() => {
        if (width >= breakpoints['2xl'])
            return '2xl';
        if (width >= breakpoints.xl)
            return 'xl';
        if (width >= breakpoints.lg)
            return 'lg';
        if (width >= breakpoints.md)
            return 'md';
        if (width >= breakpoints.sm)
            return 'sm';
        return 'xs';
    }, [width]);
    return {
        breakpoint,
        width,
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        isLarge: width >= breakpoints.xl,
    };
}
export const lightTheme = {
    mode: 'light',
    colors: {
        primary: '#2563EB',
        secondary: '#7C3AED',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#0891B2',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A',
        textSecondary: '#475569',
        border: '#E2E8F0',
        borderLight: '#F1F5F9',
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2.5rem',
        '3xl': '3rem',
    },
    borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
    },
    typography: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
        },
        weights: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeights: {
            none: 1,
            tight: 1.25,
            snug: 1.375,
            normal: 1.5,
            relaxed: 1.625,
            loose: 2,
        },
    },
    shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    },
    transitions: {
        fast: '150ms ease',
        normal: '250ms ease',
        slow: '350ms ease',
    },
    zIndices: {
        hide: -1,
        auto: 'auto',
        base: 0,
        docked: 10,
        dropdown: 1000,
        sticky: 1100,
        banner: 1200,
        overlay: 1300,
        modal: 1400,
        popover: 1500,
        skipLink: 1600,
        toast: 1700,
        tooltip: 1800,
    },
};
export const darkTheme = {
    mode: 'dark',
    colors: {
        primary: '#60A5FA',
        secondary: '#A78BFA',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#22D3EE',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: '#334155',
        borderLight: '#1E293B',
    },
    spacing: lightTheme.spacing,
    borderRadius: lightTheme.borderRadius,
    typography: lightTheme.typography,
    shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    },
    transitions: lightTheme.transitions,
    zIndices: lightTheme.zIndices,
};
const ThemeContext = React.createContext({
    theme: lightTheme,
    setTheme: () => { },
    toggleTheme: () => { },
    systemPrefersDark: false,
});
export const ThemeProvider = memo(({ children, defaultTheme = 'light', enableSystem = true, storageKey = 'agora-theme', }) => {
    const [systemPrefersDark, setSystemPrefersDark] = useState(false);
    const [themeMode, setThemeMode] = useState(() => {
        if (typeof window === 'undefined')
            return defaultTheme;
        const stored = localStorage.getItem(storageKey);
        if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
            return stored;
        }
        return defaultTheme;
    });
    useEffect(() => {
        if (!enableSystem)
            return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemPrefersDark(mediaQuery.matches);
        const handler = (e) => setSystemPrefersDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [enableSystem]);
    const theme = useMemo(() => {
        if (themeMode === 'system') {
            return systemPrefersDark ? darkTheme : lightTheme;
        }
        return themeMode === 'dark' ? darkTheme : lightTheme;
    }, [themeMode, systemPrefersDark]);
    const setTheme = useCallback((newTheme) => {
        if (typeof newTheme === 'string') {
            setThemeMode(newTheme);
            if (storageKey) {
                localStorage.setItem(storageKey, newTheme);
            }
        }
    }, [storageKey]);
    const toggleTheme = useCallback(() => {
        setThemeMode(prev => {
            const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
            if (storageKey) {
                localStorage.setItem(storageKey, next);
            }
            return next;
        });
    }, [storageKey]);
    const value = useMemo(() => ({
        theme,
        setTheme,
        toggleTheme,
        systemPrefersDark
    }), [theme, setTheme, toggleTheme, systemPrefersDark]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
});
ThemeProvider.displayName = 'ThemeProvider';
export const useTheme = () => {
    const context = React.useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
// ============================================================================
// Utility Functions
// ============================================================================
export function formatNumber(num, decimals = 0) {
    if (num >= 1e9)
        return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6)
        return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3)
        return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
}
export function formatCurrency(value, currency = '$') {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return `${currency}0.00`;
    return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function truncateAddress(address, start = 6, end = 4) {
    if (!address || address.length < start + end + 2)
        return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}
export function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0)
        return `${years}y ago`;
    if (months > 0)
        return `${months}mo ago`;
    if (weeks > 0)
        return `${weeks}w ago`;
    if (days > 0)
        return `${days}d ago`;
    if (hours > 0)
        return `${hours}h ago`;
    if (minutes > 0)
        return `${minutes}m ago`;
    return 'just now';
}
export function formatDate(timestamp, format = 'medium') {
    const date = new Date(timestamp);
    const options = {
        short: { month: 'short', day: 'numeric' },
        medium: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { month: 'long', day: 'numeric', year: 'numeric' },
    };
    return date.toLocaleDateString('en-US', options[format]);
}
export function getInitials(name, maxLength = 2) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, maxLength)
        .toUpperCase();
}
export function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.abs(hash).toString(16).slice(0, 6);
    return '#' + '0'.repeat(6 - color.length) + color;
}
export class ProfileErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.props.onError?.(error, errorInfo);
    }
    componentDidUpdate(prevProps) {
        if (this.props.resetOnPropsChange && prevProps.children !== this.props.children) {
            this.setState({ hasError: false, error: null });
        }
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || (_jsxs("div", { role: "alert", "aria-live": "assertive", style: { padding: '1rem', color: '#DC2626' }, children: [_jsx("h3", { children: "Something went wrong" }), _jsx("p", { children: this.state.error?.message })] }));
        }
        return this.props.children;
    }
}
export const Skeleton = memo(({ width = '100%', height = '1rem', circle = false, className, style, count = 1, animation = 'pulse', }) => {
    const { theme } = useTheme();
    const skeletonStyle = useMemo(() => ({
        width,
        height,
        borderRadius: circle ? '50%' : theme.borderRadius.md,
        backgroundColor: theme.colors.borderLight,
        ...style,
    }), [width, height, circle, theme, style]);
    const animationStyles = {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        none: 'none',
    }[animation];
    return (_jsxs(_Fragment, { children: [Array.from({ length: count }).map((_, i) => (_jsx("div", { className: className, style: { ...skeletonStyle, animation: animationStyles }, "aria-hidden": "true" }, i))), _jsx("style", { children: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      ` })] }));
});
Skeleton.displayName = 'Skeleton';
export const ProfileCard = memo(({ profile, variant = 'full', showAvatar = true, showStats = true, showLevel = true, onEdit, onClick, className, style, }) => {
    const { theme } = useTheme();
    const responsive = useResponsive();
    const effectiveVariant = variant === 'responsive'
        ? (responsive.isMobile ? 'compact' : 'full')
        : variant;
    const { level, progress, tierColor, initials } = useMemo(() => {
        const lvl = calculateLevel(profile.xp);
        const prog = levelProgress(profile.xp);
        const tName = lvl >= 50 ? 'diamond' : lvl >= 30 ? 'platinum' : lvl >= 20 ? 'gold' : lvl >= 10 ? 'silver' : 'bronze';
        return {
            level: lvl,
            progress: prog,
            tierColor: getTierColor(tName),
            initials: getInitials(profile.name || '??'),
        };
    }, [profile.xp, profile.name]);
    const styles = useMemo(() => {
        const isCompact = effectiveVariant === 'compact';
        const isMinimal = effectiveVariant === 'minimal';
        return {
            container: {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.xl,
                boxShadow: theme.shadows.md,
                padding: isCompact ? theme.spacing.md : isMinimal ? theme.spacing.sm : theme.spacing.lg,
                width: isCompact ? '100%' : isMinimal ? '200px' : '100%',
                maxWidth: effectiveVariant === 'full' ? '400px' : undefined,
                border: `1px solid ${theme.colors.border}`,
                transition: `box-shadow ${theme.transitions.normal}, transform ${theme.transitions.normal}`,
                position: 'relative',
                cursor: onClick ? 'pointer' : 'default',
            },
            header: {
                display: 'flex',
                alignItems: isMinimal ? 'center' : 'flex-start',
                gap: theme.spacing.md,
                marginBottom: isMinimal ? 0 : theme.spacing.md,
            },
            avatar: {
                width: isCompact ? '48px' : isMinimal ? '32px' : responsive.isMobile ? '56px' : '80px',
                height: isCompact ? '48px' : isMinimal ? '32px' : responsive.isMobile ? '56px' : '80px',
                borderRadius: theme.borderRadius.full,
                objectFit: 'cover',
                border: `3px solid ${tierColor}`,
                backgroundColor: theme.colors.borderLight,
            },
            avatarPlaceholder: {
                width: isCompact ? '48px' : isMinimal ? '32px' : responsive.isMobile ? '56px' : '80px',
                height: isCompact ? '48px' : isMinimal ? '32px' : responsive.isMobile ? '56px' : '80px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: isMinimal ? theme.typography.sizes.base : theme.typography.sizes['2xl'],
                fontWeight: theme.typography.weights.bold,
                border: `3px solid ${tierColor}`,
            },
            info: {
                flex: 1,
                minWidth: 0,
            },
            name: {
                fontSize: isMinimal ? theme.typography.sizes.sm : theme.typography.sizes.xl,
                fontWeight: theme.typography.weights.semibold,
                color: theme.colors.text,
                margin: 0,
                marginBottom: isMinimal ? 0 : theme.spacing.xs,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            },
            level: {
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
            },
            levelBadge: {
                backgroundColor: tierColor,
                color: '#000000',
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.sizes.xs,
                fontWeight: theme.typography.weights.bold,
            },
            bio: {
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.textSecondary,
                margin: `${theme.spacing.sm} 0`,
                lineHeight: theme.typography.lineHeights.relaxed,
                display: isMinimal ? 'none' : '-webkit-box',
                WebkitLineClamp: responsive.isMobile ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
            },
            stats: {
                display: 'grid',
                gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: theme.spacing.sm,
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.md,
                borderTop: `1px solid ${theme.colors.border}`,
            },
            stat: {
                textAlign: 'center',
            },
            statValue: {
                fontSize: theme.typography.sizes.lg,
                fontWeight: theme.typography.weights.bold,
                color: theme.colors.text,
            },
            statLabel: {
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            },
            progressBar: {
                height: '4px',
                backgroundColor: theme.colors.border,
                borderRadius: theme.borderRadius.full,
                marginTop: theme.spacing.sm,
                overflow: 'hidden',
            },
            progressFill: {
                height: '100%',
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.full,
                transition: 'width 0.3s ease',
                width: `${progress * 100}%`,
            },
            editButton: {
                position: 'absolute',
                top: theme.spacing.md,
                right: theme.spacing.md,
                background: 'none',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            },
            verifiedBadge: {
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: theme.spacing.xs,
                color: theme.colors.primary,
            },
        };
    }, [theme, effectiveVariant, tierColor, progress, responsive.isMobile, onClick]);
    const handleEditClick = useCallback((e) => {
        e.stopPropagation();
        onEdit?.();
    }, [onEdit]);
    const isMinimal = effectiveVariant === 'minimal';
    const progressPercent = Math.round(progress * 100);
    return (_jsxs("article", { className: className, style: { ...styles.container, ...style }, role: "article", "aria-label": `${profile.name}'s profile card`, onClick: onClick, onMouseEnter: (e) => {
            if (onClick) {
                e.currentTarget.style.boxShadow = theme.shadows.lg;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }
        }, onMouseLeave: (e) => {
            e.currentTarget.style.boxShadow = theme.shadows.md;
            e.currentTarget.style.transform = 'translateY(0)';
        }, children: [onEdit && effectiveVariant === 'full' && (_jsx("button", { onClick: handleEditClick, style: styles.editButton, "aria-label": "Edit profile", title: "Edit profile", type: "button", children: "\u270F\uFE0F" })), _jsxs("div", { style: styles.header, children: [showAvatar && (profile.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: `${profile.name}'s avatar`, style: styles.avatar, loading: "lazy" })) : (_jsx("div", { style: styles.avatarPlaceholder, "aria-hidden": "true", children: initials }))), _jsxs("div", { style: styles.info, children: [_jsxs("h3", { style: styles.name, children: [profile.name, profile.isVerified && (_jsx("span", { style: styles.verifiedBadge, title: "Verified account", "aria-label": "Verified account", children: "\u2713" }))] }), showLevel && !isMinimal && (_jsxs("div", { style: styles.level, children: [_jsxs("span", { style: styles.levelBadge, "aria-label": `Level ${level}`, children: ["Lv.", level] }), _jsxs("span", { "aria-label": `${progressPercent}% progress to next level`, children: [progressPercent, "% to next level"] })] }))] })] }), !isMinimal && profile.bio && (_jsx("p", { style: styles.bio, children: profile.bio })), showLevel && !isMinimal && (_jsx("div", { style: styles.progressBar, role: "progressbar", "aria-valuenow": progressPercent, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Level progress", children: _jsx("div", { style: styles.progressFill }) })), showStats && !isMinimal && (_jsxs("div", { style: styles.stats, role: "list", "aria-label": "Profile statistics", children: [_jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `${profile.tasksCompleted} tasks completed`, children: profile.tasksCompleted }), _jsx("div", { style: styles.statLabel, children: "Tasks" })] }), _jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `Total earned: ${formatCurrency(profile.totalEarned)}`, children: formatCurrency(profile.totalEarned) }), _jsx("div", { style: styles.statLabel, children: "Earned" })] }), effectiveVariant === 'full' && (_jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `Reputation: ${profile.reputation}`, children: profile.reputation }), _jsx("div", { style: styles.statLabel, children: "Rep" })] }))] }))] }));
});
ProfileCard.displayName = 'ProfileCard';
export const AchievementBadge = memo(({ achievement, size = 'md', showTooltip = true, className, style, }) => {
    const { theme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const [isTouched, setIsTouched] = useState(false);
    const sizeConfig = useMemo(() => {
        const configs = {
            sm: { size: 32, fontSize: '0.875rem', iconSize: 16 },
            md: { size: 48, fontSize: '1rem', iconSize: 24 },
            lg: { size: 64, fontSize: '1.25rem', iconSize: 32 },
        };
        return configs[size];
    }, [size]);
    const styles = useMemo(() => ({
        container: {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: sizeConfig.size,
            height: sizeConfig.size,
            borderRadius: '50%',
            backgroundColor: achievement.tier ? getTierColor(achievement.tier) : theme.colors.primary,
            cursor: 'pointer',
            transition: theme.transitions.normal,
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        },
        icon: {
            fontSize: sizeConfig.fontSize,
            color: '#FFFFFF',
        },
        tooltip: {
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.lg,
            fontSize: theme.typography.sizes.sm,
            whiteSpace: 'nowrap',
            zIndex: theme.zIndices.tooltip,
            marginBottom: theme.spacing.sm,
            opacity: (isHovered || isTouched) && showTooltip ? 1 : 0,
            visibility: (isHovered || isTouched) && showTooltip ? 'visible' : 'hidden',
            transition: theme.transitions.normal,
        },
        title: {
            fontWeight: theme.typography.weights.semibold,
            marginBottom: theme.spacing.xs,
        },
        description: {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.sizes.xs,
        },
    }), [sizeConfig, achievement.tier, theme, isHovered, isTouched, showTooltip]);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), onTouchStart: () => setIsTouched(true), onTouchEnd: () => setIsTouched(false), role: "img", "aria-label": `${achievement.name} achievement`, children: [_jsx("span", { style: styles.icon, children: achievement.icon || '🏆' }), showTooltip && (_jsxs("div", { style: styles.tooltip, role: "tooltip", children: [_jsx("div", { style: styles.title, children: achievement.name }), _jsx("div", { style: styles.description, children: achievement.description })] }))] }));
});
AchievementBadge.displayName = 'AchievementBadge';
export const ProfileAvatar = memo(({ src, name, size = 'md', isOnline = false, showStatus = false, className, style, }) => {
    const { theme } = useTheme();
    const initials = useMemo(() => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), [name]);
    const sizeConfig = useMemo(() => {
        const configs = {
            xs: { size: 24, fontSize: '0.625rem', statusSize: 8 },
            sm: { size: 32, fontSize: '0.75rem', statusSize: 10 },
            md: { size: 48, fontSize: '1rem', statusSize: 12 },
            lg: { size: 64, fontSize: '1.25rem', statusSize: 16 },
            xl: { size: 96, fontSize: '1.875rem', statusSize: 20 },
        };
        return configs[size];
    }, [size]);
    const styles = useMemo(() => ({
        container: {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: sizeConfig.size,
            height: sizeConfig.size,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: theme.colors.primary,
            border: `2px solid ${theme.colors.surface}`,
        },
        image: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        },
        fallback: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontSize: sizeConfig.fontSize,
            fontWeight: theme.typography.weights.medium,
            color: '#FFFFFF',
        },
        status: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: sizeConfig.statusSize,
            height: sizeConfig.statusSize,
            borderRadius: '50%',
            backgroundColor: isOnline ? theme.colors.success : theme.colors.textSecondary,
            border: `2px solid ${theme.colors.surface}`,
        },
    }), [sizeConfig, theme, isOnline]);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, children: [src ? (_jsx("img", { src: src, alt: name, style: styles.image, loading: "lazy" })) : (_jsx("div", { style: styles.fallback, children: initials })), showStatus && _jsx("div", { style: styles.status, "aria-label": isOnline ? 'Online' : 'Offline' })] }));
});
ProfileAvatar.displayName = 'ProfileAvatar';
export const LevelProgressBar = memo(({ currentXP, level: propLevel, showLabel = true, size = 'md', className, style, }) => {
    const { theme } = useTheme();
    const level = propLevel ?? calculateLevel(currentXP);
    const progress = levelProgress(currentXP);
    const nextLevelXP = xpForNextLevel(currentXP);
    const styles = useMemo(() => {
        const heights = { sm: 4, md: 8, lg: 12 };
        return {
            container: {
                width: '100%',
            },
            header: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
            },
            level: {
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.weights.semibold,
                color: theme.colors.text,
            },
            progress: {
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.textSecondary,
            },
            bar: {
                width: '100%',
                height: heights[size],
                backgroundColor: theme.colors.borderLight,
                borderRadius: theme.borderRadius.full,
                overflow: 'hidden',
            },
            fill: {
                width: `${progress}%`,
                height: '100%',
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.full,
                transition: theme.transitions.normal,
            },
        };
    }, [theme, size, progress]);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, children: [showLabel && (_jsxs("div", { style: styles.header, children: [_jsxs("span", { style: styles.level, children: ["Level ", level] }), _jsxs("span", { style: styles.progress, children: [progress, "% to Level ", level + 1] })] })), _jsx("div", { style: styles.bar, role: "progressbar", "aria-valuenow": progress, "aria-valuemin": 0, "aria-valuemax": 100, children: _jsx("div", { style: styles.fill }) })] }));
});
LevelProgressBar.displayName = 'LevelProgressBar';
export const StatsGrid = memo(({ stats, columns = 3, className, style, }) => {
    const { theme } = useTheme();
    const statItems = useMemo(() => [
        { label: 'Tasks', value: stats.tasksCompleted, icon: '✓' },
        { label: 'Rating', value: stats.averageRating.toFixed(1), icon: '★' },
        { label: 'Success Rate', value: `${(stats.successRate * 100).toFixed(0)}%`, icon: '📈' },
        { label: 'Response Time', value: `${Math.round(stats.averageResponseTime / 60)}h`, icon: '⏱' },
        { label: 'Streak', value: stats.currentStreak, icon: '🔥' },
        { label: 'Reviews', value: stats.totalReviews, icon: '👥' },
    ], [stats]);
    const styles = useMemo(() => ({
        grid: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: theme.spacing.md,
        },
        stat: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.borderLight}`,
        },
        icon: {
            fontSize: '1.5rem',
            marginBottom: theme.spacing.sm,
        },
        value: {
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.text,
        },
        label: {
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.xs,
        },
    }), [theme, columns]);
    return (_jsx("div", { className: className, style: { ...styles.grid, ...style }, children: statItems.map((stat, index) => (_jsxs("div", { style: styles.stat, children: [_jsx("span", { style: styles.icon, children: stat.icon }), _jsx("span", { style: styles.value, children: stat.value }), _jsx("span", { style: styles.label, children: stat.label })] }, index))) }));
});
StatsGrid.displayName = 'StatsGrid';
// ============================================================================
// Export all components
// ============================================================================
export * from './profile.js';
//# sourceMappingURL=profile-components.js.map