# Agora SDK (Reference Skeleton)

Minimal TypeScript reference skeleton for Agora envelopes: types, JCS canonicalization hook, signing/verification interfaces, tests, and example usage.

## Install (local)

```bash
cd packages/sdk
npm install
```

## Usage

```ts
import {
  createEnvelope,
  verifyEnvelope,
  createEd25519Signer,
  createEd25519Verifier,
} from "@agora/sdk";

const signer = createEd25519Signer(new Uint8Array(32), {
  keyId: "did:example:123#key-1",
});
const verifier = createEd25519Verifier(new Uint8Array(32), {
  keyId: "did:example:123#key-1",
});

const envelope = await createEnvelope({ hello: "world" }, signer);
const ok = await verifyEnvelope(envelope, verifier);
console.log(ok);
```

## JCS Canonicalization

This SDK uses RFC 8785 JSON Canonicalization Scheme (JCS) via the `canonicalize` npm package.
Override the canonicalizer via `createEnvelope(..., { canonicalize })` and
`verifyEnvelope(..., { canonicalize })` if needed.

## Tests

```bash
npm run test
```
