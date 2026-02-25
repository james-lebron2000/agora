import nacl from 'tweetnacl';
import sealedbox from 'tweetnacl-sealedbox-js';
import blake from 'blakejs/blake2b';
/**
 * Utility functions for encoding/decoding
 */
export const util = {
    /**
     * Encode Uint8Array to base64 string
     */
    encodeBase64(bytes) {
        return Buffer.from(bytes).toString('base64');
    },
    /**
     * Decode base64 string to Uint8Array
     */
    decodeBase64(base64) {
        return new Uint8Array(Buffer.from(base64, 'base64'));
    },
    /**
     * Encode string to UTF8 Uint8Array
     */
    encodeUTF8(str) {
        return new TextEncoder().encode(str);
    },
    /**
     * Decode UTF8 Uint8Array to string
     */
    decodeUTF8(bytes) {
        return new TextDecoder().decode(bytes);
    },
};
/**
 * Generate a new Ed25519 key pair for signing
 * Note: Ed25519 keys need to be converted to Curve25519 for encryption
 */
export function generateKeyPair() {
    return nacl.sign.keyPair();
}
/**
 * Generate a new Curve25519 key pair for encryption
 * Use this if you only need encryption (not signing)
 */
export function generateEncryptionKeyPair() {
    return nacl.box.keyPair();
}
/**
 * Ed25519 -> Curve25519 key conversion
 *
 * Since tweetnacl doesn't expose direct Ed25519->Curve25519 conversion,
 * we derive the Curve25519 key pair deterministically from the Ed25519 secret key.
 *
 * This uses a hash of the Ed25519 secret key seed to generate the Curve25519 secret key,
 * then derives the public key from it.
 */
function deriveCurve25519KeyPairFromEd25519SecretKey(ed25519SecretKey) {
    // Ed25519 secret key is 64 bytes (32 byte seed + 32 byte public key)
    // We use the first 32 bytes (the seed) as the basis for derivation
    const seed = ed25519SecretKey.slice(0, 32);
    // Hash the seed to get the Curve25519 secret key
    const hash = blake.blake2bInit(32, null);
    blake.blake2bUpdate(hash, seed);
    blake.blake2bUpdate(hash, new TextEncoder().encode('curve25519-secret-v1'));
    const curve25519SecretKey = blake.blake2bFinal(hash);
    // Clamp the secret key according to Curve25519 spec
    curve25519SecretKey[0] &= 248;
    curve25519SecretKey[31] &= 127;
    curve25519SecretKey[31] |= 64;
    // Derive the public key from the secret key
    const curve25519PublicKey = nacl.scalarMult.base(curve25519SecretKey);
    return {
        secretKey: curve25519SecretKey,
        publicKey: curve25519PublicKey,
    };
}
/**
 * Convert Ed25519 key pair to Curve25519 key pair
 * This allows using the same key pair for both signing and encryption
 */
export function convertEd25519ToCurve25519(ed25519KeyPair) {
    return deriveCurve25519KeyPairFromEd25519SecretKey(ed25519KeyPair.secretKey);
}
/**
 * Get the Curve25519 public key from an Ed25519 key pair.
 *
 * IMPORTANT: This returns the Curve25519 public key that corresponds to
 * the Ed25519 key pair's secret key (via convertEd25519ToCurve25519).
 * This is used for encryption to a recipient when you have their full key pair.
 *
 * If you only have the Ed25519 public key (not the full key pair), you cannot
 * deterministically derive the corresponding Curve25519 public key without
 * additional cryptographic operations that tweetnacl doesn't provide.
 */
export function getCurve25519PublicKeyFromEd25519KeyPair(ed25519KeyPair) {
    const curve25519KeyPair = convertEd25519ToCurve25519(ed25519KeyPair);
    return curve25519KeyPair.publicKey;
}
/**
 * Derive a shared secret using ECDH (Elliptic Curve Diffie-Hellman)
 * This is used internally by the sealed box encryption
 */
export function deriveSharedSecret(privateKey, publicKey) {
    return nacl.scalarMult(privateKey, publicKey);
}
/**
 * Encrypt a message using sealed box (anonymous encryption)
 * Format: base64(ephemeralPublicKey + nonce + ciphertext)
 *
 * The sealed box format ensures:
 * - Only the recipient can decrypt (using their private key)
 * - The sender remains anonymous (ephemeral key is used)
 * - The message is authenticated (Poly1305 MAC)
 *
 * @param message - The plaintext message to encrypt
 * @param recipientPublicKey - The recipient's Curve25519 public key (32 bytes)
 * @returns Base64 encoded encrypted message
 */
export function encryptMessage(message, recipientPublicKey) {
    const messageBytes = util.encodeUTF8(message);
    // Use sealedbox for anonymous encryption
    const encrypted = sealedbox.seal(messageBytes, recipientPublicKey);
    return util.encodeBase64(encrypted);
}
/**
 * Decrypt a message encrypted with encryptMessage
 *
 * @param encryptedMessage - Base64 encoded encrypted message
 * @param keyPair - Recipient's Curve25519 key pair (both public and secret key needed)
 * @returns Decrypted plaintext message
 */
export function decryptMessage(encryptedMessage, keyPair) {
    const encryptedBytes = util.decodeBase64(encryptedMessage);
    // sealedbox.open needs the recipient's public key and secret key
    const decrypted = sealedbox.open(encryptedBytes, keyPair.publicKey, keyPair.secretKey);
    if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted message');
    }
    return util.decodeUTF8(decrypted);
}
/**
 * Encrypt a message for a recipient using their Ed25519 key pair
 * This converts the Ed25519 key to Curve25519 internally
 */
export function encryptMessageForEd25519Recipient(message, recipientEd25519KeyPair) {
    // Convert Ed25519 key pair to Curve25519 to get the encryption public key
    const recipientCurve25519KeyPair = convertEd25519ToCurve25519(recipientEd25519KeyPair);
    return encryptMessage(message, recipientCurve25519KeyPair.publicKey);
}
/**
 * Decrypt a message using an Ed25519 key pair
 * This converts the Ed25519 secret key to Curve25519 internally
 */
export function decryptMessageWithEd25519Key(encryptedMessage, ed25519KeyPair) {
    // Convert Ed25519 key pair to Curve25519
    const curve25519KeyPair = convertEd25519ToCurve25519(ed25519KeyPair);
    return decryptMessage(encryptedMessage, curve25519KeyPair);
}
/**
 * Generate a random nonce for encryption
 * Used when creating encrypted envelopes
 */
export function generateNonce() {
    return util.encodeBase64(nacl.randomBytes(nacl.box.nonceLength));
}
/**
 * Encode bytes to base64 string
 */
export function encodeBase64(bytes) {
    return util.encodeBase64(bytes);
}
/**
 * Decode base64 string to bytes
 */
export function decodeBase64(base64) {
    return util.decodeBase64(base64);
}
/**
 * Encode string to UTF8 bytes
 */
export function encodeUTF8(str) {
    return util.encodeUTF8(str);
}
/**
 * Decode UTF8 bytes to string
 */
export function decodeUTF8(bytes) {
    return util.decodeUTF8(bytes);
}
// Export sealedbox overhead length for reference
export { sealedbox };
export const SEALEDBOX_OVERHEAD_LENGTH = sealedbox.overheadLength;
//# sourceMappingURL=crypto.js.map