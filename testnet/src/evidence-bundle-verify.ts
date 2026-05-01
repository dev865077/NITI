import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';

const publicBundleKind = 'niti.v0_1_public_testnet_signet_activation_evidence_bundle.v1';
const lazyPublicBundleKind = 'niti.v0_2_lazy_public_testnet_signet_activation_evidence_bundle.v1';
const mainnetBundleKind = 'niti.v0_1_mainnet_activation_evidence_bundle.v1';
const lazyMainnetBundleKind = 'niti.v0_2_lazy_mainnet_activation_evidence_bundle.v1';

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

function assertAllChecks(bundle: Record<string, any>): void {
  const checks = assertObject(bundle.checks, 'checks');
  const failed = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);
  assert.deepEqual(failed, [], `failed bundle checks: ${failed.join(', ')}`);
}

function verifyActivationPath(
  repoRoot: string,
  activation: Record<string, any>,
): {
  transactionCount: number;
  parentFundingTx: Transaction;
  parentCetTx: Transaction;
  bridgeTx: Transaction;
  childPreparedCetTx: Transaction;
  childRefundTx: Transaction;
} {
  const parentFunding = assertObject(activation.parentFunding, 'activation.parentFunding');
  const parentCet = assertObject(activation.parentCet, 'activation.parentCet');
  const bridge = assertObject(activation.bridge, 'activation.bridge');
  const childPreparedCet = assertObject(activation.childPreparedCet, 'activation.childPreparedCet');
  const childRefund = assertObject(activation.childRefund, 'activation.childRefund');

  const parentFundingTx = readRawTx(repoRoot, assertObject(parentFunding.rawTx, 'parent funding raw'));
  const parentCetTx = readRawTx(repoRoot, assertObject(parentCet.rawTx, 'parent CET raw'));
  const bridgeTx = readRawTx(repoRoot, assertObject(bridge.rawTx, 'bridge raw'));
  const childPreparedCetTx = readRawTx(repoRoot, assertObject(childPreparedCet.rawTx, 'child prepared CET raw'));
  const childRefundTx = readRawTx(repoRoot, assertObject(childRefund.rawTx, 'child refund raw'));

  verifyTxid('parent funding', parentFundingTx, parentFunding.txid);
  verifyTxid('parent CET', parentCetTx, parentCet.txid);
  verifyTxid('bridge', bridgeTx, bridge.txid);
  verifyTxid('child refund', childRefundTx, childRefund.txid);
  assert.equal(childPreparedCetTx.getId(), childPreparedCet.txidNoWitness);

  assert.equal(inputTxid(parentCetTx, 0), parentFunding.txid);
  assert.equal(inputVout(parentCetTx, 0), parentFunding.vout);
  assert.equal(inputTxid(bridgeTx, 0), parentCet.txid);
  assert.equal(inputVout(bridgeTx, 0), 0);
  assert.equal(inputTxid(childPreparedCetTx, 0), bridge.txid);
  assert.equal(inputVout(childPreparedCetTx, 0), 0);
  assert.equal(inputTxid(childRefundTx, 0), bridge.txid);
  assert.equal(inputVout(childRefundTx, 0), 0);

  assert.equal(outputScript(parentCetTx, 0), parentCet.output.scriptPubKeyHex);
  assert.equal(outputValue(parentCetTx, 0), parentCet.output.valueSat);
  assert.equal(outputScript(bridgeTx, 0), bridge.output.scriptPubKeyHex);
  assert.equal(outputValue(bridgeTx, 0), bridge.output.valueSat);

  assert.equal(parentCet.signatureState, 'completed-schnorr-signature-after-parent-oracle-attestation');
  assert.equal(bridge.completion.signatureState, 'completed-schnorr-signature-after-parent-oracle-attestation');
  assert.equal(
    bridge.adaptor.signatureState,
    'adaptor-signature-not-valid-bitcoin-witness-before-parent-oracle-attestation',
  );
  assert.equal(
    childPreparedCet.adaptor.signatureState,
    'adaptor-signature-not-valid-bitcoin-witness-before-child-oracle-attestation',
  );
  assert.equal(childPreparedCet.adaptor.preResolutionSignatureVerifies, false);
  assert.equal(childRefund.signatureState, 'complete-schnorr-signature-but-timelocked');
  assert.equal(childRefund.earlyMempoolAccept.allowed, false);

  return {
    transactionCount: 5,
    parentFundingTx,
    parentCetTx,
    bridgeTx,
    childPreparedCetTx,
    childRefundTx,
  };
}

