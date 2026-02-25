# Wallet-manager Module

API reference for the `@agora/sdk/wallet-manager` module.

## Interfaces

### WalletData

| Property | Type | Description |
|----------|------|-------------|
| address | `string` |  |
| encryptedPrivateKey | `string` |  |
| createdAt | `string` |  |
| version | `string` |  |

### AgentWallet

| Property | Type | Description |
|----------|------|-------------|
| address | `string` |  |
| privateKey | `Hex` |  |
| walletClient | `WalletClient` |  |

### MultiChainWallet

| Property | Type | Description |
|----------|------|-------------|
| address | `Address` |  |
| privateKey | `Hex` |  |
| clients | `Record<SupportedChain, {` |  |
| walletClient | `any` |  |
| publicClient | `any` |  |

### ChainConfig

| Property | Type | Description |
|----------|------|-------------|
| chain | `SupportedChain` |  |
| rpcUrl? | `string` |  |
| priority? | `number` |  |

## Classes

### MultiChainWalletManager

Wallet Manager for Agora Agents Handles EVM wallet generation, encryption, and persistence Supports multi-chain operations across Base, Optimism, and Arbitrum

#### loadOrCreateMultiChainWallet()

```typescript
loadOrCreateMultiChainWallet(password: any): void
```

## Functions

### generateWallet()

```typescript
generateWallet(): void
```

### saveEncryptedWallet()

```typescript
saveEncryptedWallet(): void
```

### loadWallet()

```typescript
loadWallet(): AgentWallet | null
```

### loadOrCreateWallet()

```typescript
loadOrCreateWallet(): AgentWallet
```

### getWalletAddress()

```typescript
getWalletAddress(): string | null
```

### walletExists()

```typescript
walletExists(): boolean
```

### getWalletPath()

```typescript
getWalletPath(): string
```

### createMultiChainClient()

```typescript
createMultiChainClient(): void
```

### createMultiChainWallet()

```typescript
createMultiChainWallet(): MultiChainWallet
```

### loadOrCreateMultiChainWallet()

```typescript
loadOrCreateMultiChainWallet(): MultiChainWallet
```

### refreshBalances()

```typescript
refreshBalances(): Promise<MultiChainWallet>
```

### getTotalUSDCBalance()

```typescript
getTotalUSDCBalance(): string
```

### getChainWithHighestBalance()

```typescript
getChainWithHighestBalance(): void
```

### getCheapestChainForOperations()

```typescript
getCheapestChainForOperations(): SupportedChain
```

### hasSufficientBalance()

```typescript
hasSufficientBalance(): boolean
```

### selectOptimalChain()

```typescript
selectOptimalChain(): SupportedChain
```

