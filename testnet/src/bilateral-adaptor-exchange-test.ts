import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralAdaptorExchange,
  cloneAdaptorExchange,
  verifyBilateralAdaptorExchange,
  type BilateralAdaptorExchange,
} from './bilateral-adaptor-exchange.js';
import { buildCanonicalBilateralSetupTranscript } from './bilateral-setup-schema.js';

type ExchangeMutation = {
  name: string;
  mutate: (exchange: BilateralAdaptorExchange) => void;
};

const transcript = buildCanonicalBilateralSetupTranscript();
const exchange = buildCanonicalBilateralAdaptorExchange(transcript);
const aliceVerification = verifyBilateralAdaptorExchange({
  participant: 'alice',
  transcript,
  exchange,
});
const bobVerification = verifyBilateralAdaptorExchange({
  participant: 'bob',
  transcript,
  exchange,
});

assert.equal(aliceVerification.accepted, true);
assert.equal(bobVerification.accepted, true);
assert.deepEqual(aliceVerification.verifiedPurposes, ['bridge', 'child_cet', 'parent_cet']);
assert.deepEqual(bobVerification.verifiedPurposes, ['bridge', 'child_cet', 'parent_cet']);
assert.equal(exchange.messages[0]?.sender, 'alice');
assert.equal(exchange.messages[0]?.signatures[0]?.purpose, 'parent_cet');
assert.equal(exchange.messages[1]?.sender, 'bob');
assert.equal(exchange.messages[1]?.signatures.length, 2);

const parentPacket = exchange.messages[0]?.signatures[0];
const bridgePacket = exchange.messages[1]?.signatures[0];
const childPacket = exchange.messages[1]?.signatures[1];
assert.ok(parentPacket);
assert.ok(bridgePacket);
assert.ok(childPacket);

const mutations: ExchangeMutation[] = [
  {
    name: 'invalid adapted nonce',
    mutate: (candidate) => {
      candidate.messages[0]!.signatures[0]!.adaptedNonceCompressedHex =
        bridgePacket.adaptedNonceCompressedHex;
    },
  },
  {
    name: 'invalid adaptor point',
    mutate: (candidate) => {
      candidate.messages[1]!.signatures[0]!.adaptorPointCompressedHex =
        childPacket.adaptorPointCompressedHex;
    },
  },
  {
    name: 'invalid adaptor scalar',
    mutate: (candidate) => {
      candidate.messages[1]!.signatures[0]!.adaptorSignatureScalarHex = '01'.repeat(32);
    },
  },
  {
    name: 'invalid sighash binding',
    mutate: (candidate) => {
      candidate.messages[1]!.signatures[1]!.sighashHex = '22'.repeat(32);
    },
  },
  {
    name: 'invalid pubkey binding',
    mutate: (candidate) => {
      candidate.messages[0]!.signatures[0]!.signerPublicXOnlyHex =
        childPacket.signerPublicXOnlyHex;
    },
  },
  {
    name: 'invalid template digest',
    mutate: (candidate) => {
      candidate.messages[1]!.templateDigestHex = '33'.repeat(32);
    },
  },
  {
    name: 'invalid sender binding',
    mutate: (candidate) => {
      candidate.messages[1]!.sender = 'alice';
    },
  },
  {
    name: 'missing adaptor signature',
    mutate: (candidate) => {
      candidate.messages[0]!.signatures = [];
    },
  },
];

const rejectionResults = mutations.map((mutation) => {
  const candidate = cloneAdaptorExchange(exchange);
  mutation.mutate(candidate);
  const result = verifyBilateralAdaptorExchange({
    participant: 'alice',
    transcript,
    exchange: candidate,
  });
  assert.equal(result.accepted, false, mutation.name);
  assert.ok(result.rejectionReason, mutation.name);
  return {
    name: mutation.name,
    accepted: result.accepted,
    rejectionReason: result.rejectionReason,
  };
});

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_adaptor_exchange_test.v1',
  sessionIdHex: exchange.sessionIdHex,
  templateDigestHex: exchange.templateDigestHex,
  positive: {
    alice: aliceVerification,
    bob: bobVerification,
  },
  exchangeSummary: exchange.messages.map((message) => ({
    sender: message.sender,
    signaturePurposes: message.signatures.map((signature) => signature.purpose),
  })),
  rejectionResults,
}, null, 2));
