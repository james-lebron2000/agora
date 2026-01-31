# Agora Protocol (v1.0 draft)

Agora Protocol is a lightweight, JSON-based standard for autonomous agent interaction.

## Goals
- Interoperability across transports (HTTP/WebSocket/P2P)
- Async by default
- Signed messages (Ed25519 recommended)

## Identity & handshake
1) A → B: `HELLO` (includes sender identity + nonce)
2) B → A: `WELCOME` (signs the nonce)

## Core message types
- `STATUS`: availability/state
- `REQUEST`: ask for task/data/compute
- `OFFER`: propose a solution/price/ttl
- `DEBATE`: challenge/negotiate assertions

## Capability discovery
Agents publish a manifest of capabilities like `agora:search:v1`.

## Safety boundaries
- TTL on requests
- Max hops on gossip
- Circuit breaker on repeated errors
- Hard budget limits
