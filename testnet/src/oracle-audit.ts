import { Point } from '@noble/secp256k1';
import { bytesToHex, hexToBytes, requireHexBytes } from './bytes.js';
import { deterministicJson } from './manifest.js';
import {
  bip340Challenge,
  attestOracleOutcome,
  createBip340Signature,
  hasEvenY,
  pointFromCompressed,
  pointToCompressed,
  pointToXOnly,
  prepareOracleOutcome,
  scalarFromHex,
  sha256Text,
  verifyBip340Signature,
} from './secp.js';
import {
  canonicalOutcomes,
  canonicalSecrets,
} from './cdlc-scenario.js';

export const oracleAuditSchemaVersion = 1 as const;

export interface OracleSourcePolicy {
  kind: 'niti.oracle.source_policy.v1';
  policyId: string;
  description: string;
}

export interface OracleAnnouncementOutcome {
  outcome: string;
  messageHashHex: string;
  attestationPointCompressedHex: string;
}

export interface OracleAnnouncementSigningPayload {
  kind: 'niti.oracle.announcement.v1';
  schemaVersion: typeof oracleAuditSchemaVersion;
  eventId: string;
  oraclePublicXOnlyHex: string;
  oraclePublicCompressedHex: string;
  noncePointXOnlyHex: string;
  noncePointCompressedHex: string;
  outcomes: OracleAnnouncementOutcome[];
  expiryIso: string;
  sourcePolicy: OracleSourcePolicy;
}

export interface OracleAnnouncement extends OracleAnnouncementSigningPayload {
  announcementDigestHex: string;
  announcementSignatureHex: string;
}

export interface OracleAttestationEnvelope {
  kind: 'niti.oracle.attestation.v1';
  schemaVersion: typeof oracleAuditSchemaVersion;
  eventId: string;
  outcome: string;
  announcementDigestHex: string;
  messageHashHex: string;
  attestationSecretHex: string;
  attestationPointCompressedHex: string;
  bip340SignatureHex: string;
}

export interface OracleVerificationResult {
  ok: boolean;
  errors: string[];
  checks: Record<string, boolean>;
}

export interface OracleAuditFixture {
  kind: 'niti.oracle.audit_fixture.v1';
  announcement: OracleAnnouncement;
  attestation: OracleAttestationEnvelope;
  wrongOutcomeAttestation: OracleAttestationEnvelope;
  mutatedAnnouncement: OracleAnnouncement;
}

function signingPayload(announcement: OracleAnnouncement): OracleAnnouncementSigningPayload {
  return {
    kind: announcement.kind,
    schemaVersion: announcement.schemaVersion,
    eventId: announcement.eventId,
    oraclePublicXOnlyHex: announcement.oraclePublicXOnlyHex,
    oraclePublicCompressedHex: announcement.oraclePublicCompressedHex,
    noncePointXOnlyHex: announcement.noncePointXOnlyHex,
    noncePointCompressedHex: announcement.noncePointCompressedHex,
    outcomes: announcement.outcomes,
    expiryIso: announcement.expiryIso,
    sourcePolicy: announcement.sourcePolicy,
  };
}

export function oracleAnnouncementDigestHex(payload: OracleAnnouncementSigningPayload): string {
  return bytesToHex(sha256Text(deterministicJson(payload)));
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireExactKeys(
  object: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new Error(`${label} contains unknown field: ${key}`);
    }
  }
}

function requireHex(value: unknown, bytes: number, label: string): string {
  const text = requireString(value, label);
  requireHexBytes(text, bytes, label);
  if (text !== text.toLowerCase()) {
    throw new Error(`${label} must be lowercase hex`);
  }
  return text;
}

function requireCompressedPoint(value: unknown, label: string): string {
  const text = requireHex(value, 33, label);
  if (!/^(02|03)[0-9a-f]{64}$/u.test(text)) {
    throw new Error(`${label} must be a compressed secp256k1 point`);
  }
  pointFromCompressed(text).assertValidity();
  return text;
}

function parseSourcePolicy(value: unknown): OracleSourcePolicy {
  const object = requireObject(value, 'sourcePolicy');
  requireExactKeys(object, ['kind', 'policyId', 'description'], 'sourcePolicy');
  if (object.kind !== 'niti.oracle.source_policy.v1') {
    throw new Error('sourcePolicy.kind is unsupported');
  }
  return {
    kind: 'niti.oracle.source_policy.v1',
    policyId: requireString(object.policyId, 'sourcePolicy.policyId'),
    description: requireString(object.description, 'sourcePolicy.description'),
  };
}

