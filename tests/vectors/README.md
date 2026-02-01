# Agora Test Vectors

This directory contains canonicalization + signing test vectors for Agora envelopes.

## Directory layout
Each vector lives in its own folder with the following files:

- `input.json` — fully signed envelope (what a sender transmits).
- `canonical.json` — JCS canonicalized JSON string of the envelope **with** `sender.signature` set to `""`.
- `signature.txt` — Base64URL (RFC 4648, no padding) Ed25519 signature over `canonical.json` (UTF-8 bytes).
- `publicKey.txt` — Base64URL (no padding) raw Ed25519 public key (`sender.id`).

`sender.id` in `input.json` MUST match `publicKey.txt` for each vector.

## Template

```
vector-name/
  input.json
  canonical.json
  signature.txt
  publicKey.txt
```

### Example (template values)

**input.json**
```json
{
  "protocol": "agora/1.0",
  "id": "<uuid>",
  "timestamp": "<iso-8601>",
  "type": "<REQUEST|RESULT|...>",
  "sender": {
    "id": "<base64url-public-key>",
    "signature": "<base64url-signature>"
  },
  "payload": { }
}
```

**canonical.json** (single-line, JCS)
```
{"id":"<uuid>","payload":{...},"protocol":"agora/1.0","sender":{"id":"<base64url-public-key>","signature":""},"timestamp":"<iso-8601>","type":"<TYPE>"}
```

**signature.txt**
```
<base64url-signature>
```

**publicKey.txt**
```
<base64url-public-key>
```
