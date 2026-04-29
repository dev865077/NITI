import { bytesToHex } from './bytes.js';
import {
  prepareOracleOutcome,
  sha256Text,
} from './secp.js';
import {
  buildBilateralRoleMaterial,
  bilateralAdaptorNoncePurposes,
  type BilateralAdaptorNoncePurpose,
  type BilateralRoleName,
  type BilateralSetupMessage,
} from './bilateral-roles.js';
import {
  canonicalAmounts,
  canonicalNetwork,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalSourcePrevout,
} from './cdlc-scenario.js';
import type { BitcoinNetworkName } from './taproot.js';

export const bilateralSetupSchemaVersion = 1 as const;

export type BilateralSetupMessageKind =
  | 'niti.l3.setup.role_announcement.v1'
  | 'niti.l3.setup.oracle_event_selection.v1'
  | 'niti.l3.setup.funding_inputs.v1'
  | 'niti.l3.setup.payout_graph.v1'
  | 'niti.l3.setup.cet_templates.v1'
  | 'niti.l3.setup.bridge_templates.v1'
  | 'niti.l3.setup.refund_templates.v1'
  | 'niti.l3.setup.adaptor_points.v1'
  | 'niti.l3.setup.ack.v1';

export interface BilateralSetupBase<K extends BilateralSetupMessageKind> {
  kind: K;
  schemaVersion: typeof bilateralSetupSchemaVersion;
  sessionIdHex: string;
  sequence: number;
  sender: BilateralRoleName;
  criticalFields: string[];
}

export interface RoleAnnouncementSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.role_announcement.v1'> {
  announcement: BilateralSetupMessage;
}

export interface OracleEventSelectionSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.oracle_event_selection.v1'> {
  eventId: string;
  oraclePublicCompressedHex: string;
  noncePointCompressedHex: string;
  outcomes: {
    outcome: string;
    attestationPointCompressedHex: string;
  }[];
}

export interface FundingInputsSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.funding_inputs.v1'> {
  fundingInputs: {
    owner: BilateralRoleName;
    txid: string;
    vout: number;
    valueSat: string;
    scriptPubKeyHex: string;
  }[];
}

export interface PayoutGraphSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.payout_graph.v1'> {
  graphId: string;
  parentContractId: string;
  childContractId: string;
  activatingOutcome: string;
  nonActivatingOutcome: string;
  edges: {
    fromContractId: string;
    outcome: string;
    toContractId: string;
  }[];
}

export interface CetTemplatesSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.cet_templates.v1'> {
  templates: {
    contractId: string;
    outcome: string;
    signer: BilateralRoleName;
    inputRole: string;
    outputRole: string;
    feeSat: string;
    adaptorPointCompressedHex: string;
  }[];
}

export interface BridgeTemplatesSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.bridge_templates.v1'> {
  templates: {
    bridgeId: string;
    parentContractId: string;
    childContractId: string;
    activatingOutcome: string;
    parentOutputName: string;
    signer: BilateralRoleName;
    feeSat: string;
    adaptorPointCompressedHex: string;
  }[];
}

export interface RefundTemplatesSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.refund_templates.v1'> {
  templates: {
    refundId: string;
    spends: string;
    signer: BilateralRoleName;
    locktime: number;
    sequence: number;
    feeSat: string;
  }[];
}

export interface AdaptorPointsSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.adaptor_points.v1'> {
  points: {
    purpose: BilateralAdaptorNoncePurpose;
    eventId: string;
    outcome: string;
    pointCompressedHex: string;
  }[];
}

export interface AcknowledgementSetupMessage
  extends BilateralSetupBase<'niti.l3.setup.ack.v1'> {
  acknowledgedDigestHex: string;
  status: 'accepted';
}

export type BilateralSetupProtocolMessage =
  | RoleAnnouncementSetupMessage
  | OracleEventSelectionSetupMessage
  | FundingInputsSetupMessage
  | PayoutGraphSetupMessage
  | CetTemplatesSetupMessage
  | BridgeTemplatesSetupMessage
  | RefundTemplatesSetupMessage
  | AdaptorPointsSetupMessage
  | AcknowledgementSetupMessage;

export interface BilateralSetupTranscript {
  kind: 'niti.l3.bilateral_setup_transcript.v1';
  schemaVersion: typeof bilateralSetupSchemaVersion;
  sessionIdHex: string;
  messages: BilateralSetupProtocolMessage[];
  messageDigests: string[];
}

