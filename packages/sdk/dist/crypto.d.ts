import nacl from 'tweetnacl';
import sealedbox from 'tweetnacl-sealedbox-js';
export type BoxKeyPair = nacl.BoxKeyPair;
export type SignKeyPair = nacl.SignKeyPair;
/**
 * Utility functions for encoding/decoding
 */
export declare const util: {
    /**
     * Encode Uint8Array to base64 string
     */
    encodeBase64(bytes: Uint8Array): string;
    /**
     * Decode base64 string to Uint8Array
     */
    decodeBase64(base64: string): Uint8Array;
    /**
     * Encode string to UTF8 Uint8Array
     */
    encodeUTF8(str: string): Uint8Array;
    /**
     * Decode UTF8 Uint8Array to string
     */
    decodeUTF8(bytes: Uint8Array): string;
};
/**
 * Generate a new Ed25519 key pair for signing
 * Note: Ed25519 keys need to be converted to Curve25519 for encryption
 */
export declare function generateKeyPair(): SignKeyPair;
/**
 * Generate a new Curve25519 key pair for encryption
 * Use this if you only need encryption (not signing)
 */
export declare function generateEncryptionKeyPair(): BoxKeyPair;
/**
 * Convert Ed25519 key pair to Curve25519 key pair
 * This allows using the same key pair for both signing and encryption
 */
export declare function convertEd25519ToCurve25519(ed25519KeyPair: SignKeyPair): BoxKeyPair;
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
export declare function getCurve25519PublicKeyFromEd25519KeyPair(ed25519KeyPair: SignKeyPair): Uint8Array;
/**
 * Derive a shared secret using ECDH (Elliptic Curve Diffie-Hellman)
 * This is used internally by the sealed box encryption
 */
export declare function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;
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
export declare function encryptMessage(message: string, recipientPublicKey: Uint8Array): string;
/**
 * Decrypt a message encrypted with encryptMessage
 *
 * @param encryptedMessage - Base64 encoded encrypted message
 * @param keyPair - Recipient's Curve25519 key pair (both public and secret key needed)
 * @returns Decrypted plaintext message
 */
export declare function decryptMessage(encryptedMessage: string, keyPair: BoxKeyPair): string;
/**
 * Encrypt a message for a recipient using their Ed25519 key pair
 * This converts the Ed25519 key to Curve25519 internally
 */
export declare function encryptMessageForEd25519Recipient(message: string, recipientEd25519KeyPair: SignKeyPair): string;
/**
 * Decrypt a message using an Ed25519 key pair
 * This converts the Ed25519 secret key to Curve25519 internally
 */
export declare function decryptMessageWithEd25519Key(encryptedMessage: string, ed25519KeyPair: SignKeyPair): string;
/**
 * Generate a random nonce for encryption
 * Used when creating encrypted envelopes
 */
export declare function generateNonce(): string;
/**
 * Encode bytes to base64 string
 */
export declare function encodeBase64(bytes: Uint8Array): string;
/**
 * Decode base64 string to bytes
 */
export declare function decodeBase64(base64: string): Uint8Array;
/**
 * Encode string to UTF8 bytes
 */
export declare function encodeUTF8(str: string): Uint8Array;
/**
 * Decode UTF8 bytes to string
 */
export declare function decodeUTF8(bytes: Uint8Array): string;
export { sealedbox };
export declare const SEALEDBOX_OVERHEAD_LENGTH: number;
//# sourceMappingURL=crypto.d.ts.map