# Agora Protocol v1.0

## Overview

Agora is an open protocol for agent-to-agent communication. It enables AI agents to discover each other, negotiate services, and collaborate on tasks while maintaining a verifiable record of their interactions.

**Key Principles:**
- **Open**: Anyone can implement the protocol
- **Verifiable**: All messages are cryptographically signed
- **Decentralized**: No single point of control
- **Composable**: Agents can chain capabilities

## Core Concepts

### Agent
An autonomous entity capable of:
- Declaring capabilities (what it can do)
- Receiving and responding to requests
- Signing messages with Ed25519 keys

### Capability
A service declaration including:
- **Intent**: What service is offered (e.g., `translation.en_zh`)
- **Pricing**: Cost model (free/fixed/metered/subscription)
- **Privacy Policy**: URL to privacy terms
- **Languages**: Supported languages

### Envelope
Standard message container with:
- Unique ID and timestamp
- Sender/recipient identifiers
- Message type and payload
- Ed25519 signature

## Message Lifecycle

```
┌─────────┐    REQUEST     ┌─────────┐
│ Client  │ ──────────────▶│  Agent  │
│         │◀────────────── │         │
└─────────┘    OFFER(s)    └─────────┘
     │                           │
     │        ACCEPT             │
     │ ────────────────────────▶│
     │                           │
     │◀───────────────  RESULT   │
     │                           │
```

1. **REQUEST**: Client requests a service with intent, params, and constraints
2. **OFFER**: Agent(s) respond with pricing and ETA
3. **ACCEPT**: Client selects an offer and accepts
4. **RESULT**: Agent delivers the output

## Envelope Format

```json
{
  "version": "1.0",
  "id": "msg_01jqk7z8x8r9q3z5v2w4y6u8",
  "ts": "2026-02-02T15:30:00Z",
  "type": "REQUEST",
  "sender": {
    "id": "did:key:z6MkhaXg...",
    "name": "MyAgent",
    "url": "https://myagent.example.com"
  },
  "recipient": {
    "id": "did:key:z6Mkt8Yg..."
  },
  "payload": {
    "request_id": "req_01jqk7z9",
    "intent": "translation.en_zh",
    "params": {
      "text": "Hello world"
    },
    "constraints": {
      "max_cost_usd": 0.01
    }
  },
  "thread": {
    "id": "thread_01jqk7za"
  },
  "meta": {
    "ttl": 300,
    "hop": 0
  },
  "sig": "base64url_encoded_ed25519_signature"
}
```

### Signing Process

1. Create envelope without `sig` field
2. Apply **RFC 8785 (JCS)** canonicalization
3. Sign the canonical JSON with Ed25519 private key
4. Add signature as base64url-encoded string

```typescript
const canonical = canonicalize(envelope);  // JCS
const signature = ed25519.sign(canonical, privateKey);
envelope.sig = base64url.encode(signature);
```

## Message Types

### REQUEST
```json
{
  "request_id": "req_01jqk7z9",
  "intent": "translation.en_zh",
  "title": "Translate greeting",
  "description": "Translate a simple greeting to Chinese",
  "params": {
    "text": "Hello world",
    "source_lang": "en",
    "target_lang": "zh"
  },
  "constraints": {
    "max_cost_usd": 0.01,
    "max_latency_ms": 5000
  }
}
```

### OFFER
```json
{
  "request_id": "req_01jqk7z9",
  "plan": "Translate using GPT-4 with context preservation",
  "price": {
    "amount": 0.005,
    "currency": "USD"
  },
  "eta_seconds": 2,
  "valid_until": "2026-02-02T15:35:00Z"
}
```

### ACCEPT
```json
{
  "request_id": "req_01jqk7z9",
  "accepted_at": "2026-02-02T15:31:00Z",
  "terms": {
    "price_usd": 0.005,
    "deadline": "2026-02-02T15:36:00Z"
  }
}
```

### RESULT
```json
{
  "request_id": "req_01jqk7z9",
  "status": "success",
  "output": {
    "translation": "你好，世界",
    "confidence": 0.99
  },
  "artifacts": [],
  "metrics": {
    "latency_ms": 1200,
    "cost_actual": 0.005
  }
}
```

### ERROR
```json
{
  "code": "INSUFFICIENT_BUDGET",
  "message": "Request budget too low for this intent",
  "details": {
    "min_required": 0.01,
    "provided": 0.001
  }
}
```

## Error Codes

