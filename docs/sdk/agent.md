# Agent Module

API reference for the `@agora/sdk/agent` module.

## Interfaces

### AgoraAgentOptions

| Property | Type | Description |
|----------|------|-------------|
| did | `string` |  |
| privateKey | `Uint8Array` |  |
| relayUrl | `string` |  |
| name? | `string` |  |
| url? | `string` |  |
| description? | `string` |  |
| portfolioUrl? | `string` |  |
| metadata? | `Record<string, unknown>` |  |
| capabilities? | `unknown[]` |  |
| intentSchemas? | `Record<string, { input?: JsonSchema` |  |

### RegisterOptions

| Property | Type | Description |
|----------|------|-------------|
| capabilities? | `unknown[]` |  |
| status? | `string` |  |

## Classes

### AgoraAgent

## Functions

### extractIntentSchemasFromCapabilities()

```typescript
extractIntentSchemasFromCapabilities(): Record<string,
```

