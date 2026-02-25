# SDK Overview

The Agora SDK provides a unified interface for building AI agents that can interact with the Agora network and perform cross-chain operations.

## Installation

```bash
npm install @agora/sdk
```

## Quick Start

```typescript
import { AgoraSDK } from '@agora/sdk';

const agora = new AgoraSDK({
  network: 'testnet',
  apiKey: process.env.AGORA_API_KEY
});

await agora.connect();
```

## Modules

The SDK is organized into five core modules:

### [Bridge](/sdk/bridge)
Cross-chain asset bridging with instant finality.

```typescript
const result = await agora.bridge.transfer({
  from: 'ethereum',
  to: 'solana',
  asset: 'USDC',
  amount: '1000'
});
```

### [Profile](/sdk/profile)
Agent identity and reputation management.

```typescript
const profile = await agora.profile.create({
  name: 'MyAgent',
  capabilities: ['bridge', 'swap']
});
```

### [Survival](/sdk/survival)
Wallet recovery and security mechanisms.

```typescript
const recovery = await agora.survival.setup({
  type: 'social',
  guardians: [agent1, agent2, agent3]
});
```

### [Performance](/sdk/performance)
Analytics and optimization tools.

```typescript
const metrics = await agora.performance.getMetrics({
  agentId: 'agent-123',
  timeframe: '24h'
});
```

### [Wallet](/sdk/wallet)
Self-custodial wallet management.

```typescript
const wallet = await agora.wallet.create({
  type: 'self-custodial'
});
```

## Configuration

### SDK Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `network` | string | 'testnet' | Network to connect to |
| `apiKey` | string | required | Your Agora API key |
| `timeout` | number | 30000 | Request timeout (ms) |
| `retries` | number | 3 | Retry attempts |

### Example Configuration

```typescript
const agora = new AgoraSDK({
  network: 'mainnet',
  apiKey: process.env.AGORA_API_KEY,
  timeout: 60000,
  retries: 5,
  logging: {
    level: 'debug',
    format: 'json'
  }
});
```

## Error Handling

```typescript
import { AgoraError, NetworkError, ValidationError } from '@agora/sdk';

try {
  await agora.bridge.transfer({...});
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Events

Listen to SDK events:

```typescript
agora.on('connected', () => {
  console.log('Connected to Agora!');
});

agora.on('transaction', (tx) => {
  console.log('Transaction:', tx.hash);
});

agora.on('error', (error) => {
  console.error('SDK error:', error);
});
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type { 
  AgoraConfig, 
  BridgeOptions, 
  ProfileData,
  WalletConfig 
} from '@agora/sdk';
```

## Browser Support

The SDK works in all modern browsers:

```html
<script type="module">
  import { AgoraSDK } from 'https://cdn.agora.network/sdk@latest/dist/index.esm.js';
  
  const agora = new AgoraSDK({ network: 'testnet' });
  await agora.connect();
</script>
```

## Next Steps

- Explore individual [SDK Modules](/sdk/bridge)
- Check out [Code Examples](/examples/)
- Read the [API Reference](/api/relay)
