import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  buildTaprootKeySpend,
  completeTaprootAdaptorSpend,
  resolveNetwork,
  type BitcoinNetworkName,
  type PendingTaprootAdaptorSpend,
  type TaprootWallet,
} from './taproot.js';
import {
  canonicalAmounts,
  canonicalOutcomes,
  canonicalPublicActivationMinimumValueSat,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';
import { readRpcConfig, rpcCall } from './rpc.js';

const satoshisPerBtc = 100_000_000n;

interface RawTxVerbose {
  txid: string;
  hex: string;
  confirmations?: number;
  blockhash?: string;
}

interface BlockVerbose {
  hash: string;
  height: number;
}

interface MempoolAccept {
  txid: string;
  wtxid: string;
  allowed: boolean;
  'reject-reason'?: string;
}

interface ConfirmationEvidence {
  txid: string;
  blockHash: string;
  blockHeight: number;
  confirmations: number;
}

interface PublicFundingOutput {
  txid: string;
  vout: number;
  valueSat: bigint;
  scriptPubKeyHex: string;
  rawTxHex: string;
  confirmations: number;
}

function stringArg(args: string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  if (index === -1) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`${name} is required`);
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function numberArg(args: string[], name: string, fallback: number): number {
  const parsed = Number(stringArg(args, name, String(fallback)));
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function networkArg(args: string[]): BitcoinNetworkName {
  const network = stringArg(args, '--network', 'signet') as BitcoinNetworkName;
  if (!['signet', 'testnet', 'testnet4'].includes(network)) {
    throw new Error('--network must be signet, testnet, or testnet4');
  }
  resolveNetwork(network);
  return network;
}

function btcAmountString(sats: bigint): string {
  const whole = sats / satoshisPerBtc;
  const fractional = (sats % satoshisPerBtc).toString().padStart(8, '0');
  return `${whole}.${fractional}`;
}

function amountToSats(amount: number): bigint {
  return BigInt(Math.round(amount * Number(satoshisPerBtc)));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`);
}

function relativeFromRepo(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}

function outputAt(tx: Transaction, index: number): NonNullable<Transaction['outs'][number]> {
  const output = tx.outs[index];
  if (!output) {
    throw new Error(`missing tx output ${index}`);
  }
  return output;
}

function inputTxid(tx: Transaction, index: number): string {
  const input = tx.ins[index];
  if (!input) {
    throw new Error(`missing tx input ${index}`);
  }
  return bytesToHex(Buffer.from(input.hash).reverse());
}

function inputVout(tx: Transaction, index: number): number {
  const input = tx.ins[index];
  if (!input) {
    throw new Error(`missing tx input ${index}`);
  }
  return input.index;
}

function buildSpendWithDeterministicNonce(input: {
  network: BitcoinNetworkName;
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
        network: input.network,
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

async function getRawTx(txid: string): Promise<RawTxVerbose> {
  try {
    return await rpcCall<RawTxVerbose>(readRpcConfig(), 'getrawtransaction', [txid, true]);
  } catch (error) {
    throw new Error(
      `could not read raw tx ${txid}; public evidence requires a synced node with txindex=1: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function getConfirmation(txid: string): Promise<ConfirmationEvidence | null> {
  const raw = await getRawTx(txid);
  assert.equal(raw.txid, txid);
  if (!raw.blockhash) {
    return null;
  }
  const block = await rpcCall<BlockVerbose>(readRpcConfig(), 'getblock', [raw.blockhash]);
  return {
    txid,
    blockHash: block.hash,
    blockHeight: block.height,
    confirmations: raw.confirmations ?? 0,
  };
}

async function waitForConfirmation(
  txid: string,
  minConfirmations: number,
  timeoutSeconds: number,
): Promise<ConfirmationEvidence> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() <= deadline) {
    const confirmation = await getConfirmation(txid);
    if (confirmation && confirmation.confirmations >= minConfirmations) {
      return confirmation;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 30_000);
    });
  }
  throw new Error(`timed out waiting for ${minConfirmations} confirmation(s) on ${txid}`);
}

