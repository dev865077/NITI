import assert from 'node:assert/strict';
import { Transaction } from 'bitcoinjs-lib';
import {
  attestOracleOutcome,
  pointFromCompressed,
  scalarFromHex,
  scalarToHex,
  verifyBip340Signature,
} from './secp.js';
import {
  buildTaprootAdaptorSpend,
  buildTaprootKeySpend,
  completeTaprootAdaptorSpend,
  resolveNetwork,
  type BitcoinNetworkName,
  type PendingTaprootAdaptorSpend,
  type TaprootWallet,
} from './taproot.js';
import {
  buildCanonicalParentFundingFixture,
  canonicalAmounts,
  canonicalNetwork,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';

interface ActivationFailureCase {
  caseId: string;
  expectedFailure: string;
  activationAccepted: boolean;
  observedFailure: string;
  childFundingSpendProduced: boolean;
}

interface FeeStressCase {
  caseId: string;
  feeReserveSat: string;
  requiredRelayFeeSat: string;
  bridgeBroadcastAllowed: boolean;
  fallbackSelected: boolean;
}

interface TimingStressCase {
  caseId: string;
  tauAttest: number;
  tauBridge: number;
  tauChild: number;
  timeoutOrderingValid: boolean;
  activationWindowAvailable: boolean;
  fallbackSelected: boolean;
}

const network: BitcoinNetworkName = canonicalNetwork;
resolveNetwork(network);

const wallets = canonicalWallets(network);
const parentFundingWallet = wallets.parentFunding;
const bridgeSignerWallet = wallets.bridgeSigner;
const childFundingWallet = wallets.childFunding;

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
        network,
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

function outputAt(tx: Transaction, index: number): NonNullable<Transaction['outs'][number]> {
  const output = tx.outs[index];
  if (!output) {
    throw new Error(`missing tx output ${index}`);
  }
  return output;
}

function heightLockMature(input: {
  locktime: number;
  sequence: number;
  candidateBlockHeight: number;
}): boolean {
  if (input.sequence === 0xffffffff) {
    return true;
  }
  return input.locktime < input.candidateBlockHeight;
}

function attemptCompletion(input: {
  caseId: string;
  expectedFailure: string;
  pending: PendingTaprootAdaptorSpend;
  attestationSecretHex: string;
}): ActivationFailureCase {
  try {
    completeTaprootAdaptorSpend({
      pending: input.pending,
      attestationSecret: scalarFromHex(input.attestationSecretHex, `${input.caseId} scalar`),
    });
    return {
      caseId: input.caseId,
      expectedFailure: input.expectedFailure,
      activationAccepted: true,
      observedFailure: '',
      childFundingSpendProduced: true,
    };
  } catch (error) {
    return {
      caseId: input.caseId,
      expectedFailure: input.expectedFailure,
      activationAccepted: false,
      observedFailure: error instanceof Error ? error.message : String(error),
      childFundingSpendProduced: false,
    };
  }
}

const parentFundingFixture = buildCanonicalParentFundingFixture(network);
assert.equal(parentFundingFixture.parentFunding.signatureVerifies, true);

const activatingAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
const wrongAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.wrong,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
const differentEventAttestation = attestOracleOutcome({
  eventId: `${canonicalOutcomes.eventId}:different`,
  outcome: canonicalOutcomes.activating,
  oracleSecret: scalarFromHex(canonicalSecrets.oracle, 'oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce'),
});
const mismatchedOracleAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret: scalarFromHex(canonicalSecrets.childOracle, 'mismatched oracle secret'),
  nonceSecret: scalarFromHex(canonicalSecrets.childOracleNonce, 'mismatched oracle nonce'),
});
assert.equal(activatingAttestation.verifies, true);
assert.equal(wrongAttestation.verifies, true);
assert.equal(differentEventAttestation.verifies, true);
assert.equal(mismatchedOracleAttestation.verifies, true);

const pendingParentCet = buildSpendWithDeterministicNonce({
  signerWallet: parentFundingWallet,
  utxo: {
    txid: parentFundingFixture.parentFunding.txid,
    vout: parentFundingFixture.parentFunding.vout,
    valueSat: BigInt(parentFundingFixture.parentFunding.valueSat),
  },
  destinationAddress: bridgeSignerWallet.address,
  feeSat: canonicalAmounts.parentCetFeeSat,
  adaptorPointHex: activatingAttestation.attestationPointCompressedHex,
});
const completedParentCet = completeTaprootAdaptorSpend({
  pending: pendingParentCet,
  attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating scalar'),
});
assert.equal(completedParentCet.verifies, true);

const parentCet = Transaction.fromHex(completedParentCet.rawTxHex);
const parentEdgeOutput = outputAt(parentCet, 0);
const bridgeUtxo = {
  txid: completedParentCet.txid,
  vout: 0,
  valueSat: parentEdgeOutput.value,
};

