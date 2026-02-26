# Cross-Chain Bridge Module

The Cross-Chain Bridge module provides comprehensive functionality for bridging assets across Ethereum Layer 2 networks using LayerZero V2 OFT (Omnichain Fungible Token) protocol.

## Features

- **Multi-Chain Support**: Bridge between Base, Optimism, Arbitrum, and Ethereum
- **Multi-Token Support**: USDC, USDT, DAI, WETH
- **Real-Time Monitoring**: WebSocket support for live transaction tracking
- **Robust Error Handling**: Detailed error codes with retry mechanisms
- **Transaction History**: Persistent transaction tracking with localStorage
- **Gas Estimation**: Comprehensive fee estimation with network condition awareness

## Installation

```typescript
import { CrossChainBridge, BridgeError, BridgeWebSocketManager } from '@agora/sdk/bridge';
```

## Quick Start

### Basic Bridge Usage

```typescript
import { CrossChainBridge } from '@agora/sdk/bridge';

const privateKey = '0x...'; // Your private key
const bridge = new CrossChainBridge(privateKey, 'base');

// Listen for events
bridge.on('transactionSent', (tx) => {
  console.log('Transaction sent:', tx.txHash);
});

bridge.on('transactionConfirmed', (tx) => {
  console.log('Transaction confirmed:', tx.txHash);
});

// Bridge USDC from Base to Optimism
const result = await bridge.bridgeUSDC('optimism', '100');

if (result.success) {
  console.log('Bridge successful:', result.txHash);
} else {
  console.error('Bridge failed:', result.error);
}
```

### Bridge Any Supported Token

```typescript
// Bridge USDT
const result = await bridge.bridgeToken('optimism', 'USDT', '100');

// Bridge DAI
const result = await bridge.bridgeToken('arbitrum', 'DAI', '50');

// Bridge WETH
const result = await bridge.bridgeToken('base', 'WETH', '1');
```

## API Reference

### CrossChainBridge Class

#### Constructor

```typescript
constructor(
  privateKey: Hex,
  defaultChain: SupportedChain = 'base',
  logger?: BridgeLogger
)
```

**Parameters:**
- `privateKey`: Private key for signing transactions
- `defaultChain`: Default source chain ('base' | 'optimism' | 'arbitrum' | 'ethereum')
- `logger`: Optional custom logger

#### Methods

##### `getQuote(destinationChain, token, amount, sourceChain?)`

Get a bridge quote with fee estimates.

```typescript
const quote = await bridge.getQuote('optimism', 'USDC', '100');
console.log(`Estimated fee: ${quote.estimatedFee} ETH`);
console.log(`Estimated time: ${quote.estimatedTime} seconds`);
```

##### `estimateFee(destinationChain, token, amount, sourceChain?)`

Get detailed fee estimation.

```typescript
const estimate = await bridge.estimateFee('optimism', 'USDC', '100');
console.log(`Total fee: ${estimate.totalFeeUSD} USD`);
console.log(`Gas estimate: ${estimate.gasEstimate} units`);
console.log(`Breakdown:`, estimate.breakdown);
```

##### `bridgeUSDC(destinationChain, amount, sourceChain?)`

Bridge USDC between chains.

```typescript
const result = await bridge.bridgeUSDC('optimism', '100');
```

**Returns:** `BridgeResult`
- `success`: boolean
- `txHash`: Transaction hash (if successful)
- `error`: Error message (if failed)
- `fees`: Fee details

##### `bridgeToken(destinationChain, token, amount, sourceChain?)`

Bridge any supported token.

```typescript
const result = await bridge.bridgeToken('optimism', 'USDT', '100');
```

##### `monitorTransaction(txHash, sourceChain, destinationChain, amount, options?)`

Monitor a bridge transaction from source to destination.

```typescript
const status = await bridge.monitorTransaction(
  result.txHash!,
  'base',
  'optimism',
  '100',
  {
    onStatusUpdate: (status) => {
      console.log(`Progress: ${status.progress}%`);
      console.log(`Stage: ${status.stage}`);
    }
  }
);
```

