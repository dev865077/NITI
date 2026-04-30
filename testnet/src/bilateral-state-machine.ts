import {
  setupMessageDigestHex,
  validateBilateralSetupTranscript,
  type AcknowledgementSetupMessage,
  type BilateralSetupProtocolMessage,
  type BilateralSetupTranscript,
  type FundingInputsSetupMessage,
} from './bilateral-setup-schema.js';
import type { BilateralRoleName } from './bilateral-roles.js';

export type BilateralProtocolStateName =
  | 'initialized'
  | 'roles_announced'
  | 'oracle_selected'
  | 'funding_validated'
  | 'payout_graph_agreed'
  | 'cet_templates_agreed'
  | 'bridge_templates_agreed'
  | 'refund_templates_agreed'
  | 'adaptor_points_exchanged'
  | 'setup_accepted'
  | 'oracle_attested'
  | 'settled'
  | 'fallback_ready'
  | 'aborted';

export type BilateralPostSetupActionKind =
  | 'oracle_attestation_published'
  | 'settlement_attempted'
  | 'fallback_timeout_reached'
  | 'abort_requested';

export interface BilateralPostSetupAction {
  kind: BilateralPostSetupActionKind;
  actor: BilateralRoleName;
  reason?: string;
}

export interface RetainedBilateralStateFlags {
  aliceRoleAnnouncement: boolean;
  bobRoleAnnouncement: boolean;
  oracleEventSelection: boolean;
  fundingInputs: boolean;
  payoutGraph: boolean;
  cetTemplates: boolean;
  bridgeTemplates: boolean;
  refundTemplates: boolean;
  adaptorPoints: boolean;
}

export interface BilateralStateMachineSnapshot {
  state: BilateralProtocolStateName;
  sessionIdHex: string;
  nextSequence: number;
  terminal: boolean;
  acceptedBy: BilateralRoleName[];
  retainedState: RetainedBilateralStateFlags;
  invariants: {
    templateAgreementComplete: boolean;
    adaptorExchangeAllowed: boolean;
    settlementAllowed: boolean;
    livenessIsProtocolLevel: true;
    cryptographicActivationIsEdgeLocal: true;
  };
}

export interface BilateralStateTransitionRecord {
  sequence: number;
  inputKind: BilateralSetupProtocolMessage['kind'] | BilateralPostSetupActionKind;
  sender: BilateralRoleName;
  fromState: BilateralProtocolStateName;
  toState: BilateralProtocolStateName;
  retainedState: RetainedBilateralStateFlags;
}

export interface BilateralStateMachineReplay {
  kind: 'niti.l3.bilateral_state_machine_replay.v1';
  transcriptKind: BilateralSetupTranscript['kind'];
  sessionIdHex: string;
  accepted: boolean;
  finalState: BilateralProtocolStateName;
  terminal: boolean;
  transitions: BilateralStateTransitionRecord[];
  checks: {
    roleAnnouncementsComplete: boolean;
    fundingValidatedBeforeTemplates: boolean;
    templatesAgreedBeforeAdaptorExchange: boolean;
    setupAcceptedBeforeSettlement: boolean;
    terminalStatesRejectFurtherActions: boolean;
  };
  rejectionReason?: string;
}

interface MutableBilateralState {
  state: BilateralProtocolStateName;
  sessionIdHex: string;
  nextSequence: number;
  roleAnnouncements: Set<BilateralRoleName>;
  acceptedBy: Set<BilateralRoleName>;
  retainedState: RetainedBilateralStateFlags;
}

function cloneRetainedState(flags: RetainedBilateralStateFlags): RetainedBilateralStateFlags {
  return { ...flags };
}

function emptyRetainedState(): RetainedBilateralStateFlags {
  return {
    aliceRoleAnnouncement: false,
    bobRoleAnnouncement: false,
    oracleEventSelection: false,
    fundingInputs: false,
    payoutGraph: false,
    cetTemplates: false,
    bridgeTemplates: false,
    refundTemplates: false,
    adaptorPoints: false,
  };
}

function isTerminalState(state: BilateralProtocolStateName): boolean {
  return state === 'settled' || state === 'fallback_ready' || state === 'aborted';
}