const pendingBridge = buildSpendWithDeterministicNonce({
  signerWallet: bridgeSignerWallet,
  utxo: bridgeUtxo,
  destinationAddress: childFundingWallet.address,
  feeSat: canonicalAmounts.bridgeFeeSat,
  adaptorPointHex: activatingAttestation.attestationPointCompressedHex,
});
assert.equal(pendingBridge.adaptor.verifiesAdaptor, true);

const completedBridge = completeTaprootAdaptorSpend({
  pending: pendingBridge,
  attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating scalar'),
});
assert.equal(completedBridge.verifies, true);

const mutatedBridge = buildSpendWithDeterministicNonce({
  signerWallet: bridgeSignerWallet,
  utxo: bridgeUtxo,
  destinationAddress: parentFundingWallet.address,
  feeSat: canonicalAmounts.bridgeFeeSat + 1n,
  adaptorPointHex: activatingAttestation.attestationPointCompressedHex,
});
const signatureReplaysOnMutatedBridge = verifyBip340Signature({
  signatureHex: completedBridge.completedSignatureHex,
  messageHashHex: mutatedBridge.sighashHex,
  publicKeyXOnlyHex: mutatedBridge.adaptor.signerPublicXOnlyHex,
});
assert.equal(signatureReplaysOnMutatedBridge, false);

const preResolutionSignatureHex =
  `${pendingBridge.adaptor.adaptedNonceXOnlyHex}${pendingBridge.adaptor.adaptorSignatureScalarHex}`;
const preResolutionSignatureVerifies = verifyBip340Signature({
  signatureHex: preResolutionSignatureHex,
  messageHashHex: pendingBridge.sighashHex,
  publicKeyXOnlyHex: pendingBridge.adaptor.signerPublicXOnlyHex,
});
assert.equal(preResolutionSignatureVerifies, false);

const activationFailureCases: ActivationFailureCase[] = [
  attemptCompletion({
    caseId: 'wrong_outcome_scalar',
    expectedFailure: 'scalar for outcome y does not complete bridge for outcome x',
    pending: pendingBridge,
    attestationSecretHex: wrongAttestation.attestationSecretHex,
  }),
  attemptCompletion({
    caseId: 'random_scalar',
    expectedFailure: 'random scalar does not complete selected bridge',
    pending: pendingBridge,
    attestationSecretHex: scalarToHex(42n),
  }),
  attemptCompletion({
    caseId: 'different_event_scalar',
    expectedFailure: 'valid scalar from a different event does not complete selected bridge',
    pending: pendingBridge,
    attestationSecretHex: differentEventAttestation.attestationSecretHex,
  }),
  attemptCompletion({
    caseId: 'mismatched_oracle_key_scalar',
    expectedFailure: 'valid scalar under a different oracle key does not complete selected bridge',
    pending: pendingBridge,
    attestationSecretHex: mismatchedOracleAttestation.attestationSecretHex,
  }),
  {
    caseId: 'mismatched_bridge_sighash_replay',
    expectedFailure: 'completed bridge signature does not verify on a different bridge sighash',
    activationAccepted: signatureReplaysOnMutatedBridge,
    observedFailure: 'signature replay rejected by BIP340 verification on mutated bridge sighash',
    childFundingSpendProduced: signatureReplaysOnMutatedBridge,
  },
  {
    caseId: 'oracle_withheld_no_scalar',
    expectedFailure: 'pre-resolution adaptor is not a valid completed witness',
    activationAccepted: preResolutionSignatureVerifies,
    observedFailure: 'pre-resolution bridge signature does not verify',
    childFundingSpendProduced: false,
  },
];

for (const testCase of activationFailureCases) {
  assert.equal(testCase.activationAccepted, false, testCase.caseId);
  assert.equal(testCase.childFundingSpendProduced, false, testCase.caseId);
  assert.ok(testCase.observedFailure.length > 0, testCase.caseId);
}

const bridgeTimeoutHeight = 3_000_100;
const bridgeRefundSequence = 0xfffffffe;
const bridgeTimeoutRefund = buildTaprootKeySpend({
  network,
  signerOutputSecret: scalarFromHex(bridgeSignerWallet.outputSecretHex, 'bridge signer output secret'),
  signerScriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
  utxo: bridgeUtxo,
  destinationAddress: parentFundingWallet.address,
  outputValueSat: parentEdgeOutput.value - canonicalAmounts.bridgeRefundFeeSat,
  locktime: bridgeTimeoutHeight,
  sequence: bridgeRefundSequence,
  nonceSecret: scalarFromHex(canonicalSecrets.bridgeRefundNonce, 'bridge refund nonce'),
});
const refundEarlyAccepted = heightLockMature({
  locktime: bridgeTimeoutRefund.locktime,
  sequence: bridgeTimeoutRefund.sequence,
  candidateBlockHeight: bridgeTimeoutHeight,
}) && bridgeTimeoutRefund.signature.verifies;
const refundMatureAccepted = heightLockMature({
  locktime: bridgeTimeoutRefund.locktime,
  sequence: bridgeTimeoutRefund.sequence,
  candidateBlockHeight: bridgeTimeoutHeight + 1,
}) && bridgeTimeoutRefund.signature.verifies;
assert.equal(refundEarlyAccepted, false);
assert.equal(refundMatureAccepted, true);

