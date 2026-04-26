import { Point, etc, hashes, schnorr, utils } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { crypto as btcCrypto } from 'bitcoinjs-lib';
import {
  bytesToHex,
  bytesToNumber,
  concatBytes,
  hexToBytes,
  numberToBytes32,
  utf8Bytes,
} from './bytes.js';

hashes.sha256 = ((message: Uint8Array) => Uint8Array.from(sha256(message))) as NonNullable<
  typeof hashes.sha256
>;

export const CURVE_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export function modN(value: bigint): bigint {
  const result = value % CURVE_N;
  return result >= 0n ? result : result + CURVE_N;
}

export function randomScalar(): bigint {
  return bytesToNumber(utils.randomSecretKey());
}

export function scalarFromHex(hex: string, name = 'scalar'): bigint {
  const value = bytesToNumber(hexToBytes(hex));
  if (value <= 0n || value >= CURVE_N) {
    throw new Error(`${name} must be in [1, n-1]`);
  }
  return value;
}

export function scalarToHex(value: bigint): string {
  return bytesToHex(numberToBytes32(modN(value)));
}

export function pointToCompressed(point: Point): string {
  return point.toHex(true);
}

export function pointToXOnly(point: Point): Uint8Array {
  return numberToBytes32(point.x);
}

export function pointXOnlyHex(point: Point): string {
  return bytesToHex(pointToXOnly(point));
}

export function pointFromCompressed(hex: string): Point {
  return Point.fromHex(hex);
}

export function evenPointFromXOnly(xOnly: Uint8Array): Point {
  return Point.fromHex(`02${bytesToHex(xOnly)}`);
}

export function hasEvenY(point: Point): boolean {
  return point.y % 2n === 0n;
}

export function normalizeBip340Secret(secret: bigint): {
  secret: bigint;
  point: Point;
} {
  const point = Point.BASE.multiply(secret);
  if (hasEvenY(point)) {
    return { secret, point };
  }
  const adjusted = CURVE_N - secret;
  return { secret: adjusted, point: point.negate() };
}

export function bip340Challenge(rx: Uint8Array, px: Uint8Array, message32: Uint8Array): bigint {
  if (rx.length !== 32 || px.length !== 32 || message32.length !== 32) {
    throw new Error('BIP340 challenge requires 32-byte R, P, and message');
  }
  return modN(bytesToNumber(btcCrypto.taggedHash(
    'BIP0340/challenge',
    concatBytes(rx, px, message32),
  )));
}

export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  return sha256(bytes);
}

export function sha256Text(text: string): Uint8Array {
  return sha256Bytes(utf8Bytes(text));
}

export interface OraclePreparedOutcome {
  eventId: string;
  outcome: string;
  messageHashHex: string;
  oracleSecretHex: string;
  oraclePublicXOnlyHex: string;
  oraclePublicCompressedHex: string;
  nonceSecretHex: string;
  noncePointXOnlyHex: string;
  noncePointCompressedHex: string;
  attestationPointCompressedHex: string;
}

export interface OracleAttestation {
  eventId: string;
  outcome: string;
  messageHashHex: string;
  attestationSecretHex: string;
  attestationPointCompressedHex: string;
  bip340SignatureHex: string;
  verifies: boolean;
}

export function prepareOracleOutcome(input: {
  eventId: string;
  outcome: string;
  oracleSecret?: bigint;
  nonceSecret?: bigint;
}): OraclePreparedOutcome {
  const oracleRaw = input.oracleSecret ?? randomScalar();
  const nonceRaw = input.nonceSecret ?? randomScalar();
  const oracle = normalizeBip340Secret(oracleRaw);
  const nonce = normalizeBip340Secret(nonceRaw);
  const messageHash = sha256Text(`${input.eventId}:${input.outcome}`);
  const challenge = bip340Challenge(
    pointToXOnly(nonce.point),
    pointToXOnly(oracle.point),
    messageHash,
  );
  const attestationPoint = nonce.point.add(oracle.point.multiply(challenge));

  return {
    eventId: input.eventId,
    outcome: input.outcome,
    messageHashHex: bytesToHex(messageHash),
    oracleSecretHex: scalarToHex(oracle.secret),
    oraclePublicXOnlyHex: pointXOnlyHex(oracle.point),
    oraclePublicCompressedHex: pointToCompressed(oracle.point),
    nonceSecretHex: scalarToHex(nonce.secret),
    noncePointXOnlyHex: pointXOnlyHex(nonce.point),
    noncePointCompressedHex: pointToCompressed(nonce.point),
    attestationPointCompressedHex: pointToCompressed(attestationPoint),
  };
}

export function attestOracleOutcome(input: {
  eventId: string;
  outcome: string;
  oracleSecret: bigint;
  nonceSecret: bigint;
}): OracleAttestation {
  const prepared = prepareOracleOutcome(input);
  const oracleSecret = scalarFromHex(prepared.oracleSecretHex, 'oracleSecret');
  const nonceSecret = scalarFromHex(prepared.nonceSecretHex, 'nonceSecret');
  const messageHash = hexToBytes(prepared.messageHashHex);
  const oraclePoint = evenPointFromXOnly(hexToBytes(prepared.oraclePublicXOnlyHex));
  const noncePoint = evenPointFromXOnly(hexToBytes(prepared.noncePointXOnlyHex));
  const challenge = bip340Challenge(
    pointToXOnly(noncePoint),
    pointToXOnly(oraclePoint),
    messageHash,
  );
  const attestationSecret = modN(nonceSecret + challenge * oracleSecret);
  const signature = concatBytes(pointToXOnly(noncePoint), numberToBytes32(attestationSecret));
  const verifies = schnorr.verify(signature, messageHash, pointToXOnly(oraclePoint));

  return {
    eventId: input.eventId,
    outcome: input.outcome,
    messageHashHex: prepared.messageHashHex,
    attestationSecretHex: scalarToHex(attestationSecret),
    attestationPointCompressedHex: prepared.attestationPointCompressedHex,
    bip340SignatureHex: bytesToHex(signature),
    verifies,
  };
}

