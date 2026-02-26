import { EnvelopeBuilder, EnvelopeSigner, EnvelopeVerifier, generateKeypair } from '../src/envelope';
import { publicKeyToDidKey } from '../src/did';
import { describe, it, expect } from 'vitest';

describe('Envelope', () => {
  it('should build, sign, and verify an envelope', async () => {
    // 1. Setup keys
    const { publicKey, privateKey } = await generateKeypair();
    const senderDid = publicKeyToDidKey(publicKey);
    
    // 2. Build Envelope
    const envelope = new EnvelopeBuilder()
      .id('msg-123')
      .type('REQUEST')
      .sender({ id: senderDid })
      .payload({ task: 'test' })
      .build();

    // 3. Sign
    const signer = new EnvelopeSigner(privateKey);
    const signedEnvelope = await signer.sign(envelope);
    
    expect(signedEnvelope.sig).toBeDefined();

    // 4. Verify
    const verifier = new EnvelopeVerifier();
    const isValid = await verifier.verify(signedEnvelope);
    
    expect(isValid).toBe(true);
  });

  it('should fail verification if modified', async () => {
    const { publicKey, privateKey } = await generateKeypair();
    const senderDid = publicKeyToDidKey(publicKey);
    
    const envelope = new EnvelopeBuilder()
      .id('msg-123')
      .type('REQUEST')
      .sender({ id: senderDid })
      .payload({ task: 'test' })
      .build();

    const signer = new EnvelopeSigner(privateKey);
    const signedEnvelope = await signer.sign(envelope);
    
    // Modify payload
    signedEnvelope.payload = { task: 'hacked' };
    
    const verifier = new EnvelopeVerifier();
    const isValid = await verifier.verify(signedEnvelope);
    
    expect(isValid).toBe(false);
  });
});
