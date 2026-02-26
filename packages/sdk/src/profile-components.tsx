/**
 * React Components for Agora Agent Profile Module
 * 
 * Provides reusable UI components for displaying agent profiles,
 * achievements, stats, and related data.
 * 
 * @module profile-components
 */

import React, { useCallback, useMemo, useState, useEffect, memo } from 'react';
import {
  AgentProfile,
  Achievement,
  ProfileStats,
  calculateLevel,
  levelProgress,
  xpForNextLevel,
  getTierColor,
} from './profile.js';

// ============================================================================
// Theme Types & Context
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

export const lightTheme: Theme = {
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

export const darkTheme: Theme = {
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

// ============================================================================
// Theme Context
// ============================================================================

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme | ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: lightTheme,
  setTheme: () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = memo(({
  children,
  defaultTheme = 'light',
}) => {
  const [theme, setThemeState] = useState<Theme>(
    defaultTheme === 'dark' ? darkTheme : lightTheme
  );

  const setTheme = useCallback((newTheme: Theme | ThemeMode) => {
    if (typeof newTheme === 'string') {
      setThemeState(newTheme === 'dark' ? darkTheme : lightTheme);
    } else {
      setThemeState(newTheme);
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
});

ThemeProvider.displayName = 'ThemeProvider';

export const useTheme = (): ThemeContextValue => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// ============================================================================
// Utility Functions
// ============================================================================

export function formatNumber(num: number, decimals = 0): string {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

export function formatCurrency(value: string | number, currency = '$'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${currency}0.00`;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end + 2) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ProfileErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert" aria-live="assertive" style={{ padding: '1rem', color: '#DC2626' }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// Loading Skeleton Component
// ============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = memo(({
  width = '100%',
  height = '1rem',
  circle = false,
  className,
  style,
}) => {
  const { theme } = useTheme();
  
  const skeletonStyle = useMemo(() => ({
    width,
    height,
    borderRadius: circle ? '50%' : theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    ...style,
  } as React.CSSProperties), [width, height, circle, theme, style]);

  return (
    <>
      <div className={className} style={skeletonStyle} aria-hidden="true" />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
});

Skeleton.displayName = 'Skeleton';

// ============================================================================
// ProfileCard Component
// ============================================================================

export interface ProfileCardProps {
  profile: AgentProfile;
  variant?: 'compact' | 'full' | 'minimal';
  showAvatar?: boolean;
  showStats?: boolean;
  onEdit?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ProfileCard: React.FC<ProfileCardProps> = memo(({
  profile,
  variant = 'full',
  showAvatar = true,
  showStats = true,
  onEdit,
  className,
  style,
}) => {
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
        position: 'relative' as const,
      } as React.CSSProperties,
      header: {
        display: 'flex',
        alignItems: isMinimal ? 'center' : 'flex-start',
        gap: theme.spacing.md,
        marginBottom: isMinimal ? 0 : theme.spacing.md,
      } as React.CSSProperties,
      avatar: {
        width: isCompact ? '48px' : isMinimal ? '32px' : '80px',
        height: isCompact ? '48px' : isMinimal ? '32px' : '80px',
        borderRadius: theme.borderRadius.full,
        objectFit: 'cover' as const,
        border: `3px solid ${tierColor}`,
        backgroundColor: theme.colors.borderLight,
      } as React.CSSProperties,
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
      } as React.CSSProperties,
      info: {
        flex: 1,
        minWidth: 0,
      } as React.CSSProperties,
      name: {
        fontSize: isMinimal ? theme.typography.sizes.sm : theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.text,
        margin: 0,
        marginBottom: isMinimal ? 0 : theme.spacing.xs,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      } as React.CSSProperties,
      level: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
      } as React.CSSProperties,
      levelBadge: {
        backgroundColor: tierColor,
        color: '#000000',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.borderRadius.full,
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.bold,
      } as React.CSSProperties,
      bio: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        margin: `${theme.spacing.sm} 0`,
        lineHeight: 1.5,
        display: isMinimal ? 'none' : '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      } as React.CSSProperties,
      stats: {
        display: 'grid',
        gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTop: `1px solid ${theme.colors.border}`,
      } as React.CSSProperties,
      stat: {
        textAlign: 'center' as const,
      } as React.CSSProperties,
      statValue: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.text,
      } as React.CSSProperties,
      statLabel: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      } as React.CSSProperties,
      progressBar: {
        height: '4px',
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        marginTop: theme.spacing.sm,
        overflow: 'hidden',
      } as React.CSSProperties,
      progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
        transition: 'width 0.3s ease',
        width: `${progress * 100}%`,
      } as React.CSSProperties,
      editButton: {
        position: 'absolute' as const,
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
      } as React.CSSProperties,
      verifiedBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: theme.spacing.xs,
        color: theme.colors.primary,
      } as React.CSSProperties,
    };
  }, [theme, variant, tierColor, progress]);

  // Event handlers with useCallback
  const handleEditClick = useCallback(() => {
    onEdit?.();
  }, [onEdit]);

  const handleEditMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.colors.borderLight;
    e.currentTarget.style.transform = 'scale(1.05)';
  }, [theme]);

  const handleEditMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

  const isMinimal = variant === 'minimal';
  const progressPercent = Math.round(progress * 100);

  return (
    <article
      className={className}
      style={{ ...styles.container, ...style }}
      role="article"
      aria-label={`${profile.name}'s profile card`}
    >
      {onEdit && variant === 'full' && (
        <button
          onClick={handleEditClick}
          onMouseEnter={handleEditMouseEnter}
          onMouseLeave={handleEditMouseLeave}
          style={styles.editButton}
          aria-label="Edit profile"
          title="Edit profile"
          type="button"
        >
          ✏️
        </button>
      )}

      <div style={styles.header}>
        {showAvatar && (
          profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.name}'s avatar`}
              style={styles.avatar}
              loading="lazy"
            />
          ) : (
            <div style={styles.avatarPlaceholder} aria-hidden="true">
              {initials}
            </div>
          )
        )}
        <div style={styles.info}>
          <h3 style={styles.name}>
            {profile.name}
            {profile.isVerified && (
              <span 
                style={styles.verifiedBadge} 
                title="Verified account"
                aria-label="Verified account"
              >
                ✓
              </span>
            )}
          </h3>
          {!isMinimal && (
            <div style={styles.level}>
              <span style={styles.levelBadge} aria-label={`Level ${level}`}>Lv.{level}</span>
              <span aria-label={`${progressPercent}% progress to next level`}>
                {progressPercent}% to next level
              </span>
            </div>
          )}
        </div>
      </div>

      {!isMinimal && profile.bio && (
        <p style={styles.bio}>{profile.bio}</p>
      )}

      {!isMinimal && (
        <div 
          style={styles.progressBar} 
          role="progressbar" 
          aria-valuenow={progressPercent} 
          aria-valuemin={0} 
          aria-valuemax={100}
          aria-label="Level progress"
        >
          <div style={styles.progressFill} />
        </div>
      )}

      {showStats && !isMinimal && (
        <div style={styles.stats} role="list" aria-label="Profile statistics">
          <div style={styles.stat} role="listitem">
            <div style={styles.statValue} aria-label={`${profile.tasksCompleted} tasks completed`}>
              {profile.tasksCompleted}
            </div>
            <div style={styles.statLabel}>Tasks</div>
          </div>
          <div style={styles.stat} role="listitem">
            <div style={styles.statValue} aria-label={`Total earned: ${formatCurrency(profile.totalEarned)}`}>
              {formatCurrency(profile.totalEarned)}
            </div>
            <div style={styles.statLabel}>Earned</div>
          </div>
          {variant === 'full' && (
            <div style={styles.stat} role="listitem">
              <div style={styles.statValue} aria-label={`Reputation: ${profile.reputation}`}>
                {profile.reputation}
              </div>
              <div style={styles.statLabel}>Rep</div>
            </div>
          )}
        </div>
      )}
    </article>
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
// LevelProgress Component
// ============================================================================

export interface LevelProgressProps {
  level: number;
  xp: number;
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LevelProgress: React.FC<LevelProgressProps> = memo(({
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

LevelProgress.displayName = 'LevelProgress';

// ============================================================================
// ReputationScore Component
// ============================================================================

export interface ReputationScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
  style?: React.CSSProperties;
}

export const ReputationScore: React.FC<ReputationScoreProps> = memo(({
  score,
  size = 'md',
  showTrend = true,
  trend = 'stable',
  className,
  style,
}) => {
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
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.primary;
    if (score >= 50) return theme.colors.warning;
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
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as React.CSSProperties,
    svg: {
      transform: 'rotate(-90deg)',
    } as React.CSSProperties,
    background: {
      fill: 'none',
      stroke: theme.colors.border,
      strokeWidth: stroke,
    } as React.CSSProperties,
    progress: {
      fill: 'none',
      stroke: scoreColor,
      strokeWidth: stroke,
      strokeLinecap: 'round' as const,
      strokeDasharray: circumference,
      strokeDashoffset: offset,
      transition: 'stroke-dashoffset 0.5s ease',
    } as React.CSSProperties,
    label: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: fontSize,
      fontWeight: theme.typography.weights.bold,
      color: scoreColor,
    } as React.CSSProperties,
    trend: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
      fontSize: theme.typography.sizes.sm,
      color: trendColors[trend],
      fontWeight: theme.typography.weights.medium,
    } as React.CSSProperties,
    labelText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,
  }), [theme, diameter, stroke, scoreColor, offset, circumference, fontSize, trend, trendColors]);

  return (
    <div 
      className={className} 
      style={{ ...styles.container, ...style }} 
      role="img" 
      aria-label={`Reputation score: ${score} out of 100, ${trendLabels[trend]}`}
    >
      <div style={{ position: 'relative', width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} style={styles.svg} aria-hidden="true">
          <circle cx={diameter / 2} cy={diameter / 2} r={radius} style={styles.background} />
          <circle cx={diameter / 2} cy={diameter / 2} r={radius} style={styles.progress} />
        </svg>
        <div style={styles.label} aria-hidden="true">{score}</div>
      </div>
      {showTrend && (
        <div style={styles.trend} aria-label={trendLabels[trend]}>
          <span aria-hidden="true">{trendIcons[trend]}</span>
          <span style={styles.labelText}>Reputation</span>
        </div>
      )}
    </div>
  );
});

ReputationScore.displayName = 'ReputationScore';

// ============================================================================
// ProfileStatsGrid Component
// ============================================================================

export interface ProfileStatsGridProps {
  stats: ProfileStats;
  columns?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}

export const ProfileStatsGrid: React.FC<ProfileStatsGridProps> = memo(({
  stats,
  columns = 3,
  className,
  style,
}) => {
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
    } as React.CSSProperties,
    statCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      border: `1px solid ${theme.colors.border}`,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      textAlign: 'center' as const,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      minHeight: '80px',
    } as React.CSSProperties,
    icon: {
      fontSize: theme.typography.sizes.xl,
      marginBottom: theme.spacing.sm,
    } as React.CSSProperties,
    value: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    } as React.CSSProperties,
    label: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,
  }), [theme, columns]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = theme.shadows.md;
  }, [theme]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }, []);

  return (
    <div className={className} style={{ ...styles.container, ...style }} role="list" aria-label="Profile statistics">
      {statItems.map((stat) => (
        <div
          key={stat.key}
          style={styles.statCard}
          role="listitem"
          aria-label={`${stat.label}: ${stat.value}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span style={styles.icon} aria-hidden="true">{stat.icon}</span>
          <span style={styles.value} aria-hidden="true">{stat.value}</span>
          <span style={styles.label}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
});

ProfileStatsGrid.displayName = 'ProfileStatsGrid';

// ============================================================================
// SkillTags Component
// ============================================================================

export interface SkillTagsProps {
  skills: string[];
  maxDisplay?: number;
  onTagClick?: (skill: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SkillTags: React.FC<SkillTagsProps> = memo(({
  skills,
  maxDisplay,
  onTagClick,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const displaySkills = useMemo(() => {
    if (!maxDisplay || showAll || skills.length <= maxDisplay) return skills;
    return skills.slice(0, maxDisplay);
  }, [skills, maxDisplay, showAll]);

  const hiddenCount = maxDisplay ? skills.length - maxDisplay : 0;

  const styles = useMemo(() => ({
    container: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: theme.spacing.sm,
    } as React.CSSProperties,
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
    } as React.CSSProperties,
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
    } as React.CSSProperties,
  }), [theme, onTagClick]);

  const handleTagClick = useCallback((skill: string) => {
    if (onTagClick) {
      onTagClick(skill);
    }
  }, [onTagClick]);

  const handleShowAll = useCallback(() => {
    setShowAll(true);
  }, []);

  const handleTagMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.colors.border;
    e.currentTarget.style.borderColor = theme.colors.primary;
    if (onTagClick) {
      e.currentTarget.style.transform = 'scale(1.05)';
    }
  }, [theme, onTagClick]);

  const handleTagMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.colors.borderLight;
    e.currentTarget.style.borderColor = theme.colors.border;
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

  const handleMoreMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.colors.borderLight;
    e.currentTarget.style.borderColor = theme.colors.primary;
  }, [theme]);

  const handleMoreMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderColor = theme.colors.border;
  }, [theme]);

  return (
    <div className={className} style={{ ...styles.container, ...style }} role="list" aria-label="Skills">
      {displaySkills.map((skill, index) => (
        <button
          key={`${skill}-${index}`}
          style={styles.tag}
          onClick={() => handleTagClick(skill)}
          onMouseEnter={handleTagMouseEnter}
          onMouseLeave={handleTagMouseLeave}
          role="listitem"
          aria-label={`Skill: ${skill}${onTagClick ? ', clickable' : ''}`}
          type="button"
        >
          {skill}
        </button>
      ))}
      {hiddenCount > 0 && !showAll && (
        <button
          style={styles.moreButton}
          onClick={handleShowAll}
          onMouseEnter={handleMoreMouseEnter}
          onMouseLeave={handleMoreMouseLeave}
          aria-label={`Show ${hiddenCount} more skills`}
          type="button"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
});

SkillTags.displayName = 'SkillTags';

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