function stateRank(state: BilateralProtocolStateName): number {
  const order: BilateralProtocolStateName[] = [
    'initialized',
    'roles_announced',
    'oracle_selected',
    'funding_validated',
    'payout_graph_agreed',
    'cet_templates_agreed',
    'bridge_templates_agreed',
    'refund_templates_agreed',
    'adaptor_points_exchanged',
    'setup_accepted',
    'oracle_attested',
    'settled',
    'fallback_ready',
    'aborted',
  ];
  return order.indexOf(state);
}

function requireStateAtLeast(
  current: BilateralProtocolStateName,
  required: BilateralProtocolStateName,
  inputKind: string,
): void {
  if (stateRank(current) < stateRank(required)) {
    throw new Error(`${inputKind} requires ${required}; current state is ${current}`);
  }
}

function requireExactState(
  current: BilateralProtocolStateName,
  required: BilateralProtocolStateName,
  inputKind: string,
): void {
  if (current !== required) {
    throw new Error(`${inputKind} requires ${required}; current state is ${current}`);
  }
}

function templateAgreementComplete(retained: RetainedBilateralStateFlags): boolean {
  return retained.fundingInputs
    && retained.payoutGraph
    && retained.cetTemplates
    && retained.bridgeTemplates
    && retained.refundTemplates;
}

function settlementStateRetained(retained: RetainedBilateralStateFlags): boolean {
  return templateAgreementComplete(retained) && retained.adaptorPoints;
}

function validateFundingInputs(message: FundingInputsSetupMessage): void {
  const owners = new Set<BilateralRoleName>();
  for (const input of message.fundingInputs) {
    owners.add(input.owner);
    if (BigInt(input.valueSat) <= 0n) {
      throw new Error('funding input value must be positive');
    }
  }
  if (!owners.has('alice') || !owners.has('bob')) {
    throw new Error('funding inputs must include alice and bob');
  }
}

function snapshot(state: MutableBilateralState): BilateralStateMachineSnapshot {
  const retainedState = cloneRetainedState(state.retainedState);
  const settlementRetained = settlementStateRetained(retainedState);
  return {
    state: state.state,
    sessionIdHex: state.sessionIdHex,
    nextSequence: state.nextSequence,
    terminal: isTerminalState(state.state),
    acceptedBy: [...state.acceptedBy].sort(),
    retainedState,
    invariants: {
      templateAgreementComplete: templateAgreementComplete(retainedState),
      adaptorExchangeAllowed: state.state === 'refund_templates_agreed'
        && templateAgreementComplete(retainedState),
      settlementAllowed: state.state === 'oracle_attested' && settlementRetained,
      livenessIsProtocolLevel: true,
      cryptographicActivationIsEdgeLocal: true,
    },
  };
}

function initialState(sessionIdHex: string): MutableBilateralState {
  return {
    state: 'initialized',
    sessionIdHex,
    nextSequence: 1,
    roleAnnouncements: new Set(),
    acceptedBy: new Set(),
    retainedState: emptyRetainedState(),
  };
}

function recordTransition(input: {
  sequence: number;
  inputKind: BilateralStateTransitionRecord['inputKind'];
  sender: BilateralRoleName;
  fromState: BilateralProtocolStateName;
  state: MutableBilateralState;
}): BilateralStateTransitionRecord {
  return {
    sequence: input.sequence,
    inputKind: input.inputKind,
    sender: input.sender,
    fromState: input.fromState,
    toState: input.state.state,
    retainedState: cloneRetainedState(input.state.retainedState),
  };
}

