import { Point } from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from './bytes.js';
import {
  buildCanonicalBilateralAdaptorExchange,
  type BilateralAdaptorExchange,
  type BilateralAdaptorSignaturePacket,
} from './bilateral-adaptor-exchange.js';
import {
  buildBilateralRoleMaterial,
  bilateralAdaptorNoncePurposes,
  type BilateralAdaptorNoncePurpose,
  type BilateralRoleName,
} from './bilateral-roles.js';
import {
  buildCanonicalBilateralSetupTranscript,
  canonicalJson,
  validateBilateralSetupTranscript,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  replayBilateralStateMachine,
} from './bilateral-state-machine.js';
import {
  buildCanonicalBilateralTemplateAgreement,
  participantViewFromTemplate,
  type BilateralTransactionTemplateAgreement,
} from './bilateral-template-agreement.js';
import {
  validateBilateralFundingAgreement,
  type BilateralFundingValidationResult,
} from './bilateral-funding-validation.js';
import {
  canonicalNetwork,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';
import {
  readJsonFile,
  writeJsonFile,
} from './io.js';
import {
  bip340Challenge,
  completeAdaptorSignature,
  hasEvenY,
  pointFromCompressed,
  pointToCompressed,
  pointToXOnly,
  prepareOracleOutcome,
  scalarFromHex,
  sha256Text,
} from './secp.js';

export const bilateralRetainedStateSchemaVersion = 1 as const;

export interface BilateralRetainedOracleMetadata {
  parentEventId: string;
  parentActivatingOutcome: string;
  parentWrongOutcome: string;
  parentAttestationPointCompressedHex: string;
  childEventId: string;
  childActivatingOutcome: string;
  childAttestationPointCompressedHex: string;
}

export interface BilateralRetainedDeadlines {
  parentRefundHeight: number;
  bridgeTimeoutHeight: number;
  childRefundHeight: number;
}

export interface BilateralParticipantRetainedState {
  kind: 'niti.l3.bilateral_participant_retained_state.v1';
  schemaVersion: typeof bilateralRetainedStateSchemaVersion;
  participant: BilateralRoleName;
  sessionIdHex: string;
  network: typeof canonicalNetwork;
  storageNamespaceHex: string;
  stateDigestHex: string;
  setupTranscriptDigestHex: string;
  templateDigestHex: string;
  fundingDigestHex: string;
  acceptedBy: BilateralRoleName[];
  protocolState: 'setup_accepted';
  localSecretHandles: {
    fundingOutputSecret: string;
    cetSigningOutputSecret: string;
    refundOutputSecret: string;
  };
  retainedArtifacts: {
    setupTranscript: BilateralSetupTranscript;
    fundingValidation: BilateralFundingValidationResult;
    transactionTemplate: BilateralTransactionTemplateAgreement;
    adaptorExchange: BilateralAdaptorExchange;
    oracleMetadata: BilateralRetainedOracleMetadata;
    deadlines: BilateralRetainedDeadlines;
  };
  restartCapabilities: {
    canValidateTemplateDigest: boolean;
    canVerifyAdaptorExchange: boolean;
    canCompleteWithOracleAttestation: boolean;
    canRefundAfterDeadlines: boolean;
    requiresLocalSecretMaterialForRefundSigning: boolean;
  };
}

export interface BilateralRetainedStateValidation {
  kind: 'niti.l3.bilateral_retained_state_validation.v1';
  participant: BilateralRoleName;
  sessionIdHex: string;
  accepted: boolean;
  checks: {
    digestMatches: boolean;
    transcriptValidates: boolean;
    setupAccepted: boolean;
    fundingDigestMatches: boolean;
    templateDigestMatches: boolean;
    timelocksOrdered: boolean;
    adaptorExchangeRetained: boolean;
    adaptorPacketsMatchTemplate: boolean;
    adaptorEquationsVerify: boolean;
    oracleMetadataMatchesTemplate: boolean;
    deadlinesMatchTemplate: boolean;
    publicStateContainsNoPrivateScalars: boolean;
  };
  rejectionReason?: string;
}

export interface RecoveredAdaptorCompletion {
  purpose: BilateralAdaptorNoncePurpose;
  signatureHex: string;
  completedScalarHex: string;
  verifies: boolean;
  extractedSecretHex: string;
}

export interface RecoveredParticipantAction {
  kind: 'niti.l3.bilateral_recovered_participant_action.v1';
  participant: BilateralRoleName;
  action:
    | 'complete_with_oracle_attestation'
    | 'refund_after_timeout'
    | 'wait_for_oracle_or_timeout'
    | 'abort_missing_state';
  validationAccepted: boolean;
  currentHeight: number;
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

function stateForDigest(state: BilateralParticipantRetainedState): Omit<
  BilateralParticipantRetainedState,
  'stateDigestHex'
> {
  const { stateDigestHex: _stateDigestHex, ...rest } = state;
  return rest;
}

export function retainedStateDigestHex(state: BilateralParticipantRetainedState): string {
  return digestHex(stateForDigest(state));
}

function transcriptDigestHex(transcript: BilateralSetupTranscript): string {
  return digestHex(transcript);
}

function oracleMetadata(): BilateralRetainedOracleMetadata {
  const parentPrepared = prepareOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
    nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
  });
  const childPrepared = prepareOracleOutcome({
    eventId: canonicalOutcomes.childEventId,
    outcome: canonicalOutcomes.childActivating,
    oracleSecret: scalarFromHex(canonicalSecrets.childOracle, 'child oracle secret'),
    nonceSecret: scalarFromHex(canonicalSecrets.childOracleNonce, 'child oracle nonce'),
  });
  return {
    parentEventId: canonicalOutcomes.eventId,
    parentActivatingOutcome: canonicalOutcomes.activating,
    parentWrongOutcome: canonicalOutcomes.wrong,
    parentAttestationPointCompressedHex: parentPrepared.attestationPointCompressedHex,
    childEventId: canonicalOutcomes.childEventId,
    childActivatingOutcome: canonicalOutcomes.childActivating,
    childAttestationPointCompressedHex: childPrepared.attestationPointCompressedHex,
  };
}

