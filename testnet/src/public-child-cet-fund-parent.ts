import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attestOracleOutcome, pointFromCompressed, scalarFromHex } from './secp.js';
import {
  buildTaprootAdaptorSpend,
  completeTaprootAdaptorSpend,
  deriveTaprootWallet,
  type BitcoinNetworkName,
  type TaprootWallet,
  type PendingTaprootAdaptorSpend,
} from './taproot.js';
import { canonicalOutcomes, canonicalSecrets, canonicalWallets } from './cdlc-scenario.js';

const satoshisPerBtc = 100_000_000n;

interface MainnetPlan {
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

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`);
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function btcAmountString(sats: bigint): string {
  const whole = sats / satoshisPerBtc;
  const fractional = (sats % satoshisPerBtc).toString().padStart(8, '0');
  return `${whole}.${fractional}`;
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
  throw new Error(`child CET funding helper supports only mainnet/signet/testnet/testnet4, got ${network}`);
}

function readMainnetPlan(filePath: string): MainnetPlan {
  const plan = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
  if (plan.kind !== 'niti.v0_1_mainnet_live_run_private_plan.v1' || plan.network !== 'mainnet') {
    throw new Error('unsupported mainnet private plan');
  }
  for (const [name, secret] of Object.entries(plan.secrets ?? {})) {
    scalarFromHex(secret as string, `mainnet private plan ${name}`);
  }
  return plan as MainnetPlan;
}

function walletFromSecret(network: BitcoinNetworkName, secretHex: string): TaprootWallet {
  return deriveTaprootWallet({
    internalSecret: scalarFromHex(secretHex, 'wallet secret'),
    network,
  });
}

function buildSpendWithDeterministicNonce(input: {
  network: BitcoinNetworkName;
  signerOutputSecretHex: string;
  signerScriptPubKeyHex: string;
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
        signerOutputSecret: scalarFromHex(input.signerOutputSecretHex, 'signer output secret'),
        signerScriptPubKeyHex: input.signerScriptPubKeyHex,
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

async function waitForConfirmation(input: {
  network: BitcoinNetworkName;
  txid: string;
  minConfirmations: number;
  waitSeconds: number;
}): Promise<{
  txid: string;
  blockHash: string;
  blockHeight: number;
  confirmations: number;
}> {
  const base = esploraBaseUrl(input.network);
  const deadline = Date.now() + input.waitSeconds * 1000;
  while (Date.now() <= deadline) {
    try {
      const tx = await fetchJson<{
        txid: string;
        status: {
          confirmed: boolean;
          block_height?: number;
          block_hash?: string;
        };
      }>(`${base}/tx/${input.txid}`);
      assert.equal(tx.txid, input.txid);
      if (tx.status.confirmed && tx.status.block_hash !== undefined && tx.status.block_height !== undefined) {
        const tipHeight = Number(await fetchText(`${base}/blocks/tip/height`));
        const confirmations = Math.max(0, tipHeight - tx.status.block_height + 1);
        if (confirmations >= input.minConfirmations) {
          return {
            txid: input.txid,
            blockHash: tx.status.block_hash,
            blockHeight: tx.status.block_height,
            confirmations,
          };
        }
      }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('HTTP 404')) {
        throw error;
      }
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 30_000);
    });
  }
  throw new Error(`timed out waiting for ${input.minConfirmations} confirmation(s) on ${input.txid}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const bundlePath = stringArg(args, '--bundle');
  const outDir = path.resolve(stringArg(args, '--out-dir', 'testnet/artifacts/public-child-cet-funding'));
  const minConfirmations = numberArg(args, '--min-confirmations', 1);
  const waitSeconds = numberArg(args, '--wait-seconds', 7200);
  const broadcast = hasFlag(args, '--broadcast');

  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8')) as Record<string, any>;
  const network = bundle.network as BitcoinNetworkName;
  if (network === 'mainnet' && broadcast && !hasFlag(args, '--mainnet-broadcast-i-understand')) {
    throw new Error('mainnet broadcast requires --mainnet-broadcast-i-understand');
  }
  const mainnetPlan = network === 'mainnet'
    ? readMainnetPlan(stringArg(args, '--plan'))
    : null;
  const childPreparedArtifact = bundle.activationPath?.childPreparedCet as Record<string, any> | undefined;
  if (!childPreparedArtifact) {
    throw new Error('bundle activationPath.childPreparedCet is required');
  }
  const expectedUnsignedTxHex = childPreparedArtifact.rawTx?.rawTxHex;
  if (typeof expectedUnsignedTxHex !== 'string') {
    throw new Error('bundle activationPath.childPreparedCet.rawTx.rawTxHex is required');
  }
  const wallets = mainnetPlan === null
    ? canonicalWallets(network)
    : {
      parentFunding: walletFromSecret(network, mainnetPlan.secrets.parentFunding),
      bridgeSigner: walletFromSecret(network, mainnetPlan.secrets.bridgeSigner),
      childFunding: walletFromSecret(network, mainnetPlan.secrets.childFunding),
    };
  const childPreparedCet = buildSpendWithDeterministicNonce({
    network,
    signerOutputSecretHex: wallets.childFunding.outputSecretHex,
    signerScriptPubKeyHex: wallets.childFunding.scriptPubKeyHex,
    utxo: {
      txid: childPreparedArtifact.input.txid,
      vout: childPreparedArtifact.input.vout,
      valueSat: BigInt(childPreparedArtifact.input.valueSat),
    },
    destinationAddress: childPreparedArtifact.destinationAddress,
    feeSat: BigInt(childPreparedArtifact.feeSat),
    adaptorPointHex: childPreparedArtifact.adaptor.adaptorPointCompressedHex,
  });
  assert.equal(childPreparedCet.unsignedTxHex, expectedUnsignedTxHex);
  assert.equal(childPreparedCet.txidNoWitness, childPreparedArtifact.txidNoWitness);
  assert.equal(childPreparedCet.adaptor.adaptorSignatureScalarHex, childPreparedArtifact.adaptor.adaptorSignatureScalarHex);

