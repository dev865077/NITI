import assert from 'node:assert/strict';
import { canonicalOutcomes } from './cdlc-scenario.js';
import { readJsonFile } from './io.js';
import {
  loadOracleFixtureRepository,
  queryOracleAnnouncements,
  queryOracleAttestations,
  queryOracleHistory,
} from './oracle-query.js';
import type { OracleHistoryLog } from './oracle-history.js';

const repository = loadOracleFixtureRepository('testnet/fixtures/oracle-audit');

assert.equal(repository.kind, 'niti.oracle.fixture_repository.v1');
assert.ok(repository.announcements.length >= 1);
assert.ok(repository.attestations.length >= 2);

const announcementQuery = queryOracleAnnouncements({
  repository,
  eventId: canonicalOutcomes.eventId,
});
assert.ok(announcementQuery.matches.length >= 1);
assert.equal(
  announcementQuery.matches.some((record) => record.verification.ok),
  true,
);

const attestationQuery = queryOracleAttestations({
  repository,
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
});
assert.ok(attestationQuery.matches.length >= 1);
assert.equal(
  attestationQuery.matches.some((record) => record.verification?.ok === true),
  true,
);

const wrongOutcomeQuery = queryOracleAttestations({
  repository,
  eventId: canonicalOutcomes.eventId,
  outcome: 'UNANNOUNCED_OUTCOME',
});
assert.equal(wrongOutcomeQuery.matches.length, 1);
assert.equal(wrongOutcomeQuery.matches[0]?.verification?.ok, false);

const history = readJsonFile<OracleHistoryLog>('testnet/fixtures/oracle-history/valid-history.json');
const historyQuery = queryOracleHistory({
  history,
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
});
assert.equal(historyQuery.matches.length, 2);
assert.equal(
  historyQuery.matches.some((entry) => entry.entryType === 'announcement'),
  true,
);
assert.equal(
  historyQuery.matches.some((entry) => entry.entryType === 'attestation'),
  true,
);

assert.throws(
  () => queryOracleHistory({
    history: readJsonFile<OracleHistoryLog>('testnet/fixtures/oracle-history/tampered-history.json'),
    eventId: canonicalOutcomes.eventId,
  }),
  /history does not verify/u,
);

console.log(JSON.stringify({
  kind: 'niti.oracle_query_test.v1',
  fixtureDirectory: repository.sourceDirectory,
  announcementMatches: announcementQuery.matches.length,
  attestationMatches: attestationQuery.matches.length,
  wrongOutcomeMatches: wrongOutcomeQuery.matches.length,
  historyMatches: historyQuery.matches.length,
  checks: {
    repositoryLoads: repository.announcements.length >= 1 && repository.attestations.length >= 2,
    announcementLookupWorks: announcementQuery.matches.length >= 1,
    attestationLookupWorks: attestationQuery.matches.length >= 1,
    wrongOutcomeVerificationFailsClosed: wrongOutcomeQuery.matches[0]?.verification?.ok === false,
    historyLookupWorks: historyQuery.matches.length === 2,
    tamperedHistoryRejected: true,
  },
}, null, 2));