const baseKeys = [
  'kind',
  'schemaVersion',
  'sessionIdHex',
  'sequence',
  'sender',
  'criticalFields',
] as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function setupMessageDigestHex(message: BilateralSetupProtocolMessage): string {
  return bytesToHex(sha256Text(canonicalJson(message)));
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
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
  if (!new RegExp(`^[0-9a-f]{${bytes * 2}}$`, 'u').test(text)) {
    throw new Error(`${label} must be ${bytes} bytes of lowercase hex`);
  }
  return text;
}

function requireCompressedPoint(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (!/^(02|03)[0-9a-f]{64}$/u.test(text)) {
    throw new Error(`${label} must be a compressed secp256k1 point`);
  }
  return text;
}

function requireRole(value: unknown, label: string): BilateralRoleName {
  const role = requireString(value, label);
  if (role !== 'alice' && role !== 'bob') {
    throw new Error(`${label} must be alice or bob`);
  }
  return role;
}

function requireNetwork(value: unknown, label: string): BitcoinNetworkName {
  const network = requireString(value, label);
  if (!['testnet', 'testnet4', 'signet', 'regtest'].includes(network)) {
    throw new Error(`${label} is unsupported`);
  }
  return network as BitcoinNetworkName;
}

function requireAdaptorNoncePurpose(value: unknown, label: string): BilateralAdaptorNoncePurpose {
  const purpose = requireString(value, label);
  if (!bilateralAdaptorNoncePurposes.includes(purpose as BilateralAdaptorNoncePurpose)) {
    throw new Error(`${label} is unsupported`);
  }
  return purpose as BilateralAdaptorNoncePurpose;
}

function requireSatString(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (!/^(0|[1-9][0-9]*)$/u.test(text)) {
    throw new Error(`${label} must be a non-negative integer string`);
  }
  return text;
}

function validateCriticalFields(
  object: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): string[] {
  const criticalFields = requireArray(object.criticalFields, `${label}.criticalFields`)
    .map((field, index) => requireString(field, `${label}.criticalFields[${index}]`));
  const allowedSet = new Set(allowed);
  for (const field of criticalFields) {
    if (!allowedSet.has(field)) {
      throw new Error(`${label} references unknown critical field: ${field}`);
    }
  }
  return criticalFields;
}

function validateBase<K extends BilateralSetupMessageKind>(
  object: Record<string, unknown>,
  kind: K,
  allowed: readonly string[],
  label: string,
): BilateralSetupBase<K> {
  requireExactKeys(object, allowed, label);
  if (object.kind !== kind) {
    throw new Error(`${label}.kind must be ${kind}`);
  }
  if (object.schemaVersion !== bilateralSetupSchemaVersion) {
    throw new Error(`${label}.schemaVersion must be ${bilateralSetupSchemaVersion}`);
  }
  const sequence = requireNumber(object.sequence, `${label}.sequence`);
  if (sequence <= 0) {
    throw new Error(`${label}.sequence must be positive`);
  }
  return {
    kind,
    schemaVersion: bilateralSetupSchemaVersion,
    sessionIdHex: requireHex(object.sessionIdHex, 32, `${label}.sessionIdHex`),
    sequence,
    sender: requireRole(object.sender, `${label}.sender`),
    criticalFields: validateCriticalFields(object, allowed, label),
  };
}

function validatePublicKeyScope(value: unknown, label: string): BilateralSetupMessage['funding'] {
  const object = requireObject(value, label);
  requireExactKeys(
    object,
    [
      'internalPublicXOnlyHex',
      'outputPublicXOnlyHex',
      'outputPublicCompressedHex',
      'address',
      'scriptPubKeyHex',
    ],
    label,
  );
  return {
    internalPublicXOnlyHex: requireHex(object.internalPublicXOnlyHex, 32, `${label}.internalPublicXOnlyHex`),
    outputPublicXOnlyHex: requireHex(object.outputPublicXOnlyHex, 32, `${label}.outputPublicXOnlyHex`),
    outputPublicCompressedHex: requireCompressedPoint(
      object.outputPublicCompressedHex,
      `${label}.outputPublicCompressedHex`,
    ),
    address: requireString(object.address, `${label}.address`),
    scriptPubKeyHex: requireHex(object.scriptPubKeyHex, 34, `${label}.scriptPubKeyHex`),
  };
}

