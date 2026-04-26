import { scalarFromHex } from './secp.js';
import {
  buildTaprootKeySpend,
  deriveTaprootWallet,
  resolveNetwork,
  type BitcoinNetworkName,
} from './taproot.js';

export const canonicalNetwork: BitcoinNetworkName = 'testnet4';

export const canonicalSecrets = {
  sourceFunding: '6666666666666666666666666666666666666666666666666666666666666666',
  sourceFundingNonce: '7777777777777777777777777777777777777777777777777777777777777777',
  parentFunding: '1111111111111111111111111111111111111111111111111111111111111111',
  bridgeSigner: '2222222222222222222222222222222222222222222222222222222222222222',
  childFunding: '3333333333333333333333333333333333333333333333333333333333333333',
  oracle: '4444444444444444444444444444444444444444444444444444444444444444',
  oracleNonce: '5555555555555555555555555555555555555555555555555555555555555555',
  childOracle: '8888888888888888888888888888888888888888888888888888888888888888',
  childOracleNonce: '9999999999999999999999999999999999999999999999999999999999999999',
  bridgeRefundNonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  childRefundNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
} as const;

export const canonicalOutcomes = {
  eventId: 'niti-v0.1-parent-cdlc-smoke',
  activating: 'BTCUSD_ABOVE_STRIKE',
  wrong: 'BTCUSD_BELOW_STRIKE',
  childEventId: 'niti-v0.1-child-cdlc-smoke',
  childActivating: 'CHILD_SETTLEMENT_READY',
} as const;

export const canonicalAmounts = {
  sourceFundingValueSat: 101_000n,
  parentFundingValueSat: 100_000n,
  parentCetFeeSat: 1_000n,
  bridgeFeeSat: 500n,
  bridgeRefundFeeSat: 500n,
  childCetFeeSat: 500n,
  childRefundFeeSat: 500n,
} as const;

export const canonicalSourcePrevout = {
  txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  vout: 0,
} as const;

export function canonicalWallets(network: BitcoinNetworkName = canonicalNetwork): {
  sourceFunding: ReturnType<typeof deriveTaprootWallet>;
  parentFunding: ReturnType<typeof deriveTaprootWallet>;
  bridgeSigner: ReturnType<typeof deriveTaprootWallet>;
  childFunding: ReturnType<typeof deriveTaprootWallet>;
} {
  resolveNetwork(network);
  return {
    sourceFunding: deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(canonicalSecrets.sourceFunding, 'source funding secret'),
    }),
    parentFunding: deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(canonicalSecrets.parentFunding, 'parent funding secret'),
    }),
    bridgeSigner: deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(canonicalSecrets.bridgeSigner, 'bridge signer secret'),
    }),
    childFunding: deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(canonicalSecrets.childFunding, 'child funding secret'),
    }),
  };
}

export function buildCanonicalParentFundingFixture(network: BitcoinNetworkName = canonicalNetwork): {
  kind: 'niti.v0_1_parent_funding_fixture.v1';
  boundary: string;
  source: {
    txid: string;
    vout: number;
    valueSat: string;
    address: string;
    scriptPubKeyHex: string;
  };
  parentFunding: {
    txid: string;
    vout: number;
    valueSat: string;
    address: string;
    scriptPubKeyHex: string;
    rawTxHex: string;
    signatureVerifies: boolean;
  };
  feeSat: string;
} {
  const wallets = canonicalWallets(network);
  const fundingTx = buildTaprootKeySpend({
    network,
    signerOutputSecret: scalarFromHex(wallets.sourceFunding.outputSecretHex, 'source output secret'),
    signerScriptPubKeyHex: wallets.sourceFunding.scriptPubKeyHex,
    utxo: {
      ...canonicalSourcePrevout,
      valueSat: canonicalAmounts.sourceFundingValueSat,
    },
    destinationAddress: wallets.parentFunding.address,
    outputValueSat: canonicalAmounts.parentFundingValueSat,
    nonceSecret: scalarFromHex(canonicalSecrets.sourceFundingNonce, 'source funding nonce'),
  });

  return {
    kind: 'niti.v0_1_parent_funding_fixture.v1',
    boundary: 'deterministic signed Taproot funding transaction with fixture source prevout; no public broadcast',
    source: {
      txid: canonicalSourcePrevout.txid,
      vout: canonicalSourcePrevout.vout,
      valueSat: canonicalAmounts.sourceFundingValueSat.toString(),
      address: wallets.sourceFunding.address,
      scriptPubKeyHex: wallets.sourceFunding.scriptPubKeyHex,
    },
    parentFunding: {
      txid: fundingTx.txid,
      vout: fundingTx.output.vout,
      valueSat: fundingTx.output.valueSat,
      address: wallets.parentFunding.address,
      scriptPubKeyHex: fundingTx.output.scriptPubKeyHex,
      rawTxHex: fundingTx.rawTxHex,
      signatureVerifies: fundingTx.signature.verifies,
    },
    feeSat: fundingTx.feeSat,
  };
}
