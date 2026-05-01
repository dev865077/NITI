# Layer 3 Bilateral Closeout Matrix

Layer 3 is the deterministic bilateral protocol evidence layer for the current
research prototype. It shows that two isolated participants can prepare a
canonical setup, exchange adaptor signatures, retain enough state to recover,
complete the selected settlement path after oracle attestation, and reject
malformed or wrong-path data.

This is a local deterministic protocol harness. It is not production P2P
transport, production custody software, production wallet UX, or a mainnet
safety claim.

## Completion Claim

The supported Layer 3 claim is:

> NITI has a reproducible bilateral harness for the research prototype: Alice
> and Bob can independently validate setup data, funding data, transaction
> templates, adaptor exchanges, retained state, restart recovery, settlement
> execution, malformed inputs, and wrong-path replay cases, with CI-published
> JSON artifacts.

## Evidence Matrix

| Requirement | Evidence | Replay | Status | Boundary |
| --- | --- | --- | --- | --- |
| Role separation | [`L3_BILATERAL_ROLES.md`](L3_BILATERAL_ROLES.md) | `npm run test:bilateral-roles` | Satisfied | Deterministic fixture roles, not production key management. |
| Setup schema | [`L3_BILATERAL_SETUP_SCHEMA.md`](L3_BILATERAL_SETUP_SCHEMA.md) | `npm run test:bilateral-setup-schema` | Satisfied | Versioned local JSON messages, not encrypted transport. |
| Transcript format | [`L3_BILATERAL_TRANSCRIPT_FORMAT.md`](L3_BILATERAL_TRANSCRIPT_FORMAT.md) | `npm run test:bilateral-setup-schema` | Satisfied | Canonical local transcript, not network delivery. |
| State machine | [`L3_BILATERAL_STATE_MACHINE.md`](L3_BILATERAL_STATE_MACHINE.md) | `npm run test:bilateral-state-machine` | Satisfied | Deterministic state replay, not a Byzantine scheduler. |
| Funding validation | [`L3_BILATERAL_FUNDING_VALIDATION.md`](L3_BILATERAL_FUNDING_VALIDATION.md) | `npm run test:bilateral-funding-validation` | Satisfied | Fixture funding data, not live wallet coin selection. |
| Template agreement | [`L3_BILATERAL_TEMPLATE_AGREEMENT.md`](L3_BILATERAL_TEMPLATE_AGREEMENT.md) | `npm run test:bilateral-template-agreement` | Satisfied | Canonical template digests, not production fee negotiation. |
| Adaptor exchange | [`L3_BILATERAL_ADAPTOR_EXCHANGE.md`](L3_BILATERAL_ADAPTOR_EXCHANGE.md) | `npm run test:bilateral-adaptor-exchange` | Satisfied | Local adaptor messages, not authenticated peer transport. |
| State retention | [`L3_BILATERAL_STATE_RETENTION.md`](L3_BILATERAL_STATE_RETENTION.md) | `npm run test:bilateral-state-retention` | Satisfied | Local retained-state schema, not backup or hardware-wallet policy. |
| Two-process execution | [`L3_BILATERAL_TWO_PROCESS.md`](L3_BILATERAL_TWO_PROCESS.md) | `npm run test:bilateral-two-process` | Satisfied | Two local processes, not internet peer discovery. |
| Restart recovery | [`L3_BILATERAL_RESTART_RECOVERY.md`](L3_BILATERAL_RESTART_RECOVERY.md) | `npm run test:bilateral-restart-recovery` | Satisfied | Local recovery checkpoints, not total-state-loss recovery. |
| Malformed input rejection | [`L3_BILATERAL_MALFORMED_COUNTERPARTY.md`](L3_BILATERAL_MALFORMED_COUNTERPARTY.md) | `npm run test:bilateral-malformed-counterparty` | Satisfied | Deterministic invalid messages, not anti-DoS policy. |
| Settlement execution | [`L3_BILATERAL_SETTLEMENT_EXECUTION.md`](L3_BILATERAL_SETTLEMENT_EXECUTION.md) | `npm run test:bilateral-settlement-execution` | Satisfied | Local completion from retained state, not public broadcast. |
| Wrong-path replay rejection | [`L3_BILATERAL_WRONG_PATH_REPLAY.md`](L3_BILATERAL_WRONG_PATH_REPLAY.md) | `npm run test:bilateral-wrong-path-replay` | Satisfied | Deterministic replay matrix, not a full adversarial network model. |
| Adversarial failure matrix | [`V0_1_ADVERSARIAL_FAILURE_MATRIX.md`](V0_1_ADVERSARIAL_FAILURE_MATRIX.md) | `npm run test:adversarial-failure-matrix` | Satisfied | Deterministic failure injection, not a production network adversary model. |
| CI artifact package | [`L3_CI_ARTIFACT_GATE.md`](L3_CI_ARTIFACT_GATE.md) | `npm run test:layer3` | Satisfied | CI JSON artifacts, not production deployment evidence. |

## One-Command Gate

Run:

```sh
npm run test:layer3 -- --artifacts-dir testnet/artifacts/layer3-review
```

The command writes the replay JSON files and `l3-bilateral-summary.json`. The
summary is produced only after the verifier checks that all required artifacts
exist and all required checks pass.

## Allowed Claim

After this closeout, it is accurate to say that Layer 3 has deterministic,
reproducible, CI-artifacted evidence for the current research prototype's
bilateral setup, validation, retained-state recovery, settlement execution, and
wrong-path rejection behavior. The adversarial matrix additionally checks that
wrong scalars, replayed signatures, oracle withholding, fee-spike, and
compressed-timeout scenarios fail closed in the deterministic model.

## Forbidden Claims

Do not claim that Layer 3 provides:

- production P2P networking;
- production wallet UX or custody safety;
- production mainnet bilateral execution safety;
- mempool, fee-bump, pinning, or reorg policy;
- oracle service operations;
- economic solvency or liquidation safety;
- Lightning routing or channel-state-machine coverage;
- legal or regulatory readiness.
