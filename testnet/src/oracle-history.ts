import { bytesToHex } from './bytes.js';
import { canonicalOutcomes, canonicalSecrets } from './cdlc-scenario.js';
import { deterministicJson } from './manifest.js';
import {
  buildCanonicalOracleAuditFixture,
  buildOracleAnnouncement,
  buildOracleAttestationEnvelope,
  parseOracleAnnouncement,
  parseOracleAttestation,
  verifyOracleAnnouncement,
  verifyOracleAttestation,
  type OracleAnnouncement,
  type OracleAttestationEnvelope,
  type OracleSourcePolicy,
  type OracleVerificationResult,
} from './oracle-audit.js';
import { sha256Text } from './secp.js';

export const oracleHistorySchemaVersion = 1 as const;
export const oracleHistoryZeroHashHex = '0'.repeat(64);

export type OracleHistoryEntryType = 'announcement' | 'attestation';

export interface OracleHistoryEntryBase {
  kind: 'niti.oracle.history_entry.v1';
  schemaVersion: typeof oracleHistorySchemaVersion;
  sequence: number;
  observedAtIso: string;
  previousEntryHashHex: string;
  entryType: OracleHistoryEntryType;
}

export interface OracleAnnouncementHistoryEntry extends OracleHistoryEntryBase {
  entryType: 'announcement';
  payload: OracleAnnouncement;
  entryHashHex: string;
}

export interface OracleAttestationHistoryEntry extends OracleHistoryEntryBase {
  entryType: 'attestation';
  payload: OracleAttestationEnvelope;
  entryHashHex: string;
}

export type OracleHistoryEntry =
  | OracleAnnouncementHistoryEntry
  | OracleAttestationHistoryEntry;

export interface OracleHistoryLog {
  kind: 'niti.oracle.history_log.v1';
  schemaVersion: typeof oracleHistorySchemaVersion;
  entries: OracleHistoryEntry[];
  rootHashHex: string;
}

export interface OracleHistoryVerificationResult {
  ok: boolean;
  rootHashHex: string;
  errors: string[];
  checks: Record<string, boolean>;
}

export type OracleFaultType =
  | 'nonce_reuse_across_events'
  | 'inconsistent_announcement_root'
  | 'multiple_attestations_for_event';

export interface OracleFaultEvidence {
  faultType: OracleFaultType;
  oraclePublicXOnlyHex: string;
  noncePointXOnlyHex: string;
  eventIds: string[];
  announcementDigestHexes: string[];
  outcomes: string[];
}

export interface OracleHistoryMonitorResult {
  ok: boolean;
  faults: OracleFaultEvidence[];
  history: OracleHistoryVerificationResult;
}

type OracleHistoryPayload = OracleAnnouncement | OracleAttestationEnvelope;

function entryDigestPayload(entry: Omit<OracleHistoryEntry, 'entryHashHex'>): Omit<OracleHistoryEntry, 'entryHashHex'> {
  return entry;
}

export function oracleHistoryEntryHashHex(entry: Omit<OracleHistoryEntry, 'entryHashHex'>): string {
  return bytesToHex(sha256Text(deterministicJson(entryDigestPayload(entry))));
}

function makeEntry(input: {
  sequence: number;
  observedAtIso: string;
  previousEntryHashHex: string;
  entryType: OracleHistoryEntryType;
  payload: OracleHistoryPayload;
}): OracleHistoryEntry {
  const base = {
    kind: 'niti.oracle.history_entry.v1',
    schemaVersion: oracleHistorySchemaVersion,
    sequence: input.sequence,
    observedAtIso: input.observedAtIso,
    previousEntryHashHex: input.previousEntryHashHex,
    entryType: input.entryType,
    payload: input.payload,
  } as const;
  const entryHashHex = oracleHistoryEntryHashHex(base);
  if (input.entryType === 'announcement') {
    return {
      ...base,
      entryType: 'announcement',
      payload: input.payload as OracleAnnouncement,
      entryHashHex,
    };
  }
  return {
    ...base,
    entryType: 'attestation',
    payload: input.payload as OracleAttestationEnvelope,
    entryHashHex,
  };
}

