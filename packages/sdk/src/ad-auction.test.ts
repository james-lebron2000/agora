import { describe, it, expect, beforeEach } from 'vitest';
import {
  AdAuctionManager,
  getOrCreateAdAuctionManager,
  getAdAuctionManager,
  removeAdAuctionManager,
  getAuctionStats,
  getAllActiveBids,
  calculateVickreyPrice,
  calculateDecayedPrice,
  validateAdContent,
  formatBidAmount,
  getRecommendedBid,
  DEFAULT_AUCTION_CONFIG,
  SLOT_BASE_PRICES,
  __resetAuctionStores,
  type BidRequest,
  type AdContent,
  type AdSlotType
} from './ad-auction.js';
import { parseEther } from 'viem';

// Generate unique agent ID for test isolation
let testCounter = 0;
function getUniqueAgentId(): string {
  return `test_agent_${Date.now()}_${testCounter++}`;
}

describe('Ad Auction Module', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;

  beforeEach(() => {
    // Reset all stores before each test for isolation
    __resetAuctionStores();
  });

  describe('calculateVickreyPrice', () => {
    it('should calculate Vickrey price with minimum increment', () => {
      const highest = parseEther('1');
      const second = parseEther('0.5');
      const price = calculateVickreyPrice(highest, second, DEFAULT_AUCTION_CONFIG);
      
      // Should be second price + 1% (default increment)
      const expected = second + (second * 1n) / 100n;
      expect(price).toBe(expected);
    });

    it('should handle zero second bid', () => {
      const highest = parseEther('1');
      const second = 0n;
      const price = calculateVickreyPrice(highest, second, DEFAULT_AUCTION_CONFIG);
      
      // Should be 0 + 1% of 0 = 0
      expect(price).toBe(0n);
    });

    it('should handle equal bids', () => {
      const bid = parseEther('0.5');
      const price = calculateVickreyPrice(bid, bid, DEFAULT_AUCTION_CONFIG);
      
      const expected = bid + (bid * 1n) / 100n;
      expect(price).toBe(expected);
    });
  });

  describe('calculateDecayedPrice', () => {
    it('should calculate decayed price over time', () => {
      const originalPrice = parseEther('1');
      const placedAt = Date.now() - (1000 * 60 * 60); // 1 hour ago
      const decayRate = 0.05; // 5% per hour
      
      const decayed = calculateDecayedPrice(originalPrice, placedAt, decayRate);
      
      // Should be 95% of original (5% decay after 1 hour)
      const expected = (originalPrice * 95n) / 100n;
      expect(decayed).toBe(expected);
    });

    it('should return zero after full decay', () => {
      const originalPrice = parseEther('1');
      const placedAt = Date.now() - (1000 * 60 * 60 * 24); // 24 hours ago
      const decayRate = 0.05; // 5% per hour
      
      const decayed = calculateDecayedPrice(originalPrice, placedAt, decayRate);
      
      // Should be at or near zero (decayed beyond 100%)
      expect(decayed).toBeLessThanOrEqual(parseEther('0.01'));
    });

    it('should return full price for fresh bids', () => {
      const originalPrice = parseEther('1');
      const placedAt = Date.now();
      const decayRate = 0.05;
      
      const decayed = calculateDecayedPrice(originalPrice, placedAt, decayRate);
      
      expect(decayed).toBe(originalPrice);
    });
  });

  describe('validateAdContent', () => {
    const validContent: AdContent = {
      title: 'Test Ad',
      description: 'This is a test advertisement',
      targetUrl: 'https://example.com',
      imageUrl: 'https://example.com/image.png',
      campaignId: 'campaign_001'
    };

    it('should validate correct content', () => {
      const result = validateAdContent(validContent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title', () => {
      const result = validateAdContent({ ...validContent, title: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be between 1-100 characters');
    });

    it('should reject title too long', () => {
      const result = validateAdContent({ ...validContent, title: 'a'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be between 1-100 characters');
    });

    it('should reject empty description', () => {
      const result = validateAdContent({ ...validContent, description: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be between 1-300 characters');
    });

    it('should reject description too long', () => {
      const result = validateAdContent({ ...validContent, description: 'a'.repeat(301) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be between 1-300 characters');
    });

    it('should reject invalid URL', () => {
      const result = validateAdContent({ ...validContent, targetUrl: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target URL must be a valid HTTP/HTTPS URL');
    });

    it('should reject FTP URL', () => {
      const result = validateAdContent({ ...validContent, targetUrl: 'ftp://example.com' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target URL must be a valid HTTP/HTTPS URL');
    });

    it('should reject image URL too long', () => {
      const result = validateAdContent({ ...validContent, imageUrl: 'https://example.com/' + 'a'.repeat(500) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL must be less than 500 characters');
    });

    it('should accept content without optional imageUrl', () => {
      const { imageUrl, ...contentWithoutImage } = validContent;
      const result = validateAdContent(contentWithoutImage);
      expect(result.valid).toBe(true);
    });

    it('should accept content without optional campaignId', () => {
      const { campaignId, ...contentWithoutCampaign } = validContent;
      const result = validateAdContent(contentWithoutCampaign);
      expect(result.valid).toBe(true);
    });
  });

  describe('formatBidAmount', () => {
    it('should format wei to ETH string', () => {
      const amount = parseEther('1.5');
      const formatted = formatBidAmount(amount);
      expect(formatted).toBe('1.5 ETH');
    });

    it('should format small amounts', () => {
      const amount = parseEther('0.001');
      const formatted = formatBidAmount(amount);
      expect(formatted).toContain('ETH');
    });
  });

  describe('getRecommendedBid', () => {
    it('should return base price with reserve multiplier when no current bid', () => {
      const recommended = getRecommendedBid('banner', null, DEFAULT_AUCTION_CONFIG);
      const basePrice = SLOT_BASE_PRICES['banner'];
      const expected = (basePrice * 150n) / 100n; // 150% = 1.5x
      expect(recommended).toBe(expected);
    });

    it('should suggest higher bid than current', () => {
      const currentBid = {
        id: 'bid_1',
        agentId: 'agent_001',
        bidder: mockAddress,
        amount: parseEther('0.01'),
        slotType: 'banner' as AdSlotType,
        placedAt: Date.now(),
        expiresAt: Date.now() + 3600,
        content: { title: 'Test', description: 'Test', targetUrl: 'https://example.com' },
        status: 'active' as const,
        chain: 'base' as const
      };

      const slot = {
        type: 'banner' as AdSlotType,
        currentBid,
        secondBid: null,
        isAvailable: true,
        currentPrice: parseEther('0.01'),
        expiresIn: 3600
      };

      const recommended = getRecommendedBid('banner', slot, DEFAULT_AUCTION_CONFIG);
      expect(recommended).toBeGreaterThan(currentBid.amount);
    });

    it('should handle all slot types', () => {
      const slotTypes: AdSlotType[] = ['banner', 'sidebar', 'featured', 'popup'];
      
      for (const type of slotTypes) {
        const recommended = getRecommendedBid(type, null, DEFAULT_AUCTION_CONFIG);
        expect(recommended).toBeGreaterThan(0n);
      }
    });
  });

  describe('AdAuctionManager', () => {
    describe('constructor', () => {
      it('should initialize with agent ID and address', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        expect(manager.getAgentId()).toBe(agentId);
        expect(manager.getAddress()).toBe(mockAddress);
      });

      it('should use default config when not provided', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        expect(manager.getConfig()).toEqual(DEFAULT_AUCTION_CONFIG);
      });

      it('should merge custom config with defaults', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress, {
          bidDuration: 7200,
          minBidIncrement: 0.05
        });
        
        const config = manager.getConfig();
        expect(config.bidDuration).toBe(7200);
        expect(config.minBidIncrement).toBe(0.05);
        expect(config.decayRatePerHour).toBe(DEFAULT_AUCTION_CONFIG.decayRatePerHour);
      });

      it('should initialize all slot types', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const slots = manager.getAllSlots();
        expect(slots).toHaveLength(4);
        
        const slotTypes = slots.map(s => s.type);
        expect(slotTypes).toContain('banner');
        expect(slotTypes).toContain('sidebar');
        expect(slotTypes).toContain('featured');
        expect(slotTypes).toContain('popup');
      });
    });

    describe('placeBid', () => {
      const createValidBidRequest = (): BidRequest => ({
        slotType: 'banner',
        maxBid: parseEther('0.01'),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        content: {
          title: 'Test Ad',
          description: 'Test description',
          targetUrl: 'https://example.com'
        },
        chain: 'base'
      });

      it('should accept valid bid and become active', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const result = manager.placeBid(createValidBidRequest());
        
        expect(result.accepted).toBe(true);
        expect(result.bidId).toBeDefined();
        expect(result.queuePosition).toBe(0);
        expect(result.actualPrice).toBeDefined();
      });

      it('should reject bid with invalid content', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const invalidRequest = {
          ...createValidBidRequest(),
          content: { ...createValidBidRequest().content, title: '' }
        };
        
        const result = manager.placeBid(invalidRequest);
        expect(result.accepted).toBe(false);
        expect(result.rejectionReason).toContain('Invalid content');
      });

      it('should reject bid below base price', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const lowBidRequest = {
          ...createValidBidRequest(),
          maxBid: parseEther('0.0001') // Below banner base price
        };
        
        const result = manager.placeBid(lowBidRequest);
        expect(result.accepted).toBe(false);
        expect(result.rejectionReason).toContain('Bid must be at least');
      });

      it('should handle competing bids from different agents', () => {
        const agentId1 = getUniqueAgentId();
        const agentId2 = getUniqueAgentId();
        const address2 = '0x2345678901234567890123456789012345678901' as const;
        
        const manager1 = new AdAuctionManager(agentId1, mockAddress);
        const manager2 = new AdAuctionManager(agentId2, address2);
        
        // Increase max bid limits for both agents
        manager1.setSlotAllocation('banner', parseEther('0.1'), parseEther('0.05'));
        manager2.setSlotAllocation('banner', parseEther('0.1'), parseEther('0.05'));
        
        // First bid wins
        const result1 = manager1.placeBid(createValidBidRequest());
        expect(result1.accepted).toBe(true);
        expect(result1.queuePosition).toBe(0);

        // Second agent bids higher
        const result2 = manager2.placeBid({
          ...createValidBidRequest(),
          maxBid: parseEther('0.02')
        });
        
        expect(result2.accepted).toBe(true);
        expect(result2.queuePosition).toBe(0); // New highest
      });

      it('should limit bids per agent per slot', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const baseRequest = createValidBidRequest();

        // Increase max bid limits for banner slot
        manager.setSlotAllocation('banner', parseEther('0.1'), parseEther('0.05'));

        // First, place an initial bid that will be the current highest (active)
        const result1 = manager.placeBid({
          ...baseRequest,
          maxBid: parseEther('0.03'), // Highest bid
          content: { ...baseRequest.content, title: 'Ad 0' }
        });
        expect(result1.accepted).toBe(true);
        expect(result1.queuePosition).toBe(0);

        // Place additional lower bids that will be pending (second bid and beyond)
        // These don't become active because they're lower than the current highest
        for (let i = 1; i < DEFAULT_AUCTION_CONFIG.maxBidsPerAgent; i++) {
          const result = manager.placeBid({
            ...baseRequest,
            maxBid: parseEther(`0.01${i}`), // Lower bids: 0.011, 0.012 ETH
            content: { ...baseRequest.content, title: `Ad ${i}` }
          });
          expect(result.accepted).toBe(true);
        }

        // Next bid on same slot should be rejected (max 3 active bids per slot)
        const result = manager.placeBid({
          ...baseRequest,
          maxBid: parseEther('0.009'), // Even lower bid
          content: { ...baseRequest.content, title: 'Extra Ad' }
        });
        
        expect(result.accepted).toBe(false);
        expect(result.rejectionReason).toContain('Maximum');
      });

      it('should calculate Vickrey price for winning bid', () => {
        const agentId1 = getUniqueAgentId();
        const agentId2 = getUniqueAgentId();
        const address2 = '0x2345678901234567890123456789012345678901' as const;
        
        const manager1 = new AdAuctionManager(agentId1, mockAddress);
        const manager2 = new AdAuctionManager(agentId2, address2);
        
        // Increase max bid limits for both agents
        manager1.setSlotAllocation('banner', parseEther('0.1'), parseEther('0.05'));
        manager2.setSlotAllocation('banner', parseEther('0.1'), parseEther('0.05'));
        
        // First bid - no second bid yet so pays full amount
        const firstBidAmount = parseEther('0.01');
        const result1 = manager1.placeBid({
          ...createValidBidRequest(),
          maxBid: firstBidAmount
        });
        expect(result1.actualPrice).toBe(firstBidAmount);

        // Second higher bid - should trigger Vickrey pricing
        const result2 = manager2.placeBid({
          ...createValidBidRequest(),
          maxBid: parseEther('0.02')
        });
        
        expect(result2.actualPrice).toBeDefined();
        // Should be first bid + 1%
        const expectedVickrey = firstBidAmount + (firstBidAmount * 1n) / 100n;
        expect(result2.actualPrice).toBe(expectedVickrey);
      });
    });

    describe('cancelBid', () => {
      const createValidBidRequest = (): BidRequest => ({
        slotType: 'banner',
        maxBid: parseEther('0.01'),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        content: {
          title: 'Test Ad',
          description: 'Test description',
          targetUrl: 'https://example.com'
        },
        chain: 'base'
      });

      it('should cancel pending bid', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);

        const result = manager.placeBid(createValidBidRequest());
        expect(result.bidId).toBeDefined();

        const cancelled = manager.cancelBid(result.bidId!);
        expect(cancelled).toBe(true);

        const bid = manager.getBid(result.bidId!);
        expect(bid?.status).toBe('expired');
      });

      it('should not cancel non-existent bid', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const cancelled = manager.cancelBid('non_existent_bid');
        expect(cancelled).toBe(false);
      });

      it('should prevent cancelling other agent\'s bid', () => {
        const agentId1 = getUniqueAgentId();
        const agentId2 = getUniqueAgentId();
        const address2 = '0x2345678901234567890123456789012345678901' as const;

        const manager1 = new AdAuctionManager(agentId1, mockAddress);
        const manager2 = new AdAuctionManager(agentId2, address2);

        const result = manager1.placeBid(createValidBidRequest());
        expect(result.bidId).toBeDefined();
        
        expect(() => manager2.cancelBid(result.bidId!)).toThrow('Cannot cancel another agent\'s bid');
      });
    });

    describe('getMyBids', () => {
      const createValidBidRequest = (): BidRequest => ({
        slotType: 'banner',
        maxBid: parseEther('0.01'),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        content: {
          title: 'Test Ad',
          description: 'Test description',
          targetUrl: 'https://example.com'
        },
        chain: 'base'
      });

      it('should return empty array for new agent', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const bids = manager.getMyBids();
        expect(bids).toEqual([]);
      });

      it('should return placed bids', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);

        manager.placeBid(createValidBidRequest());
        const bids = manager.getMyBids();
        
        expect(bids).toHaveLength(1);
        expect(bids[0].slotType).toBe('banner');
      });
    });

    describe('getBudget / updateBudget', () => {
      it('should return initial budget', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const budget = manager.getBudget();
        
        expect(budget.totalDailyBudget).toBe(parseEther('0.5'));
        expect(budget.currentDaySpend).toBe(0n);
        expect(budget.allocations.size).toBe(4);
      });

      it('should update total budget', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        manager.updateBudget({ totalDailyBudget: parseEther('1.0') });
        
        const budget = manager.getBudget();
        expect(budget.totalDailyBudget).toBe(parseEther('1.0'));
      });

      it('should set slot allocation', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        manager.setSlotAllocation('banner', parseEther('0.2'), parseEther('0.05'));
        
        const budget = manager.getBudget();
        const allocation = budget.allocations.get('banner');
        
        expect(allocation?.dailyMax).toBe(parseEther('0.2'));
        expect(allocation?.maxBidPerSlot).toBe(parseEther('0.05'));
      });
    });

    describe('recordSpend', () => {
      it('should record spend and update budget', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        manager.recordSpend('banner', parseEther('0.01'));
        
        const budget = manager.getBudget();
        expect(budget.currentDaySpend).toBe(parseEther('0.01'));
        expect(budget.allocations.get('banner')?.currentSpend).toBe(parseEther('0.01'));
      });
    });

    describe('getRecommendedBid', () => {
      it('should return recommended bid for slot', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const recommended = manager.getRecommendedBid('banner');
        expect(recommended).toBeGreaterThan(0n);
      });
    });

    describe('cleanupExpiredBids', () => {
      it('should clean up expired bids', () => {
        const agentId = getUniqueAgentId();
        const manager = new AdAuctionManager(agentId, mockAddress);
        const cleaned = manager.cleanupExpiredBids();
        expect(typeof cleaned).toBe('number');
      });
    });
  });

  describe('Global manager registry', () => {
    it('should create and retrieve manager', () => {
      const agentId = getUniqueAgentId();
      const manager = getOrCreateAdAuctionManager(agentId, mockAddress);
      expect(manager).toBeDefined();
      expect(manager.getAgentId()).toBe(agentId);

      const retrieved = getAdAuctionManager(agentId);
      expect(retrieved).toBe(manager);
      
      // Cleanup
      removeAdAuctionManager(agentId);
    });

    it('should return same manager for same agent', () => {
      const agentId = getUniqueAgentId();
      const manager1 = getOrCreateAdAuctionManager(agentId, mockAddress);
      const manager2 = getOrCreateAdAuctionManager(agentId, mockAddress);
      expect(manager1).toBe(manager2);
      
      // Cleanup
      removeAdAuctionManager(agentId);
    });

    it('should return undefined for non-existent manager', () => {
      const manager = getAdAuctionManager('non_existent_agent_99999');
      expect(manager).toBeUndefined();
    });

    it('should remove manager', () => {
      const agentId = getUniqueAgentId();
      getOrCreateAdAuctionManager(agentId, mockAddress);
      
      const removed = removeAdAuctionManager(agentId);
      expect(removed).toBe(true);
      
      const manager = getAdAuctionManager(agentId);
      expect(manager).toBeUndefined();
    });

    it('should return false when removing non-existent manager', () => {
      const removed = removeAdAuctionManager('non_existent_agent_99999');
      expect(removed).toBe(false);
    });
  });

  describe('Global statistics', () => {
    it('should return auction stats', () => {
      const stats = getAuctionStats();
      
      expect(stats).toHaveProperty('totalBids');
      expect(stats).toHaveProperty('activeBids');
      expect(stats).toHaveProperty('wonBids');
      expect(stats).toHaveProperty('expiredBids');
    });

    it('should return active bids array', () => {
      const bids = getAllActiveBids();
      expect(Array.isArray(bids)).toBe(true);
    });
  });

  describe('Slot state', () => {
    it('should get slot state', () => {
      const agentId = getUniqueAgentId();
      const manager = new AdAuctionManager(agentId, mockAddress);
      const slot = manager.getSlotState('banner');
      expect(slot).toBeDefined();
      expect(slot?.type).toBe('banner');
    });

    it('should return all slots', () => {
      const agentId = getUniqueAgentId();
      const manager = new AdAuctionManager(agentId, mockAddress);
      const slots = manager.getAllSlots();
      expect(slots).toHaveLength(4);
    });
  });

  describe('Budget constraints', () => {
    const createValidBidRequest = (): BidRequest => ({
      slotType: 'sidebar', // Use sidebar to avoid conflicts with other tests
      maxBid: parseEther('0.01'),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      content: {
        title: 'Test Ad',
        description: 'Test description',
        targetUrl: 'https://example.com'
      },
      chain: 'base'
    });

    it('should reject bid exceeding max bid per slot', () => {
      const agentId = getUniqueAgentId();
      const manager = new AdAuctionManager(agentId, mockAddress);
      
      // Set a low max bid
      manager.setSlotAllocation('sidebar', parseEther('0.1'), parseEther('0.001'));
      
      const bidRequest: BidRequest = {
        ...createValidBidRequest(),
        slotType: 'sidebar',
        maxBid: parseEther('0.01') // Exceeds max
      };

      const result = manager.placeBid(bidRequest);
      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toContain('exceeds maximum');
    });

    it('should reject bid when slot type daily budget exhausted', () => {
      const agentId = getUniqueAgentId();
      const manager = new AdAuctionManager(agentId, mockAddress);
      
      // Set a very low daily max for sidebar
      manager.setSlotAllocation('sidebar', parseEther('0.001'), parseEther('0.01'));
      
      // Exhaust the slot budget
      manager.recordSpend('sidebar', parseEther('0.001'));
      
      const bidRequest: BidRequest = {
        ...createValidBidRequest(),
        slotType: 'sidebar',
        maxBid: parseEther('0.001') // Valid bid amount
      };

      const result = manager.placeBid(bidRequest);
      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toBe('Slot type daily budget exhausted');
    });

    it('should reject bid when total daily budget exhausted', () => {
      const agentId = getUniqueAgentId();
      const manager = new AdAuctionManager(agentId, mockAddress);
      
      // Exhaust the total daily budget
      manager.recordSpend('banner', parseEther('0.5'));
      
      const bidRequest: BidRequest = {
        ...createValidBidRequest(),
        slotType: 'sidebar',
        maxBid: parseEther('0.001')
      };

      const result = manager.placeBid(bidRequest);
      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toBe('Daily budget exhausted');
    });
  });

  describe('Constants', () => {
    it('should have correct slot base prices', () => {
      expect(SLOT_BASE_PRICES.banner).toBe(parseEther('0.001'));
      expect(SLOT_BASE_PRICES.sidebar).toBe(parseEther('0.0005'));
      expect(SLOT_BASE_PRICES.featured).toBe(parseEther('0.005'));
      expect(SLOT_BASE_PRICES.popup).toBe(parseEther('0.002'));
    });

    it('should have correct default config', () => {
      expect(DEFAULT_AUCTION_CONFIG.minBidIncrement).toBe(0.01);
      expect(DEFAULT_AUCTION_CONFIG.bidDuration).toBe(3600);
      expect(DEFAULT_AUCTION_CONFIG.decayRatePerHour).toBe(0.05);
      expect(DEFAULT_AUCTION_CONFIG.reserveMultiplier).toBe(1.5);
      expect(DEFAULT_AUCTION_CONFIG.maxBidsPerAgent).toBe(3);
    });
  });
});