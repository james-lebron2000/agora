/**
 * Profile Components for Agora SDK
 * 
 * React components for displaying agent profiles, achievements, and stats.
 * Requires React 18+ as a peer dependency.
 */

import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import {
  type AgentProfile,
  type Achievement,
  type ProfileStats,
  calculateLevel,
  xpForNextLevel,
  levelProgress,
  getTierColor,
} from './profile.js';

// ============================================================================
// Theme System
// ============================================================================

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

export const lightTheme: Theme = {
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

export const darkTheme: Theme = {
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
const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: lightTheme,
  setTheme: () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, theme = lightTheme }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(theme);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme: currentTheme,
    setTheme: setCurrentTheme,
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
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

export type Breakpoint = keyof typeof breakpoints;

export const useResponsive = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

  const isAbove = useCallback((bp: Breakpoint) => windowWidth >= breakpoints[bp], [windowWidth]);
  const isBelow = useCallback((bp: Breakpoint) => windowWidth < breakpoints[bp], [windowWidth]);

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

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatCurrency(amount: string | number, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// ============================================================================
// Error Boundary
// ============================================================================

export interface ProfileErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ProfileErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ProfileErrorBoundary extends React.Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ProfileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Profile component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#EF4444' }}>
          <p>Something went wrong displaying this profile.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Skeleton Component
// ============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  circle = false,
  className,
  style,
}) => {
  const { theme } = useTheme();

  const skeletonStyle: React.CSSProperties = useMemo(() => ({
    width,
    height,
    borderRadius: circle ? '50%' : theme.borderRadius.md,
    background: `linear-gradient(90deg, ${theme.colors.borderLight} 25%, ${theme.colors.border} 50%, ${theme.colors.borderLight} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    ...style,
  }), [width, height, circle, theme, style]);

  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className={className} style={skeletonStyle} aria-hidden="true" />
    </>
  );
};

// ============================================================================
// ProfileAvatar Component
// ============================================================================

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

export const ProfileAvatar: React.FC<ProfileAvatarProps> = memo(({
  profile,
  src,
  name,
  size = 'md',
  showStatus = false,
  status = 'offline',
  className,
  style,
  onClick,
}) => {
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

  const containerStyle: React.CSSProperties = useMemo(() => ({
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

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const initialsStyle: React.CSSProperties = {
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

  const statusIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
    height: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
    borderRadius: '50%',
    backgroundColor: statusColors[status],
    border: `2px solid ${theme.colors.background}`,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`${displayName}'s avatar`}
    >
      {avatarSrc && !imageError ? (
        <img
          src={avatarSrc}
          alt={displayName}
          style={imageStyle}
          onError={() => setImageError(true)}
        />
      ) : (
        <span style={initialsStyle}>{initials}</span>
      )}
      {showStatus && (
        <span style={statusIndicatorStyle} aria-label={`Status: ${status}`} />
      )}
    </div>
  );
});

ProfileAvatar.displayName = 'ProfileAvatar';

// ============================================================================
// StatsGrid Component
// ============================================================================

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

export const StatsGrid: React.FC<StatsGridProps> = memo(({
  stats,
  columns = 4,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useResponsive();

  const gridStyle: React.CSSProperties = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${isMobile ? 2 : columns}, 1fr)`,
    gap: theme.spacing.md,
    ...style,
  }), [columns, isMobile, theme, style]);

  const statCardStyle = (index: number): React.CSSProperties => ({
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  });

  const labelStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const valueContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  };

  const suffixStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  };

  const changeStyle = (change: number): React.CSSProperties => ({
    fontSize: theme.typography.sizes.xs,
    color: change >= 0 ? theme.colors.success : theme.colors.error,
    fontWeight: theme.typography.weights.medium,
  });

  return (
    <div className={className} style={gridStyle} role="list">
      {stats.map((stat, index) => (
        <div key={index} style={statCardStyle(index)} role="listitem">
          <span style={labelStyle}>{stat.label}</span>
          <div style={valueContainerStyle}>
            <span style={valueStyle}>
              {stat.icon && <span style={{ marginRight: theme.spacing.xs }}>{stat.icon}</span>}
              {stat.value}
            </span>
            {stat.suffix && <span style={suffixStyle}>{stat.suffix}</span>}
          </div>
          {stat.change !== undefined && (
            <span style={changeStyle(stat.change)}>
              {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';

// ============================================================================
// ProfileCard Component
// ============================================================================

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

export const ProfileCard: React.FC<ProfileCardProps> = memo(({
  profile,
  achievements = [],
  showAchievements = true,
  showStats = true,
  maxAchievements = 6,
  onEdit,
  onViewProfile,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);

  const tierName = useMemo(() => {
    const level = profile.level;
    if (level >= 50) return 'Diamond';
    if (level >= 30) return 'Platinum';
    if (level >= 20) return 'Gold';
    if (level >= 10) return 'Silver';
    return 'Bronze';
  }, [profile.level]);

  const tierColor = useMemo(() => {
    const tierMap: Record<string, string> = {
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

  const cardStyle: React.CSSProperties = useMemo(() => ({
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

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  };

  const infoStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const nameStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const walletStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: theme.spacing.xs,
  };

  const tierBadgeStyle: React.CSSProperties = {
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

  const levelSectionStyle: React.CSSProperties = {
    marginBottom: theme.spacing.lg,
  };

  const levelHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  };

  const levelLabelStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  };

  const levelValueStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  };

  const progressBarContainerStyle: React.CSSProperties = {
    height: '8px',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})`,
    borderRadius: theme.borderRadius.full,
    transition: 'width 0.5s ease',
    width: `${xpProgress * 100}%`,
  };

  const xpTextStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  };

  const achievementsSectionStyle: React.CSSProperties = {
    marginBottom: theme.spacing.lg,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const achievementsGridStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  };

  const statsSectionStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  };

  const statItemStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: theme.spacing.sm,
  };

  const buttonStyle = (variant: 'primary' | 'secondary' = 'primary'): React.CSSProperties => ({
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

  const bioStyle: React.CSSProperties = {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.relaxed,
    marginBottom: theme.spacing.md,
  };

  const skillsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  };

  const skillTagStyle: React.CSSProperties = {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
  };

  const verifiedBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
    color: theme.colors.success,
  };

  return (
    <div
      className={className}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${profile.name}'s profile card`}
    >
      {/* Header */}
      <div style={headerStyle}>
        <ProfileAvatar profile={profile} size={isMobile ? 'lg' : 'xl'} />
        <div style={infoStyle}>
          <h3 style={nameStyle}>
            {profile.name}
            {profile.isVerified && (
              <span style={verifiedBadgeStyle} title="Verified Agent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </span>
            )}
          </h3>
          <div style={walletStyle}>{truncateAddress(profile.walletAddress)}</div>
          <div style={tierBadgeStyle}>
            <span>◆</span>
            <span>{tierName} Lv.{profile.level}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p style={bioStyle}>{profile.bio}</p>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div style={skillsContainerStyle}>
          {profile.skills.slice(0, isMobile ? 4 : 6).map((skill, i) => (
            <span key={i} style={skillTagStyle}>{skill}</span>
          ))}
          {profile.skills.length > (isMobile ? 4 : 6) && (
            <span style={skillTagStyle}>+{profile.skills.length - (isMobile ? 4 : 6)}</span>
          )}
        </div>
      )}

      {/* Level Progress */}
      <div style={levelSectionStyle}>
        <div style={levelHeaderStyle}>
          <span style={levelLabelStyle}>Level Progress</span>
          <span style={levelValueStyle}>Level {profile.level}</span>
        </div>
        <div style={progressBarContainerStyle}>
          <div style={progressBarFillStyle} />
        </div>
        <div style={xpTextStyle}>
          {formatNumber(xpInLevel)} / {formatNumber(xpNeeded)} XP
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div style={statsSectionStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatNumber(profile.tasksCompleted)}</div>
            <div style={statLabelStyle}>Tasks Done</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{profile.reputation}</div>
            <div style={statLabelStyle}>Reputation</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatCurrency(profile.totalEarned)}</div>
            <div style={statLabelStyle}>Earned</div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {showAchievements && displayedAchievements.length > 0 && (
        <div style={achievementsSectionStyle}>
          <div style={sectionTitleStyle}>
            <span>Achievements</span>
            <span style={{ color: theme.colors.textSecondary, fontWeight: theme.typography.weights.normal }}>
              {displayedAchievements.length}/{achievements.length}
            </span>
          </div>
          <div style={achievementsGridStyle}>
            {displayedAchievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={actionsStyle}>
        {onViewProfile && (
          <button
            style={buttonStyle('primary')}
            onClick={onViewProfile}
            aria-label="View full profile"
          >
            View Profile
          </button>
        )}
        {onEdit && (
          <button
            style={buttonStyle('secondary')}
            onClick={onEdit}
            aria-label="Edit profile"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
});

ProfileCard.displayName = 'ProfileCard';

// ============================================================================
// AchievementBadge Component
// ============================================================================

export interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = memo(({
  achievement,
  size = 'md',
  showTooltip = true,
  className,
  style,
}) => {
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
      position: 'relative' as const,
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
    } as React.CSSProperties,
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
    } as React.CSSProperties,
    icon: {
      fontSize: sizeValue.fontSize,
      filter: isUnlocked ? 'none' : 'grayscale(100%)',
      opacity: isUnlocked ? 1 : 0.5,
    } as React.CSSProperties,
    progressRing: {
      position: 'absolute' as const,
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
    } as React.CSSProperties,
    tooltip: {
      position: 'absolute' as const,
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
    } as React.CSSProperties,
    tooltipTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    } as React.CSSProperties,
    tooltipDesc: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    } as React.CSSProperties,
    tooltipTier: {
      fontSize: theme.typography.sizes.xs,
      color: tierColor,
      fontWeight: theme.typography.weights.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,
    tooltipProgress: {
      marginTop: theme.spacing.sm,
      height: '4px',
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    } as React.CSSProperties,
    tooltipProgressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      width: `${progress}%`,
      transition: 'width 0.3s ease',
    } as React.CSSProperties,
  }), [theme, sizeValue, tierColor, isUnlocked, progress, isHovered, isTouched, showTooltip, size]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleTouchStart = useCallback(() => setIsTouched(true), []);
  const handleTouchEnd = useCallback(() => setIsTouched(false), []);

  const ariaLabel = isUnlocked 
    ? `${achievement.name} achievement unlocked - ${achievement.tier} tier`
    : `${achievement.name} achievement - ${achievement.tier} tier - ${Math.round(progress)}% progress`;

  return (
    <button
      className={className}
      style={{ ...styles.container, ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={ariaLabel}
      type="button"
    >
      <div style={styles.badge}>
        <span style={styles.icon} aria-hidden="true">{achievement.icon}</span>
        {!isUnlocked && progress > 0 && (
          <span style={styles.progressRing} aria-hidden="true">{Math.round(progress)}%</span>
        )}
      </div>
      {showTooltip && (
        <div style={styles.tooltip} role="tooltip" aria-hidden={!(isHovered || isTouched)}>
          <div style={styles.tooltipTitle}>{achievement.name}</div>
          <div style={styles.tooltipDesc}>{achievement.description}</div>
          <div style={styles.tooltipTier}>{achievement.tier} Tier</div>
          {!isUnlocked && (
            <div 
              style={styles.tooltipProgress} 
              role="progressbar" 
              aria-valuenow={Math.round(progress)} 
              aria-valuemin={0} 
              aria-valuemax={100}
            >
              <div style={styles.tooltipProgressFill} />
            </div>
          )}
        </div>
      )}
    </button>
  );
});