async function testMempool(rawTxHex: string): Promise<MempoolAccept> {
  const result = await rpcCall<MempoolAccept[]>(
    readRpcConfig(),
    'testmempoolaccept',
    [[rawTxHex]],
  );
  const first = result[0];
  if (!first) {
    throw new Error('testmempoolaccept returned no result');
  }
  return first;
}

async function broadcastAndConfirm(input: {
  rawTxHex: string;
  expectedTxid: string;
  minConfirmations: number;
  waitSeconds: number;
}): Promise<{
  mempoolAccept: MempoolAccept;
  broadcastTxid: string;
  confirmation: ConfirmationEvidence;
}> {
  const mempoolAccept = await testMempool(input.rawTxHex);
  assert.equal(mempoolAccept.allowed, true, mempoolAccept['reject-reason']);
  const broadcastTxid = await rpcCall<string>(
    readRpcConfig(),
    'sendrawtransaction',
    [input.rawTxHex],
  );
  assert.equal(broadcastTxid, input.expectedTxid);
  return {
    mempoolAccept,
    broadcastTxid,
    confirmation: await waitForConfirmation(
      input.expectedTxid,
      input.minConfirmations,
      input.waitSeconds,
    ),
  };
}

async function assertRpcNetwork(network: BitcoinNetworkName): Promise<Record<string, unknown>> {
  const info = await rpcCall<Record<string, unknown>>(readRpcConfig(), 'getblockchaininfo');
  const chain = info.chain;
  const ok =
    (network === 'signet' && chain === 'signet')
    || (network === 'testnet' && chain === 'test')
    || (network === 'testnet4' && chain === 'testnet4');
  if (!ok) {
    throw new Error(`RPC chain ${String(chain)} does not match --network ${network}`);
  }
  if (info.initialblockdownload === true) {
    throw new Error('RPC node is still in initial block download');
  }
  return info;
}

async function scanFundingUtxo(input: {
  address: string;
  scriptPubKeyHex: string;
}): Promise<PublicFundingOutput> {
  const minimumValueSat = canonicalPublicActivationMinimumValueSat();
  const scan = await rpcCall<{
    success: boolean;
    unspents: Array<{
      txid: string;
      vout: number;
      scriptPubKey: string;
      amount: number;
      confirmations: number;
    }>;
  }>(readRpcConfig(), 'scantxoutset', ['start', [`addr(${input.address})`]]);
  if (!scan.success) {
    throw new Error('scantxoutset did not complete successfully');
  }
  const candidates = scan.unspents
    .filter((utxo) => utxo.scriptPubKey === input.scriptPubKeyHex)
    .map((utxo) => ({
      ...utxo,
      valueSat: amountToSats(utxo.amount),
    }))
    .filter((utxo) => utxo.valueSat >= minimumValueSat)
    .sort((a, b) => b.confirmations - a.confirmations);
  const selected = candidates[0];
  if (!selected) {
    throw new Error(`no funded UTXO found for ${input.address}`);
  }
  const raw = await getRawTx(selected.txid);
  return {
    txid: selected.txid,
    vout: selected.vout,
    valueSat: selected.valueSat,
    scriptPubKeyHex: selected.scriptPubKey,
    rawTxHex: raw.hex,
    confirmations: selected.confirmations,
  };
}

function rawTxArtifact(outDir: string, name: string, rawTxHex: string): {
  path: string;
  rawTxHex: string;
} {
  const filePath = path.join(outDir, `${name}.hex`);
  writeText(filePath, rawTxHex);
  return {
    path: relativeFromRepo(filePath),
    rawTxHex,
  };
}