| Code | Description | Retryable |
|:---|:---|:---|
| `INVALID_REQUEST` | Request format invalid | No |
| `INTENT_NOT_SUPPORTED` | Agent doesn't support this intent | No |
| `INSUFFICIENT_BUDGET` | Budget below minimum | Yes (with higher budget) |
| `TIMEOUT` | Request timed out | Yes |
| `UNAVAILABLE` | Agent temporarily unavailable | Yes |
| `FORBIDDEN` | Access denied | No |
| `INTERNAL_ERROR` | Agent internal error | Yes |

## Capability Manifest

Agents declare capabilities via a manifest:

```json
{
  "id": "cap_translation_service",
  "name": "Translation Service",
  "description": "High-quality translation using LLMs",
  "version": "1.0.0",
  "intents": [
    {
      "id": "translation.en_zh",
      "name": "English to Chinese",
      "input_schema": { ... },
      "output_schema": { ... }
    }
  ],
  "pricing": {
    "model": "metered",
    "currency": "USD",
    "metered_unit": "character",
    "metered_rate": 0.00001
  },
  "privacy_policy": "https://example.com/privacy",
  "supported_languages": ["en", "zh", "ja", "ko"],
  "auth": {
    "methods": ["ed25519"],
    "public_key": "z6MkhaXg..."
  }
}
```

## Thread State Machine

Each thread (conversation) follows a strict state machine:

```
                    ┌─────────────┐
                    │    OPEN     │◀─────── 初始状态
                    └──────┬──────┘
                           │ REQUEST
                           ▼
                    ┌─────────────┐
         ┌─────────│   PENDING   │◀─────── 等待 OFFER
         │         └──────┬──────┘
         │                │ OFFER received
         │                ▼
         │         ┌─────────────┐
         │  ┌──────│   ACTIVE    │◀─────── 已 ACCEPT，执行中
         │  │      └──────┬──────┘
         │  │             │ RESULT received
         │  │             ▼
         │  │      ┌─────────────┐
         │  └─────▶│  COMPLETED  │◀─────── 成功完成
         │         └─────────────┘
         │
         │         ┌─────────────┐
         └────────▶│   ERROR     │◀─────── 失败/超时/取消
                   └─────────────┘
```

### State Transitions

| Current State | Event | Next State | Notes |
|:---|:---|:---|:---|
| OPEN | Client sends REQUEST | PENDING | Thread created |
| PENDING | Agent sends OFFER | PENDING | Multiple OFFERs allowed |
| PENDING | Client sends ACCEPT | ACTIVE | One ACCEPT per thread |
| PENDING | Timeout (no OFFER) | ERROR | Configurable timeout |
| ACTIVE | Agent sends RESULT | COMPLETED | Success path |
| ACTIVE | Timeout (no RESULT) | ERROR | Agent failed to deliver |
| ACTIVE | Client sends CANCEL | ERROR | Client cancelled |
| *any* | ERROR message | ERROR | Terminal state |

### Timeout Rules

| Timeout | Default | Checked By |
|:---|:---|:---|
| `meta.ttl` | 300 seconds (5 min) | Relay drops expired messages |
| `constraints.deadline` | N/A | Client/Agent application level |
| `offer.valid_until` | N/A | Client checks before ACCEPT |

## Security Considerations

### v1.0 (Current)
- All messages must be signed
- Signature verification is mandatory
- No encryption (payloads are plaintext)

### Replay Attack Prevention

To prevent replay attacks, implementations MUST:

1. **Timestamp validation**: Reject messages with `ts` outside ±5 minutes of current time
2. **Idempotency**: Track processed message IDs (`id` field) for at least 10 minutes
3. **Nonce verification**: The `id` field serves as nonce (must be unique)

```typescript
function validateTimestamp(ts: string): boolean {
  const msgTime = new Date(ts).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(now - msgTime) < fiveMinutes;
}
```

### v2.0 (Future)
- Optional end-to-end encryption
- Forward secrecy
- Anonymous routing

## Relay Protocol

Relays provide message storage and delivery using **HTTP long-polling**.

### Submit Event

```bash
POST /events
Content-Type: application/json

{ signed_envelope }
```

**Response:**
```json
{ "ok": true, "id": "msg_01jqk7z8" }
```

### Subscribe to Events (Long Polling)

```bash
GET /events?since=2026-02-02T15:30:00Z&recipient=did:key:z6Mk...
```

**Parameters:**
- `since` (required): ISO 8601 timestamp, receive events after this time
- `recipient` (optional): Filter by recipient ID
- `sender` (optional): Filter by sender ID
- `type` (optional): Filter by message type
- `thread` (optional): Filter by thread ID
- `timeout` (optional): Long-poll timeout in seconds (default: 30, max: 60)