##### `getTokenBalance(token, chain?)`

Get balance for a specific token.

```typescript
const balance = await bridge.getTokenBalance('USDC', 'base');
console.log(`USDC Balance: ${balance}`);
```

##### `getAllTokenBalances()`

Get all token balances across all chains.

```typescript
const balances = await bridge.getAllTokenBalances();
console.log(balances.base.USDC); // USDC balance on Base
console.log(balances.optimism.WETH); // WETH balance on Optimism
```

##### `getTransactionHistory(filter?)`

Get transaction history with optional filters.

```typescript
// Get all transactions
const history = bridge.getTransactionHistory();

// Filter by chain
const baseTxs = bridge.getTransactionHistory({ chain: 'base' });

// Filter by status
const pendingTxs = bridge.getTransactionHistory({ status: 'pending' });

// Combined filters
const filtered = bridge.getTransactionHistory({
  chain: 'base',
  status: 'completed',
  startTime: Date.now() - 86400000 // Last 24 hours
});
```

#### Events

The `CrossChainBridge` class extends `EventEmitter` and emits the following events:

| Event | Description | Data Type |
|-------|-------------|-----------|
| `quoteReceived` | Quote received | `BridgeQuoteEvent` |
| `feeEstimated` | Fee estimated | `BridgeFeeEvent` |
| `approvalRequired` | Token approval needed | `BridgeEventData` |
| `approvalConfirmed` | Token approval confirmed | `BridgeEventData` |
| `transactionSent` | Transaction submitted | `BridgeTransactionEvent` |
| `transactionConfirmed` | Transaction confirmed | `BridgeTransactionEvent` |
| `transactionFailed` | Transaction failed | `BridgeErrorEvent` |
| `balanceInsufficient` | Insufficient balance | `BridgeEventData` |
| `monitorStatusUpdate` | Monitor status update | `BridgeTransactionStatusDetails` |
| `monitorCompleted` | Monitoring completed | `BridgeTransactionStatusDetails` |
| `monitorFailed` | Monitoring failed | `BridgeMonitoringFailedEvent` |

```typescript
bridge.on('transactionSent', (data) => {
  console.log(`Transaction sent: ${data.txHash}`);
});

bridge.on('transactionFailed', (data) => {
  console.error(`Transaction failed: ${data.error}`);
});
```

### BridgeWebSocketManager Class

Real-time WebSocket connection for transaction monitoring.

#### Constructor

```typescript
constructor(url: string, logger?: BridgeLogger)
```

#### Methods

##### `connect()`

Connect to WebSocket server.

```typescript
const wsManager = new BridgeWebSocketManager('wss://api.example.com/bridge');
await wsManager.connect();
```

##### `disconnect()`

Disconnect from WebSocket server.

```typescript
wsManager.disconnect();
```

##### `subscribe(options)`

Subscribe to transaction updates.

```typescript
wsManager.subscribe({
  txHash: '0x...',
  sourceChain: 'base',
  destinationChain: 'optimism'
});
```

##### `unsubscribe(options)`

Unsubscribe from updates.

```typescript
wsManager.unsubscribe({ txHash: '0x...' });
```

#### Events

| Event | Description |
|-------|-------------|
| `connected` | WebSocket connected |
| `disconnected` | WebSocket disconnected |
| `stateChange` | Connection state changed |
| `transactionUpdate` | Transaction update received |
| `serverError` | Server error received |
| `error` | WebSocket error |

```typescript
wsManager.on('transactionUpdate', (data) => {
  console.log(`Progress: ${data.progress}%`);
  console.log(`Status: ${data.status}`);
});

wsManager.on('stateChange', (state) => {
  console.log(`WebSocket state: ${state}`);
});
```

### BridgeError Class

Custom error class with error codes.

```typescript
try {
  await bridge.bridgeUSDC('optimism', '100');
} catch (error) {
  if (error instanceof BridgeError) {
    console.log(`Error code: ${error.code}`);
    console.log(`Retryable: ${error.isRetryable()}`);
    console.log(`Chain: ${error.chain}`);
    console.log(`Transaction: ${error.txHash}`);
  }
}
```

#### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INSUFFICIENT_BALANCE` | Insufficient token balance | No |
| `INSUFFICIENT_ALLOWANCE` | Token approval needed | No |
| `INVALID_PARAMS` | Invalid parameters | No |
| `NETWORK_ERROR` | Network connection error | Yes |
| `TRANSACTION_FAILED` | Transaction execution failed | No |
| `TRANSACTION_TIMEOUT` | Transaction timed out | Yes |
| `MESSAGE_VERIFICATION_FAILED` | LayerZero message verification failed | Yes |
| `DESTINATION_TX_FAILED` | Destination chain transaction failed | No |
| `RPC_ERROR` | RPC endpoint error | Yes |
| `UNKNOWN_ERROR` | Unknown error | Yes |

### Utility Functions

#### `getBridgeQuote(params, senderAddress)`

Get bridge quote without instantiating a class.

```typescript
import { getBridgeQuote } from '@agora/sdk/bridge';

const quote = await getBridgeQuote({
  sourceChain: 'base',
  destinationChain: 'optimism',
  token: 'USDC',
  amount: '100'
}, senderAddress);
```

#### `estimateBridgeFee(params)`

Estimate bridge fees.

```typescript
import { estimateBridgeFee } from '@agora/sdk/bridge';

const estimate = await estimateBridgeFee({
  sourceChain: 'base',
  destinationChain: 'optimism',
  token: 'USDC',
  amount: '100',
  senderAddress: '0x...'
});
```

#### `getTokenBalance(address, chain, token)`

Get token balance for any address.

```typescript
import { getTokenBalance } from '@agora/sdk/bridge';

const balance = await getTokenBalance(address, 'base', 'USDC');
```

#### `findCheapestChain(operation, excludeChains?)`

Find the cheapest chain for an operation.

```typescript
import { findCheapestChain } from '@agora/sdk/bridge';

const cheapest = await findCheapestChain('send');
console.log(`Cheapest chain: ${cheapest.chain}`);
console.log(`Estimated cost: ${cheapest.estimatedCost}`);
```

## Transaction Monitoring

### Using BridgeTransactionMonitor

```typescript
import { BridgeTransactionMonitor } from '@agora/sdk/bridge';

const monitor = new BridgeTransactionMonitor('base');

monitor.on('statusUpdate', (status) => {
  console.log(`Stage: ${status.stage}`);
  console.log(`Progress: ${status.progress}%`);
  console.log(`Confirmations: ${status.sourceConfirmations}`);
});

const status = await monitor.monitorTransaction(
  '0x...', // txHash
  'base',
  'optimism',
  '100'
);

if (status.status === 'completed') {
  console.log('Bridge completed successfully!');
}
```

### Transaction Status Stages

| Stage | Description | Progress Range |
|-------|-------------|----------------|
| `source` | Waiting for source chain confirmation | 0-33% |
| `cross_chain` | LayerZero message delivery | 33-66% |
| `destination` | Destination chain confirmation | 66-100% |

## Transaction History

### Using BridgeTransactionHistory

```typescript
import { BridgeTransactionHistory } from '@agora/sdk/bridge';

const history = new BridgeTransactionHistory(address);

// Add transaction
history.addTransaction({
  txHash: '0x...',
  sourceChain: 'base',
  destinationChain: 'optimism',
  amount: '100',
  token: 'USDC',
  status: 'pending',
  timestamp: Date.now(),
  senderAddress: address,
  recipientAddress: address
});

// Get pending transactions
const pending = history.getPendingTransactions();

// Update status
history.updateTransactionStatus('0x...', 'completed');

// Clear all history
history.clearHistory();
```

## Supported Chains and Tokens

### Chains

- **Ethereum** (mainnet)
- **Base**
- **Optimism**
- **Arbitrum**

### Tokens

- **USDC** (6 decimals)
- **USDT** (6 decimals)
- **DAI** (18 decimals)
- **WETH** (18 decimals)

