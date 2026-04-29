import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralSetupTranscript,
  canonicalJson,
  setupMessageDigestHex,
  validateBilateralSetupMessage,
  validateBilateralSetupTranscript,
  type BilateralSetupProtocolMessage,
} from './bilateral-setup-schema.js';

const transcript = buildCanonicalBilateralSetupTranscript();
const validated = validateBilateralSetupTranscript(transcript);
const rebuilt = buildCanonicalBilateralSetupTranscript();

assert.equal(validated.kind, 'niti.l3.bilateral_setup_transcript.v1');
assert.equal(validated.messages.length, 11);
assert.deepEqual(
  validated.messageDigests,
  validated.messages.map(setupMessageDigestHex),
);
assert.equal(canonicalJson(transcript), canonicalJson(rebuilt));

const kinds = new Set(validated.messages.map((message) => message.kind));
assert.equal(kinds.has('niti.l3.setup.role_announcement.v1'), true);
assert.equal(kinds.has('niti.l3.setup.oracle_event_selection.v1'), true);
assert.equal(kinds.has('niti.l3.setup.funding_inputs.v1'), true);
assert.equal(kinds.has('niti.l3.setup.payout_graph.v1'), true);
assert.equal(kinds.has('niti.l3.setup.cet_templates.v1'), true);
assert.equal(kinds.has('niti.l3.setup.bridge_templates.v1'), true);
assert.equal(kinds.has('niti.l3.setup.refund_templates.v1'), true);
assert.equal(kinds.has('niti.l3.setup.adaptor_points.v1'), true);
assert.equal(kinds.has('niti.l3.setup.ack.v1'), true);

const first = validated.messages[0] as BilateralSetupProtocolMessage;
assert.throws(
  () => validateBilateralSetupMessage({
    ...first,
    criticalFields: ['futureRequiredField'],
  }),
  /unknown critical field/,
);
assert.throws(
  () => validateBilateralSetupMessage({
    ...first,
    futureNonCriticalField: true,
  }),
  /unknown field/,
);
assert.throws(
  () => validateBilateralSetupTranscript({
    ...transcript,
    messageDigests: transcript.messageDigests.slice(1),
  }),
  /digest count mismatch/,
);
const adaptorPointsMessage = validated.messages.find((message) => (
  message.kind === 'niti.l3.setup.adaptor_points.v1'
));
assert.ok(adaptorPointsMessage);
assert.throws(
  () => validateBilateralSetupMessage({
    ...adaptorPointsMessage,
    points: [
      {
        purpose: 'unsupported_future_purpose',
        eventId: 'event',
        outcome: 'outcome',
        pointCompressedHex: '02'.padEnd(66, '0'),
      },
    ],
  }),
  /unsupported/,
);
assert.throws(
  () => validateBilateralSetupTranscript({
    ...transcript,
    messages: transcript.messages.map((message) => (
      message.kind === 'niti.l3.setup.ack.v1'
        ? {
          ...message,
          acknowledgedDigestHex: '0'.repeat(64),
        }
        : message
    )),
    messageDigests: transcript.messages.map((message) => setupMessageDigestHex(
      message.kind === 'niti.l3.setup.ack.v1'
        ? {
          ...message,
          acknowledgedDigestHex: '0'.repeat(64),
        }
        : message,
    )),
  }),
  /unknown prior digest/,
);

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_setup_schema_test.v1',
  transcriptKind: validated.kind,
  schemaVersion: validated.schemaVersion,
  sessionIdHex: validated.sessionIdHex,
  messageCount: validated.messages.length,
  messageKinds: [...kinds],
  firstMessageDigestHex: validated.messageDigests[0],
  lastMessageDigestHex: validated.messageDigests[validated.messageDigests.length - 1],
  checks: {
    deterministicCanonicalJson: canonicalJson(transcript) === canonicalJson(rebuilt),
    digestsMatchMessages: validated.messageDigests.every((digest, index) => (
      digest === setupMessageDigestHex(validated.messages[index] as BilateralSetupProtocolMessage)
    )),
    rejectsUnknownCriticalFields: true,
    rejectsUnknownFields: true,
    rejectsTranscriptDigestMismatch: true,
    rejectsUnsupportedAdaptorPurpose: true,
    rejectsUnknownAckDigest: true,
  },
}, null, 2));
