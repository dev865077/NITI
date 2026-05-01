# v0.1 Release Candidate Manifest

This manifest defines the v0.1 release-candidate evidence surface.

## Candidate Identity

| Field | Value |
| --- | --- |
| Candidate name | `v0.1-rc1` |
| Repository | `https://github.com/dev865077/NITI` |
| Baseline commit before candidate closeout | `ab9363f2d118f799a6d80e77519527ef07aff7d6` |
| Release tag commit | Recorded by the Git tag when the release is cut. |
| Primary local command | `npm run v0.1:verify` |
| Node-only audit command | `npm run v0.1:verify -- --skip-ada --skip-spark --artifacts-dir /tmp/niti-v0.1-node-audit` |
| Lazy SPARK audit command | `npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark --artifacts-dir /tmp/niti-v0.1-lazy-spark-audit` |
| Layer 3 command | `npm run test:layer3` |
| Lazy holder command | `npm run test:bilateral-lazy-activation` |
| Adversarial matrix command | `npm run test:adversarial-failure-matrix` |

## Release Claim

NITI v0.1 demonstrates a reproducible cDLC activation path under documented
assumptions: a parent outcome reveals an oracle scalar, that scalar completes
the prepared bridge adaptor signature, the bridge funds the prepared child
path, and non-corresponding scalars do not activate that child path in the
deterministic harness.

## Evidence Surface

| Evidence | Path |
| --- | --- |
| Whitepaper | `Cascading Discreet Log Contracts (cDLCs).pdf` |
| Acceptance matrix | `docs/V0_1_ACCEPTANCE_MATRIX.md` |
| Claim lock | `docs/V0_1_CLAIM_LOCK.md` |
| Fresh-clone audit | `docs/V0_1_FRESH_CLONE_AUDIT.md` |
| Semantic trace | `docs/V0_1_SEMANTIC_TRACE.md` |
| Written execution transcript | `docs/V0_1_EXECUTION_TRANSCRIPT.md` |
| Bilateral transcript | `docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md` |
| Adversarial matrix | `docs/V0_1_ADVERSARIAL_FAILURE_MATRIX.md` |
| Limitations | `docs/V0_1_LIMITATIONS.md` |
| Release notes | `docs/V0_1_RELEASE_NOTES.md` |
| Auditor quickstart | `docs/AUDITOR_QUICKSTART.md` |
| Public signet evidence | `docs/evidence/public-signet/` |
| Lazy public signet evidence | `docs/evidence/lazy-public-signet/` |
| Lazy bilateral public signet evidence | `docs/evidence/lazy-bilateral-public-signet/` |
| Lazy public testnet evidence | `docs/evidence/lazy-public-testnet/` |
| Lazy bilateral public testnet evidence | `docs/evidence/lazy-bilateral-public-testnet/` |
| Lazy public mainnet evidence | `docs/evidence/lazy-public-mainnet/` |
| Regtest evidence | `docs/evidence/regtest-cdlc/` |

## Deterministic Fixture Sources

| Fixture class | Source |
| --- | --- |
| Canonical network, keys, outcomes, amounts, and timelocks | `testnet/src/cdlc-scenario.ts` |
| secp256k1 and BIP340 helpers | `testnet/src/secp.ts` |
| Taproot transaction construction | `testnet/src/taproot.ts` |
| Single-path cDLC smoke harness | `testnet/src/cdlc-smoke-test.ts` |
| Bilateral setup and validation harnesses | `testnet/src/bilateral-*.ts` |
| Adversarial failure matrix | `testnet/src/adversarial-failure-matrix-test.ts` |
| Evidence bundle verifier | `testnet/src/evidence-bundle-verify.ts` |

All deterministic fixtures are test material. They are not production keys,
production oracle secrets, or user funds.

## Artifact Kinds

| Command | Expected artifact kind |
| --- | --- |
| `npm run test:cdlc-smoke` | `niti.v0_1_cdlc_smoke_transcript.v1` |
| `npm run test:layer3` | `niti.l3_bilateral_ci_artifact_summary.v1` |
| `npm run test:bilateral-lazy-activation` | `niti.l3_lazy_activation_holder_test.v1` |
| `npm run test:adversarial-failure-matrix` | `niti.v0_1_adversarial_failure_matrix.v1` |
| `npm run test:bilateral-settlement-execution` | `niti.l3_bilateral_settlement_execution_test.v1` |
| `npm run test:bilateral-wrong-path-replay` | `niti.l3_bilateral_wrong_path_replay_test.v1` |

## Proof Targets

| Target | Purpose |
| --- | --- |
| `spark/cdlc_integer_proofs.gpr` | Symbolic cDLC identities over big integers. |
| `spark/cdlc_residue_proofs.gpr` | cDLC identities over explicit modular residues. |
| `spark/cdlc_proofs.gpr` | cDLC identities using Ada modular types. |
| `spark/lazy_cdlc_window_proofs.gpr` | Lazy window finite-model checks. |
| `spark/lazy_cdlc_edge_proofs.gpr` | Edge-local Lazy activation checks. |
| `spark/lazy_cdlc_slide_proofs.gpr` | Sliding-window Lazy preparation checks. |
| `spark/lazy_cdlc_tree_bound_proofs.gpr` | Non-recombining tree live-state bound checks. |
| `spark/lazy_cdlc_recombining_proofs.gpr` | Recombining-state live-bound checks. |
| `spark/lazy_cdlc_compression_proofs.gpr` | Lazy compression finite-model checks. |
| `spark/lazy_cdlc_liveness_proofs.gpr` | Lazy preparation liveness-bound checks. |
| `spark/lazy_cdlc_loan_rollover_proofs.gpr` | Loan-rollover Lazy product checks. |
| `spark/lightning_cdlc_proofs.gpr` | Lightning companion finite-model checks. |

## Required Gates

| Gate | Command |
| --- | --- |
| TypeScript build | `npm run build` |
| Deterministic test suite | `npm test` |
| Layer 3 package | `npm run test:layer3` |
| Lazy holder activation | `npm run test:bilateral-lazy-activation` |
| Adversarial matrix | `npm run test:adversarial-failure-matrix` |
| Node v0.1 verifier | `npm run v0.1:verify -- --skip-ada --skip-spark --artifacts-dir /tmp/niti-v0.1-node-audit` |
| Full v0.1 verifier | `npm run v0.1:verify` |
| Lazy SPARK suite | `npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark --artifacts-dir /tmp/niti-v0.1-lazy-spark-audit` |
| Public-doc contamination scan | Command in `docs/V0_1_FRESH_CLONE_AUDIT.md` |
| Markdown link check | `npx --yes markdown-link-check README.md docs/*.md` |
| Whitespace check | `git diff --check` |

## Non-Claims

The release candidate does not claim production wallet safety, mainnet
readiness, public mempool reliability, production oracle integrity, production
Lightning deployment, financial solvency, legal readiness, or safety for user
funds.
