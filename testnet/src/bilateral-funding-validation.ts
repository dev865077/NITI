import {
  canonicalJson,
  setupMessageDigestHex,
  validateBilateralSetupTranscript,
  type BilateralSetupProtocolMessage,
  type BilateralSetupTranscript,
  type FundingInputsSetupMessage,
  type RoleAnnouncementSetupMessage,
} from './bilateral-setup-schema.js';
import type { BilateralRoleName } from './bilateral-roles.js';
import { bytesToHex } from './bytes.js';
import { canonicalAmounts } from './cdlc-scenario.js';
import { sha256Text } from './secp.js';
import { conservativeTaprootDustFloorSat } from './taproot.js';

const bilateralParticipants: readonly BilateralRoleName[] = ['alice', 'bob'] as const;

export interface BilateralFundingParticipantView {
  participant: BilateralRoleName;
  accepted: boolean;
  fundingDigestHex: string;
  inputCount: number;
  totalValueSat: string;
  rejectionReason?: string;
}

export interface BilateralFundingValidationResult {
  kind: 'niti.l3.bilateral_funding_validation.v1';
  sessionIdHex: string;
  accepted: boolean;
  fundingDigestHex: string;
  participantViews: BilateralFundingParticipantView[];
  checks: {
    rolesAnnounced: boolean;
    aliceFundingPresent: boolean;
    bobFundingPresent: boolean;
    scriptsMatchRoleAnnouncements: boolean;
    outpointsUnique: boolean;
    valuesAboveDust: boolean;
    feeReserveSatisfied: boolean;
    fundingBeforeAdaptorExchange: boolean;
  };
  rejectionReason?: string;
}

function fundingDigestHex(message: FundingInputsSetupMessage): string {
  return bytesToHex(sha256Text(canonicalJson({
    kind: message.kind,
    fundingInputs: message.fundingInputs,
  })));
}

function outpointKey(input: FundingInputsSetupMessage['fundingInputs'][number]): string {
  return `${input.txid}:${input.vout}`;
}

function roleAnnouncementMap(
  messages: readonly BilateralSetupProtocolMessage[],
): Map<BilateralRoleName, RoleAnnouncementSetupMessage> {
  const map = new Map<BilateralRoleName, RoleAnnouncementSetupMessage>();
  for (const message of messages) {
    if (message.kind === 'niti.l3.setup.role_announcement.v1') {
      map.set(message.sender, message);
    }
  }
  return map;
}

function fundingMessage(
  messages: readonly BilateralSetupProtocolMessage[],
): FundingInputsSetupMessage | undefined {
  return messages.find((message): message is FundingInputsSetupMessage => (
    message.kind === 'niti.l3.setup.funding_inputs.v1'
  ));
}

function firstSequenceOf(
  messages: readonly BilateralSetupProtocolMessage[],
  kind: BilateralSetupProtocolMessage['kind'],
): number | undefined {
  return messages.find((message) => message.kind === kind)?.sequence;
}

