import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { concatBytes } from "@noble/hashes/utils";
const sha512Sync = (...messages) => {
    return sha512(concatBytes(...messages));
};
const ed25519Any = ed25519;
if (ed25519Any.utils) {
    ed25519Any.utils.sha512Sync = sha512Sync;
}
if (ed25519Any.etc) {
    ed25519Any.etc.sha512Sync = sha512Sync;
}
export const utf8ToBytes = (input) => {
    return new TextEncoder().encode(input);
};
export const base64urlEncode = (bytes) => {
    return Buffer.from(bytes)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};
export const base64urlDecode = (input) => {
    const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + padding;
    return new Uint8Array(Buffer.from(base64, "base64"));
};
export const ed25519Sign = async (message, privateKey) => {
    return ed25519.sign(message, privateKey);
};
export const ed25519Verify = async (message, signature, publicKey) => {
    return ed25519.verify(signature, message, publicKey);
};
export const createEd25519Signer = (privateKey, options = {}) => {
    return {
        alg: "ed25519",
        keyId: options.keyId,
        sign: (message) => ed25519Sign(message, privateKey),
    };
};
export const createEd25519Verifier = (publicKey, options = {}) => {
    return {
        alg: "ed25519",
        keyId: options.keyId,
        verify: (message, signature) => ed25519Verify(message, signature, publicKey),
    };
};
//# sourceMappingURL=crypto.js.map