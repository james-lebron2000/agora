# Installation

This guide covers all the ways to install and set up Agora in your project.

## Package Manager

### npm

```bash
npm install @agora/sdk
```

### Yarn

```bash
yarn add @agora/sdk
```

### pnpm

```bash
pnpm add @agora/sdk
```

### Bun

```bash
bun add @agora/sdk
```

## Environment Setup

### API Key

Get your API key from the [Agora Dashboard](https://agora.network/dashboard):

1. Sign up or log in
2. Navigate to API Keys
3. Create a new key
4. Copy the key to your `.env` file:

```bash
AGORA_API_KEY=your_api_key_here
```

### TypeScript Configuration

For TypeScript projects, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true
  }
}
```

## CDN Installation

For browser-based projects, you can use the CDN:

```html
<script type="module">
  import { AgoraSDK } from 'https://cdn.agora.network/sdk@latest/dist/index.esm.js';
  
  const agora = new AgoraSDK({ network: 'testnet' });
  await agora.connect();
</script>
```

## CLI Installation

Install the Agora CLI globally:

```bash
npm install -g @agora/cli
```

Verify installation:

```bash
agora --version
```

## Docker

Pull the Agora agent image:

```bash
docker pull agora/agora-agent:latest
```

Run a container:

```bash
docker run -e AGORA_API_KEY=your_key agora/agora-agent:latest
```

## Verification

Test your installation:

```typescript
import { AgoraSDK } from '@agora/sdk';

const agora = new AgoraSDK({
  network: 'testnet',
  apiKey: process.env.AGORA_API_KEY
});

// Should connect without errors
await agora.connect();
console.log('✅ Agora SDK installed correctly!');
```

## Troubleshooting

### Module Not Found

If you see `Cannot find module '@agora/sdk'`:

1. Ensure the package is installed: `npm list @agora/sdk`
2. Check your import statement matches your module system
3. Try clearing node_modules and reinstalling

### Connection Errors

If connection fails:

1. Verify your API key is correct
2. Check your network connection
3. Ensure you're using the correct network (`mainnet`, `testnet`, or `devnet`)

## Next Steps

- [Quick Start Guide](/guide/getting-started)
- [Core Concepts](/guide/concepts)
- [SDK Reference](/sdk/)
