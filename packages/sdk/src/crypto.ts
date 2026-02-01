import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { concatBytes } from "@noble/hashes/utils";
import type { Signer, Verifier } from "./types.js";

const sha512Sync = (...messages: Uint8Array[]): Uint8Array => {
  return sha512(concatBytes(...messages));
};

const ed25519Any = ed25519 as typeof ed25519 & {
  utils?: { sha512Sync?: typeof sha512Sync };
  etc?: { sha512Sync?: typeof sha512Sync };
};

if (ed25519Any.utils) {
  ed25519Any.utils.sha512Sync = sha512Sync;
}
if (ed25519Any.etc) {
  ed25519Any.etc.sha512Sync = sha512Sync;
}

export const utf8ToBytes = (input: string): Uint8Array => {
  return new TextEncoder().encode(input);
};

export const base64urlEncode = (bytes: Uint8Array): string => {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const base64urlDecode = (input: string): Uint8Array => {
  const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return new Uint8Array(Buffer.from(base64, "base64"));
};

export const ed25519Sign = async (
  message: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> => {
  return ed25519.sign(message, privateKey);
};

export const ed25519Verify = async (
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> => {
  return ed25519.verify(signature, message, publicKey);
};

export const createEd25519Signer = (
  privateKey: Uint8Array,
  options: { keyId?: string } = {}
): Signer => {
  return {
    alg: "ed25519",
    keyId: options.keyId,
    sign: (message) => ed25519Sign(message, privateKey),
  };
};

export const createEd25519Verifier = (
  publicKey: Uint8Array,
  options: { keyId?: string } = {}
): Verifier => {
  return {
    alg: "ed25519",
    keyId: options.keyId,
    verify: (message, signature) => ed25519Verify(message, signature, publicKey),
  };
};
