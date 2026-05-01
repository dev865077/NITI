import assert from 'node:assert/strict';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  pointFromCompressed,
  scalarFromHex,
  verifyBip340Signature,
} from './secp.js';
import {
  buildTaprootAdaptorSpend,
  completeTaprootAdaptorSpend,
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

type ActivationHolder = 'alice' | 'bob' | 'watchtower';

interface PreparedEdgePackage {
  kind: 'niti.l3.lazy_prepared_edge_package.v1';
  holder: ActivationHolder;
  bridge: PendingTaprootAdaptorSpend;
  oracle: {
    eventId: string;
    activatingOutcome: string;
    wrongOutcome: string;
    activatingAttestationPointCompressedHex: string;
    wrongAttestationPointCompressedHex: string;
  };
}

function outputAt(tx: Transaction, index: number): NonNullable<Transaction['outs'][number]> {
  const output = tx.outs[index];
  if (!output) {
    throw new Error(`missing tx output ${index}`);
  }
  return output;
}

function copyForHolder(
  packageTemplate: Omit<PreparedEdgePackage, 'holder'>,
  holder: ActivationHolder,
): PreparedEdgePackage {
  return JSON.parse(JSON.stringify({
    ...packageTemplate,
    holder,
  })) as PreparedEdgePackage;
}

function activatePreparedEdge(input: {
  package: PreparedEdgePackage | null;
  attestationSecretHex: string;
}): {
  txid: string;
  verifies: boolean;
  extractedSecretHex: string;
} {
  if (!input.package) {
    throw new Error('prepared edge package is required before lazy activation');
  }
  const completed = completeTaprootAdaptorSpend({
    pending: input.package.bridge,
    attestationSecret: scalarFromHex(input.attestationSecretHex, 'attestation secret'),
  });
  return {
    txid: completed.txid,
    verifies: completed.verifies,
    extractedSecretHex: completed.extractedSecretHex,
  };
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
        network: input.signerWallet.network,
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

const network = canonicalNetwork;
const wallets = canonicalWallets(network);
const parentFundingWallet = wallets.parentFunding;
const bridgeSignerWallet = wallets.bridgeSigner;
const childFundingWallet = wallets.childFunding;

const oracleSecret = scalarFromHex(canonicalSecrets.oracle, 'oracle secret');
const nonceSecret = scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce');
const activatingPrepared = prepareOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret,
  nonceSecret,
});
const wrongPrepared = prepareOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.wrong,
  oracleSecret,
  nonceSecret,
});
const activatingAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.activating,
  oracleSecret,
  nonceSecret,
});
const wrongAttestation = attestOracleOutcome({
  eventId: canonicalOutcomes.eventId,
  outcome: canonicalOutcomes.wrong,
  oracleSecret,
  nonceSecret,
});

const parentFundingFixture = buildCanonicalParentFundingFixture(network);
const parentCet = buildSpendWithDeterministicNonce({
  signerWallet: parentFundingWallet,
  utxo: {
    txid: parentFundingFixture.parentFunding.txid,
    vout: parentFundingFixture.parentFunding.vout,
    valueSat: BigInt(parentFundingFixture.parentFunding.valueSat),
  },
  destinationAddress: bridgeSignerWallet.address,
  feeSat: canonicalAmounts.parentCetFeeSat,
  adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
});
const completedParentCet = completeTaprootAdaptorSpend({
  pending: parentCet,
  attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating attestation secret'),
});
const parentCetTx = Transaction.fromHex(completedParentCet.rawTxHex);
const parentEdgeOutput = outputAt(parentCetTx, 0);

const bridge = buildSpendWithDeterministicNonce({
  signerWallet: bridgeSignerWallet,
  utxo: {
    txid: completedParentCet.txid,
    vout: 0,
    valueSat: parentEdgeOutput.value,
  },
  destinationAddress: childFundingWallet.address,
  feeSat: canonicalAmounts.bridgeFeeSat,
  adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
});

