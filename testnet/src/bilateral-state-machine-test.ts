import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralSetupTranscript,
  setupMessageDigestHex,
  type BilateralSetupProtocolMessage,
} from './bilateral-setup-schema.js';
import {
  rebuildBilateralTranscriptWithMessages,
  replayBilateralStateMachine,
  tryReplayBilateralStateMachine,
  type BilateralPostSetupAction,
} from './bilateral-state-machine.js';

function transcriptWithOrder(
  messages: readonly BilateralSetupProtocolMessage[],
): ReturnType<typeof buildCanonicalBilateralSetupTranscript> {
  const transcript = buildCanonicalBilateralSetupTranscript();
  return rebuildBilateralTranscriptWithMessages(transcript, messages);
}

function moveMessageBefore(
  kindToMove: BilateralSetupProtocolMessage['kind'],
  beforeKind: BilateralSetupProtocolMessage['kind'],
): ReturnType<typeof buildCanonicalBilateralSetupTranscript> {
  const transcript = buildCanonicalBilateralSetupTranscript();
  const setupMessages = transcript.messages.filter((message) => (
    message.kind !== 'niti.l3.setup.ack.v1'
  ));
  const moving = setupMessages.find((message) => message.kind === kindToMove);
  if (!moving) {
    throw new Error(`missing message ${kindToMove}`);
  }
  const withoutMoving = setupMessages.filter((message) => message !== moving);
  const targetIndex = withoutMoving.findIndex((message) => message.kind === beforeKind);
  if (targetIndex < 0) {
    throw new Error(`missing target message ${beforeKind}`);
  }
  return transcriptWithOrder([
    ...withoutMoving.slice(0, targetIndex),
    moving,
    ...withoutMoving.slice(targetIndex),
  ]);
}

const transcript = buildCanonicalBilateralSetupTranscript();
const setupReplay = replayBilateralStateMachine(transcript);

assert.equal(setupReplay.accepted, true);
assert.equal(setupReplay.finalState, 'setup_accepted');
assert.equal(setupReplay.terminal, false);
assert.equal(setupReplay.transitions.length, transcript.messages.length);
assert.equal(setupReplay.checks.roleAnnouncementsComplete, true);
assert.equal(setupReplay.checks.fundingValidatedBeforeTemplates, true);
assert.equal(setupReplay.checks.templatesAgreedBeforeAdaptorExchange, true);
assert.equal(setupReplay.checks.setupAcceptedBeforeSettlement, true);

const settlementActions: BilateralPostSetupAction[] = [
  {
    kind: 'oracle_attestation_published',
    actor: 'alice',
    reason: 'parent outcome attested',
  },
  {
    kind: 'settlement_attempted',
    actor: 'bob',
    reason: 'complete parent and bridge adaptors',
  },
];
const settlementReplay = replayBilateralStateMachine(transcript, settlementActions);
assert.equal(settlementReplay.accepted, true);
assert.equal(settlementReplay.finalState, 'settled');
assert.equal(settlementReplay.terminal, true);
assert.equal(
  settlementReplay.transitions[settlementReplay.transitions.length - 1]?.inputKind,
  'settlement_attempted',
);

const adaptorBeforeTemplates = moveMessageBefore(
  'niti.l3.setup.adaptor_points.v1',
  'niti.l3.setup.cet_templates.v1',
);
const adaptorBeforeTemplatesReplay = tryReplayBilateralStateMachine(adaptorBeforeTemplates);
assert.equal(adaptorBeforeTemplatesReplay.accepted, false);
assert.match(
  adaptorBeforeTemplatesReplay.rejectionReason ?? '',
  /requires refund_templates_agreed/,
);

const withoutAcceptance = rebuildBilateralTranscriptWithMessages(
  transcript,
  transcript.messages.filter((message) => message.kind !== 'niti.l3.setup.ack.v1'),
);
const settlementBeforeAcceptance = tryReplayBilateralStateMachine(
  withoutAcceptance,
  [
    {
      kind: 'oracle_attestation_published',
      actor: 'alice',
      reason: 'attempt attestation before bilateral acceptance',
    },
    {
      kind: 'settlement_attempted',
      actor: 'bob',
      reason: 'attempt settlement before accepted setup',
    },
  ],
);
assert.equal(settlementBeforeAcceptance.accepted, false);
assert.match(
  settlementBeforeAcceptance.rejectionReason ?? '',
  /requires setup_accepted/,
);

const fallbackReplay = replayBilateralStateMachine(
  withoutAcceptance,
  [
    {
      kind: 'fallback_timeout_reached',
      actor: 'alice',
      reason: 'counterparty did not complete acceptance before timeout',
    },
  ],
);
assert.equal(fallbackReplay.finalState, 'fallback_ready');
assert.equal(fallbackReplay.terminal, true);

const terminalReplay = tryReplayBilateralStateMachine(
  transcript,
  [
    {
      kind: 'abort_requested',
      actor: 'alice',
      reason: 'operator abort',
    },
    {
      kind: 'oracle_attestation_published',
      actor: 'bob',
      reason: 'must not be accepted after abort',
    },
  ],
);
assert.equal(terminalReplay.accepted, false);
assert.match(
  terminalReplay.rejectionReason ?? '',
  /cannot be applied after terminal state aborted/,
);

assert.equal(
  transcript.messageDigests.every((digest, index) => (
    digest === setupMessageDigestHex(transcript.messages[index] as BilateralSetupProtocolMessage)
  )),
  true,
);

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_state_machine_test.v1',
  setupReplay: {
    accepted: setupReplay.accepted,
    finalState: setupReplay.finalState,
    transitionCount: setupReplay.transitions.length,
    checks: setupReplay.checks,
  },
  settlementReplay: {
    accepted: settlementReplay.accepted,
    finalState: settlementReplay.finalState,
    terminal: settlementReplay.terminal,
  },
  rejectionCases: {
    adaptorBeforeTemplates: adaptorBeforeTemplatesReplay.rejectionReason,
    settlementBeforeAcceptance: settlementBeforeAcceptance.rejectionReason,
    terminalRejectsFurtherActions: terminalReplay.rejectionReason,
  },
  fallbackReplay: {
    finalState: fallbackReplay.finalState,
    terminal: fallbackReplay.terminal,
  },
}, null, 2));
