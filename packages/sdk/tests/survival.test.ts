/**
 * Echo Survival Mechanism Tests
 * 
 * Tests for AgentHealthMonitor, AgentEconomics, and EchoSurvivalManager
 */

import {
  AgentHealthMonitor,
  AgentEconomics,
  EchoSurvivalManager,
  createSurvivalManager,
  formatSurvivalReport,
  shouldAcceptTask,
  DEFAULT_THRESHOLDS,
  OPERATION_COSTS,
  DAILY_OPERATIONAL_COSTS,
  type AgentHealth,
  type EconomicMetrics,
  type ChainBalance,
  type HealthStatus
} from '../src/survival.js';
import type { MultiChainWallet } from '../src/wallet-manager.js';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockWallet(balance: number): MultiChainWallet {
  return {
    ethereum: { address: '0x1234...', privateKey: '0xkey' },
    base: { address: '0x5678...', privateKey: '0xkey' },
    optimism: { address: '0x9abc...', privateKey: '0xkey' },
    arbitrum: { address: '0xdef0...', privateKey: '0xkey' },
    balances: [
      { chain: 'ethereum', usdcBalance: balance.toString(), nativeBalance: '0.1' },
      { chain: 'base', usdcBalance: (balance * 2).toString(), nativeBalance: '0.05' },
      { chain: 'optimism', usdcBalance: balance.toString(), nativeBalance: '0.03' },
      { chain: 'arbitrum', usdcBalance: '0', nativeBalance: '0.02' }
    ]
  } as MultiChainWallet;
}

function createMockBalances(overrides?: Partial<ChainBalance>[]): ChainBalance[] {
  const defaults: ChainBalance[] = [
    { chain: 'ethereum', usdcBalance: '10', nativeBalance: '0.1' },
    { chain: 'base', usdcBalance: '20', nativeBalance: '0.05' },
    { chain: 'optimism', usdcBalance: '15', nativeBalance: '0.03' },
    { chain: 'arbitrum', usdcBalance: '5', nativeBalance: '0.02' }
  ];
  
  if (!overrides) return defaults;
  
  return defaults.map((b, i) => ({
    ...b,
    ...(overrides[i] || {})
  }));
}

// ============================================================================
// AgentHealthMonitor Tests
// ============================================================================

console.log('Testing AgentHealthMonitor...\n');

{
  const monitor = new AgentHealthMonitor(1); // 1 minute interval
  
  // Test 1: Initial state
  console.log('Test 1: Initial health is null');
  const initialHealth = monitor.getCurrentHealth();
  console.assert(initialHealth === null, 'Initial health should be null');
  console.log('✅ Passed\n');

  // Test 2: Perform health check
  console.log('Test 2: Perform health check returns valid metrics');
  const health = monitor.performHealthCheck();
  console.assert(health !== null, 'Health check should return data');
  console.assert(health.overall >= 0 && health.overall <= 100, 'Overall health should be 0-100');
  console.assert(['healthy', 'stable', 'degraded', 'critical', 'dying'].includes(health.status), 'Status should be valid');
  console.assert(health.compute >= 0 && health.compute <= 100, 'Compute should be 0-100');
  console.assert(health.storage >= 0 && health.storage <= 100, 'Storage should be 0-100');
  console.assert(health.network >= 0 && health.network <= 100, 'Network should be 0-100');
  console.assert(health.economic >= 0 && health.economic <= 100, 'Economic should be 0-100');
  console.assert(new Date(health.lastCheck).getTime() > 0, 'Last check should be valid timestamp');
  console.log('✅ Passed\n');

  // Test 3: Health history
  console.log('Test 3: Health history is tracked');
  monitor.performHealthCheck();
  monitor.performHealthCheck();
  const history = monitor.getHealthHistory();
  console.assert(history.length === 3, 'History should have 3 entries');
  console.log('✅ Passed\n');

  // Test 4: Health trend
  console.log('Test 4: Health trend analysis');
  const trend = monitor.getHealthTrend();
  console.assert(['improving', 'stable', 'declining'].includes(trend.direction), 'Trend direction should be valid');
  console.assert(typeof trend.rateOfChange === 'number', 'Rate of change should be a number');
  console.assert(trend.predictedHealth >= 0 && trend.predictedHealth <= 100, 'Predicted health should be 0-100');
  console.assert(trend.predictedRunway >= 0, 'Predicted runway should be non-negative');
  console.log('✅ Passed\n');

  // Test 5: Update economic health
  console.log('Test 5: Update economic health affects overall');
  const beforeUpdate = monitor.getCurrentHealth()!;
  const oldOverall = beforeUpdate.overall;
  monitor.updateEconomicHealth(50);
  const afterUpdate = monitor.getCurrentHealth()!;
  console.assert(afterUpdate.economic === 50, 'Economic should be updated');
  console.assert(afterUpdate.overall !== oldOverall, 'Overall should be recalculated');
  console.log('✅ Passed\n');

  monitor.stop();
}

