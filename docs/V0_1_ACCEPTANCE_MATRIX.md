# v0.1 Testnet Acceptance Matrix

This matrix records the v0.1 technical-prototype acceptance boundary. The
current repository status includes Lazy cDLC compression proofs and dust-sized
Lazy mainnet evidence; see [`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md).

This matrix is the release contract for NITI v0.1 + testnet. It keeps the
release claim narrow:

> v0.1 demonstrates that the system exists technically, runs end-to-end in a
> reproducible testnet/regtest-equivalent harness, has verifiable semantics, has
> an auditable oracle-scalar path, and rejects non-corresponding activation
> scalars in deterministic negative tests.

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
| Layer 1: adaptor algebra | The core cDLC adaptor algebra is internally consistent: the correct oracle scalar completes the bridge signature and the wrong scalar does not. | Formal proof audit, claim mapping, reproducibility transcript, proof boundary, and CI preservation. | Formal proof targets, claim-to-proof map, reproducible GNATprove transcript, proof-boundary document. | [`docs/FORMAL_PROOF_BOUNDARY.md`](FORMAL_PROOF_BOUNDARY.md) states the quote-ready proof boundary. [`docs/SPARK_TARGET_INVENTORY.md`](SPARK_TARGET_INVENTORY.md) maps targets to commands and claim families. | SPARK proves the modeled algebra only. It does not prove secp256k1 implementation correctness, SHA-256, Bitcoin serialization, wallet safety, or mempool behavior. |
| Layer 2: single cDLC execution | One parent outcome can activate one child funding path through a bridge transaction, while a non-corresponding outcome fails to activate it. | Canonical scenario, parent funding, parent CET, bridge, adaptor completion, confirmations, child prepared spends, timeout refund, and replayable transcript. | Deterministic parent-CET-to-bridge-to-child smoke transcript, wrong-outcome negative check, transaction ids or regtest-equivalent artifacts. | [`docs/L2_DETERMINISTIC_CLOSEOUT.md`](L2_DETERMINISTIC_CLOSEOUT.md) records deterministic Layer 2 evidence. [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/) records Bitcoin Core regtest broadcast/confirmation evidence. [`docs/L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md), [`docs/L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md), [`docs/L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md), [`docs/L2_BRIDGE_HARNESS.md`](L2_BRIDGE_HARNESS.md), [`docs/L2_BRIDGE_ADAPTOR_COMPLETION.md`](L2_BRIDGE_ADAPTOR_COMPLETION.md), [`docs/L2_PARENT_CET_CONFIRMATION.md`](L2_PARENT_CET_CONFIRMATION.md), [`docs/L2_BRIDGE_CONFIRMATION.md`](L2_BRIDGE_CONFIRMATION.md), [`docs/L2_CHILD_PREPARED_SPENDS.md`](L2_CHILD_PREPARED_SPENDS.md), [`docs/L2_EDGE_REFUND_TIMEOUT.md`](L2_EDGE_REFUND_TIMEOUT.md), and [`docs/L2_E2E_TRANSCRIPT.md`](L2_E2E_TRANSCRIPT.md) record the component evidence. Public testnet/signet broadcast still requires external RPC/faucet configuration. | Local deterministic execution is not the same as public mempool confirmation. Regtest confirms Bitcoin Core policy/consensus behavior in a controlled chain, but it is still not public network relay. |
| Layer 3: bilateral protocol | Two independent participants can negotiate, exchange adaptors, validate counterparty messages, and retain enough state for the prepared child path. | Production transport, wallet UX, and custody hardening remain outside this gate. | Two-process transcript, state-retention manifest, malformed-message and wrong-path rejection suites, settlement replay, CI artifact package, and closeout matrix. | [`docs/L3_BILATERAL_ROLES.md`](L3_BILATERAL_ROLES.md) defines Alice/Bob key scopes. [`docs/L3_BILATERAL_SETUP_SCHEMA.md`](L3_BILATERAL_SETUP_SCHEMA.md) defines versioned setup messages and critical-field rejection. [`docs/L3_BILATERAL_STATE_MACHINE.md`](L3_BILATERAL_STATE_MACHINE.md) defines setup ordering, settlement gating, and terminal fallback behavior. [`docs/L3_BILATERAL_TEMPLATE_AGREEMENT.md`](L3_BILATERAL_TEMPLATE_AGREEMENT.md) defines canonical transaction-template digest checks. [`docs/L3_BILATERAL_FUNDING_VALIDATION.md`](L3_BILATERAL_FUNDING_VALIDATION.md) defines funding digest, script, outpoint, dust, and fee-reserve checks. [`docs/L3_BILATERAL_ADAPTOR_EXCHANGE.md`](L3_BILATERAL_ADAPTOR_EXCHANGE.md) defines bilateral adaptor-signature checks and malformed-message rejection. [`docs/L3_BILATERAL_STATE_RETENTION.md`](L3_BILATERAL_STATE_RETENTION.md) defines retained state and restart behavior. [`docs/L3_BILATERAL_TWO_PROCESS.md`](L3_BILATERAL_TWO_PROCESS.md) defines isolated local Alice/Bob process execution. [`docs/L3_BILATERAL_RESTART_RECOVERY.md`](L3_BILATERAL_RESTART_RECOVERY.md) defines restart and partial-loss recovery behavior. [`docs/L3_BILATERAL_MALFORMED_COUNTERPARTY.md`](L3_BILATERAL_MALFORMED_COUNTERPARTY.md) defines malformed counterparty-message rejection behavior. [`docs/L3_BILATERAL_SETTLEMENT_EXECUTION.md`](L3_BILATERAL_SETTLEMENT_EXECUTION.md) defines retained-state settlement execution. [`docs/L3_BILATERAL_WRONG_PATH_REPLAY.md`](L3_BILATERAL_WRONG_PATH_REPLAY.md) defines wrong-path and replay rejection behavior. [`docs/L3_CI_ARTIFACT_GATE.md`](L3_CI_ARTIFACT_GATE.md) defines the CI artifact replay package. [`docs/L3_BILATERAL_CLOSEOUT_MATRIX.md`](L3_BILATERAL_CLOSEOUT_MATRIX.md) records the final deterministic Layer 3 evidence boundary. `npm run test:bilateral-roles`, `npm run test:bilateral-setup-schema`, `npm run test:bilateral-state-machine`, `npm run test:bilateral-template-agreement`, `npm run test:bilateral-funding-validation`, `npm run test:bilateral-adaptor-exchange`, `npm run test:bilateral-state-retention`, `npm run test:bilateral-two-process`, `npm run test:bilateral-restart-recovery`, `npm run test:bilateral-malformed-counterparty`, `npm run test:bilateral-settlement-execution`, `npm run test:bilateral-wrong-path-replay`, and `npm run test:layer3` verify local Layer 3 setup fixtures and artifact packaging. The deterministic bilateral gate is satisfied for the local research prototype; production transport and wallet UX remain outside the gate. | Layer 3 remains a deterministic prototype harness, not production wallet UX, network transport, custody safety, or mainnet bilateral execution safety. |
| Layer 4: auditable oracle | The oracle scalar path is inspectable enough to audit the v0.1 activation claim. | Production oracle service, append-only production history, monitoring, and key operations remain outside this gate. | Oracle scalar transcript, nonce and attestation point fields, source-policy note, equivocation evidence note, and negative scalar tests. | The deterministic smoke transcript exercises the scalar relation; [`docs/ORACLE_PRICE_SOURCE_POLICY.md`](ORACLE_PRICE_SOURCE_POLICY.md) and [`docs/ORACLE_EQUIVOCATION_EVIDENCE.md`](ORACLE_EQUIVOCATION_EVIDENCE.md) document source and equivocation boundaries. | Oracle liveness, source integrity, pricing methodology, and operational security remain assumptions unless separately evidenced. |
| Layer 5: economic stress | Financial-product economics are explicitly outside the v0.1 activation claim. | Product parameters require separate stress gates before any product pilot. | Limitation language, product-model boundaries, deterministic economic stress output, and research/SPARK accounting models where applicable. | The release claim does not depend on product solvency. Product models in [`research/`](../research/) and `spark/` are accounting models, not market-liquidity or solvency proof. A deterministic product-level stress suite is documented in [`docs/ECONOMIC_STRESS_REPORT.md`](ECONOMIC_STRESS_REPORT.md) and currently blocks the tested stable-value parameters in [`docs/ECONOMIC_STRESS_GO_NO_GO.md`](ECONOMIC_STRESS_GO_NO_GO.md). | No activation test proves solvency across markets, liquidity regimes, oracle delays, or legal structures. |

