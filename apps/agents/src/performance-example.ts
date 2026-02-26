/**
 * Performance Optimization Examples for Agora SDK
 * 
 * This file demonstrates how to use the Performance Optimization module
 * including performance monitoring, caching, batching, lazy loading,
 * rate limiting, and request deduplication.
 */

import {
  // Core Performance Monitoring
  PerformanceMonitor,
  createPerformanceMonitor,
  benchmark,
  measureLatency,
  measureLatencyAsync,
  withLatencyTracking,
  withLatencyTrackingAsync,
  trackMemory,
  generateOptimizationReport,

  // Caching
  OperationCache,
  createCache,
  withPerformanceCache,

  // Batch Processing
  BatchProcessor,
  createBatchProcessor,

  // WebSocket Pooling
  WebSocketPool,
  createWebSocketPool,

  // Lazy Loading
  LazyLoader,
  createLazyLoader,

  // Rate Limiting
  AdaptiveRateLimiter,
  createRateLimiter,

  // Request Deduplication
  RequestDeduplicator,
  createDeduplicator,
  withDeduplication,

  // Bundle Optimization
  BundleOptimizer,
  createBundleOptimizer,
  dynamicImport,
  prefetchModule,

  // Types
  type PerformanceMetrics,
  type BenchmarkResult,
  type CacheEntry,
  type BatchConfig,
  type LazyLoaderConfig,
  type RateLimiterConfig,
  type DedupeConfig,
  type DashboardData,
  type PerformanceBudget,
} from '../../../packages/sdk/src/performance.js';

// ============================================================================
// EXAMPLE 1: Basic Performance Monitoring
// ============================================================================

/**
 * Demonstrates basic performance monitoring setup
 */
