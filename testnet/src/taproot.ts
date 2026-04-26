import { address, crypto as btcCrypto, initEccLib, networks, payments, Transaction } from 'bitcoinjs-lib';
import * as tinysecp from 'tiny-secp256k1';
import { Point } from '@noble/secp256k1';
import {
  bytesToHex,
  bytesToNumber,
  concatBytes,
  hexToBytes,
  numberToBytes32,
  requireHexBytes,
  reverseBytes,
} from './bytes.js';
import {
  completeAdaptorSignature,
  createBip340AdaptorSignature,
  CURVE_N,
  hasEvenY,
  modN,
  normalizeBip340Secret,
  pointFromCompressed,
  pointToCompressed,
  pointToXOnly,
  pointXOnlyHex,
  scalarFromHex,
  scalarToHex,
} from './secp.js';

initEccLib(tinysecp);

export type BitcoinNetworkName = 'testnet' | 'testnet4' | 'signet' | 'regtest';

export interface NitiNetwork {
  name: BitcoinNetworkName;
  bitcoinjs: typeof networks.testnet;
}

export function resolveNetwork(name: string | undefined): NitiNetwork {
  const value = (name ?? 'testnet4') as BitcoinNetworkName;
  if (!['testnet', 'testnet4', 'signet', 'regtest'].includes(value)) {
    throw new Error(`unsupported network: ${name}`);
  }
  return { name: value, bitcoinjs: networks.testnet };
}

export interface TaprootWallet {
  network: BitcoinNetworkName;
  internalSecretHex: string;
  internalPublicXOnlyHex: string;
  outputSecretHex: string;
  outputPublicXOnlyHex: string;
  outputPublicCompressedHex: string;
  address: string;
  scriptPubKeyHex: string;
}

export function deriveTaprootWallet(input: {
  internalSecret: bigint;
  network: BitcoinNetworkName;
}): TaprootWallet {
  const network = resolveNetwork(input.network);
  const internal = normalizeBip340Secret(input.internalSecret);
  const internalX = pointToXOnly(internal.point);
  const tweak = bytesToNumber(btcCrypto.taggedHash('TapTweak', internalX));
  if (tweak >= CURVE_N) {
    throw new Error('invalid TapTweak value');
  }
  const tweakedRaw = internal.point.add(Point.BASE.multiply(tweak));
  const outputSecretRaw = modN(internal.secret + tweak);
  const outputSecret = hasEvenY(tweakedRaw) ? outputSecretRaw : CURVE_N - outputSecretRaw;
  const outputPoint = hasEvenY(tweakedRaw) ? tweakedRaw : tweakedRaw.negate();
  const outputX = pointToXOnly(outputPoint);
  const payment = payments.p2tr(
    { pubkey: outputX, network: network.bitcoinjs },
    { validate: false },
  );
  if (!payment.address || !payment.output) {
    throw new Error('failed to derive p2tr payment');
  }
  return {
    network: input.network,
    internalSecretHex: scalarToHex(internal.secret),
    internalPublicXOnlyHex: bytesToHex(internalX),
    outputSecretHex: scalarToHex(outputSecret),
    outputPublicXOnlyHex: bytesToHex(outputX),
    outputPublicCompressedHex: pointToCompressed(outputPoint),
    address: payment.address,
    scriptPubKeyHex: bytesToHex(payment.output),
  };
}

export interface UtxoInput {
  txid: string;
  vout: number;
  valueSat: bigint;
}

export interface PendingTaprootAdaptorSpend {
  kind: 'niti.taproot_adaptor_spend.v1';
  network: BitcoinNetworkName;
  input: Omit<UtxoInput, 'valueSat'> & {
    valueSat: string;
    scriptPubKeyHex: string;
  };
  destinationAddress: string;
  sendValueSat: string;
  feeSat: string;
  unsignedTxHex: string;
  txidNoWitness: string;
  sighashHex: string;
  adaptor: {
    signerPublicXOnlyHex: string;
    signerPublicCompressedHex: string;
    adaptorPointCompressedHex: string;
    adaptedNonceXOnlyHex: string;
    adaptedNonceCompressedHex: string;
    preNonceCompressedHex: string;
    adaptorSignatureScalarHex: string;
    verifiesAdaptor: boolean;
  };
}

export interface CompletedTaprootAdaptorSpend {
  pending: PendingTaprootAdaptorSpend;
  attestationSecretHex: string;
  completedSignatureHex: string;
  rawTxHex: string;
  txid: string;
  verifies: boolean;
  extractedSecretHex: string;
}

