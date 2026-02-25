# Payment Module

API reference for the `@agora/sdk/payment` module.

## Interfaces

### PaymentClientOptions

| Property | Type | Description |
|----------|------|-------------|
| privateKey | `Hex` |  |
| network? | `BaseNetwork` |  |
| chain? | `Chain` |  |
| rpcUrl? | `string` |  |
| usdcAddress? | `Address` |  |

### ApproveUsdcOptions

**Extends:** `PaymentClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| spender | `Address` |  |
| amount | `bigint \| number \| string` |  |
| decimals? | `number` |  |

### TransferUsdcOptions

**Extends:** `PaymentClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| recipient | `Address` |  |
| amount | `bigint \| number \| string` |  |
| decimals? | `number` |  |

### TransferNativeOptions

**Extends:** `PaymentClientOptions`

| Property | Type | Description |
|----------|------|-------------|
| recipient | `Address` |  |
| amount | `bigint \| number \| string` |  |
| decimals? | `number` |  |

## Functions

### resolveBaseChain()

```typescript
resolveBaseChain(): Chain
```

### getUsdcAddressForChain()

```typescript
getUsdcAddressForChain(): Address
```

### approveUSDC()

```typescript
approveUSDC(): Promise<Hash>
```

### transferUSDC()

```typescript
transferUSDC(): Promise<Hash>
```

### transferNative()

```typescript
transferNative(): Promise<Hash>
```

