import { writeFileSync } from 'node:fs';

export interface CdlcManifest {
  version: 1;
  network: 'testnet' | 'testnet4' | 'signet' | 'regtest';
  nodes: Array<{
    id: string;
    collateral_sat: number;
    refund_height: number;
  }>;
  edges: Array<{
    from: string;
    outcome: string;
    to: string;
    bridge_value_sat: number;
    timeout_height: number;
  }>;
}

export function sampleManifest(network: CdlcManifest['network'] = 'testnet4'): CdlcManifest {
  return {
    version: 1,
    network,
    nodes: [
      { id: 'root', collateral_sat: 100_000, refund_height: 3_000_000 },
      { id: 'usd_roll_1', collateral_sat: 90_000, refund_height: 3_000_300 },
      { id: 'refund_leaf', collateral_sat: 90_000, refund_height: 3_000_400 },
    ],
    edges: [
      {
        from: 'root',
        outcome: 'BTCUSD_ABOVE_STRIKE',
        to: 'usd_roll_1',
        bridge_value_sat: 90_000,
        timeout_height: 3_000_100,
      },
      {
        from: 'usd_roll_1',
        outcome: 'BTCUSD_BELOW_STRIKE',
        to: 'refund_leaf',
        bridge_value_sat: 80_000,
        timeout_height: 3_000_350,
      },
    ],
  };
}

export function deterministicJson(value: unknown): string {
  return `${stringifySorted(value, 0)}\n`;
}

function stringifySorted(value: unknown, level: number): string {
  const indent = '  '.repeat(level);
  const nextIndent = '  '.repeat(level + 1);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[\n${value
      .map((item) => `${nextIndent}${stringifySorted(item, level + 1)}`)
      .join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
      return '{}';
    }
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${stringifySorted(item, level + 1)}`)
      .join(',\n')}\n${indent}}`;
  }
  throw new Error(`unsupported JSON value: ${String(value)}`);
}

export function writeSampleManifest(path: string, network: CdlcManifest['network']): void {
  writeFileSync(path, deterministicJson(sampleManifest(network)), { mode: 0o600 });
}
