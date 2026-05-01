import assert from 'node:assert/strict';
import { readJsonFile, writeTextFile } from './io.js';
import { deterministicJson } from './manifest.js';
import {
  buildCanonicalOracleAuditFixture,
  verifyOracleAnnouncement,
  verifyOracleAttestation,
  type OracleAnnouncement,
  type OracleAttestationEnvelope,
} from './oracle-audit.js';

const fixture = buildCanonicalOracleAuditFixture();

const fixturePaths = {
  announcement: 'testnet/fixtures/oracle-audit/canonical-announcement.json',
  attestation: 'testnet/fixtures/oracle-audit/canonical-attestation.json',
  wrongOutcomeAttestation: 'testnet/fixtures/oracle-audit/wrong-outcome-attestation.json',
  mutatedAnnouncement: 'testnet/fixtures/oracle-audit/mutated-announcement.json',
} as const;

if (process.argv.includes('--write-fixtures')) {
  writeTextFile(fixturePaths.announcement, deterministicJson(fixture.announcement));
  writeTextFile(fixturePaths.attestation, deterministicJson(fixture.attestation));
  writeTextFile(
    fixturePaths.wrongOutcomeAttestation,
    deterministicJson(fixture.wrongOutcomeAttestation),
  );
  writeTextFile(fixturePaths.mutatedAnnouncement, deterministicJson(fixture.mutatedAnnouncement));
}

const announcement = readJsonFile<OracleAnnouncement>(fixturePaths.announcement);
const attestation = readJsonFile<OracleAttestationEnvelope>(fixturePaths.attestation);
const wrongOutcomeAttestation = readJsonFile<OracleAttestationEnvelope>(
  fixturePaths.wrongOutcomeAttestation,
);
const mutatedAnnouncement = readJsonFile<OracleAnnouncement>(fixturePaths.mutatedAnnouncement);

assert.equal(deterministicJson(announcement), deterministicJson(fixture.announcement));
assert.equal(deterministicJson(attestation), deterministicJson(fixture.attestation));
assert.equal(
  deterministicJson(wrongOutcomeAttestation),
  deterministicJson(fixture.wrongOutcomeAttestation),
);
assert.equal(deterministicJson(mutatedAnnouncement), deterministicJson(fixture.mutatedAnnouncement));

const announcementResult = verifyOracleAnnouncement(announcement);
assert.equal(announcementResult.ok, true, announcementResult.errors.join('; '));
assert.equal(announcementResult.checks.announcementSignatureUsesSeparateNonce, true);

const attestationResult = verifyOracleAttestation({ announcement, attestation });
assert.equal(attestationResult.ok, true, attestationResult.errors.join('; '));

const wrongOutcomeResult = verifyOracleAttestation({
  announcement,
  attestation: wrongOutcomeAttestation,
});
assert.equal(wrongOutcomeResult.ok, false);
assert.equal(wrongOutcomeResult.checks.outcomeIsAnnounced, false);
assert.match(wrongOutcomeResult.errors.join('; '), /not in the announcement/u);

const mutatedAnnouncementResult = verifyOracleAnnouncement(mutatedAnnouncement);
assert.equal(mutatedAnnouncementResult.ok, false);
assert.equal(mutatedAnnouncementResult.checks.outcomeMessageHashesMatch, false);
assert.equal(mutatedAnnouncementResult.checks.digestMatchesPayload, false);

const unknownFieldResult = verifyOracleAnnouncement({
  ...announcement,
  futureField: true,
});
assert.equal(unknownFieldResult.ok, false);
assert.match(unknownFieldResult.errors.join('; '), /unknown field/u);

const mismatchedBindingResult = verifyOracleAttestation({
  announcement: mutatedAnnouncement,
  attestation,
});
assert.equal(mismatchedBindingResult.ok, false);
assert.equal(mismatchedBindingResult.checks.announcementDigestMatches, true);
assert.equal(mismatchedBindingResult.checks.messageHashMatchesAnnouncement, false);

function flipLastHexChar(hex: string): string {
  const last = hex.at(-1);
  return `${hex.slice(0, -1)}${last === '0' ? '1' : '0'}`;
}

const tamperedSignatureResult = verifyOracleAttestation({
  announcement,
  attestation: {
    ...attestation,
    bip340SignatureHex: flipLastHexChar(attestation.bip340SignatureHex),
  },
});
assert.equal(tamperedSignatureResult.ok, false);
assert.equal(tamperedSignatureResult.checks.signatureScalarMatchesSecret, false);

console.log(JSON.stringify({
  kind: 'niti.oracle_audit_test.v1',
  announcementDigestHex: announcement.announcementDigestHex,
  attestationOutcome: attestation.outcome,
  outcomeCount: announcement.outcomes.length,
  checks: {
    fixtureMatchesBuilder: true,
    announcementVerifies: announcementResult.ok,
    attestationVerifies: attestationResult.ok,
    wrongOutcomeRejected: !wrongOutcomeResult.ok,
    mutatedAnnouncementRejected: !mutatedAnnouncementResult.ok,
    unknownFieldRejected: !unknownFieldResult.ok,
    mismatchedBindingRejected: !mismatchedBindingResult.ok,
    tamperedSignatureRejected: !tamperedSignatureResult.ok,
  },
}, null, 2));