const preResolutionSignatureHex =
  `${bridge.adaptor.adaptedNonceXOnlyHex}${bridge.adaptor.adaptorSignatureScalarHex}`;
const preResolutionSignatureVerifies = verifyBip340Signature({
  signatureHex: preResolutionSignatureHex,
  messageHashHex: bridge.sighashHex,
  publicKeyXOnlyHex: bridge.adaptor.signerPublicXOnlyHex,
});
assert.equal(preResolutionSignatureVerifies, false);
assert.equal(bridge.adaptor.verifiesAdaptor, true);
assert.equal(bridge.adaptor.adaptorPointCompressedHex, activatingPrepared.attestationPointCompressedHex);
assert.notEqual(
  bridge.adaptor.adaptorPointCompressedHex,
  wrongPrepared.attestationPointCompressedHex,
);

const packageTemplate: Omit<PreparedEdgePackage, 'holder'> = {
  kind: 'niti.l3.lazy_prepared_edge_package.v1',
  bridge,
  oracle: {
    eventId: canonicalOutcomes.eventId,
    activatingOutcome: canonicalOutcomes.activating,
    wrongOutcome: canonicalOutcomes.wrong,
    activatingAttestationPointCompressedHex: activatingPrepared.attestationPointCompressedHex,
    wrongAttestationPointCompressedHex: wrongPrepared.attestationPointCompressedHex,
  },
};

const holderResults = (['alice', 'bob', 'watchtower'] as const).map((holder) => {
  const heldPackage = copyForHolder(packageTemplate, holder);
  const result = activatePreparedEdge({
    package: heldPackage,
    attestationSecretHex: activatingAttestation.attestationSecretHex,
  });
  assert.equal(result.verifies, true);
  assert.equal(result.txid, bridge.txidNoWitness);
  assert.equal(result.extractedSecretHex, activatingAttestation.attestationSecretHex);
  return {
    holder,
    txid: result.txid,
    verifies: result.verifies,
    extractedSecretMatchesOracle: result.extractedSecretHex === activatingAttestation.attestationSecretHex,
  };
});

assert.deepEqual(
  new Set(holderResults.map((result) => result.txid)).size,
  1,
);
assert.throws(
  () => activatePreparedEdge({
    package: copyForHolder(packageTemplate, 'alice'),
    attestationSecretHex: wrongAttestation.attestationSecretHex,
  }),
  /completed adaptor signature does not verify/,
);
assert.throws(
  () => activatePreparedEdge({
    package: null,
    attestationSecretHex: activatingAttestation.attestationSecretHex,
  }),
  /prepared edge package is required/,
);

console.log(JSON.stringify({
  kind: 'niti.l3_lazy_activation_holder_test.v1',
  boundary: 'A prepared bridge edge can be activated non-interactively by any holder of the edge package after oracle attestation; unprepared or wrong-outcome paths fail closed.',
  network,
  edgePackageKind: packageTemplate.kind,
  signerSecretsAvailableToHolders: false,
  holders: holderResults,
  wrongOutcomeRejected: true,
  missingPackageRejected: true,
  checks: {
    adaptorVerifiesBeforeResolution: bridge.adaptor.verifiesAdaptor,
    preResolutionSignatureInvalid: preResolutionSignatureVerifies === false,
    activationDoesNotRequireSignerOnline: holderResults.every((result) => result.verifies),
    allHoldersProduceSameBridgeTxid: new Set(holderResults.map((result) => result.txid)).size === 1,
    wrongOutcomeDoesNotActivatePreparedEdge: true,
    unpreparedEdgeCannotBeActivated: true,
    childFundingScriptPubKeyHex: bytesToHex(outputAt(
      Transaction.fromHex(completeTaprootAdaptorSpend({
        pending: bridge,
        attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating attestation secret'),
      }).rawTxHex),
      0,
    ).script),
  },
}, null, 2));
