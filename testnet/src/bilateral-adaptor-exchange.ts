import { Point } from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from './bytes.js';
import {
  buildCanonicalBilateralSetupTranscript,
  canonicalJson,
  validateBilateralSetupTranscript,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  type BilateralAdaptorNoncePurpose,
  type BilateralRoleName,
} from './bilateral-roles.js';
import {
  buildCanonicalBilateralTemplateAgreement,
  deriveBilateralTemplateParticipantView,
  type BilateralAdaptorTemplate,
  type BilateralTransactionTemplateAgreement,
} from './bilateral-template-agreement.js';
import {
  canonicalNetwork,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';
import {
  bip340Challenge,
  createBip340AdaptorSignature,
  hasEvenY,
  pointFromCompressed,
  pointToCompressed,
  pointToXOnly,
  prepareOracleOutcome,
  scalarFromHex,
  sha256Text,
} from './secp.js';

export const bilateralAdaptorExchangeSchemaVersion = 1 as const;

export interface BilateralAdaptorSignaturePacket {
  purpose: BilateralAdaptorNoncePurpose;
  templateId: string;
  unsignedTxid: string;
  sighashHex: string;
  signerRole: BilateralRoleName;
  signerPublicXOnlyHex: string;
  signerPublicCompressedHex: string;
  adaptorPointCompressedHex: string;
  adaptedNonceXOnlyHex: string;
  adaptedNonceCompressedHex: string;
  preNonceCompressedHex: string;
  adaptorSignatureScalarHex: string;
}

export interface BilateralAdaptorExchangeMessage {
  kind: 'niti.l3.adaptor_signature_exchange.v1';
  schemaVersion: typeof bilateralAdaptorExchangeSchemaVersion;
  sessionIdHex: string;
  templateDigestHex: string;
  sender: BilateralRoleName;
  signatures: BilateralAdaptorSignaturePacket[];
}

export interface BilateralAdaptorExchange {
  kind: 'niti.l3.bilateral_adaptor_exchange.v1';
  schemaVersion: typeof bilateralAdaptorExchangeSchemaVersion;
  sessionIdHex: string;
  templateDigestHex: string;
  messages: BilateralAdaptorExchangeMessage[];
}

export interface BilateralAdaptorExchangeVerification {
  kind: 'niti.l3.bilateral_adaptor_exchange_verification.v1';
  participant: BilateralRoleName;
  sessionIdHex: string;
  accepted: boolean;
  templateDigestHex: string;
  verifiedPurposes: BilateralAdaptorNoncePurpose[];
  checks: {
    sessionMatches: boolean;
    templateDigestMatches: boolean;
    allExpectedPurposesPresent: boolean;
    noUnexpectedPurpose: boolean;
    senderBindingsMatch: boolean;
    signerPublicKeysMatch: boolean;
    sighashesMatch: boolean;
    adaptorPointsMatch: boolean;
    adaptedNonceBindingsMatch: boolean;
    adaptorEquationsVerify: boolean;
    publicMessagesContainNoPrivateScalars: boolean;
  };
  rejectionReason?: string;
}

interface AdaptorSigningPlan {
  purpose: BilateralAdaptorNoncePurpose;
  template: BilateralAdaptorTemplate;
  sender: BilateralRoleName;
  signerSecretHex: string;
  signerPublicXOnlyHex: string;
  signerPublicCompressedHex: string;
}

function templateDigestHex(template: BilateralTransactionTemplateAgreement): string {
  return bytesToHex(sha256Text(canonicalJson(template)));
}

function expectedSigningPlans(
  template: BilateralTransactionTemplateAgreement,
): Record<BilateralAdaptorNoncePurpose, AdaptorSigningPlan> {
  const wallets = canonicalWallets(canonicalNetwork);
  return {
    parent_cet: {
      purpose: 'parent_cet',
      template: template.parentCet,
      sender: 'alice',
      signerSecretHex: wallets.parentFunding.outputSecretHex,
      signerPublicXOnlyHex: wallets.parentFunding.outputPublicXOnlyHex,
      signerPublicCompressedHex: wallets.parentFunding.outputPublicCompressedHex,
    },
    bridge: {
      purpose: 'bridge',
      template: template.bridge,
      sender: 'bob',
      signerSecretHex: wallets.bridgeSigner.outputSecretHex,
      signerPublicXOnlyHex: wallets.bridgeSigner.outputPublicXOnlyHex,
      signerPublicCompressedHex: wallets.bridgeSigner.outputPublicCompressedHex,
    },
    child_cet: {
      purpose: 'child_cet',
      template: template.childCet,
      sender: 'bob',
      signerSecretHex: wallets.childFunding.outputSecretHex,
      signerPublicXOnlyHex: wallets.childFunding.outputPublicXOnlyHex,
      signerPublicCompressedHex: wallets.childFunding.outputPublicCompressedHex,
    },
  };
}

function deterministicNonceStart(purpose: BilateralAdaptorNoncePurpose): number {
  if (purpose === 'parent_cet') {
    return 1;
  }
  if (purpose === 'bridge') {
    return 100;
  }
  return 200;
}

function createPacket(plan: AdaptorSigningPlan): BilateralAdaptorSignaturePacket {
  const message32 = hexToBytes(plan.template.sighashHex);
  const adaptorPoint = pointFromCompressed(plan.template.adaptorPointCompressedHex);
  const start = deterministicNonceStart(plan.purpose);

  for (let i = start; i < start + 512; i += 1) {
    try {
      const adaptor = createBip340AdaptorSignature({
        signerSecret: scalarFromHex(plan.signerSecretHex, `${plan.purpose} signer secret`),
        adaptorPoint,
        message32,
        nonceSecret: scalarFromHex(i.toString(16).padStart(64, '0'), `${plan.purpose} nonce`),
      });
      if (
        adaptor.signerPublicXOnlyHex !== plan.signerPublicXOnlyHex
        || adaptor.signerPublicCompressedHex !== plan.signerPublicCompressedHex
      ) {
        throw new Error(`${plan.purpose} signer public key mismatch`);
      }
      return {
        purpose: plan.purpose,
        templateId: plan.template.id,
        unsignedTxid: plan.template.unsignedTxid,
        sighashHex: plan.template.sighashHex,
        signerRole: plan.template.signerRole,
        signerPublicXOnlyHex: adaptor.signerPublicXOnlyHex,
        signerPublicCompressedHex: adaptor.signerPublicCompressedHex,
        adaptorPointCompressedHex: adaptor.adaptorPointCompressedHex,
        adaptedNonceXOnlyHex: adaptor.adaptedNonceXOnlyHex,
        adaptedNonceCompressedHex: adaptor.adaptedNonceCompressedHex,
        preNonceCompressedHex: adaptor.preNonceCompressedHex,
        adaptorSignatureScalarHex: adaptor.adaptorSignatureScalarHex,
      };
    } catch (error) {
      if (
        error instanceof Error
        && error.message === 'deterministic adaptor nonce produced an invalid adapted nonce'
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(`could not derive deterministic ${plan.purpose} adaptor signature`);
}

export function buildCanonicalBilateralAdaptorExchange(
  transcript: BilateralSetupTranscript = buildCanonicalBilateralSetupTranscript(),
): BilateralAdaptorExchange {
  const validatedTranscript = validateBilateralSetupTranscript(transcript);
  const template = buildCanonicalBilateralTemplateAgreement(validatedTranscript);
  const digest = templateDigestHex(template);
  const plans = expectedSigningPlans(template);
  const parentCet = createPacket(plans.parent_cet);
  const bridge = createPacket(plans.bridge);
  const childCet = createPacket(plans.child_cet);

  return {
    kind: 'niti.l3.bilateral_adaptor_exchange.v1',
    schemaVersion: bilateralAdaptorExchangeSchemaVersion,
    sessionIdHex: validatedTranscript.sessionIdHex,
    templateDigestHex: digest,
    messages: [
      {
        kind: 'niti.l3.adaptor_signature_exchange.v1',
        schemaVersion: bilateralAdaptorExchangeSchemaVersion,
        sessionIdHex: validatedTranscript.sessionIdHex,
        templateDigestHex: digest,
        sender: 'alice',
        signatures: [parentCet],
      },
      {
        kind: 'niti.l3.adaptor_signature_exchange.v1',
        schemaVersion: bilateralAdaptorExchangeSchemaVersion,
        sessionIdHex: validatedTranscript.sessionIdHex,
        templateDigestHex: digest,
        sender: 'bob',
        signatures: [bridge, childCet],
      },
    ],
  };
}

function emptyChecks(): BilateralAdaptorExchangeVerification['checks'] {
  return {
    sessionMatches: false,
    templateDigestMatches: false,
    allExpectedPurposesPresent: false,
    noUnexpectedPurpose: false,
    senderBindingsMatch: false,
    signerPublicKeysMatch: false,
    sighashesMatch: false,
    adaptorPointsMatch: false,
    adaptedNonceBindingsMatch: false,
    adaptorEquationsVerify: false,
    publicMessagesContainNoPrivateScalars: false,
  };
}

function rejection(input: {
  participant: BilateralRoleName;
  sessionIdHex: string;
  templateDigestHex: string;
  checks: BilateralAdaptorExchangeVerification['checks'];
  rejectionReason: string;
}): BilateralAdaptorExchangeVerification {
  return {
    kind: 'niti.l3.bilateral_adaptor_exchange_verification.v1',
    participant: input.participant,
    sessionIdHex: input.sessionIdHex,
    accepted: false,
    templateDigestHex: input.templateDigestHex,
    verifiedPurposes: [],
    checks: input.checks,
    rejectionReason: input.rejectionReason,
  };
}

function packetKey(packet: BilateralAdaptorSignaturePacket): BilateralAdaptorNoncePurpose {
  return packet.purpose;
}

function xOnlyHex(point: Point): string {
  return bytesToHex(pointToXOnly(point));
}

function verifyAdaptedNonceBinding(packet: BilateralAdaptorSignaturePacket): boolean {
  const adaptedNonce = pointFromCompressed(packet.adaptedNonceCompressedHex);
  if (!hasEvenY(adaptedNonce)) {
    return false;
  }
  if (xOnlyHex(adaptedNonce) !== packet.adaptedNonceXOnlyHex) {
    return false;
  }
  const adaptorPoint = pointFromCompressed(packet.adaptorPointCompressedHex);
  const preNonce = pointFromCompressed(packet.preNonceCompressedHex);
  if (!adaptedNonce.subtract(adaptorPoint).equals(preNonce)) {
    return false;
  }
  return true;
}

function verifyAdaptorEquation(packet: BilateralAdaptorSignaturePacket): boolean {
  const adaptedNonce = pointFromCompressed(packet.adaptedNonceCompressedHex);
  if (!hasEvenY(adaptedNonce)) {
    return false;
  }
  const adaptorPoint = pointFromCompressed(packet.adaptorPointCompressedHex);
  const signerPoint = pointFromCompressed(packet.signerPublicCompressedHex);
  if (pointToCompressed(signerPoint) !== packet.signerPublicCompressedHex) {
    return false;
  }
  if (xOnlyHex(signerPoint) !== packet.signerPublicXOnlyHex) {
    return false;
  }
  const challenge = bip340Challenge(
    pointToXOnly(adaptedNonce),
    pointToXOnly(signerPoint),
    hexToBytes(packet.sighashHex),
  );
  const adaptorScalar = scalarFromHex(
    packet.adaptorSignatureScalarHex,
    `${packet.purpose} adaptor signature scalar`,
  );
  const left = Point.BASE.multiply(adaptorScalar);
  const right = adaptedNonce.subtract(adaptorPoint).add(signerPoint.multiply(challenge));
  return left.equals(right);
}

function privateScalarDisclosureCheck(messages: readonly BilateralAdaptorExchangeMessage[]): boolean {
  const text = JSON.stringify(messages);
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
  const forbidden = [
    ...Object.values(canonicalSecrets),
    parentPrepared.oracleSecretHex,
    parentPrepared.nonceSecretHex,
    childPrepared.oracleSecretHex,
    childPrepared.nonceSecretHex,
  ];
  return forbidden.every((secret) => !text.includes(secret));
}

export function verifyBilateralAdaptorExchange(input: {
  participant: BilateralRoleName;
  transcript: BilateralSetupTranscript;
  exchange: BilateralAdaptorExchange;
}): BilateralAdaptorExchangeVerification {
  const participantView = deriveBilateralTemplateParticipantView({
    participant: input.participant,
    transcript: input.transcript,
  });
  const template = participantView.template;
  const expectedDigest = participantView.canonicalTemplateDigestHex;
  const checks = emptyChecks();

  checks.sessionMatches = input.exchange.sessionIdHex === template.sessionIdHex
    && input.exchange.messages.every((message) => message.sessionIdHex === template.sessionIdHex);
  if (!checks.sessionMatches) {
    return rejection({
      participant: input.participant,
      sessionIdHex: input.exchange.sessionIdHex,
      templateDigestHex: expectedDigest,
      checks,
      rejectionReason: 'adaptor exchange session mismatch',
    });
  }

  checks.templateDigestMatches = input.exchange.templateDigestHex === expectedDigest
    && input.exchange.messages.every((message) => message.templateDigestHex === expectedDigest);
  if (!checks.templateDigestMatches) {
    return rejection({
      participant: input.participant,
      sessionIdHex: input.exchange.sessionIdHex,
      templateDigestHex: expectedDigest,
      checks,
      rejectionReason: 'adaptor exchange template digest mismatch',
    });
  }

  const plans = expectedSigningPlans(template);
  const packets = new Map<BilateralAdaptorNoncePurpose, {
    packet: BilateralAdaptorSignaturePacket;
    sender: BilateralRoleName;
  }>();
  for (const message of input.exchange.messages) {
    for (const packet of message.signatures) {
      const key = packetKey(packet);
      if (!plans[key] || packets.has(key)) {
        checks.noUnexpectedPurpose = false;
        return rejection({
          participant: input.participant,
          sessionIdHex: input.exchange.sessionIdHex,
          templateDigestHex: expectedDigest,
          checks,
          rejectionReason: 'unexpected or duplicate adaptor purpose',
        });
      }
      packets.set(key, { packet, sender: message.sender });
    }
  }

  checks.noUnexpectedPurpose = true;
  checks.allExpectedPurposesPresent = packets.size === 3
    && packets.has('parent_cet') && packets.has('bridge') && packets.has('child_cet');
  if (!checks.allExpectedPurposesPresent) {
    return rejection({
      participant: input.participant,
      sessionIdHex: input.exchange.sessionIdHex,
      templateDigestHex: expectedDigest,
      checks,
      rejectionReason: 'missing adaptor signature purpose',
    });
  }

  checks.senderBindingsMatch = true;
  checks.signerPublicKeysMatch = true;
  checks.sighashesMatch = true;
  checks.adaptorPointsMatch = true;
  checks.adaptedNonceBindingsMatch = true;
  checks.adaptorEquationsVerify = true;

  for (const purpose of ['parent_cet', 'bridge', 'child_cet'] as const) {
    const entry = packets.get(purpose);
    if (!entry) {
      throw new Error(`missing ${purpose} packet after presence check`);
    }
    const plan = plans[purpose];
    const packet = entry.packet;

    checks.senderBindingsMatch &&= entry.sender === plan.sender
      && packet.signerRole === plan.template.signerRole;
    checks.signerPublicKeysMatch &&= packet.signerPublicXOnlyHex === plan.signerPublicXOnlyHex
      && packet.signerPublicCompressedHex === plan.signerPublicCompressedHex;
    checks.sighashesMatch &&= packet.templateId === plan.template.id
      && packet.unsignedTxid === plan.template.unsignedTxid
      && packet.sighashHex === plan.template.sighashHex;
    checks.adaptorPointsMatch &&= packet.adaptorPointCompressedHex
      === plan.template.adaptorPointCompressedHex;

    let nonceBindingVerified = false;
    let equationVerified = false;
    try {
      nonceBindingVerified = verifyAdaptedNonceBinding(packet);
      equationVerified = verifyAdaptorEquation(packet);
    } catch {
      nonceBindingVerified = false;
      equationVerified = false;
    }
    checks.adaptedNonceBindingsMatch &&= nonceBindingVerified;
    checks.adaptorEquationsVerify &&= equationVerified;
  }

  checks.publicMessagesContainNoPrivateScalars = privateScalarDisclosureCheck(
    input.exchange.messages,
  );

  const firstFailed = Object.entries(checks).find(([, value]) => value === false)?.[0];
  if (firstFailed) {
    return rejection({
      participant: input.participant,
      sessionIdHex: input.exchange.sessionIdHex,
      templateDigestHex: expectedDigest,
      checks,
      rejectionReason: `adaptor exchange failed: ${firstFailed}`,
    });
  }

  return {
    kind: 'niti.l3.bilateral_adaptor_exchange_verification.v1',
    participant: input.participant,
    sessionIdHex: input.exchange.sessionIdHex,
    accepted: true,
    templateDigestHex: expectedDigest,
    verifiedPurposes: [...packets.keys()].sort(),
    checks,
  };
}

export function cloneAdaptorExchange(
  exchange: BilateralAdaptorExchange,
): BilateralAdaptorExchange {
  return JSON.parse(JSON.stringify(exchange)) as BilateralAdaptorExchange;
}
