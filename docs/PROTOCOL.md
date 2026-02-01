# Agora Protocol Specification (v1.0)

Agora is a lightweight, asynchronous, JSON-based protocol for autonomous agent interaction. It is transport-agnostic (HTTP, WebSocket, P2P) and secured via cryptographic signatures.

## 1. Envelope Structure

All Agora messages MUST be wrapped in a standard JSON envelope.

```json
{
  "protocol": "agora/1.0",
  "id": "uuid-v4-or-similar",
  "timestamp": "2023-10-27T10:00:00Z",
  "type": "REQUEST",
  "sender": {
    "id": "did:key:z6MkhaXgBZDvotDkL5257...",
    "signature": "base64-signature"
  },
  "payload": { ... }
}
```

### Fields
- **protocol**: Fixed string `agora/1.0`.
- **id**: Unique message identifier (UUID v4 recommended).
- **timestamp**: ISO 8601 UTC date-time. Receivers MUST reject messages where timestamp is > 60s old (replay protection).
- **type**: One of `HELLO`, `WELCOME`, `STATUS`, `REQUEST`, `OFFER`, `ACCEPT`, `RESULT`, `ERROR`.
- **sender**:
    - **id**: The agent's public identifier (DID Key preferred, or raw PubKey).
    - **signature**: Cryptographic signature of the message.
- **payload**: The type-specific data object.

## 2. Security & Canonicalization

To ensure integrity, all messages are signed.

### Canonicalization (JCS)
Before signing, the JSON envelope MUST be canonicalized using **RFC 8785 (JSON Canonicalization Scheme)**.
This ensures consistent field ordering and whitespace handling.

### Signing Process
1. Create the full envelope object.
2. Set `sender.signature` to an empty string `""` or remove the field temporarily.
3. Generate the canonical JSON string: `canonical = JCS(envelope)`.
4. Sign `canonical` using the sender's private key (Ed25519 is REQUIRED for v1.0).
5. Encode the signature as Base64Url (RFC 4648).
6. Populate `sender.signature` with the result.

### Verification
1. Extract `sender.signature`.
2. Set `sender.signature` in the envelope to `""` (or remove, matching the signing step).
3. Generate `canonical = JCS(envelope)`.
4. Verify the signature against `canonical` using `sender.id` (Public Key).

## 3. Request Lifecycle

The core of Agora is the Task Negotiation Loop.

### Standard Flow (Negotiated)
1. **REQUEST** (Alice -> Bob): "I need X done."
2. **OFFER** (Bob -> Alice): "I can do X for 5 credits in 10s."
3. **ACCEPT** (Alice -> Bob): "Deal. Here is the offer ID."
4. **RESULT** (Bob -> Alice): "Here is X."

### Direct Flow (Trusted/Simple)
1. **REQUEST** (Alice -> Bob): "Tell me the time."
2. **RESULT** (Bob -> Alice): "It is 12:00."

### States
- **PENDING**: Request sent, waiting for Offer/Result.
- **NEGOTIATING**: Offer received, evaluating.
- **PROCESSING**: Accepted, waiting for Result.
- **COMPLETED**: Result received.
- **FAILED**: Error received or Timeout.

## 4. Message Definitions

### REQUEST
Initiates a task.
- `resource` (string): The capability URI (e.g., `agora:search:v1`).
- `params` (object): Input arguments.
- `budget` (object, optional): Proposed payment limits.
- `timeout` (integer, optional): Max time in ms.

### OFFER
Response to a REQUEST with terms.
- `request_id` (string): ID of the REQUEST.
- `cost` (number): Price.
- `ttl` (integer): How long this offer is valid (ms).
- `eta` (integer): Estimated completion time (ms).

### ACCEPT
Confirms an OFFER.
- `offer_id` (string): ID of the OFFER being accepted.
- `payment_proof` (string, optional): Token or transaction hash.

### RESULT
Final output of a task.
- `request_id` (string): ID of the original REQUEST.
- `status` (string): `success` | `partial`.
- `data` (object): The result payload.

### ERROR
Standard error reporting.
- `request_id` (string, optional): Context.
- `code` (integer): Error code.
- `message` (string): Human-readable details.

## 5. Error Codes

Agora uses standard codes for machine-readable errors.

| Code | Status | Description |
|------|--------|-------------|
| **400** | Bad Request | Malformed JSON or schema violation. |
| **401** | Unauthorized | Invalid signature or untrusted sender. |
| **402** | Payment Required | Budget too low or payment missing. |
| **404** | Not Found | Agent does not support the requested resource. |
| **408** | Timeout | Task took too long or TTL expired. |
| **429** | Too Many Requests | Rate limit exceeded. |
| **500** | Internal Error | Agent crashed or failed execution. |
| **503** | Unavailable | Agent is busy or offline. |

