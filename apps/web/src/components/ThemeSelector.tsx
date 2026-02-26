import React from 'react';
import { motion } from 'framer-motion';
import { Check, Palette, Sparkles, Zap, Minimize2 } from 'lucide-react';
import { useProfileTheme, themes, type ProfileTheme } from '../contexts/ProfileThemeContext';

interface ThemeSelectorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Theme Selector Component
 * 
 * Allows users to select from available profile themes:
 * - Default (clean, professional)
 * - Cyberpunk (neon, futuristic)
 * - Minimal (simple, elegant)
 */
export function ThemeSelector({ className = '', showLabel = true }: ThemeSelectorProps) {
  const { theme, setTheme, themeConfig } = useProfileTheme();

  const themeOptions: { id: ProfileTheme; name: string; icon: typeof Palette; description: string; preview: string }[] = [
    {
      id: 'default',
      name: 'Default',
      icon: Palette,
      description: 'Clean and professional',
      preview: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      icon: Zap,
      description: 'Neon futuristic vibes',
      preview: 'from-cyan-500 via-purple-500 to-pink-500',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      icon: Minimize2,
      description: 'Simple and elegant',
      preview: 'from-gray-700 to-gray-900',
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-agora-500" />
          <span className="text-sm font-medium text-gray-700">Profile Theme</span>
          <span className="text-xs text-gray-400 capitalize">({themeConfig.name})</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;

          return (
            <motion.button
              key={option.id}
              onClick={() => setTheme(option.id)}
              className={`
                relative p-3 rounded-xl border-2 transition-all
                ${isActive 
                  ? 'border-agora-500 bg-agora-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Preview Gradient */}
              <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${option.preview} mb-2`} />
              
              {/* Icon and Name */}
              <div className="flex items-center justify-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-agora-600' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-agora-700' : 'text-gray-600'}`}>
                  {option.name}
                </span>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-agora-500 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Your theme preference is saved and will persist across sessions.
      </p>
    </div>
  );
}

/**
 * Compact Theme Toggle Button
 * 
 * Quick toggle between themes without opening settings
 */
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, themeConfig } = useProfileTheme();

  const getIcon = () => {
    switch (theme) {
      case 'cyberpunk':
        return <Zap className="w-4 h-4" />;
      case 'minimal':
        return <Minimize2 className="w-4 h-4" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        inline-flex items-center gap-2 px-3 py-2
        bg-white border border-gray-200
        text-gray-700 rounded-xl
        text-sm font-medium
        shadow-sm
        hover:shadow-md hover:border-gray-300
        transition-all
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={`Current theme: ${themeConfig.name}. Click to cycle.`}
    >
      {getIcon()}
      <span className="hidden sm:inline">{themeConfig.name}</span>
    </motion.button>
  );
}

export default ThemeSelector;
