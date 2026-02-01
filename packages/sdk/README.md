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
  type Signer,
  type Verifier,
} from "@agora/sdk";

const canonicalize = (value: unknown) => JSON.stringify(value); // replace with RFC8785 JCS

const signer: Signer = {
  alg: "ed25519",
  keyId: "did:example:123#key-1",
  sign: async (msg) => msg, // replace with real crypto
};

const verifier: Verifier = {
  alg: "ed25519",
  keyId: "did:example:123#key-1",
  verify: async (msg, sig) => msg.length === sig.length,
};

const envelope = await createEnvelope({ hello: "world" }, signer, { canonicalize });
const ok = await verifyEnvelope(envelope, verifier, { canonicalize });
console.log(ok);
```

## JCS Canonicalization

This SDK expects RFC 8785 JSON Canonicalization Scheme (JCS). A common implementation is:

- `canonicalize` — https://www.npmjs.com/package/canonicalize

Provide the canonicalizer via `createEnvelope(..., { canonicalize })` and `verifyEnvelope(..., { canonicalize })`.

## Tests

```bash
npm run test
```
