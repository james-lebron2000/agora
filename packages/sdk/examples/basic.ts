import { createEnvelope, verifyEnvelope, type Signer, type Verifier } from "../src/index.js";

const canonicalize = (value: unknown) => JSON.stringify(value);

const signer: Signer = {
  alg: "ed25519",
  keyId: "did:example:123#key-1",
  sign: async (msg) => msg,
};

const verifier: Verifier = {
  alg: "ed25519",
  keyId: "did:example:123#key-1",
  verify: async (_msg, _sig) => true,
};

const run = async () => {
  const envelope = await createEnvelope({ hello: "world" }, signer, { canonicalize });
  const ok = await verifyEnvelope(envelope, verifier, { canonicalize });
  console.log(envelope, ok);
};

run();
