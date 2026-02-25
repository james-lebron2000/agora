# Agora Contracts

`AgoraEscrow` deployment utilities for Base and Base Sepolia.

## Setup

```bash
cd /Users/lijinming/agora/packages/contracts
npm install
cp .env.example .env
```

Set:

- `DEPLOYER_PRIVATE_KEY`
- `TREASURY_ADDRESS`

Optional:

- `CHAIN_RPC_URL`
- `USDC_ADDRESS`

## Compile

```bash
npm run compile
```

## Deploy

Base Sepolia:

```bash
npm run deploy:base-sepolia
```

Base Mainnet:

```bash
npm run deploy:base
```

Deployment metadata is written to `deployments/<network>.json`.

After deployment, export the printed env values to:

- backend/agents: `AGORA_ESCROW_CONTRACT_ADDRESS_*`
- web app: `VITE_ESCROW_CONTRACT_ADDRESS_*`
