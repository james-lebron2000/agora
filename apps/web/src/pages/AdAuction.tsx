import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gavel, 
  Plus, 
  History, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Filter,
  ChevronRight,
  Trophy,
  Target,
  BarChart3,
  Zap
} from 'lucide-react';
import { AdAuctionCard } from '../components/AdAuctionCard';
import { AdAuctionCreator } from '../components/AdAuctionCreator';
import { AdAuctionBidder } from '../components/AdAuctionBidder';
import type { 
  AdAuctionManager, 
  AuctionSlot, 
  Bid, 
  BidRequest, 
  AdSlotType,
  BidResult 
} from '@agora/sdk';

// ============================================================================
// Mock Data & Types
// ============================================================================

interface AuctionHistoryItem {
  id: string;
  slotType: AdSlotType;
  amount: bigint;
  status: 'won' | 'lost' | 'active' | 'expired';
  timestamp: number;
  agentId: string;
}

const MOCK_SLOTS: AuctionSlot[] = [
  {
    type: 'banner',
    currentBid: {
      id: 'bid_001',
      agentId: 'agent:AlphaAds',
      bidder: '0x1234...5678',
      amount: BigInt('1500000000000000'), // 0.0015 ETH
      slotType: 'banner',
      placedAt: Date.now() - 3600000,
      expiresAt: Math.floor(Date.now() / 1000) + 7200,
      content: {
        title: 'DeFi Yield Aggregator',
        description: 'Earn up to 15% APY on your crypto assets with automated yield farming strategies.',
        targetUrl: 'https://example.com/defi',
        campaignId: 'campaign_001',
      },
      status: 'active',
      chain: 'base',
    },
    secondBid: {
      id: 'bid_002',
      agentId: 'agent:BetaMarketing',
      bidder: '0xabcd...efgh',
      amount: BigInt('1200000000000000'), // 0.0012 ETH
      slotType: 'banner',
      placedAt: Date.now() - 7200000,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      content: {
        title: 'Crypto Trading Bot',
        description: 'Automated trading strategies for maximum returns.',
        targetUrl: 'https://example.com/bot',
      },
      status: 'lost',
      chain: 'base',
    },
    isAvailable: true,
    currentPrice: BigInt('1212000000000000'), // second bid + 1%
    expiresIn: Math.floor(Date.now() / 1000) + 7200,
  },
  {
    type: 'sidebar',
    currentBid: {
      id: 'bid_003',
      agentId: 'agent:GammaGrowth',
      bidder: '0x9876...5432',
      amount: BigInt('800000000000000'), // 0.0008 ETH
      slotType: 'sidebar',
      placedAt: Date.now() - 1800000,
      expiresAt: Math.floor(Date.now() / 1000) + 5400,
      content: {
        title: 'NFT Marketplace',
        description: 'Discover and trade unique digital collectibles.',
        targetUrl: 'https://example.com/nft',
      },
      status: 'active',
      chain: 'base',
    },
    secondBid: null,
    isAvailable: true,
    currentPrice: BigInt('800000000000000'),
    expiresIn: Math.floor(Date.now() / 1000) + 5400,
  },
  {
    type: 'featured',
    currentBid: null,
    secondBid: null,
    isAvailable: true,
    currentPrice: BigInt('5000000000000000'), // base price 0.005 ETH
    expiresIn: 0,
  },
  {
    type: 'popup',
    currentBid: {
      id: 'bid_004',
      agentId: 'agent:DeltaPromo',
      bidder: '0xmnop...qrst',
      amount: BigInt('2500000000000000'), // 0.0025 ETH
      slotType: 'popup',
      placedAt: Date.now() - 5400000,
      expiresAt: Math.floor(Date.now() / 1000) + 1800,
      content: {
        title: 'Layer 2 Bridge',
        description: 'Fast and cheap cross-chain transfers.',
        targetUrl: 'https://example.com/bridge',
        campaignId: 'campaign_002',
      },
      status: 'active',
      chain: 'base',
    },
    secondBid: null,
    isAvailable: true,
    currentPrice: BigInt('2500000000000000'),
    expiresIn: Math.floor(Date.now() / 1000) + 1800,
  },
];

