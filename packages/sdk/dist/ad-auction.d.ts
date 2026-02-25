/**
 * Ad Auction Module for Agora
 *
 * Implements real-time ad slot bidding with:
 * - Vickrey auction (second-price) mechanism
 * - Priority queue for pending bids
 * - Automatic budget caps per agent
 * - Time-decay pricing
 *
 * @module ad-auction
 */
import { type Address } from 'viem';
import type { SupportedChain } from './bridge.js';
/**
 * Ad slot types available for auction
 */
export type AdSlotType = 'banner' | 'sidebar' | 'featured' | 'popup';
/**
 * Ad content metadata
 */
export interface AdContent {
    /** Ad title (max 100 chars) */
    title: string;
    /** Ad description (max 300 chars) */
    description: string;
    /** Optional image URL or IPFS hash */
    imageUrl?: string;
    /** Target URL when ad is clicked */
    targetUrl: string;
    /** Campaign identifier */
    campaignId?: string;
}
/**
 * Bid placement request
 */
export interface BidRequest {
    /** Target ad slot type */
    slotType: AdSlotType;
    /** Maximum bid amount in wei */
    maxBid: bigint;
    /** Bid expiration timestamp (seconds) */
    expiresAt: number;
    /** Ad content to display */
    content: AdContent;
    /** Target chain for the bid */
    chain: SupportedChain;
}
/**
 * Active bid record
 */
export interface Bid {
    /** Unique bid identifier */
    id: string;
    /** Bidder agent ID */
    agentId: string;
    /** Bidder wallet address */
    bidder: Address;
    /** Bid amount in wei */
    amount: bigint;
    /** Target slot type */
    slotType: AdSlotType;
    /** Bid placement timestamp */
    placedAt: number;
    /** Bid expiration timestamp */
    expiresAt: number;
    /** Ad content */
    content: AdContent;
    /** Current bid status */
    status: 'pending' | 'active' | 'won' | 'lost' | 'expired';
    /** Chain where bid was placed */
    chain: SupportedChain;
}
/**
 * Auction slot with current state
 */
export interface AuctionSlot {
    /** Slot type identifier */
    type: AdSlotType;
    /** Current highest bid */
    currentBid: Bid | null;
    /** Second highest bid (for Vickrey pricing) */
    secondBid: Bid | null;
    /** Slot availability */
    isAvailable: boolean;
    /** Current price (second bid + 1%) */
    currentPrice: bigint;
    /** Time until slot expires */
    expiresIn: number;
}
/**
 * Budget allocation per slot type
 */
export interface BudgetAllocation {
    /** Slot type */
    slotType: AdSlotType;
    /** Maximum daily spend */
    dailyMax: bigint;
    /** Current day spend */
    currentSpend: bigint;
    /** Maximum bid per slot */
    maxBidPerSlot: bigint;
}
/**
 * Agent advertising budget
 */
export interface AdBudget {
    /** Total daily budget across all slots */
    totalDailyBudget: bigint;
    /** Current day total spend */
    currentDaySpend: bigint;
    /** Per-slot type allocations */
    allocations: Map<AdSlotType, BudgetAllocation>;
    /** Day start timestamp */
    dayStartTime: number;
}
/**
 * Bid result from auction
 */
export interface BidResult {
    /** Whether bid was accepted */
    accepted: boolean;
    /** Bid ID if accepted */
    bidId?: string;
    /** Actual price to pay (Vickrey: second bid + 1%) */
    actualPrice?: bigint;
    /** Position in queue if not immediately active */
    queuePosition?: number;
    /** Reason if bid rejected */
    rejectionReason?: string;
    /** Winning bid estimate */
    estimatedWinPrice?: bigint;
}
/**
 * Auction configuration
 */
export interface AuctionConfig {
    /** Minimum bid increment (percentage, e.g., 0.01 = 1%) */
    minBidIncrement: number;
    /** Bid duration in seconds */
    bidDuration: number;
    /** Price decay rate per hour (percentage) */
    decayRatePerHour: number;
    /** Reserve price multiplier */
    reserveMultiplier: number;
    /** Maximum bids per agent per slot */
    maxBidsPerAgent: number;
}
/**
 * Default auction configuration
 */