export function buildTaprootAdaptorSpend(input: {
  network: BitcoinNetworkName;
  signerOutputSecret: bigint;
  signerScriptPubKeyHex: string;
  utxo: UtxoInput;
  destinationAddress: string;
  feeSat: bigint;
  adaptorPoint: Point;
  adaptorNonceSecret?: bigint;
}): PendingTaprootAdaptorSpend {
  const network = resolveNetwork(input.network);
  const scriptPubKey = requireHexBytes(input.signerScriptPubKeyHex, 34, 'signerScriptPubKey');
  const sendValue = input.utxo.valueSat - input.feeSat;
  if (sendValue <= 0n) {
    throw new Error('fee is greater than or equal to input value');
  }
  if (sendValue < 330n) {
    throw new Error('send value is below a conservative taproot dust floor');
  }

  const tx = new Transaction();
  tx.version = 2;
  tx.addInput(reverseBytes(requireHexBytes(input.utxo.txid, 32, 'utxo.txid')), input.utxo.vout);
  tx.addOutput(address.toOutputScript(input.destinationAddress, network.bitcoinjs), sendValue);

  const sighash = tx.hashForWitnessV1(
    0,
    [scriptPubKey],
    [input.utxo.valueSat],
    Transaction.SIGHASH_DEFAULT,
  );
  const adaptor = createBip340AdaptorSignature({
    signerSecret: input.signerOutputSecret,
    adaptorPoint: input.adaptorPoint,
    message32: sighash,
    ...(input.adaptorNonceSecret === undefined
      ? {}
      : { nonceSecret: input.adaptorNonceSecret }),
  });

  return {
    kind: 'niti.taproot_adaptor_spend.v1',
    network: input.network,
    input: {
      txid: input.utxo.txid,
      vout: input.utxo.vout,
      valueSat: input.utxo.valueSat.toString(),
      scriptPubKeyHex: input.signerScriptPubKeyHex,
    },
    destinationAddress: input.destinationAddress,
    sendValueSat: sendValue.toString(),
    feeSat: input.feeSat.toString(),
    unsignedTxHex: tx.toHex(),
    txidNoWitness: tx.getId(),
    sighashHex: bytesToHex(sighash),
    adaptor: {
      signerPublicXOnlyHex: adaptor.signerPublicXOnlyHex,
      signerPublicCompressedHex: adaptor.signerPublicCompressedHex,
      adaptorPointCompressedHex: adaptor.adaptorPointCompressedHex,
      adaptedNonceXOnlyHex: adaptor.adaptedNonceXOnlyHex,
      adaptedNonceCompressedHex: adaptor.adaptedNonceCompressedHex,
      preNonceCompressedHex: adaptor.preNonceCompressedHex,
      adaptorSignatureScalarHex: adaptor.adaptorSignatureScalarHex,
      verifiesAdaptor: adaptor.verifiesAdaptor,
    },
  };
}

export function completeTaprootAdaptorSpend(input: {
  pending: PendingTaprootAdaptorSpend;
  attestationSecret: bigint;
}): CompletedTaprootAdaptorSpend {
  const tx = Transaction.fromHex(input.pending.unsignedTxHex);
  const completed = completeAdaptorSignature({
    adaptorSignatureScalar: scalarFromHex(
      input.pending.adaptor.adaptorSignatureScalarHex,
      'adaptorSignatureScalar',
    ),
    attestationSecret: input.attestationSecret,
    adaptedNonceXOnly: hexToBytes(input.pending.adaptor.adaptedNonceXOnlyHex),
    signerPublicXOnly: hexToBytes(input.pending.adaptor.signerPublicXOnlyHex),
    message32: hexToBytes(input.pending.sighashHex),
  });
  if (!completed.verifies) {
    throw new Error('completed adaptor signature does not verify');
  }
  tx.setWitness(0, [hexToBytes(completed.signatureHex)]);
  return {
    pending: input.pending,
    attestationSecretHex: scalarToHex(input.attestationSecret),
    completedSignatureHex: completed.signatureHex,
    rawTxHex: tx.toHex(),
    txid: tx.getId(),
    verifies: completed.verifies,
    extractedSecretHex: completed.extractedSecretHex,
  };
}

export function parsePendingTaprootAdaptorSpend(value: unknown): PendingTaprootAdaptorSpend {
  if (!value || typeof value !== 'object') {
    throw new Error('pending spend must be an object');
  }
  const candidate = value as PendingTaprootAdaptorSpend;
  if (candidate.kind !== 'niti.taproot_adaptor_spend.v1') {
    throw new Error('unsupported pending spend kind');
  }
  return candidate;
}

export function adaptorPointFromHex(hex: string): Point {
  return pointFromCompressed(hex);
}
