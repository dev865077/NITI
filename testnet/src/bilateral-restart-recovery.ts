import {
  buildCanonicalBilateralSetupTranscript,
  canonicalJson,
  setupMessageDigestHex,
  validateBilateralSetupTranscript,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  replayBilateralStateMachine,
  type BilateralProtocolStateName,
} from './bilateral-state-machine.js';
import type { BilateralRoleName } from './bilateral-roles.js';
import {
  buildCanonicalBilateralRetainedStates,
  evaluateRecoveredParticipantAction,
  type BilateralParticipantRetainedState,
  type RecoveredAdaptorCompletion,
} from './bilateral-state-retention.js';
import {
  canonicalOutcomes,
  canonicalSecrets,
} from './cdlc-scenario.js';
import {
  readJsonFile,
  writeJsonFile,
} from './io.js';
import {
  attestOracleOutcome,
  scalarFromHex,
  sha256Text,
} from './secp.js';
import { bytesToHex } from './bytes.js';

export type BilateralRecoveryCheckpointPhase =
  | 'after_funding_exchange'
  | 'after_adaptor_exchange'
  | 'after_oracle_attestation';

export type BilateralRecoveryAction =
  | 'resume_setup'
  | 'wait_for_oracle_or_timeout'
  | 'complete_with_oracle_attestation'
  | 'refund_after_timeout'
  | 'abort_missing_state';

export interface BilateralRecoveryCheckpoint {
  kind: 'niti.l3.bilateral_recovery_checkpoint.v1';
  schemaVersion: 1;
  phase: BilateralRecoveryCheckpointPhase;
  participant: BilateralRoleName;
  sessionIdHex: string;
  protocolState: BilateralProtocolStateName;
  checkpointDigestHex: string;
  setupTranscript: BilateralSetupTranscript;
  retainedState?: BilateralParticipantRetainedState;
  oracleAttestationSecretHex?: string;
}

export interface BilateralRestartRecoveryResult {
  kind: 'niti.l3.bilateral_restart_recovery_result.v1';
  phase: BilateralRecoveryCheckpointPhase;
  participant: BilateralRoleName;
  accepted: boolean;
  action: BilateralRecoveryAction;
  protocolState?: BilateralProtocolStateName;
  validation: {
    digestMatches: boolean;
    transcriptValidates: boolean;
    retainedStatePresentWhenRequired: boolean;
    attestationPresentWhenRequired: boolean;
  };
  completion?: RecoveredAdaptorCompletion;
  refundPath?: {
    refundId: string;
    locktime: number;
    unsignedTxid: string;
    sighashHex: string;
  };
  reason?: string;
}

function digestHex(value: unknown): string {
  return bytesToHex(sha256Text(canonicalJson(value)));
}

function checkpointForDigest(
  checkpoint: BilateralRecoveryCheckpoint,
): Omit<BilateralRecoveryCheckpoint, 'checkpointDigestHex'> {
  const { checkpointDigestHex: _checkpointDigestHex, ...rest } = checkpoint;
  return rest;
}

export function recoveryCheckpointDigestHex(
  checkpoint: BilateralRecoveryCheckpoint,
): string {
  return digestHex(checkpointForDigest(checkpoint));
}

function transcriptPrefix(
  transcript: BilateralSetupTranscript,
  messageCount: number,
): BilateralSetupTranscript {
  const messages = transcript.messages.slice(0, messageCount);
  return {
    kind: transcript.kind,
    schemaVersion: transcript.schemaVersion,
    sessionIdHex: transcript.sessionIdHex,
    messages,
    messageDigests: messages.map(setupMessageDigestHex),
  };
}

function buildCheckpoint(input: {
  phase: BilateralRecoveryCheckpointPhase;
  participant: BilateralRoleName;
  setupTranscript: BilateralSetupTranscript;
  retainedState?: BilateralParticipantRetainedState;
  oracleAttestationSecretHex?: string;
}): BilateralRecoveryCheckpoint {
  const replay = replayBilateralStateMachine(input.setupTranscript);
  const checkpoint: BilateralRecoveryCheckpoint = {
    kind: 'niti.l3.bilateral_recovery_checkpoint.v1',
    schemaVersion: 1,
    phase: input.phase,
    participant: input.participant,
    sessionIdHex: input.setupTranscript.sessionIdHex,
    protocolState: replay.finalState,
    checkpointDigestHex: '',
    setupTranscript: input.setupTranscript,
    ...(input.retainedState ? { retainedState: input.retainedState } : {}),
    ...(input.oracleAttestationSecretHex
      ? { oracleAttestationSecretHex: input.oracleAttestationSecretHex }
      : {}),
  };
  return {
    ...checkpoint,
    checkpointDigestHex: recoveryCheckpointDigestHex(checkpoint),
  };
}

export function buildCanonicalBilateralRecoveryCheckpoints(
  participant: BilateralRoleName,
): BilateralRecoveryCheckpoint[] {
  const setupTranscript = buildCanonicalBilateralSetupTranscript();
  const fundingTranscript = validateBilateralSetupTranscript(
    transcriptPrefix(setupTranscript, 4),
  );
  const retainedState = buildCanonicalBilateralRetainedStates(setupTranscript)
    .find((state) => state.participant === participant);
  if (!retainedState) {
    throw new Error(`missing retained state for ${participant}`);
  }
  const attestation = attestOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
    nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
  });
  if (!attestation.verifies) {
    throw new Error('canonical oracle attestation must verify');
  }

  return [
    buildCheckpoint({
      phase: 'after_funding_exchange',
      participant,
      setupTranscript: fundingTranscript,
    }),
    buildCheckpoint({
      phase: 'after_adaptor_exchange',
      participant,
      setupTranscript,
      retainedState,
    }),
    buildCheckpoint({
      phase: 'after_oracle_attestation',
      participant,
      setupTranscript,
      retainedState,
      oracleAttestationSecretHex: attestation.attestationSecretHex,
    }),
  ];
}

