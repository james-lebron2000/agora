import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Profile Components for Agora SDK
 *
 * React components for displaying agent profiles, achievements, and stats.
 * Requires React 18+ as a peer dependency.
 */
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { calculateLevel, xpForNextLevel, levelProgress, getTierColor, } from './profile.js';
export const lightTheme = {
    mode: 'light',
    colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#06B6D4',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',
        border: '#E5E7EB',
        borderLight: '#F3F4F6',
        shadow: 'rgba(0, 0, 0, 0.1)',
    },
    typography: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            md: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeights: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
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
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        textMuted: '#6B7280',
        border: '#374151',
        borderLight: '#4B5563',
        shadow: 'rgba(0, 0, 0, 0.3)',
    },
    typography: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            md: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeights: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
    },
};
// Theme Context
const ThemeContext = React.createContext({
    theme: lightTheme,
    setTheme: () => { },
});
export const ThemeProvider = ({ children, theme = lightTheme }) => {
    const [currentTheme, setCurrentTheme] = useState(theme);
    useEffect(() => {
        setCurrentTheme(theme);
    }, [theme]);
    const value = useMemo(() => ({
        theme: currentTheme,
        setTheme: setCurrentTheme,
    }), [currentTheme]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
};
export const useTheme = () => {
    const context = React.useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
// ============================================================================
// Responsive Breakpoints
// ============================================================================
export const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};
export const useResponsive = () => {
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobile = windowWidth < breakpoints.md;
    const isTablet = windowWidth >= breakpoints.md && windowWidth < breakpoints.lg;
    const isDesktop = windowWidth >= breakpoints.lg;
    const isLargeDesktop = windowWidth >= breakpoints.xl;
    const isAbove = useCallback((bp) => windowWidth >= breakpoints[bp], [windowWidth]);
    const isBelow = useCallback((bp) => windowWidth < breakpoints[bp], [windowWidth]);
    return {
        windowWidth,
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        isAbove,
        isBelow,
    };
};
// ============================================================================
// Utility Functions
// ============================================================================
export function formatNumber(num) {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toString();
}
export function formatCurrency(amount, currency = 'USD') {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num);
}
export function truncateAddress(address, chars = 6) {
    if (!address)
        return '';
    if (address.length <= chars * 2 + 2)
        return address;
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
export function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60)
        return 'just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days < 30)
        return `${days}d ago`;
    return formatDate(timestamp);
}
export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
export function getInitials(name) {
    if (!name)
        return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1)
        return name.slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
}
export class ProfileErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Profile component error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { style: { padding: '1rem', textAlign: 'center', color: '#EF4444' }, children: [_jsx("p", { children: "Something went wrong displaying this profile." }), _jsx("button", { onClick: () => this.setState({ hasError: false }), style: {
                            marginTop: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                        }, children: "Try again" })] }));
        }
        return this.props.children;
    }
}
export const Skeleton = ({ width = '100%', height = '1rem', circle = false, className, style, }) => {
    const { theme } = useTheme();
    const skeletonStyle = useMemo(() => ({
        width,
        height,
        borderRadius: circle ? '50%' : theme.borderRadius.md,
        background: `linear-gradient(90deg, ${theme.colors.borderLight} 25%, ${theme.colors.border} 50%, ${theme.colors.borderLight} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
    }), [width, height, circle, theme, style]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      ` }), _jsx("div", { className: className, style: skeletonStyle, "aria-hidden": "true" })] }));
};
export const ProfileAvatar = memo(({ profile, src, name, size = 'md', showStatus = false, status = 'offline', className, style, onClick, }) => {
    const { theme } = useTheme();
    const [imageError, setImageError] = useState(false);
    const displayName = name || profile?.name || 'Unknown';
    const avatarSrc = src || profile?.avatarUrl;
    const initials = getInitials(displayName);
    const bgColor = stringToColor(displayName);
    const sizeConfig = useMemo(() => ({
        xs: { size: '24px', fontSize: theme.typography.sizes.xs },
        sm: { size: '32px', fontSize: theme.typography.sizes.sm },
        md: { size: '48px', fontSize: theme.typography.sizes.lg },
        lg: { size: '64px', fontSize: theme.typography.sizes.xl },
        xl: { size: '96px', fontSize: theme.typography.sizes['2xl'] },
        '2xl': { size: '128px', fontSize: theme.typography.sizes['3xl'] },
    }), [theme]);
    const sizeValue = sizeConfig[size];
    const containerStyle = useMemo(() => ({
        width: sizeValue.size,
        height: sizeValue.size,
        borderRadius: '50%',
        backgroundColor: avatarSrc && !imageError ? 'transparent' : bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        flexShrink: 0,
        ...style,
    }), [sizeValue, avatarSrc, imageError, bgColor, onClick, style]);
    const imageStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    };
    const initialsStyle = {
        fontSize: sizeValue.fontSize,
        fontWeight: theme.typography.weights.bold,
        color: '#FFFFFF',
        userSelect: 'none',
    };
    const statusColors = {
        online: '#10B981',
        away: '#F59E0B',
        offline: '#9CA3AF',
        busy: '#EF4444',
    };
    const statusIndicatorStyle = {
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        width: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
        height: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
        borderRadius: '50%',
        backgroundColor: statusColors[status],
        border: `2px solid ${theme.colors.background}`,
    };
    return (_jsxs("div", { className: className, style: containerStyle, onClick: onClick, role: onClick ? 'button' : 'img', "aria-label": `${displayName}'s avatar`, children: [avatarSrc && !imageError ? (_jsx("img", { src: avatarSrc, alt: displayName, style: imageStyle, onError: () => setImageError(true) })) : (_jsx("span", { style: initialsStyle, children: initials })), showStatus && (_jsx("span", { style: statusIndicatorStyle, "aria-label": `Status: ${status}` }))] }));
});
ProfileAvatar.displayName = 'ProfileAvatar';
export const StatsGrid = memo(({ stats, columns = 4, className, style, }) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const gridStyle = useMemo(() => ({
        display: 'grid',
        gridTemplateColumns: `repeat(${isMobile ? 2 : columns}, 1fr)`,
        gap: theme.spacing.md,
        ...style,
    }), [columns, isMobile, theme, style]);
    const statCardStyle = (index) => ({
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
    });
    const labelStyle = {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };
    const valueContainerStyle = {
        display: 'flex',
        alignItems: 'baseline',
        gap: theme.spacing.sm,
    };
    const valueStyle = {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.text,
    };
    const suffixStyle = {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    };
    const changeStyle = (change) => ({
        fontSize: theme.typography.sizes.xs,
        color: change >= 0 ? theme.colors.success : theme.colors.error,
        fontWeight: theme.typography.weights.medium,
    });
    return (_jsx("div", { className: className, style: gridStyle, role: "list", children: stats.map((stat, index) => (_jsxs("div", { style: statCardStyle(index), role: "listitem", children: [_jsx("span", { style: labelStyle, children: stat.label }), _jsxs("div", { style: valueContainerStyle, children: [_jsxs("span", { style: valueStyle, children: [stat.icon && _jsx("span", { style: { marginRight: theme.spacing.xs }, children: stat.icon }), stat.value] }), stat.suffix && _jsx("span", { style: suffixStyle, children: stat.suffix })] }), stat.change !== undefined && (_jsxs("span", { style: changeStyle(stat.change), children: [stat.change >= 0 ? '↑' : '↓', " ", Math.abs(stat.change), "%"] }))] }, index))) }));
});
StatsGrid.displayName = 'StatsGrid';
export const ProfileCard = memo(({ profile, achievements = [], showAchievements = true, showStats = true, maxAchievements = 6, onEdit, onViewProfile, className, style, }) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const [isHovered, setIsHovered] = useState(false);
    const tierName = useMemo(() => {
        const level = profile.level;
        if (level >= 50)
            return 'Diamond';
        if (level >= 30)
            return 'Platinum';
        if (level >= 20)
            return 'Gold';
        if (level >= 10)
            return 'Silver';
        return 'Bronze';
    }, [profile.level]);
    const tierColor = useMemo(() => {
        const tierMap = {
            'Bronze': '#CD7F32',
            'Silver': '#C0C0C0',
            'Gold': '#FFD700',
            'Platinum': '#E5E4E2',
            'Diamond': '#B9F2FF',
        };
        return tierMap[tierName] || '#CD7F32';
    }, [tierName]);
    const xpProgress = useMemo(() => {
        return levelProgress(profile.xp);
    }, [profile.xp]);
    const xpInLevel = useMemo(() => {
        const currentLevel = calculateLevel(profile.xp);
        const currentLevelBaseXp = (currentLevel - 1) * (currentLevel - 1) * 100;
        return profile.xp - currentLevelBaseXp;
    }, [profile.xp]);
    const xpNeeded = useMemo(() => {
        const currentLevel = calculateLevel(profile.xp);
        return xpForNextLevel(currentLevel);
    }, [profile.xp]);
    const displayedAchievements = useMemo(() => {
        return achievements
            .filter(a => a.unlockedAt || a.completedAt)
            .slice(0, maxAchievements);
    }, [achievements, maxAchievements]);
    const cardStyle = useMemo(() => ({
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: isHovered ? theme.shadows.lg : theme.shadows.md,
        padding: theme.spacing.xl,
        maxWidth: '480px',
        width: '100%',
        transition: 'box-shadow 0.2s ease',
        ...style,
    }), [theme, isHovered, style]);
    const headerStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    };
    const infoStyle = {
        flex: 1,
        minWidth: 0,
    };
    const nameStyle = {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.text,
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    const walletStyle = {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
        marginTop: theme.spacing.xs,
    };
    const tierBadgeStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        backgroundColor: `${tierColor}20`,
        borderRadius: theme.borderRadius.full,
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.semibold,
        color: tierColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginTop: theme.spacing.sm,
    };
    const levelSectionStyle = {
        marginBottom: theme.spacing.lg,
    };
    const levelHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    };
    const levelLabelStyle = {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    };
    const levelValueStyle = {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.text,
    };
    const progressBarContainerStyle = {
        height: '8px',
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
    };
    const progressBarFillStyle = {
        height: '100%',
        background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})`,
        borderRadius: theme.borderRadius.full,
        transition: 'width 0.5s ease',
        width: `${xpProgress * 100}%`,
    };
    const xpTextStyle = {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        textAlign: 'right',
    };
    const achievementsSectionStyle = {
        marginBottom: theme.spacing.lg,
    };
    const sectionTitleStyle = {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };
    const achievementsGridStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    };
    const statsSectionStyle = {
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
    };
    const statItemStyle = {
        textAlign: 'center',
    };
    const statValueStyle = {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.text,
    };
    const statLabelStyle = {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    };
    const actionsStyle = {
        display: 'flex',
        gap: theme.spacing.sm,
    };
    const buttonStyle = (variant = 'primary') => ({
        flex: 1,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        borderRadius: theme.borderRadius.md,
        border: 'none',
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
        cursor: 'pointer',
        backgroundColor: variant === 'primary' ? theme.colors.primary : 'transparent',
        color: variant === 'primary' ? '#FFFFFF' : theme.colors.text,
        borderWidth: variant === 'secondary' ? '1px' : undefined,
        borderStyle: variant === 'secondary' ? 'solid' : undefined,
        borderColor: variant === 'secondary' ? theme.colors.border : undefined,
        transition: 'opacity 0.2s ease, background-color 0.2s ease',
    });
    const bioStyle = {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeights.relaxed,
        marginBottom: theme.spacing.md,
    };
    const skillsContainerStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    };
    const skillTagStyle = {
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.full,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        border: `1px solid ${theme.colors.border}`,
    };
    const verifiedBadgeStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: theme.spacing.xs,
        color: theme.colors.success,
    };
    return (_jsxs("div", { className: className, style: cardStyle, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), role: "article", "aria-label": `${profile.name}'s profile card`, children: [_jsxs("div", { style: headerStyle, children: [_jsx(ProfileAvatar, { profile: profile, size: isMobile ? 'lg' : 'xl' }), _jsxs("div", { style: infoStyle, children: [_jsxs("h3", { style: nameStyle, children: [profile.name, profile.isVerified && (_jsx("span", { style: verifiedBadgeStyle, title: "Verified Agent", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }))] }), _jsx("div", { style: walletStyle, children: truncateAddress(profile.walletAddress) }), _jsxs("div", { style: tierBadgeStyle, children: [_jsx("span", { children: "\u25C6" }), _jsxs("span", { children: [tierName, " Lv.", profile.level] })] })] })] }), profile.bio && (_jsx("p", { style: bioStyle, children: profile.bio })), profile.skills && profile.skills.length > 0 && (_jsxs("div", { style: skillsContainerStyle, children: [profile.skills.slice(0, isMobile ? 4 : 6).map((skill, i) => (_jsx("span", { style: skillTagStyle, children: skill }, i))), profile.skills.length > (isMobile ? 4 : 6) && (_jsxs("span", { style: skillTagStyle, children: ["+", profile.skills.length - (isMobile ? 4 : 6)] }))] })), _jsxs("div", { style: levelSectionStyle, children: [_jsxs("div", { style: levelHeaderStyle, children: [_jsx("span", { style: levelLabelStyle, children: "Level Progress" }), _jsxs("span", { style: levelValueStyle, children: ["Level ", profile.level] })] }), _jsx("div", { style: progressBarContainerStyle, children: _jsx("div", { style: progressBarFillStyle }) }), _jsxs("div", { style: xpTextStyle, children: [formatNumber(xpInLevel), " / ", formatNumber(xpNeeded), " XP"] })] }), showStats && (_jsxs("div", { style: statsSectionStyle, children: [_jsxs("div", { style: statItemStyle, children: [_jsx("div", { style: statValueStyle, children: formatNumber(profile.tasksCompleted) }), _jsx("div", { style: statLabelStyle, children: "Tasks Done" })] }), _jsxs("div", { style: statItemStyle, children: [_jsx("div", { style: statValueStyle, children: profile.reputation }), _jsx("div", { style: statLabelStyle, children: "Reputation" })] }), _jsxs("div", { style: statItemStyle, children: [_jsx("div", { style: statValueStyle, children: formatCurrency(profile.totalEarned) }), _jsx("div", { style: statLabelStyle, children: "Earned" })] })] })), showAchievements && displayedAchievements.length > 0 && (_jsxs("div", { style: achievementsSectionStyle, children: [_jsxs("div", { style: sectionTitleStyle, children: [_jsx("span", { children: "Achievements" }), _jsxs("span", { style: { color: theme.colors.textSecondary, fontWeight: theme.typography.weights.normal }, children: [displayedAchievements.length, "/", achievements.length] })] }), _jsx("div", { style: achievementsGridStyle, children: displayedAchievements.map(achievement => (_jsx(AchievementBadge, { achievement: achievement, size: "md" }, achievement.id))) })] })), _jsxs("div", { style: actionsStyle, children: [onViewProfile && (_jsx("button", { style: buttonStyle('primary'), onClick: onViewProfile, "aria-label": "View full profile", children: "View Profile" })), onEdit && (_jsx("button", { style: buttonStyle('secondary'), onClick: onEdit, "aria-label": "Edit profile", children: "Edit" }))] })] }));
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
export const LevelProgressBar = memo(({ level, xp, showDetails = true, className, style, }) => {
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
LevelProgressBar.displayName = 'LevelProgressBar';
// ============================================================================
// Re-exports for convenience
// ============================================================================
export { calculateLevel, levelProgress, xpForNextLevel, getTierColor, } from './profile.js';
// Default export
export default {
    ProfileCard,
    AchievementBadge,
    LevelProgressBar,
    ProfileAvatar,
    StatsGrid,
    ThemeProvider,
    useTheme,
    useResponsive,
    lightTheme,
    darkTheme,
    formatNumber,
    formatCurrency,
    truncateAddress,
    formatRelativeTime,
    formatDate,
    getInitials,
    stringToColor,
    ProfileErrorBoundary,
    Skeleton,
    breakpoints,
};
//# sourceMappingURL=profile-components.js.map