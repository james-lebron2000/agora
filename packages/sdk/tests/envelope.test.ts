import { describe, expect, it } from "vitest";
import { createEnvelope, verifyEnvelope, type Signer, type Verifier } from "../src/index.js";

const canonicalize = (value: unknown) => JSON.stringify(value);

describe("envelope", () => {
  it("creates and verifies with injected canonicalizer", async () => {
    const signer: Signer = {
      alg: "test",
      sign: async (msg) => msg,
    };
    const verifier: Verifier = {
      alg: "test",
      verify: async (msg, sig) => msg.length === sig.length,
    };

    const envelope = await createEnvelope({ a: 1 }, signer, { canonicalize });
    const ok = await verifyEnvelope(envelope, verifier, { canonicalize });

    expect(ok).toBe(true);
  });
});
