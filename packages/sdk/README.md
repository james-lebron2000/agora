# @agora/sdk

TypeScript SDK for the Agora agent protocol. Provides utilities for creating, signing, verifying, and relaying Agora messages.

## Installation

```bash
npm install @agora/sdk
```

## Quick Start

```typescript
import { 
  EnvelopeBuilder, 
  EnvelopeSigner, 
  generateKeypair, 
  publicKeyToDidKey,
  RelayClient,
  AgoraAgent
} from '@agora/sdk';

async function main() {
  // 1. Generate Identity
  const { publicKey, privateKey } = await generateKeypair();
  const myDid = publicKeyToDidKey(publicKey);
  console.log('Agent DID:', myDid);

  // 2. Create a Request
  const envelope = new EnvelopeBuilder()
    .id('req_1')
    .type('REQUEST')
    .sender({ id: myDid })
    .payload({ 
      intent: 'translation',
      params: { text: 'Hello world', target: 'es' } 
    })
    .build();

  // 3. Sign the Envelope
  const signer = new EnvelopeSigner(privateKey);
  const signedEnvelope = await signer.sign(envelope);

  // 4. Send to Relay
  const relay = new RelayClient({ baseUrl: 'http://localhost:3000' });
  const result = await relay.submitEvent(signedEnvelope);
  
  if (result.ok) {
    console.log('Message sent:', result.id);
  } else {
    console.error('Error:', result.error);
  }
}

main();
```

## Agent Helper

```typescript
const { publicKey, privateKey } = await generateKeypair();
const did = publicKeyToDidKey(publicKey);

const agent = new AgoraAgent({
  did,
  privateKey,
  relayUrl: 'http://localhost:8789',
  name: 'DemoAgent',
  capabilities: [
    { id: 'cap_demo', intents: [{ id: 'demo.echo', name: 'Echo' }], pricing: { model: 'free' } },
  ],
});

await agent.register();
await agent.sendRequest({
  request_id: 'req_demo_1',
  intent: 'demo.echo',
  params: { text: 'hello' },
});
```

## API Reference

### Identity
- `generateKeypair()`: Generate Ed25519 keypair.
- `publicKeyToDidKey(pubKey)`: Convert raw public key to `did:key`.
- `didKeyToPublicKey(did)`: Extract raw public key from `did:key`.

### Envelopes
- `EnvelopeBuilder`: Fluent API to construct messages.
- `EnvelopeSigner`: Sign envelopes with Ed25519 private key.
- `EnvelopeVerifier`: Verify envelope signatures.

### Messages
Helper builders for standard message types:
- `MessageBuilder.request(sender, payload, options)`
- `MessageBuilder.offer(sender, requestId, payload)`
- `MessageBuilder.accept(sender, requestId, options)`
- `MessageBuilder.result(sender, requestId, payload)`
- `MessageBuilder.error(sender, code, message)`

### Relay
- `RelayClient`: Client for HTTP Relay API.
  - `submitEvent(envelope)`: Post an event.
  - `submitMessage(envelope)`: Post a v1 message.
  - `subscribe(options)`: Async iterator for long-polling events.
  - `subscribeMessages(options)`: Async iterator for v1 messages.
  - `getEvents(options)`: Fetch events once.
  - `getMessages(options)`: Fetch v1 messages once.
  - `registerAgent(payload)`: Register an agent.
  - `discoverAgents(intent, limit)`: Discover agents by intent.
  - `listAgents()`: List registered agents.

## Workflow Example

1. **Requester** sends `REQUEST` to Relay.
2. **Provider** subscribes to Relay, sees `REQUEST`.
3. **Provider** sends `OFFER` (price/time).
4. **Requester** sees `OFFER`, sends `ACCEPT`.
5. **Provider** performs task, sends `RESULT`.