## v0.1 Release Gate Matrix

| Gate | Purpose | Open work | Required evidence | Current status | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Definition of done | Ensure v0.1 has a precise pass/fail standard and does not overclaim. | Release tag creation remains a manual final step. | This matrix, smoke test transcript, final go/no-go checklist, release notes with allowed/forbidden claims, claim lock, and release-candidate manifest. | Release notes are covered by [`docs/V0_1_RELEASE_NOTES.md`](V0_1_RELEASE_NOTES.md). The final claim and non-claims are locked in [`docs/V0_1_CLAIM_LOCK.md`](V0_1_CLAIM_LOCK.md). The release-candidate gate and non-negotiable failure criteria are covered by [`docs/V0_1_RELEASE_CANDIDATE.md`](V0_1_RELEASE_CANDIDATE.md). | Release discipline still depends on reviewers refusing undocumented waivers. |
| Reproducibility and CI | Make the result reproducible by command, fixture, and CI/artifacts. | Fresh public broadcast remains optional and manual. | One-command runner, deterministic environment, fixtures, archived artifacts, CI, wrong-outcome CI negative case, fresh-clone audit path, and release-candidate manifest. | `scripts/run-v0.1.sh` and `docs/V0_1_RUNNER.md` define the one-command verifier; `testnet/REGTEST.md` defines the controlled regtest environment; the remote GitHub Actions workflow is documented in `docs/V0_1_CI.md`. [`docs/V0_1_FRESH_CLONE_AUDIT.md`](V0_1_FRESH_CLONE_AUDIT.md) defines the clean-checkout audit path. [`docs/V0_1_RC1_MANIFEST.md`](V0_1_RC1_MANIFEST.md) records deterministic fixture sources, artifact kinds, evidence paths, proof targets, and required commands. | Remote CI does not eliminate optional live testnet flakiness, public mempool variance, or manual broadcast/faucet dependencies. |
| Semantic traceability | Connect formal proof claims to concrete Bitcoin execution objects and state transitions. | Release documentation must stay synchronized with future protocol changes. | Trace table, scalar-to-bridge data path, state transition map, non-activation invariants, proof-to-engineering boundary report, and bilateral transcript. | `docs/SPARK_TO_BITCOIN_TRACE.md` maps the core SPARK claims to TypeScript transaction operations and smoke transcript fields. [`docs/V0_1_SEMANTIC_TRACE.md`](V0_1_SEMANTIC_TRACE.md) records the oracle-scalar path, parent-bridge-child state map, negative-path coverage, and proof-to-engineering boundary. [`docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md`](V0_1_BILATERAL_E2E_TRANSCRIPT.md) records the Alice/Bob deterministic protocol transcript. | Formal statements and implementation artifacts can drift unless the trace is kept current. |
| Adversarial behavior | Demonstrate that key failure modes fail closed rather than activating the wrong branch. | Production adversary modeling remains outside this gate. | Failure matrix covering wrong scalar/outcome, oracle delay, state loss, fee/time stress, malformed adaptors, replay, and double activation. | [`docs/V0_1_ADVERSARIAL_FAILURE_MATRIX.md`](V0_1_ADVERSARIAL_FAILURE_MATRIX.md) and `npm run test:adversarial-failure-matrix` cover wrong scalar, random scalar, different-event scalar, mismatched-oracle scalar, mismatched bridge sighash, oracle withholding, timeout refund maturity, fee-spike fallback, and compressed-timeout fallback. Bilateral companion gates cover state loss, malformed messages, branch replay, and double activation. | This is not a complete mainnet adversarial security review. |
| Public evidence package | Let an external reviewer reproduce or audit the v0.1 claim without private context. | Release tag creation remains the final archival step. | Redacted transcript, tx evidence bundle, auditor quickstart, limitations document, technical demo script, status badge/page, release-candidate manifest, and clean-checkout audit path. | Bitcoin Core regtest transaction evidence is in [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/). Auditor quickstart is covered by [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md) and [`docs/evidence/auditor-quickstart/demo-v0.1.log`](evidence/auditor-quickstart/demo-v0.1.log). Limitations are covered by [`docs/V0_1_LIMITATIONS.md`](V0_1_LIMITATIONS.md). Technical demo is covered by [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md) and `npm run demo:v0.1`. The written execution transcript is covered by [`docs/V0_1_EXECUTION_TRANSCRIPT.md`](V0_1_EXECUTION_TRANSCRIPT.md). The release-candidate evidence map is covered by [`docs/V0_1_RC1_MANIFEST.md`](V0_1_RC1_MANIFEST.md). | Evidence can become stale unless tied to a commit and CI/artifact run. Regtest evidence is not public testnet/signet evidence. |

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
