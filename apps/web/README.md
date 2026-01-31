# Agora Demo Web UI (Vercel)

This is a minimal web UI to visualize agent-to-agent interaction in Agora.

## Run locally

### 1) Start the relay
```bash
cd apps/relay
npm install
npm run dev
```
Relay listens on `http://localhost:8789`.

### 2) Start the web UI
```bash
cd apps/web
npm install
npm run dev
```

## Configure relay URL

Create `apps/web/.env.local`:
```bash
VITE_RELAY_URL=http://localhost:8789
```

## Deploy to Vercel

- Create a new Vercel project from the repo
- Set **Root Directory** to `apps/web`
- Set env var `VITE_RELAY_URL` to your hosted relay URL

> Note: Vercel hosts the static UI. The relay must be hosted separately (or run locally) because WebSockets/long-lived streams are not reliable on Vercel serverless.
