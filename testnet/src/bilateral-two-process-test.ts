import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCanonicalBilateralAdaptorExchange,
} from './bilateral-adaptor-exchange.js';
import {
  buildCanonicalBilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import type { BilateralRoleName } from './bilateral-roles.js';

interface PeerResult {
  kind: 'niti.l3.two_process_peer_result.v1';
  role: BilateralRoleName;
  pid: number;
  storageDir: string;
  accepted: boolean;
  setupMessageCount: number;
  adaptorExchangeMessageCount: number;
  finalState?: string;
  fundingAccepted?: boolean;
  templateDigestHex?: string;
  adaptorExchangeAccepted?: boolean;
  rejectionReason?: string;
}

interface PeerRun {
  role: BilateralRoleName;
  storageDir: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  result: PeerResult;
}

function peerPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), 'bilateral-process-peer.ts');
}

function spawnPeer(input: {
  role: BilateralRoleName;
  storageDir: string;
  commands: unknown[];
}): Promise<PeerRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      '--import',
      'tsx',
      peerPath(),
      '--role',
      input.role,
      '--storage',
      input.storageDir,
    ], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      try {
        const lines = stdout.trim().split(/\n/u).filter(Boolean);
        const result = JSON.parse(lines[lines.length - 1] ?? '{}') as PeerResult;
        resolve({
          role: input.role,
          storageDir: input.storageDir,
          stdout,
          stderr,
          exitCode,
          result,
        });
      } catch (error) {
        reject(error);
      }
    });

    for (const command of input.commands) {
      child.stdin.write(`${JSON.stringify(command)}\n`);
    }
    child.stdin.end();
  });
}

const root = mkdtempSync(join(tmpdir(), 'niti-l3-two-process-'));

try {
  const transcript = buildCanonicalBilateralSetupTranscript();
  const exchange = buildCanonicalBilateralAdaptorExchange(transcript);
  const transportLog = join(root, 'transport.messages.jsonl');
  const commands = [
    ...transcript.messages.map((message) => ({
      kind: 'setup_message',
      message,
    })),
    {
      kind: 'adaptor_exchange',
      exchange,
    },
    {
      kind: 'finalize',
    },
  ];

  for (const command of commands) {
    appendFileSync(transportLog, `${JSON.stringify(command)}\n`, { mode: 0o600 });
  }

  const aliceStorage = join(root, 'alice-storage');
  const bobStorage = join(root, 'bob-storage');
  const [alice, bob] = await Promise.all([
    spawnPeer({
      role: 'alice',
      storageDir: aliceStorage,
      commands,
    }),
    spawnPeer({
      role: 'bob',
      storageDir: bobStorage,
      commands,
    }),
  ]);

  for (const run of [alice, bob]) {
    assert.equal(run.exitCode, 0, `${run.role} exited with stderr: ${run.stderr}`);
    assert.equal(run.result.accepted, true, run.role);
    assert.equal(run.result.setupMessageCount, transcript.messages.length, run.role);
    assert.equal(run.result.adaptorExchangeMessageCount, exchange.messages.length, run.role);
    assert.equal(run.result.finalState, 'setup_accepted', run.role);
    assert.equal(run.result.fundingAccepted, true, run.role);
    assert.equal(run.result.adaptorExchangeAccepted, true, run.role);
    assert.equal(existsSync(join(run.storageDir, `${run.role}.process.log.jsonl`)), true);
    assert.equal(existsSync(join(run.storageDir, `${run.role}.received.jsonl`)), true);
    assert.equal(existsSync(join(run.storageDir, `${run.role}.result.json`)), true);
  }

  assert.notEqual(alice.result.pid, bob.result.pid);
  assert.notEqual(alice.storageDir, bob.storageDir);
  assert.equal(alice.result.templateDigestHex, bob.result.templateDigestHex);

  const aliceReceived = readFileSync(join(alice.storageDir, 'alice.received.jsonl'), 'utf8')
    .trim()
    .split(/\n/u)
    .length;
  const bobReceived = readFileSync(join(bob.storageDir, 'bob.received.jsonl'), 'utf8')
    .trim()
    .split(/\n/u)
    .length;
  assert.equal(aliceReceived, commands.length);
  assert.equal(bobReceived, commands.length);

  console.log(JSON.stringify({
    kind: 'niti.l3_bilateral_two_process_test.v1',
    root,
    transportLog,
    commandsSent: commands.length,
    alice: {
      pid: alice.result.pid,
      storageDir: alice.storageDir,
      accepted: alice.result.accepted,
      finalState: alice.result.finalState,
      receivedMessages: aliceReceived,
    },
    bob: {
      pid: bob.result.pid,
      storageDir: bob.storageDir,
      accepted: bob.result.accepted,
      finalState: bob.result.finalState,
      receivedMessages: bobReceived,
    },
    checks: {
      separateProcesses: alice.result.pid !== bob.result.pid,
      separateStorageDirs: alice.storageDir !== bob.storageDir,
      explicitTransportLog: existsSync(transportLog),
      templateDigestsMatch: alice.result.templateDigestHex === bob.result.templateDigestHex,
      bothAccepted: alice.result.accepted && bob.result.accepted,
    },
  }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
