import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  generateEncryptionKeyPair,
  convertEd25519ToCurve25519,
  getCurve25519PublicKeyFromEd25519KeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  encryptMessageForEd25519Recipient,
  decryptMessageWithEd25519Key,
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
} from '../src/crypto';

describe('Crypto - E2EE Encryption', () => {
  describe('Key Generation', () => {
    it('should generate Ed25519 key pair', () => {
      const keyPair = generateKeyPair();
      
      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.secretKey.length).toBe(64); // Ed25519 secret key is 64 bytes
    });

    it('should generate Curve25519 encryption key pair', () => {
      const keyPair = generateEncryptionKeyPair();
      
      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.secretKey.length).toBe(32);
    });

    it('should generate unique key pairs each time', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      
      // Public keys should be different
      expect(Buffer.from(keyPair1.publicKey).toString('hex'))
        .not.toBe(Buffer.from(keyPair2.publicKey).toString('hex'));
      
      // Secret keys should be different
      expect(Buffer.from(keyPair1.secretKey).toString('hex'))
        .not.toBe(Buffer.from(keyPair2.secretKey).toString('hex'));
    });
  });

  describe('Key Conversion', () => {
    it('should convert Ed25519 key pair to Curve25519', () => {
      const ed25519KeyPair = generateKeyPair();
      const curve25519KeyPair = convertEd25519ToCurve25519(ed25519KeyPair);
      
      expect(curve25519KeyPair).toBeDefined();
      expect(curve25519KeyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(curve25519KeyPair.secretKey).toBeInstanceOf(Uint8Array);
      expect(curve25519KeyPair.publicKey.length).toBe(32);
      expect(curve25519KeyPair.secretKey.length).toBe(32);
    });

    it('should get Curve25519 public key from Ed25519 key pair', () => {
      const ed25519KeyPair = generateKeyPair();
      const curve25519PublicKey = getCurve25519PublicKeyFromEd25519KeyPair(ed25519KeyPair);
      
      expect(curve25519PublicKey).toBeInstanceOf(Uint8Array);
      expect(curve25519PublicKey.length).toBe(32);
    });

    it('should produce consistent Curve25519 key pair from Ed25519', () => {
      const ed25519KeyPair = generateKeyPair();
      
      // Convert full key pair
      const curve25519KeyPair = convertEd25519ToCurve25519(ed25519KeyPair);
      
      // Get public key via helper
      const curve25519PublicKey = getCurve25519PublicKeyFromEd25519KeyPair(ed25519KeyPair);
      
      // Both should produce the same public key
      expect(curve25519KeyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(curve25519KeyPair.publicKey.length).toBe(32);
      expect(curve25519PublicKey).toBeInstanceOf(Uint8Array);
      expect(curve25519PublicKey.length).toBe(32);
      
      // These should match since getCurve25519PublicKeyFromEd25519KeyPair uses convertEd25519ToCurve25519 internally
      expect(Buffer.from(curve25519KeyPair.publicKey).toString('hex'))
        .toBe(Buffer.from(curve25519PublicKey).toString('hex'));
    });
  });

  describe('Shared Secret Derivation', () => {
    it('should derive same shared secret between two parties', () => {
      const alice = generateEncryptionKeyPair();
      const bob = generateEncryptionKeyPair();
      
      // Alice derives shared secret using her private key and Bob's public key
      const sharedSecretAlice = deriveSharedSecret(alice.secretKey, bob.publicKey);
      
      // Bob derives shared secret using his private key and Alice's public key
      const sharedSecretBob = deriveSharedSecret(bob.secretKey, alice.publicKey);
      
      // Both should derive the same shared secret
      expect(sharedSecretAlice).toBeInstanceOf(Uint8Array);
      expect(sharedSecretBob).toBeInstanceOf(Uint8Array);
      expect(sharedSecretAlice.length).toBe(32);
      expect(Buffer.from(sharedSecretAlice).toString('hex'))
        .toBe(Buffer.from(sharedSecretBob).toString('hex'));
    });

    it('should derive different shared secrets for different key pairs', () => {
      const alice = generateEncryptionKeyPair();
      const bob = generateEncryptionKeyPair();
      const charlie = generateEncryptionKeyPair();
      
      const sharedSecretAB = deriveSharedSecret(alice.secretKey, bob.publicKey);
      const sharedSecretAC = deriveSharedSecret(alice.secretKey, charlie.publicKey);
      
      expect(Buffer.from(sharedSecretAB).toString('hex'))
        .not.toBe(Buffer.from(sharedSecretAC).toString('hex'));
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt a message', () => {
      const recipient = generateEncryptionKeyPair();
      const message = 'Hello, this is a secret message!';
      
      // Encrypt
      const encrypted = encryptMessage(message, recipient.publicKey);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      
      // Decrypt
      const decrypted = decryptMessage(encrypted, recipient);
      
      expect(decrypted).toBe(message);
    });

    it('should encrypt and decrypt using Ed25519 keys', () => {
      const recipientEd25519 = generateKeyPair();
      const message = 'Secret message using Ed25519 keys!';
      
      // Convert Ed25519 to Curve25519 for encryption
      const recipientCurve25519 = convertEd25519ToCurve25519(recipientEd25519);
      
      // Encrypt
      const encrypted = encryptMessage(message, recipientCurve25519.publicKey);
      
      // Decrypt
      const decrypted = decryptMessage(encrypted, recipientCurve25519);
      
      expect(decrypted).toBe(message);
    });

    it('should encrypt and decrypt with Ed25519 conversion helpers', () => {
      const recipientEd25519 = generateKeyPair();
      const message = 'Using conversion helpers!';
      
      // Encrypt using Ed25519 key pair (to get the derived encryption public key)
      const encrypted = encryptMessageForEd25519Recipient(message, recipientEd25519);
      
      // Decrypt using Ed25519 key pair
      const decrypted = decryptMessageWithEd25519Key(encrypted, recipientEd25519);
      
      expect(decrypted).toBe(message);
    });

    it('should produce different ciphertexts for same message (ephemeral keys)', () => {
      const recipient = generateEncryptionKeyPair();
      const message = 'Same message';
      
      const encrypted1 = encryptMessage(message, recipient.publicKey);
      const encrypted2 = encryptMessage(message, recipient.publicKey);
      
      // Should be different due to ephemeral keys and random nonces
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same message
      expect(decryptMessage(encrypted1, recipient)).toBe(message);
      expect(decryptMessage(encrypted2, recipient)).toBe(message);
    });

    it('should handle empty messages', () => {
      const recipient = generateEncryptionKeyPair();
      const message = '';
      
      const encrypted = encryptMessage(message, recipient.publicKey);
      const decrypted = decryptMessage(encrypted, recipient);
      
      expect(decrypted).toBe(message);
    });

    it('should handle unicode messages', () => {
      const recipient = generateEncryptionKeyPair();
      const message = '🔐 🚀 你好世界! مرحبا こんにちは 👋';
      
      const encrypted = encryptMessage(message, recipient.publicKey);
      const decrypted = decryptMessage(encrypted, recipient);
      
      expect(decrypted).toBe(message);
    });

    it('should handle large messages', () => {
      const recipient = generateEncryptionKeyPair();
      const message = 'A'.repeat(10000);
      
      const encrypted = encryptMessage(message, recipient.publicKey);
      const decrypted = decryptMessage(encrypted, recipient);
      
      expect(decrypted).toBe(message);
    });

    it('should fail to decrypt with wrong key', () => {
      const recipient = generateEncryptionKeyPair();
      const wrongRecipient = generateEncryptionKeyPair();
      const message = 'Secret for recipient only!';
      
      const encrypted = encryptMessage(message, recipient.publicKey);
      
      // Should throw when trying to decrypt with wrong key
      expect(() => {
        decryptMessage(encrypted, wrongRecipient);
      }).toThrow('Decryption failed');
    });

    it('should fail to decrypt corrupted ciphertext', () => {
      const recipient = generateEncryptionKeyPair();
      const message = 'Important message!';
      
      const encrypted = encryptMessage(message, recipient.publicKey);
      
      // Corrupt the ciphertext by changing some characters
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      
      // Should throw when trying to decrypt corrupted message
      expect(() => {
        decryptMessage(corrupted, recipient);
      }).toThrow();
    });
  });

  describe('Encoding Utilities', () => {
    it('should encode and decode base64', () => {
      const original = new Uint8Array([1, 2, 3, 255, 254, 0]);
      
      const encoded = encodeBase64(original);
      expect(typeof encoded).toBe('string');
      
      const decoded = decodeBase64(encoded);
      expect(Buffer.from(decoded).toString('hex')).toBe(Buffer.from(original).toString('hex'));
    });

    it('should encode and decode UTF8', () => {
      const original = 'Hello 世界 🌍';
      
      const encoded = encodeUTF8(original);
      expect(encoded).toBeInstanceOf(Uint8Array);
      
      const decoded = decodeUTF8(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full E2EE flow between two agents', () => {
      // Agent A generates signing key pair (Ed25519)
      const agentA = generateKeyPair();
      
      // Agent B generates signing key pair (Ed25519)
      const agentB = generateKeyPair();
      
      // Agent A wants to send an encrypted message to Agent B
      const secretMessage = 'Top secret: The meeting is at midnight!';
      
      // Agent B converts their Ed25519 key pair to Curve25519
      const agentBCurve25519 = convertEd25519ToCurve25519(agentB);
      
      // Agent A encrypts the message using B's Curve25519 public key
      const encryptedMessage = encryptMessage(secretMessage, agentBCurve25519.publicKey);
      
      // Agent B decrypts the message
      const decryptedMessage = decryptMessage(encryptedMessage, agentBCurve25519);
      
      expect(decryptedMessage).toBe(secretMessage);
    });

    it('should complete full E2EE flow using convenience methods', () => {
      // Agent A generates signing key pair (Ed25519)
      const agentA = generateKeyPair();
      
      // Agent B generates signing key pair (Ed25519)
      const agentB = generateKeyPair();
      
      // Agent A sends encrypted message to Agent B
      const secretMessage = 'Using convenience methods!';
      
      // Encrypt using helper (converts Ed25519 key pair internally)
      const encryptedMessage = encryptMessageForEd25519Recipient(
        secretMessage,
        agentB
      );
      
      // Decrypt using helper (converts Ed25519 key pair internally)
      const decryptedMessage = decryptMessageWithEd25519Key(
        encryptedMessage,
        agentB
      );
      
      expect(decryptedMessage).toBe(secretMessage);
    });
  });
});
