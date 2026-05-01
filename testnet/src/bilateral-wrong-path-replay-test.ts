import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralAdaptorExchange,
  cloneAdaptorExchange,
  verifyBilateralAdaptorExchange,
} from './bilateral-adaptor-exchange.js';
import {
  buildCanonicalBilateralSetupTranscript,
  setupMessageDigestHex,
  validateBilateralSetupTranscript,
  type BilateralSetupProtocolMessage,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  rebuildBilateralTranscriptWithMessages,
  replayBilateralStateMachine,
  tryReplayBilateralStateMachine,
  type BilateralPostSetupAction,
} from './bilateral-state-machine.js';
import {
  buildCanonicalBilateralRetainedStates,
  cloneRetainedState,
  completeRetainedAdaptorSignature,
  retainedStateDigestHex,
  validateBilateralRetainedState,
  type BilateralParticipantRetainedState,
} from './bilateral-state-retention.js';
import {
  participantViewFromTemplate,
} from './bilateral-template-agreement.js';
import {
  canonicalOutcomes,
  canonicalSecrets,
} from './cdlc-scenario.js';
import {
  attestOracleOutcome,
  scalarFromHex,
} from './secp.js';

interface WrongPathCase {
  caseId: string;
  name: string;
  mutatedField: string;
  expectedRejection: string;
  accepted: boolean;
  observedRejection: string;
}