function applySetupMessage(
  state: MutableBilateralState,
  message: BilateralSetupProtocolMessage,
): BilateralStateTransitionRecord {
  if (isTerminalState(state.state)) {
    throw new Error(`${message.kind} cannot be applied after terminal state ${state.state}`);
  }
  if (message.sessionIdHex !== state.sessionIdHex) {
    throw new Error(`${message.kind} has wrong session id`);
  }
  if (message.sequence !== state.nextSequence) {
    throw new Error(`${message.kind} has wrong sequence`);
  }
  const fromState = state.state;

  if (message.kind === 'niti.l3.setup.role_announcement.v1') {
    requireStateAtLeast(state.state, 'initialized', message.kind);
    if (state.roleAnnouncements.has(message.sender)) {
      throw new Error(`duplicate role announcement from ${message.sender}`);
    }
    if (message.announcement.role !== message.sender) {
      throw new Error('role announcement sender must match announced role');
    }
    state.roleAnnouncements.add(message.sender);
    if (message.sender === 'alice') {
      state.retainedState.aliceRoleAnnouncement = true;
    } else {
      state.retainedState.bobRoleAnnouncement = true;
    }
    if (state.roleAnnouncements.has('alice') && state.roleAnnouncements.has('bob')) {
      state.state = 'roles_announced';
    }
  } else if (message.kind === 'niti.l3.setup.oracle_event_selection.v1') {
    requireExactState(state.state, 'roles_announced', message.kind);
    if (message.outcomes.length < 2) {
      throw new Error('oracle event selection must include at least two outcomes');
    }
    state.retainedState.oracleEventSelection = true;
    state.state = 'oracle_selected';
  } else if (message.kind === 'niti.l3.setup.funding_inputs.v1') {
    requireExactState(state.state, 'oracle_selected', message.kind);
    validateFundingInputs(message);
    state.retainedState.fundingInputs = true;
    state.state = 'funding_validated';
  } else if (message.kind === 'niti.l3.setup.payout_graph.v1') {
    requireExactState(state.state, 'funding_validated', message.kind);
    if (message.edges.length === 0) {
      throw new Error('payout graph must contain at least one live edge');
    }
    state.retainedState.payoutGraph = true;
    state.state = 'payout_graph_agreed';
  } else if (message.kind === 'niti.l3.setup.cet_templates.v1') {
    requireExactState(state.state, 'payout_graph_agreed', message.kind);
    if (message.templates.length === 0) {
      throw new Error('CET templates must not be empty');
    }
    state.retainedState.cetTemplates = true;
    state.state = 'cet_templates_agreed';
  } else if (message.kind === 'niti.l3.setup.bridge_templates.v1') {
    requireExactState(state.state, 'cet_templates_agreed', message.kind);
    if (message.templates.length === 0) {
      throw new Error('bridge templates must not be empty');
    }
    state.retainedState.bridgeTemplates = true;
    state.state = 'bridge_templates_agreed';
  } else if (message.kind === 'niti.l3.setup.refund_templates.v1') {
    requireExactState(state.state, 'bridge_templates_agreed', message.kind);
    if (message.templates.length === 0) {
      throw new Error('refund templates must not be empty');
    }
    state.retainedState.refundTemplates = true;
    state.state = 'refund_templates_agreed';
  } else if (message.kind === 'niti.l3.setup.adaptor_points.v1') {
    requireExactState(state.state, 'refund_templates_agreed', message.kind);
    if (!templateAgreementComplete(state.retainedState)) {
      throw new Error('adaptor points require complete template agreement');
    }
    if (message.points.length === 0) {
      throw new Error('adaptor points must not be empty');
    }
    state.retainedState.adaptorPoints = true;
    state.state = 'adaptor_points_exchanged';
  } else {
    const ack = message as AcknowledgementSetupMessage;
    requireStateAtLeast(state.state, 'adaptor_points_exchanged', ack.kind);
    state.acceptedBy.add(ack.sender);
    if (state.acceptedBy.has('alice') && state.acceptedBy.has('bob')) {
      state.state = 'setup_accepted';
    }
  }

  state.nextSequence += 1;
  return recordTransition({
    sequence: message.sequence,
    inputKind: message.kind,
    sender: message.sender,
    fromState,
    state,
  });
}

