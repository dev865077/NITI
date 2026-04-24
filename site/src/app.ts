type StageKey = 'prepare' | 'attest' | 'activate';
type ModeKey = 'htlc' | 'ptlc';
type ProofKey = 'integer' | 'residue' | 'mod' | 'lightning';
type CommandKey = 'bitcoin' | 'lightning' | 'proofs';

const stages: Record<StageKey, { title: string; equation: string; active: string[] }> = {
  prepare: {
    title: 'Before resolution',
    equation:
      'S_x = R_o + H(R_o || V || x)V\nB_e signatures are adaptor signatures locked to S_x',
    active: ['oracle', 'parent'],
  },
  attest: {
    title: 'Oracle attests',
    equation:
      's_x = r_o + H(R_o || V || x)v mod n\ns_xG = S_x',
    active: ['oracle', 'parent', 'bridge'],
  },
  activate: {
    title: 'Child edge activates',
    equation:
      's_a = s_hat_a + s_x mod n\nB_e becomes valid and funds Funding_j',
    active: ['bridge', 'child'],
  },
};

const modes: Record<ModeKey, { title: string; copy: string; left: string; right: string; note: string }> = {
  htlc: {
    title: 'HTLC-compatible path',
    copy:
      'The oracle announcement commits to h_x = SHA256(s_x). A receiver creates a hold invoice using h_x. After attestation, s_x settles the invoice.',
    left: 'h_x',
    right: 'SHA256(s_x)',
    note: 'Every hop sees the same payment hash.',
  },
  ptlc: {
    title: 'Point-locked path',
    copy:
      'The ordinary DLC point S_x is the payment point. Each hop can receive a tweaked point and derive its upstream scalar after downstream settlement.',
    left: 'T_i = S_x + d_iG',
    right: 't_i = s_x + d_i',
    note: 'Each hop can see a distinct point lock.',
  },
};

const proofs: Record<ProofKey, { name: string; body: string; checks: string }> = {
  integer: {
    name: 'cdlc_integer_proofs.gpr',
    body:
      'Oracle scalar maps to S_x\nAdaptor verifies before completion\nCompletion verifies after s_x\nExtraction recovers s_x\nWrong scalar rejected',
    checks: '109',
  },
  residue: {
    name: 'cdlc_residue_proofs.gpr',
    body:
      'Explicit modular reduction over Z/97Z\nAddition commutes\nSubtraction cancels addition\nAdaptor completion survives finite residue arithmetic',
    checks: '85',
  },
  mod: {
    name: 'cdlc_proofs.gpr',
    body:
      'Ada built-in type mod 97\nGhost lemmas close modular rotation\nWrong witness does not verify\nNo unproved bit-vector obligations',
    checks: '65',
  },
  lightning: {
    name: 'lightning_cdlc_proofs.gpr',
    body:
      'Oracle scalar redeems HTLC and PTLC locks\nWrong witness rejected\nRoute tweaks preserve PTLC atomicity\nChannel balance is conserved',
    checks: '118',
  },
};

const commands: Record<CommandKey, string> = {
  bitcoin:
    'npm run build\nnpm run test:offline\nnpm run testnet -- oracle:prepare --event-id demo --outcome BTCUSD_ABOVE_STRIKE\nnpm run testnet -- taproot:complete --pending pending.json --attestation-secret-hex <s_x>',
  lightning:
    'npm run test:lightning\nnpm run testnet -- lightning:oracle-lock --event-id demo --outcome BTCUSD_ABOVE_STRIKE\nnpm run testnet -- lightning:lnd:create-hold-invoice --lock lock.json --amount-msat 1000 --allow-live-lnd\nnpm run testnet -- lightning:lnd:settle-invoice --attestation attestation.json --allow-live-lnd',
  proofs:
    'gnatprove -P spark/cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo\ngnatprove -P spark/lightning_cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo\n# expected: 0 unproved, 0 pragma Assume',
};

const signalLabels = [
  'oracle publishes s_x',
  'bridge signatures complete',
  'child funding becomes live',
  'Lightning hold invoice settles',
];

function select<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function selectAll<T extends Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector));
}

function setPressed(buttons: HTMLButtonElement[], selected: HTMLButtonElement): void {
  buttons.forEach((button) => {
    button.setAttribute('aria-selected', String(button === selected));
  });
}

function firstButton(buttons: HTMLButtonElement[], groupName: string): HTMLButtonElement {
  const button = buttons[0];
  if (!button) {
    throw new Error(`Missing button group: ${groupName}`);
  }
  return button;
}

function initProtocolStages(): void {
  const buttons = selectAll<HTMLButtonElement>('[data-stage]');
  const title = select<HTMLElement>('[data-stage-title]');
  const equation = select<HTMLElement>('[data-equation]');
  const nodes = selectAll<HTMLElement>('[data-node]');

  const setStage = (stage: StageKey, selected: HTMLButtonElement) => {
    const data = stages[stage];
    setPressed(buttons, selected);
    title.textContent = data.title;
    equation.textContent = data.equation;
    nodes.forEach((node) => {
      node.classList.toggle('active', data.active.includes(node.dataset.node ?? ''));
    });
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const stage = button.dataset.stage as StageKey;
      setStage(stage, button);
    });
  });
  setStage('prepare', firstButton(buttons, 'cDLC stages'));
}