function verifyLazyWindow(bundle: Record<string, any>, activation: Record<string, any>): void {
  const oracle = assertObject(bundle.oracle, 'oracle');
  const manifest = assertObject(bundle.lazyWindow, 'lazyWindow');
  assert.equal(manifest.kind, 'niti.v0_2_lazy_cdlc_window_manifest.v1');
  assert.equal(manifest.network, bundle.network);

  const window = assertObject(manifest.window, 'lazyWindow.window');
  assert.equal(window.k, 2);
  assert.equal(window.activeNodeId, 'C_0');
  assert.deepEqual(window.preparedNodeIds, ['C_1']);

  const edges = manifest.liveEdges;
  assert.ok(Array.isArray(edges), 'lazyWindow.liveEdges must be an array');
  assert.equal(edges.length, 1);
  const edge = assertObject(edges[0], 'lazyWindow.liveEdges[0]');
  assert.equal(edge.from, 'C_0');
  assert.equal(edge.to, 'C_1');
  assert.equal(edge.oracleEventId, oracle.eventId);
  assert.equal(edge.activatingOutcome, oracle.activatingOutcome);
  assert.equal(edge.wrongOutcome, oracle.wrongOutcome);
  assert.equal(edge.adaptorPointCompressedHex, oracle.activatingAttestationPointCompressedHex);
  assert.equal(edge.wrongOutcomeAttestationPointCompressedHex, oracle.wrongAttestationPointCompressedHex);

  const parentCet = assertObject(activation.parentCet, 'activation.parentCet');
  const bridge = assertObject(activation.bridge, 'activation.bridge');
  const childPreparedCet = assertObject(activation.childPreparedCet, 'activation.childPreparedCet');
  assert.equal(edge.parentCetTxidNoWitness, parentCet.txid);
  assert.equal(edge.bridgeTxidNoWitness, bridge.txid);
  assert.equal(childPreparedCet.input.txid, bridge.txid);
  assert.equal(childPreparedCet.input.vout, 0);
  assert.equal(childPreparedCet.input.valueSat, bridge.output.valueSat);

  const invariants = assertObject(manifest.invariants, 'lazyWindow.invariants');
  assert.equal(invariants.activeNodeInWindow, true);
  assert.equal(invariants.preparedChildInWindow, true);
  assert.equal(invariants.childPreparedBeforeParentCompletion, true);
  assert.equal(invariants.bridgeAdaptorPointEqualsParentOutcomePoint, true);
  assert.equal(invariants.childSpendsPreparedBridgeOutput, true);
  assert.equal(invariants.bridgePreResolutionSignatureIsNotValidBitcoinSignature, true);
  assert.equal(invariants.wrongOutcomeScalarRejected, true);
}

function verifyBilateralLazyActivation(bundle: Record<string, any>, activation: Record<string, any>): void {
  if (bundle.bilateralLazyActivation === undefined) {
    return;
  }
  const evidence = assertObject(bundle.bilateralLazyActivation, 'bilateralLazyActivation');
  assert.equal(evidence.kind, 'niti.v0_2_bilateral_lazy_activation_holder_evidence.v1');
  assert.equal(evidence.signerSecretsAvailableToHolders, false);
  assert.equal(evidence.preparedEdgePackageKind, 'niti.l3.lazy_prepared_edge_package.v1');
  assert.equal(evidence.wrongOutcomeRejected, true);
  assert.equal(evidence.missingPackageRejected, true);

  const bridge = assertObject(activation.bridge, 'activation.bridge');
  const holders = evidence.holders;
  assert.ok(Array.isArray(holders), 'bilateralLazyActivation.holders must be an array');
  assert.deepEqual(
    holders.map((holder: Record<string, any>) => holder.holder),
    ['alice', 'bob', 'watchtower'],
  );
  for (const holder of holders.map((value: unknown, index: number) =>
    assertObject(value, `bilateralLazyActivation.holders[${index}]`))) {
    assert.equal(holder.txid, bridge.txid);
    assert.equal(holder.verifies, true);
    assert.equal(holder.rawTxMatchesBroadcastBridge, true);
    assert.equal(holder.extractedSecretMatchesOracle, true);
  }

  const checks = assertObject(evidence.checks, 'bilateralLazyActivation.checks');
  const failed = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);
  assert.deepEqual(failed, [], `failed bilateral lazy activation checks: ${failed.join(', ')}`);
  const bundleChecks = assertObject(bundle.checks, 'checks');
  assert.equal(bundleChecks.lazyBilateralHolderActivation, true);
}

