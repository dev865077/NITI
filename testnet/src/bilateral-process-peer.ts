import { mkdirSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import {
  setupMessageDigestHex,
  validateBilateralSetupTranscript,
  type BilateralSetupProtocolMessage,
  type BilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  replayBilateralStateMachine,
} from './bilateral-state-machine.js';
import {
  deriveBilateralTemplateParticipantView,
} from './bilateral-template-agreement.js';
import {
  validateBilateralFundingAgreement,
} from './bilateral-funding-validation.js';
import {
  verifyBilateralAdaptorExchange,
  type BilateralAdaptorExchange,
} from './bilateral-adaptor-exchange.js';
import type { BilateralRoleName } from './bilateral-roles.js';
import {
  writeJsonFile,
} from './io.js';

type PeerCommand =
  | {
    kind: 'setup_message';
    message: BilateralSetupProtocolMessage;
  }
  | {
    kind: 'adaptor_exchange';
    exchange: BilateralAdaptorExchange;
  }
  | {
    kind: 'finalize';
  };

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

function argValue(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

function parseRole(value: string): BilateralRoleName {
  if (value !== 'alice' && value !== 'bob') {
    throw new Error('role must be alice or bob');
  }
  return value;
}

const role = parseRole(argValue('--role'));
const storageDir = argValue('--storage');
mkdirSync(storageDir, { recursive: true });
const logPath = join(storageDir, `${role}.process.log.jsonl`);
const receivedPath = join(storageDir, `${role}.received.jsonl`);
const resultPath = join(storageDir, `${role}.result.json`);

const setupMessages: BilateralSetupProtocolMessage[] = [];
let adaptorExchange: BilateralAdaptorExchange | undefined;

function log(value: unknown): void {
  appendFileSync(logPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

function appendReceived(value: unknown): void {
  appendFileSync(receivedPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

function buildTranscript(): BilateralSetupTranscript {
  const first = setupMessages[0];
  if (!first) {
    throw new Error('no setup messages received');
  }
  return {
    kind: 'niti.l3.bilateral_setup_transcript.v1',
    schemaVersion: first.schemaVersion,
    sessionIdHex: first.sessionIdHex,
    messages: setupMessages,
    messageDigests: setupMessages.map(setupMessageDigestHex),
  };
}

function finalize(): PeerResult {
  try {
    if (!adaptorExchange) {
      throw new Error('missing adaptor exchange');
    }
    const transcript = validateBilateralSetupTranscript(buildTranscript());
    const replay = replayBilateralStateMachine(transcript);
    const funding = validateBilateralFundingAgreement(transcript);
    const template = deriveBilateralTemplateParticipantView({
      participant: role,
      transcript,
    });
    const adaptorVerification = verifyBilateralAdaptorExchange({
      participant: role,
      transcript,
      exchange: adaptorExchange,
    });
    const accepted = replay.finalState === 'setup_accepted'
      && funding.accepted
      && adaptorVerification.accepted;
    return {
      kind: 'niti.l3.two_process_peer_result.v1',
      role,
      pid: process.pid,
      storageDir,
      accepted,
      setupMessageCount: transcript.messages.length,
      adaptorExchangeMessageCount: adaptorExchange.messages.length,
      finalState: replay.finalState,
      fundingAccepted: funding.accepted,
      templateDigestHex: template.canonicalTemplateDigestHex,
      adaptorExchangeAccepted: adaptorVerification.accepted,
      ...(accepted ? {} : { rejectionReason: 'peer validation did not reach accepted setup' }),
    };
  } catch (error) {
    return {
      kind: 'niti.l3.two_process_peer_result.v1',
      role,
      pid: process.pid,
      storageDir,
      accepted: false,
      setupMessageCount: setupMessages.length,
      adaptorExchangeMessageCount: adaptorExchange?.messages.length ?? 0,
      rejectionReason: error instanceof Error ? error.message : String(error),
    };
  }
}

log({
  event: 'peer_started',
  role,
  pid: process.pid,
  storageDir,
});

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (line.trim().length === 0) {
    return;
  }
  const command = JSON.parse(line) as PeerCommand;
  appendReceived(command);
  if (command.kind === 'setup_message') {
    setupMessages.push(command.message);
    log({
      event: 'setup_message_received',
      role,
      sequence: command.message.sequence,
      messageKind: command.message.kind,
    });
  } else if (command.kind === 'adaptor_exchange') {
    adaptorExchange = command.exchange;
    log({
      event: 'adaptor_exchange_received',
      role,
      messageCount: command.exchange.messages.length,
    });
  } else {
    const result = finalize();
    writeJsonFile(resultPath, result);
    log({
      event: 'peer_finalized',
      role,
      accepted: result.accepted,
      finalState: result.finalState,
      rejectionReason: result.rejectionReason,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(result.accepted ? 0 : 2);
  }
});

rl.on('close', () => {
  const result = finalize();
  writeJsonFile(resultPath, result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.accepted ? 0 : 2);
});
