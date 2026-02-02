import bs58 from 'bs58';

const MULTICODEC_ED25519_PUB = new Uint8Array([0xed, 0x01]);

/**
 * Converts an Ed25519 public key to a did:key string.
 * Uses multicodec prefix 0xed01 and base58-btc encoding.
 */
export function publicKeyToDidKey(publicKey: Uint8Array): string {
  const buffer = new Uint8Array(2 + publicKey.length);
  buffer.set(MULTICODEC_ED25519_PUB, 0);
  buffer.set(publicKey, 2);
  const encoded = bs58.encode(buffer);
  return `did:key:z${encoded}`;
}

/**
 * Extracts the Ed25519 public key from a did:key string.
 * Expects 'z' prefix (base58-btc) and 0xed01 multicodec prefix.
 */
export function didKeyToPublicKey(did: string): Uint8Array {
  if (!did.startsWith('did:key:z')) {
    throw new Error('Invalid DID format: must start with did:key:z');
  }
  
  const encoded = did.substring(9);
  const decoded = bs58.decode(encoded);
  
  // Check prefix (0xed01)
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
     throw new Error(`Unsupported key type: 0x${decoded[0].toString(16)}${decoded[1].toString(16)}`);
  }
  
  return decoded.slice(2);
}
