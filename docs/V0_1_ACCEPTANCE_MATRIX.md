# v0.1 Testnet Acceptance Matrix

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

| Layer | v0.1 claim | Blocking issues | Required evidence | Current status | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Layer 1: adaptor algebra | The core cDLC adaptor algebra is internally consistent: the correct oracle scalar completes the bridge signature and the wrong scalar does not. | #55, #60, #61, #62, #63, #64, #65 | Formal proof targets, claim-to-proof map, reproducible GNATprove transcript, proof-boundary document. | Gate defined; release requires all blockers closed or waived. | SPARK proves the modeled algebra only. It does not prove secp256k1 implementation correctness, SHA-256, Bitcoin serialization, wallet safety, or mempool behavior. |
| Layer 2: single cDLC execution | One parent outcome can activate one child funding path through a bridge transaction, while a non-corresponding outcome fails to activate it. | #56, #66, #67, #68, #69, #70, #71, #72, #73, #74, #75, #110 | Deterministic parent-CET-to-bridge-to-child smoke transcript, wrong-outcome negative check, transaction ids or regtest-equivalent artifacts. | [`docs/L2_EPIC_CLOSEOUT.md`](L2_EPIC_CLOSEOUT.md) records the deterministic #56 evidence, not public-network completion. [`docs/L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md) defines the canonical scenario for #66; [`docs/L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md) records the signed parent funding tx for #67; [`docs/L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md) records the parent CET for #68; [`docs/L2_BRIDGE_HARNESS.md`](L2_BRIDGE_HARNESS.md) records the bridge for #69; [`docs/L2_BRIDGE_ADAPTOR_COMPLETION.md`](L2_BRIDGE_ADAPTOR_COMPLETION.md), [`docs/L2_PARENT_CET_CONFIRMATION.md`](L2_PARENT_CET_CONFIRMATION.md), [`docs/L2_BRIDGE_CONFIRMATION.md`](L2_BRIDGE_CONFIRMATION.md), [`docs/L2_CHILD_PREPARED_SPENDS.md`](L2_CHILD_PREPARED_SPENDS.md), [`docs/L2_EDGE_REFUND_TIMEOUT.md`](L2_EDGE_REFUND_TIMEOUT.md), and [`docs/L2_E2E_TRANSCRIPT.md`](L2_E2E_TRANSCRIPT.md) record #70-#75. Full public testnet/signet broadcast remains issue #132 unless completed separately. | Local deterministic execution is not the same as public mempool confirmation. Fee policy, pinning, and live broadcast remain outside the smoke test. |
| Layer 3: bilateral protocol | Two independent participants can negotiate, exchange adaptors, validate counterparty messages, and retain enough state for the prepared child path. | #57, #76, #77, #78, #79, #80, #81, #82, #83, #84 | Two-process or isolated-role transcript, state-retention manifest, malformed-message rejection suite. | Gate defined; not satisfied by the single-party smoke harness alone. | v0.1 may still rely on a prototype bilateral protocol rather than production wallet UX or network transport. |
| Layer 4: auditable oracle | The oracle path is inspectable: announcement, committed nonce, outcome attestation, verification, history, and equivocation evidence are available. | #58, #85, #86, #87, #88, #89, #90, #91, #92, #93 | Public oracle announcement format, attestation verifier, append-only history, nonce-reuse/equivocation fixtures, source/timestamp policy. | Gate defined; smoke test exercises the scalar relation but does not replace the oracle audit layer. | Oracle liveness, source integrity, pricing methodology, and operational security remain assumptions unless separately evidenced. |
| Layer 5: economic stress | The first synthetic exposure model can be replayed against historical/adversarial BTC price paths and produce explicit collateral, liquidation, timeout, and recovery evidence. | #59, #94, #95, #96, #97, #98, #99, #100, #101, #102, #103 | Historical BTC dataset, replay engine, collateral parameters, 70 percent drawdown/gap scenarios, holder recovery waterfall, stress report. | Gate defined; not satisfied by algebra or transaction tests alone. | A first stress simulation is not a guarantee of solvency across all markets, liquidity regimes, oracle delays, or legal structures. |

## v0.1 Release Gate Matrix

| Gate | Purpose | Blocking issues | Required evidence | Current status | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Definition of done | Ensure v0.1 has a precise pass/fail standard and does not overclaim. | #104, #109, #110, #111, #112, #113 | This matrix, smoke test transcript, blocker list, final go/no-go checklist, release notes with allowed/forbidden claims. | #109 and #110 are addressed by this PR. #111-#113 remain independent release gates. | Release discipline still depends on reviewers refusing undocumented waivers. |
| Reproducibility and CI | Make the result reproducible by command, fixture, and CI/artifacts. | #105, #114, #115, #116, #117, #118, #119 | One-command runner, deterministic environment, fixtures, archived artifacts, CI, wrong-outcome CI negative case. | `scripts/run-v0.1.sh` and `docs/V0_1_RUNNER.md` define the one-command verifier; `testnet/REGTEST.md` defines the controlled regtest environment; #118 is the remote GitHub Actions workflow documented in `docs/V0_1_CI.md`. Remaining issues cover broader release packaging and status reporting. | Remote CI does not eliminate optional live testnet flakiness, public mempool variance, or manual broadcast/faucet dependencies. |
| Semantic traceability | Connect formal proof claims to concrete Bitcoin execution objects and state transitions. | #106, #120, #121, #122, #123, #124 | Trace table, scalar-to-bridge data path, state transition map, non-activation invariants, proof-to-engineering boundary report. | `docs/SPARK_TO_BITCOIN_TRACE.md` maps the core SPARK claims to TypeScript transaction operations and smoke transcript fields for #120. The broader semantic trace gate remains open for #121-#124. | Formal statements and implementation artifacts can drift unless the trace is kept current. |
| Adversarial behavior | Demonstrate that key failure modes fail closed rather than activating the wrong branch. | #107, #125, #126, #127, #128, #129, #130 | Failure matrix covering wrong scalar/outcome, oracle delay, state loss, fee/time stress, malformed adaptors, replay/double activation. | This PR covers the minimum wrong-outcome negative check required by #110. | This is not a complete mainnet adversarial security review. |
| Public evidence package | Let an external reviewer reproduce or audit the v0.1 claim without private context. | #108, #131, #132, #133, #134, #135, #136 | Redacted transcript, tx evidence bundle, auditor quickstart, limitations document, technical demo script, status badge/page. | This PR adds source-level artifacts; public packaging remains a separate gate. | Evidence can become stale unless tied to a commit and CI/artifact run. |

## Waiver Policy

A v0.1 waiver is valid only if it records:

- issue number;
- owner;
- reason the release can proceed without the blocked evidence;
- exact residual risk;
- expiration condition or follow-up issue.

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
