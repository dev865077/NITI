import { config as loadDotenv } from 'dotenv';

loadDotenv();

export interface RpcConfig {
  url: string;
  username?: string;
  password?: string;
  wallet?: string;
}

export function readRpcConfig(): RpcConfig {
  const url = process.env.BITCOIN_RPC_URL;
  if (!url) {
    throw new Error('BITCOIN_RPC_URL is not set');
  }
  const config: RpcConfig = { url };
  if (process.env.BITCOIN_RPC_USER) {
    config.username = process.env.BITCOIN_RPC_USER;
  }
  if (process.env.BITCOIN_RPC_PASSWORD) {
    config.password = process.env.BITCOIN_RPC_PASSWORD;
  }
  if (process.env.BITCOIN_RPC_WALLET) {
    config.wallet = process.env.BITCOIN_RPC_WALLET;
  }
  return config;
}

export async function rpcCall<T>(
  config: RpcConfig,
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const endpoint = config.wallet
    ? `${config.url.replace(/\/$/, '')}/wallet/${encodeURIComponent(config.wallet)}`
    : config.url;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (config.username || config.password) {
    headers.authorization = `Basic ${Buffer.from(
      `${config.username ?? ''}:${config.password ?? ''}`,
    ).toString('base64')}`;
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'niti',
      method,
      params,
    }),
  });
  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    result?: T;
    error?: { code: number; message: string };
  };
  if (payload.error) {
    throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
  }
  return payload.result as T;
}

export async function getBlockchainInfo(config = readRpcConfig()): Promise<unknown> {
  return rpcCall(config, 'getblockchaininfo');
}

export async function scanAddressUtxos(
  address: string,
  config = readRpcConfig(),
): Promise<unknown> {
  return rpcCall(config, 'scantxoutset', ['start', [`addr(${address})`]]);
}

export async function broadcastRawTransaction(
  rawTxHex: string,
  config = readRpcConfig(),
): Promise<string> {
  return rpcCall<string>(config, 'sendrawtransaction', [rawTxHex]);
}