function verifyRegtestBundle(repoRoot: string, bundle: Record<string, any>): number {
  assert.equal(bundle.kind, 'niti.v0_1_testnet_signet_tx_evidence_bundle.v1');
  assert.equal(bundle.issue, 132);
  assert.equal(bundle.network, 'regtest');
  assert.match(bundle.boundary, /real RPC broadcast/);
  assert.match(bundle.boundary, /not public testnet\/signet/);

  assertAllChecks(bundle);

  const activation = assertObject(bundle.activationPath, 'activationPath');
  const timeout = assertObject(bundle.timeoutPath, 'timeoutPath');
  verifyActivationPath(repoRoot, activation);

  const timeoutFunding = assertObject(timeout.parentFunding, 'timeout.parentFunding');
  const timeoutParentCet = assertObject(timeout.parentCet, 'timeout.parentCet');
  const timeoutRefund = assertObject(timeout.edgeTimeoutRefund, 'timeout.edgeTimeoutRefund');

  const timeoutFundingTx = readRawTx(repoRoot, assertObject(timeoutFunding.rawTx, 'timeout funding raw'));
  const timeoutParentCetTx = readRawTx(repoRoot, assertObject(timeoutParentCet.rawTx, 'timeout parent CET raw'));
  const timeoutRefundTx = readRawTx(repoRoot, assertObject(timeoutRefund.rawTx, 'timeout refund raw'));

  verifyTxid('timeout funding', timeoutFundingTx, timeoutFunding.txid);
  verifyTxid('timeout parent CET', timeoutParentCetTx, timeoutParentCet.txid);
  verifyTxid('timeout refund', timeoutRefundTx, timeoutRefund.txid);

  assert.equal(inputTxid(timeoutParentCetTx, 0), timeoutFunding.txid);
  assert.equal(inputVout(timeoutParentCetTx, 0), timeoutFunding.vout);
  assert.equal(inputTxid(timeoutRefundTx, 0), timeoutParentCet.txid);
  assert.equal(inputVout(timeoutRefundTx, 0), 0);

  assert.equal(outputScript(timeoutParentCetTx, 0), timeoutParentCet.output.scriptPubKeyHex);
  assert.equal(outputValue(timeoutParentCetTx, 0), timeoutParentCet.output.valueSat);
  assert.equal(outputScript(timeoutRefundTx, 0), timeoutRefund.output.scriptPubKeyHex);
  assert.equal(outputValue(timeoutRefundTx, 0), timeoutRefund.output.valueSat);

  assert.equal(timeoutRefund.earlyMempoolAccept.allowed, false);
  assert.equal(timeoutRefund.matureMempoolAccept.allowed, true);

  return 8;
}

function verifyPublicBundle(repoRoot: string, bundle: Record<string, any>): number {
  assert.ok([publicBundleKind, lazyPublicBundleKind].includes(bundle.kind));
  if (bundle.kind === publicBundleKind) {
    assert.equal(bundle.issue, 153);
    assert.equal(bundle.parentEpic, 56);
  }
  assert.ok(['signet', 'testnet', 'testnet4'].includes(bundle.network));
  assert.match(bundle.boundary, /Public signet\/testnet/);
  assert.match(bundle.boundary, /not regtest mining/);
  assertAllChecks(bundle);
  const activation = assertObject(bundle.activationPath, 'activationPath');
  const result = verifyActivationPath(repoRoot, activation);
  if (bundle.kind === lazyPublicBundleKind) {
    verifyLazyWindow(bundle, activation);
    verifyBilateralLazyActivation(bundle, activation);
  }
  return result.transactionCount;
}

function verifyMainnetBundle(repoRoot: string, bundle: Record<string, any>): number {
  assert.ok([mainnetBundleKind, lazyMainnetBundleKind].includes(bundle.kind));
  assert.equal(bundle.network, 'mainnet');
  assert.match(bundle.boundary, /Mainnet Bitcoin execution/);
  assertAllChecks(bundle);
  const activation = assertObject(bundle.activationPath, 'activationPath');
  const result = verifyActivationPath(repoRoot, activation);
  if (bundle.kind === lazyMainnetBundleKind) {
    verifyLazyWindow(bundle, activation);
    verifyBilateralLazyActivation(bundle, activation);
  }
  return result.transactionCount;
}

function main(): void {
  const bundlePath = stringArg(
    process.argv.slice(2),
    '--bundle',
    'docs/evidence/regtest-cdlc/tx-evidence-bundle.json',
  );
  const repoRoot = process.cwd();
  const bundle = assertObject(JSON.parse(fs.readFileSync(bundlePath, 'utf8')), 'bundle');
  const checkedTransactions =
    [publicBundleKind, lazyPublicBundleKind].includes(bundle.kind)
      ? verifyPublicBundle(repoRoot, bundle)
      : [mainnetBundleKind, lazyMainnetBundleKind].includes(bundle.kind)
        ? verifyMainnetBundle(repoRoot, bundle)
      : verifyRegtestBundle(repoRoot, bundle);

  console.log(JSON.stringify({
    ok: true,
    bundle: bundlePath,
    checkedTransactions,
  }, null, 2));
}

main();
