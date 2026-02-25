# Escrow Module

API reference for the `@agora/sdk/escrow` module.

## Interfaces

### EscrowClientOptions

| Property | Type | Description |
|----------|------|-------------|
| privateKey? | `Hex` |  |
| network? | `EscrowNetwork` |  |
| chain? | `Chain` |  |
| rpcUrl? | `string` |  |
| escrowAddress? | `Address` |  |

### DepositOptions

**Extends:** `EscrowClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| requestId | `string \| Hex` |  |
| amount | `bigint \| number \| string` |  |
| seller | `Address` |  |
| decimals? | `number` |  |

### EscrowActionOptions

**Extends:** `EscrowClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| requestId | `string \| Hex` |  |

### EscrowStatusResult

| Property | Type | Description |
|----------|------|-------------|
| requestId | `Hex` |  |
| buyer | `Address` |  |
| seller | `Address` |  |
| amount | `bigint` |  |
| createdAt | `bigint` |  |
| status | `EscrowStatus` |  |

### EscrowEventHandlers

| Property | Type | Description |
|----------|------|-------------|
| requestId? | `string \| Hex` |  |
| onDeposited? | `(log: { requestId: Hex` |  |

### BatchEscrowOptions

**Extends:** `EscrowClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| requestIds | `(string \| Hex)[]` |  |

## Functions

### encodeRequestId()

```typescript
encodeRequestId(): Hex
```

### deposit()

```typescript
deposit(): Promise<Hash>
```

### release()

```typescript
release(): Promise<Hash>
```

### refund()

```typescript
refund(): Promise<Hash>
```

### batchRelease()

```typescript
batchRelease(): Promise<Hash>
```

### batchRefund()

```typescript
batchRefund(): Promise<Hash>
```

### getEscrowStatus()

```typescript
getEscrowStatus(): Promise<EscrowStatusResult>
```

### watchEscrowEvents()

```typescript
watchEscrowEvents(): () => void
```