export function buildOracleHistoryLog(
  items: Array<{
    observedAtIso: string;
    entryType: OracleHistoryEntryType;
    payload: OracleHistoryPayload;
  }>,
): OracleHistoryLog {
  let previousEntryHashHex = oracleHistoryZeroHashHex;
  const entries = items.map((item, index) => {
    const entry = makeEntry({
      sequence: index + 1,
      observedAtIso: item.observedAtIso,
      previousEntryHashHex,
      entryType: item.entryType,
      payload: item.payload,
    });
    previousEntryHashHex = entry.entryHashHex;
    return entry;
  });
  return {
    kind: 'niti.oracle.history_log.v1',
    schemaVersion: oracleHistorySchemaVersion,
    entries,
    rootHashHex: previousEntryHashHex,
  };
}

function parseHistoryLog(value: unknown): OracleHistoryLog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('history log must be an object');
  }
  const candidate = value as Partial<OracleHistoryLog>;
  if (candidate.kind !== 'niti.oracle.history_log.v1') {
    throw new Error('history log kind is unsupported');
  }
  if (candidate.schemaVersion !== oracleHistorySchemaVersion) {
    throw new Error(`history log schemaVersion must be ${oracleHistorySchemaVersion}`);
  }
  if (!Array.isArray(candidate.entries)) {
    throw new Error('history log entries must be an array');
  }
  if (typeof candidate.rootHashHex !== 'string' || !/^[0-9a-f]{64}$/u.test(candidate.rootHashHex)) {
    throw new Error('history log rootHashHex must be 32 bytes of lowercase hex');
  }
  return candidate as OracleHistoryLog;
}