function secretHandle(input: {
  participant: BilateralRoleName;
  scope: string;
  storageNamespaceHex: string;
}): string {
  return `local:${input.participant}:${input.scope}:${input.storageNamespaceHex.slice(0, 16)}`;
}

function buildState(input: {
  participant: BilateralRoleName;
  transcript: BilateralSetupTranscript;
  template: BilateralTransactionTemplateAgreement;
  fundingValidation: BilateralFundingValidationResult;
  adaptorExchange: BilateralAdaptorExchange;
}): BilateralParticipantRetainedState {
  const roleMaterial = buildBilateralRoleMaterial(canonicalNetwork).find((entry) => (
    entry.role === input.participant
  ));
  if (!roleMaterial) {
    throw new Error(`missing role material for ${input.participant}`);
  }
  const replay = replayBilateralStateMachine(input.transcript);
  if (replay.finalState !== 'setup_accepted') {
    throw new Error('retained state requires accepted setup transcript');
  }
  const acceptedBy = input.transcript.messages
    .filter((message) => message.kind === 'niti.l3.setup.ack.v1')
    .map((message) => message.sender)
    .sort();
  if (acceptedBy.length !== 2 || acceptedBy[0] !== 'alice' || acceptedBy[1] !== 'bob') {
    throw new Error('retained state requires alice and bob setup acknowledgements');
  }
  const deadlines = {
    parentRefundHeight: input.template.timelocks.parentRefundHeight,
    bridgeTimeoutHeight: input.template.timelocks.bridgeTimeoutHeight,
    childRefundHeight: input.template.timelocks.childRefundHeight,
  };
  const state: BilateralParticipantRetainedState = {
    kind: 'niti.l3.bilateral_participant_retained_state.v1',
    schemaVersion: bilateralRetainedStateSchemaVersion,
    participant: input.participant,
    sessionIdHex: input.transcript.sessionIdHex,
    network: canonicalNetwork,
    storageNamespaceHex: roleMaterial.storageNamespaceHex,
    stateDigestHex: '',
    setupTranscriptDigestHex: transcriptDigestHex(input.transcript),
    templateDigestHex: participantViewFromTemplate({
      participant: input.participant,
      template: input.template,
    }).canonicalTemplateDigestHex,
    fundingDigestHex: input.fundingValidation.fundingDigestHex,
    acceptedBy,
    protocolState: 'setup_accepted',
    localSecretHandles: {
      fundingOutputSecret: secretHandle({
        participant: input.participant,
        scope: 'funding-output-secret',
        storageNamespaceHex: roleMaterial.storageNamespaceHex,
      }),
      cetSigningOutputSecret: secretHandle({
        participant: input.participant,
        scope: 'cet-signing-output-secret',
        storageNamespaceHex: roleMaterial.storageNamespaceHex,
      }),
      refundOutputSecret: secretHandle({
        participant: input.participant,
        scope: 'refund-output-secret',
        storageNamespaceHex: roleMaterial.storageNamespaceHex,
      }),
    },
    retainedArtifacts: {
      setupTranscript: input.transcript,
      fundingValidation: input.fundingValidation,
      transactionTemplate: input.template,
      adaptorExchange: input.adaptorExchange,
      oracleMetadata: oracleMetadata(),
      deadlines,
    },
    restartCapabilities: {
      canValidateTemplateDigest: true,
      canVerifyAdaptorExchange: true,
      canCompleteWithOracleAttestation: true,
      canRefundAfterDeadlines: true,
      requiresLocalSecretMaterialForRefundSigning: true,
    },
  };
  return {
    ...state,
    stateDigestHex: retainedStateDigestHex(state),
  };
}

