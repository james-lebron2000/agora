/**
 * Crypto Module Tests
 * Tests for encryption, key generation, and utility functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateKeyPair,
  generateEncryptionKeyPair,
  convertEd25519ToCurve25519,
  getCurve25519PublicKeyFromEd25519KeyPair,
  encryptMessage,
  decryptMessage,
  encryptMessageForEd25519Recipient,
  decryptMessageWithEd25519Key,
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
  generateNonce,
  util,
} from '../crypto.js';

describe('Crypto Module', () => {
  describe('Key Generation', () => {
    it('should generate Ed25519 key pair for signing', () => {
      const keyPair = generateKeyPair();
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('secretKey');
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.secretKey.length).toBe(64);
    });

    it('should generate Curve25519 key pair for encryption', () => {
      const keyPair = generateEncryptionKeyPair();
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('secretKey');
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
    });
  });

  describe('Key Conversion', () => {
    it('should convert Ed25519 key pair to Curve25519', () => {
      const ed25519KeyPair = generateKeyPair();
      const curve25519KeyPair = convertEd25519ToCurve25519(ed25519KeyPair);
      
      expect(curve25519KeyPair).toHaveProperty('publicKey');
      expect(curve25519KeyPair).toHaveProperty('secretKey');
      expect(curve25519KeyPair.publicKey.length).toBe(32);
      expect(curve25519KeyPair.secretKey.length).toBe(32);
    });

    it('should get Curve25519 public key from Ed25519 key pair', () => {
      const ed25519KeyPair = generateKeyPair();
      const curve25519PublicKey = getCurve25519PublicKeyFromEd25519KeyPair(ed25519KeyPair);
      
      expect(curve25519PublicKey).toBeInstanceOf(Uint8Array);
      expect(curve25519PublicKey.length).toBe(32);
    });

    it('should produce consistent conversion results', () => {
      const ed25519KeyPair = generateKeyPair();
      const curve25519KeyPair1 = convertEd25519ToCurve25519(ed25519KeyPair);
      const curve25519KeyPair2 = convertEd25519ToCurve25519(ed25519KeyPair);
      
      expect(Buffer.from(curve25519KeyPair1.publicKey).toString('hex'))
        .toBe(Buffer.from(curve25519KeyPair2.publicKey).toString('hex'));
      expect(Buffer.from(curve25519KeyPair1.secretKey).toString('hex'))
        .toBe(Buffer.from(curve25519KeyPair2.secretKey).toString('hex'));
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt a message', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const message = 'Hello, Agora!';
      
      const encrypted = encryptMessage(message, recipientKeyPair.publicKey);
      const decrypted = decryptMessage(encrypted, recipientKeyPair);
      
      expect(decrypted).toBe(message);
    });

    it('should encrypt and decrypt with Ed25519 keys', () => {
      const recipientEd25519KeyPair = generateKeyPair();
      const message = 'Secret message for Ed25519 recipient';
      
      const encrypted = encryptMessageForEd25519Recipient(message, recipientEd25519KeyPair);
      const decrypted = decryptMessageWithEd25519Key(encrypted, recipientEd25519KeyPair);
      
      expect(decrypted).toBe(message);
    });

    it('should produce different ciphertexts for same message', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const message = 'Same message';
      
      const encrypted1 = encryptMessage(message, recipientKeyPair.publicKey);
      const encrypted2 = encryptMessage(message, recipientKeyPair.publicKey);
      
      // Should use ephemeral keys, so ciphertexts should be different
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same message
      expect(decryptMessage(encrypted1, recipientKeyPair)).toBe(message);
      expect(decryptMessage(encrypted2, recipientKeyPair)).toBe(message);
    });

    it('should throw error on decryption with wrong key', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const wrongKeyPair = generateEncryptionKeyPair();
      const message = 'Secret message';
      
      const encrypted = encryptMessage(message, recipientKeyPair.publicKey);
      
      expect(() => decryptMessage(encrypted, wrongKeyPair)).toThrow('Decryption failed');
    });

    it('should handle empty messages', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const message = '';
      
      const encrypted = encryptMessage(message, recipientKeyPair.publicKey);
      const decrypted = decryptMessage(encrypted, recipientKeyPair);
      
      expect(decrypted).toBe(message);
    });

    it('should handle unicode messages', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const message = 'Hello 世界 🌍 Привет! αβγ';
      
      const encrypted = encryptMessage(message, recipientKeyPair.publicKey);
      const decrypted = decryptMessage(encrypted, recipientKeyPair);
      
      expect(decrypted).toBe(message);
    });

    it('should handle long messages', () => {
      const recipientKeyPair = generateEncryptionKeyPair();
      const message = 'A'.repeat(10000);
      
      const encrypted = encryptMessage(message, recipientKeyPair.publicKey);
      const decrypted = decryptMessage(encrypted, recipientKeyPair);
      
      expect(decrypted).toBe(message);
    });
  });

  describe('Encoding/Decoding Utilities', () => {
    it('should encode and decode base64', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      const encoded = encodeBase64(data);
      const decoded = decodeBase64(encoded);
      
      expect(Buffer.from(decoded).toString('hex')).toBe(Buffer.from(data).toString('hex'));
    });

    it('should encode and decode UTF8', () => {
      const text = 'Hello 世界 🌍';
      
      const encoded = encodeUTF8(text);
      const decoded = decodeUTF8(encoded);
      
      expect(decoded).toBe(text);
    });

    it('should handle empty data in base64 encoding', () => {
      const data = new Uint8Array(0);
      
      const encoded = encodeBase64(data);
      const decoded = decodeBase64(encoded);
      
      expect(decoded.length).toBe(0);
    });

    it('should generate random nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('Util Object', () => {
    it('should provide encodeBase64 via util', () => {
      const data = new Uint8Array([1, 2, 3]);
      expect(util.encodeBase64(data)).toBe(encodeBase64(data));
    });

    it('should provide decodeBase64 via util', () => {
      const encoded = 'AQID';
      expect(util.decodeBase64(encoded)).toEqual(decodeBase64(encoded));
    });

    it('should provide encodeUTF8 via util', () => {
      const text = 'Hello';
      expect(util.encodeUTF8(text)).toEqual(encodeUTF8(text));
    });

    it('should provide decodeUTF8 via util', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      expect(util.decodeUTF8(data)).toBe(decodeUTF8(data));
    });
  });

});
