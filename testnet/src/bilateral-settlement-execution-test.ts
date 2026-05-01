import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralRetainedStates,
  cloneRetainedState,
  completeRetainedAdaptorSignature,
  evaluateRecoveredParticipantAction,
  retainedStateDigestHex,
  validateBilateralRetainedState,
} from './bilateral-state-retention.js';
import {
  canonicalOutcomes,
  canonicalSecrets,
} from './cdlc-scenario.js';
import {
  attestOracleOutcome,
  scalarFromHex,
} from './secp.js';

const states = buildCanonicalBilateralRetainedStates();
const attestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
assert.equal(attestation.verifies, true);

const settlementResults = states.map((state) => {
  const validation = validateBilateralRetainedState(state);
  assert.equal(validation.accepted, true, state.participant);

  const parentCetCompletion = completeRetainedAdaptorSignature({
    state,
    purpose: 'parent_cet',
    attestationSecretHex: attestation.attestationSecretHex,
  });
  const bridgeCompletion = completeRetainedAdaptorSignature({
    state,
    purpose: 'bridge',
    attestationSecretHex: attestation.attestationSecretHex,
  });
  assert.equal(parentCetCompletion.verifies, true, state.participant);
  assert.equal(bridgeCompletion.verifies, true, state.participant);
  assert.equal(parentCetCompletion.extractedSecretHex, attestation.attestationSecretHex);
  assert.equal(bridgeCompletion.extractedSecretHex, attestation.attestationSecretHex);

  const template = state.retainedArtifacts.transactionTemplate;
  assert.equal(template.bridge.input.txid, template.parentCet.unsignedTxid);
  assert.equal(template.bridge.input.vout, template.parentCet.output.vout);
  assert.equal(template.childFundingOutput.valueSat, template.bridge.output.valueSat);
  assert.equal(template.childFundingOutput.scriptPubKeyHex, template.bridge.output.scriptPubKeyHex);

  const recoveredAction = evaluateRecoveredParticipantAction({
    state,
    currentHeight: template.timelocks.bridgeTimeoutHeight,
    attestationSecretHex: attestation.attestationSecretHex,
  });
  assert.equal(recoveredAction.action, 'complete_with_oracle_attestation', state.participant);

  return {
    participant: state.participant,
    validationAccepted: validation.accepted,
    parentCetSignatureVerifies: parentCetCompletion.verifies,
    bridgeSignatureVerifies: bridgeCompletion.verifies,
    parentCetSignatureHex: parentCetCompletion.signatureHex,
    bridgeSignatureHex: bridgeCompletion.signatureHex,
    parentEdgeOutpoint: {
      txid: template.parentCet.unsignedTxid,
      vout: template.parentCet.output.vout,
      valueSat: template.parentCet.output.valueSat,
      scriptPubKeyHex: template.parentCet.output.scriptPubKeyHex,
    },
    bridgeInput: template.bridge.input,
    childFundingOutput: {
      txid: template.bridge.unsignedTxid,
      ...template.childFundingOutput,
    },
    finalAction: recoveredAction.action,
  };
});

const alice = settlementResults.find((result) => result.participant === 'alice');
const bob = settlementResults.find((result) => result.participant === 'bob');
assert.ok(alice);
assert.ok(bob);
assert.equal(alice.parentCetSignatureHex, bob.parentCetSignatureHex);
assert.equal(alice.bridgeSignatureHex, bob.bridgeSignatureHex);
assert.deepEqual(alice.parentEdgeOutpoint, bob.parentEdgeOutpoint);
assert.deepEqual(alice.bridgeInput, bob.bridgeInput);
assert.deepEqual(alice.childFundingOutput, bob.childFundingOutput);

const missingState = cloneRetainedState(states[0]!);
missingState.retainedArtifacts.adaptorExchange.messages = [];
missingState.stateDigestHex = retainedStateDigestHex(missingState);
const missingValidation = validateBilateralRetainedState(missingState);
assert.equal(missingValidation.accepted, false);
const missingAction = evaluateRecoveredParticipantAction({
  state: missingState,
  currentHeight: missingState.retainedArtifacts.deadlines.bridgeTimeoutHeight,
  attestationSecretHex: attestation.attestationSecretHex,
});
assert.equal(missingAction.action, 'abort_missing_state');

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_settlement_execution_test.v1',
  oracle: {
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    attestationSecretHex: attestation.attestationSecretHex,
  },
  participants: settlementResults.map((result) => ({
    participant: result.participant,
    validationAccepted: result.validationAccepted,
    parentCetSignatureVerifies: result.parentCetSignatureVerifies,
    bridgeSignatureVerifies: result.bridgeSignatureVerifies,
    finalAction: result.finalAction,
  })),
  graphTransition: {
    parentEdgeOutpoint: alice.parentEdgeOutpoint,
    bridgeInput: alice.bridgeInput,
    childFundingOutput: alice.childFundingOutput,
  },
  crossParticipantChecks: {
    parentCetSignaturesMatch: alice.parentCetSignatureHex === bob.parentCetSignatureHex,
    bridgeSignaturesMatch: alice.bridgeSignatureHex === bob.bridgeSignatureHex,
    graphTransitionMatches: JSON.stringify(alice.childFundingOutput)
      === JSON.stringify(bob.childFundingOutput),
  },
  missingState: {
    accepted: missingValidation.accepted,
    rejectionReason: missingValidation.rejectionReason,
    action: missingAction.action,
  },
}, null, 2));