function parseOutcome(value: unknown, index: number): OracleAnnouncementOutcome {
  const object = requireObject(value, `outcomes[${index}]`);
  requireExactKeys(
    object,
    ['outcome', 'messageHashHex', 'attestationPointCompressedHex'],
    `outcomes[${index}]`,
  );
  return {
    outcome: requireString(object.outcome, `outcomes[${index}].outcome`),
    messageHashHex: requireHex(object.messageHashHex, 32, `outcomes[${index}].messageHashHex`),
    attestationPointCompressedHex: requireCompressedPoint(
      object.attestationPointCompressedHex,
      `outcomes[${index}].attestationPointCompressedHex`,
    ),
  };
}

export function parseOracleAnnouncement(value: unknown): OracleAnnouncement {
  const object = requireObject(value, 'announcement');
  requireExactKeys(
    object,
    [
      'kind',
      'schemaVersion',
      'eventId',
      'oraclePublicXOnlyHex',
      'oraclePublicCompressedHex',
      'noncePointXOnlyHex',
      'noncePointCompressedHex',
      'outcomes',
      'expiryIso',
      'sourcePolicy',
      'announcementDigestHex',
      'announcementSignatureHex',
    ],
    'announcement',
  );
  if (object.kind !== 'niti.oracle.announcement.v1') {
    throw new Error('announcement.kind is unsupported');
  }
  if (object.schemaVersion !== oracleAuditSchemaVersion) {
    throw new Error(`announcement.schemaVersion must be ${oracleAuditSchemaVersion}`);
  }
  return {
    kind: 'niti.oracle.announcement.v1',
    schemaVersion: oracleAuditSchemaVersion,
    eventId: requireString(object.eventId, 'announcement.eventId'),
    oraclePublicXOnlyHex: requireHex(object.oraclePublicXOnlyHex, 32, 'announcement.oraclePublicXOnlyHex'),
    oraclePublicCompressedHex: requireCompressedPoint(
      object.oraclePublicCompressedHex,
      'announcement.oraclePublicCompressedHex',
    ),
    noncePointXOnlyHex: requireHex(object.noncePointXOnlyHex, 32, 'announcement.noncePointXOnlyHex'),
    noncePointCompressedHex: requireCompressedPoint(
      object.noncePointCompressedHex,
      'announcement.noncePointCompressedHex',
    ),
    outcomes: requireArray(object.outcomes, 'announcement.outcomes').map(parseOutcome),
    expiryIso: requireString(object.expiryIso, 'announcement.expiryIso'),
    sourcePolicy: parseSourcePolicy(object.sourcePolicy),
    announcementDigestHex: requireHex(object.announcementDigestHex, 32, 'announcement.announcementDigestHex'),
    announcementSignatureHex: requireHex(object.announcementSignatureHex, 64, 'announcement.announcementSignatureHex'),
  };
}

export function parseOracleAttestation(value: unknown): OracleAttestationEnvelope {
  const object = requireObject(value, 'attestation');
  requireExactKeys(
    object,
    [
      'kind',
      'schemaVersion',
      'eventId',
      'outcome',
      'announcementDigestHex',
      'messageHashHex',
      'attestationSecretHex',
      'attestationPointCompressedHex',
      'bip340SignatureHex',
    ],
    'attestation',
  );
  if (object.kind !== 'niti.oracle.attestation.v1') {
    throw new Error('attestation.kind is unsupported');
  }
  if (object.schemaVersion !== oracleAuditSchemaVersion) {
    throw new Error(`attestation.schemaVersion must be ${oracleAuditSchemaVersion}`);
  }
  return {
    kind: 'niti.oracle.attestation.v1',
    schemaVersion: oracleAuditSchemaVersion,
    eventId: requireString(object.eventId, 'attestation.eventId'),
    outcome: requireString(object.outcome, 'attestation.outcome'),
    announcementDigestHex: requireHex(object.announcementDigestHex, 32, 'attestation.announcementDigestHex'),
    messageHashHex: requireHex(object.messageHashHex, 32, 'attestation.messageHashHex'),
    attestationSecretHex: requireHex(object.attestationSecretHex, 32, 'attestation.attestationSecretHex'),
    attestationPointCompressedHex: requireCompressedPoint(
      object.attestationPointCompressedHex,
      'attestation.attestationPointCompressedHex',
    ),
    bip340SignatureHex: requireHex(object.bip340SignatureHex, 64, 'attestation.bip340SignatureHex'),
  };
}

function withChecks(checks: Record<string, boolean>, errors: string[]): OracleVerificationResult {
  return {
    ok: errors.length === 0 && Object.values(checks).every(Boolean),
    errors,
    checks,
  };
}