function fundingRequest(args: string[]): void {
  const network = networkArg(args);
  const out = stringArg(args, '--out', `testnet/artifacts/public-${network}-funding-request.json`);
  const wallets = canonicalWallets(network);
  const minimumValueSat = canonicalPublicActivationMinimumValueSat();
  const request = {
    kind: 'niti.v0_1_public_cdlc_funding_request.v1',
    issue: 153,
    parentEpic: 56,
    network,
    address: wallets.parentFunding.address,
    scriptPubKeyHex: wallets.parentFunding.scriptPubKeyHex,
    minimumValueSat: minimumValueSat.toString(),
    minimumValueBtc: btcAmountString(minimumValueSat),
    deterministicFixtureValueSat: canonicalAmounts.parentFundingValueSat.toString(),
    deterministicFixtureValueBtc: btcAmountString(canonicalAmounts.parentFundingValueSat),
    warning: 'TESTNET/SIGNET ONLY. This uses deterministic test keys from the repository and must never receive mainnet funds.',
    nextCommand:
      `npm run public:cdlc-execute -- --network ${network} --out-dir docs/evidence/public-${network}`,
  };
  writeJson(out, request);
  console.log(JSON.stringify(request, null, 2));
}

async function executeActivation(args: string[]): Promise<void> {
  const network = networkArg(args);
  const outDir = path.resolve(stringArg(args, '--out-dir', `docs/evidence/public-${network}`));
  const minConfirmations = numberArg(args, '--min-confirmations', 1);
  const waitSeconds = numberArg(args, '--wait-seconds', 7200);
  fs.mkdirSync(outDir, { recursive: true });

  const chainInfo = await assertRpcNetwork(network);
  const networkInfo = await rpcCall<Record<string, unknown>>(readRpcConfig(), 'getnetworkinfo');
  const wallets = canonicalWallets(network);
  const parentFundingWallet = wallets.parentFunding;
  const bridgeSignerWallet = wallets.bridgeSigner;
  const childFundingWallet = wallets.childFunding;

  const oracleSecret = scalarFromHex(canonicalSecrets.oracle, 'oracle secret');
  const nonceSecret = scalarFromHex(canonicalSecrets.oracleNonce, 'oracle nonce');
  const childOracleSecret = scalarFromHex(canonicalSecrets.childOracle, 'child oracle secret');
  const childNonceSecret = scalarFromHex(canonicalSecrets.childOracleNonce, 'child oracle nonce');
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
  const childPrepared = prepareOracleOutcome({
    eventId: canonicalOutcomes.childEventId,
    outcome: canonicalOutcomes.childActivating,
    oracleSecret: childOracleSecret,
    nonceSecret: childNonceSecret,
  });

  const funding = await scanFundingUtxo({
    address: parentFundingWallet.address,
    scriptPubKeyHex: parentFundingWallet.scriptPubKeyHex,
  });
  if (funding.confirmations < minConfirmations) {
    throw new Error(`funding UTXO has ${funding.confirmations} confirmations; need ${minConfirmations}`);
  }

  const parentPending = buildSpendWithDeterministicNonce({
    network,
    signerWallet: parentFundingWallet,
    utxo: funding,
    destinationAddress: bridgeSignerWallet.address,
    feeSat: canonicalAmounts.parentCetFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  assert.throws(
    () => completeTaprootAdaptorSpend({
      pending: parentPending,
      attestationSecret: scalarFromHex(wrongAttestation.attestationSecretHex, 'wrong scalar'),
    }),
    /completed adaptor signature does not verify/,
  );
  const parentCompleted = completeTaprootAdaptorSpend({
    pending: parentPending,
    attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating scalar'),
  });
  const parentBroadcast = await broadcastAndConfirm({
    rawTxHex: parentCompleted.rawTxHex,
    expectedTxid: parentCompleted.txid,
    minConfirmations,
    waitSeconds,
  });
  const parentTx = Transaction.fromHex(parentCompleted.rawTxHex);
  assert.equal(inputTxid(parentTx, 0), funding.txid);
  assert.equal(inputVout(parentTx, 0), funding.vout);
  const parentEdgeOutput = outputAt(parentTx, 0);
  assert.equal(bytesToHex(parentEdgeOutput.script), bridgeSignerWallet.scriptPubKeyHex);

  const bridgePending = buildSpendWithDeterministicNonce({
    network,
    signerWallet: bridgeSignerWallet,
    utxo: {
      txid: parentCompleted.txid,
      vout: 0,
      valueSat: parentEdgeOutput.value,
    },
    destinationAddress: childFundingWallet.address,
    feeSat: canonicalAmounts.bridgeFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const bridgePreResolutionSignatureHex =
    `${bridgePending.adaptor.adaptedNonceXOnlyHex}${bridgePending.adaptor.adaptorSignatureScalarHex}`;
  const bridgePreResolutionSignatureVerifies = verifyBip340Signature({
    signatureHex: bridgePreResolutionSignatureHex,
    messageHashHex: bridgePending.sighashHex,
    publicKeyXOnlyHex: bridgePending.adaptor.signerPublicXOnlyHex,
  });
  assert.equal(bridgePreResolutionSignatureVerifies, false);
  let bridgeWrongScalarRejected = false;
  try {
    completeTaprootAdaptorSpend({
      pending: bridgePending,
      attestationSecret: scalarFromHex(wrongAttestation.attestationSecretHex, 'wrong scalar'),
    });
  } catch {
    bridgeWrongScalarRejected = true;
  }
  assert.equal(bridgeWrongScalarRejected, true);
  const bridgeCompleted = completeTaprootAdaptorSpend({
    pending: bridgePending,
    attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating scalar'),
  });
  const bridgeBroadcast = await broadcastAndConfirm({
    rawTxHex: bridgeCompleted.rawTxHex,
    expectedTxid: bridgeCompleted.txid,
    minConfirmations,
    waitSeconds,
  });
  const bridgeTx = Transaction.fromHex(bridgeCompleted.rawTxHex);
  assert.equal(inputTxid(bridgeTx, 0), parentCompleted.txid);
  assert.equal(inputVout(bridgeTx, 0), 0);
  const childFundingOutput = outputAt(bridgeTx, 0);
  assert.equal(bytesToHex(childFundingOutput.script), childFundingWallet.scriptPubKeyHex);

  const childFundingUtxo = {
    txid: bridgeCompleted.txid,
    vout: 0,
    valueSat: childFundingOutput.value,
  };
  const childCetPending = buildSpendWithDeterministicNonce({
    network,
    signerWallet: childFundingWallet,
    utxo: childFundingUtxo,
    destinationAddress: parentFundingWallet.address,
    feeSat: canonicalAmounts.childCetFeeSat,
    adaptorPointHex: childPrepared.attestationPointCompressedHex,
  });
  const childCetPreResolutionSignatureHex =
    `${childCetPending.adaptor.adaptedNonceXOnlyHex}${childCetPending.adaptor.adaptorSignatureScalarHex}`;
  const childCetPreResolutionSignatureVerifies = verifyBip340Signature({
    signatureHex: childCetPreResolutionSignatureHex,
    messageHashHex: childCetPending.sighashHex,
    publicKeyXOnlyHex: childCetPending.adaptor.signerPublicXOnlyHex,
  });
  assert.equal(childCetPending.adaptor.verifiesAdaptor, true);
  assert.equal(childCetPreResolutionSignatureVerifies, false);

  const childRefund = buildTaprootKeySpend({
    network,
    signerOutputSecret: scalarFromHex(childFundingWallet.outputSecretHex, 'child output secret'),
    signerScriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
    utxo: childFundingUtxo,
    destinationAddress: childFundingWallet.address,
    outputValueSat: childFundingOutput.value - canonicalAmounts.childRefundFeeSat,
    locktime: Number(chainInfo.blocks ?? 0) + 144,
    sequence: 0xfffffffe,
    nonceSecret: scalarFromHex(canonicalSecrets.childRefundNonce, 'child refund nonce'),
  });
  const childRefundEarlyMempool = await testMempool(childRefund.rawTxHex);
  assert.equal(childRefundEarlyMempool.allowed, false);

  const fundingHex = rawTxArtifact(outDir, 'public-01-parent-funding', funding.rawTxHex);
  const parentCetHex = rawTxArtifact(outDir, 'public-02-parent-cet', parentCompleted.rawTxHex);
  const bridgeHex = rawTxArtifact(outDir, 'public-03-bridge', bridgeCompleted.rawTxHex);
  const childPreparedCetHex = rawTxArtifact(outDir, 'public-04-child-prepared-cet-unsigned', childCetPending.unsignedTxHex);
  const childRefundHex = rawTxArtifact(outDir, 'public-05-child-refund-timelocked', childRefund.rawTxHex);

  const checks = {
    publicNetwork: network === 'signet' || network === 'testnet' || network === 'testnet4',
    fundingConfirmed: funding.confirmations >= minConfirmations,
    parentCetAccepted: parentBroadcast.mempoolAccept.allowed,
    parentCetConfirmed: parentBroadcast.confirmation.confirmations >= minConfirmations,
    parentWrongOutcomeRejected: true,
    bridgeAdaptorPreResolutionNotValidSignature: bridgePreResolutionSignatureVerifies === false,
    bridgeWrongScalarRejected,
    bridgeAccepted: bridgeBroadcast.mempoolAccept.allowed,
    bridgeConfirmed: bridgeBroadcast.confirmation.confirmations >= minConfirmations,
    bridgeCreatesChildFunding:
      bytesToHex(childFundingOutput.script) === childFundingWallet.scriptPubKeyHex,
    childPreparedCetAdaptorOnly:
      childCetPending.adaptor.verifiesAdaptor && childCetPreResolutionSignatureVerifies === false,
    childRefundEarlyRejected: childRefundEarlyMempool.allowed === false,
  };
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  assert.deepEqual(failed, [], `failed public evidence checks: ${failed.join(', ')}`);

  const bundlePath = path.join(outDir, 'public-activation-evidence-bundle.json');
  const bundle = {
    kind: 'niti.v0_1_public_testnet_signet_activation_evidence_bundle.v1',
    issue: 153,
    parentEpic: 56,
    network,
    boundary: 'Public signet/testnet execution with Bitcoin Core RPC broadcast, mempool checks, and observed confirmations; not regtest mining',
    generatedAt: new Date().toISOString(),
    bitcoinCore: {
      chain: chainInfo.chain,
      blocks: chainInfo.blocks,
      version: networkInfo.version,
      subversion: networkInfo.subversion,
    },
    fundingRequest: {
      address: parentFundingWallet.address,
      scriptPubKeyHex: parentFundingWallet.scriptPubKeyHex,
      minimumValueSat: canonicalPublicActivationMinimumValueSat().toString(),
      deterministicFixtureValueSat: canonicalAmounts.parentFundingValueSat.toString(),
    },
    oracle: {
      eventId: canonicalOutcomes.eventId,
      activatingOutcome: canonicalOutcomes.activating,
      wrongOutcome: canonicalOutcomes.wrong,
      noncePointCompressedHex: activatingPrepared.noncePointCompressedHex,
      oraclePublicCompressedHex: activatingPrepared.oraclePublicCompressedHex,
      activatingAttestationPointCompressedHex: activatingPrepared.attestationPointCompressedHex,
      wrongAttestationPointCompressedHex: wrongPrepared.attestationPointCompressedHex,
      activatingAttestationSecretHex: activatingAttestation.attestationSecretHex,
      activatingSignatureVerifies: activatingAttestation.verifies,
      wrongSignatureVerifies: wrongAttestation.verifies,
    },
    activationPath: {
      parentFunding: {
        txid: funding.txid,
        vout: funding.vout,
        valueSat: funding.valueSat.toString(),
        confirmations: funding.confirmations,
        scriptPubKeyHex: funding.scriptPubKeyHex,
        address: parentFundingWallet.address,
        signatureState: 'externally-funded-public-network-transaction',
        rawTx: fundingHex,
      },
      parentCet: {
        txid: parentCompleted.txid,
        input: parentPending.input,
        output: {
          vout: 0,
          valueSat: parentEdgeOutput.value.toString(),
          scriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
        },
        adaptor: parentPending.adaptor,
        signatureState: 'completed-schnorr-signature-after-parent-oracle-attestation',
        completedSignatureHex: parentCompleted.completedSignatureHex,
        rawTx: parentCetHex,
        mempoolAccept: parentBroadcast.mempoolAccept,
        broadcastTxid: parentBroadcast.broadcastTxid,
        confirmation: parentBroadcast.confirmation,
      },
      bridge: {
        txid: bridgeCompleted.txid,
        input: bridgePending.input,
        output: {
          vout: 0,
          valueSat: childFundingOutput.value.toString(),
          scriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
          address: childFundingWallet.address,
        },
        adaptor: {
          ...bridgePending.adaptor,
          signatureState: 'adaptor-signature-not-valid-bitcoin-witness-before-parent-oracle-attestation',
          preResolutionSignatureHex: bridgePreResolutionSignatureHex,
          preResolutionSignatureVerifies: bridgePreResolutionSignatureVerifies,
        },
        completion: {
          signatureState: 'completed-schnorr-signature-after-parent-oracle-attestation',
          completedSignatureHex: bridgeCompleted.completedSignatureHex,
          completedSignatureVerifies: bridgeCompleted.verifies,
          extractedSecretHex: bridgeCompleted.extractedSecretHex,
        },
        wrongScalar: {
          attestationPointCompressedHex: wrongAttestation.attestationPointCompressedHex,
          rejected: bridgeWrongScalarRejected,
        },
        rawTx: bridgeHex,
        mempoolAccept: bridgeBroadcast.mempoolAccept,
        broadcastTxid: bridgeBroadcast.broadcastTxid,
        confirmation: bridgeBroadcast.confirmation,
      },
      childPreparedCet: {
        txidNoWitness: childCetPending.txidNoWitness,
        input: childCetPending.input,
        destinationAddress: childCetPending.destinationAddress,
        sendValueSat: childCetPending.sendValueSat,
        feeSat: childCetPending.feeSat,
        adaptor: {
          ...childCetPending.adaptor,
          signatureState: 'adaptor-signature-not-valid-bitcoin-witness-before-child-oracle-attestation',
          preResolutionSignatureHex: childCetPreResolutionSignatureHex,
          preResolutionSignatureVerifies: childCetPreResolutionSignatureVerifies,
        },
        rawTx: childPreparedCetHex,
      },
      childRefund: {
        txid: childRefund.txid,
        input: childRefund.input,
        output: childRefund.output,
        locktime: childRefund.locktime,
        sequence: childRefund.sequence,
        signatureState: 'complete-schnorr-signature-but-timelocked',
        signatureVerifies: childRefund.signature.verifies,
        earlyMempoolAccept: childRefundEarlyMempool,
        rawTx: childRefundHex,
      },
    },
    checks,
  };
  writeJson(bundlePath, bundle);
  console.log(`wrote ${relativeFromRepo(bundlePath)}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = stringArg(args, '--mode', 'funding-request');
  if (mode === 'funding-request') {
    fundingRequest(args);
    return;
  }
  if (mode === 'execute-activation') {
    await executeActivation(args);
    return;
  }
  throw new Error('--mode must be funding-request or execute-activation');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