export interface AdaptorSignature {
  signerPublicXOnlyHex: string;
  signerPublicCompressedHex: string;
  adaptorPointCompressedHex: string;
  adaptedNonceXOnlyHex: string;
  adaptedNonceCompressedHex: string;
  preNonceCompressedHex: string;
  adaptorSignatureScalarHex: string;
  messageHashHex: string;
  verifiesAdaptor: boolean;
}

export interface Bip340Signature {
  signerPublicXOnlyHex: string;
  signerPublicCompressedHex: string;
  nonceXOnlyHex: string;
  nonceCompressedHex: string;
  signatureScalarHex: string;
  signatureHex: string;
  messageHashHex: string;
  verifies: boolean;
}

export function createBip340Signature(input: {
  signerSecret: bigint;
  message32: Uint8Array;
  nonceSecret?: bigint;
}): Bip340Signature {
  if (input.message32.length !== 32) {
    throw new Error('BIP340 signature message must be 32 bytes');
  }
  const signer = normalizeBip340Secret(input.signerSecret);
  const nonce = normalizeBip340Secret(input.nonceSecret ?? randomScalar());
  const publicX = pointToXOnly(signer.point);
  const nonceX = pointToXOnly(nonce.point);
  const challenge = bip340Challenge(nonceX, publicX, input.message32);
  const signatureScalar = modN(nonce.secret + challenge * signer.secret);
  const signature = concatBytes(nonceX, numberToBytes32(signatureScalar));
  const verifies = schnorr.verify(signature, input.message32, publicX);

  return {
    signerPublicXOnlyHex: bytesToHex(publicX),
    signerPublicCompressedHex: pointToCompressed(signer.point),
    nonceXOnlyHex: bytesToHex(nonceX),
    nonceCompressedHex: pointToCompressed(nonce.point),
    signatureScalarHex: scalarToHex(signatureScalar),
    signatureHex: bytesToHex(signature),
    messageHashHex: bytesToHex(input.message32),
    verifies,
  };
}

export function createBip340AdaptorSignature(input: {
  signerSecret: bigint;
  adaptorPoint: Point;
  message32: Uint8Array;
  nonceSecret?: bigint;
}): AdaptorSignature {
  if (input.message32.length !== 32) {
    throw new Error('adaptor signature message must be 32 bytes');
  }
  const signer = normalizeBip340Secret(input.signerSecret);
  const publicX = pointToXOnly(signer.point);

  const nonceSecrets = input.nonceSecret === undefined
    ? undefined
    : [input.nonceSecret];
  const attempts = nonceSecrets?.length ?? 10_000;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const nonce = normalizeBip340Secret(nonceSecrets?.[attempt] ?? randomScalar());
    const adaptedNonce = nonce.point.add(input.adaptorPoint);
    if (adaptedNonce.is0() || !hasEvenY(adaptedNonce)) {
      continue;
    }
    const challenge = bip340Challenge(pointToXOnly(adaptedNonce), publicX, input.message32);
    const adaptorScalar = modN(nonce.secret + challenge * signer.secret);
    const left = Point.BASE.multiply(adaptorScalar);
    const right = adaptedNonce
      .subtract(input.adaptorPoint)
      .add(signer.point.multiply(challenge));
    const verifiesAdaptor = left.equals(right);

    return {
      signerPublicXOnlyHex: bytesToHex(publicX),
      signerPublicCompressedHex: pointToCompressed(signer.point),
      adaptorPointCompressedHex: pointToCompressed(input.adaptorPoint),
      adaptedNonceXOnlyHex: pointXOnlyHex(adaptedNonce),
      adaptedNonceCompressedHex: pointToCompressed(adaptedNonce),
      preNonceCompressedHex: pointToCompressed(nonce.point),
      adaptorSignatureScalarHex: scalarToHex(adaptorScalar),
      messageHashHex: bytesToHex(input.message32),
      verifiesAdaptor,
    };
  }

  throw new Error(input.nonceSecret === undefined
    ? 'could not find an even adapted nonce'
    : 'deterministic adaptor nonce produced an invalid adapted nonce');
}

export function completeAdaptorSignature(input: {
  adaptorSignatureScalar: bigint;
  attestationSecret: bigint;
  adaptedNonceXOnly: Uint8Array;
  signerPublicXOnly: Uint8Array;
  message32: Uint8Array;
}): {
  signatureHex: string;
  completedScalarHex: string;
  verifies: boolean;
  extractedSecretHex: string;
} {
  const completed = modN(input.adaptorSignatureScalar + input.attestationSecret);
  const signature = concatBytes(input.adaptedNonceXOnly, numberToBytes32(completed));
  const verifies = schnorr.verify(signature, input.message32, input.signerPublicXOnly);
  const extracted = modN(completed - input.adaptorSignatureScalar);
  return {
    signatureHex: bytesToHex(signature),
    completedScalarHex: scalarToHex(completed),
    verifies,
    extractedSecretHex: scalarToHex(extracted),
  };
}
