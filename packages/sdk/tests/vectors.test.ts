import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalize } from "../src/jcs.js";
import { base64urlDecode, ed25519Verify, utf8ToBytes } from "../src/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vectorsRoot = path.resolve(__dirname, "../../../tests/vectors");

const loadVector = async (name: string) => {
  const dir = path.join(vectorsRoot, name);
  const [inputRaw, canonicalRaw, signatureRaw, publicKeyRaw] = await Promise.all([
    readFile(path.join(dir, "input.json"), "utf8"),
    readFile(path.join(dir, "canonical.json"), "utf8"),
    readFile(path.join(dir, "signature.txt"), "utf8"),
    readFile(path.join(dir, "publicKey.txt"), "utf8"),
  ]);

  return {
    input: JSON.parse(inputRaw),
    canonical: canonicalRaw.trim(),
    signature: signatureRaw.trim(),
    publicKey: publicKeyRaw.trim(),
  };
};

const verifyVector = async (name: string) => {
  const { input, canonical, signature, publicKey } = await loadVector(name);

  expect(input.sender.signature).toBe(signature);
  expect(input.sender.id).toBe(publicKey);

  const canonicalized = canonicalize({
    ...input,
    sender: {
      ...input.sender,
      signature: "",
    },
  });
  expect(canonicalized).toBe(canonical);

  const ok = await ed25519Verify(
    utf8ToBytes(canonical),
    base64urlDecode(signature),
    base64urlDecode(publicKey)
  );
  expect(ok).toBe(true);
};

describe("Agora test vectors", () => {
  it("validates request-basic", async () => {
    await verifyVector("request-basic");
  });

  it("validates result-basic", async () => {
    await verifyVector("result-basic");
  });
});
