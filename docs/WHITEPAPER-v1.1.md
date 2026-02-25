# Agora v1.1 - Auto-Wallet & Consultant Agent

This iteration implements core A2A (Agent-to-Agent) economy features including automatic wallet generation and the Consultant Agent system.

## New Features

### 1. Auto-Wallet Generation (`packages/sdk/src/wallet-manager.ts`)

EVM wallet management for agent identity:

```typescript
import { loadOrCreateWallet } from '@agora/sdk';

// Auto-generates wallet on first boot, loads existing afterwards
const wallet = loadOrCreateWallet();
console.log(`Agent address: ${wallet.address}`);
```

**Features:**
- ✅ Automatic wallet generation using `viem`
- ✅ Encrypted storage in `~/.agora/wallet.json`
- ✅ Password-based encryption (simple XOR for demo, upgradeable)
- ✅ Address export for agent identity

### 2. Consultant Agent (`apps/agents/src/consultant.ts`)

The "Master Agent" that hires specialized workers:

```typescript
import { createConsultantAgent } from './consultant.js';

const consultant = await createConsultantAgent();

// Delegate task to best worker
await consultant.receiveTask({
  id: 'task-001',
  description: 'Translate hello to Spanish',
  capability: 'text-translation',
  budget: 0.01,
  humanClient: 'alice'
});
```

**Features:**
- ✅ Reads `agent-portfolio.json` to find workers
- ✅ Takes 20% margin, pays workers 80%
- ✅ Auto-selects best agent by capability + reliability/price
- ✅ Demonstrates A2A economic interactions

### 3. Agent Portfolio (`apps/agents/src/agent-portfolio.ts`)

Registry of available worker agents:

| Agent | Capabilities | Reliability | Avg Response |
|-------|-------------|-------------|--------------|
| Echo Agent | echo, ping | 99% | 1s |
| Crypto Hunter | token-analysis, wallet-profiling, market-sentiment | 92% | 25s |
| Code Reviewer | security-audit, code-review, optimization | 95% | 2m |
| Polyglot Translator | text-translation, document-translation | 97% | 10s |
| Vision Artist | image-generation, image-variation | 88% | 30s |
| Research Assistant | web-search, deep-research | 90% | 45s |

### 4. Kimi Runner (`kimi-runner.ts`)

Unified agent runtime:

```bash
# Run consultant demo
npm run demo

# Run with specific task
ts-node kimi-runner.ts --agent=consultant --task="Translate hello"

# Run echo agent
ts-node kimi-runner.ts --agent=echo --message="Hello world"
```

## Quick Start

### Installation

```bash
cd agora
npm run install:all
```

### Run Tests

```bash
# Test wallet system
npm run test:wallet

# Run consultant demo
npm run demo
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║     Agora A2A Economy - Consultant Agent Demo              ║
╚════════════════════════════════════════════════════════════╝

[Consultant] Initializing Consultant Agent...

[Wallet] No existing wallet found. Generating new EVM wallet...
[Wallet] New wallet created and saved: 0x...

✅ Agent initialized with wallet: 0x...
   Available workers: 6
   Capabilities: echo, ping, token-analysis, ...

[Consultant] Received task from alice
  Task: Translate "Hello world" to Spanish
  Budget: $0.01 USD
  Consultant margin (20%): $0.0020
  Worker payment (80%): $0.0080

[Consultant] Selected worker: Polyglot Translator
[Consultant] 🤝 Hiring Polyglot Translator for task task-001
[Consultant] 📤 Sending work request to Polyglot Translator
[Polyglot Translator] 🔄 Processing task: Translate "Hello world" to Spanish
[Consultant] ✅ Task completed by Polyglot Translator

╔════════════════════════════════════════════════════════════╗
║                    Final Statistics                        ║
╠════════════════════════════════════════════════════════════╣
║  Tasks Completed: 4                                        ║
║  Success Rate: 100.0%                                      ║
║  Total Revenue: $0.0524                                    ║
║  Total Worker Payouts: $0.2096                             ║
║  Workers in Network: 6                                     ║
╚════════════════════════════════════════════════════════════╝
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Human Client                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ Task Request (budget)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Consultant Agent (Master)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Wallet: 0x... (20% margin)                         │  │
│  │  • Reads agent-portfolio.json                         │  │
│  │  • Selects best worker for capability                 │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Hire Request (80% of budget)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Worker Agent (Specialist)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Echo, Crypto Hunter, Translator, etc.              │  │
│  │  • Executes task                                      │  │
│  │  • Returns result                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
agora/
├── packages/sdk/
│   ├── src/
│   │   ├── wallet-manager.ts    # EVM wallet generation & encryption
│   │   └── index.ts             # SDK exports
│   ├── package.json
│   └── tsconfig.json
├── apps/agents/
│   ├── src/
│   │   ├── consultant.ts        # Master agent implementation
│   │   └── agent-portfolio.ts   # Worker registry
│   ├── package.json
│   └── tsconfig.json
├── kimi-runner.ts               # Agent runtime
├── test-wallet.ts               # Wallet integration tests
└── package.json                 # Root workspace config
```

## Next Steps

1. **Real Agent Integration**: Connect to actual LLM APIs (OpenAI, Kimi, etc.)
2. **Payment Settlement**: Implement actual crypto payments on testnet
3. **Agent Discovery**: P2P network for dynamic agent registration
4. **Reputation System**: Track worker performance on-chain
5. **Multi-Agent Workflows**: Parallel task execution across workers

## Code Standards

- ✅ All comments in English
- ✅ Uses `viem` for blockchain interactions
- ✅ Follows existing codebase patterns
- ✅ Proper error handling with try/catch
- ✅ TypeScript strict mode enabled
- ✅ ES modules (type: "module")