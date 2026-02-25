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
import { parseEther, formatEther } from 'viem';
/**
 * Default auction configuration
 */
export const DEFAULT_AUCTION_CONFIG = {
    minBidIncrement: 0.01, // 1%
    bidDuration: 3600, // 1 hour
    decayRatePerHour: 0.05, // 5%
    reserveMultiplier: 1.5, // 150% of base price
    maxBidsPerAgent: 3
};
/**
 * Base prices per slot type (in wei)
 */
export const SLOT_BASE_PRICES = {
    banner: parseEther('0.001'),
    sidebar: parseEther('0.0005'),
    featured: parseEther('0.005'),
    popup: parseEther('0.002')
};
// In-memory storage (production should use persistent storage)
const bidStore = new Map();
const slotStore = new Map();
const budgetStore = new Map();
const agentBidsStore = new Map(); // agentId -> bidIds
/**
 * Generate unique bid ID
 */
function generateBidId() {
    return `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Calculate Vickrey auction price (second price + increment)
 */
export function calculateVickreyPrice(highestBid, secondBid, config = DEFAULT_AUCTION_CONFIG) {
    // Price = second highest bid + minimum increment
    const increment = (secondBid * BigInt(Math.round(config.minBidIncrement * 10000))) / 10000n;
    return secondBid + increment;
}
/**
 * Calculate time-decayed price
 */
export function calculateDecayedPrice(originalPrice, placedAt, decayRatePerHour) {
    const hoursElapsed = (Date.now() - placedAt) / (1000 * 60 * 60);
    const decayFactor = Math.max(0, 1 - (hoursElapsed * decayRatePerHour));
    return (originalPrice * BigInt(Math.round(decayFactor * 10000))) / 10000n;
}
/**
 * Validate ad content
 */
export function validateAdContent(content) {
    const errors = [];
    if (!content.title || content.title.length > 100) {
        errors.push('Title must be between 1-100 characters');
    }
    if (!content.description || content.description.length > 300) {
        errors.push('Description must be between 1-300 characters');
    }
    if (!content.targetUrl || !content.targetUrl.match(/^https?:\/\/.+/)) {
        errors.push('Target URL must be a valid HTTP/HTTPS URL');
    }
    if (content.imageUrl && content.imageUrl.length > 500) {
        errors.push('Image URL must be less than 500 characters');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Format bid amount for display
 */
export function formatBidAmount(amount) {
    return `${formatEther(amount)} ETH`;
}
/**
 * Get recommended bid for a slot
 */
export function getRecommendedBid(slotType, slot, config = DEFAULT_AUCTION_CONFIG) {
    const basePrice = SLOT_BASE_PRICES[slotType];
    if (!slot || !slot.currentBid) {
        // No current bid, return base price with reserve multiplier
        return (basePrice * BigInt(Math.round(config.reserveMultiplier * 100))) / 100n;
    }
    // Suggest bid higher than current by minimum increment
    const increment = (slot.currentBid.amount * BigInt(Math.round(config.minBidIncrement * 10000))) / 10000n;
    return slot.currentBid.amount + increment;
}
/**
 * Ad Auction Manager
 * Manages real-time bidding and slot allocation
 */
export class AdAuctionManager {
    config;
    agentId;
    address;
    constructor(agentId, address, config = {}) {
        this.agentId = agentId;
        this.address = address;
        this.config = { ...DEFAULT_AUCTION_CONFIG, ...config };
        // Initialize slots
        this.initializeSlots();
        // Initialize agent budget if not exists
        if (!budgetStore.has(agentId)) {
            budgetStore.set(agentId, this.createInitialBudget());
        }
        // Initialize agent bids tracking
        if (!agentBidsStore.has(agentId)) {
            agentBidsStore.set(agentId, new Set());
        }
    }
    /**
     * Initialize auction slots
     */
    initializeSlots() {
        const slotTypes = ['banner', 'sidebar', 'featured', 'popup'];
        for (const type of slotTypes) {
            if (!slotStore.has(type)) {
                slotStore.set(type, {
                    type,
                    currentBid: null,
                    secondBid: null,
                    isAvailable: true,
                    currentPrice: SLOT_BASE_PRICES[type],
                    expiresIn: 0
                });
            }
        }
    }
    /**
     * Create initial budget state
     */
    createInitialBudget() {
        const allocations = new Map();
        for (const slotType of Object.keys(SLOT_BASE_PRICES)) {
            allocations.set(slotType, {
                slotType,
                dailyMax: parseEther('0.1'), // Default 0.1 ETH per slot type
                currentSpend: 0n,
                maxBidPerSlot: SLOT_BASE_PRICES[slotType] * 10n // 10x base price
            });
        }
        return {
            totalDailyBudget: parseEther('0.5'), // Default 0.5 ETH total
            currentDaySpend: 0n,
            allocations,
            dayStartTime: Date.now()
        };
    }
    /**
     * Reset daily budget if new day
     */
    checkAndResetDailyBudget() {
        const budget = budgetStore.get(this.agentId);
        if (!budget)
            return;
        const dayInMs = 24 * 60 * 60 * 1000;
        if (Date.now() - budget.dayStartTime > dayInMs) {
            budget.currentDaySpend = 0n;
            budget.dayStartTime = Date.now();
            for (const allocation of budget.allocations.values()) {
                allocation.currentSpend = 0n;
            }
            budgetStore.set(this.agentId, budget);
        }
    }
    /**
     * Get current auction state for a slot
     */
    getSlotState(slotType) {
        return slotStore.get(slotType) || null;
    }
    /**
     * Get all slot states
     */
    getAllSlots() {
        return Array.from(slotStore.values());
    }
    /**
     * Place a bid on an ad slot
     */
    placeBid(request) {
        // Check daily budget
        this.checkAndResetDailyBudget();
        const budget = budgetStore.get(this.agentId);
        const allocation = budget.allocations.get(request.slotType);
        if (!allocation) {
            return { accepted: false, rejectionReason: 'Invalid slot type' };
        }
        // Validate content
        const contentValidation = validateAdContent(request.content);
        if (!contentValidation.valid) {
            return {
                accepted: false,
                rejectionReason: `Invalid content: ${contentValidation.errors.join(', ')}`
            };
        }
        // Check budget constraints
        if (budget.currentDaySpend >= budget.totalDailyBudget) {
            return { accepted: false, rejectionReason: 'Daily budget exhausted' };
        }
        if (allocation.currentSpend >= allocation.dailyMax) {
            return { accepted: false, rejectionReason: 'Slot type daily budget exhausted' };
        }
        if (request.maxBid > allocation.maxBidPerSlot) {
            return {
                accepted: false,
                rejectionReason: `Bid exceeds maximum per-slot bid of ${formatBidAmount(allocation.maxBidPerSlot)}`
            };
        }
        // Check max bids per agent (count both active and pending bids on this slot)
        const agentBids = agentBidsStore.get(this.agentId);
        const slotBids = Array.from(agentBids)
            .map(id => bidStore.get(id))
            .filter(bid => bid && (bid.status === 'pending' || bid.status === 'active') && bid.slotType === request.slotType);
        if (slotBids.length >= this.config.maxBidsPerAgent) {
            return {
                accepted: false,
                rejectionReason: `Maximum ${this.config.maxBidsPerAgent} active bids per slot type`
            };
        }
        // Check minimum bid (must be >= base price)
        const basePrice = SLOT_BASE_PRICES[request.slotType];
        if (request.maxBid < basePrice) {
            return {
                accepted: false,
                rejectionReason: `Bid must be at least ${formatBidAmount(basePrice)}`
            };
        }
        // Get current slot state
        const slot = slotStore.get(request.slotType);
        // Create bid
        const bidId = generateBidId();
        const bid = {
            id: bidId,
            agentId: this.agentId,
            bidder: this.address,
            amount: request.maxBid,
            slotType: request.slotType,
            placedAt: Date.now(),
            expiresAt: request.expiresAt,
            content: request.content,
            status: 'pending',
            chain: request.chain
        };
        // Store bid
        bidStore.set(bidId, bid);
        agentBids.add(bidId);
        // Process bid against current slot state
        if (!slot.currentBid || request.maxBid > slot.currentBid.amount) {
            // New highest bid
            if (slot.currentBid) {
                // Move current bid to second place
                slot.secondBid = slot.currentBid;
                slot.currentBid.status = 'lost';
                bidStore.set(slot.currentBid.id, slot.currentBid);
            }
            slot.currentBid = bid;
            bid.status = 'active';
            bidStore.set(bidId, bid);
            // Calculate Vickrey price
            const vickreyPrice = slot.secondBid
                ? calculateVickreyPrice(bid.amount, slot.secondBid.amount, this.config)
                : bid.amount;
            slot.currentPrice = vickreyPrice;
            slot.expiresIn = request.expiresAt - Math.floor(Date.now() / 1000);
            slotStore.set(request.slotType, slot);
            return {
                accepted: true,
                bidId,
                actualPrice: vickreyPrice,
                queuePosition: 0
            };
        }
        else {
            // Not highest, place as second or reject
            if (!slot.secondBid || request.maxBid > slot.secondBid.amount) {
                slot.secondBid = bid;
                slotStore.set(request.slotType, slot);
            }
            // Calculate estimated win price
            const estimatedWinPrice = calculateVickreyPrice(slot.currentBid.amount, request.maxBid, this.config);
            return {
                accepted: true,
                bidId,
                queuePosition: 1,
                estimatedWinPrice
            };
        }
    }
    /**
     * Cancel a pending bid
     */
    cancelBid(bidId) {
        const bid = bidStore.get(bidId);
        if (!bid)
            return false;
        if (bid.agentId !== this.agentId) {
            throw new Error('Cannot cancel another agent\'s bid');
        }
        if (bid.status !== 'pending' && bid.status !== 'active') {
            return false;
        }
        // Update slot if this was the current bid
        const slot = slotStore.get(bid.slotType);
        if (slot && slot.currentBid?.id === bidId) {
            slot.currentBid = slot.secondBid;
            slot.secondBid = null;
            slot.currentPrice = slot.currentBid
                ? calculateVickreyPrice(slot.currentBid.amount, 0n, this.config)
                : SLOT_BASE_PRICES[bid.slotType];
            slotStore.set(bid.slotType, slot);
        }
        bid.status = 'expired';
        bidStore.set(bidId, bid);
        return true;
    }
    /**
     * Get bid by ID
     */
    getBid(bidId) {
        return bidStore.get(bidId) || null;
    }
    /**
     * Get all bids for this agent
     */
    getMyBids() {
        const bidIds = agentBidsStore.get(this.agentId);
        if (!bidIds)
            return [];
        return Array.from(bidIds)
            .map(id => bidStore.get(id))
            .filter((bid) => bid !== undefined);
    }
    /**
     * Get current budget state
     */
    getBudget() {
        this.checkAndResetDailyBudget();
        const budget = budgetStore.get(this.agentId);
        return {
            ...budget,
            allocations: new Map(budget.allocations)
        };
    }
    /**
     * Update budget allocation
     */
    updateBudget(updates) {
        const budget = budgetStore.get(this.agentId);
        if (!budget)
            return;
        if (updates.totalDailyBudget !== undefined) {
            budget.totalDailyBudget = updates.totalDailyBudget;
        }
        if (updates.allocations) {
            for (const [slotType, allocation] of updates.allocations) {
                budget.allocations.set(slotType, allocation);
            }
        }
        budgetStore.set(this.agentId, budget);
    }
    /**
     * Set allocation for a specific slot type
     */
    setSlotAllocation(slotType, dailyMax, maxBidPerSlot) {
        const budget = budgetStore.get(this.agentId);
        if (!budget)
            return;
        budget.allocations.set(slotType, {
            slotType,
            dailyMax,
            currentSpend: 0n,
            maxBidPerSlot
        });
        budgetStore.set(this.agentId, budget);
    }
    /**
     * Record ad spend (called when bid wins)
     */
    recordSpend(slotType, amount) {
        const budget = budgetStore.get(this.agentId);
        if (!budget)
            return;
        budget.currentDaySpend += amount;
        const allocation = budget.allocations.get(slotType);
        if (allocation) {
            allocation.currentSpend += amount;
        }
        budgetStore.set(this.agentId, budget);
    }
    /**
     * Get recommended bid for a slot type
     */
    getRecommendedBid(slotType) {
        const slot = slotStore.get(slotType);
        return getRecommendedBid(slotType, slot || null, this.config);
    }
    /**
     * Clean up expired bids
     */
    cleanupExpiredBids() {
        let cleaned = 0;
        const now = Math.floor(Date.now() / 1000);
        for (const [bidId, bid] of bidStore) {
            if (bid.status === 'pending' && bid.expiresAt < now) {
                bid.status = 'expired';
                bidStore.set(bidId, bid);
                cleaned++;
                // Update slot if this was current or second bid
                const slot = slotStore.get(bid.slotType);
                if (slot) {
                    if (slot.currentBid?.id === bidId) {
                        slot.currentBid = slot.secondBid;
                        slot.secondBid = null;
                        slot.currentPrice = slot.currentBid
                            ? calculateVickreyPrice(slot.currentBid.amount, 0n, this.config)
                            : SLOT_BASE_PRICES[bid.slotType];
                        slotStore.set(bid.slotType, slot);
                    }
                    else if (slot.secondBid?.id === bidId) {
                        slot.secondBid = null;
                        slotStore.set(bid.slotType, slot);
                    }
                }
            }
        }
        return cleaned;
    }
    /**
     * Get agent ID
     */
    getAgentId() {
        return this.agentId;
    }
    /**
     * Get agent address
     */
    getAddress() {
        return this.address;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Global auction manager registry
 */
const globalManagers = new Map();
/**
 * Create or get auction manager for an agent
 */
export function getOrCreateAdAuctionManager(agentId, address, config) {
    if (!globalManagers.has(agentId)) {
        globalManagers.set(agentId, new AdAuctionManager(agentId, address, config));
    }
    return globalManagers.get(agentId);
}
/**
 * Get auction manager by agent ID
 */
export function getAdAuctionManager(agentId) {
    return globalManagers.get(agentId);
}
/**
 * Remove auction manager
 */
export function removeAdAuctionManager(agentId) {
    return globalManagers.delete(agentId);
}
/**
 * Get global auction statistics
 */
export function getAuctionStats() {
    let activeBids = 0;
    let wonBids = 0;
    let expiredBids = 0;
    for (const bid of bidStore.values()) {
        if (bid.status === 'active')
            activeBids++;
        else if (bid.status === 'won')
            wonBids++;
        else if (bid.status === 'expired')
            expiredBids++;
    }
    return {
        totalBids: bidStore.size,
        activeBids,
        wonBids,
        expiredBids
    };
}
/**
 * Get all active bids across all agents
 */
export function getAllActiveBids() {
    return Array.from(bidStore.values()).filter(bid => bid.status === 'active');
}
/**
 * Reset all auction stores (for testing only)
 * @internal
 */
export function __resetAuctionStores() {
    bidStore.clear();
    slotStore.clear();
    budgetStore.clear();
    agentBidsStore.clear();
    globalManagers.clear();
    // Re-initialize slots
    const slotTypes = ['banner', 'sidebar', 'featured', 'popup'];
    for (const type of slotTypes) {
        slotStore.set(type, {
            type,
            currentBid: null,
            secondBid: null,
            isAvailable: true,
            currentPrice: SLOT_BASE_PRICES[type],
            expiresIn: 0
        });
    }
}
export default AdAuctionManager;
//# sourceMappingURL=ad-auction.js.map