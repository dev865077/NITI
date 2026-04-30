import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Transaction } from 'bitcoinjs-lib';
import { bytesToHex } from './bytes.js';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  pointFromCompressed,
  randomScalar,
  scalarFromHex,
  scalarToHex,
  verifyBip340Signature,
} from './secp.js';
import {
  buildTaprootAdaptorSpend,
  buildTaprootKeySpend,
  completeTaprootAdaptorSpend,
  deriveTaprootWallet,
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
  backend?: string;
  note?: string;
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

interface MainnetLiveRunPlan {
  kind: 'niti.v0_1_mainnet_live_run_private_plan.v1';
  network: 'mainnet';
  createdAt: string;
  warning: string;
  secrets: {
    parentFunding: string;
    bridgeSigner: string;
    childFunding: string;
    oracle: string;
    oracleNonce: string;
    childOracle: string;
    childOracleNonce: string;
    childRefundNonce: string;
  };
}

interface LiveRunWallets {
  parentFunding: TaprootWallet;
  bridgeSigner: TaprootWallet;
  childFunding: TaprootWallet;
}

interface TxOutResponse {
  bestblock: string;
  confirmations: number;
  value: number;
  scriptPubKey: {
    hex: string;
  };
  coinbase: boolean;
}

const publicBundleKind = 'niti.v0_1_public_testnet_signet_activation_evidence_bundle.v1';
const lazyPublicBundleKind = 'niti.v0_2_lazy_public_testnet_signet_activation_evidence_bundle.v1';
type PublicNetworkBackend = 'rpc' | 'esplora';

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

function optionalStringArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
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
  if (!['mainnet', 'signet', 'testnet', 'testnet4'].includes(network)) {
    throw new Error('--network must be mainnet, signet, testnet, or testnet4');
  }
  resolveNetwork(network);
  return network;
}

function backendArg(args: string[], network: BitcoinNetworkName): PublicNetworkBackend {
  const explicit = optionalStringArg(args, '--backend');
  if (explicit !== undefined) {
    if (explicit !== 'rpc' && explicit !== 'esplora') {
      throw new Error('--backend must be rpc or esplora');
    }
    if (
      network === 'mainnet'
      && explicit === 'esplora'
      && !hasFlag(args, '--mainnet-esplora-i-understand')
    ) {
      throw new Error('mainnet Esplora backend requires --mainnet-esplora-i-understand');
    }
    return explicit;
  }
  if (network !== 'mainnet' && !process.env.BITCOIN_RPC_URL) {
    return 'esplora';
  }
  return 'rpc';
}

function bigintArg(args: string[], name: string): bigint {
  const value = stringArg(args, name);
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${name} must be an unsigned integer`);
  }
  return BigInt(value);
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

function writePrivateJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`);
}

function relativeFromRepo(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}

function currentGitHead(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unavailable';
  }
}

function currentGitStatus(): string {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return status.length === 0 ? 'clean' : 'dirty';
  } catch {
    return 'unavailable';
  }
}

