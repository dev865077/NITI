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
const wallets = canonicalWallets(network);
const parentFundingWallet = wallets.parentFunding;
const bridgeSignerWallet = wallets.bridgeSigner;
const childFundingWallet = wallets.childFunding;
const oracleSecret = scalarFromHex(canonicalSecrets.oracle, 'oracle secret');
const nonceSecret = scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce');
const eventId = canonicalOutcomes.eventId;
const activatingOutcome = canonicalOutcomes.activating;
const wrongOutcome = canonicalOutcomes.wrong;

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
assert.notEqual(
  wrongPrepared.attestationPointCompressedHex,
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
    ],
  },
  bridge: {
    spendsParentCetTxid: completedParentCet.txid,
    spendsParentCetVout: 0,
    unsignedTxHex: pendingBridge.unsignedTxHex,
    unsignedTxid: pendingBridge.txidNoWitness,
    completedRawTxHex: completedBridge.rawTxHex,
    completedTxid: completedBridge.txid,
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
  },
}, null, 2));
