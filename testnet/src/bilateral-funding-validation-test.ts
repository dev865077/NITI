import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralSetupTranscript,
  type BilateralSetupProtocolMessage,
  type FundingInputsSetupMessage,
} from './bilateral-setup-schema.js';
import {
  cloneFundingTranscript,
  rebuildFundingTranscript,
  validateBilateralFundingAgreement,
} from './bilateral-funding-validation.js';

function fundingMessage(messages: readonly BilateralSetupProtocolMessage[]): FundingInputsSetupMessage {
  const message = messages.find((entry): entry is FundingInputsSetupMessage => (
    entry.kind === 'niti.l3.setup.funding_inputs.v1'
  ));
  if (!message) {
    throw new Error('missing funding message');
  }
  return message;
}

function transcriptWithoutAcks(): ReturnType<typeof buildCanonicalBilateralSetupTranscript> {
  const transcript = buildCanonicalBilateralSetupTranscript();
  return rebuildFundingTranscript({
    transcript,
    messages: transcript.messages.filter((message) => message.kind !== 'niti.l3.setup.ack.v1'),
  });
}

function mutateFunding(
  mutate: (message: FundingInputsSetupMessage) => void,
): ReturnType<typeof buildCanonicalBilateralSetupTranscript> {
  const transcript = cloneFundingTranscript(buildCanonicalBilateralSetupTranscript());
  mutate(fundingMessage(transcript.messages));
  return rebuildFundingTranscript({
    transcript,
    messages: transcript.messages,
  });
}

const canonical = buildCanonicalBilateralSetupTranscript();
const accepted = validateBilateralFundingAgreement(canonical);
assert.equal(accepted.accepted, true);
assert.equal(accepted.checks.rolesAnnounced, true);
assert.equal(accepted.checks.aliceFundingPresent, true);
assert.equal(accepted.checks.bobFundingPresent, true);
assert.equal(accepted.checks.scriptsMatchRoleAnnouncements, true);
assert.equal(accepted.checks.outpointsUnique, true);
assert.equal(accepted.checks.valuesAboveDust, true);
assert.equal(accepted.checks.feeReserveSatisfied, true);
assert.equal(accepted.checks.fundingBeforeAdaptorExchange, true);
assert.equal(accepted.participantViews.length, 2);
assert.equal(
  accepted.participantViews[0]?.fundingDigestHex,
  accepted.participantViews[1]?.fundingDigestHex,
);

const rejectionCases = [
  {
    name: 'missing bob funding',
    transcript: mutateFunding((message) => {
      message.fundingInputs = message.fundingInputs.filter((input) => input.owner !== 'bob');
    }),
    expected: /bobFundingPresent/,
  },
  {
    name: 'duplicate outpoint',
    transcript: mutateFunding((message) => {
      const alice = message.fundingInputs.find((input) => input.owner === 'alice');
      const bob = message.fundingInputs.find((input) => input.owner === 'bob');
      if (!alice || !bob) {
        throw new Error('missing fixture funding input');
      }
      bob.txid = alice.txid;
      bob.vout = alice.vout;
    }),
    expected: /outpointsUnique/,
  },
  {
    name: 'wrong script',
    transcript: mutateFunding((message) => {
      const bob = message.fundingInputs.find((input) => input.owner === 'bob');
      if (!bob) {
        throw new Error('missing bob funding input');
      }
      bob.scriptPubKeyHex = `5120${'44'.repeat(32)}`;
    }),
    expected: /scriptsMatchRoleAnnouncements/,
  },
  {
    name: 'below dust',
    transcript: mutateFunding((message) => {
      const bob = message.fundingInputs.find((input) => input.owner === 'bob');
      if (!bob) {
        throw new Error('missing bob funding input');
      }
      bob.valueSat = '1';
    }),
    expected: /valuesAboveDust/,
  },
  {
    name: 'fee reserve not satisfied',
    transcript: mutateFunding((message) => {
      const bob = message.fundingInputs.find((input) => input.owner === 'bob');
      if (!bob) {
        throw new Error('missing bob funding input');
      }
      bob.valueSat = '99999';
    }),
    expected: /feeReserveSatisfied/,
  },
  {
    name: 'funding after adaptor exchange',
    transcript: (() => {
      const transcript = transcriptWithoutAcks();
      const funding = fundingMessage(transcript.messages);
      const withoutFunding = transcript.messages.filter((message) => message !== funding);
      const adaptorIndex = withoutFunding.findIndex((message) => (
        message.kind === 'niti.l3.setup.adaptor_points.v1'
      ));
      if (adaptorIndex < 0) {
        throw new Error('missing adaptor message');
      }
      return rebuildFundingTranscript({
        transcript,
        messages: [
          ...withoutFunding.slice(0, adaptorIndex + 1),
          funding,
          ...withoutFunding.slice(adaptorIndex + 1),
        ],
      });
    })(),
    expected: /fundingBeforeAdaptorExchange/,
  },
];

const rejectionResults = rejectionCases.map((testCase) => {
  const result = validateBilateralFundingAgreement(testCase.transcript);
  assert.equal(result.accepted, false, testCase.name);
  assert.match(result.rejectionReason ?? '', testCase.expected);
  return {
    name: testCase.name,
    accepted: result.accepted,
    rejectionReason: result.rejectionReason,
  };
});

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_funding_validation_test.v1',
  accepted: {
    sessionIdHex: accepted.sessionIdHex,
    fundingDigestHex: accepted.fundingDigestHex,
    participantViews: accepted.participantViews,
    checks: accepted.checks,
  },
  rejectionResults,
}, null, 2));
