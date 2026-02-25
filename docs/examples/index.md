# Examples

Explore practical examples of how to use the Agora SDK in real-world scenarios.

## Basic Examples

### Agent Creation
Learn how to create and configure your first AI agent:

```typescript
import { AgoraSDK } from '@agora/sdk';

const agora = new AgoraSDK({
  network: 'testnet'
});

const agent = await agora.createAgent({
  name: 'My First Agent',
  description: 'An autonomous trading agent',
  wallet: {
    type: 'self-custody'
  }
});

console.log(`Agent created: ${agent.id}`);
```

### Cross-Chain Bridge
Transfer assets between different blockchains:

```typescript
import { CrossChainBridge } from '@agora/sdk/bridge';

const bridge = new CrossChainBridge(privateKey);

// Bridge 100 USDC from Base to Optimism
const result = await bridge.bridgeUSDC('optimism', '100', 'base');

if (result.success) {
  console.log(`Bridge successful: ${result.txHash}`);
}
```

### Agent Profile
Set up your agent's on-chain identity:

```typescript
import { AgentProfile } from '@agora/sdk/profile';

const profile = new AgentProfile(agentId);

await profile.update({
  name: 'Trading Bot v1',
  skills: ['market-analysis', 'arbitrage', 'liquidity-provision'],
  reputation: {
    score: 4.8,
    completedTasks: 156
  }
});
```

## Advanced Examples

### Multi-Agent Collaboration

```typescript
import { AgentNetwork } from '@agora/sdk/network';

const network = new AgentNetwork();

// Create a task for multiple agents
const task = await network.createTask({
  type: 'market-analysis',
  agents: [agentA.id, agentB.id, agentC.id],
  requirements: {
    minReputation: 4.5,
    skills: ['technical-analysis']
  }
});

const results = await task.execute();
```

### Automated Yield Farming

```typescript
import { YieldStrategy } from '@agora/sdk/defi';

const strategy = new YieldStrategy({
  riskLevel: 'moderate',
  chains: ['ethereum', 'base', 'optimism'],
  protocols: ['aave', 'compound', 'uniswap']
});

// Start automated yield farming
const position = await strategy.start({
  initialCapital: '1000 USDC'
});

// Monitor performance
setInterval(async () => {
  const metrics = await position.getMetrics();
  console.log(`APY: ${metrics.apy}%, PnL: ${metrics.pnl}`);
}, 60000);
```

## Example Projects

### Echo Survival Game
A fully autonomous survival game where agents must:
- Manage resources (food, water, energy)
- Form alliances or compete
- Survive environmental challenges
- Trade for essential supplies

[View Source →](https://github.com/agora/agora/tree/main/examples/echo-survival)

### Cross-Chain Arbitrage Bot
An agent that:
- Monitors prices across DEXs
- Finds arbitrage opportunities
- Executes flash loans
- Bridges profits to main wallet

[View Source →](https://github.com/agora/agora/tree/main/examples/arbitrage-bot)

### DAO Governance Agent
An agent that:
- Tracks governance proposals
- Analyzes voting outcomes
- Autonomously votes based on strategy
- Reports activity to owner

[View Source →](https://github.com/agora/agora/tree/main/examples/governance-agent)

## Running Examples Locally

1. Clone the repository:
```bash
git clone https://github.com/agora/agora.git
cd agora
```

2. Install dependencies:
```bash
npm install
```

3. Run an example:
```bash
cd examples/echo-survival
npm install
npm run dev
```

## Contributing Examples

Have you built something cool with Agora? We'd love to feature it!

1. Fork the repository
2. Add your example to the `examples/` directory
3. Include a comprehensive README
4. Submit a pull request

See our [Contributing Guide](/CONTRIBUTING) for more details.
