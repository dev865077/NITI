import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, requireHexBytes } from './bytes.js';
import {
  attestOracleOutcome,
  prepareOracleOutcome,
  scalarFromHex,
  type OracleAttestation,
} from './secp.js';

loadDotenv();

export type LightningNetworkName = 'testnet' | 'testnet4' | 'signet' | 'regtest';
export type LndRole = 'receiver' | 'payer';

export interface LightningOracleLock {
  kind: 'niti.lightning_oracle_lock.v1';
  eventId: string;
  outcome: string;
  messageHashHex: string;
  oraclePublicXOnlyHex: string;
  oraclePublicCompressedHex: string;
  noncePointXOnlyHex: string;
  noncePointCompressedHex: string;
  attestationPointCompressedHex: string;
  paymentHashHex: string;
  paymentPreimageSource: 'oracle-attestation-secret';
  warning: string;
  testOnlySecrets?: {
    oracleSecretHex: string;
    nonceSecretHex: string;
    attestationSecretHex: string;
  };
}

export interface LightningOracleAttestation extends OracleAttestation {
  kind: 'niti.lightning_oracle_attestation.v1';
  paymentPreimageHex: string;
  paymentHashHex: string;
  paymentHashMatches?: boolean;
}

export interface LightningHoldInvoiceArtifact {
  kind: 'niti.lightning_hold_invoice.v1';
  role: LndRole;
  amountMsat: string;
  memo: string;
  expirySeconds: number;
  paymentHashHex: string;
  paymentRequest: string;
  createdAt: string;
  oracleLock: LightningOracleLock;
  lndResponse: unknown;
}

export interface LightningManifest {
  kind: 'niti.lightning_cdlc_manifest.v1';
  version: 1;
  network: LightningNetworkName;
  backend: 'lnd-rest';
  mode: 'htlc-hold-invoice';
  event: {
    id: string;
    outcome: string;
  };
  channel: {
    receiverRole: LndRole;
    payerRole: LndRole;
    amountMsat: string;
    expirySeconds: number;
  };
  safety: {
    liveLndRequiresAllowFlag: true;
    testnetOnly: true;
  };
}

export interface LndConfig {
  role: LndRole;
  url: string;
  macaroonHex: string;
  tlsCertPath?: string;
  allowInsecureTls: boolean;
  network?: string;
}

export function sha256HexFromHex(hex: string, name = 'hex'): string {
  return bytesToHex(sha256(requireHexBytes(hex, 32, name)));
}

export function prepareLightningOracleLock(input: {
  eventId: string;
  outcome: string;
  oracleSecret?: bigint;
  nonceSecret?: bigint;
  includeTestSecrets?: boolean;
}): LightningOracleLock {
  const prepared = prepareOracleOutcome({
    eventId: input.eventId,
    outcome: input.outcome,
    ...(input.oracleSecret !== undefined ? { oracleSecret: input.oracleSecret } : {}),
    ...(input.nonceSecret !== undefined ? { nonceSecret: input.nonceSecret } : {}),
  });
  const attestation = attestOracleOutcome({
    eventId: prepared.eventId,
    outcome: prepared.outcome,
    oracleSecret: scalarFromHex(prepared.oracleSecretHex, 'oracleSecret'),
    nonceSecret: scalarFromHex(prepared.nonceSecretHex, 'nonceSecret'),
  });
  const lock: LightningOracleLock = {
    kind: 'niti.lightning_oracle_lock.v1',
    eventId: prepared.eventId,
    outcome: prepared.outcome,
    messageHashHex: prepared.messageHashHex,
    oraclePublicXOnlyHex: prepared.oraclePublicXOnlyHex,
    oraclePublicCompressedHex: prepared.oraclePublicCompressedHex,
    noncePointXOnlyHex: prepared.noncePointXOnlyHex,
    noncePointCompressedHex: prepared.noncePointCompressedHex,
    attestationPointCompressedHex: prepared.attestationPointCompressedHex,
    paymentHashHex: sha256HexFromHex(attestation.attestationSecretHex, 'attestationSecret'),
    paymentPreimageSource: 'oracle-attestation-secret',
    warning:
      'TESTNET/REGTEST ONLY. The hold invoice must use paymentHashHex; only the oracle attestation reveals the preimage.',
  };
  if (input.includeTestSecrets) {
    lock.testOnlySecrets = {
      oracleSecretHex: prepared.oracleSecretHex,
      nonceSecretHex: prepared.nonceSecretHex,
      attestationSecretHex: attestation.attestationSecretHex,
    };
  }
  return lock;
}

