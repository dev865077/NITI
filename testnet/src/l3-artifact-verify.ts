import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJsonFile, writeJsonFile } from './io.js';

interface ArtifactCheck {
  file: string;
  kind: string;
  passed: boolean;
}

const requiredArtifacts = [
  'l3-bilateral-roles.json',
  'l3-bilateral-setup-schema.json',
  'l3-bilateral-state-machine.json',
  'l3-bilateral-template-agreement.json',
  'l3-bilateral-funding-validation.json',
  'l3-bilateral-adaptor-exchange.json',
  'l3-bilateral-state-retention.json',
  'l3-bilateral-two-process.json',
  'l3-bilateral-restart-recovery.json',
  'l3-bilateral-malformed-counterparty.json',
  'l3-bilateral-settlement-execution.json',
  'l3-bilateral-wrong-path-replay.json',
] as const;

function stringArg(args: readonly string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`missing ${name}`);
  }
  const value = args[index + 1];
  if (!value) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, 'object', `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  assert.equal(Array.isArray(value), true, `${label} must be an array`);
  return value as unknown[];
}

function requireChecksTrue(value: unknown, label: string): void {
  const checks = requireObject(value, label);
  for (const [name, passed] of Object.entries(checks)) {
    assert.equal(passed, true, `${label}.${name} must be true`);
  }
}

function readArtifact(dir: string, file: string): Record<string, unknown> {
  const path = join(dir, file);
  assert.equal(existsSync(path), true, `missing Layer 3 artifact: ${file}`);
  return requireObject(readJsonFile<unknown>(path), file);
}

function expectKind(artifact: Record<string, unknown>, kind: string, file: string): void {
  assert.equal(artifact.kind, kind, `${file} kind mismatch`);
}

function verifyRoles(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_role_fixture.v1', 'roles');
  requireChecksTrue(artifact.checks, 'roles.checks');
  assert.equal(requireArray(artifact.roles, 'roles.roles').length, 2);
}

function verifySetupSchema(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_setup_schema_test.v1', 'setup schema');
  assert.equal(artifact.messageCount, 11);
  requireChecksTrue(artifact.checks, 'setupSchema.checks');
}

function verifyStateMachine(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_state_machine_test.v1', 'state machine');
  const setupReplay = requireObject(artifact.setupReplay, 'stateMachine.setupReplay');
  assert.equal(setupReplay.accepted, true);
  assert.equal(setupReplay.finalState, 'setup_accepted');
  requireChecksTrue(setupReplay.checks, 'stateMachine.setupReplay.checks');
  const settlementReplay = requireObject(artifact.settlementReplay, 'stateMachine.settlementReplay');
  assert.equal(settlementReplay.accepted, true);
  assert.equal(settlementReplay.finalState, 'settled');
  const fallbackReplay = requireObject(artifact.fallbackReplay, 'stateMachine.fallbackReplay');
  assert.equal(fallbackReplay.finalState, 'fallback_ready');
  assert.equal(fallbackReplay.terminal, true);
  const rejectionCases = requireObject(artifact.rejectionCases, 'stateMachine.rejectionCases');
  assert.ok(Object.values(rejectionCases).every((value) => typeof value === 'string' && value.length > 0));
}

function verifyTemplateAgreement(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_template_agreement_test.v1', 'template agreement');
  const comparison = requireObject(artifact.comparison, 'templateAgreement.comparison');
  assert.equal(comparison.accepted, true);
  const mutations = requireArray(artifact.mutationResults, 'templateAgreement.mutationResults');
  assert.equal(mutations.length > 0, true);
  assert.equal(mutations.every((entry) => requireObject(entry, 'mutation').accepted === false), true);
}

function verifyFundingValidation(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_funding_validation_test.v1', 'funding validation');
  const accepted = requireObject(artifact.accepted, 'fundingValidation.accepted');
  requireChecksTrue(accepted.checks, 'fundingValidation.accepted.checks');
  const views = requireArray(accepted.participantViews, 'fundingValidation.participantViews');
  assert.equal(views.length, 2);
  assert.equal(views.every((entry) => requireObject(entry, 'participantView').accepted === true), true);
  const rejections = requireArray(artifact.rejectionResults, 'fundingValidation.rejectionResults');
  assert.equal(rejections.length > 0, true);
  assert.equal(rejections.every((entry) => requireObject(entry, 'rejection').accepted === false), true);
}

function verifyAdaptorExchange(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_adaptor_exchange_test.v1', 'adaptor exchange');
  const positive = requireObject(artifact.positive, 'adaptorExchange.positive');
  assert.equal(requireObject(positive.alice, 'adaptorExchange.alice').accepted, true);
  assert.equal(requireObject(positive.bob, 'adaptorExchange.bob').accepted, true);
  const rejections = requireArray(artifact.rejectionResults, 'adaptorExchange.rejectionResults');
  assert.equal(rejections.length > 0, true);
  assert.equal(rejections.every((entry) => requireObject(entry, 'rejection').accepted === false), true);
}

function verifyStateRetention(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_state_retention_test.v1', 'state retention');
  const restartResults = requireArray(artifact.restartResults, 'stateRetention.restartResults');
  assert.equal(restartResults.length, 2);
  for (const entry of restartResults) {
    const result = requireObject(entry, 'stateRetention.restartResult');
    assert.equal(result.validationAccepted, true);
    assert.equal(result.bridgeCompletionVerifies, true);
    requireChecksTrue(result.retainedArtifactChecks, 'stateRetention.retainedArtifactChecks');
  }
  const missing = requireObject(artifact.missingAdaptorState, 'stateRetention.missingAdaptorState');
  assert.equal(missing.accepted, false);
  assert.equal(missing.recoveredAction, 'abort_missing_state');
}

function verifyTwoProcess(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_two_process_test.v1', 'two process');
  requireChecksTrue(artifact.checks, 'twoProcess.checks');
  assert.equal(requireObject(artifact.alice, 'twoProcess.alice').accepted, true);
  assert.equal(requireObject(artifact.bob, 'twoProcess.bob').accepted, true);
}

function verifyRestartRecovery(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_restart_recovery_test.v1', 'restart recovery');
  requireChecksTrue(artifact.checks, 'restartRecovery.checks');
  const roles = requireArray(artifact.roles, 'restartRecovery.roles');
  assert.equal(roles.length, 2);
}

function verifyMalformedCounterparty(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_malformed_counterparty_test.v1', 'malformed counterparty');
  assert.equal(Number(artifact.rejectionCount) >= 9, true);
  requireChecksTrue(artifact.checks, 'malformedCounterparty.checks');
  const results = requireArray(artifact.results, 'malformedCounterparty.results');
  assert.equal(results.every((entry) => requireObject(entry, 'malformedResult').accepted === false), true);
}

function verifySettlementExecution(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_settlement_execution_test.v1', 'settlement execution');
  const participants = requireArray(artifact.participants, 'settlementExecution.participants');
  assert.equal(participants.length, 2);
  for (const entry of participants) {
    const participant = requireObject(entry, 'settlementExecution.participant');
    assert.equal(participant.validationAccepted, true);
    assert.equal(participant.parentCetSignatureVerifies, true);
    assert.equal(participant.bridgeSignatureVerifies, true);
    assert.equal(participant.finalAction, 'complete_with_oracle_attestation');
  }
  requireChecksTrue(artifact.crossParticipantChecks, 'settlementExecution.crossParticipantChecks');
  const missingState = requireObject(artifact.missingState, 'settlementExecution.missingState');
  assert.equal(missingState.accepted, false);
  assert.equal(missingState.action, 'abort_missing_state');
}

function verifyWrongPathReplay(artifact: Record<string, unknown>): void {
  expectKind(artifact, 'niti.l3_bilateral_wrong_path_replay_test.v1', 'wrong-path replay');
  requireChecksTrue(artifact.happyPath, 'wrongPathReplay.happyPath');
  requireChecksTrue(artifact.checks, 'wrongPathReplay.checks');
  assert.equal(Number(artifact.rejectionCount) >= 10, true);
  const cases = requireArray(artifact.cases, 'wrongPathReplay.cases');
  assert.equal(cases.every((entry) => requireObject(entry, 'wrongPathCase').accepted === false), true);
}

const artifactDir = resolve(stringArg(process.argv.slice(2), '--artifacts-dir'));
const verifiers: Record<string, (artifact: Record<string, unknown>) => void> = {
  'l3-bilateral-roles.json': verifyRoles,
  'l3-bilateral-setup-schema.json': verifySetupSchema,
  'l3-bilateral-state-machine.json': verifyStateMachine,
  'l3-bilateral-template-agreement.json': verifyTemplateAgreement,
  'l3-bilateral-funding-validation.json': verifyFundingValidation,
  'l3-bilateral-adaptor-exchange.json': verifyAdaptorExchange,
  'l3-bilateral-state-retention.json': verifyStateRetention,
  'l3-bilateral-two-process.json': verifyTwoProcess,
  'l3-bilateral-restart-recovery.json': verifyRestartRecovery,
  'l3-bilateral-malformed-counterparty.json': verifyMalformedCounterparty,
  'l3-bilateral-settlement-execution.json': verifySettlementExecution,
  'l3-bilateral-wrong-path-replay.json': verifyWrongPathReplay,
};

const checks: ArtifactCheck[] = requiredArtifacts.map((file) => {
  const artifact = readArtifact(artifactDir, file);
  const verifier = verifiers[file];
  if (!verifier) {
    throw new Error(`missing verifier for ${file}`);
  }
  verifier(artifact);
  return {
    file,
    kind: String(artifact.kind),
    passed: true,
  };
});

const summary = {
  kind: 'niti.l3_bilateral_ci_artifact_summary.v1',
  artifactDir,
  requiredArtifactCount: requiredArtifacts.length,
  checkedArtifacts: checks,
  checks: {
    everyRequiredArtifactPresent: checks.length === requiredArtifacts.length,
    everyVerifierPassed: checks.every((entry) => entry.passed),
  },
};
requireChecksTrue(summary.checks, 'layer3ArtifactSummary.checks');
writeJsonFile(join(artifactDir, 'l3-bilateral-summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
