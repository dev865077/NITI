import assert from 'node:assert/strict';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  pointFromCompressed,
  scalarFromHex,
} from './secp.js';
import {
  buildTaprootAdaptorSpend,
  completeTaprootAdaptorSpend,
  deriveTaprootWallet,
} from './taproot.js';

const network = 'testnet4' as const;

const wallet = deriveTaprootWallet({
  network,
  internalSecret: scalarFromHex(
    '1111111111111111111111111111111111111111111111111111111111111111',
    'test secret',
  ),
});

const destination = wallet.address;

const prepared = prepareOracleOutcome({
  eventId: 'niti-offline-test',
  outcome: 'BTCUSD_ABOVE_STRIKE',
  oracleSecret: scalarFromHex(
    '2222222222222222222222222222222222222222222222222222222222222222',
    'oracle secret',
  ),
  nonceSecret: scalarFromHex(
    '3333333333333333333333333333333333333333333333333333333333333333',
    'oracle nonce',
  ),
});

const attestation = attestOracleOutcome({
  eventId: prepared.eventId,
  outcome: prepared.outcome,
  oracleSecret: scalarFromHex(prepared.oracleSecretHex, 'oracle secret'),
  nonceSecret: scalarFromHex(prepared.nonceSecretHex, 'nonce secret'),
});
assert.equal(attestation.verifies, true);
assert.equal(attestation.attestationPointCompressedHex, prepared.attestationPointCompressedHex);

const pending = buildTaprootAdaptorSpend({
  network,
  signerOutputSecret: scalarFromHex(wallet.outputSecretHex, 'output secret'),
  signerScriptPubKeyHex: wallet.scriptPubKeyHex,
  utxo: {
    txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    vout: 0,
    valueSat: 10_000n,
  },
  destinationAddress: destination,
  feeSat: 500n,
  adaptorPoint: pointFromCompressed(prepared.attestationPointCompressedHex),
});

assert.equal(pending.adaptor.verifiesAdaptor, true);

const completed = completeTaprootAdaptorSpend({
  pending,
  attestationSecret: scalarFromHex(attestation.attestationSecretHex, 'attestation secret'),
});

assert.equal(completed.verifies, true);
assert.equal(completed.extractedSecretHex, attestation.attestationSecretHex);
assert.ok(completed.rawTxHex.length > pending.unsignedTxHex.length);

console.log(JSON.stringify({
  walletAddress: wallet.address,
  oracleSignatureVerifies: attestation.verifies,
  adaptorVerifies: pending.adaptor.verifiesAdaptor,
  completedSignatureVerifies: completed.verifies,
  txid: completed.txid,
}, null, 2));