export function attestLightningOracle(input: {
  eventId: string;
  outcome: string;
  oracleSecret: bigint;
  nonceSecret: bigint;
  expectedPaymentHashHex?: string;
}): LightningOracleAttestation {
  const attestation = attestOracleOutcome(input);
  const paymentHashHex = sha256HexFromHex(attestation.attestationSecretHex, 'attestationSecret');
  const result: LightningOracleAttestation = {
    kind: 'niti.lightning_oracle_attestation.v1',
    ...attestation,
    paymentPreimageHex: attestation.attestationSecretHex,
    paymentHashHex,
  };
  if (input.expectedPaymentHashHex !== undefined) {
    result.paymentHashMatches = normalizeHex(input.expectedPaymentHashHex) === paymentHashHex;
  }
  return result;
}

export function parseLightningOracleLock(value: unknown): LightningOracleLock {
  if (!value || typeof value !== 'object') {
    throw new Error('Lightning oracle lock must be an object');
  }
  const candidate = value as LightningOracleLock;
  if (candidate.kind !== 'niti.lightning_oracle_lock.v1') {
    throw new Error('unsupported Lightning oracle lock kind');
  }
  requireHexBytes(candidate.paymentHashHex, 32, 'paymentHashHex');
  requireHexBytes(candidate.attestationPointCompressedHex, 33, 'attestationPointCompressedHex');
  return candidate;
}

export function parseLightningAttestation(value: unknown): LightningOracleAttestation {
  if (!value || typeof value !== 'object') {
    throw new Error('Lightning oracle attestation must be an object');
  }
  const candidate = value as LightningOracleAttestation;
  if (candidate.kind !== 'niti.lightning_oracle_attestation.v1') {
    throw new Error('unsupported Lightning oracle attestation kind');
  }
  requireHexBytes(candidate.paymentPreimageHex, 32, 'paymentPreimageHex');
  requireHexBytes(candidate.paymentHashHex, 32, 'paymentHashHex');
  return candidate;
}

export function sampleLightningManifest(
  network: LightningNetworkName = 'regtest',
): LightningManifest {
  return {
    kind: 'niti.lightning_cdlc_manifest.v1',
    version: 1,
    network,
    backend: 'lnd-rest',
    mode: 'htlc-hold-invoice',
    event: {
      id: 'niti-lightning-regtest-1',
      outcome: 'BTCUSD_ABOVE_STRIKE',
    },
    channel: {
      receiverRole: 'receiver',
      payerRole: 'payer',
      amountMsat: '1000',
      expirySeconds: 900,
    },
    safety: {
      liveLndRequiresAllowFlag: true,
      testnetOnly: true,
    },
  };
}

export function validateLightningManifest(value: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return { ok: false, errors: ['manifest must be an object'] };
  }
  const manifest = value as Partial<LightningManifest>;
  if (manifest.kind !== 'niti.lightning_cdlc_manifest.v1') {
    errors.push('kind must be niti.lightning_cdlc_manifest.v1');
  }
  if (manifest.version !== 1) {
    errors.push('version must be 1');
  }
  if (!['testnet', 'testnet4', 'signet', 'regtest'].includes(String(manifest.network))) {
    errors.push('network must be testnet, testnet4, signet, or regtest');
  }
  if (manifest.backend !== 'lnd-rest') {
    errors.push('backend must be lnd-rest');
  }
  if (manifest.mode !== 'htlc-hold-invoice') {
    errors.push('mode must be htlc-hold-invoice');
  }
  if (!manifest.event?.id) {
    errors.push('event.id is required');
  }
  if (!manifest.event?.outcome) {
    errors.push('event.outcome is required');
  }
  if (!manifest.channel) {
    errors.push('channel is required');
  } else {
    if (manifest.channel.receiverRole !== 'receiver') {
      errors.push('channel.receiverRole must be receiver');
    }
    if (manifest.channel.payerRole !== 'payer') {
      errors.push('channel.payerRole must be payer');
    }
    if (!isPositiveIntegerString(manifest.channel.amountMsat)) {
      errors.push('channel.amountMsat must be a positive integer string');
    }
    if (!Number.isInteger(manifest.channel.expirySeconds) || manifest.channel.expirySeconds <= 0) {
      errors.push('channel.expirySeconds must be a positive integer');
    }
  }
  if (manifest.safety?.liveLndRequiresAllowFlag !== true) {
    errors.push('safety.liveLndRequiresAllowFlag must be true');
  }
  if (manifest.safety?.testnetOnly !== true) {
    errors.push('safety.testnetOnly must be true');
  }
  return { ok: errors.length === 0, errors };
}