function explorerTxUrl(network: BitcoinNetworkName, txid: string): string {
  if (network === 'signet') {
    return `https://mempool.space/signet/tx/${txid}`;
  }
  if (network === 'testnet4') {
    return `https://mempool.space/testnet4/tx/${txid}`;
  }
  if (network === 'testnet') {
    return `https://mempool.space/testnet/tx/${txid}`;
  }
  return `https://mempool.space/tx/${txid}`;
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

function generateMainnetPlan(): MainnetLiveRunPlan {
  return {
    kind: 'niti.v0_1_mainnet_live_run_private_plan.v1',
    network: 'mainnet',
    createdAt: new Date().toISOString(),
    warning: 'PRIVATE MAINNET TEST SECRETS. Keep this file out of git. Fund only the listed parentFunding address with the smallest amount required for the live run.',
    secrets: {
      parentFunding: scalarToHex(randomScalar()),
      bridgeSigner: scalarToHex(randomScalar()),
      childFunding: scalarToHex(randomScalar()),
      oracle: scalarToHex(randomScalar()),
      oracleNonce: scalarToHex(randomScalar()),
      childOracle: scalarToHex(randomScalar()),
      childOracleNonce: scalarToHex(randomScalar()),
      childRefundNonce: scalarToHex(randomScalar()),
    },
  };
}

function parseMainnetPlan(value: unknown): MainnetLiveRunPlan {
  if (!value || typeof value !== 'object') {
    throw new Error('mainnet plan must be an object');
  }
  const candidate = value as MainnetLiveRunPlan;
  if (candidate.kind !== 'niti.v0_1_mainnet_live_run_private_plan.v1') {
    throw new Error('unsupported mainnet plan kind');
  }
  if (candidate.network !== 'mainnet') {
    throw new Error('mainnet plan network must be mainnet');
  }
  for (const [name, secret] of Object.entries(candidate.secrets)) {
    scalarFromHex(secret, `mainnet plan ${name}`);
  }
  return candidate;
}

function readMainnetPlan(filePath: string): MainnetLiveRunPlan {
  return parseMainnetPlan(readJson(filePath));
}

function walletsFromMainnetPlan(plan: MainnetLiveRunPlan): LiveRunWallets {
  return {
    parentFunding: deriveMainnetWallet(plan.secrets.parentFunding),
    bridgeSigner: deriveMainnetWallet(plan.secrets.bridgeSigner),
    childFunding: deriveMainnetWallet(plan.secrets.childFunding),
  };
}

function deriveMainnetWallet(secretHex: string): TaprootWallet {
  return deriveTaprootWallet({
    internalSecret: scalarFromHex(secretHex, 'mainnet wallet secret'),
    network: 'mainnet',
  });
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

function esploraBaseUrl(network: BitcoinNetworkName): string {
  if (network === 'mainnet') {
    return 'https://mempool.space/api';
  }
  if (network === 'signet') {
    return 'https://mempool.space/signet/api';
  }
  if (network === 'testnet') {
    return 'https://mempool.space/testnet/api';
  }
  if (network === 'testnet4') {
    return 'https://mempool.space/testnet4/api';
  }
  throw new Error(`no Esplora backend configured for ${network}`);
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text}`);
  }
  return text;
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}

async function getRawTxWithBackend(
  backend: PublicNetworkBackend,
  network: BitcoinNetworkName,
  txid: string,
): Promise<RawTxVerbose> {
  if (backend === 'rpc') {
    return getRawTx(txid);
  }
  const base = esploraBaseUrl(network);
  const [hex, tx] = await Promise.all([
    fetchText(`${base}/tx/${txid}/hex`),
    fetchJson<{
      txid: string;
      status: {
        confirmed: boolean;
        block_hash?: string;
      };
    }>(`${base}/tx/${txid}`),
  ]);
  return {
    txid: tx.txid,
    hex: hex.trim(),
    confirmations: tx.status.confirmed ? 1 : 0,
    ...(tx.status.block_hash === undefined ? {} : { blockhash: tx.status.block_hash }),
  };
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

async function getConfirmationWithBackend(
  backend: PublicNetworkBackend,
  network: BitcoinNetworkName,
  txid: string,
): Promise<ConfirmationEvidence | null> {
  if (backend === 'rpc') {
    return getConfirmation(txid);
  }
  const base = esploraBaseUrl(network);
  let tx: {
    txid: string;
    status: {
      confirmed: boolean;
      block_height?: number;
      block_hash?: string;
    };
  };
  try {
    tx = await fetchJson<{
      txid: string;
      status: {
        confirmed: boolean;
        block_height?: number;
        block_hash?: string;
      };
    }>(`${base}/tx/${txid}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('HTTP 404')) {
      return null;
    }
    throw error;
  }
  assert.equal(tx.txid, txid);
  if (!tx.status.confirmed || tx.status.block_hash === undefined || tx.status.block_height === undefined) {
    return null;
  }
  const tipHeight = Number(await fetchText(`${base}/blocks/tip/height`));
  return {
    txid,
    blockHash: tx.status.block_hash,
    blockHeight: tx.status.block_height,
    confirmations: Math.max(0, tipHeight - tx.status.block_height + 1),
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

async function waitForConfirmationWithBackend(
  backend: PublicNetworkBackend,
  network: BitcoinNetworkName,
  txid: string,
  minConfirmations: number,
  timeoutSeconds: number,
): Promise<ConfirmationEvidence> {
  if (backend === 'rpc') {
    return waitForConfirmation(txid, minConfirmations, timeoutSeconds);
  }
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() <= deadline) {
    const confirmation = await getConfirmationWithBackend(backend, network, txid);
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

async function testMempoolWithBackend(
  backend: PublicNetworkBackend,
  rawTxHex: string,
): Promise<MempoolAccept> {
  if (backend === 'rpc') {
    return testMempool(rawTxHex);
  }
  return {
    txid: Transaction.fromHex(rawTxHex).getId(),
    wtxid: 'unavailable-esplora',
    allowed: true,
    backend,
    note: 'Esplora does not expose testmempoolaccept; broadcast response is the network-acceptance evidence.',
  };
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

async function broadcastAndConfirmWithBackend(input: {
  backend: PublicNetworkBackend;
  network: BitcoinNetworkName;
  rawTxHex: string;
  expectedTxid: string;
  minConfirmations: number;
  waitSeconds: number;
}): Promise<{
  mempoolAccept: MempoolAccept;
  broadcastTxid: string;
  confirmation: ConfirmationEvidence;
}> {
  if (input.backend === 'rpc') {
    return broadcastAndConfirm(input);
  }
  const base = esploraBaseUrl(input.network);
  let existingConfirmation = await getConfirmationWithBackend(
    input.backend,
    input.network,
    input.expectedTxid,
  );
  let broadcastTxid = input.expectedTxid;
  let note = 'Esplora already had the expected txid.';
  if (!existingConfirmation) {
    try {
      broadcastTxid = (await fetchText(`${base}/tx`, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
        },
        body: input.rawTxHex,
      })).trim();
      note = 'Esplora broadcast returned the expected txid.';
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(input.expectedTxid)) {
        throw error;
      }
      note = 'Esplora reported the expected txid during rebroadcast.';
    }
  }
  assert.equal(broadcastTxid, input.expectedTxid);
  existingConfirmation ??= await getConfirmationWithBackend(
    input.backend,
    input.network,
    input.expectedTxid,
  );
  return {
    mempoolAccept: {
      txid: input.expectedTxid,
      wtxid: 'unavailable-esplora',
      allowed: true,
      backend: input.backend,
      note,
    },
    broadcastTxid,
    confirmation:
      existingConfirmation && existingConfirmation.confirmations >= input.minConfirmations
        ? existingConfirmation
        : await waitForConfirmationWithBackend(
          input.backend,
          input.network,
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
    (network === 'mainnet' && chain === 'main')
    || (network === 'signet' && chain === 'signet')
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

async function assertNetwork(
  backend: PublicNetworkBackend,
  network: BitcoinNetworkName,
): Promise<Record<string, unknown>> {
  if (backend === 'rpc') {
    return assertRpcNetwork(network);
  }
  const base = esploraBaseUrl(network);
  const [blocksRaw, bestblockhash] = await Promise.all([
    fetchText(`${base}/blocks/tip/height`),
    fetchText(`${base}/blocks/tip/hash`),
  ]);
  return {
    chain: network,
    blocks: Number(blocksRaw),
    bestblockhash: bestblockhash.trim(),
    initialblockdownload: false,
    backend,
  };
}

async function getNetworkInfo(
  backend: PublicNetworkBackend,
  network: BitcoinNetworkName,
): Promise<Record<string, unknown>> {
  if (backend === 'rpc') {
    return rpcCall<Record<string, unknown>>(readRpcConfig(), 'getnetworkinfo');
  }
  return {
    version: 'esplora',
    subversion: esploraBaseUrl(network),
  };
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

async function scanFundingUtxoWithBackend(input: {
  backend: PublicNetworkBackend;
  network: BitcoinNetworkName;
  address: string;
  scriptPubKeyHex: string;
}): Promise<PublicFundingOutput> {
  if (input.backend === 'rpc') {
    return scanFundingUtxo({
      address: input.address,
      scriptPubKeyHex: input.scriptPubKeyHex,
    });
  }
  const minimumValueSat = canonicalPublicActivationMinimumValueSat();
  const base = esploraBaseUrl(input.network);
  const tipHeight = Number(await fetchText(`${base}/blocks/tip/height`));
  const utxos = await fetchJson<Array<{
    txid: string;
    vout: number;
    value: number;
    status: {
      confirmed: boolean;
      block_height?: number;
    };
  }>>(`${base}/address/${input.address}/utxo`);
  const candidates = [];
  for (const utxo of utxos) {
    const valueSat = BigInt(utxo.value);
    if (valueSat < minimumValueSat) {
      continue;
    }
    const raw = await getRawTxWithBackend(input.backend, input.network, utxo.txid);
    const tx = Transaction.fromHex(raw.hex);
    const output = outputAt(tx, utxo.vout);
    const scriptPubKeyHex = bytesToHex(output.script);
    if (scriptPubKeyHex !== input.scriptPubKeyHex) {
      continue;
    }
    const confirmations =
      utxo.status.confirmed && utxo.status.block_height !== undefined
        ? Math.max(0, tipHeight - utxo.status.block_height + 1)
        : 0;
    candidates.push({
      txid: utxo.txid,
      vout: utxo.vout,
      valueSat,
      scriptPubKeyHex,
      rawTxHex: raw.hex,
      confirmations,
    });
  }
  candidates.sort((a, b) => b.confirmations - a.confirmations);
  const selected = candidates[0];
  if (!selected) {
    throw new Error(`no funded UTXO found for ${input.address}`);
  }
  return selected;
}

async function readHistoricalFundingOutputWithBackend(input: {
  backend: PublicNetworkBackend;
  network: BitcoinNetworkName;
  txid: string;
  vout: number;
  expectedScriptPubKeyHex: string;
  expectedValueSat?: bigint;
}): Promise<PublicFundingOutput> {
  const raw = await getRawTxWithBackend(input.backend, input.network, input.txid);
  const tx = Transaction.fromHex(raw.hex);
  const output = outputAt(tx, input.vout);
  const scriptPubKeyHex = bytesToHex(output.script);
  if (scriptPubKeyHex !== input.expectedScriptPubKeyHex) {
    throw new Error('historical funding scriptPubKey does not match the parent funding wallet');
  }
  if (input.expectedValueSat !== undefined && output.value !== input.expectedValueSat) {
    throw new Error(`historical funding value mismatch: expected ${input.expectedValueSat}, got ${output.value}`);
  }
  const confirmation = await getConfirmationWithBackend(input.backend, input.network, input.txid);
  return {
    txid: input.txid,
    vout: input.vout,
    valueSat: output.value,
    scriptPubKeyHex,
    rawTxHex: raw.hex,
    confirmations: confirmation?.confirmations ?? raw.confirmations ?? 0,
  };
}

async function readExplicitFundingUtxo(input: {
  args: string[];
  expectedScriptPubKeyHex: string;
}): Promise<PublicFundingOutput> {
  const txid = stringArg(input.args, '--funding-txid');
  const voutRaw = Number(stringArg(input.args, '--funding-vout'));
  if (!Number.isInteger(voutRaw) || voutRaw < 0) {
    throw new Error('--funding-vout must be a non-negative integer');
  }
  const vout = voutRaw;
  const expectedValueSat = bigintArg(input.args, '--funding-value-sat');
  const txout = await rpcCall<TxOutResponse | null>(
    readRpcConfig(),
    'gettxout',
    [txid, vout, true],
  );
  if (!txout) {
    throw new Error(`funding outpoint is not currently unspent: ${txid}:${vout}`);
  }
  const valueSat = amountToSats(txout.value);
  if (valueSat !== expectedValueSat) {
    throw new Error(`funding value mismatch: expected ${expectedValueSat}, got ${valueSat}`);
  }
  if (txout.scriptPubKey.hex !== input.expectedScriptPubKeyHex) {
    throw new Error('funding scriptPubKey does not match the mainnet live-run parent funding wallet');
  }
  const rawTxHex = optionalStringArg(input.args, '--funding-raw-tx-hex')
    ?? (await getRawTx(txid)).hex;
  return {
    txid,
    vout,
    valueSat,
    scriptPubKeyHex: txout.scriptPubKey.hex,
    rawTxHex,
    confirmations: txout.confirmations,
  };
}

async function readExplicitFundingUtxoWithBackend(input: {
  backend: PublicNetworkBackend;
  network: BitcoinNetworkName;
  args: string[];
  expectedScriptPubKeyHex: string;
}): Promise<PublicFundingOutput> {
  if (input.backend === 'rpc') {
    return readExplicitFundingUtxo({
      args: input.args,
      expectedScriptPubKeyHex: input.expectedScriptPubKeyHex,
    });
  }

  const txid = stringArg(input.args, '--funding-txid');
  const voutRaw = Number(stringArg(input.args, '--funding-vout'));
  if (!Number.isInteger(voutRaw) || voutRaw < 0) {
    throw new Error('--funding-vout must be a non-negative integer');
  }
  const vout = voutRaw;
  const expectedValueSat = bigintArg(input.args, '--funding-value-sat');
  const raw = await getRawTxWithBackend(input.backend, input.network, txid);
  const tx = Transaction.fromHex(raw.hex);
  const output = outputAt(tx, vout);
  const scriptPubKeyHex = bytesToHex(output.script);
  if (scriptPubKeyHex !== input.expectedScriptPubKeyHex) {
    throw new Error('funding scriptPubKey does not match the mainnet live-run parent funding wallet');
  }
  if (output.value !== expectedValueSat) {
    throw new Error(`funding value mismatch: expected ${expectedValueSat}, got ${output.value}`);
  }

  const base = esploraBaseUrl(input.network);
  const outspend = await fetchJson<{
    spent: boolean;
    txid?: string;
    vin?: number;
  }>(`${base}/tx/${txid}/outspend/${vout}`);
  if (outspend.spent) {
    throw new Error(`funding outpoint is already spent: ${txid}:${vout}`);
  }
  const confirmation = await getConfirmationWithBackend(input.backend, input.network, txid);
  return {
    txid,
    vout,
    valueSat: output.value,
    scriptPubKeyHex,
    rawTxHex: raw.hex,
    confirmations: confirmation?.confirmations ?? raw.confirmations ?? 0,
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

function buildLazyWindowManifest(input: {
  network: BitcoinNetworkName;
  funding: PublicFundingOutput;
  parentFundingAddress: string;
  parentCet: PendingTaprootAdaptorSpend;
  bridge: PendingTaprootAdaptorSpend;
  childPreparedCet: PendingTaprootAdaptorSpend;
  childRefund: ReturnType<typeof buildTaprootKeySpend>;
  parentOracle: {
    eventId: string;
    activatingOutcome: string;
    wrongOutcome: string;
    activatingAttestationPointCompressedHex: string;
    wrongAttestationPointCompressedHex: string;
  };
  lazyPreparationCompletedBeforeParentCompletion: boolean;
  bridgePreResolutionSignatureVerifies: boolean;
  bridgeWrongScalarRejected: boolean;
}): Record<string, unknown> {
  const childFundingOutpoint = {
    txid: input.bridge.txidNoWitness,
    vout: 0,
    valueSat: input.bridge.sendValueSat,
    scriptPubKeyHex: input.childPreparedCet.input.scriptPubKeyHex,
  };

  return {
    kind: 'niti.v0_2_lazy_cdlc_window_manifest.v1',
    network: input.network,
    window: {
      k: 2,
      activeNodeId: 'C_0',
      preparedNodeIds: ['C_1'],
      retainedNodeIds: ['C_0', 'C_1'],
    },
    nodes: [
      {
        id: 'C_0',
        role: 'active-parent',
        fundingOutpoint: {
          txid: input.funding.txid,
          vout: input.funding.vout,
          valueSat: input.funding.valueSat.toString(),
          scriptPubKeyHex: input.funding.scriptPubKeyHex,
          address: input.parentFundingAddress,
        },
      },
      {
        id: 'C_1',
        role: 'prepared-child',
        fundingOutpoint: childFundingOutpoint,
        preparedSpends: {
          cet: {
            txidNoWitness: input.childPreparedCet.txidNoWitness,
            signatureState: 'adaptor-signature-not-valid-bitcoin-witness-before-child-oracle-attestation',
          },
          refund: {
            txid: input.childRefund.txid,
            signatureState: 'complete-schnorr-signature-but-timelocked',
            locktime: input.childRefund.locktime,
          },
        },
      },
    ],
    liveEdges: [
      {
        id: 'E_0_x_to_1',
        from: 'C_0',
        to: 'C_1',
        oracleEventId: input.parentOracle.eventId,
        activatingOutcome: input.parentOracle.activatingOutcome,
        wrongOutcome: input.parentOracle.wrongOutcome,
        adaptorPointCompressedHex: input.parentOracle.activatingAttestationPointCompressedHex,
        wrongOutcomeAttestationPointCompressedHex: input.parentOracle.wrongAttestationPointCompressedHex,
        parentCetTxidNoWitness: input.parentCet.txidNoWitness,
        bridgeTxidNoWitness: input.bridge.txidNoWitness,
        bridgeInput: input.bridge.input,
        bridgeOutput: childFundingOutpoint,
      },
    ],
    preparationOrder: [
      'funding-utxo-observed',
      'parent-cet-adaptor-prepared',
      'bridge-adaptor-prepared',
      'child-cet-adaptor-prepared',
      'child-refund-prepared',
      'parent-oracle-scalar-published',
      'parent-cet-completed',
      'bridge-completed',
    ],
    invariants: {
      activeNodeInWindow: true,
      preparedChildInWindow: true,
      childPreparedBeforeParentCompletion: input.lazyPreparationCompletedBeforeParentCompletion,
      bridgeAdaptorPointEqualsParentOutcomePoint:
        input.bridge.adaptor.adaptorPointCompressedHex === input.parentOracle.activatingAttestationPointCompressedHex,
      childSpendsPreparedBridgeOutput:
        input.childPreparedCet.input.txid === input.bridge.txidNoWitness
        && input.childPreparedCet.input.vout === 0
        && input.childPreparedCet.input.valueSat === input.bridge.sendValueSat,
      bridgePreResolutionSignatureIsNotValidBitcoinSignature:
        input.bridgePreResolutionSignatureVerifies === false,
      wrongOutcomeScalarRejected: input.bridgeWrongScalarRejected,
    },
  };
}

function fundingRequest(args: string[]): void {
  const network = networkArg(args);
  const lazy = hasFlag(args, '--lazy');
  const out = stringArg(
    args,
    '--out',
    `testnet/artifacts/${lazy ? 'lazy-public' : 'public'}-${network}-funding-request.json`,
  );
  if (network === 'mainnet') {
    const plan = readMainnetPlan(stringArg(args, '--plan'));
    const wallets = walletsFromMainnetPlan(plan);
    const minimumValueSat = canonicalPublicActivationMinimumValueSat();
    const request = {
      kind: 'niti.v0_1_mainnet_cdlc_funding_request.v1',
      network,
      address: wallets.parentFunding.address,
      scriptPubKeyHex: wallets.parentFunding.scriptPubKeyHex,
      minimumValueSat: minimumValueSat.toString(),
      minimumValueBtc: btcAmountString(minimumValueSat),
      warning: 'MAINNET LIVE-RUN ADDRESS. Fund only with the smallest amount required for this test. Keep the private plan file out of git.',
      nextDryRunCommand:
        `npm run mainnet:cdlc-execute -- --plan ${stringArg(args, '--plan')} --funding-txid <txid> --funding-vout <n> --funding-value-sat <sat> --out-dir testnet/artifacts/mainnet-live-run`,
      nextBroadcastCommand:
        `npm run mainnet:cdlc-execute -- --plan ${stringArg(args, '--plan')} --funding-txid <txid> --funding-vout <n> --funding-value-sat <sat> --out-dir testnet/artifacts/mainnet-live-run --mainnet-broadcast-i-understand`,
    };
    writeJson(out, request);
    console.log(JSON.stringify(request, null, 2));
    return;
  }

  const wallets = canonicalWallets(network);
  const minimumValueSat = canonicalPublicActivationMinimumValueSat();
  const request = {
    kind: lazy
      ? 'niti.v0_2_lazy_public_cdlc_funding_request.v1'
      : 'niti.v0_1_public_cdlc_funding_request.v1',
    network,
    address: wallets.parentFunding.address,
    scriptPubKeyHex: wallets.parentFunding.scriptPubKeyHex,
    minimumValueSat: minimumValueSat.toString(),
    minimumValueBtc: btcAmountString(minimumValueSat),
    deterministicFixtureValueSat: canonicalAmounts.parentFundingValueSat.toString(),
    deterministicFixtureValueBtc: btcAmountString(canonicalAmounts.parentFundingValueSat),
    warning: 'TESTNET/SIGNET ONLY. This uses deterministic test keys from the repository and must never receive mainnet funds.',
    nextCommand:
      lazy
        ? `npm run public:lazy-cdlc-execute -- --network ${network} --out-dir docs/evidence/lazy-public-${network}`
        : `npm run public:cdlc-execute -- --network ${network} --out-dir docs/evidence/public-${network}`,
  };
  writeJson(out, request);
  console.log(JSON.stringify(request, null, 2));
}

function mainnetPlan(args: string[]): void {
  const out = stringArg(args, '--out', 'testnet/artifacts/mainnet-live-run/private-plan.json');
  const plan = generateMainnetPlan();
  const wallets = walletsFromMainnetPlan(plan);
  writePrivateJson(out, plan);
  const publicSummary = {
    kind: 'niti.v0_1_mainnet_live_run_public_plan_summary.v1',
    network: 'mainnet',
    privatePlanPath: out,
    parentFundingAddress: wallets.parentFunding.address,
    parentFundingScriptPubKeyHex: wallets.parentFunding.scriptPubKeyHex,
    bridgeSignerAddress: wallets.bridgeSigner.address,
    childFundingAddress: wallets.childFunding.address,
    minimumValueSat: canonicalPublicActivationMinimumValueSat().toString(),
    minimumValueBtc: btcAmountString(canonicalPublicActivationMinimumValueSat()),
    warning: 'The private plan file contains mainnet signing secrets. It is written under ignored artifacts by default and must not be committed.',
  };
  console.log(JSON.stringify(publicSummary, null, 2));
}

async function executeActivation(args: string[]): Promise<void> {
  const network = networkArg(args);
  const backend = backendArg(args, network);
  const lazy = hasFlag(args, '--lazy');
  const outDir = path.resolve(stringArg(
    args,
    '--out-dir',
    `docs/evidence/${lazy ? 'lazy-public' : 'public'}-${network}`,
  ));
  const minConfirmations = numberArg(args, '--min-confirmations', 1);
  const waitSeconds = numberArg(args, '--wait-seconds', 7200);
  const mainnetBroadcast = hasFlag(args, '--mainnet-broadcast-i-understand');
  const mainnetDryRun = network === 'mainnet' && !mainnetBroadcast;
  fs.mkdirSync(outDir, { recursive: true });

  const chainInfo = await assertNetwork(backend, network);
  const networkInfo = await getNetworkInfo(backend, network);
  const privatePlan = network === 'mainnet'
    ? readMainnetPlan(stringArg(args, '--plan'))
    : null;
  const wallets = privatePlan ? walletsFromMainnetPlan(privatePlan) : canonicalWallets(network);
  const parentFundingWallet = wallets.parentFunding;
  const bridgeSignerWallet = wallets.bridgeSigner;
  const childFundingWallet = wallets.childFunding;

  const oracleSecret = scalarFromHex(privatePlan?.secrets.oracle ?? canonicalSecrets.oracle, 'oracle secret');
  const nonceSecret = scalarFromHex(privatePlan?.secrets.oracleNonce ?? canonicalSecrets.oracleNonce, 'oracle nonce');
  const childOracleSecret = scalarFromHex(
    privatePlan?.secrets.childOracle ?? canonicalSecrets.childOracle,
    'child oracle secret',
  );
  const childNonceSecret = scalarFromHex(
    privatePlan?.secrets.childOracleNonce ?? canonicalSecrets.childOracleNonce,
    'child oracle nonce',
  );
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

  const funding = network === 'mainnet'
    ? await readExplicitFundingUtxoWithBackend({
      backend,
      network,
      args,
      expectedScriptPubKeyHex: parentFundingWallet.scriptPubKeyHex,
    })
    : optionalStringArg(args, '--funding-txid') !== undefined
      ? await readHistoricalFundingOutputWithBackend({
        backend,
        network,
        txid: stringArg(args, '--funding-txid'),
        vout: Number(stringArg(args, '--funding-vout')),
        expectedScriptPubKeyHex: parentFundingWallet.scriptPubKeyHex,
        ...(optionalStringArg(args, '--funding-value-sat') === undefined
          ? {}
          : { expectedValueSat: bigintArg(args, '--funding-value-sat') }),
      })
    : await scanFundingUtxoWithBackend({
      backend,
      network,
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

  const parentEdgeValueSat = funding.valueSat - canonicalAmounts.parentCetFeeSat;
  const bridgePending = buildSpendWithDeterministicNonce({
    network,
    signerWallet: bridgeSignerWallet,
    utxo: {
      txid: parentPending.txidNoWitness,
      vout: 0,
      valueSat: parentEdgeValueSat,
    },
    destinationAddress: childFundingWallet.address,
    feeSat: canonicalAmounts.bridgeFeeSat,
    adaptorPointHex: activatingPrepared.attestationPointCompressedHex,
  });
  const childFundingUtxo = {
    txid: bridgePending.txidNoWitness,
    vout: 0,
    valueSat: parentEdgeValueSat - canonicalAmounts.bridgeFeeSat,
  };
  const childCetPending = buildSpendWithDeterministicNonce({
    network,
    signerWallet: childFundingWallet,
    utxo: childFundingUtxo,
    destinationAddress: parentFundingWallet.address,
    feeSat: canonicalAmounts.childCetFeeSat,
    adaptorPointHex: childPrepared.attestationPointCompressedHex,
  });
  const childRefund = buildTaprootKeySpend({
    network,
    signerOutputSecret: scalarFromHex(childFundingWallet.outputSecretHex, 'child output secret'),
    signerScriptPubKeyHex: childFundingWallet.scriptPubKeyHex,
    utxo: childFundingUtxo,
    destinationAddress: childFundingWallet.address,
    outputValueSat: childFundingUtxo.valueSat - canonicalAmounts.childRefundFeeSat,
    locktime: Number(chainInfo.blocks ?? 0) + 144,
    sequence: 0xfffffffe,
    nonceSecret: scalarFromHex(privatePlan?.secrets.childRefundNonce ?? canonicalSecrets.childRefundNonce, 'child refund nonce'),
  });
  const lazyPreparationCompletedBeforeParentCompletion = true;

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
  const childCetPreResolutionSignatureHex =
    `${childCetPending.adaptor.adaptedNonceXOnlyHex}${childCetPending.adaptor.adaptorSignatureScalarHex}`;
  const childCetPreResolutionSignatureVerifies = verifyBip340Signature({
    signatureHex: childCetPreResolutionSignatureHex,
    messageHashHex: childCetPending.sighashHex,
    publicKeyXOnlyHex: childCetPending.adaptor.signerPublicXOnlyHex,
  });
  assert.equal(childCetPending.adaptor.verifiesAdaptor, true);
  assert.equal(childCetPreResolutionSignatureVerifies, false);

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
  assert.equal(parentCompleted.txid, parentPending.txidNoWitness);
  const parentMempoolAccept =
    mainnetDryRun && backend === 'esplora'
      ? {
        txid: parentCompleted.txid,
        wtxid: 'unavailable-esplora',
        allowed: false,
        backend,
        note: 'Esplora does not expose transaction preflight; dry-run mode builds the transaction but does not claim mempool acceptance.',
      }
      : await testMempoolWithBackend(backend, parentCompleted.rawTxHex);
  const parentBroadcast = mainnetDryRun
    ? null
    : await broadcastAndConfirmWithBackend({
      backend,
      network,
      rawTxHex: parentCompleted.rawTxHex,
      expectedTxid: parentCompleted.txid,
      minConfirmations,
      waitSeconds,
    });
  const parentTx = Transaction.fromHex(parentCompleted.rawTxHex);
  assert.equal(inputTxid(parentTx, 0), funding.txid);
  assert.equal(inputVout(parentTx, 0), funding.vout);
  const parentEdgeOutput = outputAt(parentTx, 0);
  assert.equal(parentEdgeOutput.value, parentEdgeValueSat);
  assert.equal(bytesToHex(parentEdgeOutput.script), bridgeSignerWallet.scriptPubKeyHex);

  const bridgeCompleted = completeTaprootAdaptorSpend({
    pending: bridgePending,
    attestationSecret: scalarFromHex(activatingAttestation.attestationSecretHex, 'activating scalar'),
  });
  assert.equal(bridgeCompleted.txid, bridgePending.txidNoWitness);
  const bridgeBroadcast = mainnetDryRun
    ? null
    : await broadcastAndConfirmWithBackend({
      backend,
      network,
      rawTxHex: bridgeCompleted.rawTxHex,
      expectedTxid: bridgeCompleted.txid,
      minConfirmations,
      waitSeconds,
    });
  const bridgeTx = Transaction.fromHex(bridgeCompleted.rawTxHex);
  assert.equal(inputTxid(bridgeTx, 0), parentCompleted.txid);
  assert.equal(inputVout(bridgeTx, 0), 0);
  const childFundingOutput = outputAt(bridgeTx, 0);
  assert.equal(childFundingOutput.value, childFundingUtxo.valueSat);
  assert.equal(bytesToHex(childFundingOutput.script), childFundingWallet.scriptPubKeyHex);

  const childRefundEarlyMempool = mainnetDryRun
    ? null
    : backend === 'rpc'
      ? await testMempool(childRefund.rawTxHex)
      : {
        txid: childRefund.txid,
        wtxid: 'unavailable-esplora',
        allowed: false,
        backend,
        note: 'Esplora does not expose testmempoolaccept; the refund is retained as a timelocked raw transaction and is not broadcast in this run.',
      };
  if (childRefundEarlyMempool && backend === 'rpc') {
    assert.equal(childRefundEarlyMempool.allowed, false);
  }

  const fundingHex = rawTxArtifact(outDir, 'public-01-parent-funding', funding.rawTxHex);
  const parentCetHex = rawTxArtifact(outDir, 'public-02-parent-cet', parentCompleted.rawTxHex);
  const bridgeHex = rawTxArtifact(outDir, 'public-03-bridge', bridgeCompleted.rawTxHex);
  const childPreparedCetHex = rawTxArtifact(outDir, 'public-04-child-prepared-cet-unsigned', childCetPending.unsignedTxHex);
  const childRefundHex = rawTxArtifact(outDir, 'public-05-child-refund-timelocked', childRefund.rawTxHex);

  if (mainnetDryRun) {
    const dryRunPath = path.join(outDir, 'mainnet-dry-run-bundle.json');
    const dryRunBundle = {
      kind: 'niti.v0_1_mainnet_cdlc_dry_run_bundle.v1',
      network,
      boundary: backend === 'rpc'
        ? 'Mainnet dry-run: real funded outpoint is verified, transactions are built, parent CET is checked with testmempoolaccept, and no transaction is broadcast.'
        : 'Mainnet dry-run: real funded outpoint is verified through public Esplora, transactions are built locally, and no transaction is broadcast.',
      generatedAt: new Date().toISOString(),
      broadcast: false,
      broadcastRequiresFlag: '--mainnet-broadcast-i-understand',
      bitcoinCore: {
        chain: chainInfo.chain,
        blocks: chainInfo.blocks,
        version: networkInfo.version,
        subversion: networkInfo.subversion,
      },
      funding: {
        txid: funding.txid,
        vout: funding.vout,
        valueSat: funding.valueSat.toString(),
        confirmations: funding.confirmations,
        scriptPubKeyHex: funding.scriptPubKeyHex,
        address: parentFundingWallet.address,
        rawTx: fundingHex,
      },
      parentCet: {
        txid: parentCompleted.txid,
        mempoolAccept: parentMempoolAccept,
        rawTx: parentCetHex,
      },
      bridge: {
        txid: bridgeCompleted.txid,
        wrongScalarRejected: bridgeWrongScalarRejected,
        preResolutionSignatureVerifies: bridgePreResolutionSignatureVerifies,
        rawTx: bridgeHex,
      },
      childPreparedCet: {
        txidNoWitness: childCetPending.txidNoWitness,
        rawTx: childPreparedCetHex,
      },
      childRefund: {
        txid: childRefund.txid,
        locktime: childRefund.locktime,
        rawTx: childRefundHex,
      },
    };
    writeJson(dryRunPath, dryRunBundle);
    console.log(`wrote ${relativeFromRepo(dryRunPath)}`);
    return;
  }

  assert.notEqual(parentBroadcast, null);
  assert.notEqual(bridgeBroadcast, null);
  assert.notEqual(childRefundEarlyMempool, null);

  const checks = {
    publicNetwork: network === 'mainnet' || network === 'signet' || network === 'testnet' || network === 'testnet4',
    fundingConfirmed: funding.confirmations >= minConfirmations,
    parentCetAccepted: parentBroadcast!.mempoolAccept.allowed,
    parentCetConfirmed: parentBroadcast!.confirmation.confirmations >= minConfirmations,
    parentWrongOutcomeRejected: true,
    bridgeAdaptorPreResolutionNotValidSignature: bridgePreResolutionSignatureVerifies === false,
    bridgeWrongScalarRejected,
    bridgeAccepted: bridgeBroadcast!.mempoolAccept.allowed,
    bridgeConfirmed: bridgeBroadcast!.confirmation.confirmations >= minConfirmations,
    bridgeCreatesChildFunding:
      bytesToHex(childFundingOutput.script) === childFundingWallet.scriptPubKeyHex,
    childPreparedCetAdaptorOnly:
      childCetPending.adaptor.verifiesAdaptor && childCetPreResolutionSignatureVerifies === false,
    childRefundEarlyRejected: childRefundEarlyMempool!.allowed === false,
    ...(lazy
      ? {
        lazyWindowK2: true,
        lazyChildPreparedBeforeParentCompletion: lazyPreparationCompletedBeforeParentCompletion,
        lazyBridgeUsesParentOraclePoint:
          bridgePending.adaptor.adaptorPointCompressedHex === activatingPrepared.attestationPointCompressedHex,
        lazyChildSpendsPreparedBridgeOutput:
          childCetPending.input.txid === bridgePending.txidNoWitness
          && childCetPending.input.vout === 0
          && childCetPending.input.valueSat === bridgePending.sendValueSat,
      }
      : {}),
  };
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  assert.deepEqual(failed, [], `failed public evidence checks: ${failed.join(', ')}`);

  const bundlePath = path.join(
    outDir,
    lazy ? 'lazy-activation-evidence-bundle.json' : 'public-activation-evidence-bundle.json',
  );
  const bundle = {
    kind: network === 'mainnet'
      ? lazy
        ? 'niti.v0_2_lazy_mainnet_activation_evidence_bundle.v1'
        : 'niti.v0_1_mainnet_activation_evidence_bundle.v1'
      : lazy
        ? lazyPublicBundleKind
        : publicBundleKind,
    network,
    boundary: network === 'mainnet'
      ? `Mainnet Bitcoin execution with real sats, ${backend === 'rpc' ? 'Bitcoin Core RPC' : 'public Esplora'} broadcast, ${backend === 'rpc' ? 'mempool preflight checks' : 'network acceptance by broadcast response'}, and observed confirmations.`
      : lazy
        ? `Public signet/testnet Lazy cDLC bounded-window execution with ${backend === 'rpc' ? 'Bitcoin Core RPC' : 'public Esplora'} broadcast and observed confirmations; not regtest mining`
        : `Public signet/testnet execution with ${backend === 'rpc' ? 'Bitcoin Core RPC' : 'public Esplora'} broadcast and observed confirmations; not regtest mining`,
    generatedAt: new Date().toISOString(),
    executionBackend: {
      kind: backend,
      ...(backend === 'esplora' ? { baseUrl: esploraBaseUrl(network) } : {}),
    },
    sourceRevision: {
      gitHeadAtGeneration: currentGitHead(),
      workingTreeStatusAtGeneration: currentGitStatus(),
      node: process.version,
    },
    replayCommands: {
      fundingRequest: network === 'mainnet'
        ? 'npm run mainnet:cdlc-funding-request -- --plan <private-plan>'
        : lazy
        ? `npm run public:lazy-cdlc-funding-request -- --network ${network}`
        : `npm run public:cdlc-funding-request -- --network ${network}`,
      execute: network === 'mainnet'
        ? [
          'npm run mainnet:cdlc-execute --',
          lazy ? '--lazy' : '',
          `--backend ${backend}`,
          backend === 'esplora' ? '--mainnet-esplora-i-understand' : '',
          '--plan <private-plan>',
          `--funding-txid ${funding.txid}`,
          `--funding-vout ${funding.vout}`,
          `--funding-value-sat ${funding.valueSat.toString()}`,
          `--out-dir ${relativeFromRepo(outDir)}`,
          '--mainnet-broadcast-i-understand',
        ].filter((part) => part.length > 0).join(' ')
        : lazy
        ? `npm run public:lazy-cdlc-execute -- --network ${network} --out-dir ${relativeFromRepo(outDir)}`
        : `npm run public:cdlc-execute -- --network ${network} --out-dir ${relativeFromRepo(outDir)}`,
      verify: `npm run test:evidence-bundle -- --bundle ${relativeFromRepo(bundlePath)}`,
    },
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
    ...(lazy
      ? {
        lazyWindow: buildLazyWindowManifest({
          network,
          funding,
          parentFundingAddress: parentFundingWallet.address,
          parentCet: parentPending,
          bridge: bridgePending,
          childPreparedCet: childCetPending,
          childRefund,
          parentOracle: {
            eventId: canonicalOutcomes.eventId,
            activatingOutcome: canonicalOutcomes.activating,
            wrongOutcome: canonicalOutcomes.wrong,
            activatingAttestationPointCompressedHex: activatingPrepared.attestationPointCompressedHex,
            wrongAttestationPointCompressedHex: wrongPrepared.attestationPointCompressedHex,
          },
          lazyPreparationCompletedBeforeParentCompletion,
          bridgePreResolutionSignatureVerifies,
          bridgeWrongScalarRejected,
        }),
      }
      : {}),
    explorer: {
      parentFunding: explorerTxUrl(network, funding.txid),
      parentCet: explorerTxUrl(network, parentCompleted.txid),
      bridge: explorerTxUrl(network, bridgeCompleted.txid),
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
        mempoolAccept: parentBroadcast!.mempoolAccept,
        broadcastTxid: parentBroadcast!.broadcastTxid,
        confirmation: parentBroadcast!.confirmation,
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
        mempoolAccept: bridgeBroadcast!.mempoolAccept,
        broadcastTxid: bridgeBroadcast!.broadcastTxid,
        confirmation: bridgeBroadcast!.confirmation,
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
        earlyMempoolAccept: childRefundEarlyMempool!,
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
  if (mode === 'mainnet-plan') {
    mainnetPlan(args);
    return;
  }
  if (mode === 'funding-request') {
    fundingRequest(args);
    return;
  }
  if (mode === 'execute-activation') {
    await executeActivation(args);
    return;
  }
  throw new Error('--mode must be mainnet-plan, funding-request, or execute-activation');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
