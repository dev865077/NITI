import { etc } from '@noble/secp256k1';

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${hex}`);
  }
  return etc.hexToBytes(clean);
}

export function bytesToHex(bytes: Uint8Array): string {
  return etc.bytesToHex(bytes);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  return etc.concatBytes(...parts);
}

export function numberToBytes32(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error('cannot encode negative bigint');
  }
  const raw = etc.numberToBytesBE(value);
  if (raw.length > 32) {
    throw new Error('bigint does not fit in 32 bytes');
  }
  const out = new Uint8Array(32);
  out.set(raw, 32 - raw.length);
  return out;
}

export function bytesToNumber(bytes: Uint8Array): bigint {
  return etc.bytesToNumberBE(bytes);
}

export function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function reverseBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes).reverse();
}

export function requireHexBytes(hex: string, length: number, name: string): Uint8Array {
  const bytes = hexToBytes(hex);
  if (bytes.length !== length) {
    throw new Error(`${name} must be ${length} bytes, got ${bytes.length}`);
  }
  return bytes;
}