  const childAttestation = attestOracleOutcome({
    eventId: canonicalOutcomes.childEventId,
    outcome: canonicalOutcomes.childActivating,
    oracleSecret: scalarFromHex(
      mainnetPlan?.secrets.childOracle ?? canonicalSecrets.childOracle,
      'child oracle secret',
    ),
    nonceSecret: scalarFromHex(
      mainnetPlan?.secrets.childOracleNonce ?? canonicalSecrets.childOracleNonce,
      'child oracle nonce',
    ),
  });
  const completed = completeTaprootAdaptorSpend({
    pending: childPreparedCet,
    attestationSecret: scalarFromHex(childAttestation.attestationSecretHex, 'child attestation secret'),
  });
  assert.equal(completed.verifies, true);
  assert.equal(completed.txid, childPreparedCet.txidNoWitness);

  const rawPath = path.join(outDir, 'child-cet-funds-next-parent.hex');
  writeText(rawPath, completed.rawTxHex);

  let broadcastTxid: string | null = null;
  let confirmation: Awaited<ReturnType<typeof waitForConfirmation>> | null = null;
  if (broadcast) {
    const base = esploraBaseUrl(network);
    const alreadyKnown = await fetchText(`${base}/tx/${completed.txid}`)
      .then(() => true)
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes('HTTP 404')) {
          return false;
        }
        throw error;
      });
    if (alreadyKnown) {
      broadcastTxid = completed.txid;
    } else {
      try {
        broadcastTxid = (await fetchText(`${base}/tx`, {
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
          },
          body: completed.rawTxHex,
        })).trim();
      } catch (error) {
        if (
          !(error instanceof Error)
          || (!error.message.includes(completed.txid) && !error.message.includes('already'))
        ) {
          throw error;
        }
        broadcastTxid = completed.txid;
      }
    }
    assert.equal(broadcastTxid, completed.txid);
    confirmation = await waitForConfirmation({
      network,
      txid: completed.txid,
      minConfirmations,
      waitSeconds,
    });
  }

  const funding = {
    kind: 'niti.public_child_cet_funds_next_parent.v1',
    network,
    sourceBundle: bundlePath,
    broadcast,
    fundingTxid: completed.txid,
    fundingVout: 0,
    fundingValueSat: childPreparedCet.sendValueSat,
    fundingValueBtc: btcAmountString(BigInt(childPreparedCet.sendValueSat)),
    destinationAddress: childPreparedCet.destinationAddress,
    rawTx: {
      path: path.relative(process.cwd(), rawPath).replaceAll(path.sep, '/'),
      rawTxHex: completed.rawTxHex,
    },
    childOracle: {
      eventId: canonicalOutcomes.childEventId,
      outcome: canonicalOutcomes.childActivating,
      attestationSecretHex: childAttestation.attestationSecretHex,
      signatureVerifies: childAttestation.verifies,
    },
    broadcastTxid,
    confirmation,
    nextCommand: network === 'mainnet'
      ? `npm run mainnet:cdlc-execute -- --lazy --backend esplora --mainnet-esplora-i-understand --plan <private-plan> --funding-txid ${completed.txid} --funding-vout 0 --funding-value-sat ${childPreparedCet.sendValueSat} --out-dir docs/evidence/lazy-bilateral-public-mainnet --mainnet-broadcast-i-understand`
      : `npm run public:lazy-cdlc-execute -- --network ${network} --backend esplora --funding-txid ${completed.txid} --funding-vout 0 --funding-value-sat ${childPreparedCet.sendValueSat} --out-dir docs/evidence/lazy-bilateral-public-${network}`,
  };
  const jsonPath = path.join(outDir, 'child-cet-funds-next-parent.json');
  writeJson(jsonPath, funding);
  console.log(JSON.stringify(funding, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