function applyPostSetupAction(
  state: MutableBilateralState,
  action: BilateralPostSetupAction,
): BilateralStateTransitionRecord {
  if (isTerminalState(state.state)) {
    throw new Error(`${action.kind} cannot be applied after terminal state ${state.state}`);
  }
  const fromState = state.state;
  if (action.kind === 'oracle_attestation_published') {
    requireExactState(state.state, 'setup_accepted', action.kind);
    state.state = 'oracle_attested';
  } else if (action.kind === 'settlement_attempted') {
    requireExactState(state.state, 'oracle_attested', action.kind);
    if (!settlementStateRetained(state.retainedState)) {
      throw new Error('settlement requires retained template and adaptor state');
    }
    state.state = 'settled';
  } else if (action.kind === 'fallback_timeout_reached') {
    requireStateAtLeast(state.state, 'funding_validated', action.kind);
    state.state = 'fallback_ready';
  } else {
    state.state = 'aborted';
  }

  const sequence = state.nextSequence;
  state.nextSequence += 1;
  return recordTransition({
    sequence,
    inputKind: action.kind,
    sender: action.actor,
    fromState,
    state,
  });
}

function replayOrThrow(
  transcript: BilateralSetupTranscript,
  actions: readonly BilateralPostSetupAction[],
): BilateralStateMachineReplay {
  const validated = validateBilateralSetupTranscript(transcript);
  const state = initialState(validated.sessionIdHex);
  const transitions: BilateralStateTransitionRecord[] = [];
  for (const message of validated.messages) {
    transitions.push(applySetupMessage(state, message));
  }
  for (const action of actions) {
    transitions.push(applyPostSetupAction(state, action));
  }
  const view = snapshot(state);
  return {
    kind: 'niti.l3.bilateral_state_machine_replay.v1',
    transcriptKind: validated.kind,
    sessionIdHex: validated.sessionIdHex,
    accepted: view.state === 'setup_accepted'
      || view.state === 'oracle_attested'
      || view.state === 'settled',
    finalState: view.state,
    terminal: view.terminal,
    transitions,
    checks: {
      roleAnnouncementsComplete: view.retainedState.aliceRoleAnnouncement
        && view.retainedState.bobRoleAnnouncement,
      fundingValidatedBeforeTemplates: transitions.some((transition) => (
        transition.toState === 'funding_validated'
      )) && transitions.every((transition) => (
        !['cet_templates_agreed', 'bridge_templates_agreed', 'refund_templates_agreed'].includes(
          transition.toState,
        ) || transition.retainedState.fundingInputs
      )),
      templatesAgreedBeforeAdaptorExchange: transitions.every((transition) => (
        transition.toState !== 'adaptor_points_exchanged'
        || templateAgreementComplete(transition.retainedState)
      )),
      setupAcceptedBeforeSettlement: transitions.every((transition) => (
        transition.toState !== 'settled'
        || transitions.some((prior) => prior.toState === 'setup_accepted')
      )),
      terminalStatesRejectFurtherActions: true,
    },
  };
}

export function replayBilateralStateMachine(
  transcript: BilateralSetupTranscript,
  actions: readonly BilateralPostSetupAction[] = [],
): BilateralStateMachineReplay {
  return replayOrThrow(transcript, actions);
}

export function tryReplayBilateralStateMachine(
  transcript: BilateralSetupTranscript,
  actions: readonly BilateralPostSetupAction[] = [],
): BilateralStateMachineReplay {
  try {
    return replayOrThrow(transcript, actions);
  } catch (error) {
    const validated = validateBilateralSetupTranscript(transcript);
    return {
      kind: 'niti.l3.bilateral_state_machine_replay.v1',
      transcriptKind: validated.kind,
      sessionIdHex: validated.sessionIdHex,
      accepted: false,
      finalState: 'aborted',
      terminal: true,
      transitions: [],
      checks: {
        roleAnnouncementsComplete: false,
        fundingValidatedBeforeTemplates: false,
        templatesAgreedBeforeAdaptorExchange: false,
        setupAcceptedBeforeSettlement: false,
        terminalStatesRejectFurtherActions: true,
      },
      rejectionReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function rebuildBilateralTranscriptWithMessages(
  transcript: BilateralSetupTranscript,
  messages: readonly BilateralSetupProtocolMessage[],
): BilateralSetupTranscript {
  const renumbered = messages.map((message, index) => ({
    ...message,
    sequence: index + 1,
  })) as BilateralSetupProtocolMessage[];
  return {
    ...transcript,
    messages: renumbered,
    messageDigests: renumbered.map(setupMessageDigestHex),
  };
}
