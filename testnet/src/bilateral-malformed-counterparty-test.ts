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
  tryReplayBilateralStateMachine,
} from './bilateral-state-machine.js';
import {
  buildCanonicalBilateralRetainedStates,
  cloneRetainedState,
  retainedStateDigestHex,
  validateBilateralRetainedState,
} from './bilateral-state-retention.js';
import {
  buildCanonicalBilateralTemplateAgreement,
  participantViewFromTemplate,
} from './bilateral-template-agreement.js';

interface RejectionCase {
  name: string;
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

function captureThrow(name: string, fn: () => unknown): RejectionCase {
  try {
    fn();
    return {
      name,
      accepted: true,
      rejectionReason: '',
    };
  } catch (error) {
    return {
      name,
      accepted: false,
      rejectionReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function mutateMessage(
  transcript: BilateralSetupTranscript,
  predicate: (message: BilateralSetupProtocolMessage) => boolean,
  mutate: (message: BilateralSetupProtocolMessage) => void,
): BilateralSetupTranscript {
  const copy = clone(transcript);
  const message = copy.messages.find(predicate);
  if (!message) {
    throw new Error('mutation target not found');
  }
  mutate(message);
  return refreshDigests(copy);
}

const transcript = buildCanonicalBilateralSetupTranscript();
const template = buildCanonicalBilateralTemplateAgreement(transcript);
const exchange = buildCanonicalBilateralAdaptorExchange(transcript);

const unsupportedVersion = captureThrow('unsupported setup version', () => {
  const mutated = clone(transcript);
  mutated.messages[0]!.schemaVersion = 999 as 1;
  validateBilateralSetupTranscript(mutated);
});
assert.equal(unsupportedVersion.accepted, false);
assert.match(unsupportedVersion.rejectionReason, /schemaVersion must be 1/u);

const badPubkey = captureThrow('bad role public key', () => {
  const mutated = clone(transcript);
  const first = mutated.messages[0]!;
  if (first.kind !== 'niti.l3.setup.role_announcement.v1') {
    throw new Error('expected role announcement');
  }
  first.announcement.funding.outputPublicCompressedHex = `04${'00'.repeat(32)}`;
  validateBilateralSetupTranscript(mutated);
});
assert.equal(badPubkey.accepted, false);
assert.match(badPubkey.rejectionReason, /compressed secp256k1 point/u);

const duplicateNonceCommitment = captureThrow('duplicate nonce commitment', () => {
  const mutated = clone(transcript);
  const first = mutated.messages[0]!;
  if (first.kind !== 'niti.l3.setup.role_announcement.v1') {
    throw new Error('expected role announcement');
  }
  first.announcement.adaptorNonceCommitments[1]!.purpose =
    first.announcement.adaptorNonceCommitments[0]!.purpose;
  validateBilateralSetupTranscript(mutated);
});
assert.equal(duplicateNonceCommitment.accepted, false);
assert.match(duplicateNonceCommitment.rejectionReason, /must not repeat a purpose/u);

const badFundingAmountTranscript = mutateMessage(
  transcript,
  (message) => message.kind === 'niti.l3.setup.funding_inputs.v1',
  (message) => {
    if (message.kind !== 'niti.l3.setup.funding_inputs.v1') {
      throw new Error('expected funding inputs');
    }
    message.fundingInputs[0]!.valueSat = '0';
  },
);
const badFundingAmount = tryReplayBilateralStateMachine(badFundingAmountTranscript);
assert.equal(badFundingAmount.accepted, false);
assert.match(badFundingAmount.rejectionReason ?? '', /funding input value must be positive/u);

const missingRefundTranscript = rebuildBilateralTranscriptWithMessages(
  transcript,
  transcript.messages.filter((message) => (
    message.kind !== 'niti.l3.setup.refund_templates.v1'
    && message.kind !== 'niti.l3.setup.ack.v1'
  )),
);
const missingRefund = tryReplayBilateralStateMachine(missingRefundTranscript);
assert.equal(missingRefund.accepted, false);
assert.match(missingRefund.rejectionReason ?? '', /requires refund_templates_agreed/u);

const expiredTimelocks = (() => {
  const state = cloneRetainedState(buildCanonicalBilateralRetainedStates(transcript)[0]!);
  state.retainedArtifacts.transactionTemplate.timelocks.ordered = false;
  return captureThrow('expired timelock ordering', () => {
    state.templateDigestHex = participantViewFromTemplate({
      participant: state.participant,
      template: state.retainedArtifacts.transactionTemplate,
    }).canonicalTemplateDigestHex;
    state.stateDigestHex = retainedStateDigestHex(state);
    validateBilateralRetainedState(state);
  });
})();
assert.equal(expiredTimelocks.accepted, false);
assert.match(expiredTimelocks.rejectionReason, /timelocks are not ordered/u);

const wrongAdaptorPoint = (() => {
  const mutated = cloneAdaptorExchange(exchange);
  const bridge = mutated.messages.flatMap((message) => message.signatures)
    .find((packet) => packet.purpose === 'bridge');
  if (!bridge) {
    throw new Error('missing bridge packet');
  }
  bridge.adaptorPointCompressedHex = template.childCet.adaptorPointCompressedHex;
  const verification = verifyBilateralAdaptorExchange({
    participant: 'alice',
    transcript,
    exchange: mutated,
  });
  return {
    name: 'wrong adaptor point',
    accepted: verification.accepted,
    rejectionReason: verification.rejectionReason ?? '',
  };
})();
assert.equal(wrongAdaptorPoint.accepted, false);
assert.match(wrongAdaptorPoint.rejectionReason, /adaptorPointsMatch/u);

const mutatedSighash = (() => {
  const mutated = cloneAdaptorExchange(exchange);
  const bridge = mutated.messages.flatMap((message) => message.signatures)
    .find((packet) => packet.purpose === 'bridge');
  if (!bridge) {
    throw new Error('missing bridge packet');
  }
  bridge.sighashHex = '11'.repeat(32);
  const verification = verifyBilateralAdaptorExchange({
    participant: 'alice',
    transcript,
    exchange: mutated,
  });
  return {
    name: 'mutated sighash',
    accepted: verification.accepted,
    rejectionReason: verification.rejectionReason ?? '',
  };
})();
assert.equal(mutatedSighash.accepted, false);
assert.match(mutatedSighash.rejectionReason, /sighashesMatch/u);

const duplicateAdaptorPurpose = (() => {
  const mutated = cloneAdaptorExchange(exchange);
  mutated.messages[0]!.signatures.push(clone(mutated.messages[0]!.signatures[0]!));
  const verification = verifyBilateralAdaptorExchange({
    participant: 'alice',
    transcript,
    exchange: mutated,
  });
  return {
    name: 'duplicate adaptor purpose',
    accepted: verification.accepted,
    rejectionReason: verification.rejectionReason ?? '',
  };
})();
assert.equal(duplicateAdaptorPurpose.accepted, false);
assert.match(duplicateAdaptorPurpose.rejectionReason, /unexpected or duplicate adaptor purpose/u);

const results = [
  unsupportedVersion,
  badPubkey,
  duplicateNonceCommitment,
  {
    name: 'bad funding amount',
    accepted: badFundingAmount.accepted,
    rejectionReason: badFundingAmount.rejectionReason ?? '',
  },
  {
    name: 'missing refund templates',
    accepted: missingRefund.accepted,
    rejectionReason: missingRefund.rejectionReason ?? '',
  },
  expiredTimelocks,
  wrongAdaptorPoint,
  mutatedSighash,
  duplicateAdaptorPurpose,
];

assert.equal(results.every((result) => !result.accepted), true);

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_malformed_counterparty_test.v1',
  rejectionCount: results.length,
  results,
  checks: {
    everyCaseFailsClosed: results.every((result) => !result.accepted),
    everyCaseHasReason: results.every((result) => result.rejectionReason.length > 0),
    coversUnsupportedVersion: results.some((result) => result.name === 'unsupported setup version'),
    coversBadPubkey: results.some((result) => result.name === 'bad role public key'),
    coversWrongAdaptorPoint: results.some((result) => result.name === 'wrong adaptor point'),
    coversMutatedSighash: results.some((result) => result.name === 'mutated sighash'),
    coversBadFundingAmount: results.some((result) => result.name === 'bad funding amount'),
    coversExpiredTimelocks: results.some((result) => result.name === 'expired timelock ordering'),
    coversMissingRefunds: results.some((result) => result.name === 'missing refund templates'),
    coversDuplicateNonces: results.some((result) => result.name === 'duplicate nonce commitment'),
  },
}, null, 2));
