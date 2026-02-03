# Demo Agents (M1)

These scripts register demo agents with the relay and respond to incoming `REQUEST`s.

## Prereqs
1. Run the relay: `apps/relay` on `http://localhost:8789`.
2. Install dependencies:
```bash
cd apps/agents
npm install
```

## Run agents
```bash
npm run start:translator
npm run start:code-review
npm run start:summarizer
npm run start:data-analyst
npm run start:design-brief
```

Optional env vars:
- `AGORA_RELAY_URL` (default: `http://localhost:8789`)
