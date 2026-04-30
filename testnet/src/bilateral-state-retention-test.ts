import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildCanonicalBilateralRetainedStates,
  cloneRetainedState,
  completeRetainedAdaptorSignature,
  evaluateRecoveredParticipantAction,
  readBilateralRetainedState,
  retainedStateDigestHex,
  validateBilateralRetainedState,
  writeBilateralRetainedState,
} from './bilateral-state-retention.js';
import {
  attestOracleOutcome,
  scalarFromHex,
} from './secp.js';
import {
  canonicalOutcomes,
  canonicalSecrets,
} from './cdlc-scenario.js';

const tempDir = mkdtempSync(join(tmpdir(), 'niti-l3-retention-'));

try {
  const states = buildCanonicalBilateralRetainedStates();
  assert.equal(states.length, 2);
  const attestation = attestOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
    nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
  });
  assert.equal(attestation.verifies, true);

  const restartResults = states.map((state) => {
    const path = join(tempDir, `${state.participant}.retained-state.json`);
    writeBilateralRetainedState(path, state);
    const restored = readBilateralRetainedState(path);
    const validation = validateBilateralRetainedState(restored);
    assert.equal(validation.accepted, true, state.participant);
    assert.equal(restored.stateDigestHex, retainedStateDigestHex(restored));

    const bridgeCompletion = completeRetainedAdaptorSignature({
      state: restored,
      purpose: 'bridge',
      attestationSecretHex: attestation.attestationSecretHex,
    });
    assert.equal(bridgeCompletion.verifies, true, state.participant);
    assert.equal(bridgeCompletion.extractedSecretHex, attestation.attestationSecretHex);

    const waitAction = evaluateRecoveredParticipantAction({
      state: restored,
      currentHeight: restored.retainedArtifacts.deadlines.bridgeTimeoutHeight,
    });
    assert.equal(waitAction.action, 'wait_for_oracle_or_timeout', state.participant);

    const completionAction = evaluateRecoveredParticipantAction({
      state: restored,
      currentHeight: restored.retainedArtifacts.deadlines.bridgeTimeoutHeight,
      attestationSecretHex: attestation.attestationSecretHex,
    });
    assert.equal(completionAction.action, 'complete_with_oracle_attestation', state.participant);

    const refundAction = evaluateRecoveredParticipantAction({
      state: restored,
      currentHeight: restored.retainedArtifacts.deadlines.bridgeTimeoutHeight + 1,
    });
    assert.equal(refundAction.action, 'refund_after_timeout', state.participant);
    assert.equal(
      refundAction.refundPath?.unsignedTxid,
      restored.retainedArtifacts.transactionTemplate.edgeTimeoutRefund.unsignedTxid,
    );

    return {
      participant: state.participant,
      pathWritten: path,
      stateDigestHex: restored.stateDigestHex,
      validationAccepted: validation.accepted,
      bridgeCompletionVerifies: bridgeCompletion.verifies,
      waitAction: waitAction.action,
      completionAction: completionAction.action,
      refundAction: refundAction.action,
      retainedArtifactChecks: validation.checks,
    };
  });

  const missingAdaptorState = cloneRetainedState(states[0]!);
  missingAdaptorState.retainedArtifacts.adaptorExchange.messages = [];
  missingAdaptorState.stateDigestHex = retainedStateDigestHex(missingAdaptorState);
  const missingAdaptorValidation = validateBilateralRetainedState(missingAdaptorState);
  assert.equal(missingAdaptorValidation.accepted, false);
  assert.match(missingAdaptorValidation.rejectionReason ?? '', /adaptorExchangeRetained/u);
  const missingAdaptorAction = evaluateRecoveredParticipantAction({
    state: missingAdaptorState,
    currentHeight: missingAdaptorState.retainedArtifacts.deadlines.bridgeTimeoutHeight,
    attestationSecretHex: attestation.attestationSecretHex,
  });
  assert.equal(missingAdaptorAction.action, 'abort_missing_state');

  console.log(JSON.stringify({
    kind: 'niti.l3_bilateral_state_retention_test.v1',
    tempDir,
    restartResults,
    missingAdaptorState: {
      accepted: missingAdaptorValidation.accepted,
      rejectionReason: missingAdaptorValidation.rejectionReason,
      recoveredAction: missingAdaptorAction.action,
    },
  }, null, 2));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