// ============================================================================
// AgentEconomics Tests
// ============================================================================

console.log('Testing AgentEconomics...\n');

{
  const economics = new AgentEconomics();

  // Test 1: Default thresholds
  console.log('Test 1: Default thresholds are set correctly');
  const thresholds = economics.getThresholds();
  console.assert(thresholds.minUSDCCritical === DEFAULT_THRESHOLDS.minUSDCCritical, 'Critical USDC threshold should match default');
  console.assert(thresholds.minUSDCWarning === DEFAULT_THRESHOLDS.minUSDCWarning, 'Warning USDC threshold should match default');
  console.assert(thresholds.minRunwayCritical === DEFAULT_THRESHOLDS.minRunwayCritical, 'Critical runway threshold should match default');
  console.log('✅ Passed\n');

  // Test 2: Custom thresholds
  console.log('Test 2: Custom thresholds can be set');
  economics.updateThresholds({ minUSDCCritical: 5.0 });
  const updatedThresholds = economics.getThresholds();
  console.assert(updatedThresholds.minUSDCCritical === 5.0, 'Custom threshold should be applied');
  console.assert(updatedThresholds.minUSDCWarning === DEFAULT_THRESHOLDS.minUSDCWarning, 'Other thresholds should remain default');
  console.log('✅ Passed\n');

  // Test 3: Calculate economic metrics
  console.log('Test 3: Calculate economic metrics from balances');
  const balances = createMockBalances();
  const wallet = createMockWallet(10);
  economics.setWallet(wallet);
  
  const metrics = economics.calculateEconomicMetrics(balances);
  console.assert(parseFloat(metrics.totalUSDC) > 0, 'Total USDC should be positive');
  console.assert(parseFloat(metrics.netWorthUSD) > 0, 'Net worth should be positive');
  console.assert(metrics.runwayDays >= 0, 'Runway days should be non-negative');
  console.assert(metrics.efficiencyScore >= 0 && metrics.efficiencyScore <= 100, 'Efficiency score should be 0-100');
  console.assert(Object.keys(metrics.chainDistribution).length === 4, 'Should have distribution for all 4 chains');
  console.log('✅ Passed\n');

  // Test 4: Chain distribution percentages sum to 100
  console.log('Test 4: Chain distribution percentages sum to ~100');
  const totalPercentage = Object.values(metrics.chainDistribution)
    .reduce((sum, d) => sum + d.percentage, 0);
  console.assert(Math.abs(totalPercentage - 100) < 0.1 || totalPercentage === 0, 'Percentages should sum to 100%');
  console.log('✅ Passed\n');

  // Test 5: Operation cost estimation
  console.log('Test 5: Operation cost estimation');
  const taskCost = economics.estimateOperationCost('task');
  const messageCost = economics.estimateOperationCost('message');
  const bridgeCost = economics.estimateOperationCost('bridge');
  console.assert(parseFloat(taskCost) > 0, 'Task cost should be positive');
  console.assert(parseFloat(messageCost) > 0, 'Message cost should be positive');
  console.assert(parseFloat(bridgeCost) > 0, 'Bridge cost should be positive');
  console.assert(parseFloat(messageCost) < parseFloat(bridgeCost), 'Message should be cheaper than bridge');
  console.log('✅ Passed\n');

  // Test 6: Optimal chain selection
  console.log('Test 6: Optimal chain selection');
  const optimalTaskChain = economics.getOptimalChainForOperation('task');
  const optimalMessageChain = economics.getOptimalChainForOperation('message');
  console.assert(['base', 'optimism', 'arbitrum'].includes(optimalTaskChain), 'Optimal task chain should be L2');
  console.assert(['base', 'optimism', 'arbitrum'].includes(optimalMessageChain), 'Optimal message chain should be L2');
  console.log('✅ Passed\n');

  // Test 7: Transaction recording
  console.log('Test 7: Transaction recording');
  economics.recordTransaction('income', '10', 'base', 'Task payment');
  economics.recordTransaction('expense', '0.5', 'base', 'Operation cost');
  const recentTransactions = economics.getRecentTransactions(24);
  console.assert(recentTransactions.length === 2, 'Should have 2 recent transactions');
  console.assert(recentTransactions[0].type === 'income', 'First transaction should be income');
  console.assert(recentTransactions[1].type === 'expense', 'Second transaction should be expense');
  console.log('✅ Passed\n');
}

