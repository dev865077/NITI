import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonFile } from './io.js';
import {
  parseOracleAnnouncement,
  parseOracleAttestation,
  verifyOracleAnnouncement,
  verifyOracleAttestation,
  type OracleAnnouncement,
  type OracleAttestationEnvelope,
  type OracleVerificationResult,
} from './oracle-audit.js';
import {
  verifyOracleHistoryLog,
  type OracleHistoryLog,
} from './oracle-history.js';

export interface OracleAnnouncementRecord {
  kind: 'niti.oracle.query_announcement_record.v1';
  sourcePath: string;
  announcement: OracleAnnouncement;
  verification: OracleVerificationResult;
}

export interface OracleAttestationRecord {
  kind: 'niti.oracle.query_attestation_record.v1';
  sourcePath: string;
  attestation: OracleAttestationEnvelope;
  verification?: OracleVerificationResult;
}

export interface OracleFixtureRepository {
  kind: 'niti.oracle.fixture_repository.v1';
  sourceDirectory: string;
  announcements: OracleAnnouncementRecord[];
  attestations: OracleAttestationRecord[];
  ignoredFiles: string[];
}

export interface OracleAnnouncementQueryResult {
  kind: 'niti.oracle.announcement_query.v1';
  eventId: string;
  matches: OracleAnnouncementRecord[];
}

export interface OracleAttestationQueryResult {
  kind: 'niti.oracle.attestation_query.v1';
  eventId: string;
  outcome: string;
  announcementDigestHex?: string;
  matches: OracleAttestationRecord[];
}

export interface OracleHistoryQueryResult {
  kind: 'niti.oracle.history_query.v1';
  eventId: string;
  outcome?: string;
  rootHashHex: string;
  matches: Array<{
    sequence: number;
    observedAtIso: string;
    entryType: 'announcement' | 'attestation';
    entryHashHex: string;
    announcementDigestHex: string;
    outcome?: string;
  }>;
}

function isJsonFile(name: string): boolean {
  return name.endsWith('.json');
}

export function loadOracleFixtureRepository(directory: string): OracleFixtureRepository {
  const announcements: OracleAnnouncementRecord[] = [];
  const attestations: OracleAttestationRecord[] = [];
  const ignoredFiles: string[] = [];

  for (const name of readdirSync(directory).filter(isJsonFile).sort()) {
    const sourcePath = join(directory, name);
    const value = readJsonFile<unknown>(sourcePath);
    try {
      const announcement = parseOracleAnnouncement(value);
      announcements.push({
        kind: 'niti.oracle.query_announcement_record.v1',
        sourcePath,
        announcement,
        verification: verifyOracleAnnouncement(announcement),
      });
      continue;
    } catch {
      // Not an announcement envelope.
    }

    try {
      const attestation = parseOracleAttestation(value);
      attestations.push({
        kind: 'niti.oracle.query_attestation_record.v1',
        sourcePath,
        attestation,
      });
      continue;
    } catch {
      // Not an attestation envelope.
    }

    ignoredFiles.push(sourcePath);
  }

  return {
    kind: 'niti.oracle.fixture_repository.v1',
    sourceDirectory: directory,
    announcements,
    attestations,
    ignoredFiles,
  };
}

export function queryOracleAnnouncements(input: {
  repository: OracleFixtureRepository;
  eventId: string;
}): OracleAnnouncementQueryResult {
  return {
    kind: 'niti.oracle.announcement_query.v1',
    eventId: input.eventId,
    matches: input.repository.announcements.filter((record) => (
      record.announcement.eventId === input.eventId
    )),
  };
}

export function queryOracleAttestations(input: {
  repository: OracleFixtureRepository;
  eventId: string;
  outcome: string;
  announcementDigestHex?: string;
}): OracleAttestationQueryResult {
  const announcementsByDigest = new Map<string, OracleAnnouncementRecord>();
  for (const record of input.repository.announcements) {
    const existing = announcementsByDigest.get(record.announcement.announcementDigestHex);
    if (!existing || (!existing.verification.ok && record.verification.ok)) {
      announcementsByDigest.set(record.announcement.announcementDigestHex, record);
    }
  }
  const matches = input.repository.attestations
    .filter((record) => record.attestation.eventId === input.eventId)
    .filter((record) => record.attestation.outcome === input.outcome)
    .filter((record) => (
      input.announcementDigestHex === undefined
      || record.attestation.announcementDigestHex === input.announcementDigestHex
    ))
    .map((record) => {
      const announcementRecord = announcementsByDigest.get(record.attestation.announcementDigestHex);
      return {
        ...record,
        ...(announcementRecord
          ? {
            verification: verifyOracleAttestation({
              announcement: announcementRecord.announcement,
              attestation: record.attestation,
            }),
          }
          : {}),
      };
    });

  return {
    kind: 'niti.oracle.attestation_query.v1',
    eventId: input.eventId,
    outcome: input.outcome,
    ...(input.announcementDigestHex ? { announcementDigestHex: input.announcementDigestHex } : {}),
    matches,
  };
}

export function queryOracleHistory(input: {
  history: OracleHistoryLog;
  eventId: string;
  outcome?: string;
}): OracleHistoryQueryResult {
  const verification = verifyOracleHistoryLog(input.history);
  if (!verification.ok) {
    throw new Error(`history does not verify: ${verification.errors.join('; ')}`);
  }

  const matches = input.history.entries
    .filter((entry) => entry.payload.eventId === input.eventId)
    .filter((entry) => (
      input.outcome === undefined
      || (entry.entryType === 'attestation' && entry.payload.outcome === input.outcome)
      || (entry.entryType === 'announcement' && entry.payload.outcomes.some((outcome) => (
        outcome.outcome === input.outcome
      )))
    ))
    .map((entry) => ({
      sequence: entry.sequence,
      observedAtIso: entry.observedAtIso,
      entryType: entry.entryType,
      entryHashHex: entry.entryHashHex,
      announcementDigestHex: entry.entryType === 'announcement'
        ? entry.payload.announcementDigestHex
        : entry.payload.announcementDigestHex,
      ...(entry.entryType === 'attestation' ? { outcome: entry.payload.outcome } : {}),
    }));

  return {
    kind: 'niti.oracle.history_query.v1',
    eventId: input.eventId,
    ...(input.outcome ? { outcome: input.outcome } : {}),
    rootHashHex: input.history.rootHashHex,
    matches,
  };
}
