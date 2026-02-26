import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  TrendingUp, 
  Target, 
  Gavel, 
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { Bid, AdSlotType, AuctionSlot } from '@agora/sdk';

// ============================================================================
// Types
// ============================================================================

interface AdAuctionCardProps {
  slot: AuctionSlot;
  onBidClick?: (slotType: AdSlotType) => void;
  className?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatEther(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}

function formatTimeLeft(expiresIn: number): TimeLeft {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiresIn - now;
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  
  return { hours, minutes, seconds, isExpired: false };
}

function getSlotIcon(slotType: AdSlotType): React.ReactNode {
  switch (slotType) {
    case 'banner':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 12h10" />
        </svg>
      );
    case 'sidebar':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      );
    case 'featured':
      return <Sparkles className="w-5 h-5" />;
    case 'popup':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </svg>
      );
    default:
      return <Target className="w-5 h-5" />;
  }
}

function getSlotColor(slotType: AdSlotType): string {
  switch (slotType) {
    case 'banner':
      return 'from-blue-500 to-indigo-600';
    case 'sidebar':
      return 'from-emerald-500 to-teal-600';
    case 'featured':
      return 'from-amber-500 to-orange-600';
    case 'popup':
      return 'from-purple-500 to-pink-600';
    default:
      return 'from-slate-500 to-slate-600';
  }
}

function getSlotBasePrice(slotType: AdSlotType): string {
  switch (slotType) {
    case 'banner':
      return '0.001';
    case 'sidebar':
      return '0.0005';
    case 'featured':
      return '0.005';
    case 'popup':
      return '0.002';
    default:
      return '0.001';
  }
}

// ============================================================================
// Countdown Timer Component
// ============================================================================

function CountdownTimer({ expiresIn }: { expiresIn: number }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(formatTimeLeft(expiresIn));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatTimeLeft(expiresIn));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresIn]);
  
  if (timeLeft.isExpired) {
    return (
      <span className="text-red-500 font-medium flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        Expired
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-sm font-mono">
      <Clock className="w-4 h-4 text-agora-400" />
      <span className={timeLeft.hours < 1 ? 'text-amber-500' : 'text-agora-600'}>
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdAuctionCard({ slot, onBidClick, className = '' }: AdAuctionCardProps) {
  const hasActiveBid = slot.currentBid !== null;
  const hasSecondBid = slot.secondBid !== null;
  const isAvailable = slot.isAvailable;
  
  const handleBidClick = () => {
    onBidClick?.(slot.type);
  };
  
  return (
    <motion.div
      className={`
        bg-white rounded-2xl border border-agora-200 overflow-hidden
        transition-all duration-300 hover:shadow-card-hover hover:border-base-blue/30
        ${!isAvailable ? 'opacity-75' : ''}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${getSlotColor(slot.type)} p-4`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {getSlotIcon(slot.type)}
            </div>
            <div>
              <h3 className="font-bold text-lg capitalize">{slot.type} Slot</h3>
              <p className="text-white/70 text-sm">Ad Space Auction</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70 uppercase tracking-wider">Base Price</div>
            <div className="font-mono font-semibold">{getSlotBasePrice(slot.type)} ETH</div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Current Bid Status */}
        {hasActiveBid ? (
          <div className="space-y-4">
            {/* Highest Bid */}
            <div className="bg-agora-50 rounded-xl p-4 border border-agora-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-agora-500">Current Highest Bid</span>
                <span className="text-xs px-2 py-1 bg-success-light text-success rounded-full font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-agora-900">
                  {formatEther(slot.currentBid!.amount)} ETH
                </span>
                <span className="text-sm text-agora-400">
                  by {slot.currentBid!.agentId.slice(0, 8)}...
                </span>
              </div>
              
              {/* Time remaining */}
              <div className="mt-3 pt-3 border-t border-agora-200">
                <CountdownTimer expiresIn={slot.expiresIn} />
              </div>
              
              {/* Ad Preview */}
              {slot.currentBid!.content && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-agora-200">
                  <p className="text-sm font-semibold text-agora-800 line-clamp-1">
                    {slot.currentBid!.content.title}
                  </p>
                  <p className="text-xs text-agora-500 line-clamp-2 mt-1">
                    {slot.currentBid!.content.description}
                  </p>
                </div>
              )}
            </div>
            
            {/* Second Bid (if exists) */}
            {hasSecondBid && (
              <div className="bg-agora-50/50 rounded-xl p-3 border border-agora-100/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-agora-500">Second Highest Bid</span>
                  <span className="text-sm font-semibold text-agora-700">
                    {formatEther(slot.secondBid!.amount)} ETH
                  </span>
                </div>
              </div>
            )}
            
            {/* Vickrey Price */}
            <div className="flex items-center justify-between p-3 bg-base-light rounded-xl border border-blue-100">
              <span className="text-sm text-agora-600 flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                You would pay (Vickrey)
              </span>
              <span className="font-bold text-base-blue">
                {formatEther(slot.currentPrice)} ETH
              </span>
            </div>
          </div>
        ) : (
          /* No Active Bids */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gavel className="w-8 h-8 text-agora-400" />
            </div>
            <h4 className="text-lg font-semibold text-agora-700">No Active Bids</h4>
            <p className="text-sm text-agora-500 mt-1">
              Starting at {getSlotBasePrice(slot.type)} ETH
            </p>
          </div>
        )}
        
        {/* Action Button */}
        <motion.button
          onClick={handleBidClick}
          className={`
            w-full mt-4 py-3 px-4 rounded-xl font-semibold
            flex items-center justify-center gap-2
            transition-all duration-200
            ${hasActiveBid 
              ? 'bg-agora-900 text-white hover:bg-agora-800 shadow-lg shadow-agora-900/20' 
              : 'bg-base-blue text-white hover:bg-base-blue/90 shadow-lg shadow-base-blue/20'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {hasActiveBid ? (
            <>
              <TrendingUp className="w-4 h-4" />
              Place Higher Bid
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4" />
              Start Bidding
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default AdAuctionCard;