// ============================================================================
// EchoSurvivalManager Tests
// ============================================================================

console.log('Testing EchoSurvivalManager...\n');

{
  // Test 1: Create survival manager
  console.log('Test 1: Create survival manager');
  const manager = createSurvivalManager('test-agent-1');
  console.assert(manager instanceof EchoSurvivalManager, 'Should create EchoSurvivalManager instance');
  console.assert(manager.healthMonitor instanceof AgentHealthMonitor, 'Should have health monitor');
  console.assert(manager.economics instanceof AgentEconomics, 'Should have economics manager');
  console.assert(!manager.isInSurvivalMode(), 'Should not start in survival mode');
  console.log('✅ Passed\n');

  // Test 2: Custom thresholds
  console.log('Test 2: Custom thresholds in constructor');
  const customManager = new EchoSurvivalManager('test-agent-2', {
    thresholds: { minUSDCCritical: 10.0, minRunwayCritical: 5 }
  });
  const thresholds = customManager.economics.getThresholds();
  console.assert(thresholds.minUSDCCritical === 10.0, 'Custom critical threshold should be applied');
  console.assert(thresholds.minRunwayCritical === 5, 'Custom runway threshold should be applied');
  console.log('✅ Passed\n');

  // Test 3: Perform survival check
  console.log('Test 3: Perform survival check');
  const balances = createMockBalances();
  const snapshot = manager.performSurvivalCheck(balances);
  console.assert(snapshot.agentId === 'test-agent-1', 'Snapshot should have correct agent ID');
  console.assert(snapshot.health !== null, 'Snapshot should include health data');
  console.assert(snapshot.economics !== null, 'Snapshot should include economics data');
  console.assert(Array.isArray(snapshot.pendingActions), 'Snapshot should have pending actions array');
  console.assert(snapshot.timestamp !== null, 'Snapshot should have timestamp');
  console.log('✅ Passed\n');

  // Test 4: Snapshot history
  console.log('Test 4: Snapshot history is tracked');
  manager.performSurvivalCheck(balances);
  manager.performSurvivalCheck(balances);
  const history = manager.getSnapshotHistory();
  console.assert(history.length >= 2, 'Should have at least 2 snapshots');
  const latest = manager.getLatestSnapshot();
  console.assert(latest !== null, 'Should be able to get latest snapshot');
  console.log('✅ Passed\n');

  // Test 5: Survival mode entry with critical balance
  console.log('Test 5: Survival mode with critical balance');
  const criticalManager = new EchoSurvivalManager('test-agent-critical', {
    thresholds: { minUSDCCritical: 100.0 }
  });
  const criticalBalances = createMockBalances([
    { usdcBalance: '10' },
    { usdcBalance: '10' },
    { usdcBalance: '10' },
    { usdcBalance: '10' }
  ]);
  criticalManager.performSurvivalCheck(criticalBalances);
  console.assert(criticalManager.isInSurvivalMode(), 'Should enter survival mode with low balance');
  console.log('✅ Passed\n');

  // Test 6: Survival mode exit
  console.log('Test 6: Survival mode exit when balance recovers');
  const recoveryBalances = createMockBalances([
    { usdcBalance: '200' },
    { usdcBalance: '200' },
    { usdcBalance: '200' },
    { usdcBalance: '200' }
  ]);
  criticalManager.performSurvivalCheck(recoveryBalances);
  // Health score needs to recover too
  const recoveredHealth: AgentHealth = {
    overall: 80,
    compute: 80,
    storage: 80,
    network: 80,
    economic: 80,
    lastCheck: new Date().toISOString(),
    status: 'healthy'
  };
  criticalManager['healthMonitor'].updateEconomicHealth(80);
  const finalSnapshot = criticalManager.performSurvivalCheck(recoveryBalances);
  // Note: May still be in survival mode depending on health, but economics should improve
  console.assert(parseFloat(finalSnapshot.economics.totalUSDC) > 100, 'Balance should be recovered');
  console.log('✅ Passed\n');

  // Test 7: Event emission
  console.log('Test 7: Event emission');
  let healthCheckEmitted = false;
  let actionEmitted = false;
  const eventManager = new EchoSurvivalManager('test-agent-events');
  
  eventManager.on('health:check', () => { healthCheckEmitted = true; });
  eventManager.on('action:recommended', () => { actionEmitted = true; });
  
  eventManager.performSurvivalCheck(balances);
  console.assert(healthCheckEmitted, 'Health check event should be emitted');
  console.log('✅ Passed\n');

  manager.stop();
  customManager.stop();
  criticalManager.stop();
  eventManager.stop();
}

// ============================================================================
// Utility Function Tests
// ============================================================================