export function readLndConfig(role: LndRole): LndConfig {
  const prefix = `LND_${role.toUpperCase()}`;
  const url = process.env[`${prefix}_URL`] ?? process.env.LND_REST_URL;
  if (!url) {
    throw new Error(`${prefix}_URL is not set`);
  }
  const macaroonHex = readMacaroonHex(prefix);
  const config: LndConfig = {
    role,
    url,
    macaroonHex,
    allowInsecureTls:
      process.env[`${prefix}_ALLOW_INSECURE_TLS`] === 'true'
      || process.env.LND_ALLOW_INSECURE_TLS === 'true',
  };
  const tlsCertPath = process.env[`${prefix}_TLS_CERT_PATH`] ?? process.env.LND_TLS_CERT_PATH;
  if (tlsCertPath) {
    config.tlsCertPath = tlsCertPath;
  }
  const network = process.env[`${prefix}_NETWORK`] ?? process.env.LND_NETWORK;
  if (network) {
    config.network = network;
  }
  return config;
}

export function redactLndConfig(config: LndConfig): Record<string, unknown> {
  return {
    role: config.role,
    url: config.url,
    network: config.network ?? null,
    hasMacaroon: config.macaroonHex.length > 0,
    tlsCertPath: config.tlsCertPath ?? null,
    allowInsecureTls: config.allowInsecureTls,
  };
}

export class LndRestClient {
  constructor(private readonly config: LndConfig) {}

  getInfo(): Promise<unknown> {
    return this.request('GET', '/v1/getinfo');
  }

  addHoldInvoice(input: {
    lock: LightningOracleLock;
    amountMsat: string;
    memo: string;
    expirySeconds: number;
    isPrivate?: boolean;
  }): Promise<unknown> {
    if (!isPositiveIntegerString(input.amountMsat)) {
      throw new Error('amountMsat must be a positive integer string');
    }
    return this.request('POST', '/v2/invoices/hodl', {
      memo: input.memo,
      hash: hexToBase64(input.lock.paymentHashHex, 'paymentHashHex'),
      value_msat: input.amountMsat,
      expiry: String(input.expirySeconds),
      private: input.isPrivate ?? false,
    });
  }

  settleInvoice(attestation: LightningOracleAttestation): Promise<unknown> {
    return this.request('POST', '/v2/invoices/settle', {
      preimage: hexToBase64(attestation.paymentPreimageHex, 'paymentPreimageHex'),
    });
  }

  cancelInvoice(paymentHashHex: string): Promise<unknown> {
    return this.request('POST', '/v2/invoices/cancel', {
      payment_hash: hexToBase64(paymentHashHex, 'paymentHashHex'),
    });
  }

  lookupInvoice(paymentHashHex: string): Promise<unknown> {
    requireHexBytes(paymentHashHex, 32, 'paymentHashHex');
    return this.request('GET', `/v1/invoice/${normalizeHex(paymentHashHex)}`);
  }

  sendPaymentSync(input: {
    paymentRequest: string;
    feeLimitSat: string;
    allowSelfPayment?: boolean;
  }): Promise<unknown> {
    if (!isPositiveIntegerString(input.feeLimitSat)) {
      throw new Error('feeLimitSat must be a positive integer string');
    }
    return this.request('POST', '/v1/channels/transactions', {
      payment_request: input.paymentRequest,
      fee_limit: {
        fixed: input.feeLimitSat,
      },
      allow_self_payment: input.allowSelfPayment ?? false,
    });
  }

  private request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
    return lndRequest(this.config, method, path, body);
  }
}

export async function createHoldInvoiceArtifact(input: {
  client: LndRestClient;
  role: LndRole;
  lock: LightningOracleLock;
  amountMsat: string;
  memo: string;
  expirySeconds: number;
}): Promise<LightningHoldInvoiceArtifact> {
  const lndResponse = await input.client.addHoldInvoice({
    lock: input.lock,
    amountMsat: input.amountMsat,
    memo: input.memo,
    expirySeconds: input.expirySeconds,
  });
  const paymentRequest = extractPaymentRequest(lndResponse);
  return {
    kind: 'niti.lightning_hold_invoice.v1',
    role: input.role,
    amountMsat: input.amountMsat,
    memo: input.memo,
    expirySeconds: input.expirySeconds,
    paymentHashHex: input.lock.paymentHashHex,
    paymentRequest,
    createdAt: new Date().toISOString(),
    oracleLock: input.lock,
    lndResponse,
  };
}

