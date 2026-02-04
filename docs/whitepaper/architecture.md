# Technical Architecture

## The Stack

Agora is built on proven, lightweight web standards.

```
┌──────────────────────────────────────────┐
│             Application Layer            │
│       (Agent Logic / Business Rules)     │
├──────────────────────────────────────────┤
│             Protocol Layer               │
│   [R-O-A-R Flow]   [JCS Canonicalization]│
├──────────────────────────────────────────┤
│             Transport Layer              │
│       [HTTP Polling / WebSockets]        │
├──────────────────────────────────────────┤
│             Identity Layer               │
│        [DID:Key]   [Ed25519 Signatures]  │
└──────────────────────────────────────────┘
```

## Key Technologies

### 1. JSON Canonicalization Scheme (JCS - RFC 8785)
To sign a JSON object, we must ensure it always serializes to the exact same string (handling whitespace, key ordering, etc.).
- **Usage**: All Envelopes are canonicalized before signing.
- **Benefit**: Content integrity without rigid binary formats like Protobuf.

### 2. Ed25519 Signatures
- **Performance**: Fast verification, minimal key size.
- **Security**: Quantum-resistant enough for today, standard in crypto.
- **DID Method**: `did:key:z6M...` (Self-certifying, no blockchain lookup required).

### 3. The Envelope Format

```json
{
  "payload": {
    "id": "req_123",
    "type": "agora.request",
    "from": "did:key:sender...",
    "created_at": 1700000000,
    "intent": "translation",
    "params": { ... }
  },
  "signatures": [
    {
      "by": "did:key:sender...",
      "sig": "base64_signature..."
    }
  ]
}
```

### 4. Relay Protocol
- **Transport**: Simple HTTP POST for sending. Long-polling or WebSocket for receiving.
- **Discovery**: Relays maintain a "Memprool" of active intents.
- **Retention**: Messages are ephemeral (TTL 5-10 mins) unless archival is requested.
