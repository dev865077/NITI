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
import { buildCanonicalParentFundingFixture } from './cdlc-scenario.js';
import { deterministicJson, sampleManifest, writeSampleManifest } from './manifest.js';
import {
  buildOracleAnnouncement,
  buildOracleAttestationEnvelope,
  parseOracleAnnouncement,
  verifyOracleAnnouncementFreshness,
  verifyOracleAnnouncement,
  verifyOracleAttestation,
} from './oracle-audit.js';
import {
  monitorOracleHistory,
  type OracleHistoryLog,
  verifyOracleHistoryLog,
} from './oracle-history.js';
import {
  loadOracleFixtureRepository,
  queryOracleAnnouncements,
  queryOracleAttestations,
  queryOracleHistory,
} from './oracle-query.js';
import {
  LndRestClient,
  attestLightningOracle,
  createHoldInvoiceArtifact,
  parseHoldInvoiceArtifact,
  parseLightningAttestation,
  parseLightningOracleLock,
  prepareLightningOracleLock,
  readLndConfig,
  redactLndConfig,
  runMockLightningFlow,
  sampleLightningManifest,
  validateLightningManifest,
  type LightningNetworkName,
  type LndRole,
} from './lightning.js';
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

function numberArg(args: Args, key: string, fallback?: number): number {
  const value = fallback === undefined
    ? stringArg(args, key)
    : stringArg(args, key, String(fallback));
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`--${key} must be a non-negative integer`);
  }
  return parsed;
}

function lndRoleArg(args: Args, fallback: LndRole): LndRole {
  const role = stringArg(args, 'role', fallback);
  if (role !== 'receiver' && role !== 'payer') {
    throw new Error('--role must be receiver or payer');
  }
  return role;
}

function lightningNetworkArg(args: Args, fallback: LightningNetworkName): LightningNetworkName {
  const network = stringArg(args, 'network', fallback);
  if (!['testnet', 'testnet4', 'signet', 'regtest'].includes(network)) {
    throw new Error('--network must be testnet, testnet4, signet, or regtest');
  }
  return network as LightningNetworkName;
}

