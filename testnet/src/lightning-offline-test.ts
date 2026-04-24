import assert from 'node:assert/strict';
import {
  attestLightningOracle,
  prepareLightningOracleLock,
  runMockLightningFlow,
  sampleLightningManifest,
  sha256HexFromHex,
  validateLightningManifest,
} from './lightning.js';
import { scalarFromHex } from './secp.js';

const oracleSecret = scalarFromHex(
  '2222222222222222222222222222222222222222222222222222222222222222',
  'oracle secret',
);
const nonceSecret = scalarFromHex(
  '3333333333333333333333333333333333333333333333333333333333333333',
  'nonce secret',
);

const lock = prepareLightningOracleLock({
  eventId: 'niti-lightning-offline',
  outcome: 'BTCUSD_ABOVE_STRIKE',
  oracleSecret,
  nonceSecret,
  includeTestSecrets: true,
});

assert.equal(lock.kind, 'niti.lightning_oracle_lock.v1');
assert.equal(lock.paymentHashHex.length, 64);
assert.equal(lock.testOnlySecrets?.oracleSecretHex.length, 64);

const attestation = attestLightningOracle({
  eventId: lock.eventId,
  outcome: lock.outcome,
  oracleSecret,
  nonceSecret,
  expectedPaymentHashHex: lock.paymentHashHex,
});

assert.equal(attestation.verifies, true);
assert.equal(attestation.paymentHashMatches, true);
assert.equal(sha256HexFromHex(attestation.paymentPreimageHex), lock.paymentHashHex);
assert.equal(attestation.attestationPointCompressedHex, lock.attestationPointCompressedHex);

const manifest = sampleLightningManifest('regtest');
assert.deepEqual(validateLightningManifest(manifest), { ok: true, errors: [] });

const mock = runMockLightningFlow();
assert.equal((mock.attestation as { verifies: boolean }).verifies, true);
assert.equal((mock.invoice as { settled: boolean }).settled, true);
assert.equal((mock.invoice as { wrongPreimageRejected: boolean }).wrongPreimageRejected, true);

console.log(JSON.stringify({
  paymentHashHex: lock.paymentHashHex,
  oracleSignatureVerifies: attestation.verifies,
  paymentHashMatches: attestation.paymentHashMatches,
  manifestValid: true,
  mockSettled: true,
}, null, 2));
