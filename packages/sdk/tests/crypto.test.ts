import { describe, expect, it } from "vitest";
import { base64urlDecode, base64urlEncode } from "../src/crypto.js";

describe("base64url", () => {
  it("round-trips", () => {
    const input = new Uint8Array([1, 2, 3, 4, 250, 251, 252]);
    const encoded = base64urlEncode(input);
    const decoded = base64urlDecode(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(input));
  });
});