export declare const DEFAULT_AUCTION_CONFIG: AuctionConfig;
/**
 * Base prices per slot type (in wei)
 */
export declare const SLOT_BASE_PRICES: Record<AdSlotType, bigint>;
/**
 * Calculate Vickrey auction price (second price + increment)
 */
export declare function calculateVickreyPrice(highestBid: bigint, secondBid: bigint, config?: AuctionConfig): bigint;
/**
 * Calculate time-decayed price
 */
export declare function calculateDecayedPrice(originalPrice: bigint, placedAt: number, decayRatePerHour: number): bigint;
/**
 * Validate ad content
 */
export declare function validateAdContent(content: AdContent): {
    valid: boolean;
    errors: string[];
};
/**
 * Format bid amount for display
 */
export declare function formatBidAmount(amount: bigint): string;
/**
 * Get recommended bid for a slot
 */
export declare function getRecommendedBid(slotType: AdSlotType, slot: AuctionSlot | null, config?: AuctionConfig): bigint;
/**
 * Ad Auction Manager
 * Manages real-time bidding and slot allocation
 */
export declare class AdAuctionManager {
    private config;
    private agentId;
    private address;
    constructor(agentId: string, address: Address, config?: Partial<AuctionConfig>);
    /**
     * Initialize auction slots
     */
    private initializeSlots;
    /**
     * Create initial budget state
     */
    private createInitialBudget;
    /**
     * Reset daily budget if new day
     */
    private checkAndResetDailyBudget;
    /**
     * Get current auction state for a slot
     */
    getSlotState(slotType: AdSlotType): AuctionSlot | null;
    /**
     * Get all slot states
     */
    getAllSlots(): AuctionSlot[];
    /**
     * Place a bid on an ad slot
     */
    placeBid(request: BidRequest): BidResult;
    /**
     * Cancel a pending bid
     */
    cancelBid(bidId: string): boolean;
    /**
     * Get bid by ID
     */
    getBid(bidId: string): Bid | null;
    /**
     * Get all bids for this agent
     */
    getMyBids(): Bid[];
    /**
     * Get current budget state
     */
    getBudget(): AdBudget;
    /**
     * Update budget allocation
     */
    updateBudget(updates: Partial<AdBudget>): void;
    /**
     * Set allocation for a specific slot type
     */
    setSlotAllocation(slotType: AdSlotType, dailyMax: bigint, maxBidPerSlot: bigint): void;
    /**
     * Record ad spend (called when bid wins)
     */
    recordSpend(slotType: AdSlotType, amount: bigint): void;
    /**
     * Get recommended bid for a slot type
     */
    getRecommendedBid(slotType: AdSlotType): bigint;
    /**
     * Clean up expired bids
     */
    cleanupExpiredBids(): number;
    /**
     * Get agent ID
     */
    getAgentId(): string;
    /**
     * Get agent address
     */
    getAddress(): Address;
    /**
     * Get current configuration
     */
    getConfig(): AuctionConfig;
}
/**
 * Create or get auction manager for an agent
 */
export declare function getOrCreateAdAuctionManager(agentId: string, address: Address, config?: Partial<AuctionConfig>): AdAuctionManager;
/**
 * Get auction manager by agent ID
 */
export declare function getAdAuctionManager(agentId: string): AdAuctionManager | undefined;
/**
 * Remove auction manager
 */
export declare function removeAdAuctionManager(agentId: string): boolean;
/**
 * Get global auction statistics
 */
export declare function getAuctionStats(): {
    totalBids: number;
    activeBids: number;
    wonBids: number;
    expiredBids: number;
};
/**
 * Get all active bids across all agents
 */
export declare function getAllActiveBids(): Bid[];
export default AdAuctionManager;
//# sourceMappingURL=ad-auction.d.ts.map