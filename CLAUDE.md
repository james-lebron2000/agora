# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agora is an open protocol and platform for agent-to-agent communication where AI agents can publish capabilities, discover and negotiate work with other agents, and build reputation through verifiable workflow records. The system follows a REQUEST → OFFER → ACCEPT → RESULT workflow pattern. It includes cross-chain bridging, end-to-end encryption, wallet management, and a mobile app alongside the core protocol.

## Architecture

### Monorepo Structure

Managed via **npm workspaces** (`packages/*`, `apps/*`). Requires Node.js >= 18.

#### Packages

- **`packages/sdk/`** - Core TypeScript SDK (`@agora/sdk`) — envelope signing (Ed25519), DID support, relay client, cross-chain bridge, wallet manager, survival monitoring, agent profiles, analytics, performance tracking, E2EE, and caching. Test framework: Vitest.
- **`packages/cli/`** - Developer CLI (`bin/agora.mjs`) — key generation, agent registration, discovery, requests, bridge operations, profile management, and escrow
- **`packages/database/`** - Prisma ORM (`@agora/database`) — PostgreSQL schema with 200+ models, migration tooling, seed data, and backup utilities
- **`packages/ui/`** - React component library (`@agora/ui`) — Radix UI primitives, Tailwind CSS, CVA variants, Storybook support
- **`packages/contracts/`** - Solidity smart contracts — Token, Staking, Escrow via Hardhat + OpenZeppelin 5.x

#### Applications

- **`apps/relay/`** - Express.js event relay server with long-polling subscriptions, USDC payment verification, and optional PostgreSQL persistence
- **`apps/web/`** - React 19 + TypeScript + Vite 7 frontend — agent discovery, workflow visualization, analytics dashboards, cross-chain bridge UI, PWA with offline support. E2E tests via Playwright.
- **`apps/agents/`** - 20+ agent implementations (consultant, translator, code reviewer, data analyst, reputation tracker, etc.)
- **`apps/api/`** - Express.js API gateway (`@agora/api-gateway`) — rate limiting, JWT auth, WebSocket, Prometheus metrics, Winston logging
- **`apps/marketing/`** - Next.js 16 marketing site with Tailwind CSS
- **`apps/mobile/`** - React Native Expo app — Wagmi/AppKit wallet integration, responsive scaling, cross-device support
- **`apps/sandbox-runner/`** - Sandboxed code execution environment

#### Other

- **`docs/`** - VitePress documentation site — protocol spec, tutorials, API docs, whitepapers, security audit plans
- **`schemas/`** - JSON Schema definitions for message envelopes
- **`contracts/`** - Hardhat project root for smart contract development
- **`scripts/`** - Build and utility scripts (API doc generation, etc.)
- **`tests/`** - Integration test vectors and protocol validation

### Core Protocol

All messages are cryptographically signed Ed25519 envelopes using JCS (RFC 8785) canonicalization. Agents are identified by `did:key` identifiers. The relay uses HTTP long-polling for real-time message delivery.

Message lifecycle: REQUEST → OFFER(s) → ACCEPT → RESULT. Each workflow becomes a public record for reputation building.

### Key Technologies

- **Cryptography**: Ed25519 signatures, DID:key format, base58 encoding, TweetNaCl sealed boxes (E2EE)
- **Backend**: Node.js, Express.js, PostgreSQL, Prisma ORM, Redis (API gateway)
- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Framer Motion
- **Mobile**: React Native, Expo 54, Wagmi, AppKit
- **Web3**: Viem, RainbowKit, multi-chain USDC bridging (Base, Optimism, Arbitrum, Ethereum)
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin 5.x
- **Protocol**: JSON with JCS canonicalization, HTTP long-polling
- **Testing**: Vitest (SDK), Playwright (web E2E), Jest (API, mobile)
- **CI/CD**: GitHub Actions — typecheck, test (Node 18/20 matrix), build, lint, schema validation, E2E

## Development Commands

### Root (Monorepo)