export function buildCanonicalBilateralRetainedStates(
  transcript: BilateralSetupTranscript = buildCanonicalBilateralSetupTranscript(),
): BilateralParticipantRetainedState[] {
  const validatedTranscript = validateBilateralSetupTranscript(transcript);
  const template = buildCanonicalBilateralTemplateAgreement(validatedTranscript);
  const fundingValidation = validateBilateralFundingAgreement(validatedTranscript);
  const adaptorExchange = buildCanonicalBilateralAdaptorExchange(validatedTranscript);
  if (!fundingValidation.accepted) {
    throw new Error('canonical funding validation must be accepted');
  }
  return (['alice', 'bob'] as const).map((participant) => buildState({
    participant,
    transcript: validatedTranscript,
    template,
    fundingValidation,
    adaptorExchange,
  }));
}

function allPackets(
  exchange: BilateralAdaptorExchange,
): BilateralAdaptorSignaturePacket[] {
  return exchange.messages.flatMap((message) => message.signatures);
}

function packetForPurpose(
  state: BilateralParticipantRetainedState,
  purpose: BilateralAdaptorNoncePurpose,
): BilateralAdaptorSignaturePacket | undefined {
  return allPackets(state.retainedArtifacts.adaptorExchange)
    .find((packet) => packet.purpose === purpose);
}

function pointXOnlyHex(point: Point): string {
  return bytesToHex(pointToXOnly(point));
}

function verifyPacketEquation(packet: BilateralAdaptorSignaturePacket): boolean {
  const adaptedNonce = pointFromCompressed(packet.adaptedNonceCompressedHex);
  if (!hasEvenY(adaptedNonce) || pointXOnlyHex(adaptedNonce) !== packet.adaptedNonceXOnlyHex) {
    return false;
  }
  const adaptorPoint = pointFromCompressed(packet.adaptorPointCompressedHex);
  const preNonce = pointFromCompressed(packet.preNonceCompressedHex);
  if (!adaptedNonce.subtract(adaptorPoint).equals(preNonce)) {
    return false;
  }
  const signerPoint = pointFromCompressed(packet.signerPublicCompressedHex);
  if (
    pointToCompressed(signerPoint) !== packet.signerPublicCompressedHex
    || pointXOnlyHex(signerPoint) !== packet.signerPublicXOnlyHex
  ) {
    return false;
  }
  const challenge = bip340Challenge(
    pointToXOnly(adaptedNonce),
    pointToXOnly(signerPoint),
    hexToBytes(packet.sighashHex),
  );
  const left = Point.BASE.multiply(scalarFromHex(
    packet.adaptorSignatureScalarHex,
    `${packet.purpose} retained adaptor scalar`,
  ));
  const right = adaptedNonce.subtract(adaptorPoint).add(signerPoint.multiply(challenge));
  return left.equals(right);
}

function adaptorPacketsMatchTemplate(state: BilateralParticipantRetainedState): boolean {
  const template = state.retainedArtifacts.transactionTemplate;
  const expected = {
    parent_cet: template.parentCet,
    bridge: template.bridge,
    child_cet: template.childCet,
  } as const;
  return bilateralAdaptorNoncePurposes.every((purpose) => {
    const packet = packetForPurpose(state, purpose);
    const expectedTemplate = expected[purpose];
    return Boolean(packet)
      && packet!.templateId === expectedTemplate.id
      && packet!.unsignedTxid === expectedTemplate.unsignedTxid
      && packet!.sighashHex === expectedTemplate.sighashHex
      && packet!.adaptorPointCompressedHex === expectedTemplate.adaptorPointCompressedHex;
  });
}