export function parseHoldInvoiceArtifact(value: unknown): LightningHoldInvoiceArtifact {
  if (!value || typeof value !== 'object') {
    throw new Error('hold invoice artifact must be an object');
  }
  const candidate = value as LightningHoldInvoiceArtifact;
  if (candidate.kind !== 'niti.lightning_hold_invoice.v1') {
    throw new Error('unsupported hold invoice artifact kind');
  }
  if (!candidate.paymentRequest) {
    throw new Error('hold invoice artifact is missing paymentRequest');
  }
  requireHexBytes(candidate.paymentHashHex, 32, 'paymentHashHex');
  parseLightningOracleLock(candidate.oracleLock);
  return candidate;
}

export function runMockLightningFlow(): Record<string, unknown> {
  const lock = prepareLightningOracleLock({
    eventId: 'niti-lightning-mock',
    outcome: 'BTCUSD_ABOVE_STRIKE',
    oracleSecret: scalarFromHex(
      '2222222222222222222222222222222222222222222222222222222222222222',
      'oracle secret',
    ),
    nonceSecret: scalarFromHex(
      '3333333333333333333333333333333333333333333333333333333333333333',
      'nonce secret',
    ),
    includeTestSecrets: true,
  });
  const secrets = lock.testOnlySecrets;
  if (!secrets) {
    throw new Error('mock lock must include test secrets');
  }
  const attestation = attestLightningOracle({
    eventId: lock.eventId,
    outcome: lock.outcome,
    oracleSecret: scalarFromHex(secrets.oracleSecretHex, 'oracleSecret'),
    nonceSecret: scalarFromHex(secrets.nonceSecretHex, 'nonceSecret'),
    expectedPaymentHashHex: lock.paymentHashHex,
  });
  const wrongPreimageHex =
    '4444444444444444444444444444444444444444444444444444444444444444';
  const wrongPreimageHashHex = sha256HexFromHex(wrongPreimageHex, 'wrongPreimage');
  const invoice = {
    accepted: true,
    settled:
      attestation.paymentHashMatches === true
      && sha256HexFromHex(attestation.paymentPreimageHex, 'paymentPreimage')
        === lock.paymentHashHex,
    wrongPreimageRejected: wrongPreimageHashHex !== lock.paymentHashHex,
  };

  return {
    kind: 'niti.lightning_mock_flow.v1',
    lock: {
      eventId: lock.eventId,
      outcome: lock.outcome,
      paymentHashHex: lock.paymentHashHex,
      attestationPointCompressedHex: lock.attestationPointCompressedHex,
    },
    attestation: {
      verifies: attestation.verifies,
      paymentHashMatches: attestation.paymentHashMatches,
      paymentPreimageHex: attestation.paymentPreimageHex,
    },
    invoice,
    ptlc: {
      pointLockHex: lock.attestationPointCompressedHex,
      witnessScalarHex: attestation.paymentPreimageHex,
    },
  };
}

function lndRequest(
  config: LndConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = new URL(path, config.url.endsWith('/') ? config.url : `${config.url}/`);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers: Record<string, string> = {
    'Grpc-Metadata-macaroon': config.macaroonHex,
  };
  if (payload !== undefined) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = Buffer.byteLength(payload).toString();
  }
  const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const options: Parameters<typeof requestFn>[1] = {
    method,
    headers,
  };
  if (url.protocol === 'https:') {
    options.rejectUnauthorized = !config.allowInsecureTls;
    if (config.tlsCertPath) {
      options.ca = readFileSync(config.tlsCertPath);
    }
  }

  return new Promise((resolve, reject) => {
    const req = requestFn(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`LND ${method} ${path} HTTP ${res.statusCode}: ${text}`));
          return;
        }
        if (!text) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve({ raw: text });
        }
      });
    });
    req.on('error', reject);
    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

function readMacaroonHex(prefix: string): string {
  const direct = process.env[`${prefix}_MACAROON_HEX`] ?? process.env.LND_MACAROON_HEX;
  if (direct) {
    return normalizeHex(direct);
  }
  const path = process.env[`${prefix}_MACAROON_PATH`] ?? process.env.LND_MACAROON_PATH;
  if (!path) {
    throw new Error(`${prefix}_MACAROON_HEX or ${prefix}_MACAROON_PATH is required`);
  }
  return readFileSync(path).toString('hex');
}

function hexToBase64(hex: string, name: string): string {
  return Buffer.from(requireHexBytes(hex, 32, name)).toString('base64');
}

function normalizeHex(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2).toLowerCase() : hex.toLowerCase();
}

function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
}

function extractPaymentRequest(response: unknown): string {
  if (!response || typeof response !== 'object') {
    throw new Error('LND add hold invoice response must be an object');
  }
  const record = response as Record<string, unknown>;
  const value = record.payment_request ?? record.paymentRequest;
  if (typeof value !== 'string' || !value) {
    throw new Error('LND response did not include payment_request');
  }
  return value;
}
