import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  attestOracleOutcome,
  pointFromCompressed,
  prepareOracleOutcome,
  randomScalar,
  scalarFromHex,
} from './secp.js';
import {
  adaptorPointFromHex,
  buildTaprootAdaptorSpend,
  completeTaprootAdaptorSpend,
  deriveTaprootWallet,
  parsePendingTaprootAdaptorSpend,
  resolveNetwork,
} from './taproot.js';
import { readJsonFile, writeJsonFile, writeTextFile } from './io.js';
import { deterministicJson, sampleManifest, writeSampleManifest } from './manifest.js';
import {
  broadcastRawTransaction,
  getBlockchainInfo,
  readRpcConfig,
  scanAddressUtxos,
} from './rpc.js';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command, ...rest] = argv;
  if (!command) {
    usage();
    process.exit(2);
  }
  const args: Args = {};
  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (!item?.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${item}`);
    }
    const key = item.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return { command, args };
}

function stringArg(args: Args, key: string, fallback?: string): string {
  const value = args[key];
  if (typeof value === 'string') {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`missing --${key}`);
}

function optionalStringArg(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

function bigintArg(args: Args, key: string): bigint {
  return BigInt(stringArg(args, key));
}

function writeOrPrint(args: Args, value: unknown): void {
  const out = optionalStringArg(args, 'out');
  if (out) {
    writeJsonFile(out, value);
    console.log(`wrote ${out}`);
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
}

function usage(): void {
  console.log(`NITI cDLC testnet harness

Commands:
  config:check
  wallet:new --network testnet4 [--secret-hex <32-byte-hex>] [--out file.json]
  oracle:prepare --event-id <id> --outcome <text> [--oracle-secret-hex <hex>] [--nonce-secret-hex <hex>] [--out file.json]
  oracle:attest --event-id <id> --outcome <text> --oracle-secret-hex <hex> --nonce-secret-hex <hex> [--out file.json]
  taproot:prepare --network testnet4 --signer-output-secret-hex <hex> --signer-script-pubkey-hex <hex> --utxo-txid <txid> --utxo-vout <n> --utxo-value-sat <sat> --destination <addr> --fee-sat <sat> --adaptor-point-hex <compressed> [--out pending.json]
  taproot:complete --pending pending.json --attestation-secret-hex <hex> [--out completed.json] [--raw-out tx.hex]
  manifest:sample --network testnet4 --out manifest.json
  manifest:validate --file manifest.json
  rpc:info
  rpc:scan-address --address <addr>
  rpc:broadcast --raw-tx-hex <hex> --allow-broadcast
`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (command === 'config:check') {
    const config = readRpcConfig();
    console.log(JSON.stringify({
      rpcUrl: config.url,
      rpcWallet: config.wallet ?? null,
      hasUser: Boolean(config.username),
      hasPassword: Boolean(config.password),
      broadcastRequiresAllowFlag: true,
    }, null, 2));
    return;
  }

  if (command === 'wallet:new') {
    const network = resolveNetwork(stringArg(args, 'network', 'testnet4')).name;
    const secret = optionalStringArg(args, 'secret-hex')
      ? scalarFromHex(stringArg(args, 'secret-hex'), 'secret-hex')
      : randomScalar();
    const wallet = deriveTaprootWallet({ internalSecret: secret, network });
    writeOrPrint(args, {
      warning: 'TESTNET ONLY. Do not reuse these secrets on mainnet.',
      ...wallet,
    });
    return;
  }

  if (command === 'oracle:prepare') {
    const oracleSecret = optionalStringArg(args, 'oracle-secret-hex');
    const nonceSecret = optionalStringArg(args, 'nonce-secret-hex');
    const input: {
      eventId: string;
      outcome: string;
      oracleSecret?: bigint;
      nonceSecret?: bigint;
    } = {
      eventId: stringArg(args, 'event-id'),
      outcome: stringArg(args, 'outcome'),
    };
    if (oracleSecret) {
      input.oracleSecret = scalarFromHex(oracleSecret, 'oracle-secret-hex');
    }
    if (nonceSecret) {
      input.nonceSecret = scalarFromHex(nonceSecret, 'nonce-secret-hex');
    }
    writeOrPrint(args, prepareOracleOutcome(input));
    return;
  }

  if (command === 'oracle:attest') {
    writeOrPrint(args, attestOracleOutcome({
      eventId: stringArg(args, 'event-id'),
      outcome: stringArg(args, 'outcome'),
      oracleSecret: scalarFromHex(stringArg(args, 'oracle-secret-hex'), 'oracle-secret-hex'),
      nonceSecret: scalarFromHex(stringArg(args, 'nonce-secret-hex'), 'nonce-secret-hex'),
    }));
    return;
  }

  if (command === 'taproot:prepare') {
    const network = resolveNetwork(stringArg(args, 'network', 'testnet4')).name;
    writeOrPrint(args, buildTaprootAdaptorSpend({
      network,
      signerOutputSecret: scalarFromHex(
        stringArg(args, 'signer-output-secret-hex'),
        'signer-output-secret-hex',
      ),
      signerScriptPubKeyHex: stringArg(args, 'signer-script-pubkey-hex'),
      utxo: {
        txid: stringArg(args, 'utxo-txid'),
        vout: Number(stringArg(args, 'utxo-vout')),
        valueSat: bigintArg(args, 'utxo-value-sat'),
      },
      destinationAddress: stringArg(args, 'destination'),
      feeSat: bigintArg(args, 'fee-sat'),
      adaptorPoint: adaptorPointFromHex(stringArg(args, 'adaptor-point-hex')),
    }));
    return;
  }

  if (command === 'taproot:complete') {
    const pending = parsePendingTaprootAdaptorSpend(
      readJsonFile<unknown>(stringArg(args, 'pending')),
    );
    pointFromCompressed(pending.adaptor.adaptorPointCompressedHex).assertValidity();
    const completed = completeTaprootAdaptorSpend({
      pending,
      attestationSecret: scalarFromHex(
        stringArg(args, 'attestation-secret-hex'),
        'attestation-secret-hex',
      ),
    });
    const rawOut = optionalStringArg(args, 'raw-out');
    if (rawOut) {
      writeTextFile(rawOut, `${completed.rawTxHex}\n`);
    }
    writeOrPrint(args, completed);
    return;
  }

  if (command === 'manifest:sample') {
    const network = resolveNetwork(stringArg(args, 'network', 'testnet4')).name;
    const out = stringArg(args, 'out');
    writeSampleManifest(out, network);
    console.log(`wrote ${out}`);
    return;
  }

  if (command === 'manifest:validate') {
    const file = stringArg(args, 'file');
    const bin = resolve('testnet/ada/bin/niti_manifest_validate');
    if (!existsSync(bin)) {
      throw new Error('Ada validator is not built. Run npm run ada:build first.');
    }
    const result = spawnSync(bin, [file], { encoding: 'utf8' });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  if (command === 'rpc:info') {
    console.log(JSON.stringify(await getBlockchainInfo(), null, 2));
    return;
  }

  if (command === 'rpc:scan-address') {
    console.log(JSON.stringify(await scanAddressUtxos(stringArg(args, 'address')), null, 2));
    return;
  }

  if (command === 'rpc:broadcast') {
    if (args['allow-broadcast'] !== true) {
      throw new Error('refusing to broadcast without --allow-broadcast');
    }
    const rawHex = optionalStringArg(args, 'raw-tx-hex')
      ?? readFileSync(stringArg(args, 'raw-tx-file'), 'utf8').trim();
    console.log(await broadcastRawTransaction(rawHex));
    return;
  }

  if (command === 'manifest:print-sample') {
    console.log(deterministicJson(sampleManifest()));
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
