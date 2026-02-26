import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * React Components for Agora Agent Profile Module
 *
 * Provides reusable UI components for displaying agent profiles,
 * achievements, stats, and related data.
 *
 * @module profile-components
 */
import React, { useCallback, useMemo, useState, memo } from 'react';
import { calculateLevel, levelProgress, getTierColor, } from './profile.js';
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
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
    },
    typography: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    },
};
const ThemeContext = React.createContext({
    theme: lightTheme,
    setTheme: () => { },
});
export const ThemeProvider = memo(({ children, defaultTheme = 'light', }) => {
    const [theme, setThemeState] = useState(defaultTheme === 'dark' ? darkTheme : lightTheme);
    const setTheme = useCallback((newTheme) => {
        if (typeof newTheme === 'string') {
            setThemeState(newTheme === 'dark' ? darkTheme : lightTheme);
        }
        else {
            setThemeState(newTheme);
        }
    }, []);
    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
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
    render() {
        if (this.state.hasError) {
            return this.props.fallback || (_jsxs("div", { role: "alert", "aria-live": "assertive", style: { padding: '1rem', color: '#DC2626' }, children: [_jsx("h3", { children: "Something went wrong" }), _jsx("p", { children: this.state.error?.message })] }));
        }
        return this.props.children;
    }
}
export const Skeleton = memo(({ width = '100%', height = '1rem', circle = false, className, style, }) => {
    const { theme } = useTheme();
    const skeletonStyle = useMemo(() => ({
        width,
        height,
        borderRadius: circle ? '50%' : theme.borderRadius.md,
        backgroundColor: theme.colors.borderLight,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style,
    }), [width, height, circle, theme, style]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: className, style: skeletonStyle, "aria-hidden": "true" }), _jsx("style", { children: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` })] }));
});
Skeleton.displayName = 'Skeleton';
export const ProfileCard = memo(({ profile, variant = 'full', showAvatar = true, showStats = true, onEdit, className, style, }) => {
    const { theme } = useTheme();
    // Memoized computed values
    const { level, progress, tierColor, initials } = useMemo(() => {
        const lvl = calculateLevel(profile.xp);
        const prog = levelProgress(profile.xp);
        const tName = lvl >= 50 ? 'diamond' : lvl >= 30 ? 'platinum' : lvl >= 20 ? 'gold' : lvl >= 10 ? 'silver' : 'bronze';
        return {
            level: lvl,
            progress: prog,
            tierColor: getTierColor(tName),
            initials: profile.name?.slice(0, 2).toUpperCase() || '??',
        };
    }, [profile.xp, profile.name]);
    // Memoized styles
    const styles = useMemo(() => {
        const isCompact = variant === 'compact';
        const isMinimal = variant === 'minimal';
        return {
            container: {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.xl,
                boxShadow: theme.shadows.md,
                padding: isCompact ? theme.spacing.md : isMinimal ? theme.spacing.sm : theme.spacing.lg,
                width: isCompact ? '280px' : isMinimal ? '200px' : '100%',
                maxWidth: variant === 'full' ? '400px' : undefined,
                border: `1px solid ${theme.colors.border}`,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                position: 'relative',
            },
            header: {
                display: 'flex',
                alignItems: isMinimal ? 'center' : 'flex-start',
                gap: theme.spacing.md,
                marginBottom: isMinimal ? 0 : theme.spacing.md,
            },
            avatar: {
                width: isCompact ? '48px' : isMinimal ? '32px' : '80px',
                height: isCompact ? '48px' : isMinimal ? '32px' : '80px',
                borderRadius: theme.borderRadius.full,
                objectFit: 'cover',
                border: `3px solid ${tierColor}`,
                backgroundColor: theme.colors.borderLight,
            },
            avatarPlaceholder: {
                width: isCompact ? '48px' : isMinimal ? '32px' : '80px',
                height: isCompact ? '48px' : isMinimal ? '32px' : '80px',
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
                lineHeight: 1.5,
                display: isMinimal ? 'none' : '-webkit-box',
                WebkitLineClamp: 2,
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
    }, [theme, variant, tierColor, progress]);
    // Event handlers with useCallback
    const handleEditClick = useCallback(() => {
        onEdit?.();
    }, [onEdit]);
    const handleEditMouseEnter = useCallback((e) => {
        e.currentTarget.style.backgroundColor = theme.colors.borderLight;
        e.currentTarget.style.transform = 'scale(1.05)';
    }, [theme]);
    const handleEditMouseLeave = useCallback((e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.transform = 'scale(1)';
    }, []);
    const isMinimal = variant === 'minimal';
    const progressPercent = Math.round(progress * 100);
    return (_jsxs("article", { className: className, style: { ...styles.container, ...style }, role: "article", "aria-label": `${profile.name}'s profile card`, children: [onEdit && variant === 'full' && (_jsx("button", { onClick: handleEditClick, onMouseEnter: handleEditMouseEnter, onMouseLeave: handleEditMouseLeave, style: styles.editButton, "aria-label": "Edit profile", title: "Edit profile", type: "button", children: "\u270F\uFE0F" })), _jsxs("div", { style: styles.header, children: [showAvatar && (profile.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: `${profile.name}'s avatar`, style: styles.avatar, loading: "lazy" })) : (_jsx("div", { style: styles.avatarPlaceholder, "aria-hidden": "true", children: initials }))), _jsxs("div", { style: styles.info, children: [_jsxs("h3", { style: styles.name, children: [profile.name, profile.isVerified && (_jsx("span", { style: styles.verifiedBadge, title: "Verified account", "aria-label": "Verified account", children: "\u2713" }))] }), !isMinimal && (_jsxs("div", { style: styles.level, children: [_jsxs("span", { style: styles.levelBadge, "aria-label": `Level ${level}`, children: ["Lv.", level] }), _jsxs("span", { "aria-label": `${progressPercent}% progress to next level`, children: [progressPercent, "% to next level"] })] }))] })] }), !isMinimal && profile.bio && (_jsx("p", { style: styles.bio, children: profile.bio })), !isMinimal && (_jsx("div", { style: styles.progressBar, role: "progressbar", "aria-valuenow": progressPercent, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Level progress", children: _jsx("div", { style: styles.progressFill }) })), showStats && !isMinimal && (_jsxs("div", { style: styles.stats, role: "list", "aria-label": "Profile statistics", children: [_jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `${profile.tasksCompleted} tasks completed`, children: profile.tasksCompleted }), _jsx("div", { style: styles.statLabel, children: "Tasks" })] }), _jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `Total earned: ${formatCurrency(profile.totalEarned)}`, children: formatCurrency(profile.totalEarned) }), _jsx("div", { style: styles.statLabel, children: "Earned" })] }), variant === 'full' && (_jsxs("div", { style: styles.stat, role: "listitem", children: [_jsx("div", { style: styles.statValue, "aria-label": `Reputation: ${profile.reputation}`, children: profile.reputation }), _jsx("div", { style: styles.statLabel, children: "Rep" })] }))] }))] }));
});
ProfileCard.displayName = 'ProfileCard';
export const AchievementBadge = memo(({ achievement, size = 'md', showTooltip = true, className, style, }) => {
    const { theme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const [isTouched, setIsTouched] = useState(false);
    const sizeConfig = useMemo(() => ({
        sm: { icon: '20px', container: '32px', fontSize: theme.typography.sizes.sm, touchTarget: '44px' },
        md: { icon: '28px', container: '48px', fontSize: theme.typography.sizes.lg, touchTarget: '48px' },
        lg: { icon: '40px', container: '72px', fontSize: theme.typography.sizes['2xl'], touchTarget: '72px' },
    }), [theme]);
    const { tierColor, isUnlocked, progress, sizeValue } = useMemo(() => ({
        tierColor: getTierColor(achievement.tier),
        isUnlocked: !!achievement.unlockedAt || !!achievement.completedAt,
        progress: achievement.progress || 0,
        sizeValue: sizeConfig[size],
    }), [achievement, sizeConfig, size]);
    const styles = useMemo(() => ({
        container: {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: sizeValue.touchTarget,
            height: sizeValue.touchTarget,
            borderRadius: theme.borderRadius.lg,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: showTooltip ? 'pointer' : 'default',
            padding: 0,
        },
        badge: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: sizeValue.container,
            height: sizeValue.container,
            borderRadius: theme.borderRadius.lg,
            backgroundColor: isUnlocked ? `${tierColor}20` : theme.colors.borderLight,
            border: `2px solid ${isUnlocked ? tierColor : theme.colors.border}`,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            transform: (isHovered || isTouched) ? 'scale(1.05)' : 'scale(1)',
            boxShadow: (isHovered || isTouched) ? theme.shadows.md : 'none',
        },
        icon: {
            fontSize: sizeValue.fontSize,
            filter: isUnlocked ? 'none' : 'grayscale(100%)',
            opacity: isUnlocked ? 1 : 0.5,
        },
        progressRing: {
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px',
            height: size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px',
            borderRadius: '50%',
            backgroundColor: theme.colors.surface,
            display: !isUnlocked && progress > 0 ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.sizes.xs,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.primary,
            border: `2px solid ${theme.colors.border}`,
        },
        tooltip: {
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: theme.spacing.sm,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.xl,
            border: `1px solid ${theme.colors.border}`,
            zIndex: 100,
            minWidth: '200px',
            maxWidth: '280px',
            opacity: (isHovered || isTouched) && showTooltip ? 1 : 0,
            visibility: (isHovered || isTouched) && showTooltip ? 'visible' : 'hidden',
            transition: 'opacity 0.2s ease, visibility 0.2s ease',
            pointerEvents: 'none',
        },
        tooltipTitle: {
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.weights.semibold,
            color: theme.colors.text,
            marginBottom: theme.spacing.xs,
        },
        tooltipDesc: {
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.sm,
        },
        tooltipTier: {
            fontSize: theme.typography.sizes.xs,
            color: tierColor,
            fontWeight: theme.typography.weights.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        tooltipProgress: {
            marginTop: theme.spacing.sm,
            height: '4px',
            backgroundColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
        },
        tooltipProgressFill: {
            height: '100%',
            backgroundColor: theme.colors.primary,
            width: `${progress}%`,
            transition: 'width 0.3s ease',
        },
    }), [theme, sizeValue, tierColor, isUnlocked, progress, isHovered, isTouched, showTooltip, size]);
    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);
    const handleTouchStart = useCallback(() => setIsTouched(true), []);
    const handleTouchEnd = useCallback(() => setIsTouched(false), []);
    const ariaLabel = isUnlocked
        ? `${achievement.name} achievement unlocked - ${achievement.tier} tier`
        : `${achievement.name} achievement - ${achievement.tier} tier - ${Math.round(progress)}% progress`;
    return (_jsxs("button", { className: className, style: { ...styles.container, ...style }, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd, "aria-label": ariaLabel, type: "button", children: [_jsxs("div", { style: styles.badge, children: [_jsx("span", { style: styles.icon, "aria-hidden": "true", children: achievement.icon }), !isUnlocked && progress > 0 && (_jsxs("span", { style: styles.progressRing, "aria-hidden": "true", children: [Math.round(progress), "%"] }))] }), showTooltip && (_jsxs("div", { style: styles.tooltip, role: "tooltip", "aria-hidden": !(isHovered || isTouched), children: [_jsx("div", { style: styles.tooltipTitle, children: achievement.name }), _jsx("div", { style: styles.tooltipDesc, children: achievement.description }), _jsxs("div", { style: styles.tooltipTier, children: [achievement.tier, " Tier"] }), !isUnlocked && (_jsx("div", { style: styles.tooltipProgress, role: "progressbar", "aria-valuenow": Math.round(progress), "aria-valuemin": 0, "aria-valuemax": 100, children: _jsx("div", { style: styles.tooltipProgressFill }) }))] }))] }));
});
AchievementBadge.displayName = 'AchievementBadge';
export const LevelProgress = memo(({ level, xp, showDetails = true, className, style, }) => {
    const { theme } = useTheme();
    const { progress, xpInLevel, xpNeeded, tierColor, tierName } = useMemo(() => {
        const currentLevelBaseXp = (level - 1) * (level - 1) * 100;
        const nextLevelXp = level * level * 100;
        const xpInLvl = xp - currentLevelBaseXp;
        const xpNeed = nextLevelXp - currentLevelBaseXp;
        const prog = xpNeed > 0 ? Math.min(1, Math.max(0, xpInLvl / xpNeed)) : 1;
        const tName = level >= 50 ? 'diamond' : level >= 30 ? 'platinum' : level >= 20 ? 'gold' : level >= 10 ? 'silver' : 'bronze';
        return {
            progress: prog,
            xpInLevel: xpInLvl,
            xpNeeded: xpNeed,
            tierColor: getTierColor(tName),
            tierName: tName.charAt(0).toUpperCase() + tName.slice(1),
        };
    }, [level, xp]);
    const styles = useMemo(() => ({
        container: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            border: `1px solid ${theme.colors.border}`,
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
        },
        levelBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        levelNumber: {
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: tierColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.weights.bold,
            color: '#000000',
        },
        levelInfo: {
            display: 'flex',
            flexDirection: 'column',
        },
        levelLabel: {
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.textSecondary,
        },
        levelValue: {
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.text,
        },
        progressContainer: {
            position: 'relative',
            height: '12px',
            backgroundColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
        },
        progressBar: {
            height: '100%',
            background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})`,
            borderRadius: theme.borderRadius.full,
            transition: 'width 0.5s ease',
            width: `${progress * 100}%`,
        },
        progressGlow: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'shimmer 2s infinite',
        },
        details: {
            marginTop: theme.spacing.md,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.textSecondary,
        },
        xpValue: {
            color: theme.colors.primary,
            fontWeight: theme.typography.weights.semibold,
        },
    }), [theme, tierColor, progress]);
    const progressPercent = Math.round(progress * 100);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, role: "region", "aria-label": `Level ${level} progress`, children: [_jsx("div", { style: styles.header, children: _jsxs("div", { style: styles.levelBadge, children: [_jsx("div", { style: styles.levelNumber, "aria-label": `Level ${level}`, children: level }), _jsxs("div", { style: styles.levelInfo, children: [_jsx("span", { style: styles.levelLabel, children: "Current Level" }), _jsx("span", { style: styles.levelValue, "aria-label": `Tier: ${tierName}`, children: tierName })] })] }) }), _jsxs("div", { style: styles.progressContainer, role: "progressbar", "aria-valuenow": progressPercent, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": `${progressPercent}% progress to level ${level + 1}`, children: [_jsx("div", { style: styles.progressBar }), _jsx("div", { style: styles.progressGlow, "aria-hidden": "true" })] }), showDetails && (_jsxs("div", { style: styles.details, children: [_jsxs("span", { children: [_jsx("span", { style: styles.xpValue, "aria-label": `${formatNumber(xpInLevel)} XP in current level`, children: formatNumber(xpInLevel) }), _jsxs("span", { "aria-label": `out of ${formatNumber(xpNeeded)} XP needed`, children: [" / ", formatNumber(xpNeeded), " XP"] })] }), _jsxs("span", { "aria-label": `${progressPercent}% to level ${level + 1}`, children: [progressPercent, "% to Lv.", level + 1] })] })), _jsx("style", { children: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      ` })] }));
});
LevelProgress.displayName = 'LevelProgress';
export const ReputationScore = memo(({ score, size = 'md', showTrend = true, trend = 'stable', className, style, }) => {
    const { theme } = useTheme();
    const sizeConfig = useMemo(() => ({
        sm: { diameter: 48, stroke: 4, fontSize: theme.typography.sizes.sm },
        md: { diameter: 72, stroke: 6, fontSize: theme.typography.sizes.lg },
        lg: { diameter: 120, stroke: 8, fontSize: theme.typography.sizes['2xl'] },
    }), [theme]);
    const { diameter, stroke, fontSize } = sizeConfig[size];
    const radius = (diameter - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = useMemo(() => {
        if (score >= 90)
            return theme.colors.success;
        if (score >= 70)
            return theme.colors.primary;
        if (score >= 50)
            return theme.colors.warning;
        return theme.colors.error;
    }, [score, theme]);
    const trendIcons = useMemo(() => ({
        up: '↑',
        down: '↓',
        stable: '→',
    }), []);
    const trendColors = useMemo(() => ({
        up: theme.colors.success,
        down: theme.colors.error,
        stable: theme.colors.textSecondary,
    }), [theme]);
    const trendLabels = useMemo(() => ({
        up: 'Trending up',
        down: 'Trending down',
        stable: 'Stable',
    }), []);
    const styles = useMemo(() => ({
        container: {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        svg: {
            transform: 'rotate(-90deg)',
        },
        background: {
            fill: 'none',
            stroke: theme.colors.border,
            strokeWidth: stroke,
        },
        progress: {
            fill: 'none',
            stroke: scoreColor,
            strokeWidth: stroke,
            strokeLinecap: 'round',
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease',
        },
        label: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: fontSize,
            fontWeight: theme.typography.weights.bold,
            color: scoreColor,
        },
        trend: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            fontSize: theme.typography.sizes.sm,
            color: trendColors[trend],
            fontWeight: theme.typography.weights.medium,
        },
        labelText: {
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
    }), [theme, diameter, stroke, scoreColor, offset, circumference, fontSize, trend, trendColors]);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, role: "img", "aria-label": `Reputation score: ${score} out of 100, ${trendLabels[trend]}`, children: [_jsxs("div", { style: { position: 'relative', width: diameter, height: diameter }, children: [_jsxs("svg", { width: diameter, height: diameter, style: styles.svg, "aria-hidden": "true", children: [_jsx("circle", { cx: diameter / 2, cy: diameter / 2, r: radius, style: styles.background }), _jsx("circle", { cx: diameter / 2, cy: diameter / 2, r: radius, style: styles.progress })] }), _jsx("div", { style: styles.label, "aria-hidden": "true", children: score })] }), showTrend && (_jsxs("div", { style: styles.trend, "aria-label": trendLabels[trend], children: [_jsx("span", { "aria-hidden": "true", children: trendIcons[trend] }), _jsx("span", { style: styles.labelText, children: "Reputation" })] }))] }));
});
ReputationScore.displayName = 'ReputationScore';
export const ProfileStatsGrid = memo(({ stats, columns = 3, className, style, }) => {
    const { theme } = useTheme();
    const statItems = useMemo(() => [
        { key: 'tasksCompleted', label: 'Tasks Done', value: stats.tasksCompleted, icon: '✓' },
        { key: 'tasksCompletedThisMonth', label: 'This Month', value: stats.tasksCompletedThisMonth, icon: '📅' },
        { key: 'successRate', label: 'Success Rate', value: `${Math.round(stats.successRate * 100)}%`, icon: '📈' },
        { key: 'averageRating', label: 'Avg Rating', value: stats.averageRating.toFixed(1), icon: '⭐' },
        { key: 'totalReviews', label: 'Reviews', value: stats.totalReviews, icon: '💬' },
        { key: 'currentStreak', label: 'Streak', value: `${stats.currentStreak}d`, icon: '🔥' },
        { key: 'longestStreak', label: 'Best Streak', value: `${stats.longestStreak}d`, icon: '🏆' },
        { key: 'averageResponseTime', label: 'Response', value: `${stats.averageResponseTime}m`, icon: '⚡' },
    ], [stats]);
    const styles = useMemo(() => ({
        container: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: theme.spacing.md,
        },
        statCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            minHeight: '80px',
        },
        icon: {
            fontSize: theme.typography.sizes.xl,
            marginBottom: theme.spacing.sm,
        },
        value: {
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.xs,
        },
        label: {
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
    }), [theme, columns]);
    const handleMouseEnter = useCallback((e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
    }, [theme]);
    const handleMouseLeave = useCallback((e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
    }, []);
    return (_jsx("div", { className: className, style: { ...styles.container, ...style }, role: "list", "aria-label": "Profile statistics", children: statItems.map((stat) => (_jsxs("div", { style: styles.statCard, role: "listitem", "aria-label": `${stat.label}: ${stat.value}`, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: [_jsx("span", { style: styles.icon, "aria-hidden": "true", children: stat.icon }), _jsx("span", { style: styles.value, "aria-hidden": "true", children: stat.value }), _jsx("span", { style: styles.label, children: stat.label })] }, stat.key))) }));
});
ProfileStatsGrid.displayName = 'ProfileStatsGrid';
export const SkillTags = memo(({ skills, maxDisplay, onTagClick, className, style, }) => {
    const { theme } = useTheme();
    const [showAll, setShowAll] = useState(false);
    const displaySkills = useMemo(() => {
        if (!maxDisplay || showAll || skills.length <= maxDisplay)
            return skills;
        return skills.slice(0, maxDisplay);
    }, [skills, maxDisplay, showAll]);
    const hiddenCount = maxDisplay ? skills.length - maxDisplay : 0;
    const styles = useMemo(() => ({
        container: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
        },
        tag: {
            backgroundColor: theme.colors.borderLight,
            color: theme.colors.text,
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            borderRadius: theme.borderRadius.full,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.weights.medium,
            border: `1px solid ${theme.colors.border}`,
            cursor: onTagClick ? 'pointer' : 'default',
            transition: 'background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
            minHeight: '32px',
            display: 'inline-flex',
            alignItems: 'center',
        },
        moreButton: {
            backgroundColor: 'transparent',
            color: theme.colors.primary,
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            borderRadius: theme.borderRadius.full,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.weights.medium,
            border: `1px dashed ${theme.colors.border}`,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
            minHeight: '32px',
        },
    }), [theme, onTagClick]);
    const handleTagClick = useCallback((skill) => {
        if (onTagClick) {
            onTagClick(skill);
        }
    }, [onTagClick]);
    const handleShowAll = useCallback(() => {
        setShowAll(true);
    }, []);
    const handleTagMouseEnter = useCallback((e) => {
        e.currentTarget.style.backgroundColor = theme.colors.border;
        e.currentTarget.style.borderColor = theme.colors.primary;
        if (onTagClick) {
            e.currentTarget.style.transform = 'scale(1.05)';
        }
    }, [theme, onTagClick]);
    const handleTagMouseLeave = useCallback((e) => {
        e.currentTarget.style.backgroundColor = theme.colors.borderLight;
        e.currentTarget.style.borderColor = theme.colors.border;
        e.currentTarget.style.transform = 'scale(1)';
    }, []);
    const handleMoreMouseEnter = useCallback((e) => {
        e.currentTarget.style.backgroundColor = theme.colors.borderLight;
        e.currentTarget.style.borderColor = theme.colors.primary;
    }, [theme]);
    const handleMoreMouseLeave = useCallback((e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = theme.colors.border;
    }, [theme]);
    return (_jsxs("div", { className: className, style: { ...styles.container, ...style }, role: "list", "aria-label": "Skills", children: [displaySkills.map((skill, index) => (_jsx("button", { style: styles.tag, onClick: () => handleTagClick(skill), onMouseEnter: handleTagMouseEnter, onMouseLeave: handleTagMouseLeave, role: "listitem", "aria-label": `Skill: ${skill}${onTagClick ? ', clickable' : ''}`, type: "button", children: skill }, `${skill}-${index}`))), hiddenCount > 0 && !showAll && (_jsxs("button", { style: styles.moreButton, onClick: handleShowAll, onMouseEnter: handleMoreMouseEnter, onMouseLeave: handleMoreMouseLeave, "aria-label": `Show ${hiddenCount} more skills`, type: "button", children: ["+", hiddenCount, " more"] }))] }));
});
SkillTags.displayName = 'SkillTags';
// ============================================================================
// Re-exports for convenience
// ============================================================================
export { calculateLevel, levelProgress, xpForNextLevel, getTierColor, } from './profile.js';
// Default export
export default {
    ProfileCard,
    AchievementBadge,
    LevelProgress,
    ReputationScore,
    ProfileStatsGrid,
    SkillTags,
    ThemeProvider,
    useTheme,
    lightTheme,
    darkTheme,
    formatNumber,
    formatCurrency,
    truncateAddress,
    ProfileErrorBoundary,
    Skeleton,
};
//# sourceMappingURL=profile-components.js.map