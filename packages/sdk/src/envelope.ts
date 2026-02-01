import type { Envelope, EnvelopeHeader, Signer, Verifier } from "./types.js";
import { canonicalize as defaultCanonicalize, type JcsCanonicalizer } from "./jcs.js";
import { base64urlDecode, base64urlEncode, utf8ToBytes } from "./crypto.js";

export interface EnvelopeOptions {
  header?: Partial<EnvelopeHeader>;
  canonicalize?: JcsCanonicalizer;
}

export const createEnvelope = async <T>(
  payload: T,
  signer: Signer,
  options: EnvelopeOptions = {}
): Promise<Envelope<T>> => {
  const header: EnvelopeHeader = {
    alg: signer.alg,
    kid: signer.keyId,
    typ: "agora+envelope",
    jcs: "rfc8785",
    ...options.header,
  };

  const canonicalize = options.canonicalize ?? defaultCanonicalize;
  const signingInput = canonicalize({ header, payload });
  const signatureBytes = await signer.sign(utf8ToBytes(signingInput));

  return {
    header,
    payload,
    signature: base64urlEncode(signatureBytes),
  };
};

export const verifyEnvelope = async <T>(
  envelope: Envelope<T>,
  verifier: Verifier,
  options: EnvelopeOptions = {}
): Promise<boolean> => {
  if (verifier.alg !== envelope.header.alg) {
    return false;
  }
  if (verifier.keyId && envelope.header.kid && verifier.keyId !== envelope.header.kid) {
    return false;
  }

  const canonicalize = options.canonicalize ?? defaultCanonicalize;
  const signingInput = canonicalize({ header: envelope.header, payload: envelope.payload });
  const signatureBytes = base64urlDecode(envelope.signature);

  return verifier.verify(utf8ToBytes(signingInput), signatureBytes);
};
