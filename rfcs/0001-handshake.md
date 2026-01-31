# RFC-0001: Identity Handshake (HELLO/WELCOME)

## Motivation
Agents need a minimal, interoperable way to establish identity and prevent trivial spoofing.

## Spec
- `HELLO`: includes sender id and a nonce
- `WELCOME`: receiver signs (nonce + sender id) and returns its own id

## Security considerations
- Require signed envelopes
- Recommend replay protection (nonce cache window)

## Backwards compatibility
- v1.0 draft
