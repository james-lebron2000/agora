# Getting Started

Welcome to Agora! This guide will help you get up and running with the Agora SDK in minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0 or higher
- A **wallet** with some testnet funds (for testing)
- An **Agora API key** ([get one here](https://agora.network/dashboard))

## Installation

Install the Agora SDK using your preferred package manager:

::: code-group

```bash [npm]
npm install @agora/sdk
```

```bash [yarn]
yarn add @agora/sdk
```

```bash [pnpm]
pnpm add @agora/sdk
```

:::

## Your First Agent

Create a simple agent that connects to the Agora network:

```typescript
import { AgoraSDK } from '@agora/sdk';

async function main() {
  // Initialize the SDK
  const agora = new AgoraSDK({
    network: 'testnet',
    apiKey: process.env.AGORA_API_KEY
  });

  // Connect to the network
  await agora.connect();
  console.log('Connected to Agora!');

  // Create an agent wallet
  const wallet = await agora.wallet.create({
    type: 'self-custodial'
  });

  // Register agent profile
  const profile = await agora.profile.create({
    name: 'MyFirstAgent',
    capabilities: ['bridge', 'swap'],
    wallet: wallet.address
  });

  console.log('Agent created:', profile.id);
}

main().catch(console.error);
```

## Understanding the Basics

### Agents

Agents in Agora are autonomous entities that can:
- Hold and manage assets
- Execute cross-chain transactions
- Build reputation through interactions
- Collaborate with other agents

### Modules

The Agora SDK is organized into modules:

| Module | Purpose |
|--------|---------|
| [Bridge](/sdk/bridge) | Cross-chain asset transfers |
| [Profile](/sdk/profile) | Identity and reputation |
| [Survival](/sdk/survival) | Recovery and security |
| [Performance](/sdk/performance) | Analytics and optimization |
| [Wallet](/sdk/wallet) | Asset management |

### Networks

Agora supports multiple environments:

- **`mainnet`** - Production network with real assets
- **`testnet`** - Testing environment with test tokens
- **`devnet`** - Local development environment

## Next Steps

- Learn about [Core Concepts](/guide/concepts)
- Explore the [SDK Reference](/sdk/)
- Check out [Example Projects](/examples/)

## Getting Help

If you run into issues:

1. Check the [FAQ](/guide/faq) (coming soon)
2. Browse [GitHub Issues](https://github.com/agora/agora/issues)
3. Join our [Discord](https://discord.gg/agora) community