AchievementBadge.displayName = 'AchievementBadge';

// ============================================================================
// LevelProgress Component (LevelProgressBar in exports)
// ============================================================================

export interface LevelProgressBarProps {
  level: number;
  xp: number;
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = memo(({
  level,
  xp,
  showDetails = true,
  className,
  style,
}) => {
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
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    } as React.CSSProperties,
    levelBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as React.CSSProperties,
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
    } as React.CSSProperties,
    levelInfo: {
      display: 'flex',
      flexDirection: 'column' as const,
    } as React.CSSProperties,
    levelLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    } as React.CSSProperties,
    levelValue: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    } as React.CSSProperties,
    progressContainer: {
      position: 'relative' as const,
      height: '12px',
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    } as React.CSSProperties,
    progressBar: {
      height: '100%',
      background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})`,
      borderRadius: theme.borderRadius.full,
      transition: 'width 0.5s ease',
      width: `${progress * 100}%`,
    } as React.CSSProperties,
    progressGlow: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
      animation: 'shimmer 2s infinite',
    } as React.CSSProperties,
    details: {
      marginTop: theme.spacing.md,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    } as React.CSSProperties,
    xpValue: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semibold,
    } as React.CSSProperties,
  }), [theme, tierColor, progress]);

  const progressPercent = Math.round(progress * 100);

  return (
    <div 
      className={className} 
      style={{ ...styles.container, ...style }} 
      role="region" 
      aria-label={`Level ${level} progress`}
    >
      <div style={styles.header}>
        <div style={styles.levelBadge}>
          <div style={styles.levelNumber} aria-label={`Level ${level}`}>{level}</div>
          <div style={styles.levelInfo}>
            <span style={styles.levelLabel}>Current Level</span>
            <span style={styles.levelValue} aria-label={`Tier: ${tierName}`}>{tierName}</span>
          </div>
        </div>
      </div>

      <div 
        style={styles.progressContainer} 
        role="progressbar" 
        aria-valuenow={progressPercent} 
        aria-valuemin={0} 
        aria-valuemax={100}
        aria-label={`${progressPercent}% progress to level ${level + 1}`}
      >
        <div style={styles.progressBar} />
        <div style={styles.progressGlow} aria-hidden="true" />
      </div>

      {showDetails && (
        <div style={styles.details}>
          <span>
            <span style={styles.xpValue} aria-label={`${formatNumber(xpInLevel)} XP in current level`}>
              {formatNumber(xpInLevel)}
            </span> 
            <span aria-label={`out of ${formatNumber(xpNeeded)} XP needed`}> / {formatNumber(xpNeeded)} XP</span>
          </span>
          <span aria-label={`${progressPercent}% to level ${level + 1}`}>
            {progressPercent}% to Lv.{level + 1}
          </span>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
});

LevelProgressBar.displayName = 'LevelProgressBar';

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  AgentProfile,
  Achievement,
  ProfileStats,
  calculateLevel,
  levelProgress,
  xpForNextLevel,
  getTierColor,
} from './profile.js';

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