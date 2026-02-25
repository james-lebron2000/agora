import * as canonicalizeModule from 'canonicalize';
const canonicalizeImpl = (canonicalizeModule as any).default || canonicalizeModule;

export type JcsCanonicalizer = (value: unknown) => string;

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) implementation.
 *
 * Uses the `canonicalize` npm package for deterministic JSON serialization.
 */
export const canonicalize: JcsCanonicalizer = (value) => {
  const result = canonicalizeImpl(value);
  if (typeof result !== "string") {
    throw new Error("JCS canonicalization failed: non-serializable value.");
  }
  return result;
};