function initLightningModes(): void {
  const buttons = selectAll<HTMLButtonElement>('[data-mode]');
  const title = select<HTMLElement>('[data-mode-title]');
  const copy = select<HTMLElement>('[data-mode-copy]');
  const left = select<HTMLElement>('[data-lock-left]');
  const right = select<HTMLElement>('[data-lock-right]');
  const note = select<HTMLElement>('[data-route-note]');

  const setMode = (mode: ModeKey, selected: HTMLButtonElement) => {
    const data = modes[mode];
    setPressed(buttons, selected);
    title.textContent = data.title;
    copy.textContent = data.copy;
    left.textContent = data.left;
    right.textContent = data.right;
    note.textContent = data.note;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode as ModeKey, button));
  });
  setMode('htlc', firstButton(buttons, 'Lightning modes'));
}

function initProofTabs(): void {
  const buttons = selectAll<HTMLButtonElement>('[data-proof]');
  const name = select<HTMLElement>('[data-proof-name]');
  const body = select<HTMLElement>('[data-proof-body]');
  const checks = select<HTMLElement>('[data-proof-checks]');

  const setProof = (proof: ProofKey, selected: HTMLButtonElement) => {
    const data = proofs[proof];
    setPressed(buttons, selected);
    name.textContent = data.name;
    body.textContent = data.body;
    checks.textContent = data.checks;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => setProof(button.dataset.proof as ProofKey, button));
  });
  setProof('integer', firstButton(buttons, 'proof targets'));
}

function initCommandTabs(): void {
  const buttons = selectAll<HTMLButtonElement>('[data-command]');
  const body = select<HTMLElement>('[data-command-body]');

  const setCommand = (command: CommandKey, selected: HTMLButtonElement) => {
    setPressed(buttons, selected);
    body.textContent = commands[command];
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => setCommand(button.dataset.command as CommandKey, button));
  });
  setCommand('bitcoin', firstButton(buttons, 'command examples'));
}

function initSignalCanvas(): void {
  const canvas = select<HTMLCanvasElement>('#signal-canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const label = select<HTMLElement>('[data-signal-label]');
  const cycle = select<HTMLButtonElement>('[data-reroute]');
  let state = 0;
  let frame = 0;

  cycle.addEventListener('click', () => {
    state = (state + 1) % signalLabels.length;
    label.textContent = signalLabels[state] ?? signalLabels[0] ?? null;
  });

  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(255,253,247,0.04)';
    for (let x = 40; x < width; x += 80) {
      context.fillRect(x, 0, 1, height);
    }
    for (let y = 40; y < height; y += 80) {
      context.fillRect(0, y, width, 1);
    }

    const points = [
      { x: width * 0.2, y: height * 0.32, label: 'Oracle' },
      { x: width * 0.48, y: height * 0.42, label: 'Parent DLC' },
      { x: width * 0.66, y: height * 0.62, label: 'Bridge' },
      { x: width * 0.82, y: height * 0.38, label: 'Child DLC' },
    ];

    context.lineWidth = 2;
    for (let index = 0; index < points.length - 1; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      if (!point || !next) {
        continue;
      }
      context.strokeStyle = index <= state ? '#f2b37c' : 'rgba(255,253,247,0.18)';
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.bezierCurveTo(point.x + 70, point.y - 40, next.x - 70, next.y + 40, next.x, next.y);
      context.stroke();
    }

    points.forEach((point, index) => {
      const active = index <= state;
      const pulse = active ? Math.sin(frame / 18 + index) * 4 : 0;
      context.beginPath();
      context.fillStyle = active ? '#fffaf0' : 'rgba(255,253,247,0.42)';
      context.strokeStyle = active ? '#f2b37c' : 'rgba(255,253,247,0.22)';
      context.lineWidth = 2;
      context.arc(point.x, point.y, 42 + pulse, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#171512';
      context.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.textAlign = 'center';
      context.fillText(point.label, point.x, point.y + 5);
    });

    context.fillStyle = 'rgba(255,253,247,0.82)';
    context.font = '18px ui-serif, Georgia, serif';
    context.textAlign = 'left';
    context.fillText('s_x is revealed once, then reused as activation witness', 52, height - 74);

    frame += 1;
    requestAnimationFrame(draw);
  };

  draw();
}

function initHeaderState(): void {
  const header = select<HTMLElement>('[data-nav]');
  const update = () => {
    header.classList.toggle('scrolled', window.scrollY > 18);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function main(): void {
  initHeaderState();
  initSignalCanvas();
  initProtocolStages();
  initLightningModes();
  initProofTabs();
  initCommandTabs();
}

main();