function requireLiveLndAllowed(args: Args): void {
  if (args['allow-live-lnd'] !== true) {
    throw new Error('refusing to call mutating LND endpoint without --allow-live-lnd');
  }
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
  oracle:announcement --event-id <id> --outcomes <csv> --oracle-secret-hex <hex> --nonce-secret-hex <hex> --announcement-nonce-secret-hex <hex> --expiry-iso <iso> [--out file.json]
  oracle:verify-announcement --announcement file.json [--now-iso <iso>] [--out file.json]
  oracle:attestation-envelope --announcement file.json --outcome <text> --oracle-secret-hex <hex> --nonce-secret-hex <hex> [--out file.json]
  oracle:verify-attestation --announcement file.json --attestation file.json [--out file.json]
  oracle:history:verify --history file.json [--out file.json]
  oracle:history:monitor --history file.json [--out file.json]
  oracle:query-announcements --fixtures-dir dir --event-id <id> [--out file.json]
  oracle:query-attestations --fixtures-dir dir --event-id <id> --outcome <text> [--announcement-digest <hex>] [--out file.json]
  oracle:query-history --history file.json --event-id <id> [--outcome <text>] [--out file.json]
  cdlc:parent-funding --network testnet4 [--out funding.json] [--raw-out funding.hex]
  taproot:prepare --network testnet4 --signer-output-secret-hex <hex> --signer-script-pubkey-hex <hex> --utxo-txid <txid> --utxo-vout <n> --utxo-value-sat <sat> --destination <addr> --fee-sat <sat> --adaptor-point-hex <compressed> [--out pending.json]
  taproot:complete --pending pending.json --attestation-secret-hex <hex> [--out completed.json] [--raw-out tx.hex]
  manifest:sample --network testnet4 --out manifest.json
  manifest:validate --file manifest.json
  lightning:manifest:sample --network regtest --out manifest.json
  lightning:manifest:validate --file manifest.json
  lightning:oracle-lock --event-id <id> --outcome <text> [--oracle-secret-hex <hex>] [--nonce-secret-hex <hex>] [--include-test-secrets] [--out file.json]
  lightning:oracle-attest --event-id <id> --outcome <text> --oracle-secret-hex <hex> --nonce-secret-hex <hex> [--expected-payment-hash-hex <hex>] [--out file.json]
  lightning:mock-run [--out file.json]
  lightning:lnd:doctor --role receiver|payer [--connect]
  lightning:lnd:create-hold-invoice --role receiver --lock lock.json --amount-msat <msat> [--memo text] [--expiry-seconds n] --allow-live-lnd [--out invoice.json]
  lightning:lnd:pay-invoice --role payer --invoice invoice.json [--fee-limit-sat sat] --allow-live-lnd [--out result.json]
  lightning:lnd:settle-invoice --role receiver --attestation attestation.json --allow-live-lnd [--out result.json]
  lightning:lnd:cancel-invoice --role receiver --payment-hash-hex <hex> --allow-live-lnd [--out result.json]
  lightning:lnd:lookup-invoice --role receiver --payment-hash-hex <hex> [--out result.json]
  rpc:info
  rpc:scan-address --address <addr>
  rpc:broadcast --raw-tx-hex <hex> --allow-broadcast [--allow-mainnet-broadcast]
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
    if (network === 'mainnet') {
      throw new Error('refusing generic mainnet wallet output; use the guarded mainnet live-run plan instead');
    }
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

  if (command === 'oracle:announcement') {
    const outcomes = stringArg(args, 'outcomes')
      .split(',')
      .map((outcome) => outcome.trim())
      .filter((outcome) => outcome.length > 0);
    writeOrPrint(args, buildOracleAnnouncement({
      eventId: stringArg(args, 'event-id'),
      outcomes,
      oracleSecretHex: stringArg(args, 'oracle-secret-hex'),
      nonceSecretHex: stringArg(args, 'nonce-secret-hex'),
      announcementSignatureNonceHex: stringArg(args, 'announcement-nonce-secret-hex'),
      expiryIso: stringArg(args, 'expiry-iso'),
      sourcePolicy: {
        kind: 'niti.oracle.source_policy.v1',
        policyId: stringArg(args, 'source-policy-id', 'manual-fixture-policy'),
        description: stringArg(
          args,
          'source-policy-description',
          'Operator-supplied source policy committed by the announcement.',
        ),
      },
    }));
    return;
  }

  if (command === 'oracle:verify-announcement') {
    const announcement = readJsonFile<unknown>(stringArg(args, 'announcement'));
    const nowIso = optionalStringArg(args, 'now-iso');
    const result = nowIso
      ? verifyOracleAnnouncementFreshness({ announcement, nowIso })
      : verifyOracleAnnouncement(announcement);
    writeOrPrint(args, result);
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  if (command === 'oracle:attestation-envelope') {
    const announcement = parseOracleAnnouncement(readJsonFile<unknown>(stringArg(args, 'announcement')));
    writeOrPrint(args, buildOracleAttestationEnvelope({
      announcement,
      outcome: stringArg(args, 'outcome'),
      oracleSecretHex: stringArg(args, 'oracle-secret-hex'),
      nonceSecretHex: stringArg(args, 'nonce-secret-hex'),
    }));
    return;
  }

  if (command === 'oracle:verify-attestation') {
    const result = verifyOracleAttestation({
      announcement: readJsonFile<unknown>(stringArg(args, 'announcement')),
      attestation: readJsonFile<unknown>(stringArg(args, 'attestation')),
    });
    writeOrPrint(args, result);
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  if (command === 'oracle:history:verify') {
    const result = verifyOracleHistoryLog(readJsonFile<unknown>(stringArg(args, 'history')));
    writeOrPrint(args, result);
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  if (command === 'oracle:history:monitor') {
    const result = monitorOracleHistory(readJsonFile<unknown>(stringArg(args, 'history')));
    writeOrPrint(args, result);
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  if (command === 'oracle:query-announcements') {
    writeOrPrint(args, queryOracleAnnouncements({
      repository: loadOracleFixtureRepository(stringArg(args, 'fixtures-dir')),
      eventId: stringArg(args, 'event-id'),
    }));
    return;
  }

  if (command === 'oracle:query-attestations') {
    writeOrPrint(args, queryOracleAttestations({
      repository: loadOracleFixtureRepository(stringArg(args, 'fixtures-dir')),
      eventId: stringArg(args, 'event-id'),
      outcome: stringArg(args, 'outcome'),
      ...(optionalStringArg(args, 'announcement-digest')
        ? { announcementDigestHex: stringArg(args, 'announcement-digest') }
        : {}),
    }));
    return;
  }

  if (command === 'oracle:query-history') {
    writeOrPrint(args, queryOracleHistory({
      history: readJsonFile<OracleHistoryLog>(stringArg(args, 'history')),
      eventId: stringArg(args, 'event-id'),
      ...(optionalStringArg(args, 'outcome')
        ? { outcome: stringArg(args, 'outcome') }
        : {}),
    }));
    return;
  }

  if (command === 'cdlc:parent-funding') {
    const network = resolveNetwork(stringArg(args, 'network', 'testnet4')).name;
    if (network === 'mainnet') {
      throw new Error('refusing to build deterministic parent funding fixture for mainnet');
    }
    const funding = buildCanonicalParentFundingFixture(network);
    const rawOut = optionalStringArg(args, 'raw-out');
    if (rawOut) {
      writeTextFile(rawOut, `${funding.parentFunding.rawTxHex}\n`);
    }
    writeOrPrint(args, funding);
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
    if (network === 'mainnet') {
      throw new Error('manifest sample does not support mainnet');
    }
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

  if (command === 'lightning:manifest:sample') {
    writeOrPrint(args, sampleLightningManifest(lightningNetworkArg(args, 'regtest')));
    return;
  }

  if (command === 'lightning:manifest:validate') {
    const result = validateLightningManifest(readJsonFile<unknown>(stringArg(args, 'file')));
    if (!result.ok) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'lightning:oracle-lock') {
    const oracleSecret = optionalStringArg(args, 'oracle-secret-hex');
    const nonceSecret = optionalStringArg(args, 'nonce-secret-hex');
    writeOrPrint(args, prepareLightningOracleLock({
      eventId: stringArg(args, 'event-id'),
      outcome: stringArg(args, 'outcome'),
      ...(oracleSecret ? { oracleSecret: scalarFromHex(oracleSecret, 'oracle-secret-hex') } : {}),
      ...(nonceSecret ? { nonceSecret: scalarFromHex(nonceSecret, 'nonce-secret-hex') } : {}),
      includeTestSecrets: args['include-test-secrets'] === true,
    }));
    return;
  }

  if (command === 'lightning:oracle-attest') {
    writeOrPrint(args, attestLightningOracle({
      eventId: stringArg(args, 'event-id'),
      outcome: stringArg(args, 'outcome'),
      oracleSecret: scalarFromHex(stringArg(args, 'oracle-secret-hex'), 'oracle-secret-hex'),
      nonceSecret: scalarFromHex(stringArg(args, 'nonce-secret-hex'), 'nonce-secret-hex'),
      ...(optionalStringArg(args, 'expected-payment-hash-hex')
        ? { expectedPaymentHashHex: stringArg(args, 'expected-payment-hash-hex') }
        : {}),
    }));
    return;
  }

  if (command === 'lightning:mock-run') {
    writeOrPrint(args, runMockLightningFlow());
    return;
  }

  if (command === 'lightning:lnd:doctor') {
    const role = lndRoleArg(args, 'receiver');
    const config = readLndConfig(role);
    const output: Record<string, unknown> = {
      config: redactLndConfig(config),
      mutatingCommandsRequireAllowLiveLnd: true,
    };
    if (args.connect === true) {
      output.getInfo = await new LndRestClient(config).getInfo();
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (command === 'lightning:lnd:create-hold-invoice') {
    requireLiveLndAllowed(args);
    const role = lndRoleArg(args, 'receiver');
    const lock = parseLightningOracleLock(readJsonFile<unknown>(stringArg(args, 'lock')));
    const expirySeconds = numberArg(args, 'expiry-seconds', 900);
    if (expirySeconds <= 0) {
      throw new Error('--expiry-seconds must be positive');
    }
    const artifact = await createHoldInvoiceArtifact({
      client: new LndRestClient(readLndConfig(role)),
      role,
      lock,
      amountMsat: stringArg(args, 'amount-msat'),
      memo: stringArg(args, 'memo', `NITI cDLC ${lock.eventId}:${lock.outcome}`),
      expirySeconds,
    });
    writeOrPrint(args, artifact);
    return;
  }

  if (command === 'lightning:lnd:pay-invoice') {
    requireLiveLndAllowed(args);
    const role = lndRoleArg(args, 'payer');
    const invoice = parseHoldInvoiceArtifact(readJsonFile<unknown>(stringArg(args, 'invoice')));
    const result = await new LndRestClient(readLndConfig(role)).sendPaymentSync({
      paymentRequest: invoice.paymentRequest,
      feeLimitSat: stringArg(args, 'fee-limit-sat', '10'),
      allowSelfPayment: args['allow-self-payment'] === true,
    });
    writeOrPrint(args, {
      kind: 'niti.lightning_payment_attempt.v1',
      role,
      paymentHashHex: invoice.paymentHashHex,
      result,
    });
    return;
  }

  if (command === 'lightning:lnd:settle-invoice') {
    requireLiveLndAllowed(args);
    const role = lndRoleArg(args, 'receiver');
    const attestation = parseLightningAttestation(
      readJsonFile<unknown>(stringArg(args, 'attestation')),
    );
    const result = await new LndRestClient(readLndConfig(role)).settleInvoice(attestation);
    writeOrPrint(args, {
      kind: 'niti.lightning_invoice_settlement.v1',
      role,
      paymentHashHex: attestation.paymentHashHex,
      result,
    });
    return;
  }

  if (command === 'lightning:lnd:cancel-invoice') {
    requireLiveLndAllowed(args);
    const role = lndRoleArg(args, 'receiver');
    const paymentHashHex = stringArg(args, 'payment-hash-hex');
    const result = await new LndRestClient(readLndConfig(role)).cancelInvoice(paymentHashHex);
    writeOrPrint(args, {
      kind: 'niti.lightning_invoice_cancel.v1',
      role,
      paymentHashHex,
      result,
    });
    return;
  }

  if (command === 'lightning:lnd:lookup-invoice') {
    const role = lndRoleArg(args, 'receiver');
    const paymentHashHex = stringArg(args, 'payment-hash-hex');
    const result = await new LndRestClient(readLndConfig(role)).lookupInvoice(paymentHashHex);
    writeOrPrint(args, {
      kind: 'niti.lightning_invoice_lookup.v1',
      role,
      paymentHashHex,
      result,
    });
    return;
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
    const blockchainInfo = await getBlockchainInfo() as Record<string, unknown>;
    if (blockchainInfo.chain === 'main' && args['allow-mainnet-broadcast'] !== true) {
      throw new Error('refusing mainnet broadcast without --allow-mainnet-broadcast');
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
