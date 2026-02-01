export const utf8ToBytes = (input: string): Uint8Array => {
  return new TextEncoder().encode(input);
};

export const base64urlEncode = (bytes: Uint8Array): string => {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const base64urlDecode = (input: string): Uint8Array => {
  const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return new Uint8Array(Buffer.from(base64, "base64"));
};
