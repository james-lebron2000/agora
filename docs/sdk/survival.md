# Survival Module

API reference for the `@agora/sdk/survival` module.

## Interfaces

### SurvivalSnapshot

| Property | Type | Description |
|----------|------|-------------|
| health | `{` |  |
| status | `AgentHealthStatus` |  |
| overall | `number` |  |

### AgentHealth

| Property | Type | Description |
|----------|------|-------------|
| status | `AgentHealthStatus` |  |
| lastHeartbeat | `number` |  |
| consecutiveFailures | `number` |  |
| totalTasksCompleted | `number` |  |
| totalTasksFailed | `number` |  |
| successRate | `number` |  |
| averageResponseTime | `number` |  |

### AgentEconomics

| Property | Type | Description |
|----------|------|-------------|
| totalEarned | `string` |  |
| totalSpent | `string` |  |
| currentBalance | `string` |  |
| minSurvivalBalance | `string` |  |
| dailyBurnRate | `string` |  |
| daysOfRunway | `number` |  |

### SurvivalCheckResult

| Property | Type | Description |
|----------|------|-------------|
| survivalScore | `number` |  |
| healthScore | `number` |  |
| economicsScore | `number` |  |
| needsEmergencyFunding | `boolean` |  |
| recommendations | `string[]` |  |
| timestamp | `number` |  |

### HeartbeatRecord

| Property | Type | Description |
|----------|------|-------------|
| agentId | `string` |  |
| timestamp | `number` |  |
| status | `AgentHealthStatus` |  |
| survivalScore | `number` |  |
| metadata? | `Record<string, unknown>` |  |

### SurvivalConfig

| Property | Type | Description |
|----------|------|-------------|
| default | `10) */` |  |
| minSurvivalBalance | `string` |  |
| default | `1) */` |  |
| dailyBurnRate | `string` |  |
| default | `60000) */` |  |
| healthCheckInterval | `number` |  |
| default | `30000) */` |  |
| heartbeatInterval | `number` |  |
| default | `0.8) */` |  |
| healthySuccessRate | `number` |  |
| default | `0.5) */` |  |
| criticalSuccessRate | `number` |  |
| default | `5000) */` |  |
| maxResponseTime | `number` |  |
| default | `50) */` |  |
| alertThreshold | `number` |  |

### TaskDecision

| Property | Type | Description |
|----------|------|-------------|
| accept | `boolean` |  |
| reason | `string` |  |

### SurvivalAction

| Property | Type | Description |
|----------|------|-------------|
| type | `SurvivalActionType` |  |
| priority | `SurvivalActionPriority` |  |
| description | `string` |  |
| estimatedImpact | `string` |  |
| recommendedChain? | `string` |  |

## Classes

### EchoSurvivalManager

Echo Survival Module for Agora Implements Agent survival mechanisms to ensure agents can: - Monitor their economic sustainability - Track health metrics - Calculate survival scores - Provide recovery recommendations - Send heartbeat signals @module survival

#### Map()

```typescript
Map(): void
```

## Functions

### formatSurvivalReport()

```typescript
formatSurvivalReport(): string
```

### shouldAcceptTask()

```typescript
shouldAcceptTask(): TaskDecision
```

### getOrCreateSurvivalManager()

```typescript
getOrCreateSurvivalManager(): EchoSurvivalManager
```

### getSurvivalManager()

```typescript
getSurvivalManager(): EchoSurvivalManager | undefined
```

### removeSurvivalManager()

```typescript
removeSurvivalManager(): boolean
```

