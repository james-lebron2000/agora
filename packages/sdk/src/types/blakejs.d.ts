// Type declarations for blakejs
declare module 'blakejs/blake2b' {
  export function blake2bInit(outLength: number, key: Uint8Array | null): any;
  export function blake2bUpdate(context: any, data: Uint8Array): void;
  export function blake2bFinal(context: any): Uint8Array;
}

// Type declarations for tweetnacl-sealedbox-js
declare module 'tweetnacl-sealedbox-js' {
  export const overheadLength: number;
  export function seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  export function open(sealedBox: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array | null;
  export default { seal, open, overheadLength };
}