function validateRoleAnnouncement(value: unknown): BilateralSetupMessage {
  const object = requireObject(value, 'announcement');
  requireExactKeys(
    object,
    [
      'kind',
      'role',
      'network',
      'funding',
      'cetSigning',
      'refund',
      'adaptorNonceCommitments',
      'storageIdentityPublicCompressedHex',
      'storageNamespaceHex',
    ],
    'announcement',
  );
  if (object.kind !== 'niti.l3.bilateral_setup_message.v1') {
    throw new Error('announcement.kind is unsupported');
  }
  const adaptorNonceCommitments = requireArray(
    object.adaptorNonceCommitments,
    'announcement.adaptorNonceCommitments',
  ).map((entry, index) => {
    const commitment = requireObject(entry, `announcement.adaptorNonceCommitments[${index}]`);
    requireExactKeys(
      commitment,
      ['purpose', 'commitmentCompressedHex'],
      `announcement.adaptorNonceCommitments[${index}]`,
    );
    return {
      purpose: requireAdaptorNoncePurpose(
        commitment.purpose,
        `announcement.adaptorNonceCommitments[${index}].purpose`,
      ),
      commitmentCompressedHex: requireCompressedPoint(
        commitment.commitmentCompressedHex,
        `announcement.adaptorNonceCommitments[${index}].commitmentCompressedHex`,
      ),
    };
  });
  return {
    kind: 'niti.l3.bilateral_setup_message.v1',
    role: requireRole(object.role, 'announcement.role'),
    network: requireNetwork(object.network, 'announcement.network'),
    funding: validatePublicKeyScope(object.funding, 'announcement.funding'),
    cetSigning: validatePublicKeyScope(object.cetSigning, 'announcement.cetSigning'),
    refund: validatePublicKeyScope(object.refund, 'announcement.refund'),
    adaptorNonceCommitments,
    storageIdentityPublicCompressedHex: requireCompressedPoint(
      object.storageIdentityPublicCompressedHex,
      'announcement.storageIdentityPublicCompressedHex',
    ),
    storageNamespaceHex: requireHex(object.storageNamespaceHex, 32, 'announcement.storageNamespaceHex'),
  };
}

