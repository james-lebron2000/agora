import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Zap,
  Gavel,
  X
} from 'lucide-react';
import type { Bid, AdSlotType, AuctionSlot } from '@agora/sdk';

// ============================================================================
// Types
// ============================================================================

interface AdAuctionBidderProps {
  slot: AuctionSlot;
  onPlaceBid?: (amount: bigint) => void;
  onClose?: () => void;
  className?: string;
}

interface QuickBidOption {
  label: string;
  percentage: number;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const QUICK_BID_OPTIONS: QuickBidOption[] = [
  { label: '+5%', percentage: 0.05, color: 'bg-emerald-500 hover:bg-emerald-600' },
  { label: '+10%', percentage: 0.10, color: 'bg-blue-500 hover:bg-blue-600' },
  { label: '+20%', percentage: 0.20, color: 'bg-purple-500 hover:bg-purple-600' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatEther(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

function parseEther(eth: string): bigint {
  try {
    const value = parseFloat(eth);
    if (isNaN(value) || value < 0) return 0n;
    return BigInt(Math.round(value * 1e18));
  } catch {
    return 0n;
  }
}

function calculateBidAmount(currentBid: bigint, percentage: number): bigint {
  const increase = (currentBid * BigInt(Math.round(percentage * 10000))) / 10000n;
  return currentBid + increase;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdAuctionBidder({ slot, onPlaceBid, onClose, className = '' }: AdAuctionBidderProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const currentBid = slot.currentBid?.amount || 0n;
  const secondBid = slot.secondBid?.amount || 0n;
  const currentPrice = slot.currentPrice;
  
  // Calculate minimum bid (current bid + 1%)
  const minBid = currentBid > 0n 
    ? currentBid + (currentBid * 100n) / 10000n 
    : parseEther(getBasePrice(slot.type));
  
  useEffect(() => {
    // Set initial bid suggestion
    if (currentBid > 0n) {
      const suggested = calculateBidAmount(currentBid, 0.05); // +5% as default
      setBidAmount(formatEther(suggested));
    } else {
      setBidAmount(getBasePrice(slot.type));
    }
  }, [slot]);
  
  function getBasePrice(slotType: AdSlotType): string {
    switch (slotType) {
      case 'banner': return '0.001';
      case 'sidebar': return '0.0005';
      case 'featured': return '0.005';
      case 'popup': return '0.002';
      default: return '0.001';
    }
  }
  
  const handleQuickBid = (percentage: number) => {
    const baseAmount = currentBid > 0n ? currentBid : parseEther(getBasePrice(slot.type));
    const newBid = calculateBidAmount(baseAmount, percentage);
    setBidAmount(formatEther(newBid));
    setError(null);
  };
  
  const handleBidChange = (value: string) => {
    setBidAmount(value);
    setError(null);
  };
  
  const validateBid = (): boolean => {
    const amount = parseEther(bidAmount);
    
    if (amount <= 0n) {
      setError('Please enter a valid bid amount');
      return false;
    }
    
    if (amount < minBid) {
      setError(`Bid must be at least ${formatEther(minBid)} ETH (current + 1%)`);
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBid()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onPlaceBid?.(parseEther(bidAmount));
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
      onClose?.();
    }, 2000);
  };
  
  const handleIncrement = () => {
    const current = parseFloat(bidAmount) || 0;
    setBidAmount((current + 0.0001).toFixed(6));
    setError(null);
  };
  
  const handleDecrement = () => {
    const current = parseFloat(bidAmount) || 0;
    if (current > 0.0001) {
      setBidAmount((current - 0.0001).toFixed(6));
      setError(null);
    }
  };
  
  return (
    <motion.div
      className={`bg-white rounded-2xl border border-agora-200 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-base-blue to-indigo-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Place Your Bid</h2>
              <p className="text-white/70 text-sm capitalize">{slot.type} Slot Auction</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          )}
        </div>
      </div>
      
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center px-6">
              <motion.div
                className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-10 h-10 text-success" />
              </motion.div>
              <h3 className="text-xl font-bold text-agora-900">Bid Placed!</h3>
              <p className="text-agora-500 mt-1">
                Your bid of {parseFloat(bidAmount).toFixed(4)} ETH has been submitted.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="p-6 space-y-6">
        {/* Current Auction Status */}
        <div className="bg-agora-50 rounded-xl p-4 border border-agora-100">
          <h3 className="text-sm font-semibold text-agora-700 mb-3">Auction Status</h3>
          <div className="space-y-3">
            {currentBid > 0n ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-agora-500">Current Highest Bid</span>
                  <span className="font-bold text-agora-900 font-mono">
                    {formatEther(currentBid)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-agora-500">Second Highest</span>
                  <span className="font-semibold text-agora-700 font-mono">
                    {secondBid > 0n ? formatEther(secondBid) : '—'} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-agora-200">
                  <span className="text-sm text-agora-600 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    You would pay (Vickrey)
                  </span>
                  <span className="font-bold text-base-blue font-mono">
                    {formatEther(currentPrice)} ETH
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-agora-500">No bids yet</p>
                <p className="text-xs text-agora-400">Be the first to bid!</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Bid Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-agora-700 mb-2">
              Your Bid Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-agora-400" />
              <input
                type="number"
                step="0.000001"
                min={formatEther(minBid)}
                value={bidAmount}
                onChange={(e) => handleBidChange(e.target.value)}
                className={`
                  w-full pl-12 pr-24 py-4 text-2xl font-bold font-mono
                  rounded-xl border bg-agora-50
                  focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                  transition-all
                  ${error ? 'border-red-300 bg-red-50' : 'border-agora-200'}
                `}
                placeholder="0.00"
              />
              <span className="absolute right-16 top-1/2 -translate-y-1/2 text-sm text-agora-400 font-medium">
                ETH
              </span>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="p-1 hover:bg-agora-200 rounded transition-colors"
                >
                  <ChevronUp className="w-4 h-4 text-agora-500" />
                </button>
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="p-1 hover:bg-agora-200 rounded transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-agora-500" />
                </button>
              </div>
            </div>
            
            {error && (
              <motion.div
                className="flex items-center gap-2 mt-2 text-red-500 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
            
            <p className="text-xs text-agora-400 mt-2">
              Minimum bid: {formatEther(minBid)} ETH (current + 1%)
            </p>
          </div>
          
          {/* Quick Bid Buttons */}
          <div>
            <label className="block text-sm text-agora-600 mb-2">Quick Bid</label>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_BID_OPTIONS.map((option) => (
                <motion.button
                  key={option.label}
                  type="button"
                  onClick={() => handleQuickBid(option.percentage)}
                  className={`
                    py-2 px-3 rounded-lg text-white text-sm font-semibold
                    transition-all duration-200 ${option.color}
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Bid Comparison */}
          {currentBid > 0n && parseEther(bidAmount) > 0n && (
            <motion.div
              className="bg-blue-50 rounded-xl p-4 border border-blue-100"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-agora-600">Bid Comparison</span>
                {parseEther(bidAmount) > currentBid ? (
                  <span className="text-xs px-2 py-1 bg-success-light text-success rounded-full font-medium">
                    Winning
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">
                    Losing
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-agora-500 mb-1">Current Highest</div>
                  <div className="font-mono font-semibold text-agora-700">
                    {formatEther(currentBid)} ETH
                  </div>
                </div>
                <div className="text-agora-400">
                  {parseEther(bidAmount) > currentBid ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-agora-500 mb-1">Your Bid</div>
                  <div className={`font-mono font-bold ${parseEther(bidAmount) > currentBid ? 'text-success' : 'text-red-500'}`}>
                    {parseFloat(bidAmount).toFixed(6)} ETH
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting || !bidAmount}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white text-lg
              flex items-center justify-center gap-2
              transition-all duration-200
              ${isSubmitting || !bidAmount
                ? 'bg-agora-400 cursor-not-allowed'
                : 'bg-base-blue hover:bg-base-blue/90 shadow-lg shadow-base-blue/20'
              }
            `}
            whileHover={!isSubmitting && bidAmount ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting && bidAmount ? { scale: 0.98 } : {}}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Placing Bid...
              </>
            ) : (
              <>
                <Gavel className="w-5 h-5" />
                Place Bid
              </>
            )}
          </motion.button>
        </form>
        
        {/* Info */}
        <div className="bg-agora-50 rounded-lg p-3 border border-agora-100">
          <p className="text-xs text-agora-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Bids are binding and use the Vickrey auction mechanism. 
              You pay the second highest bid + 1%, not your full bid amount.
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default AdAuctionBidder;