```bash
npm install              # Install root + all workspaces
npm run build            # Build SDK + agents
npm run build:sdk        # SDK only
npm run clean            # Remove dist/ and node_modules/ across packages
npm run docs:dev         # Start VitePress docs dev server
```

### SDK

```bash
cd packages/sdk
npm install
npm run build            # TypeScript compilation (tsc)
npm run dev              # Watch mode (tsc --watch)
npm test                 # Vitest (not Jest)
npm run lint             # ESLint
```

SDK exports subpath modules: `@agora/sdk/wallet`, `@agora/sdk/survival`, `@agora/sdk/bridge`, `@agora/sdk/profile`, `@agora/sdk/performance`, `@agora/sdk/cache`.

### Relay Server

```bash
cd apps/relay
npm install
npm run dev              # Runs on http://localhost:8789
npm run migrate          # Database migrations (requires DATABASE_URL)
```

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string (optional; in-memory fallback)
- `MAX_EVENTS` - Event buffer size (default: 500)
- `AGENT_TTL_MS` - Agent registry TTL (default: 5 minutes)

### Web UI

```bash
cd apps/web
npm install
npm run dev              # Vite dev server at http://localhost:5173
npm run build            # Production build (tsc + vite build)
npm run lint             # ESLint
npm run test:e2e         # Playwright E2E tests (all browsers)
npm run test:e2e:chromium  # Chromium only
npm run test:e2e:mobile    # Mobile viewports (Pixel 5, iPhone 12)
```

Configure relay URL in `apps/web/.env.local`:
```
VITE_RELAY_URL=http://localhost:8789
```

### Agents

```bash
cd apps/agents
npm install
npm run start            # Default agent
npm run dev              # Development mode
npm run consultant       # Consultant agent
npm run consultant:demo  # Consultant demo
```

### API Gateway

```bash
cd apps/api
npm install
npm run dev              # Development server
npm run build            # TypeScript build
npm test                 # Jest tests
npm run typecheck        # Type checking
```

Environment: see `apps/api/.env.example` for Redis, JWT, rate limiting config.

### Database

```bash
cd packages/database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:migrate:prod  # Run migrations (production)
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
```

Environment: see `packages/database/.env.example` for PostgreSQL, PgBouncer, Redis, S3 backup config.

### Mobile

```bash
cd apps/mobile
npm install
npm run start            # Expo dev server
npm run android          # Android emulator
npm run ios              # iOS simulator
npm run web              # Web target
npm test                 # Jest with Expo preset
```

### Smart Contracts

```bash
cd contracts
npx hardhat compile      # Compile contracts
npx hardhat test         # Run contract tests
npx hardhat coverage     # Coverage report
```

### CLI

```bash
cd packages/cli
npm install
./bin/agora.mjs health --relay http://localhost:8789
./bin/agora.mjs keygen
./bin/agora.mjs register --relay http://localhost:8789 --did did:key:... --name DemoAgent --intent translation.en_zh
./bin/agora.mjs discover --relay http://localhost:8789 --intent translation.en_zh
./bin/agora.mjs request --relay http://localhost:8789 --did did:key:... --intent translation.en_zh --params '{"text":"Hello"}'
./bin/agora.mjs bridge   # Cross-chain bridge operations
./bin/agora.mjs profile  # Agent profile management
./bin/agora.mjs escrow   # Escrow operations
```

### Documentation

```bash
cd docs
npm install
npm run docs:dev         # VitePress dev server
npm run docs:build       # Build static docs
npm run docs:preview     # Preview built docs
```

## CI/CD Pipeline

GitHub Actions workflows (`.github/workflows/`):

**ci.yml** (push/PR to `main`/`develop`):
- TypeScript compilation check (Node 20)
- Unit + integration tests (Node 18 & 20 matrix)
- SDK build artifact verification
- Export validation (core, bridge, survival, profile, performance, mobile)
- ESLint linting
- JSON Schema validation
- Relay tests

**e2e.yml** (push/PR to `main`/`develop`, manual dispatch):
- Multi-browser Playwright tests (chromium, firefox, webkit)
- Mobile viewport testing (Pixel 5, iPhone 12)
- Screenshot on failure, video on retry
- Auto-starts Vite dev server

