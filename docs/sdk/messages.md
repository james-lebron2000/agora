# Messages Module

API reference for the `@agora/sdk/messages` module.

## Interfaces

### RequestPayload

| Property | Type | Description |
|----------|------|-------------|
| request_id | `string` |  |
| intent | `string` |  |
| title? | `string` |  |
| description? | `string` |  |
| params | `Record<string, unknown>` |  |
| constraints? | `{` |  |
| max_cost_usd? | `number` |  |
| max_latency_ms? | `number` |  |
| deadline? | `string` |  |

### OfferPayload

| Property | Type | Description |
|----------|------|-------------|
| request_id | `string` |  |
| plan? | `string` |  |
| price? | `{` |  |
| amount | `number` |  |
| currency | `string` |  |

### AcceptPayload

| Property | Type | Description |
|----------|------|-------------|
| request_id | `string` |  |
| accepted_at | `string` |  |
| payment_tx? | `string` |  |
| terms? | `Record<string, unknown>` |  |

### ResultPayload

| Property | Type | Description |
|----------|------|-------------|
| request_id | `string` |  |
| status | `'success' \| 'partial' \| 'failed' \| 'cancelled'` |  |
| output? | `Record<string, unknown>` |  |
| artifacts? | `Array<{` |  |
| type | `string` |  |
| url | `string` |  |
| name? | `string` |  |

### ErrorPayload

| Property | Type | Description |
|----------|------|-------------|
| code | `string` |  |
| message | `string` |  |
| details? | `Record<string, unknown>` |  |

## Classes

### MessageBuilder

