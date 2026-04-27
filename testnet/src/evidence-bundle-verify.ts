import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';

function stringArg(args: string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  if (index === -1) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`${name} is required`);
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function assertObject(value: unknown, name: string): Record<string, any> {
  assert.equal(typeof value, 'object', `${name} must be an object`);
  assert.notEqual(value, null, `${name} must not be null`);
  return value as Record<string, any>;
}

function inputTxid(tx: Transaction, index: number): string {
  const input = tx.ins[index];
  assert.ok(input, `missing input ${index}`);
  return bytesToHex(Buffer.from(input.hash).reverse());
}

function inputVout(tx: Transaction, index: number): number {
  const input = tx.ins[index];
  assert.ok(input, `missing input ${index}`);
  return input.index;
}

function outputScript(tx: Transaction, index: number): string {
  const output = tx.outs[index];
  assert.ok(output, `missing output ${index}`);
  return bytesToHex(output.script);
}

function outputValue(tx: Transaction, index: number): string {
  const output = tx.outs[index];
  assert.ok(output, `missing output ${index}`);
  return output.value.toString();
}

function readRawTx(repoRoot: string, artifact: Record<string, any>): Transaction {
  assert.equal(typeof artifact.path, 'string');
  assert.equal(typeof artifact.rawTxHex, 'string');
  const rawPath = path.join(repoRoot, artifact.path);
  const fileHex = fs.readFileSync(rawPath, 'utf8').trim();
  assert.equal(fileHex, artifact.rawTxHex, `raw tx file mismatch: ${artifact.path}`);
  return Transaction.fromHex(artifact.rawTxHex);
}

function verifyTxid(name: string, tx: Transaction, expectedTxid: string): void {
  assert.equal(tx.getId(), expectedTxid, `${name} txid mismatch`);
}

