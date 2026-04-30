import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildCanonicalBilateralRecoveryCheckpoints,
  cloneRecoveryCheckpoint,
  evaluateBilateralRestartRecovery,
  readBilateralRecoveryCheckpoint,
  recoveryCheckpointDigestHex,
  writeBilateralRecoveryCheckpoint,
} from './bilateral-restart-recovery.js';
import type { BilateralRoleName } from './bilateral-roles.js';

const tempDir = mkdtempSync(join(tmpdir(), 'niti-l3-restart-recovery-'));

function pathFor(role: BilateralRoleName, index: number): string {
  return join(tempDir, `${role}.${index}.recovery-checkpoint.json`);
}

try {
  const roles: BilateralRoleName[] = ['alice', 'bob'];
  const roleResults = roles.map((role) => {
    const checkpoints = buildCanonicalBilateralRecoveryCheckpoints(role);
    const results = checkpoints.map((checkpoint, index) => {
      const path = pathFor(role, index);
      writeBilateralRecoveryCheckpoint(path, checkpoint);
      const restored = readBilateralRecoveryCheckpoint(path);
      assert.equal(restored.checkpointDigestHex, recoveryCheckpointDigestHex(restored));

      const currentHeight = restored.retainedState
        ? restored.retainedState.retainedArtifacts.deadlines.bridgeTimeoutHeight
        : 3_000_000;
      const restart = evaluateBilateralRestartRecovery({
        checkpoint: restored,
        currentHeight,
      });

      if (restored.phase === 'after_funding_exchange') {
        assert.equal(restart.accepted, true, role);
        assert.equal(restart.action, 'resume_setup', role);

        const prematureAttestation = evaluateBilateralRestartRecovery({
          checkpoint: restored,
          currentHeight,
          attestationSecretHex: '01'.padStart(64, '0'),
        });
        assert.equal(prematureAttestation.accepted, false, role);
        assert.equal(prematureAttestation.action, 'abort_missing_state', role);
      }

      if (restored.phase === 'after_adaptor_exchange') {
        assert.equal(restart.accepted, true, role);
        assert.equal(restart.action, 'wait_for_oracle_or_timeout', role);

        const refund = evaluateBilateralRestartRecovery({
          checkpoint: restored,
          currentHeight: currentHeight + 1,
        });
        assert.equal(refund.accepted, true, role);
        assert.equal(refund.action, 'refund_after_timeout', role);
        assert.equal(
          refund.refundPath?.unsignedTxid,
          restored.retainedState?.retainedArtifacts.transactionTemplate.edgeTimeoutRefund.unsignedTxid,
        );
      }

      if (restored.phase === 'after_oracle_attestation') {
        assert.equal(restart.accepted, true, role);
        assert.equal(restart.action, 'complete_with_oracle_attestation', role);
        assert.equal(restart.completion?.verifies, true, role);
      }

      return {
        phase: restored.phase,
        path,
        accepted: restart.accepted,
        action: restart.action,
        protocolState: restart.protocolState,
      };
    });

    const afterAdaptor = checkpoints.find((checkpoint) => (
      checkpoint.phase === 'after_adaptor_exchange'
    ));
    assert.ok(afterAdaptor);
    const missingRetainedState = cloneRecoveryCheckpoint(afterAdaptor);
    delete missingRetainedState.retainedState;
    missingRetainedState.checkpointDigestHex = recoveryCheckpointDigestHex(missingRetainedState);
    const missingStateResult = evaluateBilateralRestartRecovery({
      checkpoint: missingRetainedState,
      currentHeight: afterAdaptor.retainedState!.retainedArtifacts.deadlines.bridgeTimeoutHeight,
    });
    assert.equal(missingStateResult.accepted, false, role);
    assert.equal(missingStateResult.action, 'abort_missing_state', role);

    const corruptedDigest = cloneRecoveryCheckpoint(afterAdaptor);
    corruptedDigest.checkpointDigestHex = '00'.repeat(32);
    const corruptedDigestResult = evaluateBilateralRestartRecovery({
      checkpoint: corruptedDigest,
      currentHeight: afterAdaptor.retainedState!.retainedArtifacts.deadlines.bridgeTimeoutHeight,
    });
    assert.equal(corruptedDigestResult.accepted, false, role);
    assert.equal(corruptedDigestResult.action, 'abort_missing_state', role);

    const afterAttestation = checkpoints.find((checkpoint) => (
      checkpoint.phase === 'after_oracle_attestation'
    ));
    assert.ok(afterAttestation);
    const missingAttestation = cloneRecoveryCheckpoint(afterAttestation);
    delete missingAttestation.oracleAttestationSecretHex;
    missingAttestation.checkpointDigestHex = recoveryCheckpointDigestHex(missingAttestation);
    const missingAttestationResult = evaluateBilateralRestartRecovery({
      checkpoint: missingAttestation,
      currentHeight: afterAttestation.retainedState!.retainedArtifacts.deadlines.bridgeTimeoutHeight,
    });
    assert.equal(missingAttestationResult.accepted, false, role);
    assert.equal(missingAttestationResult.action, 'abort_missing_state', role);

    return {
      role,
      checkpoints: results,
      partialLoss: {
        missingRetainedState: missingStateResult.action,
        corruptedDigest: corruptedDigestResult.action,
        missingAttestation: missingAttestationResult.action,
      },
    };
  });

  console.log(JSON.stringify({
    kind: 'niti.l3_bilateral_restart_recovery_test.v1',
    tempDir,
    roles: roleResults,
    checks: {
      aliceCovered: roleResults.some((result) => result.role === 'alice'),
      bobCovered: roleResults.some((result) => result.role === 'bob'),
      fundingRestartsResumeSetup: roleResults.every((result) => (
        result.checkpoints.find((checkpoint) => (
          checkpoint.phase === 'after_funding_exchange'
        ))?.action === 'resume_setup'
      )),
      adaptorRestartsWaitSafely: roleResults.every((result) => (
        result.checkpoints.find((checkpoint) => (
          checkpoint.phase === 'after_adaptor_exchange'
        ))?.action === 'wait_for_oracle_or_timeout'
      )),
      attestationRestartsComplete: roleResults.every((result) => (
        result.checkpoints.find((checkpoint) => (
          checkpoint.phase === 'after_oracle_attestation'
        ))?.action === 'complete_with_oracle_attestation'
      )),
      partialLossFailsClosed: roleResults.every((result) => (
        Object.values(result.partialLoss).every((action) => action === 'abort_missing_state')
      )),
    },
  }, null, 2));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