function validateFundingOrThrow(transcript: BilateralSetupTranscript): BilateralFundingValidationResult {
  const validated = validateBilateralSetupTranscript(transcript);
  const roles = roleAnnouncementMap(validated.messages);
  const funding = fundingMessage(validated.messages);
  if (!funding) {
    throw new Error('funding inputs message is missing');
  }

  const digest = fundingDigestHex(funding);
  const ownerSet = new Set(funding.fundingInputs.map((input) => input.owner));
  const outpoints = funding.fundingInputs.map(outpointKey);
  const outpointSet = new Set(outpoints);
  const totalValueSat = funding.fundingInputs.reduce(
    (sum, input) => sum + BigInt(input.valueSat),
    0n,
  );
  const scriptsMatch = funding.fundingInputs.every((input) => (
    input.scriptPubKeyHex === roles.get(input.owner)?.announcement.funding.scriptPubKeyHex
  ));
  const valuesAboveDust = funding.fundingInputs.every((input) => (
    BigInt(input.valueSat) >= conservativeTaprootDustFloorSat
  ));
  const minimumParticipantFundingSat = canonicalAmounts.parentFundingValueSat;
  const feeReserveSatisfied = funding.fundingInputs.every((input) => (
    BigInt(input.valueSat) >= minimumParticipantFundingSat
  ));
  const adaptorSequence = firstSequenceOf(validated.messages, 'niti.l3.setup.adaptor_points.v1');
  const fundingBeforeAdaptorExchange = adaptorSequence === undefined
    || funding.sequence < adaptorSequence;

  const checks = {
    rolesAnnounced: roles.has('alice') && roles.has('bob'),
    aliceFundingPresent: ownerSet.has('alice'),
    bobFundingPresent: ownerSet.has('bob'),
    scriptsMatchRoleAnnouncements: scriptsMatch,
    outpointsUnique: outpoints.length === outpointSet.size,
    valuesAboveDust,
    feeReserveSatisfied,
    fundingBeforeAdaptorExchange,
  };

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) {
      throw new Error(`funding validation failed: ${name}`);
    }
  }

  const participantViews: BilateralFundingParticipantView[] = bilateralParticipants.map((participant) => ({
    participant,
    accepted: true,
    fundingDigestHex: digest,
    inputCount: funding.fundingInputs.length,
    totalValueSat: totalValueSat.toString(),
  }));
  if (participantViews[0]?.fundingDigestHex !== participantViews[1]?.fundingDigestHex) {
    throw new Error('participant funding digests do not match');
  }

  return {
    kind: 'niti.l3.bilateral_funding_validation.v1',
    sessionIdHex: validated.sessionIdHex,
    accepted: true,
    fundingDigestHex: digest,
    participantViews,
    checks,
  };
}

export function validateBilateralFundingAgreement(
  transcript: BilateralSetupTranscript,
): BilateralFundingValidationResult {
  try {
    return validateFundingOrThrow(transcript);
  } catch (error) {
    let sessionIdHex = transcript.sessionIdHex;
    let digest = '';
    try {
      const validated = validateBilateralSetupTranscript(transcript);
      sessionIdHex = validated.sessionIdHex;
      const funding = fundingMessage(validated.messages);
      digest = funding ? fundingDigestHex(funding) : '';
    } catch {
      digest = '';
    }
    const rejectionReason = error instanceof Error ? error.message : String(error);
    return {
      kind: 'niti.l3.bilateral_funding_validation.v1',
      sessionIdHex,
      accepted: false,
      fundingDigestHex: digest,
      participantViews: bilateralParticipants.map((participant) => ({
        participant,
        accepted: false,
        fundingDigestHex: digest,
        inputCount: 0,
        totalValueSat: '0',
        rejectionReason,
      })),
      checks: {
        rolesAnnounced: false,
        aliceFundingPresent: false,
        bobFundingPresent: false,
        scriptsMatchRoleAnnouncements: false,
        outpointsUnique: false,
        valuesAboveDust: false,
        feeReserveSatisfied: false,
        fundingBeforeAdaptorExchange: false,
      },
      rejectionReason,
    };
  }
}

export function rebuildFundingTranscript(input: {
  transcript: BilateralSetupTranscript;
  messages: readonly BilateralSetupProtocolMessage[];
}): BilateralSetupTranscript {
  const renumbered = input.messages.map((message, index) => ({
    ...message,
    sequence: index + 1,
  })) as BilateralSetupProtocolMessage[];
  return {
    ...input.transcript,
    messages: renumbered,
    messageDigests: renumbered.map(setupMessageDigestHex),
  };
}

export function cloneFundingTranscript(
  transcript: BilateralSetupTranscript,
): BilateralSetupTranscript {
  return JSON.parse(JSON.stringify(transcript)) as BilateralSetupTranscript;
}