export function verifyOracleHistoryLog(value: unknown): OracleHistoryVerificationResult {
  const errors: string[] = [];
  const checks: Record<string, boolean> = {
    parses: false,
    sequencesAreContiguous: true,
    previousHashesMatch: true,
    entryHashesMatch: true,
    observedTimestampsParse: true,
    announcementPayloadsVerify: true,
    attestationPayloadsVerify: true,
    rootMatchesLastEntry: false,
  };
  let rootHashHex = oracleHistoryZeroHashHex;

  try {
    const log = parseHistoryLog(value);
    checks.parses = true;
    const announcementsByDigest = new Map<string, OracleAnnouncement>();
    let previousEntryHashHex = oracleHistoryZeroHashHex;

    log.entries.forEach((entry, index) => {
      if (entry.sequence !== index + 1) {
        checks.sequencesAreContiguous = false;
        errors.push(`entry ${index} sequence is not contiguous`);
      }
      if (entry.previousEntryHashHex !== previousEntryHashHex) {
        checks.previousHashesMatch = false;
        errors.push(`entry ${index} previous hash does not match`);
      }
      if (!Number.isFinite(Date.parse(entry.observedAtIso))) {
        checks.observedTimestampsParse = false;
        errors.push(`entry ${index} observedAtIso is not parseable`);
      }

      const expectedHash = oracleHistoryEntryHashHex({
        kind: entry.kind,
        schemaVersion: entry.schemaVersion,
        sequence: entry.sequence,
        observedAtIso: entry.observedAtIso,
        previousEntryHashHex: entry.previousEntryHashHex,
        entryType: entry.entryType,
        payload: entry.payload,
      } as Omit<OracleHistoryEntry, 'entryHashHex'>);
      if (entry.entryHashHex !== expectedHash) {
        checks.entryHashesMatch = false;
        errors.push(`entry ${index} hash does not match payload`);
      }

      if (entry.entryType === 'announcement') {
        const result = verifyOracleAnnouncement(entry.payload);
        if (!result.ok) {
          checks.announcementPayloadsVerify = false;
          errors.push(...result.errors.map((error) => `entry ${index} announcement: ${error}`));
        } else {
          const announcement = parseOracleAnnouncement(entry.payload);
          announcementsByDigest.set(announcement.announcementDigestHex, announcement);
        }
      } else if (entry.entryType === 'attestation') {
        const attestation = parseOracleAttestation(entry.payload);
        const announcement = announcementsByDigest.get(attestation.announcementDigestHex);
        if (!announcement) {
          checks.attestationPayloadsVerify = false;
          errors.push(`entry ${index} attestation has no prior announcement`);
        } else {
          const result = verifyOracleAttestation({ announcement, attestation });
          if (!result.ok) {
            checks.attestationPayloadsVerify = false;
            errors.push(...result.errors.map((error) => `entry ${index} attestation: ${error}`));
          }
        }
      } else {
        errors.push(`entry ${index} type is unsupported`);
      }

      previousEntryHashHex = entry.entryHashHex;
    });

    rootHashHex = log.entries.at(-1)?.entryHashHex ?? oracleHistoryZeroHashHex;
    checks.rootMatchesLastEntry = log.rootHashHex === rootHashHex;
    if (!checks.rootMatchesLastEntry) {
      errors.push('history rootHashHex does not match the last entry');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    ok: errors.length === 0 && Object.values(checks).every(Boolean),
    rootHashHex,
    errors,
    checks,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function monitorOracleHistory(value: unknown): OracleHistoryMonitorResult {
  const history = verifyOracleHistoryLog(value);
  const faults: OracleFaultEvidence[] = [];
  if (!history.ok) {
    return { ok: false, faults, history };
  }

  const log = parseHistoryLog(value);
  const announcements = log.entries
    .filter((entry): entry is OracleAnnouncementHistoryEntry => entry.entryType === 'announcement')
    .map((entry) => parseOracleAnnouncement(entry.payload));
  const announcementsByDigest = new Map(announcements.map((announcement) => [
    announcement.announcementDigestHex,
    announcement,
  ]));
  const attestations = log.entries
    .filter((entry): entry is OracleAttestationHistoryEntry => entry.entryType === 'attestation')
    .map((entry) => parseOracleAttestation(entry.payload));

  const byNonce = new Map<string, OracleAnnouncement[]>();
  for (const announcement of announcements) {
    const key = `${announcement.oraclePublicXOnlyHex}:${announcement.noncePointXOnlyHex}`;
    byNonce.set(key, [...(byNonce.get(key) ?? []), announcement]);
  }
  for (const group of byNonce.values()) {
    const eventIds = unique(group.map((announcement) => announcement.eventId));
    if (eventIds.length > 1) {
      faults.push({
        faultType: 'nonce_reuse_across_events',
        oraclePublicXOnlyHex: group[0]?.oraclePublicXOnlyHex ?? '',
        noncePointXOnlyHex: group[0]?.noncePointXOnlyHex ?? '',
        eventIds,
        announcementDigestHexes: unique(group.map((announcement) => announcement.announcementDigestHex)),
        outcomes: [],
      });
    }
  }

  const byEventNonce = new Map<string, OracleAnnouncement[]>();
  for (const announcement of announcements) {
    const key = [
      announcement.oraclePublicXOnlyHex,
      announcement.noncePointXOnlyHex,
      announcement.eventId,
    ].join(':');
    byEventNonce.set(key, [...(byEventNonce.get(key) ?? []), announcement]);
  }
  for (const group of byEventNonce.values()) {
    const digests = unique(group.map((announcement) => announcement.announcementDigestHex));
    if (digests.length > 1) {
      faults.push({
        faultType: 'inconsistent_announcement_root',
        oraclePublicXOnlyHex: group[0]?.oraclePublicXOnlyHex ?? '',
        noncePointXOnlyHex: group[0]?.noncePointXOnlyHex ?? '',
        eventIds: unique(group.map((announcement) => announcement.eventId)),
        announcementDigestHexes: digests,
        outcomes: [],
      });
    }
  }

  const attestationGroups = new Map<string, OracleAttestationEnvelope[]>();
  for (const attestation of attestations) {
    attestationGroups.set(
      attestation.announcementDigestHex,
      [...(attestationGroups.get(attestation.announcementDigestHex) ?? []), attestation],
    );
  }
  for (const [announcementDigestHex, group] of attestationGroups.entries()) {
    const outcomes = unique(group.map((attestation) => attestation.outcome));
    if (outcomes.length > 1) {
      const announcement = announcementsByDigest.get(announcementDigestHex);
      faults.push({
        faultType: 'multiple_attestations_for_event',
        oraclePublicXOnlyHex: announcement?.oraclePublicXOnlyHex ?? '',
        noncePointXOnlyHex: announcement?.noncePointXOnlyHex ?? '',
        eventIds: unique(group.map((attestation) => attestation.eventId)),
        announcementDigestHexes: [announcementDigestHex],
        outcomes,
      });
    }
  }

  return {
    ok: faults.length === 0,
    faults,
    history,
  };
}

export interface OracleHistoryFixtureSet {
  kind: 'niti.oracle.history_fixture_set.v1';
  validHistory: OracleHistoryLog;
  nonceReuseHistory: OracleHistoryLog;
  equivocationHistory: OracleHistoryLog;
  tamperedHistory: OracleHistoryLog;
}

export function buildCanonicalOracleHistoryFixtures(): OracleHistoryFixtureSet {
  const audit = buildCanonicalOracleAuditFixture();
  const sourcePolicy: OracleSourcePolicy = {
    kind: 'niti.oracle.source_policy.v1',
    policyId: 'niti-canonical-oracle-fixture',
    description: 'Deterministic test fixture policy; no market-data truth claim.',
  };
  const secondAnnouncement = buildOracleAnnouncement({
    eventId: `${canonicalOutcomes.eventId}:second-event`,
    outcomes: [canonicalOutcomes.activating],
    oracleSecretHex: canonicalSecrets.oracle,
    nonceSecretHex: canonicalSecrets.oracleNonce,
    announcementSignatureNonceHex: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    expiryIso: '2026-04-30T12:05:00Z',
    sourcePolicy,
  });
  const conflictingAttestation = buildOracleAttestationEnvelope({
    announcement: audit.announcement,
    outcome: canonicalOutcomes.wrong,
    oracleSecretHex: canonicalSecrets.oracle,
    nonceSecretHex: canonicalSecrets.oracleNonce,
  });

  const validHistory = buildOracleHistoryLog([
    {
      observedAtIso: '2026-04-30T12:00:00Z',
      entryType: 'announcement',
      payload: audit.announcement,
    },
    {
      observedAtIso: '2026-04-30T12:01:00Z',
      entryType: 'attestation',
      payload: audit.attestation,
    },
  ]);
  const nonceReuseHistory = buildOracleHistoryLog([
    {
      observedAtIso: '2026-04-30T12:00:00Z',
      entryType: 'announcement',
      payload: audit.announcement,
    },
    {
      observedAtIso: '2026-04-30T12:05:00Z',
      entryType: 'announcement',
      payload: secondAnnouncement,
    },
  ]);
  const equivocationHistory = buildOracleHistoryLog([
    {
      observedAtIso: '2026-04-30T12:00:00Z',
      entryType: 'announcement',
      payload: audit.announcement,
    },
    {
      observedAtIso: '2026-04-30T12:01:00Z',
      entryType: 'attestation',
      payload: audit.attestation,
    },
    {
      observedAtIso: '2026-04-30T12:01:30Z',
      entryType: 'attestation',
      payload: conflictingAttestation,
    },
  ]);
  const tamperedHistory: OracleHistoryLog = {
    ...validHistory,
    entries: validHistory.entries.slice(1),
  };
  return {
    kind: 'niti.oracle.history_fixture_set.v1',
    validHistory,
    nonceReuseHistory,
    equivocationHistory,
    tamperedHistory,
  };
}
