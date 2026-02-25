# Performance Module

API reference for the `@agora/sdk/performance` module.

## Interfaces

### PerformanceMetrics

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| timestamp | `number` |  |
| latency | `{` |  |
| avg | `number` |  |
| min | `number` |  |
| max | `number` |  |
| p50 | `number` |  |
| p95 | `number` |  |
| p99 | `number` |  |

### BenchmarkResult

| Property | Type | Description |
|----------|------|-------------|
| name | `string` |  |
| iterations | `number` |  |
| totalTime | `number` |  |
| avgTime | `number` |  |
| minTime | `number` |  |
| maxTime | `number` |  |
| stdDev | `number` |  |
| opsPerSecond | `number` |  |
| samples | `number[]` |  |

### LatencyHistogram

| Property | Type | Description |
|----------|------|-------------|
| count | `number` |  |
| p50 | `number` |  |
| p75 | `number` |  |
| p90 | `number` |  |
| p95 | `number` |  |
| p99 | `number` |  |
| p999 | `number` |  |
| min | `number` |  |
| max | `number` |  |
| avg | `number` |  |

### MemorySnapshot

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| timestamp | `number` |  |
| heapUsed | `number` |  |
| heapTotal | `number` |  |
| rss | `number` |  |
| external | `number` |  |
| arrayBuffers | `number` |  |
| usagePercent | `number` |  |

### LeakDetectionResult

| Property | Type | Description |
|----------|------|-------------|
| hasLeak | `boolean` |  |
| confidence | `number` |  |
| growthRate | `number` |  |
| suspectedSources | `string[]` |  |
| recommendation | `string` |  |

### OptimizationRecommendation

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| severity | `SeverityLevel` |  |
| category | `'latency' \| 'throughput' \| 'memory' \| 'errors' \| 'general'` |  |
| title | `string` |  |
| description | `string` |  |
| action | `string` |  |
| impact | `string` |  |
| effort | `'low' \| 'medium' \| 'high'` |  |

### OptimizationReport

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| timestamp | `number` |  |
| summary | `{` |  |
| healthScore | `number` |  |
| totalRecommendations | `number` |  |
| criticalCount | `number` |  |
| warningCount | `number` |  |
| infoCount | `number` |  |

### AlertThresholds

| Property | Type | Description |
|----------|------|-------------|
| maxLatencyMs | `number` |  |
| maxErrorRate | `number` |  |
| maxMemoryPercent | `number` |  |
| minThroughput | `number` |  |

### PerformanceMonitorConfig

| Property | Type | Description |
|----------|------|-------------|
| sampleIntervalMs | `number` |  |
| maxSamples | `number` |  |
| thresholds | `AlertThresholds` |  |
| enableLeakDetection | `boolean` |  |
| leakDetectionIntervalMs | `number` |  |
| onAlert? | `(alert: PerformanceAlert) => void` |  |
| windows | `{` |  |
| short | `number` |  |
| medium | `number` |  |
| long | `number` |  |

### PerformanceAlert

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| timestamp | `number` |  |
| type | `'latency' \| 'error_rate' \| 'memory' \| 'throughput' \| 'leak_detected'` |  |
| severity | `SeverityLevel` |  |
| message | `string` |  |
| value | `number` |  |
| threshold | `number` |  |
| context? | `Record<string, unknown>` |  |

## Classes

### PerformanceMonitor

Performance Optimization Module for Agora SDK Provides comprehensive performance monitoring, benchmarking, memory leak detection, latency tracking, and optimization recommendations.

## Functions

### createPerformanceMonitor()

```typescript
createPerformanceMonitor(): PerformanceMonitor
```

### trackMemory()

```typescript
trackMemory(): () => void
```

### generateOptimizationReport()

```typescript
generateOptimizationReport(): OptimizationReport
```

