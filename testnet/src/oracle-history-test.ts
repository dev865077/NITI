import assert from 'node:assert/strict';
import { readJsonFile, writeTextFile } from './io.js';
import { deterministicJson } from './manifest.js';
import {
  buildCanonicalOracleHistoryFixtures,
  monitorOracleHistory,
  verifyOracleHistoryLog,
  type OracleHistoryLog,
} from './oracle-history.js';

const fixtures = buildCanonicalOracleHistoryFixtures();

const fixturePaths = {
  validHistory: 'testnet/fixtures/oracle-history/valid-history.json',
  nonceReuseHistory: 'testnet/fixtures/oracle-history/nonce-reuse-history.json',
  equivocationHistory: 'testnet/fixtures/oracle-history/equivocation-history.json',
  tamperedHistory: 'testnet/fixtures/oracle-history/tampered-history.json',
} as const;

if (process.argv.includes('--write-fixtures')) {
  writeTextFile(fixturePaths.validHistory, deterministicJson(fixtures.validHistory));
  writeTextFile(fixturePaths.nonceReuseHistory, deterministicJson(fixtures.nonceReuseHistory));
  writeTextFile(fixturePaths.equivocationHistory, deterministicJson(fixtures.equivocationHistory));
  writeTextFile(fixturePaths.tamperedHistory, deterministicJson(fixtures.tamperedHistory));
}

const validHistory = readJsonFile<OracleHistoryLog>(fixturePaths.validHistory);
const nonceReuseHistory = readJsonFile<OracleHistoryLog>(fixturePaths.nonceReuseHistory);
const equivocationHistory = readJsonFile<OracleHistoryLog>(fixturePaths.equivocationHistory);
const tamperedHistory = readJsonFile<OracleHistoryLog>(fixturePaths.tamperedHistory);

assert.equal(deterministicJson(validHistory), deterministicJson(fixtures.validHistory));
assert.equal(deterministicJson(nonceReuseHistory), deterministicJson(fixtures.nonceReuseHistory));
assert.equal(deterministicJson(equivocationHistory), deterministicJson(fixtures.equivocationHistory));
assert.equal(deterministicJson(tamperedHistory), deterministicJson(fixtures.tamperedHistory));

const validVerification = verifyOracleHistoryLog(validHistory);
assert.equal(validVerification.ok, true, validVerification.errors.join('; '));

const validMonitor = monitorOracleHistory(validHistory);
assert.equal(validMonitor.ok, true);
assert.equal(validMonitor.faults.length, 0);

const nonceReuseVerification = verifyOracleHistoryLog(nonceReuseHistory);
assert.equal(nonceReuseVerification.ok, true, nonceReuseVerification.errors.join('; '));
const nonceReuseMonitor = monitorOracleHistory(nonceReuseHistory);
assert.equal(nonceReuseMonitor.ok, false);
assert.equal(
  nonceReuseMonitor.faults.some((fault) => fault.faultType === 'nonce_reuse_across_events'),
  true,
);

const equivocationVerification = verifyOracleHistoryLog(equivocationHistory);
assert.equal(equivocationVerification.ok, true, equivocationVerification.errors.join('; '));
const equivocationMonitor = monitorOracleHistory(equivocationHistory);
assert.equal(equivocationMonitor.ok, false);
assert.equal(
  equivocationMonitor.faults.some((fault) => fault.faultType === 'multiple_attestations_for_event'),
  true,
);

const tamperedVerification = verifyOracleHistoryLog(tamperedHistory);
assert.equal(tamperedVerification.ok, false);
assert.equal(tamperedVerification.checks.sequencesAreContiguous, false);
assert.equal(tamperedVerification.checks.previousHashesMatch, false);

const mutatedRoot = {
  ...validHistory,
  rootHashHex: 'f'.repeat(64),
};
const mutatedRootVerification = verifyOracleHistoryLog(mutatedRoot);
assert.equal(mutatedRootVerification.ok, false);
assert.equal(mutatedRootVerification.checks.rootMatchesLastEntry, false);

console.log(JSON.stringify({
  kind: 'niti.oracle_history_test.v1',
  validRootHashHex: validHistory.rootHashHex,
  nonceReuseFaults: nonceReuseMonitor.faults.map((fault) => fault.faultType),
  equivocationFaults: equivocationMonitor.faults.map((fault) => fault.faultType),
  checks: {
    fixtureMatchesBuilder: true,
    validHistoryVerifies: validVerification.ok,
    validHistoryHasNoFaults: validMonitor.ok,
    nonceReuseDetected: !nonceReuseMonitor.ok,
    equivocationDetected: !equivocationMonitor.ok,
    deletionDetected: !tamperedVerification.ok,
    rootTamperDetected: !mutatedRootVerification.ok,
  },
}, null, 2));
