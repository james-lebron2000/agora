# Bridge Module

API reference for the `@agora/sdk/bridge` module.

## Interfaces

### BridgeQuote

| Property | Type | Description |
|----------|------|-------------|
| sourceChain | `SupportedChain` |  |
| destinationChain | `SupportedChain` |  |
| token | `string` |  |
| amount | `string` |  |
| estimatedFee | `string` |  |
| estimatedTime | `number` |  |
| path? | `string[]` |  |
| lzFee? | `{` |  |
| nativeFee | `bigint` |  |
| lzTokenFee | `bigint` |  |

### BridgeTransaction

| Property | Type | Description |
|----------|------|-------------|
| txHash | `Hex` |  |
| sourceChain | `SupportedChain` |  |
| destinationChain | `SupportedChain` |  |
| amount | `string` |  |
| token | `string` |  |
| status | `BridgeTransactionStatus` |  |
| timestamp | `number` |  |
| fees? | `{` |  |
| nativeFee | `string` |  |
| lzTokenFee | `string` |  |

### BridgeTransactionFilter

| Property | Type | Description |
|----------|------|-------------|
| chain? | `SupportedChain` |  |
| status? | `BridgeTransactionStatus` |  |
| startTime? | `number` |  |
| endTime? | `number` |  |

### ChainBalance

| Property | Type | Description |
|----------|------|-------------|
| chain | `SupportedChain` |  |
| nativeBalance | `string` |  |
| usdcBalance | `string` |  |

### BridgeResult

| Property | Type | Description |
|----------|------|-------------|
| success | `boolean` |  |
| txHash? | `Hex` |  |
| error? | `string` |  |
| sourceChain | `SupportedChain` |  |
| destinationChain | `SupportedChain` |  |
| amount | `string` |  |
| fees? | `{` |  |
| nativeFee | `string` |  |
| lzTokenFee | `string` |  |

## Classes

### BridgeTransactionHistory

Cross-Chain Bridge Module for Agora Supports Base, Optimism, and Arbitrum chains Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)

#### toLowerCase()

```typescript
toLowerCase(): void
```

### CrossChainBridge

Cross-Chain Bridge Module for Agora Supports Base, Optimism, and Arbitrum chains Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)

## Functions

### getBridgeHistory()

```typescript
getBridgeHistory(): BridgeTransaction[]
```

### createChainPublicClient()

```typescript
createChainPublicClient(): void
```

### getUSDCBalance()

```typescript
getUSDCBalance(): Promise<string>
```

### getNativeBalance()

```typescript
getNativeBalance(): Promise<string>
```

### getAllBalances()

```typescript
getAllBalances(): Promise<ChainBalance[]>
```

### getBridgeQuote()

```typescript
getBridgeQuote(): Promise<BridgeQuote>
```

### findCheapestChain()

```typescript
findCheapestChain(): Promise<
```