export function validateBilateralSetupMessage(
  value: unknown,
): BilateralSetupProtocolMessage {
  const object = requireObject(value, 'setup message');
  const kind = requireString(object.kind, 'setup message.kind') as BilateralSetupMessageKind;

  if (kind === 'niti.l3.setup.role_announcement.v1') {
    const allowed = [...baseKeys, 'announcement'];
    return {
      ...validateBase(object, kind, allowed, kind),
      announcement: validateRoleAnnouncement(object.announcement),
    };
  }

  if (kind === 'niti.l3.setup.oracle_event_selection.v1') {
    const allowed = [...baseKeys, 'eventId', 'oraclePublicCompressedHex', 'noncePointCompressedHex', 'outcomes'];
    return {
      ...validateBase(object, kind, allowed, kind),
      eventId: requireString(object.eventId, `${kind}.eventId`),
      oraclePublicCompressedHex: requireCompressedPoint(object.oraclePublicCompressedHex, `${kind}.oraclePublicCompressedHex`),
      noncePointCompressedHex: requireCompressedPoint(object.noncePointCompressedHex, `${kind}.noncePointCompressedHex`),
      outcomes: requireArray(object.outcomes, `${kind}.outcomes`).map((entry, index) => {
        const outcome = requireObject(entry, `${kind}.outcomes[${index}]`);
        requireExactKeys(outcome, ['outcome', 'attestationPointCompressedHex'], `${kind}.outcomes[${index}]`);
        return {
          outcome: requireString(outcome.outcome, `${kind}.outcomes[${index}].outcome`),
          attestationPointCompressedHex: requireCompressedPoint(
            outcome.attestationPointCompressedHex,
            `${kind}.outcomes[${index}].attestationPointCompressedHex`,
          ),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.funding_inputs.v1') {
    const allowed = [...baseKeys, 'fundingInputs'];
    return {
      ...validateBase(object, kind, allowed, kind),
      fundingInputs: requireArray(object.fundingInputs, `${kind}.fundingInputs`).map((entry, index) => {
        const input = requireObject(entry, `${kind}.fundingInputs[${index}]`);
        requireExactKeys(input, ['owner', 'txid', 'vout', 'valueSat', 'scriptPubKeyHex'], `${kind}.fundingInputs[${index}]`);
        const vout = requireNumber(input.vout, `${kind}.fundingInputs[${index}].vout`);
        if (vout < 0) {
          throw new Error(`${kind}.fundingInputs[${index}].vout must be non-negative`);
        }
        return {
          owner: requireRole(input.owner, `${kind}.fundingInputs[${index}].owner`),
          txid: requireHex(input.txid, 32, `${kind}.fundingInputs[${index}].txid`),
          vout,
          valueSat: requireSatString(input.valueSat, `${kind}.fundingInputs[${index}].valueSat`),
          scriptPubKeyHex: requireHex(input.scriptPubKeyHex, 34, `${kind}.fundingInputs[${index}].scriptPubKeyHex`),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.payout_graph.v1') {
    const allowed = [
      ...baseKeys,
      'graphId',
      'parentContractId',
      'childContractId',
      'activatingOutcome',
      'nonActivatingOutcome',
      'edges',
    ];
    return {
      ...validateBase(object, kind, allowed, kind),
      graphId: requireString(object.graphId, `${kind}.graphId`),
      parentContractId: requireString(object.parentContractId, `${kind}.parentContractId`),
      childContractId: requireString(object.childContractId, `${kind}.childContractId`),
      activatingOutcome: requireString(object.activatingOutcome, `${kind}.activatingOutcome`),
      nonActivatingOutcome: requireString(object.nonActivatingOutcome, `${kind}.nonActivatingOutcome`),
      edges: requireArray(object.edges, `${kind}.edges`).map((entry, index) => {
        const edge = requireObject(entry, `${kind}.edges[${index}]`);
        requireExactKeys(edge, ['fromContractId', 'outcome', 'toContractId'], `${kind}.edges[${index}]`);
        return {
          fromContractId: requireString(edge.fromContractId, `${kind}.edges[${index}].fromContractId`),
          outcome: requireString(edge.outcome, `${kind}.edges[${index}].outcome`),
          toContractId: requireString(edge.toContractId, `${kind}.edges[${index}].toContractId`),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.cet_templates.v1') {
    const allowed = [...baseKeys, 'templates'];
    return {
      ...validateBase(object, kind, allowed, kind),
      templates: requireArray(object.templates, `${kind}.templates`).map((entry, index) => {
        const template = requireObject(entry, `${kind}.templates[${index}]`);
        requireExactKeys(
          template,
          ['contractId', 'outcome', 'signer', 'inputRole', 'outputRole', 'feeSat', 'adaptorPointCompressedHex'],
          `${kind}.templates[${index}]`,
        );
        return {
          contractId: requireString(template.contractId, `${kind}.templates[${index}].contractId`),
          outcome: requireString(template.outcome, `${kind}.templates[${index}].outcome`),
          signer: requireRole(template.signer, `${kind}.templates[${index}].signer`),
          inputRole: requireString(template.inputRole, `${kind}.templates[${index}].inputRole`),
          outputRole: requireString(template.outputRole, `${kind}.templates[${index}].outputRole`),
          feeSat: requireSatString(template.feeSat, `${kind}.templates[${index}].feeSat`),
          adaptorPointCompressedHex: requireCompressedPoint(
            template.adaptorPointCompressedHex,
            `${kind}.templates[${index}].adaptorPointCompressedHex`,
          ),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.bridge_templates.v1') {
    const allowed = [...baseKeys, 'templates'];
    return {
      ...validateBase(object, kind, allowed, kind),
      templates: requireArray(object.templates, `${kind}.templates`).map((entry, index) => {
        const template = requireObject(entry, `${kind}.templates[${index}]`);
        requireExactKeys(
          template,
          [
            'bridgeId',
            'parentContractId',
            'childContractId',
            'activatingOutcome',
            'parentOutputName',
            'signer',
            'feeSat',
            'adaptorPointCompressedHex',
          ],
          `${kind}.templates[${index}]`,
        );
        return {
          bridgeId: requireString(template.bridgeId, `${kind}.templates[${index}].bridgeId`),
          parentContractId: requireString(template.parentContractId, `${kind}.templates[${index}].parentContractId`),
          childContractId: requireString(template.childContractId, `${kind}.templates[${index}].childContractId`),
          activatingOutcome: requireString(template.activatingOutcome, `${kind}.templates[${index}].activatingOutcome`),
          parentOutputName: requireString(template.parentOutputName, `${kind}.templates[${index}].parentOutputName`),
          signer: requireRole(template.signer, `${kind}.templates[${index}].signer`),
          feeSat: requireSatString(template.feeSat, `${kind}.templates[${index}].feeSat`),
          adaptorPointCompressedHex: requireCompressedPoint(
            template.adaptorPointCompressedHex,
            `${kind}.templates[${index}].adaptorPointCompressedHex`,
          ),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.refund_templates.v1') {
    const allowed = [...baseKeys, 'templates'];
    return {
      ...validateBase(object, kind, allowed, kind),
      templates: requireArray(object.templates, `${kind}.templates`).map((entry, index) => {
        const template = requireObject(entry, `${kind}.templates[${index}]`);
        requireExactKeys(
          template,
          ['refundId', 'spends', 'signer', 'locktime', 'sequence', 'feeSat'],
          `${kind}.templates[${index}]`,
        );
        return {
          refundId: requireString(template.refundId, `${kind}.templates[${index}].refundId`),
          spends: requireString(template.spends, `${kind}.templates[${index}].spends`),
          signer: requireRole(template.signer, `${kind}.templates[${index}].signer`),
          locktime: requireNumber(template.locktime, `${kind}.templates[${index}].locktime`),
          sequence: requireNumber(template.sequence, `${kind}.templates[${index}].sequence`),
          feeSat: requireSatString(template.feeSat, `${kind}.templates[${index}].feeSat`),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.adaptor_points.v1') {
    const allowed = [...baseKeys, 'points'];
    return {
      ...validateBase(object, kind, allowed, kind),
      points: requireArray(object.points, `${kind}.points`).map((entry, index) => {
        const point = requireObject(entry, `${kind}.points[${index}]`);
        requireExactKeys(point, ['purpose', 'eventId', 'outcome', 'pointCompressedHex'], `${kind}.points[${index}]`);
        return {
          purpose: requireAdaptorNoncePurpose(point.purpose, `${kind}.points[${index}].purpose`),
          eventId: requireString(point.eventId, `${kind}.points[${index}].eventId`),
          outcome: requireString(point.outcome, `${kind}.points[${index}].outcome`),
          pointCompressedHex: requireCompressedPoint(point.pointCompressedHex, `${kind}.points[${index}].pointCompressedHex`),
        };
      }),
    };
  }

  if (kind === 'niti.l3.setup.ack.v1') {
    const allowed = [...baseKeys, 'acknowledgedDigestHex', 'status'];
    const status = requireString(object.status, `${kind}.status`);
    if (status !== 'accepted') {
      throw new Error(`${kind}.status must be accepted`);
    }
    return {
      ...validateBase(object, kind, allowed, kind),
      acknowledgedDigestHex: requireHex(object.acknowledgedDigestHex, 32, `${kind}.acknowledgedDigestHex`),
      status,
    };
  }

  throw new Error(`unsupported bilateral setup message kind: ${kind}`);
}

export function validateBilateralSetupTranscript(
  value: unknown,
): BilateralSetupTranscript {
  const object = requireObject(value, 'setup transcript');
  requireExactKeys(
    object,
    ['kind', 'schemaVersion', 'sessionIdHex', 'messages', 'messageDigests'],
    'setup transcript',
  );
  if (object.kind !== 'niti.l3.bilateral_setup_transcript.v1') {
    throw new Error('setup transcript kind is unsupported');
  }
  if (object.schemaVersion !== bilateralSetupSchemaVersion) {
    throw new Error(`setup transcript schemaVersion must be ${bilateralSetupSchemaVersion}`);
  }
  const sessionIdHex = requireHex(object.sessionIdHex, 32, 'setup transcript.sessionIdHex');
  const messages = requireArray(object.messages, 'setup transcript.messages')
    .map(validateBilateralSetupMessage);
  const messageDigests = requireArray(object.messageDigests, 'setup transcript.messageDigests')
    .map((digest, index) => requireHex(digest, 32, `setup transcript.messageDigests[${index}]`));
  if (messages.length !== messageDigests.length) {
    throw new Error('setup transcript message digest count mismatch');
  }
  messages.forEach((message, index) => {
    if (message.sessionIdHex !== sessionIdHex) {
      throw new Error(`setup transcript message ${index} has wrong session id`);
    }
    if (message.sequence !== index + 1) {
      throw new Error(`setup transcript message ${index} has wrong sequence`);
    }
    const digest = setupMessageDigestHex(message);
    if (digest !== messageDigests[index]) {
      throw new Error(`setup transcript message ${index} digest mismatch`);
    }
    if (message.kind === 'niti.l3.setup.ack.v1') {
      const acknowledged = messageDigests.slice(0, index).includes(message.acknowledgedDigestHex);
      if (!acknowledged) {
        throw new Error(`setup transcript message ${index} acknowledges an unknown prior digest`);
      }
    }
  });
  return {
    kind: 'niti.l3.bilateral_setup_transcript.v1',
    schemaVersion: bilateralSetupSchemaVersion,
    sessionIdHex,
    messages,
    messageDigests,
  };
}

function base<K extends BilateralSetupMessageKind>(input: {
  kind: K;
  sessionIdHex: string;
  sequence: number;
  sender: BilateralRoleName;
}): BilateralSetupBase<K> {
  return {
    kind: input.kind,
    schemaVersion: bilateralSetupSchemaVersion,
    sessionIdHex: input.sessionIdHex,
    sequence: input.sequence,
    sender: input.sender,
    criticalFields: [],
  };
}

export function buildCanonicalBilateralSetupTranscript(): BilateralSetupTranscript {
  const sessionIdHex = bytesToHex(sha256Text('niti:l3:canonical-bilateral-setup:v1'));
  const roles = buildBilateralRoleMaterial(canonicalNetwork);
  const alice = roles.find((role) => role.role === 'alice');
  const bob = roles.find((role) => role.role === 'bob');
  if (!alice || !bob) {
    throw new Error('canonical bilateral setup requires Alice and Bob');
  }

  const activating = prepareOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    oracleSecret: BigInt(`0x${canonicalSecrets.oracle}`),
    nonceSecret: BigInt(`0x${canonicalSecrets.oracleNonce}`),
  });
  const wrong = prepareOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.wrong,
    oracleSecret: BigInt(`0x${canonicalSecrets.oracle}`),
    nonceSecret: BigInt(`0x${canonicalSecrets.oracleNonce}`),
  });
  const child = prepareOracleOutcome({
    eventId: canonicalOutcomes.childEventId,
    outcome: canonicalOutcomes.childActivating,
    oracleSecret: BigInt(`0x${canonicalSecrets.childOracle}`),
    nonceSecret: BigInt(`0x${canonicalSecrets.childOracleNonce}`),
  });

  const messages: BilateralSetupProtocolMessage[] = [
    {
      ...base({
        kind: 'niti.l3.setup.role_announcement.v1',
        sessionIdHex,
        sequence: 1,
        sender: 'alice',
      }),
      announcement: alice.setupMessage,
    },
    {
      ...base({
        kind: 'niti.l3.setup.role_announcement.v1',
        sessionIdHex,
        sequence: 2,
        sender: 'bob',
      }),
      announcement: bob.setupMessage,
    },
    {
      ...base({
        kind: 'niti.l3.setup.oracle_event_selection.v1',
        sessionIdHex,
        sequence: 3,
        sender: 'alice',
      }),
      eventId: canonicalOutcomes.eventId,
      oraclePublicCompressedHex: activating.oraclePublicCompressedHex,
      noncePointCompressedHex: activating.noncePointCompressedHex,
      outcomes: [
        {
          outcome: canonicalOutcomes.activating,
          attestationPointCompressedHex: activating.attestationPointCompressedHex,
        },
        {
          outcome: canonicalOutcomes.wrong,
          attestationPointCompressedHex: wrong.attestationPointCompressedHex,
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.funding_inputs.v1',
        sessionIdHex,
        sequence: 4,
        sender: 'alice',
      }),
      fundingInputs: [
        {
          owner: 'alice',
          txid: canonicalSourcePrevout.txid,
          vout: canonicalSourcePrevout.vout,
          valueSat: canonicalAmounts.parentFundingValueSat.toString(),
          scriptPubKeyHex: alice.setupMessage.funding.scriptPubKeyHex,
        },
        {
          owner: 'bob',
          txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          vout: 0,
          valueSat: canonicalAmounts.parentFundingValueSat.toString(),
          scriptPubKeyHex: bob.setupMessage.funding.scriptPubKeyHex,
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.payout_graph.v1',
        sessionIdHex,
        sequence: 5,
        sender: 'alice',
      }),
      graphId: 'niti-l3-canonical-single-edge',
      parentContractId: 'parent-cdlc',
      childContractId: 'child-cdlc',
      activatingOutcome: canonicalOutcomes.activating,
      nonActivatingOutcome: canonicalOutcomes.wrong,
      edges: [
        {
          fromContractId: 'parent-cdlc',
          outcome: canonicalOutcomes.activating,
          toContractId: 'child-cdlc',
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.cet_templates.v1',
        sessionIdHex,
        sequence: 6,
        sender: 'alice',
      }),
      templates: [
        {
          contractId: 'parent-cdlc',
          outcome: canonicalOutcomes.activating,
          signer: 'alice',
          inputRole: 'parent_funding',
          outputRole: 'parent_edge',
          feeSat: canonicalAmounts.parentCetFeeSat.toString(),
          adaptorPointCompressedHex: activating.attestationPointCompressedHex,
        },
        {
          contractId: 'child-cdlc',
          outcome: canonicalOutcomes.childActivating,
          signer: 'bob',
          inputRole: 'child_funding',
          outputRole: 'child_settlement',
          feeSat: canonicalAmounts.childCetFeeSat.toString(),
          adaptorPointCompressedHex: child.attestationPointCompressedHex,
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.bridge_templates.v1',
        sessionIdHex,
        sequence: 7,
        sender: 'bob',
      }),
      templates: [
        {
          bridgeId: 'parent-to-child-bridge',
          parentContractId: 'parent-cdlc',
          childContractId: 'child-cdlc',
          activatingOutcome: canonicalOutcomes.activating,
          parentOutputName: 'parent_edge',
          signer: 'bob',
          feeSat: canonicalAmounts.bridgeFeeSat.toString(),
          adaptorPointCompressedHex: activating.attestationPointCompressedHex,
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.refund_templates.v1',
        sessionIdHex,
        sequence: 8,
        sender: 'bob',
      }),
      templates: [
        {
          refundId: 'bridge-timeout-refund',
          spends: 'parent_edge',
          signer: 'bob',
          locktime: 3_000_100,
          sequence: 0xfffffffe,
          feeSat: canonicalAmounts.bridgeRefundFeeSat.toString(),
        },
        {
          refundId: 'child-timeout-refund',
          spends: 'child_funding',
          signer: 'bob',
          locktime: 3_000_300,
          sequence: 0xfffffffe,
          feeSat: canonicalAmounts.childRefundFeeSat.toString(),
        },
      ],
    },
    {
      ...base({
        kind: 'niti.l3.setup.adaptor_points.v1',
        sessionIdHex,
        sequence: 9,
        sender: 'alice',
      }),
      points: [
        {
          purpose: 'parent_cet',
          eventId: canonicalOutcomes.eventId,
          outcome: canonicalOutcomes.activating,
          pointCompressedHex: activating.attestationPointCompressedHex,
        },
        {
          purpose: 'bridge',
          eventId: canonicalOutcomes.eventId,
          outcome: canonicalOutcomes.activating,
          pointCompressedHex: activating.attestationPointCompressedHex,
        },
        {
          purpose: 'child_cet',
          eventId: canonicalOutcomes.childEventId,
          outcome: canonicalOutcomes.childActivating,
          pointCompressedHex: child.attestationPointCompressedHex,
        },
      ],
    },
  ];

  messages.push({
    ...base({
      kind: 'niti.l3.setup.ack.v1',
      sessionIdHex,
      sequence: 10,
      sender: 'alice',
    }),
    acknowledgedDigestHex: setupMessageDigestHex(messages[8] as BilateralSetupProtocolMessage),
    status: 'accepted',
  });
  messages.push({
    ...base({
      kind: 'niti.l3.setup.ack.v1',
      sessionIdHex,
      sequence: 11,
      sender: 'bob',
    }),
    acknowledgedDigestHex: setupMessageDigestHex(messages[9] as BilateralSetupProtocolMessage),
    status: 'accepted',
  });

  return {
    kind: 'niti.l3.bilateral_setup_transcript.v1',
    schemaVersion: bilateralSetupSchemaVersion,
    sessionIdHex,
    messages,
    messageDigests: messages.map(setupMessageDigestHex),
  };
}