function recomputeAttestationPoint(input: {
  oraclePublicCompressedHex: string;
  noncePointCompressedHex: string;
  messageHashHex: string;
}): string {
  const oraclePoint = pointFromCompressed(input.oraclePublicCompressedHex);
  const noncePoint = pointFromCompressed(input.noncePointCompressedHex);
  const challenge = bip340Challenge(
    pointToXOnly(noncePoint),
    pointToXOnly(oraclePoint),
    hexToBytes(input.messageHashHex),
  );
  return pointToCompressed(noncePoint.add(oraclePoint.multiply(challenge)));
}

export function verifyOracleAnnouncement(value: unknown): OracleVerificationResult {
  const errors: string[] = [];
  const checks: Record<string, boolean> = {
    parses: false,
    eventKeyPointsAreEven: false,
    outcomeSetIsNonEmpty: false,
    outcomesAreUnique: false,
    outcomeMessageHashesMatch: false,
    attestationPointsMatch: false,
    digestMatchesPayload: false,
    announcementSignatureVerifies: false,
    announcementSignatureUsesSeparateNonce: false,
    expiryIsoParses: false,
  };

  try {
    const announcement = parseOracleAnnouncement(value);
    checks.parses = true;

    const oraclePoint = pointFromCompressed(announcement.oraclePublicCompressedHex);
    const noncePoint = pointFromCompressed(announcement.noncePointCompressedHex);
    checks.eventKeyPointsAreEven = hasEvenY(oraclePoint)
      && hasEvenY(noncePoint)
      && bytesToHex(pointToXOnly(oraclePoint)) === announcement.oraclePublicXOnlyHex
      && bytesToHex(pointToXOnly(noncePoint)) === announcement.noncePointXOnlyHex;
    if (!checks.eventKeyPointsAreEven) {
      errors.push('oracle and nonce points must be even-y BIP340 points matching their x-only fields');
    }

    checks.outcomeSetIsNonEmpty = announcement.outcomes.length > 0;
    if (!checks.outcomeSetIsNonEmpty) {
      errors.push('announcement must contain at least one outcome');
    }

    const outcomeNames = new Set(announcement.outcomes.map((outcome) => outcome.outcome));
    checks.outcomesAreUnique = outcomeNames.size === announcement.outcomes.length;
    if (!checks.outcomesAreUnique) {
      errors.push('announcement outcomes must be unique');
    }

    checks.outcomeMessageHashesMatch = announcement.outcomes.every((outcome) => (
      outcome.messageHashHex === bytesToHex(sha256Text(`${announcement.eventId}:${outcome.outcome}`))
    ));
    if (!checks.outcomeMessageHashesMatch) {
      errors.push('announcement outcome message hashes do not match event/outcome bindings');
    }

    checks.attestationPointsMatch = announcement.outcomes.every((outcome) => (
      outcome.attestationPointCompressedHex === recomputeAttestationPoint({
        oraclePublicCompressedHex: announcement.oraclePublicCompressedHex,
        noncePointCompressedHex: announcement.noncePointCompressedHex,
        messageHashHex: outcome.messageHashHex,
      })
    ));
    if (!checks.attestationPointsMatch) {
      errors.push('announcement attestation points do not match oracle key, nonce point, and outcome hashes');
    }

    const digest = oracleAnnouncementDigestHex(signingPayload(announcement));
    checks.digestMatchesPayload = digest === announcement.announcementDigestHex;
    if (!checks.digestMatchesPayload) {
      errors.push('announcement digest does not match signing payload');
    }

    checks.announcementSignatureVerifies = verifyBip340Signature({
      signatureHex: announcement.announcementSignatureHex,
      messageHashHex: announcement.announcementDigestHex,
      publicKeyXOnlyHex: announcement.oraclePublicXOnlyHex,
    });
    if (!checks.announcementSignatureVerifies) {
      errors.push('announcement signature does not verify under oracle key');
    }

    checks.announcementSignatureUsesSeparateNonce =
      announcement.announcementSignatureHex.slice(0, 64) !== announcement.noncePointXOnlyHex;
    if (!checks.announcementSignatureUsesSeparateNonce) {
      errors.push('announcement signature nonce must differ from event attestation nonce');
    }

    checks.expiryIsoParses = Number.isFinite(Date.parse(announcement.expiryIso));
    if (!checks.expiryIsoParses) {
      errors.push('announcement expiryIso must parse as an ISO timestamp');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return withChecks(checks, errors);
}

export function verifyOracleAttestation(input: {
  announcement: unknown;
  attestation: unknown;
}): OracleVerificationResult {
  const errors: string[] = [];
  const checks: Record<string, boolean> = {
    announcementVerifies: false,
    attestationParses: false,
    announcementDigestMatches: false,
    eventMatches: false,
    outcomeIsAnnounced: false,
    messageHashMatchesAnnouncement: false,
    attestationPointMatchesAnnouncement: false,
    signatureNonceMatchesAnnouncement: false,
    signatureScalarMatchesSecret: false,
    signatureVerifies: false,
    scalarMapsToAttestationPoint: false,
  };

  const announcementResult = verifyOracleAnnouncement(input.announcement);
  checks.announcementVerifies = announcementResult.ok;
  if (!announcementResult.ok) {
    errors.push(...announcementResult.errors.map((error) => `announcement: ${error}`));
  }

  try {
    const announcement = parseOracleAnnouncement(input.announcement);
    const attestation = parseOracleAttestation(input.attestation);
    checks.attestationParses = true;

    checks.announcementDigestMatches =
      attestation.announcementDigestHex === announcement.announcementDigestHex;
    if (!checks.announcementDigestMatches) {
      errors.push('attestation announcement digest does not match announcement');
    }

    checks.eventMatches = attestation.eventId === announcement.eventId;
    if (!checks.eventMatches) {
      errors.push('attestation event id does not match announcement');
    }

    const announcedOutcome = announcement.outcomes.find((outcome) => outcome.outcome === attestation.outcome);
    checks.outcomeIsAnnounced = announcedOutcome !== undefined;
    if (!checks.outcomeIsAnnounced) {
      errors.push('attestation outcome is not in the announcement');
    }

    checks.messageHashMatchesAnnouncement =
      announcedOutcome?.messageHashHex === attestation.messageHashHex;
    if (!checks.messageHashMatchesAnnouncement) {
      errors.push('attestation message hash does not match announced outcome');
    }

    checks.attestationPointMatchesAnnouncement =
      announcedOutcome?.attestationPointCompressedHex === attestation.attestationPointCompressedHex;
    if (!checks.attestationPointMatchesAnnouncement) {
      errors.push('attestation point does not match announced outcome');
    }

    checks.signatureNonceMatchesAnnouncement =
      attestation.bip340SignatureHex.slice(0, 64) === announcement.noncePointXOnlyHex;
    if (!checks.signatureNonceMatchesAnnouncement) {
      errors.push('attestation signature nonce does not match announcement nonce point');
    }

    checks.signatureScalarMatchesSecret =
      attestation.bip340SignatureHex.slice(64) === attestation.attestationSecretHex;
    if (!checks.signatureScalarMatchesSecret) {
      errors.push('attestation signature scalar does not match attestation secret');
    }

    checks.signatureVerifies = verifyBip340Signature({
      signatureHex: attestation.bip340SignatureHex,
      messageHashHex: attestation.messageHashHex,
      publicKeyXOnlyHex: announcement.oraclePublicXOnlyHex,
    });
    if (!checks.signatureVerifies) {
      errors.push('attestation signature does not verify under oracle key');
    }

    const directScalarPoint = pointToCompressed(
      Point.BASE.multiply(scalarFromHex(attestation.attestationSecretHex, 'attestationSecret')),
    );
    checks.scalarMapsToAttestationPoint = directScalarPoint === attestation.attestationPointCompressedHex;
    if (!checks.scalarMapsToAttestationPoint) {
      errors.push('attestation scalar does not map to attestation point');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return withChecks(checks, errors);
}

export function buildOracleAnnouncement(input: {
  eventId: string;
  outcomes: string[];
  oracleSecretHex: string;
  nonceSecretHex: string;
  announcementSignatureNonceHex: string;
  expiryIso: string;
  sourcePolicy: OracleSourcePolicy;
}): OracleAnnouncement {
  if (input.outcomes.length === 0) {
    throw new Error('outcomes must be non-empty');
  }

  const prepared = input.outcomes.map((outcome) => (
    prepareOracleOutcome({
      eventId: input.eventId,
      outcome,
      oracleSecret: scalarFromHex(input.oracleSecretHex, 'oracleSecret'),
      nonceSecret: scalarFromHex(input.nonceSecretHex, 'nonceSecret'),
    })
  ));
  const first = prepared[0];
  if (!first) {
    throw new Error('outcomes must be non-empty');
  }

  for (const outcome of prepared) {
    if (outcome.oraclePublicXOnlyHex !== first.oraclePublicXOnlyHex) {
      throw new Error('prepared outcomes must use one oracle public key');
    }
    if (outcome.noncePointXOnlyHex !== first.noncePointXOnlyHex) {
      throw new Error('prepared outcomes must use one nonce point');
    }
  }

  const payload: OracleAnnouncementSigningPayload = {
    kind: 'niti.oracle.announcement.v1',
    schemaVersion: oracleAuditSchemaVersion,
    eventId: input.eventId,
    oraclePublicXOnlyHex: first.oraclePublicXOnlyHex,
    oraclePublicCompressedHex: first.oraclePublicCompressedHex,
    noncePointXOnlyHex: first.noncePointXOnlyHex,
    noncePointCompressedHex: first.noncePointCompressedHex,
    outcomes: prepared.map((outcome) => ({
      outcome: outcome.outcome,
      messageHashHex: outcome.messageHashHex,
      attestationPointCompressedHex: outcome.attestationPointCompressedHex,
    })),
    expiryIso: input.expiryIso,
    sourcePolicy: input.sourcePolicy,
  };
  const announcementDigestHex = oracleAnnouncementDigestHex(payload);
  const signature = createBip340Signature({
    signerSecret: scalarFromHex(input.oracleSecretHex, 'oracleSecret'),
    message32: hexToBytes(announcementDigestHex),
    nonceSecret: scalarFromHex(input.announcementSignatureNonceHex, 'announcementSignatureNonce'),
  });
  if (!signature.verifies || signature.signerPublicXOnlyHex !== first.oraclePublicXOnlyHex) {
    throw new Error('announcement signature failed to verify under oracle key');
  }
  if (signature.nonceXOnlyHex === first.noncePointXOnlyHex) {
    throw new Error('announcement signature nonce must differ from event attestation nonce');
  }
  return {
    ...payload,
    announcementDigestHex,
    announcementSignatureHex: signature.signatureHex,
  };
}

export function buildOracleAttestationEnvelope(input: {
  announcement: OracleAnnouncement;
  outcome: string;
  oracleSecretHex: string;
  nonceSecretHex: string;
}): OracleAttestationEnvelope {
  const attestation = attestOracleOutcome({
    eventId: input.announcement.eventId,
    outcome: input.outcome,
    oracleSecret: scalarFromHex(input.oracleSecretHex, 'oracleSecret'),
    nonceSecret: scalarFromHex(input.nonceSecretHex, 'nonceSecret'),
  });
  return {
    kind: 'niti.oracle.attestation.v1',
    schemaVersion: oracleAuditSchemaVersion,
    eventId: attestation.eventId,
    outcome: attestation.outcome,
    announcementDigestHex: input.announcement.announcementDigestHex,
    messageHashHex: attestation.messageHashHex,
    attestationSecretHex: attestation.attestationSecretHex,
    attestationPointCompressedHex: attestation.attestationPointCompressedHex,
    bip340SignatureHex: attestation.bip340SignatureHex,
  };
}

export function buildCanonicalOracleAuditFixture(): OracleAuditFixture {
  const sourcePolicy: OracleSourcePolicy = {
    kind: 'niti.oracle.source_policy.v1',
    policyId: 'niti-canonical-oracle-fixture',
    description: 'Deterministic test fixture policy; no market-data truth claim.',
  };
  const announcement = buildOracleAnnouncement({
    eventId: canonicalOutcomes.eventId,
    outcomes: [canonicalOutcomes.activating, canonicalOutcomes.wrong],
    oracleSecretHex: canonicalSecrets.oracle,
    nonceSecretHex: canonicalSecrets.oracleNonce,
    announcementSignatureNonceHex: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    expiryIso: '2026-04-30T12:00:00Z',
    sourcePolicy,
  });
  const attestation = buildOracleAttestationEnvelope({
    announcement,
    outcome: canonicalOutcomes.activating,
    oracleSecretHex: canonicalSecrets.oracle,
    nonceSecretHex: canonicalSecrets.oracleNonce,
  });
  const wrongOutcomeAttestation = buildOracleAttestationEnvelope({
    announcement,
    outcome: 'UNANNOUNCED_OUTCOME',
    oracleSecretHex: canonicalSecrets.oracle,
    nonceSecretHex: canonicalSecrets.oracleNonce,
  });
  return {
    kind: 'niti.oracle.audit_fixture.v1',
    announcement,
    attestation,
    wrongOutcomeAttestation,
    mutatedAnnouncement: {
      ...announcement,
      outcomes: announcement.outcomes.map((outcome, index) => (
        index === 0
          ? {
            ...outcome,
            messageHashHex: bytesToHex(sha256Text(`${announcement.eventId}:MUTATED_OUTCOME`)),
          }
          : outcome
      )),
    },
  };
}
