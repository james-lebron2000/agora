/**
 * Envelope Module Tests
 * Tests for envelope creation, signing, and verification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  EnvelopeBuilder,
  EnvelopeSigner,
  EnvelopeVerifier,
  generateKeypair,
  type Envelope,
  type SignedEnvelope,
  type Sender,
  type MessageType,
} from '../envelope.js';
import { publicKeyToDidKey } from '../did.js';

describe('Envelope Module', () => {
  let testKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
  let testSender: Sender;

  beforeAll(async () => {
    testKeypair = await generateKeypair();
    testSender = {
      id: publicKeyToDidKey(testKeypair.publicKey),
      name: 'Test Agent',
    };
  });

  describe('EnvelopeBuilder', () => {
    it('should build a basic envelope', () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({ intent: 'test' })
        .build();

      expect(envelope).toMatchObject({
        version: '1.0',
        id: 'msg-123',
        type: 'REQUEST',
        sender: testSender,
        payload: { intent: 'test' },
      });
      expect(envelope.ts).toBeDefined();
    });

    it('should include all message types', () => {
      const types: MessageType[] = [
        'HELLO', 'WELCOME', 'STATUS',
        'REQUEST', 'OFFER', 'ACCEPT', 'RESULT',
        'DEBATE', 'ERROR', 'REVOKE',
        'ESCROW_HELD', 'ESCROW_RELEASED', 'ESCROW_REFUNDED'
      ];

      for (const type of types) {
        const envelope = new EnvelopeBuilder()
          .id(`msg-${type}`)
          .type(type)
          .sender(testSender)
          .payload({})
          .build();

        expect(envelope.type).toBe(type);
      }
    });

    it('should add recipient when specified', () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .recipient({ id: 'did:key:zRecipient', url: 'https://recipient.example' })
        .payload({})
        .build();

      expect(envelope.recipient).toEqual({
        id: 'did:key:zRecipient',
        url: 'https://recipient.example',
      });
    });

    it('should add thread info when specified', () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .thread({ id: 'thread-456', parent: 'msg-parent' })
        .payload({})
        .build();

      expect(envelope.thread).toEqual({
        id: 'thread-456',
        parent: 'msg-parent',
      });
    });

    it('should add meta info when specified', () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .meta({ ttl: 3600, hop: 1, tags: ['test', 'example'] })
        .payload({})
        .build();

      expect(envelope.meta).toEqual({
        ttl: 3600,
        hop: 1,
        tags: ['test', 'example'],
      });
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        new EnvelopeBuilder()
          .type('REQUEST')
          .sender(testSender)
          .payload({})
          .build();
      }).toThrow('Envelope missing required fields');

      expect(() => {
        new EnvelopeBuilder()
          .id('msg-123')
          .sender(testSender)
          .payload({})
          .build();
      }).toThrow('Envelope missing required fields');

      expect(() => {
        new EnvelopeBuilder()
          .id('msg-123')
          .type('REQUEST')
          .payload({})
          .build();
      }).toThrow('Envelope missing required fields');
    });
  });

  describe('EnvelopeSigner', () => {
    it('should sign an envelope', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({ intent: 'test' })
        .build();

      const signer = new EnvelopeSigner(testKeypair.privateKey);
      const signed = await signer.sign(envelope);

      expect(signed.sig).toBeDefined();
      expect(signed.sig.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid private key', () => {
      expect(() => {
        new EnvelopeSigner(new Uint8Array(16)); // Wrong size
      }).toThrow('Ed25519 private key must be 32 bytes');
    });

    it('should sign encrypted envelopes', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({ intent: 'secret' })
        .build();

      const signer = new EnvelopeSigner(testKeypair.privateKey);
      const encryptedPayload = 'encrypted:abc123';
      const signed = await signer.signEncrypted(envelope, encryptedPayload);

      expect(signed.sig).toBeDefined();
      expect(signed.encrypted).toBe(true);
    });
  });

  describe('EnvelopeVerifier', () => {
    it('should verify a signed envelope', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({ intent: 'test' })
        .build();

      const signer = new EnvelopeSigner(testKeypair.privateKey);
      const signed = await signer.sign(envelope);

      const verifier = new EnvelopeVerifier();
      const isValid = await verifier.verify(signed);

      expect(isValid).toBe(true);
    });

    it('should reject envelope without signature', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({})
        .build() as SignedEnvelope;

      const verifier = new EnvelopeVerifier();
      const isValid = await verifier.verify(envelope);

      expect(isValid).toBe(false);
    });

    it('should reject tampered envelope', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({ intent: 'original' })
        .build();

      const signer = new EnvelopeSigner(testKeypair.privateKey);
      const signed = await signer.sign(envelope);

      // Tamper with the payload
      signed.payload.intent = 'tampered';

      const verifier = new EnvelopeVerifier();
      const isValid = await verifier.verify(signed);

      expect(isValid).toBe(false);
    });

    it('should reject envelope with wrong sender', async () => {
      const envelope = new EnvelopeBuilder()
        .id('msg-123')
        .type('REQUEST')
        .sender(testSender)
        .payload({})
        .build();

      const signer = new EnvelopeSigner(testKeypair.privateKey);
      const signed = await signer.sign(envelope);

      // Change the sender
      signed.sender.id = 'did:key:zDifferent';

      const verifier = new EnvelopeVerifier();
      const isValid = await verifier.verify(signed);

      expect(isValid).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should handle full sign-verify flow', async () => {
      const keypair = await generateKeypair();
      const sender: Sender = {
        id: publicKeyToDidKey(keypair.publicKey),
        name: 'Integration Test Agent',
      };

      const envelope = new EnvelopeBuilder()
        .id('integration-msg-001')
        .type('REQUEST')
        .sender(sender)
        .recipient({ id: 'did:key:zRecipient' })
        .thread({ id: 'thread-001' })
        .payload({ intent: 'echo', params: { message: 'Hello, World!' } })
        .build();

      const signer = new EnvelopeSigner(keypair.privateKey);
      const signed = await signer.sign(envelope);

      const verifier = new EnvelopeVerifier();
      const isValid = await verifier.verify(signed);

      expect(isValid).toBe(true);
      expect(signed.id).toBe('integration-msg-001');
      expect(signed.type).toBe('REQUEST');
    });
  });
});