function main(): void {
  const bundlePath = stringArg(
    process.argv.slice(2),
    '--bundle',
    'docs/evidence/issue-132-regtest/tx-evidence-bundle.json',
  );
  const repoRoot = process.cwd();
  const bundle = assertObject(JSON.parse(fs.readFileSync(bundlePath, 'utf8')), 'bundle');
  assert.equal(bundle.kind, 'niti.v0_1_testnet_signet_tx_evidence_bundle.v1');
  assert.equal(bundle.issue, 132);
  assert.equal(bundle.network, 'regtest');
  assert.match(bundle.boundary, /real RPC broadcast/);
  assert.match(bundle.boundary, /not public testnet\/signet/);

  const checks = assertObject(bundle.checks, 'checks');
  const failed = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);
  assert.deepEqual(failed, [], `failed bundle checks: ${failed.join(', ')}`);

  const activation = assertObject(bundle.activationPath, 'activationPath');
  const timeout = assertObject(bundle.timeoutPath, 'timeoutPath');

  const activationFunding = assertObject(activation.parentFunding, 'activation.parentFunding');
  const activationParentCet = assertObject(activation.parentCet, 'activation.parentCet');
  const activationBridge = assertObject(activation.bridge, 'activation.bridge');
  const childPreparedCet = assertObject(activation.childPreparedCet, 'activation.childPreparedCet');
  const childRefund = assertObject(activation.childRefund, 'activation.childRefund');
  const timeoutFunding = assertObject(timeout.parentFunding, 'timeout.parentFunding');
  const timeoutParentCet = assertObject(timeout.parentCet, 'timeout.parentCet');
  const timeoutRefund = assertObject(timeout.edgeTimeoutRefund, 'timeout.edgeTimeoutRefund');

  const activationFundingTx = readRawTx(repoRoot, assertObject(activationFunding.rawTx, 'activation funding raw'));
  const activationParentCetTx = readRawTx(repoRoot, assertObject(activationParentCet.rawTx, 'activation parent CET raw'));
  const activationBridgeTx = readRawTx(repoRoot, assertObject(activationBridge.rawTx, 'activation bridge raw'));
  const childPreparedCetTx = readRawTx(repoRoot, assertObject(childPreparedCet.rawTx, 'child prepared CET raw'));
  const childRefundTx = readRawTx(repoRoot, assertObject(childRefund.rawTx, 'child refund raw'));
  const timeoutFundingTx = readRawTx(repoRoot, assertObject(timeoutFunding.rawTx, 'timeout funding raw'));
  const timeoutParentCetTx = readRawTx(repoRoot, assertObject(timeoutParentCet.rawTx, 'timeout parent CET raw'));
  const timeoutRefundTx = readRawTx(repoRoot, assertObject(timeoutRefund.rawTx, 'timeout refund raw'));

  verifyTxid('activation funding', activationFundingTx, activationFunding.txid);
  verifyTxid('activation parent CET', activationParentCetTx, activationParentCet.txid);
  verifyTxid('activation bridge', activationBridgeTx, activationBridge.txid);
  verifyTxid('child refund', childRefundTx, childRefund.txid);
  verifyTxid('timeout funding', timeoutFundingTx, timeoutFunding.txid);
  verifyTxid('timeout parent CET', timeoutParentCetTx, timeoutParentCet.txid);
  verifyTxid('timeout refund', timeoutRefundTx, timeoutRefund.txid);
  assert.equal(childPreparedCetTx.getId(), childPreparedCet.txidNoWitness);

  assert.equal(inputTxid(activationParentCetTx, 0), activationFunding.txid);
  assert.equal(inputVout(activationParentCetTx, 0), activationFunding.vout);
  assert.equal(inputTxid(activationBridgeTx, 0), activationParentCet.txid);
  assert.equal(inputVout(activationBridgeTx, 0), 0);
  assert.equal(inputTxid(childPreparedCetTx, 0), activationBridge.txid);
  assert.equal(inputVout(childPreparedCetTx, 0), 0);
  assert.equal(inputTxid(childRefundTx, 0), activationBridge.txid);
  assert.equal(inputVout(childRefundTx, 0), 0);
  assert.equal(inputTxid(timeoutParentCetTx, 0), timeoutFunding.txid);
  assert.equal(inputVout(timeoutParentCetTx, 0), timeoutFunding.vout);
  assert.equal(inputTxid(timeoutRefundTx, 0), timeoutParentCet.txid);
  assert.equal(inputVout(timeoutRefundTx, 0), 0);

  assert.equal(outputScript(activationParentCetTx, 0), activationParentCet.output.scriptPubKeyHex);
  assert.equal(outputValue(activationParentCetTx, 0), activationParentCet.output.valueSat);
  assert.equal(outputScript(activationBridgeTx, 0), activationBridge.output.scriptPubKeyHex);
  assert.equal(outputValue(activationBridgeTx, 0), activationBridge.output.valueSat);
  assert.equal(outputScript(timeoutParentCetTx, 0), timeoutParentCet.output.scriptPubKeyHex);
  assert.equal(outputValue(timeoutParentCetTx, 0), timeoutParentCet.output.valueSat);
  assert.equal(outputScript(timeoutRefundTx, 0), timeoutRefund.output.scriptPubKeyHex);
  assert.equal(outputValue(timeoutRefundTx, 0), timeoutRefund.output.valueSat);

  assert.equal(activationParentCet.signatureState, 'completed-schnorr-signature-after-parent-oracle-attestation');
  assert.equal(activationBridge.completion.signatureState, 'completed-schnorr-signature-after-parent-oracle-attestation');
  assert.equal(
    activationBridge.adaptor.signatureState,
    'adaptor-signature-not-valid-bitcoin-witness-before-parent-oracle-attestation',
  );
  assert.equal(
    childPreparedCet.adaptor.signatureState,
    'adaptor-signature-not-valid-bitcoin-witness-before-child-oracle-attestation',
  );
  assert.equal(childPreparedCet.adaptor.preResolutionSignatureVerifies, false);
  assert.equal(childRefund.signatureState, 'complete-schnorr-signature-but-timelocked');
  assert.equal(childRefund.earlyMempoolAccept.allowed, false);
  assert.equal(timeoutRefund.earlyMempoolAccept.allowed, false);
  assert.equal(timeoutRefund.matureMempoolAccept.allowed, true);

  console.log(JSON.stringify({
    ok: true,
    bundle: bundlePath,
    checkedTransactions: 8,
  }, null, 2));
}

main();
