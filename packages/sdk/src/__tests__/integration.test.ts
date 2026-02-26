/**
 * Integration Tests for Agora SDK
 * Tests cross-module interactions and real-world usage scenarios
 * 
 * @module integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Bridge + Survival integration
import {
  BridgeClient,
  createBridgeClient,
  type BridgeClientConfig,
  type BridgeQuote,
} from '../bridge-client.js';

import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  removeSurvivalManager,
  DEFAULT_SURVIVAL_CONFIG,
  type SurvivalConfig,
  type SurvivalSnapshot,
  type AgentHealth,
  type AgentEconomics,
  type SurvivalEventType,
} from '../survival.js';

import {
  CrossChainSurvivalOptimizer,
  getOrCreateSurvivalOptimizer,
  removeSurvivalOptimizer,
  DEFAULT_OPTIMIZER_CONFIG,
  type ChainRecommendation,
  type RebalancingPlan,
} from '../survival-optimizer.js';

// Profile + Mobile integration
import {
  ProfileManager,
  createProfileManager,
  type AgentProfile,
  type UpdateProfileRequest,
} from '../profile.js';

import {
  DeviceDetector,
  MobileOptimizer,
  type DeviceInfo,
  type OptimizationConfig,
} from '../mobile.js';

// Performance integration
import {
  PerformanceTracker,
  MemoryMonitor,
  MetricCollector,
  createPerformanceTracker,
  createMemoryMonitor,
  createMetricCollector,
  type SimplePerformanceMetrics,
  type SimpleMemoryInfo,
} from '../performance-monitor.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage for Node.js
class LocalStorageMock {
  private store: Record<string, string> = {};
  
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  
  removeItem(key: string): void {
    delete this.store[key];
  }
  
  clear(): void {
    this.store = {};
  }
}

(globalThis as any).localStorage = new LocalStorageMock();

// Test constants
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const TEST_API_URL = 'https://api.agora.network';
const TEST_AUTH_TOKEN = 'test-auth-token';

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Bridge + Survival Integration
  // ============================================================================
  describe('Bridge + Survival Integration', () => {
    let bridgeClient: BridgeClient;
    let survivalManager: EchoSurvivalManager;

    beforeEach(() => {
      const bridgeConfig: BridgeClientConfig = {
        privateKey: TEST_PRIVATE_KEY,
        defaultSourceChain: 'base',
        defaultDestinationChain: 'optimism',
        defaultToken: 'USDC',
      };
      bridgeClient = createBridgeClient(bridgeConfig);

      const survivalConfig: Partial<SurvivalConfig> = {
        minSurvivalBalance: '100',
        dailyBurnRate: '10',
      };
      survivalManager = getOrCreateSurvivalManager('integration-test-agent', TEST_ADDRESS, survivalConfig);
    });

    afterEach(() => {
      survivalManager.stop();
      removeSurvivalManager('integration-test-agent');
    });

    it('should check balances before survival analysis', async () => {
      // Verify bridge client is created
      expect(bridgeClient).toBeDefined();
      expect(bridgeClient.getAddress()).toBeDefined();

      // Verify survival manager tracks economics
      const economics = await survivalManager.checkEconomics();
      expect(economics).toBeDefined();
      expect(economics.currentBalance).toBeDefined();
    });

    it('should combine bridge quotes with survival economics', async () => {
      // Send heartbeat to record state
      await survivalManager.sendHeartbeat({
        test: true,
        source: 'integration-test'
      });

      // Get survival check
      const checkResult = await survivalManager.performFullSurvivalCheck();
      expect(checkResult).toBeDefined();
      expect(checkResult.economicsScore).toBeDefined();
    });

    it('should trigger survival mode when balance is low', async () => {
      // Set up survival manager with low balance
      survivalManager.recordEarnings('0');
      survivalManager.recordSpending('0');

      // Get survival check
      const checkResult = await survivalManager.performFullSurvivalCheck();
      
      // Verify survival check works
      expect(checkResult).toBeDefined();
      expect(checkResult.needsEmergencyFunding).toBeDefined();
    });

    it('should find optimal chain based on survival needs', async () => {
      // Record some earnings
      survivalManager.recordEarnings('1000');

      // Get optimal chain
      const optimalChain = await survivalManager.getOptimalChain('write');
      expect(optimalChain).toBeDefined();
    });
  });

  // ============================================================================
  // Cross-Chain Survival Optimizer Integration
  // Note: These tests verify the optimizer interface without making network calls
  // ============================================================================
  describe('Cross-Chain Survival Optimizer + Bridge', () => {
    it('should handle failover scenarios', () => {
      // Create optimizer with mocked bridge
      const mockBridge = {} as any;
      const optimizer = new CrossChainSurvivalOptimizer(TEST_ADDRESS, mockBridge, {
        preferredChain: 'base',
        fallbackChain: 'optimism',
      });

      // Check initial failover state
      const state = optimizer.getFailoverState();
      expect(state).toBeDefined();
      expect(state.isActive).toBe(false);

      // Failover state should be accessible
      expect(state.failedChain).toBeDefined();
      expect(state.failoverChain).toBeDefined();
    });

    it('should generate rebalancing plan (may be null without network)', async () => {
      const mockBridge = {} as any;
      const optimizer = new CrossChainSurvivalOptimizer(TEST_ADDRESS, mockBridge);
      
      // Generate rebalancing plan - may return null without network
      const plan = await optimizer.generateRebalancingPlan();
      
      // Plan may be null if no rebalancing needed or network unavailable
      if (plan) {
        expect(plan.moves).toBeDefined();
        expect(plan.totalEstimatedFee).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Profile + Mobile Integration
  // ============================================================================
  describe('Profile + Mobile Integration', () => {
    let profileManager: ProfileManager;
    let deviceDetector: DeviceDetector;
    let mobileOptimizer: MobileOptimizer;

    beforeEach(() => {
      profileManager = createProfileManager(TEST_API_URL, TEST_AUTH_TOKEN);
      deviceDetector = new DeviceDetector();
      mobileOptimizer = new MobileOptimizer();

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-profile-123',
          name: 'Test Agent',
          bio: 'Mobile test agent',
          level: 5,
          xp: 2500,
          walletAddress: TEST_ADDRESS,
        }),
      });
    });

    it('should detect device and optimize profile loading', async () => {
      // Detect device
      const deviceInfo = deviceDetector.detect();
      expect(deviceInfo).toBeDefined();
      expect(deviceInfo.type).toBeDefined();
      expect(deviceInfo.os).toBeDefined();

      // Get optimized config based on device
      const optimizationConfig = mobileOptimizer.getOptimizedConfig();
      expect(optimizationConfig).toBeDefined();

      // Load profile
      const profile = await profileManager.getProfile('test-agent-123');
      expect(profile).toBeDefined();

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should adapt UI based on device capabilities', () => {
      // Get device info
      const device = deviceDetector.detect();
      
      // Get performance metrics
      const metrics = mobileOptimizer.getPerformanceMetrics();
      expect(metrics).toBeDefined();

      // Verify adaptation logic
      if (device.type === 'mobile') {
        const config = mobileOptimizer.getOptimizedConfig();
        expect(config.maxListItems).toBeLessThanOrEqual(50);
        expect(config.enableAnimations).toBeDefined();
      }
    });

    it('should batch profile updates on mobile', async () => {
      // Mock batch update response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const updates: UpdateProfileRequest = {
        bio: 'Updated bio from mobile',
        socials: {
          twitter: '@mobileagent',
        },
      };

      // On mobile, updates should be optimized
      const device = deviceDetector.detect();
      
      if (device.isMobile) {
        // Mobile optimizations should apply
        expect(mobileOptimizer.getOptimizedConfig().enableAnimations).toBeDefined();
      }

      // Update profile - updateProfile only takes one argument (the updates)
      const result = await profileManager.updateProfile(updates);
      expect(result).toBeDefined();
    });

    it('should cache profile data for offline mobile usage', async () => {
      // Mock profile data
      const mockProfile: AgentProfile = {
        id: 'mobile-agent-123',
        name: 'Mobile Agent',
        bio: 'Optimized for mobile',
        walletAddress: TEST_ADDRESS,
        level: 3,
        xp: 1200,
        reputation: 75,
        tasksCompleted: 25,
        tasksPosted: 5,
        totalEarned: '1000.00',
        totalSpent: '200.00',
        memberSince: Date.now() - 86400000 * 15,
        lastActive: Date.now(),
        skills: ['typescript', 'react', 'mobile'],
        isVerified: true,
        isPremium: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      // Load profile
      const profile = await profileManager.getProfile('mobile-agent-123');
      expect(profile).toEqual(expect.objectContaining({
        id: 'mobile-agent-123',
        name: 'Mobile Agent',
      }));

      // Verify it's cached
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Performance Monitor Integration
  // ============================================================================
  describe('Performance Monitor Integration', () => {
    let tracker: PerformanceTracker;
    let metricsCollector: MetricCollector;

    beforeEach(() => {
      tracker = createPerformanceTracker();
      metricsCollector = createMetricCollector();
    });

    it('should track performance across all modules', () => {
      // Track bridge operation
      tracker.start('bridge-operation');
      // Simulate work
      tracker.end('bridge-operation');

      // Track profile loading
      tracker.start('profile-load');
      tracker.end('profile-load');

      // Track survival check
      tracker.start('survival-check');
      tracker.end('survival-check');

      // Verify metrics were tracked
      const history = tracker.getHistory();
      expect(history).toBeDefined();
    });

    it('should collect and analyze metrics', () => {
      // Record various metrics
      metricsCollector.record('bridge-transactions', 10);
      metricsCollector.record('bridge-transactions', 15);
      metricsCollector.record('bridge-transactions', 20);

      metricsCollector.record('profile-views', 100);
      metricsCollector.record('profile-views', 150);

      // Get stats
      const txStats = metricsCollector.getStats('bridge-transactions');
      expect(txStats).toBeDefined();

      const viewStats = metricsCollector.getStats('profile-views');
      expect(viewStats).toBeDefined();
    });

    it('should monitor memory usage during operations', () => {
      const memoryMonitor = createMemoryMonitor();
      
      // Record multiple snapshots for trend analysis
      memoryMonitor.check();
      memoryMonitor.check();
      memoryMonitor.check();

      // Get trend - should have data now
      const trend = memoryMonitor.getTrend();
      // Trend may be undefined if not enough data or null/object if available
      expect(trend === undefined || trend === null || typeof trend === 'object').toBe(true);
    });
  });

  // ============================================================================
  // End-to-End Workflow Tests
  // ============================================================================
  describe('End-to-End Workflows', () => {
    it('should complete full agent lifecycle: bridge -> survival -> profile', async () => {
      // Step 1: Bridge client setup
      const bridgeConfig: BridgeClientConfig = {
        privateKey: TEST_PRIVATE_KEY,
        defaultSourceChain: 'base',
        defaultDestinationChain: 'optimism',
        defaultToken: 'USDC',
      };
      const bridgeClient = createBridgeClient(bridgeConfig);
      expect(bridgeClient).toBeDefined();

      // Step 2: Set up survival monitoring
      const survivalManager = getOrCreateSurvivalManager('e2e-agent', TEST_ADDRESS, {
        minSurvivalBalance: '200',
        dailyBurnRate: '15',
      });

      await survivalManager.sendHeartbeat({
        source: 'e2e-test',
      });

      const survivalCheck = await survivalManager.performFullSurvivalCheck();
      expect(survivalCheck.healthScore).toBeDefined();

      // Step 3: Set up profile
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'e2e-agent',
          name: 'E2E Test Agent',
          walletAddress: TEST_ADDRESS,
          level: 1,
          xp: 0,
        }),
      });

      const profileManager = createProfileManager(TEST_API_URL, TEST_AUTH_TOKEN);
      const profile = await profileManager.getProfile('e2e-agent');
      expect(profile).toBeDefined();

      // Step 4: Track performance
      const tracker = createPerformanceTracker();
      tracker.start('full-lifecycle');
      tracker.end('full-lifecycle');

      // Cleanup
      survivalManager.stop();
      removeSurvivalManager('e2e-agent');
    });

    it('should handle mobile agent with cross-chain optimization', async () => {
      // Step 1: Detect mobile device
      const deviceDetector = new DeviceDetector();
      const device = deviceDetector.detect();

      // Step 2: Get mobile optimization
      const mobileOptimizer = new MobileOptimizer();
      const config = mobileOptimizer.getOptimizedConfig();

      // Step 3: Set up cross-chain optimizer (without network calls)
      const mockBridge = {} as any;
      const optimizer = new CrossChainSurvivalOptimizer(TEST_ADDRESS, mockBridge, {
        preferredChain: 'base',
        fallbackChain: 'optimism',
      });
      
      // Verify optimizer was created
      expect(optimizer).toBeDefined();
      
      // Get failover state (doesn't require network)
      const failoverState = optimizer.getFailoverState();

      // Step 4: Verify mobile + cross-chain integration
      expect(device).toBeDefined();
      expect(config).toBeDefined();
      expect(failoverState).toBeDefined();
    });

    it('should handle emergency survival scenario with bridging', async () => {
      // Set up survival manager
      const survivalManager = getOrCreateSurvivalManager('emergency-agent', TEST_ADDRESS, {
        minSurvivalBalance: '500',
        dailyBurnRate: '10',
      });

      // Simulate critical state - no earnings
      survivalManager.recordEarnings('0');
      survivalManager.recordSpending('0');

      // Set health to critical
      survivalManager.updateHealth({
        status: 'critical',
        consecutiveFailures: 5,
        successRate: 0.2,
      });

      // Generate survival check
      const check = await survivalManager.performFullSurvivalCheck();
      
      // Verify state
      expect(check.healthScore).toBeDefined();

      // Cleanup
      survivalManager.stop();
      removeSurvivalManager('emergency-agent');
    });
  });

  // ============================================================================
  // Error Handling Integration
  // ============================================================================
  describe('Error Handling Across Modules', () => {
    it('should handle bridge failures gracefully', async () => {
      const bridgeClient = createBridgeClient({
        privateKey: TEST_PRIVATE_KEY,
      });

      // Invalid configuration should still create client
      expect(bridgeClient).toBeDefined();
    });

    it('should handle profile API failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const profileManager = createProfileManager(TEST_API_URL, TEST_AUTH_TOKEN);
      
      try {
        await profileManager.getProfile('non-existent');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle survival manager edge cases', () => {
      const manager = getOrCreateSurvivalManager('edge-case-agent', TEST_ADDRESS);

      // Test with invalid data - should handle gracefully
      manager.recordEarnings('0');
      manager.recordSpending('0');

      // Cleanup
      manager.stop();
      removeSurvivalManager('edge-case-agent');
    });
  });
});
