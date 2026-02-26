import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ProfileTheme = 'default' | 'cyberpunk' | 'minimal';

export interface ThemeConfig {
  name: string;
  // Colors
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  // Gradients
  gradientPrimary: string;
  gradientSurface: string;
  // Effects
  glowColor: string;
  borderRadius: string;
  shadowStyle: string;
  // Typography
  fontFamily: string;
  // Animations
  animationSpeed: 'slow' | 'normal' | 'fast';
}

const themes: Record<ProfileTheme, ThemeConfig> = {
  default: {
    name: 'Default',
    primary: '#0052FF',
    secondary: '#2775CA',
    accent: '#10b981',
    background: 'from-agora-50 to-agora-100/50',
    surface: 'bg-white',
    text: 'text-agora-900',
    textMuted: 'text-agora-500',
    border: 'border-agora-100',
    gradientPrimary: 'from-agora-900 to-agora-700',
    gradientSurface: 'from-agora-50 to-transparent',
    glowColor: 'shadow-agora-500/20',
    borderRadius: 'rounded-2xl',
    shadowStyle: 'shadow-sm hover:shadow-md',
    fontFamily: 'font-sans',
    animationSpeed: 'normal',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    primary: '#00f0ff',
    secondary: '#ff00ff',
    accent: '#39ff14',
    background: 'from-slate-950 via-purple-950 to-slate-950',
    surface: 'bg-slate-900/80',
    text: 'text-cyan-50',
    textMuted: 'text-cyan-400/60',
    border: 'border-cyan-500/30',
    gradientPrimary: 'from-cyan-600 via-purple-600 to-pink-600',
    gradientSurface: 'from-cyan-950/50 to-transparent',
    glowColor: 'shadow-cyan-500/30',
    borderRadius: 'rounded-xl',
    shadowStyle: 'shadow-lg shadow-cyan-500/10',
    fontFamily: 'font-mono',
    animationSpeed: 'fast',
  },
  minimal: {
    name: 'Minimal',
    primary: '#171717',
    secondary: '#525252',
    accent: '#171717',
    background: 'from-neutral-50 to-white',
    surface: 'bg-white',
    text: 'text-neutral-900',
    textMuted: 'text-neutral-400',
    border: 'border-neutral-200',
    gradientPrimary: 'from-neutral-800 to-neutral-600',
    gradientSurface: 'from-neutral-100 to-transparent',
    glowColor: 'shadow-neutral-500/10',
    borderRadius: 'rounded-lg',
    shadowStyle: 'shadow-none border',
    fontFamily: 'font-sans',
    animationSpeed: 'slow',
  },
};

interface ProfileThemeContextType {
  theme: ProfileTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: ProfileTheme) => void;
  toggleTheme: () => void;
  availableThemes: ProfileTheme[];
}

const ProfileThemeContext = createContext<ProfileThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'agora:profile-theme';

export function ProfileThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ProfileTheme>('default');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in themes) {
      setThemeState(stored as ProfileTheme);
    }
    setIsInitialized(true);
  }, []);

  // Save theme to localStorage when it changes
  const setTheme = useCallback((newTheme: ProfileTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('profile-theme-change', { detail: newTheme }));
    }
  }, []);

  // Cycle through themes
  const toggleTheme = useCallback(() => {
    const available: ProfileTheme[] = ['default', 'cyberpunk', 'minimal'];
    const currentIndex = available.indexOf(theme);
    const nextIndex = (currentIndex + 1) % available.length;
    setTheme(available[nextIndex]);
  }, [theme, setTheme]);

  // Listen for theme changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue in themes) {
        setThemeState(e.newValue as ProfileTheme);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value: ProfileThemeContextType = {
    theme,
    themeConfig: themes[theme],
    setTheme,
    toggleTheme,
    availableThemes: Object.keys(themes) as ProfileTheme[],
  };

  // Prevent flash of unstyled content
  if (!isInitialized) {
    return <>{children}</>;
  }

  return (
    <ProfileThemeContext.Provider value={value}>
      {children}
    </ProfileThemeContext.Provider>
  );
}

export function useProfileTheme() {
  const context = useContext(ProfileThemeContext);
  if (context === undefined) {
    throw new Error('useProfileTheme must be used within a ProfileThemeProvider');
  }
  return context;
}

export function getThemeConfig(theme: ProfileTheme): ThemeConfig {
  return themes[theme];
}

export { themes };
