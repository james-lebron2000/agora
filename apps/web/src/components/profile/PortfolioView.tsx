/**
 * PortfolioView Component
 * 
 * Displays agent's token portfolio with multiple view modes,
 * sorting options, and responsive design.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Grid3X3,
  List,
  PieChart,
  RefreshCw,
  ChevronDown,
  Search,
  ArrowUpDown,
  ExternalLink,
  Layers,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useProfileTheme } from '../../contexts/ProfileThemeContext';
import type { 
  PortfolioViewProps, 
  PortfolioData, 
  PortfolioAsset,
  PortfolioViewMode,
  PortfolioSortBy 
} from './types';

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return `$${num.toFixed(2)}`;
  if (num >= 0.01) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(6)}`;
}

function formatNumber(value: string | number, decimals = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(decimals);
}

function getChainIcon(chain: string): string {
  const chainIcons: Record<string, string> = {
    ethereum: '🔷',
    base: '🔵',
    optimism: '🔴',
    arbitrum: '🔵',
    polygon: '💜',
    solana: '🟣',
    bitcoin: '🟠',
  };
  return chainIcons[chain.toLowerCase()] || '⛓️';
}

function getChainColor(chain: string): string {
  const chainColors: Record<string, string> = {
    ethereum: 'bg-blue-100 text-blue-700',
    base: 'bg-blue-50 text-blue-600',
    optimism: 'bg-red-100 text-red-700',
    arbitrum: 'bg-blue-100 text-blue-800',
    polygon: 'bg-purple-100 text-purple-700',
    solana: 'bg-violet-100 text-violet-700',
    bitcoin: 'bg-orange-100 text-orange-700',
  };
  return chainColors[chain.toLowerCase()] || 'bg-gray-100 text-gray-700';
}

// ============================================================================
// Asset Card Component (Grid View)
// ============================================================================

interface AssetCardProps {
  asset: PortfolioAsset;
  totalValue: number;
  onClick?: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, totalValue, onClick }) => {
  const { themeConfig } = useProfileTheme();
  const percentage = totalValue > 0 ? (parseFloat(asset.balanceUsd) / totalValue) * 100 : 0;
  const isPositiveChange = asset.change24h >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl p-4 cursor-pointer
        ${themeConfig.surface} 
        ${themeConfig.border} border
        hover:shadow-lg transition-all
      `}
    >
      {/* Progress bar background */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {asset.icon ? (
            <img src={asset.icon} alt={asset.id} className="w-10 h-10 rounded-full" />
          ) : (
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${themeConfig.background}
            `}>
              <span className="text-lg">{asset.id.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          
          <div>
            <div className={`font-semibold ${themeConfig.text}`}>{asset.name}</div>
            <div className={`text-xs ${themeConfig.textMuted} uppercase`}>{asset.id}</div>
          </div>
        </div>

        <div className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${getChainColor(asset.chain)}
        `}>
          {getChainIcon(asset.chain)} {asset.chain}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className={`text-xl font-bold ${themeConfig.text}`}>
          {formatCurrency(asset.balanceUsd)}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={themeConfig.textMuted}>
            {formatNumber(asset.balance)} {asset.id}
          </span>
          <span className={`flex items-center gap-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveChange ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(asset.change24h).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className={`mt-3 text-xs ${themeConfig.textMuted}`}>
        {percentage.toFixed(1)}% of portfolio
      </div>
    </motion.div>
  );
};

// ============================================================================
// Asset List Item Component (List View)
// ============================================================================

interface AssetListItemProps {
  asset: PortfolioAsset;
  totalValue: number;
  onClick?: () => void;
}

const AssetListItem: React.FC<AssetListItemProps> = ({ asset, totalValue, onClick }) => {
  const { themeConfig } = useProfileTheme();
  const percentage = totalValue > 0 ? (parseFloat(asset.balanceUsd) / totalValue) * 100 : 0;
  const isPositiveChange = asset.change24h >= 0;

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 cursor-pointer
        ${themeConfig.border} border-b last:border-b-0
        transition-colors
      `}
    >
      {/* Icon */}
      {asset.icon ? (
        <img src={asset.icon} alt={asset.id} className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${themeConfig.background}
        `}>
          <span className="text-lg">{asset.id.slice(0, 2).toUpperCase()}</span>
        </div>
      )}

      {/* Name & Chain */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${themeConfig.text}`}>{asset.name}</div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${themeConfig.textMuted} uppercase`}>{asset.id}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${getChainColor(asset.chain)}`}>
            {asset.chain}
          </span>
        </div>
      </div>

      {/* Balance */}
      <div className="text-right shrink-0 hidden sm:block">
        <div className={`font-medium ${themeConfig.text}`}>
          {formatNumber(asset.balance)} {asset.id}
        </div>
        <div className={`text-sm ${themeConfig.textMuted}`}>
          @ {formatCurrency(asset.price)}
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0 w-32">
        <div className={`font-semibold ${themeConfig.text}`}>
          {formatCurrency(asset.balanceUsd)}
        </div>
        <div className={`text-xs ${themeConfig.textMuted}`}>
          {percentage.toFixed(1)}%
        </div>
      </div>

      {/* 24h Change */}
      <div className="text-right shrink-0 w-24 hidden md:block">
        <div className={`flex items-center justify-end gap-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
          {isPositiveChange ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(asset.change24h).toFixed(2)}%
        </div>
      </div>

      {/* External link */}
      <ExternalLink size={16} className={`shrink-0 ${themeConfig.textMuted} hidden lg:block`} />
    </motion.div>
  );
};

// ============================================================================
// Portfolio Chart Component
// ============================================================================

interface PortfolioChartProps {
  assets: PortfolioAsset[];
  totalValue: number;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ assets, totalValue }) => {
  const { themeConfig } = useProfileTheme();
  
  // Calculate angles for pie chart
  const chartData = useMemo(() => {
    let currentAngle = 0;
    return assets.map((asset, index) => {
      const percentage = totalValue > 0 ? (parseFloat(asset.balanceUsd) / totalValue) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', 
        '#ef4444', '#ec4899', '#06b6d4', '#84cc16'
      ];
      
      return {
        ...asset,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: colors[index % colors.length],
      };
    });
  }, [assets, totalValue]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            {chartData.map((item, index) => {
              const startAngle = (item.startAngle * Math.PI) / 180;
              const endAngle = (item.endAngle * Math.PI) / 180;
              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);
              const largeArc = item.percentage > 50 ? 1 : 0;
              
              return (
                <path
                  key={item.id}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
            <circle cx="50" cy="50" r="25" className={themeConfig.surface.replace('bg-', 'fill-')} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={`text-xs ${themeConfig.textMuted}`}>Total</span>
            <span className={`text-lg font-bold ${themeConfig.text}`}>
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {chartData.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${themeConfig.text} truncate`}>
                {item.name}
              </div>
              <div className={`text-xs ${themeConfig.textMuted}`}>
                {item.chain}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${themeConfig.text}`}>
                {item.percentage.toFixed(1)}%
              </div>
              <div className={`text-xs ${themeConfig.textMuted}`}>
                {formatCurrency(item.balanceUsd)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Portfolio View Component
// ============================================================================

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolio,
  isLoading = false,
  defaultViewMode = 'grid',
  enableViewToggle = true,
  onAssetClick,
  onRefresh,
  className = '',
}) => {
  const { themeConfig } = useProfileTheme();
  
  const [viewMode, setViewMode] = useState<PortfolioViewMode>(defaultViewMode);
  const [sortBy, setSortBy] = useState<PortfolioSortBy>('value');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sort and filter assets
  const filteredAssets = useMemo(() => {
    let assets = [...portfolio.assets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.id.toLowerCase().includes(query) ||
          a.chain.toLowerCase().includes(query)
      );
    }

    // Sort
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return parseFloat(b.balanceUsd) - parseFloat(a.balanceUsd);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'change':
          return b.change24h - a.change24h;
        case 'chain':
          return a.chain.localeCompare(b.chain);
        default:
          return 0;
      }
    });

    return assets;
  }, [portfolio.assets, searchQuery, sortBy]);

  const totalValue = useMemo(() => {
    return parseFloat(portfolio.totalValueUsd);
  }, [portfolio.totalValueUsd]);

  const isPositive24h = portfolio.change24h >= 0;

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className={`
          rounded-2xl p-6
          ${themeConfig.surface} ${themeConfig.border} border
        `}>
          <div className="flex items-center gap-2 mb-6">
            <Wallet size={20} className={themeConfig.textMuted} />
            <h3 className={`text-lg font-semibold ${themeConfig.text}`}>Portfolio</h3>
          </div>
          
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className={`
        rounded-2xl overflow-hidden
        ${themeConfig.surface} 
        ${themeConfig.border} border
        ${themeConfig.shadowStyle}
      `}>
        {/* Header */}
        <div className={`p-6 border-b ${themeConfig.border}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title & Total */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${themeConfig.background}`}>
                <Wallet size={24} className={themeConfig.textMuted} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${themeConfig.text}`}>Portfolio</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${themeConfig.text}`}>
                    {formatCurrency(totalValue)}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${isPositive24h ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive24h ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(portfolio.change24h).toFixed(2)}% (24h)
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className={`relative ${viewMode === 'chart' ? 'hidden' : ''}`}>
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeConfig.textMuted}`} />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`
                    pl-9 pr-4 py-2 rounded-lg text-sm
                    ${themeConfig.background} ${themeConfig.text}
                    ${themeConfig.border} border
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    w-full sm:w-48
                  `}
                />
              </div>

              {/* Sort dropdown */}
              <div className={`relative ${viewMode === 'chart' ? 'hidden' : ''}`}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as PortfolioSortBy)}
                  className={`
                    pl-3 pr-8 py-2 rounded-lg text-sm appearance-none
                    ${themeConfig.background} ${themeConfig.text}
                    ${themeConfig.border} border
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                >
                  <option value="value">Sort by Value</option>
                  <option value="name">Sort by Name</option>
                  <option value="change">Sort by Change</option>
                  <option value="chain">Sort by Chain</option>
                </select>
                <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${themeConfig.textMuted}`} />
              </div>

              {/* View mode toggle */}
              {enableViewToggle && (
                <div className={`flex rounded-lg ${themeConfig.background} p-1`}>
                  {(['grid', 'list', 'chart'] as PortfolioViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`
                        p-2 rounded-md transition-all
                        ${viewMode === mode 
                          ? `${themeConfig.surface} shadow-sm` 
                          : `hover:opacity-70 ${themeConfig.textMuted}`
                        }
                      `}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                    >
                      {mode === 'grid' && <Grid3X3 size={16} />}
                      {mode === 'list' && <List size={16} />}
                      {mode === 'chart' && <PieChart size={16} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Refresh button */}
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`
                    p-2 rounded-lg
                    ${themeConfig.background} ${themeConfig.textMuted}
                    hover:${themeConfig.text}
                    disabled:opacity-50
                    transition-colors
                  `}
                  title="Refresh"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Asset count & last updated */}
          <div className={`mt-4 flex items-center gap-4 text-xs ${themeConfig.textMuted}`}>
            <span className="flex items-center gap-1">
              <Layers size={12} />
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Updated {new Date(portfolio.lastUpdated).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet size={48} className={`mx-auto mb-4 ${themeConfig.textMuted} opacity-50`} />
              <p className={themeConfig.textMuted}>
                {searchQuery ? 'No assets match your search' : 'No assets in portfolio'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'grid' && (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={`${asset.chain}-${asset.id}`}
                      asset={asset}
                      totalValue={totalValue}
                      onClick={() => onAssetClick?.(asset)}
                    />
                  ))}
                </motion.div>
              )}

              {viewMode === 'list' && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`
                    rounded-xl overflow-hidden
                    ${themeConfig.surface}
                    ${themeConfig.border} border
                  `}
                >
                  {/* List header */}
                  <div className={`
                    hidden md:flex items-center gap-4 p-4
                    ${themeConfig.background} text-xs font-semibold uppercase
                    ${themeConfig.textMuted}
                  `}>
                    <div className="flex-1">Asset</div>
                    <div className="w-32 text-right shrink-0">Balance</div>
                    <div className="w-32 text-right shrink-0">Value</div>
                    <div className="w-24 text-right shrink-0 hidden lg:block">24h</div>
                  </div>
                  
                  {filteredAssets.map((asset) => (
                    <AssetListItem
                      key={`${asset.chain}-${asset.id}`}
                      asset={asset}
                      totalValue={totalValue}
                      onClick={() => onAssetClick?.(asset)}
                    />
                  ))}
                </motion.div>
              )}

              {viewMode === 'chart' && (
                <motion.div
                  key="chart"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PortfolioChart assets={filteredAssets} totalValue={totalValue} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioView;
