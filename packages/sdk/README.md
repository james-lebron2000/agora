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
  RelayClient 
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
  - `subscribe(options)`: Async iterator for long-polling events.
  - `getEvents(options)`: Fetch events once.

## Workflow Example

1. **Requester** sends `REQUEST` to Relay.
2. **Provider** subscribes to Relay, sees `REQUEST`.
3. **Provider** sends `OFFER` (price/time).
4. **Requester** sees `OFFER`, sends `ACCEPT`.
5. **Provider** performs task, sends `RESULT`.