### Estimated Bridge Times

| Route | Estimated Time |
|-------|---------------|
| Base ↔ Optimism | ~60 seconds |
| Base ↔ Arbitrum | ~60 seconds |
| Optimism ↔ Arbitrum | ~60 seconds |
| Ethereum → L2 | ~5 minutes |
| L2 → Ethereum | ~15 minutes |

## Error Handling

The bridge module provides comprehensive error handling with automatic retries for transient errors.

### Retry Logic

The following errors trigger automatic retries with exponential backoff:
- Network errors
- RPC errors
- Transaction timeouts
- Message verification failures

```typescript
// Configure max retries (default: 3)
const bridge = new CrossChainBridge(privateKey, 'base');

// Retryable errors are automatically retried
const result = await bridge.bridgeUSDC('optimism', '100');
```

### Custom Logger

```typescript
const customLogger = {
  debug: (msg, meta) => console.debug(`[Custom] ${msg}`, meta),
  info: (msg, meta) => console.info(`[Custom] ${msg}`, meta),
  warn: (msg, meta) => console.warn(`[Custom] ${msg}`, meta),
  error: (msg, meta) => console.error(`[Custom] ${msg}`, meta)
};

const bridge = new CrossChainBridge(privateKey, 'base', customLogger);
```

## Examples

### Complete Bridge Flow with Monitoring

```typescript
import { CrossChainBridge, BridgeWebSocketManager } from '@agora/sdk/bridge';

async function bridgeWithMonitoring() {
  const bridge = new CrossChainBridge(privateKey, 'base');
  
  // Get quote first
  const quote = await bridge.getQuote('optimism', 'USDC', '100');
  console.log(`Fee: ${quote.estimatedFee} ETH`);
  
  // Execute bridge
  const result = await bridge.bridgeUSDC('optimism', '100');
  
  if (!result.success) {
    console.error('Bridge failed:', result.error);
    return;
  }
  
  console.log('Transaction sent:', result.txHash);
  
  // Monitor the transaction
  const status = await bridge.monitorTransaction(
    result.txHash!,
    'base',
    'optimism',
    '100',
    {
      onStatusUpdate: (status) => {
        console.log(`Progress: ${status.progress}% - Stage: ${status.stage}`);
      }
    }
  );
  
  if (status.status === 'completed') {
    console.log('Bridge completed successfully!');
  }
}
```

### WebSocket Real-Time Updates

```typescript
const wsManager = new BridgeWebSocketManager('wss://api.example.com/bridge');

wsManager.on('transactionUpdate', (data) => {
  console.log(`Transaction ${data.txHash}:`);
  console.log(`  Status: ${data.status}`);
  console.log(`  Progress: ${data.progress}%`);
  console.log(`  Confirmations: ${data.confirmations}`);
});

await wsManager.connect();

wsManager.subscribe({
  txHash: '0x...',
  sourceChain: 'base',
  destinationChain: 'optimism'
});
```

### Multi-Token Bridge

```typescript
async function rebalancePortfolio() {
  const bridge = new CrossChainBridge(privateKey, 'base');
  
  const tokens = [
    { token: 'USDC', amount: '100' },
    { token: 'USDT', amount: '50' },
    { token: 'DAI', amount: '75' }
  ];
  
  for (const { token, amount } of tokens) {
    try {
      const result = await bridge.bridgeToken('optimism', token as any, amount);
      if (result.success) {
        console.log(`${token} bridge successful: ${result.txHash}`);
      } else {
        console.error(`${token} bridge failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error bridging ${token}:`, error);
    }
  }
}
```

## Best Practices

1. **Always check quotes first**: Get a quote before bridging to ensure fees are acceptable
2. **Monitor transactions**: Use monitoring to track bridge progress
3. **Handle errors**: Implement proper error handling for production use
4. **Use WebSocket for real-time updates**: For the best user experience
5. **Check balances**: Ensure sufficient balance for both tokens and gas fees
6. **Set appropriate timeouts**: Default timeouts are 2-5 minutes per stage

## License

MIT
