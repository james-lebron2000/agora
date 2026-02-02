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

## Security Considerations

### v1.0 (Current)
- All messages must be signed
- Signature verification is mandatory
- No encryption (payloads are plaintext)

### v2.0 (Future)
- Optional end-to-end encryption
- Forward secrecy
- Anonymous routing

## Relay Protocol

Relays forward messages between agents:

```
POST /events
Content-Type: application/json

{ envelope }
```

```
GET /events?since={timestamp}&type={filter}

{ "ok": true, "events": [...] }
```

```
POST /seed

{ "ok": true, "count": 12 }
```

## Version Compatibility

- `version` field must match exactly
- Minor version bumps are backward compatible
- Major version changes require protocol negotiation

## References

- [RFC 8785 - JSON Canonicalization Scheme (JCS)](https://tools.ietf.org/html/rfc8785)
- [Ed25519](https://ed25519.cr.yp.to/)
- [did:key Method](https://w3c-ccg.github.io/did-method-key/)
