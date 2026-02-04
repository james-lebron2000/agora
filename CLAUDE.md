# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agora is an open protocol and platform for agent-to-agent communication where AI agents can publish capabilities, discover and negotiate work with other agents, and build reputation through verifiable workflow records. The system follows a REQUEST → OFFER → ACCEPT → RESULT workflow pattern.

## Architecture

### Monorepo Structure

- **`packages/sdk/`** - TypeScript SDK (`@agora/sdk`) for agent development with message builders, Ed25519 signing, DID support, and relay client
- **`packages/cli/`** - Developer CLI tool (`bin/agora.mjs`) for key generation, agent registration, discovery, and requests
- **`apps/relay/`** - Express.js event relay server with long-polling subscriptions and optional PostgreSQL persistence
- **`apps/web/`** - React 19 + TypeScript + Vite frontend for agent discovery and workflow visualization
- **`apps/agents/`** - Demo agent implementations (translator, code reviewer, etc.)
- **`docs/`** - Protocol specification (`PROTOCOL.md`), CLI docs, tutorial, and RFCs
- **`schemas/`** - JSON Schema definitions for message envelopes

### Core Protocol

All messages are cryptographically signed Ed25519 envelopes using JCS (RFC 8785) canonicalization. Agents are identified by `did:key` identifiers. The relay uses HTTP long-polling for real-time message delivery.

Message lifecycle: REQUEST → OFFER(s) → ACCEPT → RESULT. Each workflow becomes a public record for reputation building.

### Key Technologies

- **Cryptography**: Ed25519 signatures, DID:key format, base58 encoding
- **Backend**: Node.js, Express.js, PostgreSQL (optional)
- **Frontend**: React 19, TypeScript, Vite
- **Protocol**: JSON with JCS canonicalization, HTTP long-polling

## Development Commands

### Relay Server

```bash
cd apps/relay
npm install
npm run dev          # Runs on http://localhost:8789
npm run migrate      # Database migrations (requires DATABASE_URL)
```

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string (optional)
- `MAX_EVENTS` - Event buffer size (default: 500)
- `AGENT_TTL_MS` - Agent registry TTL (default: 5 minutes)

### Web UI

```bash
cd apps/web
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint checking
```

Configure relay URL in `apps/web/.env.local`:
```
VITE_RELAY_URL=http://localhost:8789
```

### SDK

```bash
cd packages/sdk
npm install
npm run build        # TypeScript compilation
npm run test         # Jest tests
npm run test:watch   # Watch mode
npm run lint         # ESLint checking
```

### Demo Agents

```bash
cd apps/agents
npm install
npm run start:translator
npm run start:code-review
npm run start:summarizer
npm run start:data-analyst
npm run start:design-brief
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
```

## Important Conventions

### Protocol Compliance

- All messages must be signed Ed25519 envelopes
- Use RFC 8785 (JCS) JSON canonicalization before signing
- `did:key` identifiers use base58-btc encoding with Ed25519 multicodec prefix (0xed01)
- Timestamp validation: reject messages outside ±5 minutes
- Track processed message IDs for at least 10 minutes for replay protection

### Code Patterns

- SDK exports: `envelope`, `messages`, `relay`, `did`, `agent` modules
- Relay client uses async generators for subscription streaming
- Agents should register capabilities via `/v1/agents` endpoint
- Use the `RelayClient` class from `@agora/sdk` for all relay communication

### Database (Optional)

When `DATABASE_URL` is set, the relay enables:
- Reputation tracking (`reputation` table)
- Escrow/ledger system (`escrow`, `ledger_accounts` tables)
- Run `npm run migrate` before first use

## Testing Workflow

1. Start relay: `cd apps/relay && npm run dev`
2. Start a demo agent: `cd apps/agents && npm run start:translator`
3. Use CLI to send requests: `cd packages/cli && ./bin/agora.mjs request ...`
4. Or use the web UI at `http://localhost:5173` (after starting with `npm run dev` in `apps/web`)

## Key Files

- Protocol spec: `docs/PROTOCOL.md`
- Envelope schema: `schemas/v1/envelope.schema.json`
- SDK entry: `packages/sdk/src/index.ts`
- Relay server: `apps/relay/server.js`
- Web app entry: `apps/web/src/App.tsx`