export async function exampleBasicMonitoring(): Promise<void> {
  console.log('\n📊 Basic Performance Monitoring Example\n');

  // Create a performance monitor
  const monitor = createPerformanceMonitor({
    sampleIntervalMs: 5000,
    maxSamples: 1000,
    thresholds: {
      maxLatencyMs: 500,
      maxErrorRate: 0.05,
      maxMemoryPercent: 0.85,
      minThroughput: 10,
    },
    enableLeakDetection: true,
    leakDetectionIntervalMs: 30000,
    onAlert: (alert) => {
      console.log(`🚨 ALERT: ${alert.type} - ${alert.message}`);
    },
  });

  // Start monitoring
  monitor.start();

  // Simulate some operations
  for (let i = 0; i < 100; i++) {
    const latency = Math.random() * 100 + 50;
    monitor.recordLatency(latency, Math.random() > 0.1);
  }

  // Get current metrics
  const metrics = monitor.getMetrics();
  console.log('Current Metrics:');
  console.log(`  Latency (p95): ${metrics.latency.p95.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
  console.log(`  Throughput: ${metrics.throughput.rps.toFixed(2)} RPS`);
  console.log(`  Memory Usage: ${(metrics.memory.usagePercent * 100).toFixed(1)}%`);

  // Get window-based metrics
  const windowMetrics = monitor.getWindowMetrics('1m');
  console.log('\n1-Minute Window:');
  console.log(`  Total Operations: ${windowMetrics.throughput.total}`);
  console.log(`  Avg Latency: ${windowMetrics.latency.avg.toFixed(2)}ms`);

  // Stop monitoring
  monitor.stop();
}

// ============================================================================
// EXAMPLE 2: Benchmarking
// ============================================================================

/**
 * Demonstrates how to benchmark functions
 */
export async function exampleBenchmarking(): Promise<void> {
  console.log('\n⏱️ Benchmarking Example\n');

  // Benchmark a synchronous function
  const syncResult = await benchmark(
    'fibonacci',
    () => {
      function fib(n: number): number {
        return n < 2 ? n : fib(n - 1) + fib(n - 2);
      }
      return fib(20);
    },
    100
  );

  console.log(`Benchmark: ${syncResult.name}`);
  console.log(`  Iterations: ${syncResult.iterations}`);
  console.log(`  Avg Time: ${syncResult.avgTime.toFixed(3)}ms`);
  console.log(`  Min Time: ${syncResult.minTime.toFixed(3)}ms`);
  console.log(`  Max Time: ${syncResult.maxTime.toFixed(3)}ms`);
  console.log(`  Std Dev: ${syncResult.stdDev.toFixed(3)}ms`);
  console.log(`  Ops/sec: ${syncResult.opsPerSecond.toFixed(0)}`);

  // Benchmark an async function
  const asyncResult = await benchmark(
    'async-operation',
    async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'done';
    },
    50
  );

  console.log(`\nBenchmark: ${asyncResult.name}`);
  console.log(`  Avg Time: ${asyncResult.avgTime.toFixed(3)}ms`);
  console.log(`  Ops/sec: ${asyncResult.opsPerSecond.toFixed(0)}`);
}

// ============================================================================
// EXAMPLE 3: Latency Tracking
// ============================================================================

/**
 * Demonstrates latency tracking decorators
 */
export async function exampleLatencyTracking(): Promise<void> {
  console.log('\n🎯 Latency Tracking Example\n');

  const monitor = createPerformanceMonitor();

  // Track synchronous function
  const trackedSyncFn = withLatencyTracking(
    (n: number): number => {
      // Simulate work
      for (let i = 0; i < n * 1000000; i++) {}
      return n * n;
    },
    monitor
  );

  const result1 = trackedSyncFn(10);
  console.log(`Sync result: ${result1}`);

  // Track asynchronous function
  const trackedAsyncFn = withLatencyTrackingAsync(
    async (id: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return `Data for ${id}`;
    },
    monitor
  );

  const result2 = await trackedAsyncFn('user-123');
  console.log(`Async result: ${result2}`);

  // Measure latency inline
  const { result, latencyMs } = measureLatency(
    () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      return arr.reduce((a, b) => a + b, 0);
    },
    monitor
  );
  console.log(`\nInline measurement: result=${result}, latency=${latencyMs.toFixed(3)}ms`);

  // Measure async latency inline
  const { result: asyncResult, latencyMs: asyncLatency } = await measureLatencyAsync(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return 'async value';
    },
    monitor
  );
  console.log(`Async inline measurement: result=${asyncResult}, latency=${asyncLatency.toFixed(3)}ms`);
}

// ============================================================================
// EXAMPLE 4: Memory Monitoring
// ============================================================================

/**
 * Demonstrates memory monitoring and leak detection
 */
export async function exampleMemoryMonitoring(): Promise<void> {
  console.log('\n💾 Memory Monitoring Example\n');

  const monitor = createPerformanceMonitor({
    enableLeakDetection: true,
    leakDetectionIntervalMs: 10000,
  });

  monitor.start();

  // Track memory over time
  const stopTracking = trackMemory(monitor, 1000);

  // Simulate memory allocation
  const data: number[][] = [];
  for (let i = 0; i < 10; i++) {
    data.push(new Array(1000000).fill(i));
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check for memory leaks
  const leakResult = monitor.detectMemoryLeak();
  console.log('Leak Detection Result:');
  console.log(`  Has Leak: ${leakResult.hasLeak}`);
  console.log(`  Confidence: ${(leakResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Growth Rate: ${(leakResult.growthRate / 1024 / 1024).toFixed(2)} MB/min`);

  if (leakResult.suspectedSources.length > 0) {
    console.log('  Suspected Sources:');
    leakResult.suspectedSources.forEach(source => console.log(`    - ${source}`));
  }

  // Clean up
  data.length = 0;
  stopTracking();
  monitor.stop();
}

// ============================================================================
// EXAMPLE 5: Operation Caching
// ============================================================================

/**
 * Demonstrates operation caching with TTL
 */
export async function exampleCaching(): Promise<void> {
  console.log('\n🗄️ Operation Caching Example\n');

  // Create a cache
  const cache = createCache<string>({
    ttlMs: 5000, // 5 second TTL
    maxSize: 100,
    updateOnAccess: true, // Extend TTL on access
  });

  // Simulate an expensive operation
  async function fetchUserData(userId: string): Promise<string> {
    console.log(`  [FETCH] Fetching user ${userId} from database...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return JSON.stringify({ id: userId, name: `User ${userId}`, timestamp: Date.now() });
  }

  // Wrap with caching
  const cachedFetch = withPerformanceCache(
    fetchUserData,
    (userId) => `user:${userId}`,
    cache
  );

  // First call - cache miss
  console.log('First call (cache miss):');
  const data1 = await cachedFetch('123');
  console.log(`  Result: ${data1.substring(0, 50)}...`);

  // Second call - cache hit
  console.log('\nSecond call (cache hit):');
  const data2 = await cachedFetch('123');
  console.log(`  Result: ${data2.substring(0, 50)}...`);

  // Check cache stats
  const stats = cache.getStats();
  console.log('\nCache Statistics:');
  console.log(`  Size: ${stats.size}`);
  console.log(`  Hits: ${stats.hits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);

  // Wait for TTL to expire
  console.log('\nWaiting for TTL to expire...');
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Third call - cache expired, will fetch again
  console.log('\nThird call (expired):');
  const data3 = await cachedFetch('123');
  console.log(`  Result: ${data3.substring(0, 50)}...`);
}

// ============================================================================
// EXAMPLE 6: Batch Request Optimization
// ============================================================================

/**
 * Demonstrates batch request processing
 */
export async function exampleBatching(): Promise<void> {
  console.log('\n📦 Batch Request Optimization Example\n');

  // Simulate a database that supports batch queries
  async function batchQueryDatabase(ids: string[]): Promise<string[]> {
    console.log(`  [DATABASE] Processing batch of ${ids.length} items...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return ids.map(id => `Result for ${id}`);
  }

  // Create a batch processor
  const batchProcessor = createBatchProcessor(batchQueryDatabase, {
    maxBatchSize: 10,
    maxWaitMs: 100,
    retryAttempts: 3,
    retryDelayMs: 1000,
  });

  // Send multiple concurrent requests
  console.log('Sending 25 concurrent requests...');
  const startTime = Date.now();

  const promises: Promise<string>[] = [];
  for (let i = 0; i < 25; i++) {
    promises.push(batchProcessor.add(`item-${i}`));
  }

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  console.log(`Completed in ${duration}ms`);
  console.log(`Results: ${results.length} items`);

  const stats = batchProcessor.getStats();
  console.log('\nBatch Statistics:');
  console.log(`  Total Batches: ${stats.totalBatches}`);
  console.log(`  Total Items: ${stats.totalItems}`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  Queue Size: ${stats.queueSize}`);

  // Compare with individual requests
  console.log('\nIndividual requests would take ~1250ms (25 * 50ms)');
  console.log(`Batch processing took ~${duration}ms`);
}

// ============================================================================
// EXAMPLE 7: WebSocket Connection Pooling
// ============================================================================

/**
 * Demonstrates WebSocket connection pooling
 */
export async function exampleWebSocketPooling(): Promise<void> {
  console.log('\n🔌 WebSocket Connection Pooling Example\n');

  // Note: This is a simulated example - real WebSocket implementation would vary
  console.log('Creating WebSocket pool...');

  const pool = createWebSocketPool('wss://api.example.com/ws', {
    minConnections: 2,
    maxConnections: 10,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 10000,
    heartbeatIntervalMs: 30000,
  });

  console.log('Pool configuration:');
  console.log('  Min Connections: 2');
  console.log('  Max Connections: 10');
  console.log('  Idle Timeout: 30s');

  // Get pool stats
  const stats = pool.getStats();
  console.log('\nPool Statistics:');
  console.log(`  Total Connections: ${stats.totalConnections}`);
  console.log(`  Active Connections: ${stats.activeConnections}`);
  console.log(`  Idle Connections: ${stats.idleConnections}`);
  console.log(`  Wait Queue: ${stats.waitQueueLength}`);

  // Demonstrate usage pattern
  console.log('\nUsage Pattern:');
  console.log('  1. Acquire connection from pool');
  console.log('  2. Send/receive messages');
  console.log('  3. Release connection back to pool');
  console.log('  4. Pool manages lifecycle and cleanup');
}

// ============================================================================
// EXAMPLE 8: Lazy Loading
// ============================================================================

/**
 * Demonstrates lazy loading for heavy components
 */
export async function exampleLazyLoading(): Promise<void> {
  console.log('\n🐌 Lazy Loading Example\n');

  // Simulate a heavy module
  interface HeavyModule {
    processData(data: unknown[]): string;
    expensiveCalculation(n: number): number;
  }

  // Create a lazy loader
  const heavyLoader = createLazyLoader<HeavyModule>(
    async () => {
      console.log('  [LOADER] Loading heavy module...');
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        processData: (data: unknown[]) => `Processed ${data.length} items`,
        expensiveCalculation: (n: number) => n * n * n,
      };
    },
    {
      preload: true,
      preloadDelayMs: 2000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 10000,
    }
  );

  // Initially not loaded
  console.log(`Initially loaded: ${heavyLoader.loaded()}`);

  // Load on demand
  console.log('\nLoading on demand...');
  const module = await heavyLoader.load();
  console.log(`Now loaded: ${heavyLoader.loaded()}`);

  // Use the module
  console.log('\nUsing loaded module:');
  console.log(`  ${module.processData([1, 2, 3, 4, 5])}`);
  console.log(`  Calculation: ${module.expensiveCalculation(10)}`);

  // Get cached instance
  console.log('\nGetting cached instance:');
  const cached = heavyLoader.get();
  console.log(`  Same instance: ${cached === module}`);

  // Unload when done
  console.log('\nUnloading...');
  heavyLoader.unload();
  console.log(`Loaded after unload: ${heavyLoader.loaded()}`);
}

// ============================================================================
// EXAMPLE 9: Rate Limiting with Adaptive Backoff
// ============================================================================

/**
 * Demonstrates rate limiting with adaptive backoff
 */
export async function exampleRateLimiting(): Promise<void> {
  console.log('\n⏳ Rate Limiting Example\n');

  // Create an adaptive rate limiter
  const rateLimiter = createRateLimiter({
    requestsPerSecond: 10,
    burstSize: 5,
    enableAdaptiveBackoff: true,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
    recoveryRate: 0.1,
  });

  console.log('Rate Limiter Configuration:');
  console.log('  Requests/sec: 10');
  console.log('  Burst Size: 5');
  console.log('  Adaptive Backoff: Enabled');

  // Simulate successful requests
  console.log('\nMaking 15 successful requests...');
  const startTime = Date.now();

  for (let i = 0; i < 15; i++) {
    await rateLimiter.acquire();
    rateLimiter.reportSuccess();
    
    if (i < 5) {
      console.log(`  Request ${i + 1}: OK (within burst)`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`Completed 15 requests in ${duration}ms`);

  // Simulate error and backoff
  console.log('\nSimulating errors to trigger backoff...');
  for (let i = 0; i < 3; i++) {
    rateLimiter.reportError(new Error('Rate limit exceeded'));
    const state = rateLimiter.getState();
    console.log(`  Error ${i + 1}: Backoff = ${state.currentBackoffMs}ms`);
  }

  // Recover from backoff
  console.log('\nRecovering from backoff with successful requests...');
  for (let i = 0; i < 15; i++) {
    rateLimiter.reportSuccess();
  }

  const finalState = rateLimiter.getState();
  console.log(`Final backoff: ${finalState.currentBackoffMs.toFixed(0)}ms`);
}

// ============================================================================
// EXAMPLE 10: Request Deduplication
// ============================================================================

/**
 * Demonstrates request deduplication
 */
export async function exampleDeduplication(): Promise<void> {
  console.log('\n🔄 Request Deduplication Example\n');

  let fetchCount = 0;

  // Simulate an API call
  async function fetchData(id: string): Promise<string> {
    fetchCount++;
    console.log(`  [API CALL #${fetchCount}] Fetching ${id}...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Data for ${id}`;
  }

  // Wrap with deduplication
  const dedupeFetch = withDeduplication(fetchData, {
    ttlMs: 2000,
    maxPending: 100,
  });

  // Concurrent requests with same ID (should dedupe)
  console.log('Making 5 concurrent requests for the same ID...');
  const promises = [
    dedupeFetch('user-1'),
    dedupeFetch('user-1'),
    dedupeFetch('user-1'),
    dedupeFetch('user-1'),
    dedupeFetch('user-1'),
  ];

  const results = await Promise.all(promises);
  console.log(`All 5 requests resolved: ${results.every(r => r === results[0])}`);
  console.log(`Total API calls made: ${fetchCount}`);

  // Request for different ID
  console.log('\nRequesting different ID...');
  const result2 = await dedupeFetch('user-2');
  console.log(`Result: ${result2}`);
  console.log(`Total API calls made: ${fetchCount}`);

  // Same ID after TTL expires
  console.log('\nWaiting for TTL to expire...');
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  console.log('Requesting same ID after TTL...');
  const result3 = await dedupeFetch('user-1');
  console.log(`Result: ${result3}`);
  console.log(`Total API calls made: ${fetchCount}`);
}

// ============================================================================
// EXAMPLE 11: Bundle Size Optimization
// ============================================================================

/**
 * Demonstrates bundle size optimization helpers
 */
export async function exampleBundleOptimization(): Promise<void> {
  console.log('\n📦 Bundle Size Optimization Example\n');

  // Create a bundle optimizer
  const optimizer = createBundleOptimizer();

  // Register chunks
  optimizer.registerChunk({
    name: 'core',
    files: ['core.js', 'utils.js'],
    preload: true,
  });

  optimizer.registerChunk({
    name: 'analytics',
    files: ['analytics.js', 'tracking.js'],
    async: true,
  });

  optimizer.registerChunk({
    name: 'charts',
    files: ['charts.js', 'd3.js'],
    async: true,
    preload: false,
  });

  // Analyze bundle
  const analysis = optimizer.analyze();
  console.log('Bundle Analysis:');
  console.log(`  Total Size: ${(analysis.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Number of Chunks: ${analysis.chunks.length}`);
  console.log(`  Max Chunk Size: ${(analysis.maxChunkSize / 1024).toFixed(0)} KB`);

  // Load chunks on demand
  console.log('\nLoading chunks:');
  
  console.log('  Loading core...');
  await optimizer.loadChunk('core');
  console.log(`  Core loaded: ${optimizer.isLoaded('core')}`);

  console.log('\n  Loading analytics (async)...');
  await optimizer.loadChunk('analytics');
  console.log(`  Analytics loaded: ${optimizer.isLoaded('analytics')}`);

  console.log(`\nLoaded chunks: ${optimizer.getLoadedChunks().join(', ')}`);

  // Demonstrate prefetch
  console.log('\nPrefetching next route...');
  prefetchModule('/routes/dashboard.js');
  console.log('  Prefetch initiated for dashboard route');
}

// ============================================================================
// EXAMPLE 12: Performance Dashboard
// ============================================================================

/**
 * Demonstrates real-time dashboard data
 */
export async function exampleDashboard(): Promise<void> {
  console.log('\n📈 Performance Dashboard Example\n');

  const monitor = createPerformanceMonitor();
  monitor.start();

  // Generate some sample data
  for (let i = 0; i < 50; i++) {
    const latency = 50 + Math.random() * 200;
    monitor.recordLatency(latency, Math.random() > 0.05);
  }

  // Get dashboard data
  const dashboard = monitor.getDashboardData();

  console.log('Dashboard Data:');
  console.log(`  Status: ${dashboard.status}`);
  console.log(`  Health Score: ${dashboard.healthScore}/100`);
  console.log(`  Last Updated: ${new Date(dashboard.lastUpdated).toLocaleTimeString()}`);

  console.log('\nCurrent Metrics:');
  console.log(`  Latency (p95): ${dashboard.current.latency.p95.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(dashboard.current.errorRate * 100).toFixed(2)}%`);
  console.log(`  Throughput: ${dashboard.current.throughput.rps.toFixed(2)} RPS`);

  console.log('\nWindow Metrics:');
  console.log(`  1m Latency (p95): ${dashboard.windows['1m'].latency.p95.toFixed(2)}ms`);
  console.log(`  5m Latency (p95): ${dashboard.windows['5m'].latency.p95.toFixed(2)}ms`);
  console.log(`  15m Latency (p95): ${dashboard.windows['15m'].latency.p95.toFixed(2)}ms`);

  console.log('\nLatency Histogram:');
  console.log(`  Min: ${dashboard.latencyHistogram.min.toFixed(2)}ms`);
  console.log(`  P50: ${dashboard.latencyHistogram.p50.toFixed(2)}ms`);
  console.log(`  P95: ${dashboard.latencyHistogram.p95.toFixed(2)}ms`);
  console.log(`  P99: ${dashboard.latencyHistogram.p99.toFixed(2)}ms`);
  console.log(`  Max: ${dashboard.latencyHistogram.max.toFixed(2)}ms`);

  monitor.stop();
}

// ============================================================================
// EXAMPLE 13: Performance Budgets
// ============================================================================

/**
 * Demonstrates performance budget checking
 */
export async function examplePerformanceBudgets(): Promise<void> {
  console.log('\n💰 Performance Budgets Example\n');

  const monitor = createPerformanceMonitor();
  monitor.start();

  // Generate sample data
  for (let i = 0; i < 20; i++) {
    monitor.recordLatency(200 + Math.random() * 100, true);
  }

  // Define performance budgets
  const budgets: PerformanceBudget[] = [
    { name: 'API Latency', metric: 'latency', max: 500, warning: 400 },
    { name: 'Error Rate', metric: 'error_rate', max: 0.05, warning: 0.03 },
    { name: 'Memory Usage', metric: 'memory', max: 0.9, warning: 0.75 },
  ];

  // Check budgets
  const report = monitor.checkPerformanceBudgets(budgets);

  console.log('Performance Budget Report:');
  console.log(`  Overall Status: ${report.overallStatus}`);
  console.log(`  Pass Rate: ${(report.passRate * 100).toFixed(1)}%`);

  console.log('\nBudget Details:');
  report.budgets.forEach(budget => {
    const statusEmoji = budget.status === 'pass' ? '✅' : budget.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${statusEmoji} ${budget.name}: ${budget.current?.toFixed(2)} / ${budget.max} (${budget.status})`);
  });

  monitor.stop();
}

// ============================================================================
// EXAMPLE 14: Optimization Report
// ============================================================================

/**
 * Demonstrates generating optimization reports
 */
export async function exampleOptimizationReport(): Promise<void> {
  console.log('\n📋 Optimization Report Example\n');

  const monitor = createPerformanceMonitor();
  monitor.start();

  // Generate various metrics
  for (let i = 0; i < 100; i++) {
    const latency = Math.random() * 1000;
    const success = Math.random() > 0.1;
    monitor.recordLatency(latency, success);
  }

  // Record memory snapshots
  for (let i = 0; i < 10; i++) {
    monitor.recordMemory();
  }

  // Generate report
  const report = generateOptimizationReport(monitor);

  console.log('Optimization Report:');
  console.log(`  Health Score: ${report.summary.healthScore}/100`);
  console.log(`  Total Recommendations: ${report.summary.totalRecommendations}`);
  console.log(`  Critical: ${report.summary.criticalCount}`);
  console.log(`  Warning: ${report.summary.warningCount}`);
  console.log(`  Info: ${report.summary.infoCount}`);

  console.log('\nTrends:');
  console.log(`  Latency: ${report.trends.latency}`);
  console.log(`  Throughput: ${report.trends.throughput}`);
  console.log(`  Memory: ${report.trends.memory}`);

  console.log('\nRecommendations:');
  report.recommendations.forEach((rec, index) => {
    const emoji = rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : '🟢';
    console.log(`\n  ${emoji} ${rec.title}`);
    console.log(`     Category: ${rec.category}`);
    console.log(`     Effort: ${rec.effort}`);
    console.log(`     Impact: ${rec.impact}`);
    console.log(`     Action: ${rec.action}`);
  });

  monitor.stop();
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Agora SDK Performance Optimization Examples              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await exampleBasicMonitoring();
  await exampleBenchmarking();
  await exampleLatencyTracking();
  await exampleMemoryMonitoring();
  await exampleCaching();
  await exampleBatching();
  await exampleWebSocketPooling();
  await exampleLazyLoading();
  await exampleRateLimiting();
  await exampleDeduplication();
  await exampleBundleOptimization();
  await exampleDashboard();
  await examplePerformanceBudgets();
  await exampleOptimizationReport();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   All examples completed! 🎉                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
