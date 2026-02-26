import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Target, 
  DollarSign, 
  Clock, 
  Image, 
  Link, 
  Users,
  AlertCircle,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import type { AdSlotType, AdContent, BidRequest } from '@agora/sdk';

// ============================================================================
// Types
// ============================================================================

interface AdAuctionCreatorProps {
  onCreate?: (request: BidRequest) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  slotType: AdSlotType;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  maxBid: string;
  duration: number;
  campaignId: string;
  targetAudience: string[];
}

interface FormErrors {
  title?: string;
  description?: string;
  targetUrl?: string;
  maxBid?: string;
  imageUrl?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SLOT_TYPES: { value: AdSlotType; label: string; description: string; basePrice: string }[] = [
  { 
    value: 'banner', 
    label: 'Banner', 
    description: 'Top-of-page banner placement',
    basePrice: '0.001'
  },
  { 
    value: 'sidebar', 
    label: 'Sidebar', 
    description: 'Side panel visibility',
    basePrice: '0.0005'
  },
  { 
    value: 'featured', 
    label: 'Featured', 
    description: 'Premium highlighted position',
    basePrice: '0.005'
  },
  { 
    value: 'popup', 
    label: 'Popup', 
    description: 'Modal overlay display',
    basePrice: '0.002'
  },
];

const DURATION_OPTIONS = [
  { value: 3600, label: '1 Hour' },
  { value: 7200, label: '2 Hours' },
  { value: 14400, label: '4 Hours' },
  { value: 28800, label: '8 Hours' },
  { value: 86400, label: '24 Hours' },
];

const TARGET_AUDIENCES = [
  'Developers',
  'Traders',
  'Investors',
  'Enterprise',
  'DeFi Users',
  'NFT Collectors',
];

// ============================================================================
// Helper Functions
// ============================================================================

function parseEther(eth: string): bigint {
  try {
    const value = parseFloat(eth);
    if (isNaN(value) || value < 0) return 0n;
    return BigInt(Math.round(value * 1e18));
  } catch {
    return 0n;
  }
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function AdAuctionCreator({ onCreate, onCancel, className = '' }: AdAuctionCreatorProps) {
  const [formData, setFormData] = useState<FormData>({
    slotType: 'banner',
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    maxBid: '',
    duration: 3600,
    campaignId: '',
    targetAudience: [],
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 300) {
      newErrors.description = 'Description must be less than 300 characters';
    }
    
    if (!formData.targetUrl.trim()) {
      newErrors.targetUrl = 'Target URL is required';
    } else if (!validateUrl(formData.targetUrl)) {
      newErrors.targetUrl = 'Please enter a valid URL (https://...)';
    }
    
    if (!formData.maxBid.trim()) {
      newErrors.maxBid = 'Max bid is required';
    } else {
      const bidValue = parseFloat(formData.maxBid);
      if (isNaN(bidValue) || bidValue <= 0) {
        newErrors.maxBid = 'Please enter a valid amount';
      }
    }
    
    if (formData.imageUrl && !validateUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid image URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const content: AdContent = {
      title: formData.title,
      description: formData.description,
      targetUrl: formData.targetUrl,
      ...(formData.imageUrl && { imageUrl: formData.imageUrl }),
      ...(formData.campaignId && { campaignId: formData.campaignId }),
    };
    
    const request: BidRequest = {
      slotType: formData.slotType,
      maxBid: parseEther(formData.maxBid),
      expiresAt: Math.floor(Date.now() / 1000) + formData.duration,
      content,
      chain: 'base', // Default chain
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onCreate?.(request);
    setIsSubmitting(false);
    setShowSuccess(true);
    
    // Reset form after success
    setTimeout(() => {
      setShowSuccess(false);
      setFormData({
        slotType: 'banner',
        title: '',
        description: '',
        imageUrl: '',
        targetUrl: '',
        maxBid: '',
        duration: 3600,
        campaignId: '',
        targetAudience: [],
      });
    }, 2000);
  };
  
  const handleInputChange = (field: keyof FormData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const toggleAudience = (audience: string) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: prev.targetAudience.includes(audience)
        ? prev.targetAudience.filter(a => a !== audience)
        : [...prev.targetAudience, audience]
    }));
  };
  
  const selectedSlot = SLOT_TYPES.find(s => s.value === formData.slotType);
  
  return (
    <motion.div
      className={`bg-white rounded-2xl border border-agora-200 overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-agora-900 to-agora-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Ad Auction</h2>
              <p className="text-agora-300 text-sm">Place a bid for ad space</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-agora-300" />
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
            <div className="text-center">
              <motion.div
                className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-10 h-10 text-success" />
              </motion.div>
              <h3 className="text-xl font-bold text-agora-900">Auction Created!</h3>
              <p className="text-agora-500 mt-1">Your bid has been placed successfully.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Slot Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-agora-700 mb-3">
            Ad Slot Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SLOT_TYPES.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => handleInputChange('slotType', slot.value)}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${formData.slotType === slot.value
                    ? 'border-base-blue bg-base-light'
                    : 'border-agora-100 hover:border-agora-200'
                  }
                `}
              >
                <div className="font-semibold text-agora-900">{slot.label}</div>
                <div className="text-xs text-agora-500 mt-1">{slot.description}</div>
                <div className="text-xs font-mono text-base-blue mt-2">
                  Base: {slot.basePrice} ETH
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Ad Content */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-agora-700 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Ad Content
          </h3>
          
          {/* Title */}
          <div>
            <label className="block text-sm text-agora-600 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter ad title (max 100 chars)"
              className={`
                w-full px-4 py-2.5 rounded-xl border bg-agora-50
                focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                transition-all
                ${errors.title ? 'border-red-300 bg-red-50' : 'border-agora-200'}
              `}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
            <p className="text-xs text-agora-400 mt-1 text-right">
              {formData.title.length}/100
            </p>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm text-agora-600 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter ad description (max 300 chars)"
              rows={3}
              className={`
                w-full px-4 py-2.5 rounded-xl border bg-agora-50 resize-none
                focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                transition-all
                ${errors.description ? 'border-red-300 bg-red-50' : 'border-agora-200'}
              `}
              maxLength={300}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
            <p className="text-xs text-agora-400 mt-1 text-right">
              {formData.description.length}/300
            </p>
          </div>
          
          {/* Target URL */}
          <div>
            <label className="block text-sm text-agora-600 mb-1.5">
              Target URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-agora-400" />
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) => handleInputChange('targetUrl', e.target.value)}
                placeholder="https://example.com"
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-xl border bg-agora-50
                  focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                  transition-all
                  ${errors.targetUrl ? 'border-red-300 bg-red-50' : 'border-agora-200'}
                `}
              />
            </div>
            {errors.targetUrl && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.targetUrl}
              </p>
            )}
          </div>
          
          {/* Image URL (Optional) */}
          <div>
            <label className="block text-sm text-agora-600 mb-1.5">
              Image URL <span className="text-agora-400">(optional)</span>
            </label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-agora-400" />
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.png"
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-xl border bg-agora-50
                  focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                  transition-all
                  ${errors.imageUrl ? 'border-red-300 bg-red-50' : 'border-agora-200'}
                `}
              />
            </div>
            {errors.imageUrl && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.imageUrl}
              </p>
            )}
          </div>
        </div>
        
        {/* Bid Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-agora-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Bid Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Bid */}
            <div>
              <label className="block text-sm text-agora-600 mb-1.5">
                Maximum Bid <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-agora-400" />
                <input
                  type="number"
                  step="0.0001"
                  min={selectedSlot?.basePrice || '0.0001'}
                  value={formData.maxBid}
                  onChange={(e) => handleInputChange('maxBid', e.target.value)}
                  placeholder="0.01"
                  className={`
                    w-full pl-10 pr-16 py-2.5 rounded-xl border bg-agora-50
                    focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue
                    transition-all
                    ${errors.maxBid ? 'border-red-300 bg-red-50' : 'border-agora-200'}
                  `}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-agora-400">
                  ETH
                </span>
              </div>
              {errors.maxBid && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.maxBid}
                </p>
              )}
              <p className="text-xs text-agora-400 mt-1">
                Min: {selectedSlot?.basePrice || '0.0001'} ETH
              </p>
            </div>
            
            {/* Duration */}
            <div>
              <label className="block text-sm text-agora-600 mb-1.5">
                Duration
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-agora-400" />
                <select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-agora-200 bg-agora-50 appearance-none focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue transition-all"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-agora-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Target Audience */}
        <div>
          <label className="block text-sm font-semibold text-agora-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Target Audience <span className="text-agora-400 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map((audience) => (
              <button
                key={audience}
                type="button"
                onClick={() => toggleAudience(audience)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${formData.targetAudience.includes(audience)
                    ? 'bg-base-blue text-white'
                    : 'bg-agora-100 text-agora-600 hover:bg-agora-200'
                  }
                `}
              >
                {audience}
              </button>
            ))}
          </div>
        </div>
        
        {/* Campaign ID */}
        <div>
          <label className="block text-sm text-agora-600 mb-1.5">
            Campaign ID <span className="text-agora-400">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.campaignId}
            onChange={(e) => handleInputChange('campaignId', e.target.value)}
            placeholder="e.g., summer-2024-campaign"
            className="w-full px-4 py-2.5 rounded-xl border border-agora-200 bg-agora-50 focus:outline-none focus:ring-2 focus:ring-base-blue/20 focus:border-base-blue transition-all"
          />
        </div>
        
        {/* Submit Button */}
        <div className="pt-4 border-t border-agora-100">
          <motion.button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-3 px-6 rounded-xl font-semibold text-white
              flex items-center justify-center gap-2
              transition-all duration-200
              ${isSubmitting
                ? 'bg-agora-400 cursor-not-allowed'
                : 'bg-base-blue hover:bg-base-blue/90 shadow-lg shadow-base-blue/20'
              }
            `}
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Auction...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Auction
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

export default AdAuctionCreator;