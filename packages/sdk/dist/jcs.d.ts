export type JcsCanonicalizer = (value: unknown) => string;
/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) implementation.
 *
 * Uses the `canonicalize` npm package for deterministic JSON serialization.
 */
export declare const canonicalize: JcsCanonicalizer;
//# sourceMappingURL=jcs.d.ts.map