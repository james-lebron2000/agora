# Crypto Module

API reference for the `@agora/sdk/crypto` module.

## Functions

### generateKeyPair()

```typescript
generateKeyPair(): SignKeyPair
```

### generateEncryptionKeyPair()

```typescript
generateEncryptionKeyPair(): BoxKeyPair
```

### convertEd25519ToCurve25519()

```typescript
convertEd25519ToCurve25519(): BoxKeyPair
```

### getCurve25519PublicKeyFromEd25519KeyPair()

```typescript
getCurve25519PublicKeyFromEd25519KeyPair(): Uint8Array
```

### deriveSharedSecret()

```typescript
deriveSharedSecret(): Uint8Array
```

### encryptMessage()

```typescript
encryptMessage(): string
```

### decryptMessage()

```typescript
decryptMessage(): string
```

### encryptMessageForEd25519Recipient()

```typescript
encryptMessageForEd25519Recipient(): string
```

### decryptMessageWithEd25519Key()

```typescript
decryptMessageWithEd25519Key(): string
```

### generateNonce()

```typescript
generateNonce(): string
```

### encodeBase64()

```typescript
encodeBase64(): string
```

### decodeBase64()

```typescript
decodeBase64(): Uint8Array
```

### encodeUTF8()

```typescript
encodeUTF8(): Uint8Array
```

### decodeUTF8()

```typescript
decodeUTF8(): string
```

