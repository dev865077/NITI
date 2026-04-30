# v0.1 Testnet Acceptance Matrix

This matrix records the historical v0.1 testnet acceptance boundary. The
current repository status includes Lazy cDLC compression proofs and dust-sized
Lazy mainnet evidence; see [`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md).

This matrix is the release contract for NITI v0.1 + testnet. It keeps the
release claim narrow:

> v0.1 demonstrates that the system exists technically, runs end-to-end in a
> reproducible testnet/regtest-equivalent harness, has verifiable semantics, has
> an auditable oracle path, and has a first economic stress analysis.

It does not claim mainnet readiness, production custody safety, regulatory
readiness, guaranteed solvency, production Lightning support, or full
adversarial security.

## Evidence Classes

| Class | Meaning |
| --- | --- |
| Formal proof | SPARK/Ada proof target or documented formal proof artifact. |
| Deterministic harness | Reproducible local command with fixed fixtures and expected pass/fail results. |
| Testnet/signet artifact | Public or archived Bitcoin testnet/signet transaction evidence. |
| Simulation | Deterministic economic, fee, timeout, or failure-mode model. |
| Documentation | Versioned spec, matrix, transcript, or boundary report. |
| Assumption | Required external condition that is not proven by v0.1. |
| Waiver | Explicit release exception with owner, rationale, and residual risk. |

## Base Layer Matrix

| Layer | v0.1 claim | Open work | Required evidence | Current status | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Layer 1: adaptor algebra | The core cDLC adaptor algebra is internally consistent: the correct oracle scalar completes the bridge signature and the wrong scalar does not. | Formal proof audit, claim mapping, reproducibility transcript, proof boundary, and CI preservation. | Formal proof targets, claim-to-proof map, reproducible GNATprove transcript, proof-boundary document. | Gate defined; release requires the required evidence or an explicit waiver. | SPARK proves the modeled algebra only. It does not prove secp256k1 implementation correctness, SHA-256, Bitcoin serialization, wallet safety, or mempool behavior. |
| Layer 2: single cDLC execution | One parent outcome can activate one child funding path through a bridge transaction, while a non-corresponding outcome fails to activate it. | Canonical scenario, parent funding, parent CET, bridge, adaptor completion, confirmations, child prepared spends, timeout refund, and replayable transcript. | Deterministic parent-CET-to-bridge-to-child smoke transcript, wrong-outcome negative check, transaction ids or regtest-equivalent artifacts. | [`docs/L2_DETERMINISTIC_CLOSEOUT.md`](L2_DETERMINISTIC_CLOSEOUT.md) records deterministic Layer 2 evidence. [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/) records Bitcoin Core regtest broadcast/confirmation evidence. [`docs/L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md), [`docs/L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md), [`docs/L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md), [`docs/L2_BRIDGE_HARNESS.md`](L2_BRIDGE_HARNESS.md), [`docs/L2_BRIDGE_ADAPTOR_COMPLETION.md`](L2_BRIDGE_ADAPTOR_COMPLETION.md), [`docs/L2_PARENT_CET_CONFIRMATION.md`](L2_PARENT_CET_CONFIRMATION.md), [`docs/L2_BRIDGE_CONFIRMATION.md`](L2_BRIDGE_CONFIRMATION.md), [`docs/L2_CHILD_PREPARED_SPENDS.md`](L2_CHILD_PREPARED_SPENDS.md), [`docs/L2_EDGE_REFUND_TIMEOUT.md`](L2_EDGE_REFUND_TIMEOUT.md), and [`docs/L2_E2E_TRANSCRIPT.md`](L2_E2E_TRANSCRIPT.md) record the component evidence. Public testnet/signet broadcast still requires external RPC/faucet configuration. | Local deterministic execution is not the same as public mempool confirmation. Regtest confirms Bitcoin Core policy/consensus behavior in a controlled chain, but it is still not public network relay. |
| Layer 3: bilateral protocol | Two independent participants can negotiate, exchange adaptors, validate counterparty messages, and retain enough state for the prepared child path. | Funding validation, bilateral adaptor exchange, state retention, two-process execution, recovery, audit transcript, and malformed-message tests. | Two-process or isolated-role transcript, state-retention manifest, malformed-message rejection suite. | [`docs/L3_BILATERAL_ROLES.md`](L3_BILATERAL_ROLES.md) defines Alice/Bob key scopes. [`docs/L3_BILATERAL_SETUP_SCHEMA.md`](L3_BILATERAL_SETUP_SCHEMA.md) defines versioned setup messages and critical-field rejection. [`docs/L3_BILATERAL_STATE_MACHINE.md`](L3_BILATERAL_STATE_MACHINE.md) defines setup ordering, settlement gating, and terminal fallback behavior. [`docs/L3_BILATERAL_TEMPLATE_AGREEMENT.md`](L3_BILATERAL_TEMPLATE_AGREEMENT.md) defines canonical transaction-template digest checks. `npm run test:bilateral-roles`, `npm run test:bilateral-setup-schema`, `npm run test:bilateral-state-machine`, and `npm run test:bilateral-template-agreement` verify local Layer 3 setup fixtures. The single-party smoke harness still does not satisfy the full bilateral gate. | v0.1 may still rely on a prototype bilateral protocol rather than production wallet UX or network transport. |
| Layer 4: auditable oracle | The oracle path is inspectable: announcement, committed nonce, outcome attestation, verification, history, and equivocation evidence are available. | Announcement format, nonce discipline, attestation output, append-only history, equivocation monitor, query API, evidence format, price policy, and fixture suite. | Public oracle announcement format, attestation verifier, append-only history, nonce-reuse/equivocation fixtures, source/timestamp policy. | Gate defined; smoke test exercises the scalar relation but does not replace the oracle audit layer. | Oracle liveness, source integrity, pricing methodology, and operational security remain assumptions unless separately evidenced. |
| Layer 5: economic stress | The first synthetic exposure model can be replayed against historical/adversarial BTC price paths and produce explicit collateral, liquidation, timeout, and recovery evidence. | Historical dataset, replay engine, collateral parameters, drawdown/gap scenarios, timelock validation, recovery waterfall, insolvency cases, oracle-delay/fee-spike assumptions, stress report, and pilot go/no-go criteria. | Historical BTC dataset, replay engine, collateral parameters, 70 percent drawdown/gap scenarios, holder recovery waterfall, stress report. | Gate defined; not satisfied by algebra or transaction tests alone. | A first stress simulation is not a guarantee of solvency across all markets, liquidity regimes, oracle delays, or legal structures. |