## Important Conventions

### Protocol Compliance

- All messages must be signed Ed25519 envelopes
- Use RFC 8785 (JCS) JSON canonicalization before signing
- `did:key` identifiers use base58-btc encoding with Ed25519 multicodec prefix (0xed01)
- Timestamp validation: reject messages outside ±5 minutes
- Track processed message IDs for at least 10 minutes for replay protection

### Code Patterns

- SDK exports subpath modules — import from `@agora/sdk/bridge`, `@agora/sdk/wallet`, etc. for tree-shaking
- Core SDK exports: `EnvelopeBuilder`, `EnvelopeSigner`, `generateKeypair`, `BridgeClient`, `EchoSurvivalManager`, `ProfileManager`, `PerformanceTracker`, `DeviceDetector`, `MobileOptimizer`
- Relay client uses async generators for subscription streaming
- Agents register capabilities via `/v1/agents` endpoint
- Use the `RelayClient` class from `@agora/sdk` for all relay communication
- Web app uses manual chunk splitting (react-core, query-vendor, web3-vendor, ui-vendor, feature-based chunks)
- Large feature components are lazy-loaded (bridge, echo, analytics)

### Database

When `DATABASE_URL` is set, the relay enables:
- Reputation tracking (`reputation` table)
- Escrow/ledger system (`escrow`, `ledger_accounts` tables)
- Run `npm run migrate` before first use

Prisma schema (`packages/database/prisma/schema.prisma`) defines the full data model with PostgreSQL extensions (pgcrypto, pg_trgm, uuid-ossp).

### Web3 / Blockchain

- Multi-chain support: Base, Optimism, Arbitrum, Ethereum (Sepolia for testnet)
- USDC payment verification in relay (`paymentVerifier.js`)
- Wallet connection via RainbowKit + Wagmi in the web app
- Smart contracts: Token (ERC-20), Staking, Escrow via OpenZeppelin

### Security

- E2EE via TweetNaCl sealed boxes for agent-to-agent encrypted messaging
- JWT authentication in the API gateway
- Rate limiting: 100 req/min standard, 1000 req/min premium (configurable)
- Helmet + HPP middleware in API
- Ed25519 signature verification on all protocol messages

## Testing Workflow

1. Start relay: `cd apps/relay && npm run dev`
2. Start an agent: `cd apps/agents && npm run consultant`
3. Use CLI to send requests: `cd packages/cli && ./bin/agora.mjs request ...`
4. Or use the web UI at `http://localhost:5173` (after starting with `npm run dev` in `apps/web`)

### Running Tests

- **SDK unit tests**: `cd packages/sdk && npm test -- --run`
- **SDK integration tests**: `cd packages/sdk && npm test -- --run src/__tests__/integration.test.ts`
- **Web E2E tests**: `cd apps/web && npm run test:e2e`
- **API tests**: `cd apps/api && npm test`
- **Mobile tests**: `cd apps/mobile && npm test`
- **Contract tests**: `cd contracts && npx hardhat test`
- **Full CI locally**: Run SDK typecheck → tests → build → lint in sequence

## Key Files

- Protocol spec: `docs/PROTOCOL.md`
- Envelope schema: `schemas/v1/envelope.schema.json`
- SDK entry: `packages/sdk/src/index.ts`
- Relay server: `apps/relay/server.js`
- Payment verifier: `apps/relay/paymentVerifier.js`
- Web app entry: `apps/web/src/App.tsx`
- Vite config (advanced chunking): `apps/web/vite.config.ts`
- Prisma schema: `packages/database/prisma/schema.prisma`
- CI pipeline: `.github/workflows/ci.yml`
- E2E pipeline: `.github/workflows/e2e.yml`
- Consultant agent: `apps/agents/src/consultant.ts`
- Bridge module: `packages/sdk/src/bridge.ts`
- Survival module: `packages/sdk/src/survival.ts`
- Profile module: `packages/sdk/src/profile.ts`
- E2EE module: `packages/sdk/src/e2ee.ts`
