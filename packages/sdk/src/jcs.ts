export type JcsCanonicalizer = (value: unknown) => string;

/**
 * Placeholder for JCS (RFC 8785) canonicalization.
 *
 * Expected library: https://www.npmjs.com/package/canonicalize
 * Usage: import canonicalize from "canonicalize";
 */
export const canonicalize: JcsCanonicalizer = () => {
  throw new Error(
    "JCS canonicalization not implemented. Install and inject a RFC8785 canonicalizer (e.g. 'canonicalize' npm package)."
  );
};