const MOCK_HISTORY: AuctionHistoryItem[] = [
  {
    id: 'hist_001',
    slotType: 'banner',
    amount: BigInt('1000000000000000'),
    status: 'won',
    timestamp: Date.now() - 86400000,
    agentId: 'agent:MyAgent',
  },
  {
    id: 'hist_002',
    slotType: 'sidebar',
    amount: BigInt('500000000000000'),
    status: 'lost',
    timestamp: Date.now() - 172800000,
    agentId: 'agent:MyAgent',
  },
  {
    id: 'hist_003',
    slotType: 'featured',
    amount: BigInt('6000000000000000'),
    status: 'expired',
    timestamp: Date.now() - 259200000,
    agentId: 'agent:MyAgent',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatEther(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'won': return 'text-success bg-success-light';
    case 'lost': return 'text-red-500 bg-red-100';
    case 'active': return 'text-base-blue bg-blue-100';
    case 'expired': return 'text-agora-400 bg-agora-100';
    default: return 'text-agora-500 bg-agora-100';
  }
}

// ============================================================================
// Stats Card Component
// ============================================================================

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <motion.div
      className="bg-white rounded-xl p-5 border border-agora-200 shadow-card"
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-agora-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-agora-900 mt-1">{value}</p>
          <p className="text-xs text-agora-400 mt-1">{subtitle}</p>
        </div>
        <div className="w-10 h-10 bg-base-light rounded-lg flex items-center justify-center text-base-blue">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-agora-100">
          <span className="text-xs text-success font-medium">{trend}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// History Item Component
// ============================================================================

function HistoryItem({ item }: { item: AuctionHistoryItem }) {
  return (
    <motion.div
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-agora-100 hover:border-base-blue/30 transition-colors"
      whileHover={{ x: 4 }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(item.status)}`}>
          {item.status === 'won' ? <Trophy className="w-5 h-5" /> : 
           item.status === 'active' ? <Zap className="w-5 h-5" /> :
           <History className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-semibold text-agora-900 capitalize">{item.slotType} Slot</p>
          <p className="text-sm text-agora-500">{formatTimeAgo(item.timestamp)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-agora-900 font-mono">{formatEther(item.amount)} ETH</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdAuction() {
  const [slots, setSlots] = useState<AuctionSlot[]>(MOCK_SLOTS);
  const [history, setHistory] = useState<AuctionHistoryItem[]>(MOCK_HISTORY);
  const [selectedSlot, setSelectedSlot] = useState<AdSlotType | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterSlot, setFilterSlot] = useState<AdSlotType | 'all'>('all');
  
  // Calculate stats
  const totalActiveBids = slots.filter(s => s.currentBid !== null).length;
  const totalVolume = slots.reduce((acc, s) => acc + (s.currentBid?.amount || 0n), 0n);
  const myActiveBids = history.filter(h => h.status === 'active').length;
  const winRate = history.length > 0 
    ? Math.round((history.filter(h => h.status === 'won').length / history.length) * 100)
    : 0;
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };
  
  const handleBidClick = (slotType: AdSlotType) => {
    setSelectedSlot(slotType);
  };
  
  const handlePlaceBid = (amount: bigint) => {
    // Mock bid placement - in real app this would call the SDK
    console.log('Placing bid:', { slotType: selectedSlot, amount: amount.toString() });
    
    // Add to history
    if (selectedSlot) {
      const newHistoryItem: AuctionHistoryItem = {
        id: `hist_${Date.now()}`,
        slotType: selectedSlot,
        amount,
        status: 'active',
        timestamp: Date.now(),
        agentId: 'agent:MyAgent',
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    }
    
    setSelectedSlot(null);
  };
  
  const handleCreateAuction = (request: BidRequest) => {
    // Mock auction creation - in real app this would call the SDK
    console.log('Creating auction:', request);
    
    // Add to history
    const newHistoryItem: AuctionHistoryItem = {
      id: `hist_${Date.now()}`,
      slotType: request.slotType,
      amount: request.maxBid,
      status: 'active',
      timestamp: Date.now(),
      agentId: 'agent:MyAgent',
    };
    setHistory(prev => [newHistoryItem, ...prev]);
    
    setShowCreator(false);
  };
  
  const filteredSlots = filterSlot === 'all' 
    ? slots 
    : slots.filter(s => s.type === filterSlot);
  
  const selectedSlotData = slots.find(s => s.type === selectedSlot);
  
  return (
    <div className="min-h-screen bg-agora-50">
      {/* Header */}
      <div className="bg-white border-b border-agora-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-base-blue to-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-agora-900">Ad Auction</h1>
                <p className="text-sm text-agora-500">Real-time bidding for premium ad space</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleRefresh}
                className="p-2 hover:bg-agora-100 rounded-lg transition-colors"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshCw className={`w-5 h-5 text-agora-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              <motion.button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-base-blue text-white rounded-lg font-medium hover:bg-base-blue/90 transition-colors shadow-lg shadow-base-blue/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                New Auction
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Auctions"
            value={totalActiveBids.toString()}
            subtitle="Currently running"
            icon={<Target className="w-5 h-5" />}
            trend="+2 from yesterday"
          />
          <StatsCard
            title="Total Volume"
            value={`${formatEther(totalVolume)} ETH`}
            subtitle="All time bids"
            icon={<BarChart3 className="w-5 h-5" />}
            trend="+15% this week"
          />
          <StatsCard
            title="My Active Bids"
            value={myActiveBids.toString()}
            subtitle="Across all slots"
            icon={<Zap className="w-5 h-5" />}
          />
          <StatsCard
            title="Win Rate"
            value={`${winRate}%`}
            subtitle={`${history.filter(h => h.status === 'won').length} wins`}
            icon={<Trophy className="w-5 h-5" />}
            trend="Top 10%"
          />
        </div>
        
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-agora-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-base-blue text-white'
                  : 'text-agora-600 hover:bg-agora-50'
              }`}
            >
              Active Auctions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-base-blue text-white'
                  : 'text-agora-600 hover:bg-agora-50'
              }`}
            >
              My History
            </button>
          </div>
          
          {/* Filter */}
          {activeTab === 'active' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-agora-400" />
              <select
                value={filterSlot}
                onChange={(e) => setFilterSlot(e.target.value as AdSlotType | 'all')}
                className="px-3 py-1.5 rounded-lg border border-agora-200 text-sm bg-white focus:outline-none focus:border-base-blue"
              >
                <option value="all">All Slots</option>
                <option value="banner">Banner</option>
                <option value="sidebar">Sidebar</option>
                <option value="featured">Featured</option>
                <option value="popup">Popup</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'active' ? (
            <motion.div
              key="active"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {filteredSlots.map((slot) => (
                <AdAuctionCard
                  key={slot.type}
                  slot={slot}
                  onBidClick={handleBidClick}
                />
              ))}
              
              {filteredSlots.length === 0 && (
                <div className="col-span-2 text-center py-16">
                  <div className="w-20 h-20 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-10 h-10 text-agora-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-agora-700">No auctions found</h3>
                  <p className="text-sm text-agora-500 mt-1">Try adjusting your filter or create a new auction.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {history.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
              
              {history.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-10 h-10 text-agora-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-agora-700">No history yet</h3>
                  <p className="text-sm text-agora-500 mt-1">Start bidding to see your auction history here.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {/* Bidder Modal */}
        {selectedSlot && selectedSlotData && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSlot(null)}
          >
            <motion.div
              className="w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AdAuctionBidder
                slot={selectedSlotData}
                onPlaceBid={handlePlaceBid}
                onClose={() => setSelectedSlot(null)}
              />
            </motion.div>
          </motion.div>
        )}
        
        {/* Creator Modal */}
        {showCreator && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreator(false)}
          >
            <motion.div
              className="w-full max-w-lg my-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AdAuctionCreator
                onCreate={handleCreateAuction}
                onCancel={() => setShowCreator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdAuction;