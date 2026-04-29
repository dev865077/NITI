import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { deriveTaprootWallet, resolveNetwork } from './taproot.js';
import { scalarFromHex } from './secp.js';

function run(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'testnet/src/public-cdlc-evidence.ts', ...args],
    { encoding: 'utf8' },
  );
}

const network = resolveNetwork('mainnet');
assert.equal(network.name, 'mainnet');

const wallet = deriveTaprootWallet({
  network: 'mainnet',
  internalSecret: scalarFromHex(
    '1212121212121212121212121212121212121212121212121212121212121212',
    'test secret',
  ),
});
assert.match(wallet.address, /^bc1p/);

const workDir = mkdtempSync(path.join(tmpdir(), 'niti-mainnet-guards-'));
const privatePlanPath = path.join(workDir, 'private-plan.json');
const planResult = run(['--mode', 'mainnet-plan', '--out', privatePlanPath]);
assert.equal(planResult.status, 0, String(planResult.stderr));

const privatePlan = JSON.parse(readFileSync(privatePlanPath, 'utf8')) as {
  kind: string;
  network: string;
  secrets: Record<string, string>;
};
assert.equal(privatePlan.kind, 'niti.v0_1_mainnet_live_run_private_plan.v1');
assert.equal(privatePlan.network, 'mainnet');
assert.ok(privatePlan.secrets.parentFunding);

const refusedDeterministicFunding = run([
  '--mode',
  'funding-request',
  '--network',
  'mainnet',
  '--out',
  path.join(workDir, 'no-plan.json'),
]);
assert.notEqual(refusedDeterministicFunding.status, 0);
assert.match(String(refusedDeterministicFunding.stderr), /--plan is required/);

const fundingRequestPath = path.join(workDir, 'funding-request.json');
const fundingRequestResult = run([
  '--mode',
  'funding-request',
  '--network',
  'mainnet',
  '--plan',
  privatePlanPath,
  '--out',
  fundingRequestPath,
]);
assert.equal(fundingRequestResult.status, 0, String(fundingRequestResult.stderr));

const fundingRequest = JSON.parse(readFileSync(fundingRequestPath, 'utf8')) as {
  kind: string;
  network: string;
  address: string;
  minimumValueSat: string;
};
assert.equal(fundingRequest.kind, 'niti.v0_1_mainnet_cdlc_funding_request.v1');
assert.equal(fundingRequest.network, 'mainnet');
assert.match(fundingRequest.address, /^bc1p/);
assert.equal(fundingRequest.minimumValueSat, '2330');

console.log(JSON.stringify({
  mainnetNetworkResolved: true,
  mainnetAddressPrefix: fundingRequest.address.slice(0, 4),
  deterministicMainnetFundingRefused: true,
  privatePlanGenerated: true,
}, null, 2));
