import assert from 'node:assert/strict';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  pointFromCompressed,
  scalarFromHex,
} from './secp.js';
import {
  buildTaprootAdaptorSpend,
  completeTaprootAdaptorSpend,
  deriveTaprootWallet,
  resolveNetwork,
  type BitcoinNetworkName,
  type PendingTaprootAdaptorSpend,
  type TaprootWallet,
} from './taproot.js';

const network: BitcoinNetworkName = 'testnet4';
resolveNetwork(network);

const parentFundingTxid = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const parentFundingVout = 0;
const parentFundingValueSat = 100_000n;
const parentCetFeeSat = 1_000n;
const bridgeFeeSat = 500n;

const parentFundingWallet = deriveTaprootWallet({
  network,
  internalSecret: scalarFromHex(
    '1111111111111111111111111111111111111111111111111111111111111111',
    'parent funding secret',
  ),
});

const bridgeSignerWallet = deriveTaprootWallet({
  network,
  internalSecret: scalarFromHex(
    '2222222222222222222222222222222222222222222222222222222222222222',
    'bridge signer secret',
  ),
});

const childFundingWallet = deriveTaprootWallet({
  network,
  internalSecret: scalarFromHex(
    '3333333333333333333333333333333333333333333333333333333333333333',
    'child funding secret',
  ),
});

const oracleSecret = scalarFromHex(
  '4444444444444444444444444444444444444444444444444444444444444444',
  'oracle secret',
);
const nonceSecret = scalarFromHex(
  '5555555555555555555555555555555555555555555555555555555555555555',
  'oracle nonce',
);

const eventId = 'niti-v0.1-parent-cdlc-smoke';
const activatingOutcome = 'BTCUSD_ABOVE_STRIKE';
const wrongOutcome = 'BTCUSD_BELOW_STRIKE';

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

const {
  pending: pendingParentCet,
  selectedAdaptorNonceSecretHex: parentAdaptorNonceSecretHex,
} = buildSpendWithDeterministicNonce({
  signerWallet: parentFundingWallet,
  utxo: {
    txid: parentFundingTxid,
    vout: parentFundingVout,
    valueSat: parentFundingValueSat,
  },
  destinationAddress: bridgeSignerWallet.address,
  feeSat: parentCetFeeSat,
  adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
});
assert.equal(pendingParentCet.adaptor.verifiesAdaptor, true);
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
assert.equal(parentEdgeOutput.value, parentFundingValueSat - parentCetFeeSat);

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
assert.equal(pendingBridge.adaptor.verifiesAdaptor, true);
assert.equal(pendingBridge.adaptor.adaptorPointCompressedHex, activatingPrepared.attestationPointCompressedHex);
assert.throws(
  () => completeTaprootAdaptorSpend({
    pending: pendingBridge,
    attestationSecret: scalarFromHex(
      wrongAttestation.attestationSecretHex,
      'wrong attestation secret',
    ),
  }),
  /completed adaptor signature does not verify/,
);

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
  boundary: 'deterministic regtest-equivalent transaction chain with fixture prevout; no public broadcast',
  network,
  parent: {
    fundingTxid: parentFundingTxid,
    cetUnsignedTxid: pendingParentCet.txidNoWitness,
    cetCompletedTxid: completedParentCet.txid,
    cetRawTxHex: completedParentCet.rawTxHex,
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
  bridge: {
    spendsParentCetTxid: completedParentCet.txid,
    spendsParentCetVout: 0,
    unsignedTxid: pendingBridge.txidNoWitness,
    completedTxid: completedBridge.txid,
    selectedAdaptorNonceSecretHex: bridgeAdaptorNonceSecretHex,
    adaptorVerifies: pendingBridge.adaptor.verifiesAdaptor,
    completedSignatureVerifies: completedBridge.verifies,
    extractedSecretMatchesOracleScalar:
      completedBridge.extractedSecretHex === activatingAttestation.attestationSecretHex,
    wrongOutcomeRejected: true,
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