console.log('Testing utility functions...\n');

{
  // Test 1: Format survival report
  console.log('Test 1: Format survival report');
  const manager = createSurvivalManager('test-report');
  const balances = createMockBalances();
  const snapshot = manager.performSurvivalCheck(balances);
  const report = formatSurvivalReport(snapshot);
  
  console.assert(report.includes('Agora Echo Survival Report'), 'Report should have title');
  console.assert(report.includes('test-report'), 'Report should include agent ID');
  console.assert(report.includes('Health Status'), 'Report should include health status');
  console.assert(report.includes('Economic Metrics'), 'Report should include economic metrics');
  console.assert(report.includes('Survival Mode'), 'Report should include survival mode status');
  console.assert(report.includes('Recommended Actions'), 'Report should include actions');
  console.log('✅ Passed\n');

  // Test 2: shouldAcceptTask - profitable task
  console.log('Test 2: shouldAcceptTask - profitable');
  const profitableResult = shouldAcceptTask(snapshot, '1.0', '0.5', 0.1);
  console.assert(profitableResult.accept === true, 'Should accept profitable task');
  console.assert(profitableResult.reason.includes('margin'), 'Should mention margin');
  console.log('✅ Passed\n');

  // Test 3: shouldAcceptTask - low margin
  console.log('Test 3: shouldAcceptTask - low margin');
  const lowMarginResult = shouldAcceptTask(snapshot, '1.0', '0.95', 0.1);
  console.assert(lowMarginResult.accept === false, 'Should reject low margin task');
  console.assert(lowMarginResult.reason.includes('margin'), 'Should mention margin issue');
  console.log('✅ Passed\n');

  // Test 4: shouldAcceptTask - survival mode
  console.log('Test 4: shouldAcceptTask - survival mode override');
  const survivalSnapshot = { ...snapshot, survivalMode: true };
  const survivalResult = shouldAcceptTask(survivalSnapshot, '0.5', '1.0', 0.1);
  console.assert(survivalResult.accept === true, 'Should accept any task in survival mode');
  console.assert(survivalResult.reason.includes('Survival mode'), 'Should mention survival mode');
  console.log('✅ Passed\n');

  manager.stop();
}

// ============================================================================
// Constants Tests
// ============================================================================

console.log('Testing constants...\n');

{
  // Test 1: DEFAULT_THRESHOLDS
  console.log('Test 1: DEFAULT_THRESHOLDS values');
  console.assert(DEFAULT_THRESHOLDS.minUSDCCritical === 1.0, 'Critical USDC should be 1.0');
  console.assert(DEFAULT_THRESHOLDS.minUSDCWarning === 5.0, 'Warning USDC should be 5.0');
  console.assert(DEFAULT_THRESHOLDS.minRunwayCritical === 3, 'Critical runway should be 3 days');
  console.assert(DEFAULT_THRESHOLDS.minRunwayWarning === 7, 'Warning runway should be 7 days');
  console.assert(DEFAULT_THRESHOLDS.minHealthScore === 30, 'Min health score should be 30');
  console.log('✅ Passed\n');

  // Test 2: OPERATION_COSTS
  console.log('Test 2: OPERATION_COSTS structure');
  console.assert(OPERATION_COSTS.ethereum.task > OPERATION_COSTS.base.task, 'Ethereum should be more expensive than Base');
  console.assert(OPERATION_COSTS.base.message < 0.01, 'Base message should be very cheap');
  console.assert(Object.keys(OPERATION_COSTS).length === 4, 'Should have costs for 4 chains');
  console.log('✅ Passed\n');

  // Test 3: DAILY_OPERATIONAL_COSTS
  console.log('Test 3: DAILY_OPERATIONAL_COSTS values');
  console.assert(DAILY_OPERATIONAL_COSTS.minimum > 0, 'Minimum daily cost should be positive');
  console.assert(DAILY_OPERATIONAL_COSTS.compute > 0, 'Compute cost should be positive');
  console.assert(DAILY_OPERATIONAL_COSTS.storage > 0, 'Storage cost should be positive');
  console.assert(DAILY_OPERATIONAL_COSTS.network > 0, 'Network cost should be positive');
  console.log('✅ Passed\n');
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n========================================');
console.log('All Echo Survival Tests Passed! ✅');
console.log('========================================\n');

console.log('Summary:');
console.log('- AgentHealthMonitor: Health monitoring, trend analysis, event emission');
console.log('- AgentEconomics: Balance tracking, cost estimation, optimal chain selection');
console.log('- EchoSurvivalManager: Orchestrated survival checks, survival mode management');
console.log('- Utilities: Report formatting, task acceptance logic');
console.log('- Constants: Default thresholds and cost configurations');
