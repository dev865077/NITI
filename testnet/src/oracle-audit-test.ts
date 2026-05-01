import assert from 'node:assert/strict';
import { readJsonFile, writeTextFile } from './io.js';
import { deterministicJson } from './manifest.js';
import {
  buildCanonicalOracleAuditFixture,
  verifyOracleAnnouncement,
  verifyOracleAnnouncementFreshness,
  verifyOracleAttestation,
  type OracleAnnouncement,
  type OracleAttestationEnvelope,
} from './oracle-audit.js';

const fixture = buildCanonicalOracleAuditFixture();

const fixturePaths = {
  announcement: 'testnet/fixtures/oracle-audit/canonical-announcement.json',
  staleAnnouncement: 'testnet/fixtures/oracle-audit/stale-announcement.json',
  attestation: 'testnet/fixtures/oracle-audit/canonical-attestation.json',
  wrongOutcomeAttestation: 'testnet/fixtures/oracle-audit/wrong-outcome-attestation.json',
  wrongNonceAttestation: 'testnet/fixtures/oracle-audit/wrong-nonce-attestation.json',
  equivocationAttestation: 'testnet/fixtures/oracle-audit/equivocation-attestation.json',
  malformedSignatureAttestation: 'testnet/fixtures/oracle-audit/malformed-signature-attestation.json',
  mutatedAnnouncement: 'testnet/fixtures/oracle-audit/mutated-announcement.json',
} as const;

if (process.argv.includes('--write-fixtures')) {
  writeTextFile(fixturePaths.announcement, deterministicJson(fixture.announcement));
  writeTextFile(fixturePaths.staleAnnouncement, deterministicJson(fixture.staleAnnouncement));
  writeTextFile(fixturePaths.attestation, deterministicJson(fixture.attestation));
  writeTextFile(
    fixturePaths.wrongOutcomeAttestation,
    deterministicJson(fixture.wrongOutcomeAttestation),
  );
  writeTextFile(fixturePaths.wrongNonceAttestation, deterministicJson(fixture.wrongNonceAttestation));
  writeTextFile(fixturePaths.equivocationAttestation, deterministicJson(fixture.equivocationAttestation));
  writeTextFile(
    fixturePaths.malformedSignatureAttestation,
    deterministicJson(fixture.malformedSignatureAttestation),
  );
  writeTextFile(fixturePaths.mutatedAnnouncement, deterministicJson(fixture.mutatedAnnouncement));
}

const announcement = readJsonFile<OracleAnnouncement>(fixturePaths.announcement);
const staleAnnouncement = readJsonFile<OracleAnnouncement>(fixturePaths.staleAnnouncement);
const attestation = readJsonFile<OracleAttestationEnvelope>(fixturePaths.attestation);
const wrongOutcomeAttestation = readJsonFile<OracleAttestationEnvelope>(
  fixturePaths.wrongOutcomeAttestation,
);
const wrongNonceAttestation = readJsonFile<OracleAttestationEnvelope>(
  fixturePaths.wrongNonceAttestation,
);
const equivocationAttestation = readJsonFile<OracleAttestationEnvelope>(
  fixturePaths.equivocationAttestation,
);
const malformedSignatureAttestation = readJsonFile<OracleAttestationEnvelope>(
  fixturePaths.malformedSignatureAttestation,
);
const mutatedAnnouncement = readJsonFile<OracleAnnouncement>(fixturePaths.mutatedAnnouncement);

assert.equal(deterministicJson(announcement), deterministicJson(fixture.announcement));
assert.equal(deterministicJson(staleAnnouncement), deterministicJson(fixture.staleAnnouncement));
assert.equal(deterministicJson(attestation), deterministicJson(fixture.attestation));
assert.equal(
  deterministicJson(wrongOutcomeAttestation),
  deterministicJson(fixture.wrongOutcomeAttestation),
);
assert.equal(
  deterministicJson(wrongNonceAttestation),
  deterministicJson(fixture.wrongNonceAttestation),
);
assert.equal(
  deterministicJson(equivocationAttestation),
  deterministicJson(fixture.equivocationAttestation),
);
assert.equal(
  deterministicJson(malformedSignatureAttestation),
  deterministicJson(fixture.malformedSignatureAttestation),
);
assert.equal(deterministicJson(mutatedAnnouncement), deterministicJson(fixture.mutatedAnnouncement));

const announcementResult = verifyOracleAnnouncement(announcement);
assert.equal(announcementResult.ok, true, announcementResult.errors.join('; '));
assert.equal(announcementResult.checks.announcementSignatureUsesSeparateNonce, true);

const attestationResult = verifyOracleAttestation({ announcement, attestation });
assert.equal(attestationResult.ok, true, attestationResult.errors.join('; '));

const freshnessResult = verifyOracleAnnouncementFreshness({
  announcement,
  nowIso: '2026-04-29T12:00:00Z',
});
assert.equal(freshnessResult.ok, true, freshnessResult.errors.join('; '));

const staleFreshnessResult = verifyOracleAnnouncementFreshness({
  announcement: staleAnnouncement,
  nowIso: '2026-04-29T12:00:00Z',
});
assert.equal(staleFreshnessResult.ok, false);
assert.equal(staleFreshnessResult.checks.notExpired, false);
assert.match(staleFreshnessResult.errors.join('; '), /expired/u);

const wrongOutcomeResult = verifyOracleAttestation({
  announcement,
  attestation: wrongOutcomeAttestation,
});
assert.equal(wrongOutcomeResult.ok, false);
assert.equal(wrongOutcomeResult.checks.outcomeIsAnnounced, false);
assert.match(wrongOutcomeResult.errors.join('; '), /not in the announcement/u);

const wrongNonceResult = verifyOracleAttestation({
  announcement,
  attestation: wrongNonceAttestation,
});
assert.equal(wrongNonceResult.ok, false);
assert.equal(wrongNonceResult.checks.signatureNonceMatchesAnnouncement, false);
assert.equal(wrongNonceResult.checks.attestationPointMatchesAnnouncement, false);

const equivocationResult = verifyOracleAttestation({
  announcement,
  attestation: equivocationAttestation,
});
assert.equal(equivocationResult.ok, true, equivocationResult.errors.join('; '));
assert.notEqual(equivocationAttestation.outcome, attestation.outcome);
assert.equal(
  equivocationAttestation.bip340SignatureHex.slice(0, 64),
  attestation.bip340SignatureHex.slice(0, 64),
);

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

const tamperedSignatureResult = verifyOracleAttestation({
  announcement,
  attestation: malformedSignatureAttestation,
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
    freshnessVerifies: freshnessResult.ok,
    staleEventRejected: !staleFreshnessResult.ok,
    wrongOutcomeRejected: !wrongOutcomeResult.ok,
    wrongNonceRejected: !wrongNonceResult.ok,
    equivocationFixtureVerifies: equivocationResult.ok,
    mutatedAnnouncementRejected: !mutatedAnnouncementResult.ok,
    unknownFieldRejected: !unknownFieldResult.ok,
    mismatchedBindingRejected: !mismatchedBindingResult.ok,
    tamperedSignatureRejected: !tamperedSignatureResult.ok,
  },
}, null, 2));
