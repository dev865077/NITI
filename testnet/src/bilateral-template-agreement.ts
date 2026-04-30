import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';
import {
  canonicalJson,
  validateBilateralSetupTranscript,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import type { BilateralRoleName } from './bilateral-roles.js';
import {
  attestOracleOutcome,
  pointFromCompressed,
  prepareOracleOutcome,
  scalarFromHex,
  sha256Text,
} from './secp.js';
import {
  buildCanonicalParentFundingFixture,
  canonicalAmounts,
  canonicalNetwork,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';
import {
  buildTaprootAdaptorSpend,
  buildTaprootKeySpend,
  conservativeTaprootDustFloorSat,
  type PendingTaprootAdaptorSpend,
  type TaprootWallet,
} from './taproot.js';

export interface BilateralTemplateOutpoint {
  txid: string;
  vout: number;
  valueSat: string;
  scriptPubKeyHex: string;
}

export interface BilateralTemplateOutput {
  vout: number;
  valueSat: string;
  scriptPubKeyHex: string;
  role: string;
}

export interface BilateralAdaptorTemplate {
  id: string;
  unsignedTxid: string;
  unsignedTxHex: string;
  sighashHex: string;
  input: BilateralTemplateOutpoint;
  output: BilateralTemplateOutput;
  feeSat: string;
  inputRole: string;
  outputRole: string;
  signerRole: BilateralRoleName;
  adaptorPointCompressedHex: string;
  dustCheckPasses: boolean;
}

export interface BilateralRefundTemplate {
  id: string;
  unsignedTxid: string;
  unsignedTxHex: string;
  sighashHex: string;
  input: BilateralTemplateOutpoint;
  output: BilateralTemplateOutput;
  feeSat: string;
  signerRole: BilateralRoleName;
  locktime: number;
  sequence: number;
  dustCheckPasses: boolean;
}

export interface BilateralTransactionTemplateAgreement {
  kind: 'niti.l3.bilateral_transaction_template_agreement.v1';
  network: typeof canonicalNetwork;
  sessionIdHex: string;
  parentFundingOutpoint: BilateralTemplateOutpoint;
  parentCet: BilateralAdaptorTemplate;
  bridge: BilateralAdaptorTemplate;
  childFundingOutput: BilateralTemplateOutput;
  childCet: BilateralAdaptorTemplate;
  edgeTimeoutRefund: BilateralRefundTemplate;
  childTimeoutRefund: BilateralRefundTemplate;
  timelocks: {
    parentRefundHeight: number;
    bridgeTimeoutHeight: number;
    childRefundHeight: number;
    ordered: boolean;
  };
}

export interface BilateralTemplateParticipantView {
  participant: BilateralRoleName;
  sessionIdHex: string;
  canonicalTemplateDigestHex: string;
  template: BilateralTransactionTemplateAgreement;
}

export interface BilateralTemplateComparison {
  kind: 'niti.l3.bilateral_template_comparison.v1';
  sessionIdHex: string;
  accepted: boolean;
  canonicalTemplateDigestHex: string;
  participants: BilateralRoleName[];
  rejectionReason?: string;
}

export interface BilateralTemplateMutationResult {
  name: string;
  accepted: boolean;
  rejectionReason: string;
}

function outputAt(tx: Transaction, index: number): NonNullable<Transaction['outs'][number]> {
  const output = tx.outs[index];
  if (!output) {
    throw new Error(`missing tx output ${index}`);
  }
  return output;
}

function buildSpendWithDeterministicNonce(input: {
  signerWallet: TaprootWallet;
  utxo: {
    txid: string;
    vout: number;
    valueSat: bigint;
  };
  destinationAddress: string;
  feeSat: bigint;
  adaptorPointHex: string;
}): PendingTaprootAdaptorSpend {
  for (let i = 1; i <= 256; i += 1) {
    const nonceHex = i.toString(16).padStart(64, '0');
    try {
      return buildTaprootAdaptorSpend({
        network: canonicalNetwork,
        signerOutputSecret: scalarFromHex(input.signerWallet.outputSecretHex, 'signer output secret'),
        signerScriptPubKeyHex: input.signerWallet.scriptPubKeyHex,
        utxo: input.utxo,
        destinationAddress: input.destinationAddress,
        feeSat: input.feeSat,
        adaptorPoint: pointFromCompressed(input.adaptorPointHex),
        adaptorNonceSecret: scalarFromHex(nonceHex, 'adaptor nonce'),
      });
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
  throw new Error('could not find deterministic adaptor nonce fixture');
}

function digestTemplate(template: BilateralTransactionTemplateAgreement): string {
  return bytesToHex(sha256Text(canonicalJson(template)));
}

function adaptorTemplate(input: {
  id: string;
  pending: PendingTaprootAdaptorSpend;
  output: BilateralTemplateOutput;
  inputRole: string;
  outputRole: string;
  signerRole: BilateralRoleName;
}): BilateralAdaptorTemplate {
  return {
    id: input.id,
    unsignedTxid: input.pending.txidNoWitness,
    unsignedTxHex: input.pending.unsignedTxHex,
    sighashHex: input.pending.sighashHex,
    input: input.pending.input,
    output: input.output,
    feeSat: input.pending.feeSat,
    inputRole: input.inputRole,
    outputRole: input.outputRole,
    signerRole: input.signerRole,
    adaptorPointCompressedHex: input.pending.adaptor.adaptorPointCompressedHex,
    dustCheckPasses: BigInt(input.output.valueSat) >= conservativeTaprootDustFloorSat,
  };
}

function refundTemplate(input: {
  id: string;
  spend: ReturnType<typeof buildTaprootKeySpend>;
  outputRole: string;
  signerRole: BilateralRoleName;
}): BilateralRefundTemplate {
  return {
    id: input.id,
    unsignedTxid: input.spend.txidNoWitness,
    unsignedTxHex: input.spend.unsignedTxHex,
    sighashHex: input.spend.sighashHex,
    input: input.spend.input,
    output: {
      ...input.spend.output,
      role: input.outputRole,
    },
    feeSat: input.spend.feeSat,
    signerRole: input.signerRole,
    locktime: input.spend.locktime,
    sequence: input.spend.sequence,
    dustCheckPasses: BigInt(input.spend.output.valueSat) >= conservativeTaprootDustFloorSat,
  };
}

function validateTemplate(template: BilateralTransactionTemplateAgreement): void {
  if (template.parentCet.input.txid !== template.parentFundingOutpoint.txid) {
    throw new Error('parent CET input must spend the parent funding outpoint');
  }
  if (template.bridge.input.txid !== template.parentCet.unsignedTxid) {
    throw new Error('bridge input must spend the parent CET output');
  }
  if (template.childFundingOutput.valueSat !== template.bridge.output.valueSat) {
    throw new Error('child funding output must match bridge output value');
  }
  if (template.childCet.input.txid !== template.bridge.unsignedTxid) {
    throw new Error('child CET input must spend the bridge output');
  }
  if (template.edgeTimeoutRefund.input.txid !== template.parentCet.unsignedTxid) {
    throw new Error('edge timeout refund must spend the parent CET output');
  }
  if (template.childTimeoutRefund.input.txid !== template.bridge.unsignedTxid) {
    throw new Error('child timeout refund must spend the bridge output');
  }
  if (!template.parentCet.dustCheckPasses || !template.bridge.dustCheckPasses
    || !template.childCet.dustCheckPasses || !template.edgeTimeoutRefund.dustCheckPasses
    || !template.childTimeoutRefund.dustCheckPasses) {
    throw new Error('template output below conservative dust floor');
  }
  if (!template.timelocks.ordered) {
    throw new Error('template timelocks are not ordered');
  }
}

export function buildCanonicalBilateralTemplateAgreement(
  transcript: BilateralSetupTranscript,
): BilateralTransactionTemplateAgreement {
  const validatedTranscript = validateBilateralSetupTranscript(transcript);
  const wallets = canonicalWallets(canonicalNetwork);
  const parentFundingFixture = buildCanonicalParentFundingFixture(canonicalNetwork);
  const activatingPrepared = prepareOracleOutcome({
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

  const parentCet = buildSpendWithDeterministicNonce({
    signerWallet: wallets.parentFunding,
    utxo: {
      txid: parentFundingFixture.parentFunding.txid,
      vout: parentFundingFixture.parentFunding.vout,
      valueSat: BigInt(parentFundingFixture.parentFunding.valueSat),
    },
    destinationAddress: wallets.bridgeSigner.address,
    feeSat: canonicalAmounts.parentCetFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const parentCetTx = Transaction.fromHex(parentCet.unsignedTxHex);
  const parentEdgeOutput = outputAt(parentCetTx, 0);

  const bridge = buildSpendWithDeterministicNonce({
    signerWallet: wallets.bridgeSigner,
    utxo: {
      txid: parentCet.txidNoWitness,
      vout: 0,
      valueSat: parentEdgeOutput.value,
    },
    destinationAddress: wallets.childFunding.address,
    feeSat: canonicalAmounts.bridgeFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const bridgeTx = Transaction.fromHex(bridge.unsignedTxHex);
  const childFundingOutput = outputAt(bridgeTx, 0);

  const childCet = buildSpendWithDeterministicNonce({
    signerWallet: wallets.childFunding,
    utxo: {
      txid: bridge.txidNoWitness,
      vout: 0,
      valueSat: childFundingOutput.value,
    },
    destinationAddress: wallets.parentFunding.address,
    feeSat: canonicalAmounts.childCetFeeSat,
    adaptorPointHex: childPrepared.attestationPointCompressedHex,
  });

  const bridgeTimeoutHeight = 3_000_100;
  const childRefundHeight = 3_000_300;
  const refundSequence = 0xfffffffe;
  const edgeTimeoutRefund = buildTaprootKeySpend({
    network: canonicalNetwork,
    signerOutputSecret: scalarFromHex(wallets.bridgeSigner.outputSecretHex, 'bridge signer output secret'),
    signerScriptPubKeyHex: wallets.bridgeSigner.scriptPubKeyHex,
    utxo: {
      txid: parentCet.txidNoWitness,
      vout: 0,
      valueSat: parentEdgeOutput.value,
    },
    destinationAddress: wallets.parentFunding.address,
    outputValueSat: parentEdgeOutput.value - canonicalAmounts.bridgeRefundFeeSat,
    locktime: bridgeTimeoutHeight,
    sequence: refundSequence,
    nonceSecret: scalarFromHex(canonicalSecrets.bridgeRefundNonce, 'bridge refund nonce'),
  });
  const childTimeoutRefund = buildTaprootKeySpend({
    network: canonicalNetwork,
    signerOutputSecret: scalarFromHex(wallets.childFunding.outputSecretHex, 'child funding output secret'),
    signerScriptPubKeyHex: wallets.childFunding.scriptPubKeyHex,
    utxo: {
      txid: bridge.txidNoWitness,
      vout: 0,
      valueSat: childFundingOutput.value,
    },
    destinationAddress: wallets.childFunding.address,
    outputValueSat: childFundingOutput.value - canonicalAmounts.childRefundFeeSat,
    locktime: childRefundHeight,
    sequence: refundSequence,
    nonceSecret: scalarFromHex(canonicalSecrets.childRefundNonce, 'child refund nonce'),
  });
  const childCetTx = Transaction.fromHex(childCet.unsignedTxHex);
  const childSettlementOutput = outputAt(childCetTx, 0);

  const template: BilateralTransactionTemplateAgreement = {
    kind: 'niti.l3.bilateral_transaction_template_agreement.v1',
    network: canonicalNetwork,
    sessionIdHex: validatedTranscript.sessionIdHex,
    parentFundingOutpoint: {
      txid: parentFundingFixture.parentFunding.txid,
      vout: parentFundingFixture.parentFunding.vout,
      valueSat: parentFundingFixture.parentFunding.valueSat,
      scriptPubKeyHex: parentFundingFixture.parentFunding.scriptPubKeyHex,
    },
    parentCet: adaptorTemplate({
      id: 'parent-cet-activating',
      pending: parentCet,
      output: {
        vout: 0,
        valueSat: parentEdgeOutput.value.toString(),
        scriptPubKeyHex: bytesToHex(parentEdgeOutput.script),
        role: 'parent_edge',
      },
      inputRole: 'parent_funding',
      outputRole: 'parent_edge',
      signerRole: 'alice',
    }),
    bridge: adaptorTemplate({
      id: 'parent-to-child-bridge',
      pending: bridge,
      output: {
        vout: 0,
        valueSat: childFundingOutput.value.toString(),
        scriptPubKeyHex: bytesToHex(childFundingOutput.script),
        role: 'child_funding',
      },
      inputRole: 'parent_edge',
      outputRole: 'child_funding',
      signerRole: 'bob',
    }),
    childFundingOutput: {
      vout: 0,
      valueSat: childFundingOutput.value.toString(),
      scriptPubKeyHex: bytesToHex(childFundingOutput.script),
      role: 'child_funding',
    },
    childCet: adaptorTemplate({
      id: 'child-cet-activating',
      pending: childCet,
      output: {
        vout: 0,
        valueSat: childCet.sendValueSat,
        scriptPubKeyHex: bytesToHex(childSettlementOutput.script),
        role: 'child_settlement',
      },
      inputRole: 'child_funding',
      outputRole: 'child_settlement',
      signerRole: 'bob',
    }),
    edgeTimeoutRefund: refundTemplate({
      id: 'edge-timeout-refund',
      spend: edgeTimeoutRefund,
      outputRole: 'parent_refund',
      signerRole: 'bob',
    }),
    childTimeoutRefund: refundTemplate({
      id: 'child-timeout-refund',
      spend: childTimeoutRefund,
      outputRole: 'child_refund',
      signerRole: 'bob',
    }),
    timelocks: {
      parentRefundHeight: 3_000_000,
      bridgeTimeoutHeight,
      childRefundHeight,
      ordered: 3_000_000 < bridgeTimeoutHeight && bridgeTimeoutHeight < childRefundHeight,
    },
  };
  validateTemplate(template);
  const attestation = attestOracleOutcome({
    eventId: canonicalOutcomes.eventId,
    outcome: canonicalOutcomes.activating,
    oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
    nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
  });
  if (template.parentCet.adaptorPointCompressedHex !== attestation.attestationPointCompressedHex) {
    throw new Error('parent CET adaptor point must match oracle attestation point');
  }
  if (template.bridge.adaptorPointCompressedHex !== attestation.attestationPointCompressedHex) {
    throw new Error('bridge adaptor point must match oracle attestation point');
  }
  return template;
}

export function deriveBilateralTemplateParticipantView(input: {
  participant: BilateralRoleName;
  transcript: BilateralSetupTranscript;
}): BilateralTemplateParticipantView {
  const template = buildCanonicalBilateralTemplateAgreement(input.transcript);
  return {
    participant: input.participant,
    sessionIdHex: template.sessionIdHex,
    canonicalTemplateDigestHex: digestTemplate(template),
    template,
  };
}

export function compareBilateralTemplateViews(
  views: readonly BilateralTemplateParticipantView[],
): BilateralTemplateComparison {
  if (views.length !== 2) {
    throw new Error('template comparison requires exactly two participant views');
  }
  const [first, second] = views;
  if (!first || !second) {
    throw new Error('template comparison requires two participant views');
  }
  const participants = views.map((view) => view.participant).sort();
  if (participants[0] !== 'alice' || participants[1] !== 'bob') {
    throw new Error('template comparison requires alice and bob');
  }
  if (first.sessionIdHex !== second.sessionIdHex) {
    return {
      kind: 'niti.l3.bilateral_template_comparison.v1',
      sessionIdHex: first.sessionIdHex,
      accepted: false,
      canonicalTemplateDigestHex: first.canonicalTemplateDigestHex,
      participants,
      rejectionReason: 'template session id mismatch',
    };
  }
  if (first.canonicalTemplateDigestHex !== second.canonicalTemplateDigestHex) {
    return {
      kind: 'niti.l3.bilateral_template_comparison.v1',
      sessionIdHex: first.sessionIdHex,
      accepted: false,
      canonicalTemplateDigestHex: first.canonicalTemplateDigestHex,
      participants,
      rejectionReason: 'template digest mismatch',
    };
  }
  return {
    kind: 'niti.l3.bilateral_template_comparison.v1',
    sessionIdHex: first.sessionIdHex,
    accepted: true,
    canonicalTemplateDigestHex: first.canonicalTemplateDigestHex,
    participants,
  };
}

export function rejectIfTemplateDigestChanged(input: {
  name: string;
  expected: BilateralTemplateParticipantView;
  candidate: BilateralTemplateParticipantView;
}): BilateralTemplateMutationResult {
  if (input.expected.canonicalTemplateDigestHex === input.candidate.canonicalTemplateDigestHex) {
    return {
      name: input.name,
      accepted: true,
      rejectionReason: '',
    };
  }
  return {
    name: input.name,
    accepted: false,
    rejectionReason: `${input.name} template digest mismatch`,
  };
}

export function cloneTemplate(
  template: BilateralTransactionTemplateAgreement,
): BilateralTransactionTemplateAgreement {
  return JSON.parse(JSON.stringify(template)) as BilateralTransactionTemplateAgreement;
}

export function participantViewFromTemplate(input: {
  participant: BilateralRoleName;
  template: BilateralTransactionTemplateAgreement;
}): BilateralTemplateParticipantView {
  validateTemplate(input.template);
  return {
    participant: input.participant,
    sessionIdHex: input.template.sessionIdHex,
    canonicalTemplateDigestHex: digestTemplate(input.template),
    template: input.template,
  };
}
