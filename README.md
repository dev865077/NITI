# NITI

[![v0.1 validation](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml/badge.svg)](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml)
![Status](https://img.shields.io/badge/status-research%20prototype-orange)
![Evidence](https://img.shields.io/badge/evidence-public%20Bitcoin%20verified-brightgreen)
![License](https://img.shields.io/badge/license-ISC-blue)
![Network](https://img.shields.io/badge/network-signet%2Ftestnet%2Fmainnet-lightgrey)

NITI is a research and implementation workspace for Cascading Discreet Log Contracts,
or cDLCs.

The core result is narrow: a DLC oracle attestation scalar revealed by a parent
contract can also complete adaptor signatures on a bridge transaction that
funds the next contract.

The current scaling result is Lazy cDLC preparation: because activation safety
is local to a prepared edge, the full future graph does not need to be retained
at genesis.

The project is not production software. It contains a dust-sized mainnet
activation run, but it is not custody software, wallet software, or a financial
product release.

## Current State

NITI now has public Bitcoin evidence for a single cDLC activation path:

```text
public funding
  -> parent CET confirmed
  -> oracle scalar completes bridge adaptor signature
  -> bridge confirmed
  -> child funding output exists
```

The strongest committed execution artifact is the dust-sized Lazy mainnet run
in [`docs/evidence/lazy-public-mainnet/`](docs/evidence/lazy-public-mainnet/).
It demonstrates a `K = 2` bounded preparation window on Bitcoin mainnet:

| Item | Value |
| --- | --- |
| Funding output | [`d05aa027...67efee3:0`](https://mempool.space/tx/d05aa027f1e046a7deef5f28d11f7b729149293c5eb4eaaac882eaab567efee3), `31,878 sats` |
| Parent CET | [`2abf8200...54775c9`](https://mempool.space/tx/2abf820058b146d32d186a62675990abeedc55971e2c7e2ecadc936b854775c9), mainnet block `947247` |
| Bridge | [`2bd5ff8c...e96263af`](https://mempool.space/tx/2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af), mainnet block `947248` |
| Child funding output | `2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af:0`, `30,378 sats` |
| Evidence bundle | [`lazy-activation-evidence-bundle.json`](docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json) |

This is still a technical prototype result. The remaining major work is not
another proof of the basic activation primitive; it is protocol hardening:
bilateral negotiation, oracle auditability, economic stress, wallet UX,
fee/reorg policy, and external review.

## Lazy cDLC Compression

Lazy cDLCs are the current NITI path for making deep cDLC graphs practical.
The compression is live-state compression, not a claim that every product cost
disappears.

For a non-recombining graph with branching factor `b` and depth `D`, eager
preparation may require retaining:

```text
EagerNodes(D) = 1 + b + b^2 + ... + b^D
```

With a Lazy preparation window of depth `K`, retained live state is bounded by:

```text
LazyNodes(K) = 1 + b + b^2 + ... + b^(K-1)
```

For fixed `K`, the live retained state is independent of total product depth
`D`. Lifetime negotiation work may still grow with the number of periods
actually traversed, and per-node compression remains payoff-dependent.

The SPARK/Ada Lazy proof suite models finite-window preparation, edge-local
activation independence, window sliding, retained-state bounds, recombining
state, per-node compression composition, liveness fallback, and a BTC loan
rollover specialization. See [`docs/LAZY_CDLC_STATUS.md`](docs/LAZY_CDLC_STATUS.md).

## Contents

- [Current State](#current-state)
- [Lazy cDLC Compression](#lazy-cdlc-compression)
- [Reproducibility Status](#reproducibility-status)
- [Precise Claim](#precise-claim)
- [How cDLC Cascading Works](#how-cdlc-cascading-works)
- [Evidence Map](#evidence-map)
- [Quick Start](#quick-start)
- [Reproduce Evidence](#reproduce-evidence)
- [Run The Technical Demo](#run-the-technical-demo)
- [Repository Map](#repository-map)
- [Formal Models](#formal-models)
- [Bitcoin Harnesses](#bitcoin-harnesses)
- [Financial Product Models](#financial-product-models)
- [For AI Agents](#for-ai-agents)
- [Security Boundary](#security-boundary)
- [Roadmap](#roadmap)
- [License](#license)

## Reproducibility Status

The current remote release gate is the
[v0.1 validation workflow](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml).
The latest recorded green `main` baseline for this status is commit
[`f13e662751eadfc4e0038b82ece88c099b6ab574`](https://github.com/dev865077/NITI/commit/f13e662751eadfc4e0038b82ece88c099b6ab574),
validated by
[GitHub Actions run `25088426740`](https://github.com/dev865077/NITI/actions/runs/25088426740).

| Surface | Status | Evidence |
| --- | --- | --- |
| Remote v0.1 CI gate | Passing for the recorded `main` baseline. | [`v0.1 validation`](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml) |
| Local full gate | Reproducible with `npm run v0.1:verify` when Node, Ada, and SPARK toolchains are installed. | [`docs/V0_1_RUNNER.md`](docs/V0_1_RUNNER.md) |
| Public signet activation | Committed public evidence exists for one parent -> bridge -> child funding path. | [`docs/evidence/public-signet/`](docs/evidence/public-signet/) |
| Lazy SPARK compression suite | Finite Lazy models cover bounded windows, edge-local independence, retained-state bounds, recombination, compression composition, liveness fallback, and loan rollover. | [`docs/LAZY_CDLC_STATUS.md`](docs/LAZY_CDLC_STATUS.md) |
| Lazy mainnet activation | A dust-sized `K = 2` Lazy path is committed with Bitcoin mainnet confirmations for parent CET and bridge. | [`docs/evidence/lazy-public-mainnet/`](docs/evidence/lazy-public-mainnet/) |
| Manual or experimental surfaces | Fresh public broadcasts, faucet funding, production wallet behavior, fee-bump policy, and product-level SPARK sweeps remain explicit manual or extended steps. | [`docs/V0_1_REPRODUCIBILITY_STATUS.md`](docs/V0_1_REPRODUCIBILITY_STATUS.md) |

## Precise Claim

The conservative claim supported by the current repository is:

> Under the documented cryptographic and operational assumptions, NITI
> demonstrates a Cascading DLC activation path in which a parent DLC oracle
> scalar completes the selected parent settlement and also completes a bridge
> transaction into child funding, while a non-corresponding oracle scalar fails
> to activate that bridge.

This claim is supported by four evidence layers:

| Layer | Status |
| --- | --- |
| Formal algebra | SPARK/Ada models prove the core adaptor/oracle equations in finite models with no `pragma Assume` in the proof sources. |
| Deterministic/regtest evidence | Local deterministic transcripts and Bitcoin Core regtest broadcast/confirmation evidence are committed. |
| Public signet evidence | A funded parent output, parent CET, bridge, and child funding output were broadcast and confirmed on public signet. |
| Dust mainnet evidence | A Lazy bounded-window parent CET and bridge were broadcast and confirmed on Bitcoin mainnet with a small controlled UTXO. |

NITI does not claim:

- mainnet readiness;
- production custody safety;
- production wallet UX;
- a complete bilateral DLC protocol;
- a complete auditable oracle service;
- production Lightning channel support;
- guaranteed liquidity, solvency, or redemption;
- legal or regulatory readiness.

## How cDLC Cascading Works

A Schnorr oracle commits to a nonce point `R_o` and later attests an outcome
`x` by revealing:

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_xV
```

Before the event, `S_x` is public but `s_x` is unknown. A cDLC uses `S_x` as
the adaptor point for a bridge transaction. When the oracle publishes `s_x`,
the bridge signature is completed:

```text
s = s_hat + s_x mod n
```

That bridge spends a parent outcome output and creates the funding output for a
child DLC. Bitcoin validates ordinary Taproot/Schnorr spends; the contract
graph and financial semantics remain off-chain.

```mermaid
flowchart LR
  A["Parent DLC funding"] --> B["Parent CET for outcome x"]
  B --> C["Bridge transaction"]
  C --> D["Child DLC funding"]
  O["Oracle reveals s_x"] --> B
  O --> C
  Y["Oracle reveals s_y"] -. "wrong outcome rejected" .-> C
```

## Evidence Map

Use this table as the top-level audit map.

| Evidence | Where | What it supports |
| --- | --- | --- |
| Primary whitepaper | [`WHITEPAPER.md`](WHITEPAPER.md) | cDLC construction, security claims, Lightning extension, and limitations. |
| Protocol summary | [`docs/PROTOCOL.md`](docs/PROTOCOL.md) | Compact protocol description: oracle, adaptor, bridge, Lightning, graph discipline. |
| Architecture note | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Research, proof, and testnet architecture. |
| Lazy cDLC status | [`docs/LAZY_CDLC_STATUS.md`](docs/LAZY_CDLC_STATUS.md) | Live-state compression claim, proof boundary, public evidence, and remaining work. |
| Public signet activation bundle | [`docs/evidence/public-signet/`](docs/evidence/public-signet/) | Funded public signet parent CET, bridge confirmation, child funding output, raw tx files, verifier log. |
| Lazy public testnet bundle | [`docs/evidence/lazy-public-testnet/`](docs/evidence/lazy-public-testnet/) | Public Bitcoin testnet Lazy `K = 2` parent CET, bridge confirmation, child funding output, raw tx files, and Lazy window manifest. |
| Lazy public mainnet bundle | [`docs/evidence/lazy-public-mainnet/`](docs/evidence/lazy-public-mainnet/) | Dust-sized Bitcoin mainnet Lazy `K = 2` parent CET, bridge confirmation, child funding output, raw tx files, and Lazy window manifest. |
| v0.1 technical demo script | [`docs/V0_1_TECHNICAL_DEMO.md`](docs/V0_1_TECHNICAL_DEMO.md), [`scripts/demo-v0.1.sh`](scripts/demo-v0.1.sh) | Reproducible demo sequence from public signet artifacts, with explicit claim boundaries. |
| v0.1 reproducibility status | [`docs/V0_1_REPRODUCIBILITY_STATUS.md`](docs/V0_1_REPRODUCIBILITY_STATUS.md) | Current CI, local runner, public evidence, and manual/experimental boundaries. |
| External auditor quickstart | [`docs/AUDITOR_QUICKSTART.md`](docs/AUDITOR_QUICKSTART.md) | Minimal reviewer path with dependencies, commands, expected outputs, troubleshooting, and a committed demo transcript. |
| v0.1 limitations document | [`docs/V0_1_LIMITATIONS.md`](docs/V0_1_LIMITATIONS.md) | Technical diligence boundary for oracle, fee, liquidity, collateral, state retention, bilateral protocol, Lightning, and mainnet readiness. |
| v0.1 release notes draft | [`docs/V0_1_RELEASE_NOTES.md`](docs/V0_1_RELEASE_NOTES.md) | Allowed/forbidden release claims, residual assumptions, and anti-overclaim reviewer checklist. |
| SPARK target inventory | [`docs/SPARK_TARGET_INVENTORY.md`](docs/SPARK_TARGET_INVENTORY.md) | Canonical map from SPARK targets to package files, object directories, commands, and claim families. |
| Regtest Bitcoin Core bundle | [`docs/evidence/regtest-cdlc/`](docs/evidence/regtest-cdlc/) | Controlled Bitcoin Core regtest RPC broadcast, mempool checks, confirmations, raw tx files, timeout path. |
| Deterministic Layer 2 closeout | [`docs/L2_DETERMINISTIC_CLOSEOUT.md`](docs/L2_DETERMINISTIC_CLOSEOUT.md) | Deterministic Layer 2 evidence, component status, and residual risks. |
| Canonical Layer 2 scenario | [`docs/L2_SINGLE_CDLC_SCENARIO.md`](docs/L2_SINGLE_CDLC_SCENARIO.md) | Single-parent/single-child transaction graph, fixture amounts, keys, timelocks, pass/fail criteria. |
| Parent funding harness | [`docs/L2_PARENT_FUNDING_HARNESS.md`](docs/L2_PARENT_FUNDING_HARNESS.md) | Deterministic signed Taproot parent funding fixture. |
| Parent CET harness | [`docs/L2_PARENT_CET_HARNESS.md`](docs/L2_PARENT_CET_HARNESS.md) | Serialized parent CET, stable txid, edge output map, bridge reference. |
| Bridge harness | [`docs/L2_BRIDGE_HARNESS.md`](docs/L2_BRIDGE_HARNESS.md) | Serialized bridge transaction, parent edge input, child funding output. |
| Bridge adaptor completion | [`docs/L2_BRIDGE_ADAPTOR_COMPLETION.md`](docs/L2_BRIDGE_ADAPTOR_COMPLETION.md) | Pre-resolution invalidity, correct-scalar completion, wrong-scalar rejection. |
| Parent CET confirmation | [`docs/L2_PARENT_CET_CONFIRMATION.md`](docs/L2_PARENT_CET_CONFIRMATION.md) | Deterministic parent CET confirmation transcript. |
| Bridge confirmation | [`docs/L2_BRIDGE_CONFIRMATION.md`](docs/L2_BRIDGE_CONFIRMATION.md) | Deterministic bridge confirmation transcript and child funding outpoint. |
| Child prepared spends | [`docs/L2_CHILD_PREPARED_SPENDS.md`](docs/L2_CHILD_PREPARED_SPENDS.md) | Prepared child CET and timelocked refund spends. |
| Edge refund timeout | [`docs/L2_EDGE_REFUND_TIMEOUT.md`](docs/L2_EDGE_REFUND_TIMEOUT.md) | Negative timeout/refund path for the parent edge output. |
| E2E transcript | [`docs/L2_E2E_TRANSCRIPT.md`](docs/L2_E2E_TRANSCRIPT.md) | Redacted deterministic audit transcript and replay commands. |
| Bilateral role fixtures | [`docs/L3_BILATERAL_ROLES.md`](docs/L3_BILATERAL_ROLES.md) | Alice/Bob key scopes, nonce commitments, storage identities, and local fixture checks. |
| Bilateral setup schema | [`docs/L3_BILATERAL_SETUP_SCHEMA.md`](docs/L3_BILATERAL_SETUP_SCHEMA.md) | Versioned setup messages, canonical digests, critical-field rejection, and examples. |
| SPARK-to-Bitcoin trace | [`docs/SPARK_TO_BITCOIN_TRACE.md`](docs/SPARK_TO_BITCOIN_TRACE.md) | Mapping from formal algebra claims to TypeScript/Bitcoin transaction fields. |
| SPARK/Ada models | [`spark/`](spark/) | Formal algebra, Lightning witness models, and finite financial accounting models. |
| TypeScript harness | [`testnet/`](testnet/) | Taproot/adaptor/oracle/RPC harnesses, manifests, public signet and regtest flows. |
| Public signet guide | [`testnet/PUBLIC_SIGNET.md`](testnet/PUBLIC_SIGNET.md) | Funding request and public-network activation commands. |
| Mainnet live-run guide | [`testnet/MAINNET_LIVE_RUN.md`](testnet/MAINNET_LIVE_RUN.md) | Dust-sized mainnet activation workflow and claim boundary. |
| Regtest guide | [`testnet/REGTEST.md`](testnet/REGTEST.md) | Local Bitcoin Core regtest setup. |
| CI gate | [GitHub Actions](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml) | Build, deterministic tests, Ada validator, core and Lazy cDLC SPARK proof regression. |
| Security notes | [`docs/SECURITY.md`](docs/SECURITY.md) | Operational boundaries and explicit non-goals. |

## Quick Start

Prerequisites:

- Node.js 20 or newer.
- `npm`.
- Optional: GNAT/GPRbuild for the Ada manifest validator.
- Optional: SPARK/GNATprove for formal proof runs.
- Optional: Bitcoin Core 31+ for regtest, public signet/testnet, or guarded
  mainnet work.
- Optional: LND for Lightning hold-invoice experiments.

Install dependencies and run the local deterministic suite:

```sh
npm ci
npm run build
npm test
```

Run the core cDLC smoke path directly:

```sh
npm run test:cdlc-smoke
```

Verify the historical public signet evidence bundle:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/public-signet/public-activation-evidence-bundle.json
```

Verify the current Lazy mainnet evidence bundle:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
```

Run the full local v0.1 gate:

```sh
npm run v0.1:verify
```

Run the Lazy SPARK suite directly:

```sh
npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark
```

The full GitHub Actions gate is documented in
[`docs/V0_1_CI.md`](docs/V0_1_CI.md).

## Reproduce Evidence

### Current Lazy Mainnet Evidence

The strongest committed public Bitcoin artifact is the Lazy `K = 2` mainnet
bundle:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
```

This verifies raw transaction files, parent-to-bridge continuity,
bridge-to-child funding continuity, signature-state boundaries, wrong-scalar
rejection, and the Lazy window manifest.

### Deterministic Local Evidence

The strict local entry point is:

```sh
npm run v0.1:verify
```

It runs:

- TypeScript build;
- deterministic oracle/adaptor tests;
- Lightning mock tests;
- cDLC smoke transcript;
- evidence bundle verifier;
- parent funding and E2E transcript emitters;
- Ada manifest validator;
- no-`pragma Assume` scan for SPARK sources;
- core SPARK proof targets.

The runner writes logs/transcripts under `testnet/artifacts/`. See
[`docs/V0_1_RUNNER.md`](docs/V0_1_RUNNER.md).

### Regtest Bitcoin Core Evidence

For controlled Bitcoin Core execution before public signet/testnet work:

```sh
npm run regtest:start
scripts/regtest-env.sh env > .env
npm run regtest:cdlc-evidence
npm run regtest:stop
```

Committed regtest evidence lives in
[`docs/evidence/regtest-cdlc/`](docs/evidence/regtest-cdlc/).

### Historical Public Signet Evidence

The current public signet run is already committed. To verify it:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/public-signet/public-activation-evidence-bundle.json
```

To run a fresh public signet activation, configure `.env` for a synced Bitcoin
Core signet node with `txindex=1`, then:

```sh
npm run public:cdlc-funding-request -- \
  --network signet \
  --out testnet/artifacts/public-signet-funding-request.json

npm run public:cdlc-execute -- \
  --network signet \
  --out-dir docs/evidence/public-signet \
  --min-confirmations 1 \
  --wait-seconds 7200
```

The harness uses deterministic test keys. Never send mainnet BTC to any address
printed by this repository.

## Run The Technical Demo

The historical v0.1 technical demo wraps the public signet evidence verifier
and prints the parent funding, parent CET, bridge, child funding, wrong-scalar
rejection, and timelock boundary from committed artifacts:

```sh
npm run demo:v0.1
```

For a longer session that also executes the full local v0.1 gate:

```sh
npm run demo:v0.1 -- --full-local-gate
```

Use [`docs/V0_1_TECHNICAL_DEMO.md`](docs/V0_1_TECHNICAL_DEMO.md) as the
presenter and reviewer script.

## Repository Map

```text
.github/workflows/
  v0-1-validation.yml        Remote v0.1 validation gate
docs/
  LAZY_CDLC_STATUS.md        Lazy compression status and proof boundary
  evidence/public-signet/    Public signet parent CET -> bridge evidence
  evidence/lazy-public-testnet/
                              Lazy public testnet parent CET -> bridge evidence
  evidence/lazy-public-mainnet/
                              Dust-sized Lazy mainnet parent CET -> bridge evidence
  evidence/regtest-cdlc/ Bitcoin Core regtest tx evidence bundle
  ARCHITECTURE.md            Research/proof/testnet architecture
  PROTOCOL.md                cDLC protocol summary
  ROADMAP.md                 Engineering roadmap
  SECURITY.md                Safety boundary and non-goals
  SPARK_TO_BITCOIN_TRACE.md  Formal-to-Bitcoin traceability
  V0_1_ACCEPTANCE_MATRIX.md  Release claim and evidence matrix
  V0_1_CI.md                 CI gate documentation
  V0_1_RUNNER.md             One-command local v0.1 verification
  L2_*.md                    Layer 2 deterministic scenario and evidence docs
research/
  cdlc-technical-note.md     Focused cDLC algebra note
  cdlc-algebra-check.ts      TypeScript algebra sanity check
  *-math.md                  Financial product math specifications
spark/
  src/                       SPARK/Ada proof models
  *.gpr                      GNATprove project files
  README.md                  Proof scope and commands
testnet/
  src/                       TypeScript harness and CLI
  ada/                       Ada cDLC manifest validator
  examples/                  Canonical manifests
  LIGHTNING.md               Lightning hold-invoice harness
  PUBLIC_SIGNET.md           Public signet/testnet workflow
  MAINNET_LIVE_RUN.md        Dust-sized mainnet activation workflow
  REGTEST.md                 Deterministic Bitcoin Core regtest guide
WHITEPAPER.md                Primary cDLC whitepaper
LEGACY-WHITEPAPER.md         Historical NITI draft
```

The local `site/` directory is ignored by Git and is not part of the GitHub
evidence package.

## Formal Models

The proof layer contains SPARK/Ada models for the cDLC algebra, the Lightning
extension, and finite financial-product accounting models.

Core proof targets:

| Target | Scope |
| --- | --- |
| `spark/cdlc_integer_proofs.gpr` | Symbolic integer identities using `SPARK.Big_Integers`. |
| `spark/cdlc_residue_proofs.gpr` | Explicit arithmetic over `Z/97Z`. |
| `spark/cdlc_proofs.gpr` | Ada built-in modular model over `type mod 97`. |
| `spark/lightning_cdlc_proofs.gpr` | HTLC/PTLC witness behavior, route tweaks, child activation, and channel-balance conservation in a finite model. |

Lazy cDLC proof targets model bounded-window preparation, edge-local
activation, window sliding, retained-state bounds, recombining-state
compression, per-node compression composition, liveness fallback, and BTC loan
rollover specialization. They are documented in
[`docs/SPARK_TARGET_INVENTORY.md`](docs/SPARK_TARGET_INVENTORY.md) and
[`spark/README.md`](spark/README.md).

The key cDLC properties modeled are:

- the oracle attestation scalar maps to the advertised attestation point;
- a bridge adaptor signature verifies before completion;
- adding the correct oracle scalar completes the bridge signature;
- a completed signature reveals the hidden scalar by subtraction;
- a different oracle scalar does not complete the same bridge signature.

The CI gate runs the core targets, runs the Lazy cDLC target suite, and rejects
`pragma Assume` in the proof sources. The broader product proof suite is
documented in [`spark/README.md`](spark/README.md).

Example core proof command:

```sh
gnatprove -P spark/cdlc_proofs.gpr \
  --level=4 \
  --prover=cvc5,z3,altergo \
  --timeout=20 \
  --report=all
```

Formal proof boundary:

- The SPARK models prove finite modeled equations and accounting invariants.
- They do not prove secp256k1 implementation correctness, SHA-256, BIP340,
  Bitcoin Core, wallet key management, mempool policy, or legal/economic
  viability.

## Bitcoin Harnesses

The TypeScript harness validates the Bitcoin-facing activation primitive:

```text
funded Taproot UTXO
  -> unsigned spend
  -> adaptor signature under S_x
  -> oracle publishes s_x
  -> completed Schnorr witness
  -> raw transaction broadcast or evidence artifact
```

Implemented today:

- BIP340-style oracle preparation and attestation.
- Taproot key-path adaptor spend generation.
- Signature completion from the oracle attestation scalar.
- Hidden-scalar extraction from a completed signature.
- Deterministic cDLC parent-CET -> bridge -> child-funding smoke transcript.
- Wrong-outcome negative checks.
- Bitcoin Core regtest evidence bundle generation.
- Public signet funding request and activation execution.
- LND hold-invoice artifacts for the HTLC-compatible Lightning extension.
- Live LND mutation refusal unless `--allow-live-lnd` is provided.
- Ada validation of finite cDLC graph manifests.

Operational guides:

- [`testnet/README.md`](testnet/README.md)
- [`testnet/REGTEST.md`](testnet/REGTEST.md)
- [`testnet/PUBLIC_SIGNET.md`](testnet/PUBLIC_SIGNET.md)
- [`testnet/LIGHTNING.md`](testnet/LIGHTNING.md)

Generate and validate a sample manifest:

```sh
npm run testnet -- manifest:sample \
  --network testnet4 \
  --out testnet/examples/sample-manifest.json

npm run testnet -- manifest:validate \
  --file testnet/examples/sample-manifest.json
```

Run the offline Lightning mock:

```sh
npm run test:lightning
npm run testnet -- lightning:mock-run
```

## Financial Product Models

NITI also contains research specifications and SPARK models for financial
products that could be expressed as finite cDLC state transitions. These are
accounting and payoff models, not production products.

| Product family | Research spec | SPARK target |
| --- | --- | --- |
| BTC-backed loans and collateral lifecycle | [`research/btc-backed-loan-lifecycle-math.md`](research/btc-backed-loan-lifecycle-math.md) | `spark/btc_collateral_loan_proofs.gpr`, `spark/btc_loan_lifecycle_proofs.gpr` |
| Covered calls and yield notes | [`research/covered-call-yield-note-math.md`](research/covered-call-yield-note-math.md) | `spark/covered_call_yield_note_proofs.gpr` |
| Synthetic dollar and stable exposure | [`research/synthetic-dollar-stable-exposure-math.md`](research/synthetic-dollar-stable-exposure-math.md) | `spark/synthetic_dollar_stable_exposure_proofs.gpr` |
| Perpetuals and rolling forwards | [`research/perpetuals-rolling-forwards-math.md`](research/perpetuals-rolling-forwards-math.md) | `spark/perpetuals_rolling_forwards_proofs.gpr` |
| Collars, puts, protected notes | [`research/collars-protective-puts-principal-protected-notes-math.md`](research/collars-protective-puts-principal-protected-notes-math.md) | `spark/collars_protective_notes_proofs.gpr` |
| Barrier options | [`research/barrier-options-knock-continuations-math.md`](research/barrier-options-knock-continuations-math.md) | `spark/barrier_options_proofs.gpr` |
| Autocallables and callable notes | [`research/autocallables-callable-yield-notes-math.md`](research/autocallables-callable-yield-notes-math.md) | `spark/autocallables_proofs.gpr` |
| Accumulators and decumulators | [`research/accumulators-decumulators-math.md`](research/accumulators-decumulators-math.md) | `spark/accumulators_decumulators_proofs.gpr` |
| CPPI and portfolio insurance | [`research/cppi-portfolio-insurance-math.md`](research/cppi-portfolio-insurance-math.md) | `spark/cppi_proofs.gpr` |
| Variance and corridor swaps | [`research/volatility-variance-corridor-swaps-math.md`](research/volatility-variance-corridor-swaps-math.md) | `spark/variance_corridor_swaps_proofs.gpr` |
| Basis and calendar rolls | [`research/basis-calendar-term-structure-rolls-math.md`](research/basis-calendar-term-structure-rolls-math.md) | `spark/basis_calendar_rolls_proofs.gpr` |
| Parametric insurance and event-linked notes | [`research/parametric-insurance-event-linked-notes-math.md`](research/parametric-insurance-event-linked-notes-math.md) | `spark/parametric_insurance_proofs.gpr` |

The boundary is important: these models prove internal accounting identities
under stated assumptions. They do not prove market liquidity, fair pricing,
oracle quality, collateral availability, legal enforceability, or user safety.

## For AI Agents

Start with these files, in this order:

1. [`README.md`](README.md) for current state and boundaries.
2. [`WHITEPAPER.md`](WHITEPAPER.md) for the construction and claims.
3. [`docs/LAZY_CDLC_STATUS.md`](docs/LAZY_CDLC_STATUS.md) for the current
   Lazy compression claim and proof boundary.
4. [`docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`](docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json) for the strongest public Bitcoin execution artifact.
5. [`docs/SPARK_TO_BITCOIN_TRACE.md`](docs/SPARK_TO_BITCOIN_TRACE.md) for proof-to-implementation mapping.
6. [`spark/README.md`](spark/README.md) for formal proof scope.
7. [`testnet/PUBLIC_SIGNET.md`](testnet/PUBLIC_SIGNET.md),
   [`testnet/MAINNET_LIVE_RUN.md`](testnet/MAINNET_LIVE_RUN.md), and
   [`testnet/REGTEST.md`](testnet/REGTEST.md) for operational replay.

High-signal commands:

```sh
npm run build
npm test
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
npm run v0.1:verify
```

Do not infer more than the artifacts prove:

- Public Bitcoin evidence proves the single-path activation can be materialized
  as real Bitcoin transactions, including one dust-sized mainnet path.
- It does not prove production bilateral negotiation, production mainnet fee
  safety, oracle operations, wallet security, route liquidity, or product
  solvency.
- The deterministic keys in the harness are public test keys.
- Every new substantive change should preserve the evidence boundary and add
  validation proportional to the risk.

When choosing the next engineering focus, prefer work that closes a remaining
production gap rather than re-proving the already demonstrated activation path:

- bilateral participant protocol;
- auditable oracle service;
- economic stress simulator;
- fee/reorg/pinning policy;
- external review package;
- wallet or demo UX.

## Security Boundary

Do not use this repository with production mainnet funds.

The committed mainnet run used a small controlled UTXO to demonstrate mechanics.
That does not make the repository safe for custody, users, or products.

The current code and proofs do not cover:

- production key storage;
- production wallet integration;
- full bilateral DLC negotiation;
- complete mainnet fee-bump, CPFP, anchor, or pinning policy;
- multi-oracle threshold attestations;
- production Lightning channel state machines;
- route liquidity, force-close, watchtower, and PTLC deployment behavior;
- oracle operational security and source integrity;
- economic solvency of any real financial product;
- legal or regulatory suitability.

Before publishing artifacts, check for local secrets:

```sh
find testnet/artifacts -maxdepth 1 -type f -not -name .gitkeep -print
test ! -f .env && echo ".env absent"
```

## Roadmap

The roadmap is maintained in [`docs/ROADMAP.md`](docs/ROADMAP.md). The current
state is:

1. Core cDLC algebra and deterministic harness: done.
2. Bitcoin Core regtest broadcast/confirmation evidence: done.
3. Public signet/testnet parent CET -> bridge -> child funding evidence: done.
4. Dust-sized mainnet parent CET -> bridge -> child funding evidence: done.
5. Lazy cDLC compression proof suite and public `K = 2` runs: done for the
   modeled finite claims and the mechanical activation evidence.
6. Bilateral protocol transcript with two independent participants: role
   separation fixtures and setup schema exist; funding validation and adaptor
   exchange remain the next major gaps.
7. Auditable oracle layer with announcement, nonce commitment, attestation
   verification, and history: next major gap.
8. Economic stress simulations for collateral, liquidation, timelocks, and
   recovery behavior: next major gap.
9. Wallet, Lightning, oracle, and product integrations: future work after
   review.

## License

ISC. See [`LICENSE`](LICENSE).
