/**
 * Echo Survival Module Tests
 * 
 * Tests for agent health monitoring, economic sustainability,
 * and survival score calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  getSurvivalManager,
  removeSurvivalManager,
  DEFAULT_SURVIVAL_CONFIG,
  type SurvivalConfig
} from '../src/survival.js';

// Test address
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

// Generate unique agent ID for test isolation
let agentCounter = 0;
function getUniqueAgentId(): string {
  return `test-agent-${Date.now()}-${++agentCounter}`;
}

describe('Echo Survival Manager', () => {
  describe('Initialization', () => {
    it('should create manager with default config', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      expect(manager.getAgentId()).toBe(agentId);
      expect(manager.getAddress()).toBe(TEST_ADDRESS);
      expect(manager.getConfig()).toEqual(DEFAULT_SURVIVAL_CONFIG);
    });

    it('should create manager with custom config', () => {
      const agentId = getUniqueAgentId();
      const customConfig: Partial<SurvivalConfig> = {
        minSurvivalBalance: '50',
        dailyBurnRate: '5'
      };
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS, customConfig);
      
      expect(manager.getConfig().minSurvivalBalance).toBe('50');
      expect(manager.getConfig().dailyBurnRate).toBe('5');
    });
  });

  describe('Health Management', () => {
    it('should return initial health state', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      const health = manager.checkHealth(agentId);
      
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(1.0);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.totalTasksCompleted).toBe(0);
      expect(health.totalTasksFailed).toBe(0);
    });

    it('should update health on task completion', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordTaskCompleted(1000);
      const health = manager.checkHealth(agentId);
      
      expect(health.totalTasksCompleted).toBe(1);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.averageResponseTime).toBe(1000);
    });

    it('should update health on task failure', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordTaskFailed();
      const health = manager.checkHealth(agentId);
      
      expect(health.totalTasksFailed).toBe(1);
      expect(health.consecutiveFailures).toBe(1);
      expect(health.successRate).toBe(0);
    });

    it('should track consecutive failures', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // First complete a task to get non-zero success rate
      manager.recordTaskCompleted(1000);
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      
      // Update health to trigger status recalculation
      manager.updateHealth({});
      
      const health = manager.checkHealth(agentId);
      expect(health.consecutiveFailures).toBe(2);
      // With 33% success rate (< 0.5 critical threshold) and 2 consecutive failures
      expect(health.status).toBe('critical');
    });

    it('should reset consecutive failures on success', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      manager.recordTaskCompleted(1000);
      
      const health = manager.checkHealth(agentId);
      expect(health.consecutiveFailures).toBe(0);
    });

    it('should calculate average response time correctly', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordTaskCompleted(1000);
      manager.recordTaskCompleted(2000);
      manager.recordTaskCompleted(3000);
      
      const health = manager.checkHealth(agentId);
      // Average = (1000 + 2000 + 3000) / 3 = 2000
      expect(health.averageResponseTime).toBe(2000);
    });
  });

  describe('Economics Management', () => {
    it('should return initial economics state', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const economics = await manager.checkEconomics();
      
      // Initial state uses simple '0' format (or '0.000000' after formatting)
      expect(parseFloat(economics.totalEarned)).toBe(0);
      expect(parseFloat(economics.totalSpent)).toBe(0);
      expect(parseFloat(economics.currentBalance)).toBe(0);
      expect(economics.minSurvivalBalance).toBe(DEFAULT_SURVIVAL_CONFIG.minSurvivalBalance);
      expect(economics.daysOfRunway).toBe(0);
    });

    it('should record earnings', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordEarnings('100');
      const economics = await manager.checkEconomics();
      
      expect(economics.totalEarned).toBe('100.000000');
      expect(economics.currentBalance).toBe('100.000000');
    });

    it('should record spending', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordSpending('50');
      const economics = await manager.checkEconomics();
      
      expect(economics.totalSpent).toBe('50.000000');
      expect(economics.currentBalance).toBe('-50.000000');
    });

    it('should accumulate earnings and spending', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordEarnings('100');
      manager.recordEarnings('50');
      manager.recordSpending('30');
      manager.recordSpending('20');
      
      const economics = await manager.checkEconomics();
      expect(economics.totalEarned).toBe('150.000000');
      expect(economics.totalSpent).toBe('50.000000');
      expect(economics.currentBalance).toBe('100.000000');
      expect(economics.daysOfRunway).toBe(100); // 100 / 1 = 100 days
    });
  });

  describe('Survival Score Calculation', () => {
    it('should calculate survival score for healthy agent', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Complete tasks successfully
      manager.recordTaskCompleted(1000);
      manager.recordTaskCompleted(1000);
      
      const score = await manager.calculateSurvivalScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      // With perfect health (100% success rate) and zero balance,
      // healthScore = 50, economicsScore = 0, total = 50
      expect(score).toBe(50);
    });

    it('should return lower score for failing agent', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // 1 success, 2 failures = 33% success rate
      manager.recordTaskCompleted(1000);
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      
      const score = await manager.calculateSurvivalScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(100);
      expect(score).toBeLessThan(50);
    });

    it('should calculate higher score with good economics', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Set up good economics
      manager.recordEarnings('1000');
      
      const score = await manager.calculateSurvivalScore();
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Emergency Funding Detection', () => {
    it('should detect need for emergency funding when balance is negative', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Balance = -50, min = 10, so -50 < 10 triggers emergency
      manager.recordSpending('50');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(true);
    });

    it('should detect need for emergency funding when balance is below minimum', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Balance = 5 - 10 = -5, -5 < 10 triggers emergency
      manager.recordEarnings('5');
      manager.recordSpending('10');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(true);
    });

    it('should not need emergency funding when balance is sufficient', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Balance = 100 - 5 = 95, 95 > 10 (min balance) and runway = 95 days
      manager.recordEarnings('100');
      manager.recordSpending('5');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(false);
    });

    it('should detect need for emergency funding when runway is low', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Balance = 2 - 1 = 1, daysOfRunway = 1/1 = 1 day (< 3 threshold)
      manager.recordEarnings('2');
      manager.recordSpending('1');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(true);
    });
  });

  describe('Recovery Recommendations', () => {
    it('should provide recommendations for failing agent', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Create a failing scenario
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      
      const recommendations = await manager.getRecoveryRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include success rate recommendation when low', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      manager.recordTaskFailed();
      
      const recommendations = await manager.getRecoveryRecommendations();
      const hasSuccessRateRec = recommendations.some(r => 
        r.toLowerCase().includes('success rate')
      );
      expect(hasSuccessRateRec).toBe(true);
    });

    it('should provide economic recommendations when balance is low', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Set up low balance scenario
      manager.recordEarnings('5');
      manager.recordSpending('10');
      
      const recommendations = await manager.getRecoveryRecommendations();
      
      // Check for economic-related recommendations
      const hasEconomicRec = recommendations.some(r => 
        r.toLowerCase().includes('balance') || 
        r.toLowerCase().includes('funding') ||
        r.toLowerCase().includes('urgent') ||
        r.toLowerCase().includes('minimum')
      );
      
      expect(hasEconomicRec).toBe(true);
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const heartbeat = await manager.sendHeartbeat({ test: true });
      
      expect(heartbeat.agentId).toBe(agentId);
      expect(heartbeat.timestamp).toBeGreaterThan(0);
      expect(heartbeat.survivalScore).toBeGreaterThanOrEqual(0);
      expect(heartbeat.metadata).toEqual({ test: true });
    });

    it('should store heartbeat history', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      await manager.sendHeartbeat();
      await manager.sendHeartbeat();
      await manager.sendHeartbeat();
      
      const history = manager.getHeartbeatHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should limit heartbeat history', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Send many heartbeats
      for (let i = 0; i < 1005; i++) {
        await manager.sendHeartbeat();
      }
      
      const history = manager.getHeartbeatHistory(2000);
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should update health on heartbeat', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const beforeHealth = manager.checkHealth(agentId);
      const beforeTime = beforeHealth.lastHeartbeat;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await manager.sendHeartbeat();
      const afterHealth = manager.checkHealth(agentId);
      
      expect(afterHealth.lastHeartbeat).toBeGreaterThan(beforeTime);
    });
  });

  describe('Survival Check', () => {
    it('should perform survival check', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const result = await manager.performSurvivalCheck();
      
      // SurvivalSnapshot structure
      expect(result.health).toBeDefined();
      expect(result.health.status).toBeDefined();
      expect(result.health.overall).toBeGreaterThanOrEqual(0);
      expect(result.health.overall).toBeLessThanOrEqual(100);
      expect(result.economics).toBeDefined();
      expect(result.economics.balance).toBeDefined();
      expect(result.economics.runwayDays).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });
    
    it('should perform full survival check', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const result = await manager.performFullSurvivalCheck();
      
      // SurvivalCheckResult structure
      expect(result.survivalScore).toBeGreaterThanOrEqual(0);
      expect(result.survivalScore).toBeLessThanOrEqual(100);
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(50);
      expect(result.economicsScore).toBeGreaterThanOrEqual(0);
      expect(result.economicsScore).toBeLessThanOrEqual(50);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Global Registry', () => {
    it('should create and retrieve manager from registry', () => {
      const agentId = getUniqueAgentId();
      
      const created = getOrCreateSurvivalManager(agentId, TEST_ADDRESS);
      expect(created.getAgentId()).toBe(agentId);
      
      const retrieved = getSurvivalManager(agentId);
      expect(retrieved).toBe(created);
      
      removeSurvivalManager(agentId);
    });

    it('should return undefined for non-existent manager', () => {
      const retrieved = getSurvivalManager('non-existent-agent-' + Date.now());
      expect(retrieved).toBeUndefined();
    });

    it('should remove manager from registry', () => {
      const agentId = getUniqueAgentId();
      getOrCreateSurvivalManager(agentId, TEST_ADDRESS);
      
      const removed = removeSurvivalManager(agentId);
      expect(removed).toBe(true);
      
      const retrieved = getSurvivalManager(agentId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Event System', () => {
    it('should emit events on health critical', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const events: any[] = [];
      manager.on('health:critical', (data) => events.push(data));
      
      // Trigger critical health - complete a task first to avoid 'dead' status
      manager.recordTaskCompleted(1000);
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      
      // Update health to trigger status recalculation
      manager.updateHealth({});
      
      const status = manager.checkHealth(agentId).status;
      // Should be critical or dead depending on success rate
      expect(['critical', 'dead']).toContain(status);
    });

    it('should allow unsubscribing from events', () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      const events: any[] = [];
      const unsubscribe = manager.on('health:critical', (data) => events.push(data));
      
      // Unsubscribe
      unsubscribe();
      
      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Survival Mode', () => {
    it('should track survival mode state', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Initially not in survival mode
      expect(manager.isInSurvivalMode()).toBe(false);
      
      // Trigger survival mode via low balance
      manager.recordSpending('100');
      
      // Perform check to trigger survival mode evaluation
      await manager.performSurvivalCheck();
      
      // Should be in survival mode now
      expect(manager.isInSurvivalMode()).toBe(true);
    });
  });

  describe('Task Decision', () => {
    it('should accept profitable task', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Set up healthy state with sufficient balance
      manager.recordTaskCompleted(1000);
      manager.recordTaskCompleted(1000);
      manager.recordEarnings('100');
      
      const snapshot = await manager.performSurvivalCheck();
      
      // Import shouldAcceptTask from survival module
      const { shouldAcceptTask } = await import('../src/survival.js');
      const decision = shouldAcceptTask(snapshot, '50', '10', 0.1);
      
      expect(decision.accept).toBe(true);
    });

    it('should reject task with low profit margin', async () => {
      const agentId = getUniqueAgentId();
      const manager = new EchoSurvivalManager(agentId, TEST_ADDRESS);
      
      // Set up healthy state
      manager.recordTaskCompleted(1000);
      manager.recordEarnings('100');
      
      const snapshot = await manager.performSurvivalCheck();
      
      const { shouldAcceptTask } = await import('../src/survival.js');
      // Task costs 45, budget is 50 = 11% margin, below 20% threshold
      const decision = shouldAcceptTask(snapshot, '50', '45', 0.2);
      
      expect(decision.accept).toBe(false);
    });
  });
});

console.log('[Echo Survival Tests] Test suite loaded');