function publicStateContainsNoPrivateScalars(state: BilateralParticipantRetainedState): boolean {
  const text = JSON.stringify(state);
  const wallets = canonicalWallets(canonicalNetwork);
  const roleSecrets = buildBilateralRoleMaterial(canonicalNetwork).flatMap((role) => [
    role.fixture.fundingInternalSecretHex,
    role.fixture.cetSigningInternalSecretHex,
    role.fixture.refundInternalSecretHex,
    role.fixture.adaptorNonceRootSecretHex,
    role.fixture.storageIdentitySecretHex,
    ...Object.values(role.derivedAdaptorNonceSecretHex),
  ]);
  const canonicalPrivateScalars = [
    canonicalSecrets.sourceFunding,
    canonicalSecrets.sourceFundingNonce,
    canonicalSecrets.parentFunding,
    canonicalSecrets.bridgeSigner,
    canonicalSecrets.childFunding,
    canonicalSecrets.oracle,
    canonicalSecrets.oracleNonce,
    canonicalSecrets.childOracle,
    canonicalSecrets.childOracleNonce,
  ];
  const forbidden = [
    ...canonicalPrivateScalars,
    wallets.sourceFunding.outputSecretHex,
    wallets.parentFunding.outputSecretHex,
    wallets.bridgeSigner.outputSecretHex,
    wallets.childFunding.outputSecretHex,
    ...roleSecrets,
  ];
  return forbidden.every((secret) => !text.includes(secret));
}

function validateRetainedStateOrThrow(
  state: BilateralParticipantRetainedState,
): BilateralRetainedStateValidation {
  if (state.kind !== 'niti.l3.bilateral_participant_retained_state.v1') {
    throw new Error('unsupported retained state kind');
  }
  if (state.schemaVersion !== bilateralRetainedStateSchemaVersion) {
    throw new Error('unsupported retained state schema version');
  }
  const validatedTranscript = validateBilateralSetupTranscript(
    state.retainedArtifacts.setupTranscript,
  );
  const replay = replayBilateralStateMachine(validatedTranscript);
  const funding = validateBilateralFundingAgreement(validatedTranscript);
  const participantView = participantViewFromTemplate({
    participant: state.participant,
    template: state.retainedArtifacts.transactionTemplate,
  });
  const exchange = state.retainedArtifacts.adaptorExchange;
  const packets = allPackets(exchange);
  const packetPurposes = new Set(packets.map((packet) => packet.purpose));
  const metadata = state.retainedArtifacts.oracleMetadata;
  const template = state.retainedArtifacts.transactionTemplate;
  const checks = {
    digestMatches: state.stateDigestHex === retainedStateDigestHex(state),
    transcriptValidates: validatedTranscript.sessionIdHex === state.sessionIdHex,
    setupAccepted: replay.finalState === 'setup_accepted',
    fundingDigestMatches: funding.accepted
      && funding.fundingDigestHex === state.fundingDigestHex
      && funding.fundingDigestHex === state.retainedArtifacts.fundingValidation.fundingDigestHex,
    templateDigestMatches: participantView.canonicalTemplateDigestHex === state.templateDigestHex,
    timelocksOrdered: template.timelocks.ordered,
    adaptorExchangeRetained: exchange.sessionIdHex === state.sessionIdHex
      && exchange.templateDigestHex === state.templateDigestHex
      && bilateralAdaptorNoncePurposes.every((purpose) => packetPurposes.has(purpose)),
    adaptorPacketsMatchTemplate: adaptorPacketsMatchTemplate(state),
    adaptorEquationsVerify: packets.length === bilateralAdaptorNoncePurposes.length
      && packets.every(verifyPacketEquation),
    oracleMetadataMatchesTemplate: metadata.parentAttestationPointCompressedHex
      === template.bridge.adaptorPointCompressedHex
      && metadata.parentAttestationPointCompressedHex === template.parentCet.adaptorPointCompressedHex
      && metadata.childAttestationPointCompressedHex === template.childCet.adaptorPointCompressedHex,
    deadlinesMatchTemplate: state.retainedArtifacts.deadlines.parentRefundHeight
      === template.timelocks.parentRefundHeight
      && state.retainedArtifacts.deadlines.bridgeTimeoutHeight === template.timelocks.bridgeTimeoutHeight
      && state.retainedArtifacts.deadlines.childRefundHeight === template.timelocks.childRefundHeight,
    publicStateContainsNoPrivateScalars: publicStateContainsNoPrivateScalars(state),
  };

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) {
      throw new Error(`retained state validation failed: ${name}`);
    }
  }

  return {
    kind: 'niti.l3.bilateral_retained_state_validation.v1',
    participant: state.participant,
    sessionIdHex: state.sessionIdHex,
    accepted: true,
    checks,
  };
}