interface SettlementAttempt {
  accepted: boolean;
  rejectionReason: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function refreshDigests(transcript: BilateralSetupTranscript): BilateralSetupTranscript {
  return {
    ...transcript,
    messageDigests: transcript.messages.map(setupMessageDigestHex),
  };
}

function captureCase(input: {
  caseId: string;
  name: string;
  mutatedField: string;
  expectedRejection: RegExp;
  run: () => SettlementAttempt;
}): WrongPathCase {
  const result = input.run();
  assert.equal(result.accepted, false, input.name);
  assert.match(result.rejectionReason, input.expectedRejection, input.name);
  return {
    caseId: input.caseId,
    name: input.name,
    mutatedField: input.mutatedField,
    expectedRejection: input.expectedRejection.source,
    accepted: result.accepted,
    observedRejection: result.rejectionReason,
  };
}

function fromThrow(fn: () => unknown): SettlementAttempt {
  try {
    fn();
    return {
      accepted: true,
      rejectionReason: '',
    };
  } catch (error) {
    return {
      accepted: false,
      rejectionReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function findMessage<K extends BilateralSetupProtocolMessage['kind']>(
  transcript: BilateralSetupTranscript,
  kind: K,
): Extract<BilateralSetupProtocolMessage, { kind: K }> {
  const message = transcript.messages.find((entry) => entry.kind === kind);
  if (!message) {
    throw new Error(`missing setup message ${kind}`);
  }
  return message as Extract<BilateralSetupProtocolMessage, { kind: K }>;
}

function transcriptWithMovedMessage(input: {
  transcript: BilateralSetupTranscript;
  kindToMove: BilateralSetupProtocolMessage['kind'];
  beforeKind: BilateralSetupProtocolMessage['kind'];
}): BilateralSetupTranscript {
  const setupMessages = input.transcript.messages.filter((message) => (
    message.kind !== 'niti.l3.setup.ack.v1'
  ));
  const moving = setupMessages.find((message) => message.kind === input.kindToMove);
  if (!moving) {
    throw new Error(`missing message ${input.kindToMove}`);
  }
  const withoutMoving = setupMessages.filter((message) => message !== moving);
  const targetIndex = withoutMoving.findIndex((message) => (
    message.kind === input.beforeKind
  ));
  if (targetIndex < 0) {
    throw new Error(`missing target message ${input.beforeKind}`);
  }
  return rebuildBilateralTranscriptWithMessages(input.transcript, [
    ...withoutMoving.slice(0, targetIndex),
    moving,
    ...withoutMoving.slice(targetIndex),
  ]);
}

function successfulSettlementAttempt(input: {
  state: BilateralParticipantRetainedState;
  attestationSecretHex: string;
}): SettlementAttempt {
  const validation = validateBilateralRetainedState(input.state);
  if (!validation.accepted) {
    return {
      accepted: false,
      rejectionReason: validation.rejectionReason ?? 'retained state rejected',
    };
  }

  const parentCet = completeRetainedAdaptorSignature({
    state: input.state,
    purpose: 'parent_cet',
    attestationSecretHex: input.attestationSecretHex,
  });
  if (!parentCet.verifies) {
    return {
      accepted: false,
      rejectionReason: 'parent CET signature does not verify',
    };
  }

  const bridge = completeRetainedAdaptorSignature({
    state: input.state,
    purpose: 'bridge',
    attestationSecretHex: input.attestationSecretHex,
  });
  if (!bridge.verifies) {
    return {
      accepted: false,
      rejectionReason: 'bridge signature does not verify',
    };
  }

  const template = input.state.retainedArtifacts.transactionTemplate;
  const bridgeSpendsParentEdge = template.bridge.input.txid === template.parentCet.unsignedTxid
    && template.bridge.input.vout === template.parentCet.output.vout
    && template.bridge.input.valueSat === template.parentCet.output.valueSat
    && template.bridge.input.scriptPubKeyHex === template.parentCet.output.scriptPubKeyHex;
  if (!bridgeSpendsParentEdge) {
    return {
      accepted: false,
      rejectionReason: 'bridge does not spend selected parent edge',
    };
  }

  const bridgeCreatesChildFunding = template.childFundingOutput.valueSat
    === template.bridge.output.valueSat
    && template.childFundingOutput.scriptPubKeyHex === template.bridge.output.scriptPubKeyHex;
  if (!bridgeCreatesChildFunding) {
    return {
      accepted: false,
      rejectionReason: 'bridge does not create selected child funding output',
    };
  }

  return {
    accepted: true,
    rejectionReason: '',
  };
}

function rewriteRetainedTemplateDigest(
  state: BilateralParticipantRetainedState,
): BilateralParticipantRetainedState {
  state.templateDigestHex = participantViewFromTemplate({
    participant: state.participant,
    template: state.retainedArtifacts.transactionTemplate,
  }).canonicalTemplateDigestHex;
  state.retainedArtifacts.adaptorExchange.templateDigestHex = state.templateDigestHex;
  state.retainedArtifacts.adaptorExchange.messages.forEach((message) => {
    message.templateDigestHex = state.templateDigestHex;
  });
  state.stateDigestHex = retainedStateDigestHex(state);
  return state;
}

const transcript = buildCanonicalBilateralSetupTranscript();
const setupReplay = replayBilateralStateMachine(transcript);
assert.equal(setupReplay.accepted, true);
assert.equal(setupReplay.finalState, 'setup_accepted');

const exchange = buildCanonicalBilateralAdaptorExchange(transcript);
const aliceExchange = verifyBilateralAdaptorExchange({
  participant: 'alice',
  transcript,
  exchange,
});
const bobExchange = verifyBilateralAdaptorExchange({
  participant: 'bob',
  transcript,
  exchange,
});
assert.equal(aliceExchange.accepted, true);
assert.equal(bobExchange.accepted, true);

const activatingAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
const wrongAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.wrong,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
assert.equal(activatingAttestation.verifies, true);
assert.equal(wrongAttestation.verifies, true);

const retainedState = buildCanonicalBilateralRetainedStates(transcript)[0]!;
const happyPath = successfulSettlementAttempt({
  state: retainedState,
  attestationSecretHex: activatingAttestation.attestationSecretHex,
});
assert.equal(happyPath.accepted, true);

const cases: WrongPathCase[] = [];

cases.push(captureCase({
  caseId: 'stale_transcript_replay',
  name: 'stale transcript replay',
  mutatedField: 'funding_inputs[0].valueSat with original digest retained',
  expectedRejection: /digest mismatch/u,
  run: () => fromThrow(() => {
    const stale = clone(transcript);
    const funding = findMessage(stale, 'niti.l3.setup.funding_inputs.v1');
    funding.fundingInputs[0]!.valueSat = '200000';
    validateBilateralSetupTranscript(stale);
  }),
}));

cases.push(captureCase({
  caseId: 'session_id_mismatch',
  name: 'session id mismatch',
  mutatedField: 'oracle_event_selection.sessionIdHex',
  expectedRejection: /wrong session id/u,
  run: () => fromThrow(() => {
    const mutated = clone(transcript);
    const oracleSelection = findMessage(
      mutated,
      'niti.l3.setup.oracle_event_selection.v1',
    );
    oracleSelection.sessionIdHex = '11'.repeat(32);
    validateBilateralSetupTranscript(refreshDigests(mutated));
  }),
}));

cases.push(captureCase({
  caseId: 'sequence_reorder',
  name: 'sequence reorder',
  mutatedField: 'adaptor_points moved before cet_templates',
  expectedRejection: /requires refund_templates_agreed/u,
  run: () => {
    const replay = tryReplayBilateralStateMachine(transcriptWithMovedMessage({
      transcript,
      kindToMove: 'niti.l3.setup.adaptor_points.v1',
      beforeKind: 'niti.l3.setup.cet_templates.v1',
    }));
    return {
      accepted: replay.accepted,
      rejectionReason: replay.rejectionReason ?? '',
    };
  },
}));

cases.push(captureCase({
  caseId: 'reused_acknowledgement',
  name: 'reused acknowledgement',
  mutatedField: 'second ack acknowledges the same digest as first ack',
  expectedRejection: /reuses an acknowledgement digest/u,
  run: () => fromThrow(() => {
    const mutated = clone(transcript);
    const acks = mutated.messages.filter((message) => (
      message.kind === 'niti.l3.setup.ack.v1'
    ));
    assert.equal(acks.length, 2);
    if (
      acks[0]!.kind !== 'niti.l3.setup.ack.v1'
      || acks[1]!.kind !== 'niti.l3.setup.ack.v1'
    ) {
      throw new Error('expected acknowledgements');
    }
    acks[1]!.acknowledgedDigestHex = acks[0]!.acknowledgedDigestHex;
    validateBilateralSetupTranscript(refreshDigests(mutated));
  }),
}));

cases.push(captureCase({
  caseId: 'wrong_counterparty_role',
  name: 'wrong counterparty role',
  mutatedField: 'alice role announcement claims bob role',
  expectedRejection: /sender must match announced role/u,
  run: () => {
    const mutated = clone(transcript);
    const role = findMessage(mutated, 'niti.l3.setup.role_announcement.v1');
    role.announcement.role = 'bob';
    const replay = tryReplayBilateralStateMachine(refreshDigests(mutated));
    return {
      accepted: replay.accepted,
      rejectionReason: replay.rejectionReason ?? '',
    };
  },
}));

cases.push(captureCase({
  caseId: 'swapped_adaptor_roles',
  name: 'swapped Alice/Bob adaptor packets',
  mutatedField: 'adaptor exchange message signature arrays swapped',
  expectedRejection: /senderBindingsMatch/u,
  run: () => {
    const mutated = cloneAdaptorExchange(exchange);
    const aliceSignatures = mutated.messages[0]!.signatures;
    mutated.messages[0]!.signatures = mutated.messages[1]!.signatures;
    mutated.messages[1]!.signatures = aliceSignatures;
    const verification = verifyBilateralAdaptorExchange({
      participant: 'alice',
      transcript,
      exchange: mutated,
    });
    return {
      accepted: verification.accepted,
      rejectionReason: verification.rejectionReason ?? '',
    };
  },
}));

cases.push(captureCase({
  caseId: 'wrong_oracle_scalar',
  name: 'wrong oracle outcome scalar',
  mutatedField: 'settlement attestation uses non-activating outcome',
  expectedRejection: /signature does not verify/u,
  run: () => successfulSettlementAttempt({
    state: retainedState,
    attestationSecretHex: wrongAttestation.attestationSecretHex,
  }),
}));

cases.push(captureCase({
  caseId: 'non_corresponding_bridge_edge',
  name: 'non-corresponding bridge edge',
  mutatedField: 'retained bridge input txid',
  expectedRejection: /bridge input must spend the parent CET output/u,
  run: () => fromThrow(() => {
    const mutated = cloneRetainedState(retainedState);
    mutated.retainedArtifacts.transactionTemplate.bridge.input.txid = '22'.repeat(32);
    const rewritten = rewriteRetainedTemplateDigest(mutated);
    const attempt = successfulSettlementAttempt({
      state: rewritten,
      attestationSecretHex: activatingAttestation.attestationSecretHex,
    });
    if (!attempt.accepted) {
      throw new Error(attempt.rejectionReason);
    }
    return attempt;
  }),
}));

cases.push(captureCase({
  caseId: 'mutated_template_binding',
  name: 'mutated template binding',
  mutatedField: 'retained bridge sighash without matching adaptor packet',
  expectedRejection: /adaptorPacketsMatchTemplate/u,
  run: () => {
    const mutated = cloneRetainedState(retainedState);
    mutated.retainedArtifacts.transactionTemplate.bridge.sighashHex = '33'.repeat(32);
    return successfulSettlementAttempt({
      state: rewriteRetainedTemplateDigest(mutated),
      attestationSecretHex: activatingAttestation.attestationSecretHex,
    });
  },
}));

cases.push(captureCase({
  caseId: 'double_activation_attempt',
  name: 'double activation attempt',
  mutatedField: 'settlement_attempted repeated after terminal settlement',
  expectedRejection: /cannot be applied after terminal state settled/u,
  run: () => {
    const actions: BilateralPostSetupAction[] = [
      {
        kind: 'oracle_attestation_published',
        actor: 'alice',
        reason: 'parent oracle attested',
      },
      {
        kind: 'settlement_attempted',
        actor: 'bob',
        reason: 'first settlement',
      },
      {
        kind: 'settlement_attempted',
        actor: 'alice',
        reason: 'replay settlement after terminal settlement',
      },
    ];
    const replay = tryReplayBilateralStateMachine(transcript, actions);
    return {
      accepted: replay.accepted,
      rejectionReason: replay.rejectionReason ?? '',
    };
  },
}));

assert.equal(cases.length, 10);
assert.equal(cases.every((entry) => !entry.accepted), true);

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_wrong_path_replay_test.v1',
  happyPath: {
    setupAccepted: setupReplay.accepted,
    aliceAdaptorExchangeAccepted: aliceExchange.accepted,
    bobAdaptorExchangeAccepted: bobExchange.accepted,
    settlementAccepted: happyPath.accepted,
  },
  rejectionCount: cases.length,
  cases,
  checks: {
    everyWrongPathFailsClosed: cases.every((entry) => !entry.accepted),
    everyCaseHasObservedReason: cases.every((entry) => entry.observedRejection.length > 0),
    coversStaleTranscriptReplay: cases.some((entry) => entry.caseId === 'stale_transcript_replay'),
    coversSessionIdMismatch: cases.some((entry) => entry.caseId === 'session_id_mismatch'),
    coversSequenceReorder: cases.some((entry) => entry.caseId === 'sequence_reorder'),
    coversReusedAcknowledgement: cases.some((entry) => entry.caseId === 'reused_acknowledgement'),
    coversWrongCounterpartyRole: cases.some((entry) => entry.caseId === 'wrong_counterparty_role'),
    coversSwappedAdaptorRoles: cases.some((entry) => entry.caseId === 'swapped_adaptor_roles'),
    coversWrongOracleScalar: cases.some((entry) => entry.caseId === 'wrong_oracle_scalar'),
    coversNonCorrespondingBridgeEdge: cases.some((entry) => entry.caseId === 'non_corresponding_bridge_edge'),
    coversMutatedTemplateBinding: cases.some((entry) => entry.caseId === 'mutated_template_binding'),
    coversDoubleActivationAttempt: cases.some((entry) => entry.caseId === 'double_activation_attempt'),
  },
}, null, 2));
