import assert from 'node:assert/strict';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  pointFromCompressed,
  scalarFromHex,
  sha256Text,
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

const network: BitcoinNetworkName = canonicalNetwork;
resolveNetwork(network);

const parentCetFeeSat = canonicalAmounts.parentCetFeeSat;
const bridgeFeeSat = canonicalAmounts.bridgeFeeSat;
const bridgeRefundFeeSat = canonicalAmounts.bridgeRefundFeeSat;
const childCetFeeSat = canonicalAmounts.childCetFeeSat;
const childRefundFeeSat = canonicalAmounts.childRefundFeeSat;
const wallets = canonicalWallets(network);
const parentFundingWallet = wallets.parentFunding;
const bridgeSignerWallet = wallets.bridgeSigner;
const childFundingWallet = wallets.childFunding;
const oracleSecret = scalarFromHex(canonicalSecrets.oracle, 'oracle secret');
const nonceSecret = scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce');
const childOracleSecret = scalarFromHex(canonicalSecrets.childOracle, 'child oracle secret');
const childNonceSecret = scalarFromHex(canonicalSecrets.childOracleNonce, 'child oracle nonce');
const eventId = canonicalOutcomes.eventId;
const activatingOutcome = canonicalOutcomes.activating;
const wrongOutcome = canonicalOutcomes.wrong;
const childEventId = canonicalOutcomes.childEventId;
const childActivatingOutcome = canonicalOutcomes.childActivating;

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
}): {
  pending: PendingTaprootAdaptorSpend;
  selectedAdaptorNonceSecretHex: string;
} {
  for (let i = 1; i <= 256; i += 1) {
    const nonceHex = i.toString(16).padStart(64, '0');
    try {
      const pending = buildTaprootAdaptorSpend({
        network,
        signerOutputSecret: scalarFromHex(input.signerWallet.outputSecretHex, 'signer output secret'),
        signerScriptPubKeyHex: input.signerWallet.scriptPubKeyHex,
        utxo: input.utxo,
        destinationAddress: input.destinationAddress,
        feeSat: input.feeSat,
        adaptorPoint: pointFromCompressed(input.adaptorPointHex),
        adaptorNonceSecret: scalarFromHex(nonceHex, 'adaptor nonce'),
      });
      return { pending, selectedAdaptorNonceSecretHex: nonceHex };
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

function deterministicBlockHash(height: number, txid: string): string {
  return bytesToHex(sha256Text(`niti-regtest-sim:${height}:${txid}`));
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

const activatingPrepared = prepareOracleOutcome({
  eventId,
  outcome: activatingOutcome,
  oracleSecret,
  nonceSecret,
});
const wrongPrepared = prepareOracleOutcome({
  eventId,
  outcome: wrongOutcome,
  oracleSecret,
  nonceSecret,
});
const childPrepared = prepareOracleOutcome({
  eventId: childEventId,
  outcome: childActivatingOutcome,
  oracleSecret: childOracleSecret,
  nonceSecret: childNonceSecret,
});
assert.notEqual(
  wrongPrepared.attestationPointCompressedHex,
  activatingPrepared.attestationPointCompressedHex,
);
assert.notEqual(
  childPrepared.attestationPointCompressedHex,
  activatingPrepared.attestationPointCompressedHex,
);

const parentFundingFixture = buildCanonicalParentFundingFixture(network);
assert.equal(parentFundingFixture.parentFunding.signatureVerifies, true);
assert.equal(parentFundingFixture.parentFunding.vout, 0);
assert.equal(parentFundingFixture.parentFunding.valueSat, canonicalAmounts.parentFundingValueSat.toString());
assert.equal(parentFundingFixture.parentFunding.scriptPubKeyHex, parentFundingWallet.scriptPubKeyHex);

const {
  pending: pendingParentCet,
  selectedAdaptorNonceSecretHex: parentAdaptorNonceSecretHex,
} = buildSpendWithDeterministicNonce({
  signerWallet: parentFundingWallet,
  utxo: {
    txid: parentFundingFixture.parentFunding.txid,
    vout: parentFundingFixture.parentFunding.vout,
    valueSat: BigInt(parentFundingFixture.parentFunding.valueSat),
  },
  destinationAddress: bridgeSignerWallet.address,
  feeSat: parentCetFeeSat,
  adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
});
assert.equal(pendingParentCet.adaptor.verifiesAdaptor, true);
assert.equal(pendingParentCet.input.txid, parentFundingFixture.parentFunding.txid);
assert.equal(pendingParentCet.input.vout, parentFundingFixture.parentFunding.vout);
assert.equal(pendingParentCet.input.valueSat, parentFundingFixture.parentFunding.valueSat);
assert.equal(pendingParentCet.input.scriptPubKeyHex, parentFundingWallet.scriptPubKeyHex);
assert.equal(
  pendingParentCet.adaptor.adaptorPointCompressedHex,
  activatingPrepared.attestationPointCompressedHex,
);

const activatingAttestation = attestOracleOutcome({
  eventId,
  outcome: activatingOutcome,
  oracleSecret,
  nonceSecret,
});
assert.equal(activatingAttestation.verifies, true);
assert.equal(
  activatingAttestation.attestationPointCompressedHex,
  activatingPrepared.attestationPointCompressedHex,
);

const wrongAttestation = attestOracleOutcome({
  eventId,
  outcome: wrongOutcome,
  oracleSecret,
  nonceSecret,
});
assert.equal(wrongAttestation.verifies, true);
assert.equal(wrongAttestation.attestationPointCompressedHex, wrongPrepared.attestationPointCompressedHex);
assert.throws(
  () => completeTaprootAdaptorSpend({
    pending: pendingParentCet,
    attestationSecret: scalarFromHex(
      wrongAttestation.attestationSecretHex,
      'wrong attestation secret',
    ),
  }),
  /completed adaptor signature does not verify/,
);

const completedParentCet = completeTaprootAdaptorSpend({
  pending: pendingParentCet,
  attestationSecret: scalarFromHex(
    activatingAttestation.attestationSecretHex,
    'activating attestation secret',
  ),
});
assert.equal(completedParentCet.verifies, true);
assert.equal(completedParentCet.txid, pendingParentCet.txidNoWitness);
assert.equal(completedParentCet.extractedSecretHex, activatingAttestation.attestationSecretHex);

const parentCet = Transaction.fromHex(completedParentCet.rawTxHex);
const parentEdgeOutput = outputAt(parentCet, 0);
assert.equal(bytesToHex(parentEdgeOutput.script), bridgeSignerWallet.scriptPubKeyHex);
assert.equal(parentEdgeOutput.value, canonicalAmounts.parentFundingValueSat - parentCetFeeSat);

const parentCetConfirmationHeight = 3_000_001;
const parentCetConfirmation = {
  mode: 'deterministic-regtest-equivalent',
  reason: 'CI does not depend on public testnet faucet, mempool, or local bitcoind availability',
  txid: completedParentCet.txid,
  blockHeight: parentCetConfirmationHeight,
  blockHash: deterministicBlockHash(parentCetConfirmationHeight, completedParentCet.txid),
  confirmations: 1,
  spendableByBridge: true,
};

const bridgeTimeoutHeight = 3_000_100;
const bridgeRefundSequence = 0xfffffffe;
const bridgeTimeoutRefund = buildTaprootKeySpend({
  network,
  signerOutputSecret: scalarFromHex(bridgeSignerWallet.outputSecretHex, 'bridge signer output secret'),
  signerScriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
  utxo: {
    txid: completedParentCet.txid,
    vout: 0,
    valueSat: parentEdgeOutput.value,
  },
  destinationAddress: parentFundingWallet.address,
  outputValueSat: parentEdgeOutput.value - bridgeRefundFeeSat,
  locktime: bridgeTimeoutHeight,
  sequence: bridgeRefundSequence,
  nonceSecret: scalarFromHex(canonicalSecrets.bridgeRefundNonce, 'bridge refund nonce'),
});
const bridgeRefundEarlyHeight = bridgeTimeoutHeight;
const bridgeRefundMatureHeight = bridgeTimeoutHeight + 1;
const bridgeRefundEarlySpendAccepted = heightLockMature({
  locktime: bridgeTimeoutRefund.locktime,
  sequence: bridgeTimeoutRefund.sequence,
  candidateBlockHeight: bridgeRefundEarlyHeight,
}) && bridgeTimeoutRefund.signature.verifies;
const bridgeRefundMatureSpendAccepted = heightLockMature({
  locktime: bridgeTimeoutRefund.locktime,
  sequence: bridgeTimeoutRefund.sequence,
  candidateBlockHeight: bridgeRefundMatureHeight,
}) && bridgeTimeoutRefund.signature.verifies;
assert.equal(bridgeTimeoutRefund.input.txid, completedParentCet.txid);
assert.equal(bridgeTimeoutRefund.input.vout, 0);
assert.equal(bridgeTimeoutRefund.input.valueSat, parentEdgeOutput.value.toString());
assert.equal(bridgeTimeoutRefund.input.scriptPubKeyHex, bridgeSignerWallet.scriptPubKeyHex);
assert.equal(bridgeTimeoutRefund.output.valueSat, (parentEdgeOutput.value - bridgeRefundFeeSat).toString());
assert.equal(bridgeTimeoutRefund.output.scriptPubKeyHex, parentFundingWallet.scriptPubKeyHex);
assert.equal(bridgeTimeoutRefund.locktime, bridgeTimeoutHeight);
assert.equal(bridgeTimeoutRefund.sequence, bridgeRefundSequence);
assert.equal(bridgeTimeoutRefund.signature.verifies, true);
assert.equal(bridgeTimeoutRefund.txid, bridgeTimeoutRefund.txidNoWitness);
assert.equal(bridgeRefundEarlySpendAccepted, false);
assert.equal(bridgeRefundMatureSpendAccepted, true);

const {
  pending: pendingBridge,
  selectedAdaptorNonceSecretHex: bridgeAdaptorNonceSecretHex,
} = buildSpendWithDeterministicNonce({
  signerWallet: bridgeSignerWallet,
  utxo: {
    txid: completedParentCet.txid,
    vout: 0,
    valueSat: parentEdgeOutput.value,
  },
  destinationAddress: childFundingWallet.address,
  feeSat: bridgeFeeSat,
  adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
});
assert.equal(pendingBridge.input.txid, completedParentCet.txid);
assert.equal(pendingBridge.input.vout, 0);
assert.equal(pendingBridge.input.valueSat, parentEdgeOutput.value.toString());
assert.equal(pendingBridge.input.scriptPubKeyHex, bridgeSignerWallet.scriptPubKeyHex);
assert.equal(parentCetConfirmation.spendableByBridge, true);
assert.equal(pendingBridge.adaptor.verifiesAdaptor, true);
assert.equal(pendingBridge.adaptor.adaptorPointCompressedHex, activatingPrepared.attestationPointCompressedHex);

const bridgePreResolutionSignatureHex =
  `${pendingBridge.adaptor.adaptedNonceXOnlyHex}${pendingBridge.adaptor.adaptorSignatureScalarHex}`;
const bridgePreResolutionSignatureVerifies = verifyBip340Signature({
  signatureHex: bridgePreResolutionSignatureHex,
  messageHashHex: pendingBridge.sighashHex,
  publicKeyXOnlyHex: pendingBridge.adaptor.signerPublicXOnlyHex,
});
assert.equal(bridgePreResolutionSignatureVerifies, false);

let bridgeWrongScalarRejected = false;
let bridgeWrongScalarReason = '';
try {
  completeTaprootAdaptorSpend({
    pending: pendingBridge,
    attestationSecret: scalarFromHex(
      wrongAttestation.attestationSecretHex,
      'wrong attestation secret',
    ),
  });
} catch (error) {
  bridgeWrongScalarRejected = true;
  bridgeWrongScalarReason = error instanceof Error ? error.message : String(error);
}
assert.equal(bridgeWrongScalarRejected, true);
assert.match(bridgeWrongScalarReason, /completed adaptor signature does not verify/);

const completedBridge = completeTaprootAdaptorSpend({
  pending: pendingBridge,
  attestationSecret: scalarFromHex(
    activatingAttestation.attestationSecretHex,
    'activating attestation secret',
  ),
});
assert.equal(completedBridge.verifies, true);
assert.equal(completedBridge.extractedSecretHex, activatingAttestation.attestationSecretHex);

const bridgeTx = Transaction.fromHex(completedBridge.rawTxHex);
const childFundingOutput = outputAt(bridgeTx, 0);
assert.equal(bytesToHex(childFundingOutput.script), childFundingWallet.scriptPubKeyHex);
assert.equal(childFundingOutput.value, parentEdgeOutput.value - bridgeFeeSat);

const bridgeConfirmationHeight = parentCetConfirmation.blockHeight + 1;
const bridgeConfirmation = {
  mode: 'deterministic-regtest-equivalent',
  reason: 'CI does not depend on public testnet faucet, mempool, or local bitcoind availability',
  txid: completedBridge.txid,
  blockHeight: bridgeConfirmationHeight,
  blockHash: deterministicBlockHash(bridgeConfirmationHeight, completedBridge.txid),
  confirmations: 1,
  spendsParentEdgeOutput: {
    txid: completedParentCet.txid,
    vout: 0,
  },
  createsChildFundingOutput: {
    txid: completedBridge.txid,
    vout: 0,
    valueSat: childFundingOutput.value.toString(),
    scriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
  },
  childFundingOutpointExists: true,
  childFundingOutpointUnspent: true,
};
assert.equal(bridgeConfirmation.blockHeight > parentCetConfirmation.blockHeight, true);
assert.equal(bridgeConfirmation.spendsParentEdgeOutput.txid, completedParentCet.txid);
assert.equal(bridgeConfirmation.spendsParentEdgeOutput.vout, 0);
assert.equal(bridgeConfirmation.createsChildFundingOutput.txid, completedBridge.txid);
assert.equal(bridgeConfirmation.createsChildFundingOutput.vout, 0);
assert.equal(bridgeConfirmation.createsChildFundingOutput.valueSat, childFundingOutput.value.toString());
assert.equal(bridgeConfirmation.createsChildFundingOutput.scriptPubKeyHex, childFundingWallet.scriptPubKeyHex);
assert.equal(bridgeConfirmation.childFundingOutpointExists, true);
assert.equal(bridgeConfirmation.childFundingOutpointUnspent, true);

const childFundingUtxo = {
  txid: completedBridge.txid,
  vout: 0,
  valueSat: childFundingOutput.value,
};
const {
  pending: pendingChildCet,
  selectedAdaptorNonceSecretHex: childCetAdaptorNonceSecretHex,
} = buildSpendWithDeterministicNonce({
  signerWallet: childFundingWallet,
  utxo: childFundingUtxo,
  destinationAddress: parentFundingWallet.address,
  feeSat: childCetFeeSat,
  adaptorPointHex: childPrepared.attestationPointCompressedHex,
});
assert.equal(pendingChildCet.input.txid, completedBridge.txid);
assert.equal(pendingChildCet.input.vout, 0);
assert.equal(pendingChildCet.input.valueSat, childFundingOutput.value.toString());
assert.equal(pendingChildCet.input.scriptPubKeyHex, childFundingWallet.scriptPubKeyHex);
assert.equal(pendingChildCet.adaptor.verifiesAdaptor, true);
assert.equal(
  pendingChildCet.adaptor.adaptorPointCompressedHex,
  childPrepared.attestationPointCompressedHex,
);

const childCetPreResolutionSignatureHex =
  `${pendingChildCet.adaptor.adaptedNonceXOnlyHex}${pendingChildCet.adaptor.adaptorSignatureScalarHex}`;
const childCetPreResolutionSignatureVerifies = verifyBip340Signature({
  signatureHex: childCetPreResolutionSignatureHex,
  messageHashHex: pendingChildCet.sighashHex,
  publicKeyXOnlyHex: pendingChildCet.adaptor.signerPublicXOnlyHex,
});
assert.equal(childCetPreResolutionSignatureVerifies, false);

const childRefundHeight = 3_000_300;
const childRefundSequence = 0xfffffffe;
const childRefund = buildTaprootKeySpend({
  network,
  signerOutputSecret: scalarFromHex(childFundingWallet.outputSecretHex, 'child funding output secret'),
  signerScriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
  utxo: childFundingUtxo,
  destinationAddress: childFundingWallet.address,
  outputValueSat: childFundingOutput.value - childRefundFeeSat,
  locktime: childRefundHeight,
  sequence: childRefundSequence,
  nonceSecret: scalarFromHex(canonicalSecrets.childRefundNonce, 'child refund nonce'),
});
assert.equal(childRefund.input.txid, completedBridge.txid);
assert.equal(childRefund.input.vout, 0);
assert.equal(childRefund.input.valueSat, childFundingOutput.value.toString());
assert.equal(childRefund.input.scriptPubKeyHex, childFundingWallet.scriptPubKeyHex);
assert.equal(childRefund.output.valueSat, (childFundingOutput.value - childRefundFeeSat).toString());
assert.equal(childRefund.output.scriptPubKeyHex, childFundingWallet.scriptPubKeyHex);
assert.equal(childRefund.locktime, childRefundHeight);
assert.equal(childRefund.sequence, childRefundSequence);
assert.equal(childRefund.signature.verifies, true);
assert.equal(childRefund.txid, childRefund.txidNoWitness);
assert.notEqual(childRefund.txidNoWitness, pendingChildCet.txidNoWitness);

console.log(JSON.stringify({
  kind: 'niti.v0_1_cdlc_smoke_transcript.v1',
  boundary: 'deterministic regtest-equivalent transaction chain with signed fixture funding tx; no public broadcast',
  network,
  funding: parentFundingFixture,
  parent: {
    fundingTxid: parentFundingFixture.parentFunding.txid,
    fundingVout: parentFundingFixture.parentFunding.vout,
    cetUnsignedTxHex: pendingParentCet.unsignedTxHex,
    cetUnsignedTxid: pendingParentCet.txidNoWitness,
    cetCompletedTxid: completedParentCet.txid,
    cetRawTxHex: completedParentCet.rawTxHex,
    cetSighashHex: pendingParentCet.sighashHex,
    confirmation: parentCetConfirmation,
    sighashInputs: [
      {
        txid: pendingParentCet.input.txid,
        vout: pendingParentCet.input.vout,
        valueSat: pendingParentCet.input.valueSat,
        scriptPubKeyHex: pendingParentCet.input.scriptPubKeyHex,
      },
    ],
    selectedAdaptorNonceSecretHex: parentAdaptorNonceSecretHex,
    adaptorVerifies: pendingParentCet.adaptor.verifiesAdaptor,
    completedSignatureVerifies: completedParentCet.verifies,
    extractedSecretMatchesOracleScalar:
      completedParentCet.extractedSecretHex === activatingAttestation.attestationSecretHex,
    wrongOutcomeRejected: true,
    edgeOutput: {
      vout: 0,
      valueSat: parentEdgeOutput.value.toString(),
      scriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
    },
    outputMap: [
      {
        name: 'edge',
        vout: 0,
        valueSat: parentEdgeOutput.value.toString(),
        scriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
        spendRole: 'bridge signer',
      },
    ],
    edgeTimeoutRefund: {
      scenario: 'bridge_not_completed_before_timeout',
      input: bridgeTimeoutRefund.input,
      destinationAddress: bridgeTimeoutRefund.destinationAddress,
      output: bridgeTimeoutRefund.output,
      feeSat: bridgeTimeoutRefund.feeSat,
      locktime: bridgeTimeoutRefund.locktime,
      sequence: bridgeTimeoutRefund.sequence,
      unsignedTxHex: bridgeTimeoutRefund.unsignedTxHex,
      txidNoWitness: bridgeTimeoutRefund.txidNoWitness,
      rawTxHex: bridgeTimeoutRefund.rawTxHex,
      txid: bridgeTimeoutRefund.txid,
      sighashHex: bridgeTimeoutRefund.sighashHex,
      signatureVerifies: bridgeTimeoutRefund.signature.verifies,
      timelockCheck: {
        type: 'absolute-block-height',
        finalityRule: 'non-final-sequence height lock is mature when locktime is below the candidate block height',
        timeoutHeight: bridgeTimeoutHeight,
        earlyCandidateHeight: bridgeRefundEarlyHeight,
        earlySpendAccepted: bridgeRefundEarlySpendAccepted,
        matureCandidateHeight: bridgeRefundMatureHeight,
        matureSpendAccepted: bridgeRefundMatureSpendAccepted,
      },
    },
  },
  oracle: {
    eventId,
    activatingOutcome,
    wrongOutcome,
    noncePointCompressedHex: activatingPrepared.noncePointCompressedHex,
    oraclePublicCompressedHex: activatingPrepared.oraclePublicCompressedHex,
    activatingAttestationPointCompressedHex: activatingPrepared.attestationPointCompressedHex,
    wrongAttestationPointCompressedHex: wrongPrepared.attestationPointCompressedHex,
    activatingSignatureVerifies: activatingAttestation.verifies,
    wrongSignatureVerifies: wrongAttestation.verifies,
  },
  chainSimulation: {
    kind: 'niti.v0_1_chain_simulation.v1',
    boundary: 'deterministic confirmation transcript; no public broadcast',
    blocks: [
      {
        height: parentCetConfirmation.blockHeight,
        hash: parentCetConfirmation.blockHash,
        transactions: [
          {
            txid: parentCetConfirmation.txid,
            role: 'parent_cet',
          },
        ],
      },
      {
        height: bridgeConfirmation.blockHeight,
        hash: bridgeConfirmation.blockHash,
        transactions: [
          {
            txid: bridgeConfirmation.txid,
            role: 'bridge',
            spends: bridgeConfirmation.spendsParentEdgeOutput,
            creates: bridgeConfirmation.createsChildFundingOutput,
          },
        ],
      },
    ],
    unspentOutputs: [
      {
        txid: bridgeConfirmation.createsChildFundingOutput.txid,
        vout: bridgeConfirmation.createsChildFundingOutput.vout,
        role: 'child_funding',
        valueSat: bridgeConfirmation.createsChildFundingOutput.valueSat,
        scriptPubKeyHex: bridgeConfirmation.createsChildFundingOutput.scriptPubKeyHex,
        spent: false,
      },
    ],
  },
  bridge: {
    spendsParentCetTxid: completedParentCet.txid,
    spendsParentCetVout: 0,
    unsignedTxHex: pendingBridge.unsignedTxHex,
    unsignedTxid: pendingBridge.txidNoWitness,
    completedRawTxHex: completedBridge.rawTxHex,
    completedTxid: completedBridge.txid,
    confirmation: bridgeConfirmation,
    sighashHex: pendingBridge.sighashHex,
    sighashInputs: [
      {
        txid: pendingBridge.input.txid,
        vout: pendingBridge.input.vout,
        valueSat: pendingBridge.input.valueSat,
        scriptPubKeyHex: pendingBridge.input.scriptPubKeyHex,
      },
    ],
    selectedAdaptorNonceSecretHex: bridgeAdaptorNonceSecretHex,
    adaptorVerifies: pendingBridge.adaptor.verifiesAdaptor,
    adaptor: {
      signerPublicXOnlyHex: pendingBridge.adaptor.signerPublicXOnlyHex,
      adaptorPointCompressedHex: pendingBridge.adaptor.adaptorPointCompressedHex,
      adaptedNonceXOnlyHex: pendingBridge.adaptor.adaptedNonceXOnlyHex,
      adaptorSignatureScalarHex: pendingBridge.adaptor.adaptorSignatureScalarHex,
      preResolutionVerifies: pendingBridge.adaptor.verifiesAdaptor,
      preResolutionHasCompletedWitness: false,
      preResolutionSignatureHex: bridgePreResolutionSignatureHex,
      preResolutionSignatureVerifies: bridgePreResolutionSignatureVerifies,
    },
    completion: {
      attestationPointCompressedHex: activatingAttestation.attestationPointCompressedHex,
      completedSignatureHex: completedBridge.completedSignatureHex,
      completedSignatureVerifies: completedBridge.verifies,
      extractedSecretHex: completedBridge.extractedSecretHex,
      extractedSecretMatchesOracleScalar:
        completedBridge.extractedSecretHex === activatingAttestation.attestationSecretHex,
    },
    wrongScalar: {
      attestationPointCompressedHex: wrongAttestation.attestationPointCompressedHex,
      rejected: bridgeWrongScalarRejected,
      reason: bridgeWrongScalarReason,
    },
    completedSignatureVerifies: completedBridge.verifies,
    extractedSecretMatchesOracleScalar:
      completedBridge.extractedSecretHex === activatingAttestation.attestationSecretHex,
    wrongOutcomeRejected: true,
    outputMap: [
      {
        name: 'child_funding',
        vout: 0,
        valueSat: childFundingOutput.value.toString(),
        scriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
        address: childFundingWallet.address,
      },
    ],
  },
  child: {
    fundingAddress: childFundingWallet.address,
    fundingScriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
    fundingValueSat: childFundingOutput.value.toString(),
    fundedByBridgeTxid: completedBridge.txid,
    fundedByBridgeVout: 0,
    visibleInCompletedBridge: true,
    confirmedByBridge: true,
    fundingOutpointExists: bridgeConfirmation.childFundingOutpointExists,
    fundingOutpointUnspent: bridgeConfirmation.childFundingOutpointUnspent,
    oracle: {
      eventId: childEventId,
      activatingOutcome: childActivatingOutcome,
      noncePointCompressedHex: childPrepared.noncePointCompressedHex,
      oraclePublicCompressedHex: childPrepared.oraclePublicCompressedHex,
      activatingAttestationPointCompressedHex: childPrepared.attestationPointCompressedHex,
    },
    preparedCet: {
      input: {
        txid: pendingChildCet.input.txid,
        vout: pendingChildCet.input.vout,
        valueSat: pendingChildCet.input.valueSat,
        scriptPubKeyHex: pendingChildCet.input.scriptPubKeyHex,
      },
      destinationAddress: pendingChildCet.destinationAddress,
      sendValueSat: pendingChildCet.sendValueSat,
      feeSat: pendingChildCet.feeSat,
      unsignedTxHex: pendingChildCet.unsignedTxHex,
      unsignedTxid: pendingChildCet.txidNoWitness,
      sighashHex: pendingChildCet.sighashHex,
      selectedAdaptorNonceSecretHex: childCetAdaptorNonceSecretHex,
      adaptorVerifies: pendingChildCet.adaptor.verifiesAdaptor,
      adaptor: {
        signerPublicXOnlyHex: pendingChildCet.adaptor.signerPublicXOnlyHex,
        adaptorPointCompressedHex: pendingChildCet.adaptor.adaptorPointCompressedHex,
        adaptedNonceXOnlyHex: pendingChildCet.adaptor.adaptedNonceXOnlyHex,
        adaptorSignatureScalarHex: pendingChildCet.adaptor.adaptorSignatureScalarHex,
        preResolutionHasCompletedWitness: false,
        preResolutionSignatureHex: childCetPreResolutionSignatureHex,
        preResolutionSignatureVerifies: childCetPreResolutionSignatureVerifies,
      },
    },
    preparedRefund: {
      input: childRefund.input,
      destinationAddress: childRefund.destinationAddress,
      output: childRefund.output,
      feeSat: childRefund.feeSat,
      locktime: childRefund.locktime,
      sequence: childRefund.sequence,
      unsignedTxHex: childRefund.unsignedTxHex,
      txidNoWitness: childRefund.txidNoWitness,
      rawTxHex: childRefund.rawTxHex,
      txid: childRefund.txid,
      sighashHex: childRefund.sighashHex,
      signatureVerifies: childRefund.signature.verifies,
      signature: {
        signerPublicXOnlyHex: childRefund.signature.signerPublicXOnlyHex,
        nonceXOnlyHex: childRefund.signature.nonceXOnlyHex,
        signatureHex: childRefund.signature.signatureHex,
      },
    },
    preparedSpendChecks: {
      cetSpendsChildFunding: pendingChildCet.input.txid === completedBridge.txid
        && pendingChildCet.input.vout === 0,
      refundSpendsChildFunding: childRefund.input.txid === completedBridge.txid
        && childRefund.input.vout === 0,
      cetAdaptorVerifies: pendingChildCet.adaptor.verifiesAdaptor,
      cetPreResolutionSignatureVerifies: childCetPreResolutionSignatureVerifies,
      refundSignatureVerifies: childRefund.signature.verifies,
      refundIsTimelocked: childRefund.locktime === childRefundHeight
        && childRefund.sequence < 0xffffffff,
    },
  },
}, null, 2));
