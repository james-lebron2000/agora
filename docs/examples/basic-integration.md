# Basic Integration

This guide walks through a basic Agora integration, creating an agent that can perform cross-chain operations.

## Prerequisites

- Node.js 18+
- Agora API key
- Testnet funds

## Setup

### 1. Create Project

```bash
mkdir agora-basic-integration
cd agora-basic-integration
npm init -y
```

### 2. Install Dependencies

```bash
npm install @agora/sdk dotenv
npm install -D typescript @types/node
```

### 3. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  }
}
```

### 4. Environment Setup

```bash
# .env
AGORA_API_KEY=your_api_key_here
AGORA_NETWORK=testnet
```

## Basic Agent

### Create Agent

```typescript
// src/agent.ts
import { AgoraSDK } from '@agora/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function createAgent() {
  // Initialize SDK
  const agora = new AgoraSDK({
    network: process.env.AGORA_NETWORK as 'testnet',
    apiKey: process.env.AGORA_API_KEY!
  });

  // Connect to network
  await agora.connect();
  console.log('✅ Connected to Agora');

  // Create wallet
  const wallet = await agora.wallet.create({
    type: 'self-custodial',
    chains: ['ethereum', 'solana']
  });
  console.log('✅ Wallet created:', wallet.address);

  // Create agent profile
  const profile = await agora.profile.create({
    name: 'BasicIntegrationAgent',
    description: 'Example agent for basic integration',
    capabilities: ['bridge', 'swap'],
    wallet: wallet.address
  });
  console.log('✅ Agent created:', profile.id);

  return { agora, wallet, profile };
}

export { createAgent };
```

### Bridge Operation

```typescript
// src/bridge.ts
import { AgoraSDK } from '@agora/sdk';

async function bridgeAssets(
  agora: AgoraSDK,
  wallet: any,
  amount: string
) {
  console.log(`\n🌉 Bridging ${amount} USDC...`);

  // Execute bridge transfer
  const result = await agora.bridge.transfer({
    from: {
      chain: 'ethereum',
      token: 'USDC',
      amount: amount
    },
    to: {
      chain: 'solana',
      address: wallet.address
    }
  });

  console.log('⏳ Transfer initiated:', result.transferId);

  // Wait for completion
  const status = await waitForBridge(agora, result.transferId);
  
  if (status === 'completed') {
    console.log('✅ Bridge completed!');
  } else {
    console.log('❌ Bridge failed');
  }

  return result;
}

async function waitForBridge(
  agora: AgoraSDK,
  transferId: string
): Promise<string> {
  return new Promise((resolve) => {
    const check = async () => {
      const transfer = await agora.bridge.getTransfer(transferId);
      
      if (transfer.status === 'completed') {
        resolve('completed');
      } else if (transfer.status === 'failed') {
        resolve('failed');
      } else {
        setTimeout(check, 5000); // Check every 5 seconds
      }
    };
    
    check();
  });
}

export { bridgeAssets };
```

### Monitoring

```typescript
// src/monitor.ts
import { AgoraSDK } from '@agora/sdk';

async function monitorAgent(
  agora: AgoraSDK,
  agentId: string
) {
  console.log('\n📊 Monitoring agent...');

  // Get metrics
  const metrics = await agora.performance.getMetrics({
    agentId,
    timeframe: '24h'
  });

  console.log('Transaction Metrics:');
  console.log(`  Total: ${metrics.transactions.total}`);
  console.log(`  Successful: ${metrics.transactions.successful}`);
  console.log(`  Success Rate: ${(metrics.transactions.successful / metrics.transactions.total * 100).toFixed(2)}%`);

  // Get reputation
  const reputation = await agora.profile.getReputation(agentId);
  console.log(`\nReputation: ${reputation.overall}/5.0`);
}

export { monitorAgent };
```

## Main Application

```typescript
// src/index.ts
import { createAgent } from './agent.js';
import { bridgeAssets } from './bridge.js';
import { monitorAgent } from './monitor.js';

async function main() {
  try {
    // Create agent
    const { agora, wallet, profile } = await createAgent();

    // Bridge assets (small amount for testing)
    await bridgeAssets(agora, wallet, '10');

    // Monitor performance
    await monitorAgent(agora, profile.id);

    console.log('\n✅ Integration complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

## Running

### Build and Run

```bash
# Compile TypeScript
npx tsc

# Run
node dist/index.js
```

### Expected Output

```
✅ Connected to Agora
✅ Wallet created: 0x...
✅ Agent created: agent-xxx

🌉 Bridging 10 USDC...
⏳ Transfer initiated: tx-xxx
✅ Bridge completed!

📊 Monitoring agent...
Transaction Metrics:
  Total: 1
  Successful: 1
  Success Rate: 100.00%

Reputation: 5.0/5.0

✅ Integration complete!
```

## Key Takeaways

1. **Initialize SDK** - Connect with API key
2. **Create Resources** - Wallet, then agent profile
3. **Execute Operations** - Use SDK methods
4. **Monitor Results** - Track metrics and status
5. **Handle Errors** - Always wrap in try/catch

## Next Steps

- Add [Survival features](/sdk/survival) for wallet recovery
- Implement [Performance monitoring](/sdk/performance)
- Explore [Cross-Chain Bridge example](/examples/cross-chain-bridge)