function failedResult(input: {
  checkpoint: BilateralRecoveryCheckpoint;
  digestMatches: boolean;
  transcriptValidates: boolean;
  retainedStatePresentWhenRequired: boolean;
  attestationPresentWhenRequired: boolean;
  reason: string;
}): BilateralRestartRecoveryResult {
  return {
    kind: 'niti.l3.bilateral_restart_recovery_result.v1',
    phase: input.checkpoint.phase,
    participant: input.checkpoint.participant,
    accepted: false,
    action: 'abort_missing_state',
    validation: {
      digestMatches: input.digestMatches,
      transcriptValidates: input.transcriptValidates,
      retainedStatePresentWhenRequired: input.retainedStatePresentWhenRequired,
      attestationPresentWhenRequired: input.attestationPresentWhenRequired,
    },
    reason: input.reason,
  };
}

export function evaluateBilateralRestartRecovery(input: {
  checkpoint: BilateralRecoveryCheckpoint;
  currentHeight: number;
  attestationSecretHex?: string;
}): BilateralRestartRecoveryResult {
  const digestMatches = input.checkpoint.checkpointDigestHex
    === recoveryCheckpointDigestHex(input.checkpoint);
  if (!digestMatches) {
    return failedResult({
      checkpoint: input.checkpoint,
      digestMatches,
      transcriptValidates: false,
      retainedStatePresentWhenRequired: false,
      attestationPresentWhenRequired: false,
      reason: 'checkpoint digest mismatch',
    });
  }

  let replay: ReturnType<typeof replayBilateralStateMachine>;
  try {
    const transcript = validateBilateralSetupTranscript(input.checkpoint.setupTranscript);
    replay = replayBilateralStateMachine(transcript);
  } catch (error) {
    return failedResult({
      checkpoint: input.checkpoint,
      digestMatches,
      transcriptValidates: false,
      retainedStatePresentWhenRequired: false,
      attestationPresentWhenRequired: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (input.checkpoint.phase === 'after_funding_exchange') {
    if (input.attestationSecretHex || input.checkpoint.oracleAttestationSecretHex) {
      return failedResult({
        checkpoint: input.checkpoint,
        digestMatches,
        transcriptValidates: true,
        retainedStatePresentWhenRequired: false,
        attestationPresentWhenRequired: true,
        reason: 'oracle attestation arrived before retained bridge state existed',
      });
    }
    return {
      kind: 'niti.l3.bilateral_restart_recovery_result.v1',
      phase: input.checkpoint.phase,
      participant: input.checkpoint.participant,
      accepted: true,
      action: 'resume_setup',
      protocolState: replay.finalState,
      validation: {
        digestMatches,
        transcriptValidates: true,
        retainedStatePresentWhenRequired: true,
        attestationPresentWhenRequired: true,
      },
    };
  }

  if (!input.checkpoint.retainedState) {
    return failedResult({
      checkpoint: input.checkpoint,
      digestMatches,
      transcriptValidates: true,
      retainedStatePresentWhenRequired: false,
      attestationPresentWhenRequired: input.checkpoint.phase !== 'after_oracle_attestation',
      reason: `missing retained state for ${input.checkpoint.phase}`,
    });
  }

  const attestationSecretHex = input.attestationSecretHex
    ?? input.checkpoint.oracleAttestationSecretHex;
  if (input.checkpoint.phase === 'after_oracle_attestation' && !attestationSecretHex) {
    return failedResult({
      checkpoint: input.checkpoint,
      digestMatches,
      transcriptValidates: true,
      retainedStatePresentWhenRequired: true,
      attestationPresentWhenRequired: false,
      reason: 'missing oracle attestation after attestation checkpoint',
    });
  }

  const recovered = evaluateRecoveredParticipantAction({
    state: input.checkpoint.retainedState,
    currentHeight: input.currentHeight,
    ...(attestationSecretHex ? { attestationSecretHex } : {}),
  });
  return {
    kind: 'niti.l3.bilateral_restart_recovery_result.v1',
    phase: input.checkpoint.phase,
    participant: input.checkpoint.participant,
    accepted: recovered.action !== 'abort_missing_state',
    action: recovered.action,
    protocolState: replay.finalState,
    validation: {
      digestMatches,
      transcriptValidates: true,
      retainedStatePresentWhenRequired: true,
      attestationPresentWhenRequired: input.checkpoint.phase !== 'after_oracle_attestation'
        || Boolean(attestationSecretHex),
    },
    ...(recovered.completion ? { completion: recovered.completion } : {}),
    ...(recovered.refundPath ? { refundPath: recovered.refundPath } : {}),
    ...(recovered.reason ? { reason: recovered.reason } : {}),
  };
}

export function writeBilateralRecoveryCheckpoint(
  path: string,
  checkpoint: BilateralRecoveryCheckpoint,
): void {
  writeJsonFile(path, checkpoint);
}

export function readBilateralRecoveryCheckpoint(path: string): BilateralRecoveryCheckpoint {
  return readJsonFile<BilateralRecoveryCheckpoint>(path);
}

export function cloneRecoveryCheckpoint(
  checkpoint: BilateralRecoveryCheckpoint,
): BilateralRecoveryCheckpoint {
  return JSON.parse(JSON.stringify(checkpoint)) as BilateralRecoveryCheckpoint;
}