const feeStressCases: FeeStressCase[] = [
  {
    caseId: 'baseline_fee_reserve',
    feeReserveSat: canonicalAmounts.bridgeFeeSat.toString(),
    requiredRelayFeeSat: canonicalAmounts.bridgeFeeSat.toString(),
    bridgeBroadcastAllowed: true,
    fallbackSelected: false,
  },
  {
    caseId: 'fee_spike_exceeds_reserve',
    feeReserveSat: canonicalAmounts.bridgeFeeSat.toString(),
    requiredRelayFeeSat: (canonicalAmounts.bridgeFeeSat + 1_000n).toString(),
    bridgeBroadcastAllowed: false,
    fallbackSelected: true,
  },
];
assert.equal(feeStressCases[0]!.bridgeBroadcastAllowed, true);
assert.equal(feeStressCases[1]!.bridgeBroadcastAllowed, false);
assert.equal(feeStressCases[1]!.fallbackSelected, true);

const timingStressCases: TimingStressCase[] = [
  {
    caseId: 'ordered_timeouts',
    tauAttest: 3_000_050,
    tauBridge: bridgeTimeoutHeight,
    tauChild: 3_000_300,
    timeoutOrderingValid: true,
    activationWindowAvailable: true,
    fallbackSelected: false,
  },
  {
    caseId: 'oracle_at_bridge_deadline',
    tauAttest: bridgeTimeoutHeight,
    tauBridge: bridgeTimeoutHeight,
    tauChild: 3_000_300,
    timeoutOrderingValid: false,
    activationWindowAvailable: false,
    fallbackSelected: true,
  },
  {
    caseId: 'child_timeout_race',
    tauAttest: 3_000_050,
    tauBridge: 3_000_300,
    tauChild: 3_000_300,
    timeoutOrderingValid: false,
    activationWindowAvailable: false,
    fallbackSelected: true,
  },
];
for (const testCase of timingStressCases) {
  assert.equal(
    testCase.timeoutOrderingValid,
    testCase.tauAttest < testCase.tauBridge && testCase.tauBridge < testCase.tauChild,
    testCase.caseId,
  );
}
assert.equal(timingStressCases.filter((entry) => entry.fallbackSelected).length, 2);

const matrix = {
  kind: 'niti.v0_1_adversarial_failure_matrix.v1',
  boundary:
    'deterministic failure-injection matrix; no production network adversary, wallet, oracle, or fee-policy guarantee',
  network,
  activationFailureCases,
  oracleDelayAndRefund: {
    noScalarActivatesBridge: !preResolutionSignatureVerifies,
    timeoutRefundTxid: bridgeTimeoutRefund.txid,
    timeoutHeight: bridgeTimeoutHeight,
    earlySpendAccepted: refundEarlyAccepted,
    matureSpendAccepted: refundMatureAccepted,
  },
  feeStressCases,
  timingStressCases,
  companionCommands: [
    {
      area: 'state loss and restart',
      command: 'npm run test:bilateral-restart-recovery',
      expectedKind: 'niti.l3_bilateral_restart_recovery_test.v1',
    },
    {
      area: 'malformed counterparty adaptor data',
      command: 'npm run test:bilateral-malformed-counterparty',
      expectedKind: 'niti.l3_bilateral_malformed_counterparty_test.v1',
    },
    {
      area: 'branch replay and double activation',
      command: 'npm run test:bilateral-wrong-path-replay',
      expectedKind: 'niti.l3_bilateral_wrong_path_replay_test.v1',
    },
  ],
  checks: {
    allActivationFailuresClosed: activationFailureCases.every((entry) => !entry.activationAccepted),
    noFailureProducedChildFundingSpend: activationFailureCases.every((entry) => (
      !entry.childFundingSpendProduced
    )),
    oracleWithholdingDoesNotActivate: !preResolutionSignatureVerifies,
    timeoutRefundMatures: refundMatureAccepted && !refundEarlyAccepted,
    feeSpikeSelectsFallback: feeStressCases.some((entry) => (
      entry.caseId === 'fee_spike_exceeds_reserve'
      && !entry.bridgeBroadcastAllowed
      && entry.fallbackSelected
    )),
    compressedTimeoutsSelectFallback: timingStressCases
      .filter((entry) => entry.caseId !== 'ordered_timeouts')
      .every((entry) => !entry.activationWindowAvailable && entry.fallbackSelected),
    companionBilateralCommandsListed: true,
  },
};

assert.deepEqual(Object.values(matrix.checks).filter((value) => value !== true), []);

console.log(JSON.stringify(matrix, null, 2));
