# Types Module

API reference for the `@agora/sdk/types` module.

## Interfaces

### EnvelopeHeader

| Property | Type | Description |
|----------|------|-------------|
| alg | `string` |  |
| kid? | `string` |  |
| typ? | `string` |  |
| jcs? | `JcsProfile` |  |
| created? | `string` |  |
| expires? | `string` |  |

### Signer

| Property | Type | Description |
|----------|------|-------------|
| alg | `string` |  |
| keyId? | `string` |  |
| message | `Uint8Array): Uint8Array \| Promise<Uint8Array>` |  |

### Verifier

| Property | Type | Description |
|----------|------|-------------|
| alg | `string` |  |
| keyId? | `string` |  |
| message | `Uint8Array, signature: Uint8Array): boolean \| Promise<boolean>` |  |

