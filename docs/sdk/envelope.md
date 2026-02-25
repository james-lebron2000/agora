# Envelope Module

API reference for the `@agora/sdk/envelope` module.

## Interfaces

### Envelope

| Property | Type | Description |
|----------|------|-------------|
| version | `string` |  |
| id | `string` |  |
| ts | `string` |  |
| type | `MessageType` |  |
| sender | `Sender` |  |
| recipient? | `Recipient` |  |
| payload | `Record<string, unknown>` |  |
| thread? | `Thread` |  |
| meta? | `Meta` |  |
| sig? | `string` |  |
| encrypted? | `boolean` |  |
| encryptionNonce? | `string` |  |

### Sender

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| name? | `string` |  |
| url? | `string` |  |

### Recipient

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| url? | `string` |  |

### Thread

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| parent? | `string` |  |

### Meta

| Property | Type | Description |
|----------|------|-------------|
| ttl? | `number` |  |
| hop? | `number` |  |
| tags? | `string[]` |  |

### SignedEnvelope

**Extends:** `Envelope`

| Property | Type | Description |
|----------|------|-------------|
| sig | `string` |  |
| encrypted? | `boolean` |  |
| encryptionNonce? | `string` |  |

## Classes

### EnvelopeBuilder

#### Date()

```typescript
Date(): void
```

#### toISOString()

```typescript
toISOString(): void
```

### EnvelopeSigner

#### if()

```typescript
if(privateKey.length !== 32: any): void
```

#### Error()

```typescript
Error('Ed25519 private key must be 32 bytes': any): void
```

### EnvelopeVerifier

Sign an envelope with an encrypted payload This is a convenience method for signing encrypted envelopes

#### verify()

```typescript
verify(envelope: SignedEnvelope): Promise<boolean>
```

#### if()

```typescript
if(!envelope.sig: any): void
```

## Functions

### generateKeypair()

```typescript
generateKeypair(): Promise<
```

