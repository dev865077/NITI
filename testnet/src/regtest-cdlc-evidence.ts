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
  type BitcoinNetworkName,
  type PendingTaprootAdaptorSpend,
  type TaprootWallet,
} from './taproot.js';
import {
  canonicalAmounts,
  canonicalOutcomes,
  canonicalSecrets,
  canonicalWallets,
} from './cdlc-scenario.js';
import { readRpcConfig, rpcCall } from './rpc.js';

const network: BitcoinNetworkName = 'regtest';
const satoshisPerBtc = 100_000_000n;

interface RawTxVerbose {
  txid: string;
  hash: string;
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

interface FundingOutput {
  txid: string;
  vout: number;
  valueSat: bigint;
  scriptPubKeyHex: string;
  rawTxHex: string;
  confirmation: ConfirmationEvidence;
}

interface ConfirmationEvidence {
  txid: string;
  blockHash: string;
  blockHeight: number;
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

function btcAmountString(sats: bigint): string {
  const whole = sats / satoshisPerBtc;
  const fractional = (sats % satoshisPerBtc).toString().padStart(8, '0');
  return `${whole}.${fractional}`;
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

function outputMatchingScript(rawTxHex: string, scriptPubKeyHex: string): {
  vout: number;
  valueSat: bigint;
} {
  const tx = Transaction.fromHex(rawTxHex);
  for (const [index, output] of tx.outs.entries()) {
    if (bytesToHex(output.script) === scriptPubKeyHex) {
      return { vout: index, valueSat: output.value };
    }
  }
  throw new Error(`could not find output script ${scriptPubKeyHex}`);
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

async function getRawTx(txid: string): Promise<RawTxVerbose> {
  return rpcCall<RawTxVerbose>(readRpcConfig(), 'getrawtransaction', [txid, true]);
}

async function getConfirmation(txid: string): Promise<ConfirmationEvidence> {
  const raw = await getRawTx(txid);
  assert.equal(raw.txid, txid);
  assert.ok(raw.blockhash, `tx ${txid} is not confirmed`);
  const block = await rpcCall<BlockVerbose>(readRpcConfig(), 'getblock', [raw.blockhash]);
  return {
    txid,
    blockHash: block.hash,
    blockHeight: block.height,
    confirmations: raw.confirmations ?? 0,
  };
}

async function mine(blocks = 1): Promise<string[]> {
  const address = await rpcCall<string>(
    readRpcConfig(),
    'getnewaddress',
    ['niti-evidence-mining', 'bech32m'],
  );
  return rpcCall<string[]>(readRpcConfig(), 'generatetoaddress', [blocks, address]);
}

async function fundAddress(address: string, scriptPubKeyHex: string): Promise<FundingOutput> {
  const amountSat = canonicalAmounts.parentFundingValueSat;
  const txid = await rpcCall<string>(
    readRpcConfig(),
    'sendtoaddress',
    [address, btcAmountString(amountSat)],
  );
  await mine(1);
  const raw = await getRawTx(txid);
  const output = outputMatchingScript(raw.hex, scriptPubKeyHex);
  assert.equal(output.valueSat, amountSat);
  return {
    txid,
    vout: output.vout,
    valueSat: output.valueSat,
    scriptPubKeyHex,
    rawTxHex: raw.hex,
    confirmation: await getConfirmation(txid),
  };
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

async function broadcastAndMine(rawTxHex: string, expectedTxid: string): Promise<{
  mempoolAccept: MempoolAccept;
  broadcastTxid: string;
  confirmation: ConfirmationEvidence;
}> {
  const mempoolAccept = await testMempool(rawTxHex);
  assert.equal(mempoolAccept.allowed, true, mempoolAccept['reject-reason']);
  const broadcastTxid = await rpcCall<string>(
    readRpcConfig(),
    'sendrawtransaction',
    [rawTxHex],
  );
  assert.equal(broadcastTxid, expectedTxid);
  await mine(1);
  return {
    mempoolAccept,
    broadcastTxid,
    confirmation: await getConfirmation(expectedTxid),
  };
}

async function currentHeight(): Promise<number> {
  return rpcCall<number>(readRpcConfig(), 'getblockcount');
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

function markdownTable(rows: Array<[string, string, string, string]>): string {
  return [
    '| Artifact | Txid | Signature state | File |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row[0]} | \`${row[1]}\` | ${row[2]} | \`${row[3]}\` |`),
  ].join('\n');
}

async function main(): Promise<void> {
  const outDir = path.resolve(stringArg(
    process.argv.slice(2),
    '--out-dir',
    'docs/evidence/regtest-cdlc',
  ));
  fs.mkdirSync(outDir, { recursive: true });

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

  assert.equal(activatingAttestation.verifies, true);
  assert.equal(wrongAttestation.verifies, true);
  assert.notEqual(
    activatingPrepared.attestationPointCompressedHex,
    wrongPrepared.attestationPointCompressedHex,
  );

  const blockchainInfo = await rpcCall<Record<string, unknown>>(
    readRpcConfig(),
    'getblockchaininfo',
  );
  const networkInfo = await rpcCall<Record<string, unknown>>(
    readRpcConfig(),
    'getnetworkinfo',
  );
  assert.equal(blockchainInfo.chain, 'regtest');
  const initialHeight = await currentHeight();

  const activationFunding = await fundAddress(
    parentFundingWallet.address,
    parentFundingWallet.scriptPubKeyHex,
  );
  const activationParentPending = buildSpendWithDeterministicNonce({
    signerWallet: parentFundingWallet,
    utxo: activationFunding,
    destinationAddress: bridgeSignerWallet.address,
    feeSat: canonicalAmounts.parentCetFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  assert.equal(activationParentPending.adaptor.verifiesAdaptor, true);
  assert.throws(
    () => completeTaprootAdaptorSpend({
      pending: activationParentPending,
      attestationSecret: scalarFromHex(wrongAttestation.attestationSecretHex, 'wrong scalar'),
    }),
    /completed adaptor signature does not verify/,
  );
  const activationParentCompleted = completeTaprootAdaptorSpend({
    pending: activationParentPending,
    attestationSecret: scalarFromHex(
      activatingAttestation.attestationSecretHex,
      'activating scalar',
    ),
  });
  assert.equal(activationParentCompleted.verifies, true);
  const activationParentBroadcast = await broadcastAndMine(
    activationParentCompleted.rawTxHex,
    activationParentCompleted.txid,
  );
  const activationParentTx = Transaction.fromHex(activationParentCompleted.rawTxHex);
  assert.equal(inputTxid(activationParentTx, 0), activationFunding.txid);
  assert.equal(inputVout(activationParentTx, 0), activationFunding.vout);
  const activationParentEdgeOutput = outputAt(activationParentTx, 0);
  assert.equal(bytesToHex(activationParentEdgeOutput.script), bridgeSignerWallet.scriptPubKeyHex);

  const activationBridgePending = buildSpendWithDeterministicNonce({
    signerWallet: bridgeSignerWallet,
    utxo: {
      txid: activationParentCompleted.txid,
      vout: 0,
      valueSat: activationParentEdgeOutput.value,
    },
    destinationAddress: childFundingWallet.address,
    feeSat: canonicalAmounts.bridgeFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const bridgePreResolutionSignatureHex =
    `${activationBridgePending.adaptor.adaptedNonceXOnlyHex}`
    + activationBridgePending.adaptor.adaptorSignatureScalarHex;
  const bridgePreResolutionSignatureVerifies = verifyBip340Signature({
    signatureHex: bridgePreResolutionSignatureHex,
    messageHashHex: activationBridgePending.sighashHex,
    publicKeyXOnlyHex: activationBridgePending.adaptor.signerPublicXOnlyHex,
  });
  assert.equal(bridgePreResolutionSignatureVerifies, false);
  let bridgeWrongScalarRejected = false;
  try {
    completeTaprootAdaptorSpend({
      pending: activationBridgePending,
      attestationSecret: scalarFromHex(wrongAttestation.attestationSecretHex, 'wrong scalar'),
    });
  } catch {
    bridgeWrongScalarRejected = true;
  }
  assert.equal(bridgeWrongScalarRejected, true);
  const activationBridgeCompleted = completeTaprootAdaptorSpend({
    pending: activationBridgePending,
    attestationSecret: scalarFromHex(
      activatingAttestation.attestationSecretHex,
      'activating scalar',
    ),
  });
  assert.equal(activationBridgeCompleted.verifies, true);
  const activationBridgeBroadcast = await broadcastAndMine(
    activationBridgeCompleted.rawTxHex,
    activationBridgeCompleted.txid,
  );
  const activationBridgeTx = Transaction.fromHex(activationBridgeCompleted.rawTxHex);
  assert.equal(inputTxid(activationBridgeTx, 0), activationParentCompleted.txid);
  assert.equal(inputVout(activationBridgeTx, 0), 0);
  const childFundingOutput = outputAt(activationBridgeTx, 0);
  assert.equal(bytesToHex(childFundingOutput.script), childFundingWallet.scriptPubKeyHex);

  const childFundingUtxo = {
    txid: activationBridgeCompleted.txid,
    vout: 0,
    valueSat: childFundingOutput.value,
  };
  const childCetPending = buildSpendWithDeterministicNonce({
    signerWallet: childFundingWallet,
    utxo: childFundingUtxo,
    destinationAddress: parentFundingWallet.address,
    feeSat: canonicalAmounts.childCetFeeSat,
    adaptorPointHex: childPrepared.attestationPointCompressedHex,
  });
  assert.equal(childCetPending.adaptor.verifiesAdaptor, true);
  const childCetPreResolutionSignatureHex =
    `${childCetPending.adaptor.adaptedNonceXOnlyHex}`
    + childCetPending.adaptor.adaptorSignatureScalarHex;
  const childCetPreResolutionSignatureVerifies = verifyBip340Signature({
    signatureHex: childCetPreResolutionSignatureHex,
    messageHashHex: childCetPending.sighashHex,
    publicKeyXOnlyHex: childCetPending.adaptor.signerPublicXOnlyHex,
  });
  assert.equal(childCetPreResolutionSignatureVerifies, false);

  const childRefundLocktime = await currentHeight() + 1;
  const childRefund = buildTaprootKeySpend({
    network,
    signerOutputSecret: scalarFromHex(childFundingWallet.outputSecretHex, 'child output secret'),
    signerScriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
    utxo: childFundingUtxo,
    destinationAddress: childFundingWallet.address,
    outputValueSat: childFundingOutput.value - canonicalAmounts.childRefundFeeSat,
    locktime: childRefundLocktime,
    sequence: 0xfffffffe,
    nonceSecret: scalarFromHex(canonicalSecrets.childRefundNonce, 'child refund nonce'),
  });
  const childRefundEarlyMempool = await testMempool(childRefund.rawTxHex);
  assert.equal(childRefundEarlyMempool.allowed, false);

  const timeoutFunding = await fundAddress(
    parentFundingWallet.address,
    parentFundingWallet.scriptPubKeyHex,
  );
  const timeoutParentPending = buildSpendWithDeterministicNonce({
    signerWallet: parentFundingWallet,
    utxo: timeoutFunding,
    destinationAddress: bridgeSignerWallet.address,
    feeSat: canonicalAmounts.parentCetFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const timeoutParentCompleted = completeTaprootAdaptorSpend({
    pending: timeoutParentPending,
    attestationSecret: scalarFromHex(
      activatingAttestation.attestationSecretHex,
      'activating scalar',
    ),
  });
  const timeoutParentBroadcast = await broadcastAndMine(
    timeoutParentCompleted.rawTxHex,
    timeoutParentCompleted.txid,
  );
  const timeoutParentTx = Transaction.fromHex(timeoutParentCompleted.rawTxHex);
  const timeoutEdgeOutput = outputAt(timeoutParentTx, 0);
  const timeoutRefundLocktime = await currentHeight() + 1;
  const timeoutRefund = buildTaprootKeySpend({
    network,
    signerOutputSecret: scalarFromHex(bridgeSignerWallet.outputSecretHex, 'bridge signer output secret'),
    signerScriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
    utxo: {
      txid: timeoutParentCompleted.txid,
      vout: 0,
      valueSat: timeoutEdgeOutput.value,
    },
    destinationAddress: parentFundingWallet.address,
    outputValueSat: timeoutEdgeOutput.value - canonicalAmounts.bridgeRefundFeeSat,
    locktime: timeoutRefundLocktime,
    sequence: 0xfffffffe,
    nonceSecret: scalarFromHex(canonicalSecrets.bridgeRefundNonce, 'bridge refund nonce'),
  });
  const timeoutRefundEarlyMempool = await testMempool(timeoutRefund.rawTxHex);
  assert.equal(timeoutRefundEarlyMempool.allowed, false);
  await mine(1);
  const timeoutRefundMatureMempool = await testMempool(timeoutRefund.rawTxHex);
  assert.equal(timeoutRefundMatureMempool.allowed, true, timeoutRefundMatureMempool['reject-reason']);
  const timeoutRefundBroadcast = await broadcastAndMine(timeoutRefund.rawTxHex, timeoutRefund.txid);

  const activationFundingHex = rawTxArtifact(outDir, 'activation-01-parent-funding', activationFunding.rawTxHex);
  const activationParentCetHex = rawTxArtifact(outDir, 'activation-02-parent-cet', activationParentCompleted.rawTxHex);
  const activationBridgeHex = rawTxArtifact(outDir, 'activation-03-bridge', activationBridgeCompleted.rawTxHex);
  const childPreparedCetHex = rawTxArtifact(outDir, 'activation-04-child-prepared-cet-unsigned', childCetPending.unsignedTxHex);
  const childRefundHex = rawTxArtifact(outDir, 'activation-05-child-refund-timelocked', childRefund.rawTxHex);
  const timeoutFundingHex = rawTxArtifact(outDir, 'timeout-01-parent-funding', timeoutFunding.rawTxHex);
  const timeoutParentCetHex = rawTxArtifact(outDir, 'timeout-02-parent-cet', timeoutParentCompleted.rawTxHex);
  const timeoutRefundHex = rawTxArtifact(outDir, 'timeout-03-edge-timeout-refund', timeoutRefund.rawTxHex);

  const checks = {
    bitcoinCoreRegtest: blockchainInfo.chain === 'regtest',
    activationFundingConfirmed: activationFunding.confirmation.confirmations >= 1,
    activationParentCetAccepted: activationParentBroadcast.mempoolAccept.allowed,
    activationParentCetConfirmed: activationParentBroadcast.confirmation.confirmations >= 1,
    parentWrongOutcomeRejected: true,
    bridgeAdaptorPreResolutionNotValidSignature: bridgePreResolutionSignatureVerifies === false,
    bridgeWrongScalarRejected,
    bridgeAccepted: activationBridgeBroadcast.mempoolAccept.allowed,
    bridgeConfirmed: activationBridgeBroadcast.confirmation.confirmations >= 1,
    bridgeCreatesChildFunding:
      bytesToHex(childFundingOutput.script) === childFundingWallet.scriptPubKeyHex,
    childPreparedCetAdaptorOnly: childCetPending.adaptor.verifiesAdaptor
      && childCetPreResolutionSignatureVerifies === false,
    childRefundEarlyRejected: childRefundEarlyMempool.allowed === false,
    timeoutFundingConfirmed: timeoutFunding.confirmation.confirmations >= 1,
    timeoutParentCetConfirmed: timeoutParentBroadcast.confirmation.confirmations >= 1,
    timeoutRefundEarlyRejected: timeoutRefundEarlyMempool.allowed === false,
    timeoutRefundMatureAccepted: timeoutRefundMatureMempool.allowed === true,
    timeoutRefundConfirmed: timeoutRefundBroadcast.confirmation.confirmations >= 1,
  };
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  assert.deepEqual(failed, [], `failed evidence checks: ${failed.join(', ')}`);

  const finalHeight = await currentHeight();
  const bundlePath = path.join(outDir, 'tx-evidence-bundle.json');
  const bundle = {
    kind: 'niti.v0_1_testnet_signet_tx_evidence_bundle.v1',
    issue: 132,
    network,
    boundary: 'Bitcoin Core regtest execution with real RPC broadcast, mempool checks, mining, and confirmations; not public testnet/signet',
    generatedAt: new Date().toISOString(),
    bitcoinCore: {
      chain: blockchainInfo.chain,
      version: networkInfo.version,
      subversion: networkInfo.subversion,
      initialHeight,
      finalHeight,
    },
    replay: {
      commands: [
        'scripts/regtest-env.sh start',
        'scripts/regtest-env.sh env > .env',
        'npm run regtest:cdlc-evidence -- --out-dir docs/evidence/regtest-cdlc',
        'npm run test:evidence-bundle -- --bundle docs/evidence/regtest-cdlc/tx-evidence-bundle.json',
      ],
    },
    redaction: {
      privateKeysIncluded: false,
      adaptorNonceSecretsIncluded: false,
      note: 'The oracle attestation scalar is included only after the attested parent outcome, matching DLC publication semantics.',
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
        txid: activationFunding.txid,
        vout: activationFunding.vout,
        valueSat: activationFunding.valueSat.toString(),
        scriptPubKeyHex: activationFunding.scriptPubKeyHex,
        address: parentFundingWallet.address,
        signatureState: 'bitcoin-core-wallet-signed-funding-transaction',
        rawTx: activationFundingHex,
        confirmation: activationFunding.confirmation,
      },
      parentCet: {
        txid: activationParentCompleted.txid,
        input: activationParentPending.input,
        output: {
          vout: 0,
          valueSat: activationParentEdgeOutput.value.toString(),
          scriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
        },
        adaptor: activationParentPending.adaptor,
        signatureState: 'completed-schnorr-signature-after-parent-oracle-attestation',
        completedSignatureHex: activationParentCompleted.completedSignatureHex,
        extractedSecretHex: activationParentCompleted.extractedSecretHex,
        rawTx: activationParentCetHex,
        mempoolAccept: activationParentBroadcast.mempoolAccept,
        confirmation: activationParentBroadcast.confirmation,
      },
      bridge: {
        txid: activationBridgeCompleted.txid,
        input: activationBridgePending.input,
        output: {
          vout: 0,
          valueSat: childFundingOutput.value.toString(),
          scriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
          address: childFundingWallet.address,
        },
        adaptor: {
          ...activationBridgePending.adaptor,
          signatureState: 'adaptor-signature-not-valid-bitcoin-witness-before-parent-oracle-attestation',
          preResolutionSignatureHex: bridgePreResolutionSignatureHex,
          preResolutionSignatureVerifies: bridgePreResolutionSignatureVerifies,
        },
        completion: {
          signatureState: 'completed-schnorr-signature-after-parent-oracle-attestation',
          completedSignatureHex: activationBridgeCompleted.completedSignatureHex,
          completedSignatureVerifies: activationBridgeCompleted.verifies,
          extractedSecretHex: activationBridgeCompleted.extractedSecretHex,
        },
        wrongScalar: {
          attestationPointCompressedHex: wrongAttestation.attestationPointCompressedHex,
          rejected: bridgeWrongScalarRejected,
        },
        rawTx: activationBridgeHex,
        mempoolAccept: activationBridgeBroadcast.mempoolAccept,
        confirmation: activationBridgeBroadcast.confirmation,
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
    timeoutPath: {
      parentFunding: {
        txid: timeoutFunding.txid,
        vout: timeoutFunding.vout,
        valueSat: timeoutFunding.valueSat.toString(),
        scriptPubKeyHex: timeoutFunding.scriptPubKeyHex,
        address: parentFundingWallet.address,
        signatureState: 'bitcoin-core-wallet-signed-funding-transaction',
        rawTx: timeoutFundingHex,
        confirmation: timeoutFunding.confirmation,
      },
      parentCet: {
        txid: timeoutParentCompleted.txid,
        input: timeoutParentPending.input,
        output: {
          vout: 0,
          valueSat: timeoutEdgeOutput.value.toString(),
          scriptPubKeyHex: bridgeSignerWallet.scriptPubKeyHex,
        },
        signatureState: 'completed-schnorr-signature-after-parent-oracle-attestation',
        completedSignatureHex: timeoutParentCompleted.completedSignatureHex,
        rawTx: timeoutParentCetHex,
        mempoolAccept: timeoutParentBroadcast.mempoolAccept,
        confirmation: timeoutParentBroadcast.confirmation,
      },
      edgeTimeoutRefund: {
        txid: timeoutRefund.txid,
        input: timeoutRefund.input,
        output: timeoutRefund.output,
        locktime: timeoutRefund.locktime,
        sequence: timeoutRefund.sequence,
        signatureState: 'complete-schnorr-signature-with-absolute-height-timeout',
        signatureVerifies: timeoutRefund.signature.verifies,
        earlyMempoolAccept: timeoutRefundEarlyMempool,
        matureMempoolAccept: timeoutRefundMatureMempool,
        rawTx: timeoutRefundHex,
        broadcastTxid: timeoutRefundBroadcast.broadcastTxid,
        confirmation: timeoutRefundBroadcast.confirmation,
      },
    },
    checks,
  };

  writeJson(bundlePath, bundle);

  const readmeRows: Array<[string, string, string, string]> = [
    ['Activation parent funding', activationFunding.txid, 'Bitcoin Core wallet signed', activationFundingHex.path],
    ['Activation parent CET', activationParentCompleted.txid, 'Completed Schnorr signature', activationParentCetHex.path],
    ['Activation bridge', activationBridgeCompleted.txid, 'Completed adaptor into Schnorr signature', activationBridgeHex.path],
    ['Child prepared CET', childCetPending.txidNoWitness, 'Adaptor only, not a valid witness yet', childPreparedCetHex.path],
    ['Child refund', childRefund.txid, 'Complete but timelocked', childRefundHex.path],
    ['Timeout parent funding', timeoutFunding.txid, 'Bitcoin Core wallet signed', timeoutFundingHex.path],
    ['Timeout parent CET', timeoutParentCompleted.txid, 'Completed Schnorr signature', timeoutParentCetHex.path],
    ['Timeout edge refund', timeoutRefund.txid, 'Complete and timeout-matured on regtest', timeoutRefundHex.path],
  ];
  const readme = `# Regtest cDLC Transaction Evidence

This bundle is generated by Bitcoin Core regtest RPC. It is not public
testnet/signet evidence. It does use real \`bitcoind\` mempool checks,
\`sendrawtransaction\`, block generation, and confirmations.

Boundary:

\`\`\`text
${bundle.boundary}
\`\`\`

Replay:

\`\`\`sh
scripts/regtest-env.sh start
scripts/regtest-env.sh env > .env
npm run regtest:cdlc-evidence -- --out-dir docs/evidence/regtest-cdlc
npm run test:evidence-bundle -- --bundle docs/evidence/regtest-cdlc/tx-evidence-bundle.json
\`\`\`

Evidence bundle:

\`\`\`text
docs/evidence/regtest-cdlc/tx-evidence-bundle.json
\`\`\`

${markdownTable(readmeRows)}

Important distinctions:

- Parent CET and bridge transactions contain completed Schnorr signatures after
  the parent oracle scalar is published.
- Child prepared CET contains only an adaptor signature and is explicitly not a
  valid Bitcoin witness before the child oracle attestation.
- Child refund is fully signed but timelocked and rejected by regtest mempool
  before maturity.
- Timeout path uses a separate parent funding output so the edge refund can be
  rejected before maturity, accepted after maturity, broadcast, mined, and
  confirmed without conflicting with the activation path.
`;
  writeText(path.join(outDir, 'README.md'), readme);
  console.log(`wrote ${relativeFromRepo(bundlePath)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
