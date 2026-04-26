import assert from 'node:assert/strict';
import fs from 'node:fs';

const REDACTED = '<redacted: deterministic test-only nonce secret>';
const REDACTED_FIELDS = new Set([
  'selectedAdaptorNonceSecretHex',
]);

function stringArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function usage(): never {
  throw new Error(
    'Usage: npm run test:l2-e2e-transcript -- --input raw.json [--out transcript.json]',
  );
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = REDACTED_FIELDS.has(key) ? REDACTED : redact(child);
  }
  return output;
}

function assertObject(value: unknown, name: string): Record<string, any> {
  assert.equal(typeof value, 'object', `${name} must be an object`);
  assert.notEqual(value, null, `${name} must not be null`);
  return value as Record<string, any>;
}

function buildChecks(raw: Record<string, any>): Record<string, boolean> {
  return {
    transcriptKind:
      raw.kind === 'niti.v0_1_cdlc_smoke_transcript.v1',
    fundingSignatureVerifies:
      raw.funding?.parentFunding?.signatureVerifies === true,
    parentCetStableTxid:
      raw.parent?.cetUnsignedTxid === raw.parent?.cetCompletedTxid,
    parentCetCompletedSignatureVerifies:
      raw.parent?.completedSignatureVerifies === true,
    parentWrongOutcomeRejected:
      raw.parent?.wrongOutcomeRejected === true,
    parentConfirmed:
      raw.parent?.confirmation?.confirmations === 1
      && raw.parent?.confirmation?.spendableByBridge === true,
    parentEdgeRefundEarlyRejected:
      raw.parent?.edgeTimeoutRefund?.timelockCheck?.earlySpendAccepted === false,
    parentEdgeRefundMatureAccepted:
      raw.parent?.edgeTimeoutRefund?.timelockCheck?.matureSpendAccepted === true,
    bridgeSpendsParentCet:
      raw.bridge?.spendsParentCetTxid === raw.parent?.cetCompletedTxid
      && raw.bridge?.spendsParentCetVout === 0,
    bridgeStableTxid:
      raw.bridge?.unsignedTxid === raw.bridge?.completedTxid,
    bridgeCompletedSignatureVerifies:
      raw.bridge?.completion?.completedSignatureVerifies === true,
    bridgeWrongScalarRejected:
      raw.bridge?.wrongScalar?.rejected === true,
    bridgeConfirmed:
      raw.bridge?.confirmation?.confirmations === 1
      && raw.bridge?.confirmation?.childFundingOutpointExists === true
      && raw.bridge?.confirmation?.childFundingOutpointUnspent === true,
    childFundingVisible:
      raw.child?.visibleInCompletedBridge === true
      && raw.child?.fundedByBridgeTxid === raw.bridge?.completedTxid,
    childPreparedCetConsumesFunding:
      raw.child?.preparedSpendChecks?.cetSpendsChildFunding === true,
    childPreparedCetAdaptorVerifies:
      raw.child?.preparedSpendChecks?.cetAdaptorVerifies === true,
    childPreparedCetPreResolutionIncomplete:
      raw.child?.preparedSpendChecks?.cetPreResolutionSignatureVerifies === false,
    childPreparedRefundConsumesFunding:
      raw.child?.preparedSpendChecks?.refundSpendsChildFunding === true,
    childPreparedRefundSignatureVerifies:
      raw.child?.preparedSpendChecks?.refundSignatureVerifies === true,
    childPreparedRefundIsTimelocked:
      raw.child?.preparedSpendChecks?.refundIsTimelocked === true,
    chainSimulationLeavesChildFundingUnspent:
      raw.chainSimulation?.unspentOutputs?.[0]?.txid === raw.child?.fundedByBridgeTxid
      && raw.chainSimulation?.unspentOutputs?.[0]?.vout === raw.child?.fundedByBridgeVout
      && raw.chainSimulation?.unspentOutputs?.[0]?.spent === false,
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const input = stringArg(args, '--input') ?? usage();
  const out = stringArg(args, '--out');
  const raw = assertObject(JSON.parse(fs.readFileSync(input, 'utf8')), 'raw transcript');
  const checks = buildChecks(raw);
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  assert.deepEqual(failed, [], `failed Layer 2 transcript checks: ${failed.join(', ')}`);

  const transcript = {
    kind: 'niti.v0_1_l2_e2e_audit_transcript.v1',
    sourceTranscriptKind: raw.kind,
    boundary: raw.boundary,
    replay: {
      commands: [
        'npm ci',
        'npm run v0.1:verify -- --artifacts-dir testnet/artifacts/replay-l2-e2e',
        'jq -e ".checks | all(. == true)" testnet/artifacts/replay-l2-e2e/l2-e2e-transcript.json',
      ],
      rawTranscriptPath: 'testnet/artifacts/replay-l2-e2e/cdlc-smoke-transcript.json',
      auditTranscriptPath: 'testnet/artifacts/replay-l2-e2e/l2-e2e-transcript.json',
    },
    redaction: {
      reason: 'The audit transcript keeps public verification material and redacts deterministic test-only nonce secrets.',
      redactedFields: [...REDACTED_FIELDS],
    },
    checks,
    transcript: redact(raw),
  };
  const json = `${JSON.stringify(transcript, null, 2)}\n`;
  if (out) {
    fs.writeFileSync(out, json);
    return;
  }
  process.stdout.write(json);
}

main();