## v0.1 Release Gate Matrix

| Gate | Purpose | Open work | Required evidence | Current status | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Definition of done | Ensure v0.1 has a precise pass/fail standard and does not overclaim. | Acceptance matrix, smoke transcript, release constraints, final checklist, and release notes. | This matrix, smoke test transcript, remaining-evidence list, final go/no-go checklist, release notes with allowed/forbidden claims. | Release notes are covered by [`docs/V0_1_RELEASE_NOTES.md`](V0_1_RELEASE_NOTES.md). Release constraints and final go/no-go checklist remain independent gates. | Release discipline still depends on reviewers refusing undocumented waivers. |
| Reproducibility and CI | Make the result reproducible by command, fixture, and CI/artifacts. | One-command runner, deterministic environment, fixtures, archived artifacts, CI, and wrong-outcome negative case. | One-command runner, deterministic environment, fixtures, archived artifacts, CI, wrong-outcome CI negative case. | `scripts/run-v0.1.sh` and `docs/V0_1_RUNNER.md` define the one-command verifier; `testnet/REGTEST.md` defines the controlled regtest environment; the remote GitHub Actions workflow is documented in `docs/V0_1_CI.md`. Remaining work covers broader release packaging and status reporting. | Remote CI does not eliminate optional live testnet flakiness, public mempool variance, or manual broadcast/faucet dependencies. |
| Semantic traceability | Connect formal proof claims to concrete Bitcoin execution objects and state transitions. | Trace table, scalar-to-bridge data path, state transition map, non-activation invariants, and proof-to-engineering boundary report. | Trace table, scalar-to-bridge data path, state transition map, non-activation invariants, proof-to-engineering boundary report. | `docs/SPARK_TO_BITCOIN_TRACE.md` maps the core SPARK claims to TypeScript transaction operations and smoke transcript fields. The broader semantic trace gate remains open. | Formal statements and implementation artifacts can drift unless the trace is kept current. |
| Adversarial behavior | Demonstrate that key failure modes fail closed rather than activating the wrong branch. | Wrong scalar/outcome matrix, oracle delay, state loss, fee/time stress, malformed adaptors, replay, and double activation. | Failure matrix covering wrong scalar/outcome, oracle delay, state loss, fee/time stress, malformed adaptors, replay/double activation. | The minimum wrong-outcome negative check is covered by the deterministic and public signet evidence. | This is not a complete mainnet adversarial security review. |
| Public evidence package | Let an external reviewer reproduce or audit the v0.1 claim without private context. | Redacted transcript, tx evidence bundle, auditor quickstart, limitations document, technical demo script, and status badge/page. | Redacted transcript, tx evidence bundle, auditor quickstart, limitations document, technical demo script, status badge/page. | Bitcoin Core regtest transaction evidence is in [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/). Auditor quickstart is covered by [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md) and [`docs/evidence/auditor-quickstart/demo-v0.1.log`](evidence/auditor-quickstart/demo-v0.1.log). Limitations are covered by [`docs/V0_1_LIMITATIONS.md`](V0_1_LIMITATIONS.md). Technical demo is covered by [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md) and `npm run demo:v0.1`. Remaining work covers broader public packaging. | Evidence can become stale unless tied to a commit and CI/artifact run. Regtest evidence is not public testnet/signet evidence. |

## Waiver Policy

A v0.1 waiver is valid only if it records:

- tracking item or release scope;
- owner;
- reason the release can proceed without the blocked evidence;
- exact residual risk;
- expiration condition or follow-up action.

Waivers cannot be used for:

- wrong outcome activating a child branch;
- missing proof-regression evidence for Layer 1;
- missing deterministic smoke transcript for Layer 2;
- undocumented oracle trust assumptions;
- release notes that imply mainnet or production financial readiness.

## Allowed v0.1 Claim

The allowed claim is:

> Under the documented assumptions, NITI v0.1 demonstrates a reproducible
> testnet/regtest-equivalent cDLC activation path: a parent outcome reveals an
> oracle scalar, that scalar completes the bridge adaptor signature, the bridge
> funds the child path, and a non-corresponding outcome does not activate that
> child path.

## Forbidden v0.1 Claims

Do not claim that v0.1:

- is mainnet-ready;
- is safe for user funds;
- is a complete financial product;
- guarantees stable-value redemption;
- eliminates oracle, liquidity, collateral, fee, or counterparty risk;
- implements production Lightning channel semantics;
- proves Bitcoin Core policy, mempool behavior, or wallet key management.