export function validateBilateralRetainedState(
  state: BilateralParticipantRetainedState,
): BilateralRetainedStateValidation {
  try {
    return validateRetainedStateOrThrow(state);
  } catch (error) {
    return {
      kind: 'niti.l3.bilateral_retained_state_validation.v1',
      participant: state.participant,
      sessionIdHex: state.sessionIdHex,
      accepted: false,
      checks: {
        digestMatches: false,
        transcriptValidates: false,
        setupAccepted: false,
        fundingDigestMatches: false,
        templateDigestMatches: false,
        timelocksOrdered: false,
        adaptorExchangeRetained: false,
        adaptorPacketsMatchTemplate: false,
        adaptorEquationsVerify: false,
        oracleMetadataMatchesTemplate: false,
        deadlinesMatchTemplate: false,
        publicStateContainsNoPrivateScalars: false,
      },
      rejectionReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function completeRetainedAdaptorSignature(input: {
  state: BilateralParticipantRetainedState;
  purpose: BilateralAdaptorNoncePurpose;
  attestationSecretHex: string;
}): RecoveredAdaptorCompletion {
  const packet = packetForPurpose(input.state, input.purpose);
  if (!packet) {
    throw new Error(`missing retained ${input.purpose} adaptor signature`);
  }
  const completed = completeAdaptorSignature({
    adaptorSignatureScalar: scalarFromHex(
      packet.adaptorSignatureScalarHex,
      `${input.purpose} retained adaptor scalar`,
    ),
    attestationSecret: scalarFromHex(input.attestationSecretHex, 'oracle attestation secret'),
    adaptedNonceXOnly: hexToBytes(packet.adaptedNonceXOnlyHex),
    signerPublicXOnly: hexToBytes(packet.signerPublicXOnlyHex),
    message32: hexToBytes(packet.sighashHex),
  });
  return {
    purpose: input.purpose,
    signatureHex: completed.signatureHex,
    completedScalarHex: completed.completedScalarHex,
    verifies: completed.verifies,
    extractedSecretHex: completed.extractedSecretHex,
  };
}

export function evaluateRecoveredParticipantAction(input: {
  state: BilateralParticipantRetainedState;
  currentHeight: number;
  attestationSecretHex?: string;
}): RecoveredParticipantAction {
  const validation = validateBilateralRetainedState(input.state);
  if (!validation.accepted) {
    return {
      kind: 'niti.l3.bilateral_recovered_participant_action.v1',
      participant: input.state.participant,
      action: 'abort_missing_state',
      validationAccepted: false,
      currentHeight: input.currentHeight,
      ...(validation.rejectionReason ? { reason: validation.rejectionReason } : {}),
    };
  }
  if (input.attestationSecretHex) {
    const completion = completeRetainedAdaptorSignature({
      state: input.state,
      purpose: 'bridge',
      attestationSecretHex: input.attestationSecretHex,
    });
    return {
      kind: 'niti.l3.bilateral_recovered_participant_action.v1',
      participant: input.state.participant,
      action: completion.verifies
        ? 'complete_with_oracle_attestation'
        : 'abort_missing_state',
      validationAccepted: true,
      currentHeight: input.currentHeight,
      completion,
      ...(completion.verifies ? {} : { reason: 'retained bridge adaptor did not complete' }),
    };
  }
  const refund = input.state.retainedArtifacts.transactionTemplate.edgeTimeoutRefund;
  if (input.currentHeight > input.state.retainedArtifacts.deadlines.bridgeTimeoutHeight) {
    return {
      kind: 'niti.l3.bilateral_recovered_participant_action.v1',
      participant: input.state.participant,
      action: 'refund_after_timeout',
      validationAccepted: true,
      currentHeight: input.currentHeight,
      refundPath: {
        refundId: refund.id,
        locktime: refund.locktime,
        unsignedTxid: refund.unsignedTxid,
        sighashHex: refund.sighashHex,
      },
    };
  }
  return {
    kind: 'niti.l3.bilateral_recovered_participant_action.v1',
    participant: input.state.participant,
    action: 'wait_for_oracle_or_timeout',
    validationAccepted: true,
    currentHeight: input.currentHeight,
  };
}

export function writeBilateralRetainedState(
  path: string,
  state: BilateralParticipantRetainedState,
): void {
  writeJsonFile(path, state);
}

export function readBilateralRetainedState(path: string): BilateralParticipantRetainedState {
  return readJsonFile<BilateralParticipantRetainedState>(path);
}

export function cloneRetainedState(
  state: BilateralParticipantRetainedState,
): BilateralParticipantRetainedState {
  return JSON.parse(JSON.stringify(state)) as BilateralParticipantRetainedState;
}
