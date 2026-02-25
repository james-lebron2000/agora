/**
 * Survival Module Unit Tests
 * Tests for EchoSurvivalManager and survival utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  getSurvivalManager,
  removeSurvivalManager,
  DEFAULT_SURVIVAL_CONFIG,
  formatSurvivalReport,
  shouldAcceptTask,
  type AgentHealth,
  type AgentEconomics,
  type SurvivalCheckResult,
  type HeartbeatRecord,
  type SurvivalConfig,
  type AgentHealthStatus,
  type SurvivalSnapshot,
  type TaskDecision,
  type SurvivalEventType,
  type SurvivalAction,
  type SurvivalActionType
} from '../survival.js';

const TEST_AGENT_ID = 'test-agent-123';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

// Generate unique agent IDs for test isolation
let agentIdCounter = 0;
function getUniqueAgentId(): string {
  return `test-agent-${Date.now()}-${++agentIdCounter}`;
}

describe('EchoSurvivalManager', () => {
  let manager: EchoSurvivalManager;
  let testAgentId: string;
  
  beforeEach(() => {
    testAgentId = getUniqueAgentId();
    manager = new EchoSurvivalManager(testAgentId, TEST_ADDRESS);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    manager.stop();
    removeSurvivalManager(testAgentId);
  });

  describe('initialization', () => {
    it('should create a new manager with default config', () => {
      expect(manager).toBeDefined();
      expect(manager.getAgentId()).toBe(testAgentId);
      expect(manager.getAddress()).toBe(TEST_ADDRESS);
    });

    it('should create manager with custom config', () => {
      const customConfig: Partial<SurvivalConfig> = {
        minSurvivalBalance: '50',
        dailyBurnRate: '5',
        alertThreshold: 70
      };
      const customManager = new EchoSurvivalManager(testAgentId + '-custom', TEST_ADDRESS, customConfig);
      const config = customManager.getConfig();
      
      expect(config.minSurvivalBalance).toBe('50');
      expect(config.dailyBurnRate).toBe('5');
      expect(config.alertThreshold).toBe(70);
      customManager.stop();
      removeSurvivalManager(testAgentId + '-custom');
    });
  });

  describe('health management', () => {
    it('should initialize with healthy status', () => {
      const health = manager.checkHealth(testAgentId);
      expect(health.status).toBe('healthy');
      expect(health.consecutiveFailures).toBe(0);
      expect(health.successRate).toBe(1);
    });

    it('should update health metrics', () => {
      manager.updateHealth({ consecutiveFailures: 2 });
      const health = manager.checkHealth(testAgentId);
      
      expect(health.consecutiveFailures).toBe(2);
    });

    it('should auto-update status to degraded on low success rate', () => {
      const successRate = DEFAULT_SURVIVAL_CONFIG.criticalSuccessRate + 0.05;
      
      manager.updateHealth({ successRate });
      const health = manager.checkHealth(testAgentId);
      
      expect(health.status).toBe('degraded');
    });

    it('should auto-update status to critical on very low success rate', () => {
      manager.updateHealth({ 
        successRate: DEFAULT_SURVIVAL_CONFIG.criticalSuccessRate - 0.1
      });
      
      const health = manager.checkHealth(testAgentId);
      expect(health.status).toBe('critical');
    });

    it('should auto-update status to dead on extreme failures', () => {
      manager.updateHealth({ 
        successRate: 0,
        consecutiveFailures: 5
      });
      
      const health = manager.checkHealth(testAgentId);
      expect(health.status).toBe('dead');
    });

    it('should record task completion', () => {
      manager.recordTaskCompleted(1000);
      const health = manager.checkHealth(testAgentId);
      
      expect(health.totalTasksCompleted).toBe(1);
      expect(health.consecutiveFailures).toBe(0);
    });

    it('should record task failure', () => {
      manager.recordTaskFailed();
      const health = manager.checkHealth(testAgentId);
      
      expect(health.totalTasksFailed).toBe(1);
      expect(health.consecutiveFailures).toBe(1);
    });

    it('should update average response time', () => {
      manager.recordTaskCompleted(1000);
      manager.recordTaskCompleted(2000);
      
      const health = manager.checkHealth(testAgentId);
      expect(health.averageResponseTime).toBe(1500);
    });

    it('should calculate success rate correctly', () => {
      manager.recordTaskFailed();
      manager.recordTaskFailed();
      manager.recordTaskCompleted(1000);
      
      const health = manager.checkHealth(testAgentId);
      expect(health.successRate).toBe(1 / 3);
    });

    it('should throw error when checking health for non-existent agent', () => {
      expect(() => manager.checkHealth('non-existent-agent')).toThrow();
    });
  });

  describe('economics management', () => {
    it('should initialize with zero balance', async () => {
      const economics = await manager.checkEconomics();
      expect(economics.currentBalance).toBe('0.000000');
      expect(economics.totalEarned).toBe('0');
      expect(economics.totalSpent).toBe('0');
    });

    it('should record earnings', async () => {
      manager.recordEarnings('50.00');
      manager.recordEarnings('25.50');
      
      const economics = await manager.checkEconomics();
      expect(parseFloat(economics.totalEarned)).toBeCloseTo(75.5, 1);
      expect(parseFloat(economics.currentBalance)).toBeCloseTo(75.5, 1);
    });

    it('should record spending', async () => {
      manager.recordEarnings('100');
      manager.recordSpending('20.00');
      
      const economics = await manager.checkEconomics();
      expect(parseFloat(economics.totalSpent)).toBeCloseTo(20, 1);
      expect(parseFloat(economics.currentBalance)).toBeCloseTo(80, 1);
    });

    it('should calculate runway correctly', async () => {
      manager.recordEarnings('30');
      
      const economics = await manager.checkEconomics();
      expect(economics.daysOfRunway).toBe(30); // 30 / 1 daily burn
    });

    it('should handle zero burn rate', async () => {
      const zeroBurnManager = new EchoSurvivalManager('zero-burn', TEST_ADDRESS, {
        dailyBurnRate: '0'
      });
      zeroBurnManager.recordEarnings('100');
      
      const economics = await zeroBurnManager.checkEconomics();
      expect(economics.daysOfRunway).toBe(999);
      zeroBurnManager.stop();
      removeSurvivalManager('zero-burn');
    });

    it('should not fetch live balance by default', async () => {
      const economics = await manager.checkEconomics();
      expect(economics).toBeDefined();
      expect(economics.currentBalance).toBe('0.000000');
    });
  });

  describe('heartbeat functionality', () => {
    it('should send heartbeat', async () => {
      const heartbeat = await manager.sendHeartbeat({ source: 'test' });
      
      expect(heartbeat.agentId).toBe(testAgentId);
      expect(heartbeat.timestamp).toBeGreaterThan(0);
    });

    it('should store heartbeat history', async () => {
      await manager.sendHeartbeat();
      await manager.sendHeartbeat();
      await manager.sendHeartbeat();
      
      const history = manager.getHeartbeatHistory();
      expect(history.length).toBe(3);
    });

    it('should limit heartbeat history to last 1000', async () => {
      for (let i = 0; i < 1005; i++) {
        await manager.sendHeartbeat();
      }
      
      const history = manager.getHeartbeatHistory(1000);
      expect(history).toHaveLength(1000);
    });

    it('should respect limit parameter in getHeartbeatHistory', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.sendHeartbeat();
      }
      
      const history = manager.getHeartbeatHistory(5);
      expect(history).toHaveLength(5);
    });

    it('should update last heartbeat timestamp', async () => {
      const before = Date.now();
      await manager.sendHeartbeat();
      const after = Date.now();
      
      const health = manager.checkHealth(testAgentId);
      expect(health.lastHeartbeat).toBeGreaterThanOrEqual(before);
      expect(health.lastHeartbeat).toBeLessThanOrEqual(after);
    });
  });

  describe('survival score calculation', () => {
    it('should calculate perfect survival score', async () => {
      manager.recordEarnings('1000');
      manager.recordTaskCompleted(500);
      
      const score = await manager.calculateSurvivalScore();
      expect(score).toBe(100);
    });

    it('should calculate low survival score for poor health', async () => {
      manager.recordEarnings('1000'); // Good economics
      
      // Many failures to reduce health score significantly
      for (let i = 0; i < 10; i++) {
        manager.recordTaskFailed();
      }
      
      const score = await manager.calculateSurvivalScore();
      // With 10 consecutive failures, health score should be reduced
      expect(score).toBeLessThanOrEqual(50);
    });

    it('should calculate lower survival score for poor economics', async () => {
      manager.recordEarnings('5'); // Low balance
      
      const score = await manager.calculateSurvivalScore();
      // Score should be lower than well-funded agent
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should return low score for dead status', async () => {
      manager.updateHealth({ 
        status: 'dead',
        successRate: 0,
        consecutiveFailures: 5
      });
      
      const score = await manager.calculateSurvivalScore();
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('survival mode', () => {
    it('should enter survival mode when balance is low', async () => {
      expect(manager.isInSurvivalMode()).toBe(false);
      
      manager.recordEarnings('5'); // Below minimum of 10
      await manager.performSurvivalCheck();
      
      expect(manager.isInSurvivalMode()).toBe(true);
    });

    it('should enter survival mode when runway is low', async () => {
      manager.recordEarnings('2'); // 2 days runway
      await manager.performSurvivalCheck();
      
      expect(manager.isInSurvivalMode()).toBe(true);
    });

    it('should enter survival mode when health is critical', async () => {
      manager.updateHealth({ status: 'critical' });
      await manager.performSurvivalCheck();
      
      expect(manager.isInSurvivalMode()).toBe(true);
    });

    it('should exit survival mode when conditions improve', async () => {
      // Enter survival mode
      manager.updateHealth({ status: 'critical' });
      await manager.performSurvivalCheck();
      expect(manager.isInSurvivalMode()).toBe(true);
      
      // Improve conditions
      manager.updateHealth({ status: 'healthy' });
      manager.recordEarnings('100');
      await manager.performSurvivalCheck();
      
      expect(manager.isInSurvivalMode()).toBe(false);
    });
  });

  describe('emergency funding check', () => {
    it('should need emergency funding when balance is below minimum', async () => {
      manager.recordEarnings('5'); // Below default 10
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(true);
    });

    it('should need emergency funding when runway is less than 3 days', async () => {
      // Start with balance that gives < 3 days runway
      // With burn rate 1, balance 2 gives 2 days runway
      manager.recordEarnings('2');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(true);
    });

    it('should not need emergency funding when healthy', async () => {
      manager.recordEarnings('100');
      
      const needsFunding = await manager.needsEmergencyFunding();
      expect(needsFunding).toBe(false);
    });
  });

  describe('recovery recommendations', () => {
    it('should provide health recommendations for low success rate', async () => {
      manager.updateHealth({ successRate: 0.4 });
      
      const recs = await manager.getRecoveryRecommendations();
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.includes('success rate'))).toBe(true);
    });

    it('should provide recommendations for consecutive failures', async () => {
      manager.updateHealth({ consecutiveFailures: 5 });
      
      const recs = await manager.getRecoveryRecommendations();
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.includes('failures'))).toBe(true);
    });

    it('should provide recommendations for slow response time', async () => {
      manager.updateHealth({ averageResponseTime: 10000 });
      
      const recs = await manager.getRecoveryRecommendations();
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.includes('response time'))).toBe(true);
    });

    it('should provide urgent recommendations for low balance', async () => {
      manager.recordEarnings('1');
      
      const recs = await manager.getRecoveryRecommendations();
      expect(recs.some(r => r.includes('URGENT'))).toBe(true);
    });

    it('should provide recommendations for low runway', async () => {
      // Low balance (below minimum) should trigger recommendations
      manager.recordEarnings('5');
      
      const recs = await manager.getRecoveryRecommendations();
      // Should have recommendations for low balance
      expect(recs.length).toBeGreaterThan(0);
    });

    it('should provide expansion recommendations when healthy', async () => {
      manager.recordEarnings('500');
      manager.updateHealth({ successRate: 0.95 });
      
      const recs = await manager.getRecoveryRecommendations();
      expect(recs.some(r => r.includes('expanding') || r.includes('Consider'))).toBe(true);
    });
  });

  describe('full survival check', () => {
    it('should perform full check with all components', async () => {
      manager.recordEarnings('50');
      
      const check = await manager.performFullSurvivalCheck();
      
      expect(check.survivalScore).toBeGreaterThanOrEqual(0);
      expect(check.healthScore).toBeGreaterThanOrEqual(0);
      expect(check.economicsScore).toBeGreaterThanOrEqual(0);
      expect(check.recommendations).toBeDefined();
      expect(typeof check.needsEmergencyFunding).toBe('boolean');
      expect(check.timestamp).toBeGreaterThan(0);
    });
  });

  describe('survival snapshot', () => {
    it('should provide survival snapshot', async () => {
      manager.recordEarnings('100');
      
      const snapshot = await manager.performSurvivalCheck();
      
      expect(snapshot.health.status).toBeDefined();
      expect(snapshot.health.overall).toBeGreaterThanOrEqual(0);
      expect(parseFloat(snapshot.economics.balance)).toBe(100);
      expect(snapshot.economics.runwayDays).toBe(100);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should register event handlers', () => {
      const handler = vi.fn();
      const unsubscribe = manager.on('health:critical', handler);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start health checks and heartbeats', () => {
      manager.start();
      
      expect(manager['healthCheckTimer']).toBeTruthy();
      expect(manager['heartbeatTimer']).toBeTruthy();
    });

    it('should stop health checks and heartbeats', () => {
      manager.start();
      manager.stop();
      
      expect(manager['healthCheckTimer']).toBeNull();
      expect(manager['heartbeatTimer']).toBeNull();
    });

    it('should warn when starting already started manager', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.start();
      manager.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Survival manager already started');
      consoleSpy.mockRestore();
    });

    it('should not throw when stopping already stopped manager', () => {
      expect(() => manager.stop()).not.toThrow();
    });
  });

  describe('optimal chain selection', () => {
    it('should return a chain when balance is available', async () => {
      manager.recordEarnings('100');
      const chain = await manager.getOptimalChain();
      
      expect(chain).toBe('arbitrum');
    });

    it('should return null when no balance', async () => {
      const chain = await manager.getOptimalChain();
      
      expect(chain).toBeNull();
    });
  });
});

describe('Singleton Management', () => {
  beforeEach(() => {
    removeSurvivalManager('registry-test');
  });

  afterEach(() => {
    const m = getSurvivalManager('registry-test');
    if (m) m.stop();
    removeSurvivalManager('registry-test');
  });

  it('should get or create survival manager', () => {
    const manager = getOrCreateSurvivalManager('registry-test', TEST_ADDRESS);
    expect(manager).toBeDefined();
    manager.stop();
  });

  it('should get existing survival manager', () => {
    const created = getOrCreateSurvivalManager('registry-test', TEST_ADDRESS);
    const retrieved = getSurvivalManager('registry-test');
    
    expect(retrieved).toBe(created);
    created.stop();
  });

  it('should remove survival manager', () => {
    const manager = getOrCreateSurvivalManager('registry-test', TEST_ADDRESS);
    manager.stop();
    
    expect(getSurvivalManager('registry-test')).toBeDefined();
    removeSurvivalManager('registry-test');
    expect(getSurvivalManager('registry-test')).toBeUndefined();
  });

  it('should maintain separate managers for different agents', () => {
    const manager1 = getOrCreateSurvivalManager('registry-test', TEST_ADDRESS);
    const manager2 = getOrCreateSurvivalManager('registry-test-2', TEST_ADDRESS);
    
    expect(manager1).not.toBe(manager2);
    manager1.stop();
    manager2.stop();
    removeSurvivalManager('registry-test-2');
  });
});

describe('formatSurvivalReport', () => {
  it('should format report with all fields', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 85
      },
      economics: {
        balance: '150.50',
        runwayDays: 30
      },
      timestamp: Date.now()
    };
    
    const report = formatSurvivalReport(snapshot);
    
    expect(report).toContain('Survival Report');
    expect(report).toContain('HEALTHY');
    expect(report).toContain('85/100');
    expect(report).toContain('150.50');
    expect(report).toContain('30 days');
  });

  it('should show operational status for healthy state', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 90
      },
      economics: {
        balance: '200',
        runwayDays: 14
      },
      timestamp: Date.now()
    };
    
    const report = formatSurvivalReport(snapshot);
    expect(report).toContain('✅');
  });

  it('should show survival mode for critical state', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'critical',
        overall: 20
      },
      economics: {
        balance: '50',
        runwayDays: 2
      },
      timestamp: Date.now()
    };
    
    const report = formatSurvivalReport(snapshot);
    expect(report).toContain('🚨');
  });

  it('should show caution for degraded state', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'degraded',
        overall: 55
      },
      economics: {
        balance: '100',
        runwayDays: 5
      },
      timestamp: Date.now()
    };
    
    const report = formatSurvivalReport(snapshot);
    expect(report).toContain('⚠️');
  });
});

describe('shouldAcceptTask', () => {
  it('should accept profitable task for healthy snapshot', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 85
      },
      economics: {
        balance: '100',
        runwayDays: 14
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '20', '10', 0.1);
    expect(decision.accept).toBe(true);
  });

  it('should reject task for dead agent', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'dead',
        overall: 0
      },
      economics: {
        balance: '0',
        runwayDays: 0
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '100', '1');
    expect(decision.accept).toBe(false);
  });

  it('should reject task for critical agent', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'critical',
        overall: 20
      },
      economics: {
        balance: '50',
        runwayDays: 7
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '10', '5');
    expect(decision.accept).toBe(false);
  });

  it('should reject task when runway is very short', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 80
      },
      economics: {
        balance: '10',
        runwayDays: 1
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '5', '2');
    expect(decision.accept).toBe(false);
  });

  it('should provide reason for rejection', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'dead',
        overall: 0
      },
      economics: {
        balance: '0',
        runwayDays: 0
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '10', '1');
    expect(decision.reason).toBeTruthy();
    expect(decision.reason.length).toBeGreaterThan(0);
  });

  it('should accept profitable tasks', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 75
      },
      economics: {
        balance: '100',
        runwayDays: 10
      },
      timestamp: Date.now()
    };
    
    const decision = shouldAcceptTask(snapshot, '20', '5', 0.1);
    expect(decision.accept).toBe(true);
  });

  it('should reject unprofitable tasks', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 75
      },
      economics: {
        balance: '100',
        runwayDays: 10
      },
      timestamp: Date.now()
    };
    
    // 100 budget, 95 cost = only 5% margin, below default 10%
    const decision = shouldAcceptTask(snapshot, '100', '95');
    expect(decision.accept).toBe(false);
  });

  it('should reject tasks with cost > 50% of balance', () => {
    const snapshot: SurvivalSnapshot = {
      health: {
        status: 'healthy',
        overall: 75
      },
      economics: {
        balance: '10',
        runwayDays: 10
      },
      timestamp: Date.now()
    };
    
    // Cost is 6, which is > 50% of balance (10)
    const decision = shouldAcceptTask(snapshot, '20', '6');
    expect(decision.accept).toBe(false);
  });
});

describe('DEFAULT_SURVIVAL_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_SURVIVAL_CONFIG.minSurvivalBalance).toBe('10');
    expect(DEFAULT_SURVIVAL_CONFIG.dailyBurnRate).toBe('1');
    expect(DEFAULT_SURVIVAL_CONFIG.healthCheckInterval).toBe(60000);
    expect(DEFAULT_SURVIVAL_CONFIG.heartbeatInterval).toBe(30000);
    expect(DEFAULT_SURVIVAL_CONFIG.healthySuccessRate).toBe(0.8);
    expect(DEFAULT_SURVIVAL_CONFIG.criticalSuccessRate).toBe(0.5);
    expect(DEFAULT_SURVIVAL_CONFIG.maxResponseTime).toBe(5000);
    expect(DEFAULT_SURVIVAL_CONFIG.alertThreshold).toBe(50);
  });
});

describe('Type Exports', () => {
  it('should properly export all types (compile-time check)', () => {
    const _healthStatus: AgentHealthStatus = 'healthy';
    const _actionType: SurvivalActionType = 'bridge';
    
    const _action: SurvivalAction = {
      type: 'earn',
      priority: 'high',
      description: 'Take on more tasks',
      estimatedImpact: '+50% income'
    };

    const _eventType: SurvivalEventType = 'health:critical';
    
    expect(true).toBe(true);
  });
});