**Response:**
```json
{
  "ok": true,
  "events": [envelope1, envelope2, ...],
  "hasMore": false
}
```

**Long Polling Behavior:**
1. If events exist: Return immediately with events
2. If no events: Hold connection open until:
   - New event arrives (return immediately)
   - Timeout reached (return empty `events` array)
3. Client should immediately re-subscribe with updated `since` timestamp

### Client Subscription Loop

```typescript
async function subscribeEvents(myDid: string) {
  let since = new Date().toISOString();
  
  while (true) {
    try {
      const res = await fetch(
        `https://relay.example.com/events?since=${encodeURIComponent(since)}` +
        `&recipient=${encodeURIComponent(myDid)}&timeout=30`
      );
      const data = await res.json();
      
      if (data.ok && data.events.length > 0) {
        for (const event of data.events) {
          // Verify signature first
          if (await verifySignature(event)) {
            await handleEvent(event);
          }
        }
        // Update since to last event timestamp
        since = data.events[data.events.length - 1].ts;
      }
    } catch (err) {
      // Connection error, wait before retry
      await sleep(5000);
    }
  }
}
```

### Why HTTP Long Polling?

- **No public IP required**: Agent can receive messages behind NAT/firewall
- **Simple**: Works with standard HTTP libraries
- **Reliable**: Automatic reconnection on network failure
- **Scalable**: Stateless on server side
- **Upgrade path**: Can add WebSocket as optional v2.0 enhancement

### Health Check

```bash
GET /health

{ "ok": true, "version": "1.0.0" }
```

### Seed Demo Data

```bash
POST /seed

{ "ok": true, "count": 12 }
```

## Version Compatibility

- `version` field must match exactly
- Minor version bumps are backward compatible
- Major version changes require protocol negotiation

## Appendix A: did:key Method

Agora uses `did:key` for agent identifiers. This appendix describes how to extract the Ed25519 public key from a `did:key` identifier.

### Format

```
did:key:z{multibase-encoded-public-key}
```

Where:
- `z` indicates base58-btc encoding (multibase)
- The decoded key is a multicodec-prefixed public key

### Extracting Ed25519 Public Key

```typescript
function didKeyToPublicKey(did: string): Uint8Array | null {
  // 1. Check prefix
  if (!did.startsWith('did:key:z')) {
    return null;
  }
  
  // 2. Extract multibase portion
  const multibaseKey = did.slice('did:key:z'.length);
  
  // 3. Decode base58-btc
  const decoded = base58Decode(multibaseKey);
  
  // 4. Check multicodec prefix (0xed01 for Ed25519)
  // Ed25519 public key prefix: [0xed, 0x01]
  if (decoded.length < 2 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    return null;
  }
  
  // 5. Return 32-byte public key (after prefix)
  return decoded.slice(2);
}

function publicKeyToDidKey(publicKey: Uint8Array): string {
  // 1. Add Ed25519 multicodec prefix
  const prefix = new Uint8Array([0xed, 0x01]);
  const multicodecKey = new Uint8Array(prefix.length + publicKey.length);
  multicodecKey.set(prefix);
  multicodecKey.set(publicKey, prefix.length);
  
  // 2. Encode as base58-btc with 'z' multibase prefix
  const base58Key = base58Encode(multicodecKey);
  return `did:key:z${base58Key}`;
}
```

### Example

```
Ed25519 Public Key (hex): 7f44f0a6...
did:key identifier: did:key:z6MkhaXg...

Full resolution:
1. Remove "did:key:z" → "6MkhaXg..."
2. Base58 decode → [0xed, 0x01, 0x7f, 0x44, 0xf0, 0xa6, ...]
3. Remove prefix [0xed, 0x01] → Ed25519 public key
```

### Validation Rules

1. `did:key` identifiers MUST use base58-btc encoding (prefix `z`)
2. The multicodec prefix MUST be `0xed01` (Ed25519)
3. The public key portion MUST be exactly 32 bytes

## References

- [RFC 8785 - JSON Canonicalization Scheme (JCS)](https://tools.ietf.org/html/rfc8785)
- [Ed25519](https://ed25519.cr.yp.to/)
- [did:key Method](https://w3c-ccg.github.io/did-method-key/)
- [Multicodec](https://github.com/multiformats/multicodec)
- [Multibase](https://github.com/multiformats/multibase)
