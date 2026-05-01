# External Auditor Quickstart

This quickstart gives an external reviewer the shortest path to reproduce or
audit the current NITI technical claim without private instructions.

The claim under review is narrow:

> NITI demonstrates cDLC activation and Lazy bounded-window preparation: the
> oracle scalar that resolves a parent DLC also completes the bridge signature
> that funds a prepared child path, while a wrong outcome scalar is rejected.
> The current strongest public artifact is a dust-sized Lazy `K = 2` mainnet
> run.

This quickstart does not certify production mainnet readiness, production
custody, solvency, production bilateral transport or wallet completeness, or
production oracle quality.

## Dependency Profiles

| Profile | Required tools | Runtime | What it proves or checks |
| --- | --- | --- | --- |
| Artifact audit | Node.js 20+, `npm`, `jq` | Seconds after `npm ci` | Verifies committed public evidence bundles and inspects the Lazy mainnet parent -> bridge -> child trace. |
| Full local gate | Node.js 20+, `npm`, `jq`, GNAT/GPRbuild, GNATprove, CVC5, Z3, Alt-Ergo | Usually minutes | Runs the deterministic gate, Ada manifest validator, no-`pragma Assume` scan, and core SPARK targets. Lazy SPARK targets have a separate command. |
| Fresh public execution | Artifact audit tools plus network funding and either Bitcoin Core RPC or guarded Esplora mode | Depends on confirmation time | Produces a new public-network activation artifact. This is optional for auditing the committed runs. |

## 1. Clone And Install

```sh
git clone https://github.com/dev865077/NITI.git
cd NITI
npm ci
```

Expected result:

- dependencies install without modifying committed sources;
- no Bitcoin Core node is required for the artifact audit path.

Release-candidate map:

- [`docs/V0_1_RELEASE_CANDIDATE.md`](V0_1_RELEASE_CANDIDATE.md)
- [`docs/V0_1_RC1_MANIFEST.md`](V0_1_RC1_MANIFEST.md)
- [`docs/V0_1_CLAIM_LOCK.md`](V0_1_CLAIM_LOCK.md)
- [`docs/V0_1_FRESH_CLONE_AUDIT.md`](V0_1_FRESH_CLONE_AUDIT.md)
- [`docs/V0_1_SEMANTIC_TRACE.md`](V0_1_SEMANTIC_TRACE.md)
- [`docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md`](V0_1_BILATERAL_E2E_TRANSCRIPT.md)

## 2. Verify The Lazy Mainnet Evidence

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
```

Expected result:

- `test:evidence-bundle` returns `"ok": true`;
- `checkedTransactions` is `5`;
- parent funding outpoint is
  `d05aa027f1e046a7deef5f28d11f7b729149293c5eb4eaaac882eaab567efee3:0`;
- parent CET is
  `2abf820058b146d32d186a62675990abeedc55971e2c7e2ecadc936b854775c9`;
- bridge transaction is
  `2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af`;
- child funding outpoint is
  `2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af:0`;
- the bundle kind is `niti.v0_2_lazy_mainnet_activation_evidence_bundle.v1`;
- the Lazy window records `K = 2`;
- pre-resolution bridge signature verification is false;
- completed bridge signature verification is true;
- wrong scalar rejection is true.

## 3. Inspect The Lazy Bundle Directly

```sh
jq '.kind' docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
jq '.checks' docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
jq '.lazyWindow.window' docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
jq '.activationPath.parentCet.confirmation' docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
jq '.activationPath.bridge.confirmation' docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
```

Expected result:

- all checks are true;
- Lazy window depth is `2`;
- parent CET confirmation records mainnet block `947247`;
- bridge confirmation records mainnet block `947248`.

Primary artifact:

- [`docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`](evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json)

Raw transactions:

- [`public-01-parent-funding.hex`](evidence/lazy-public-mainnet/public-01-parent-funding.hex)
- [`public-02-parent-cet.hex`](evidence/lazy-public-mainnet/public-02-parent-cet.hex)
- [`public-03-bridge.hex`](evidence/lazy-public-mainnet/public-03-bridge.hex)
- [`public-04-child-prepared-cet-unsigned.hex`](evidence/lazy-public-mainnet/public-04-child-prepared-cet-unsigned.hex)
- [`public-05-child-refund-timelocked.hex`](evidence/lazy-public-mainnet/public-05-child-refund-timelocked.hex)

## 4. Run The Full Local Gate

```sh
npm run demo:v0.1 -- --full-local-gate
```

Expected result:

- artifact demo passes first;
- `npm run v0.1:verify` runs and prints `v0.1 verification passed.`;
- TypeScript build and tests pass;
- Ada manifest validator builds and validates the sample manifest;
- SPARK proof sources contain no `pragma Assume`;
- core cDLC and Lightning SPARK proof targets pass.

Run the Lazy SPARK suite directly:

```sh
npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark
```

Expected result:

- the same no-`pragma Assume` scan passes;
- finite-window, edge-local, slide, tree-bound, recombining, compression,
  liveness, and loan-rollover Lazy targets pass.

The full gate writes a timestamped artifact directory under
`testnet/artifacts/v0.1-*` with logs and `summary.json`.

## 5. Optional Historical v0.1 Demo

The historical v0.1 signet demo remains useful for reproducing the original
public signet milestone:

```sh
npm run demo:v0.1
```

Committed transcript:

- [`docs/evidence/auditor-quickstart/demo-v0.1.log`](evidence/auditor-quickstart/demo-v0.1.log)

Readable transcript:

- [`docs/V0_1_EXECUTION_TRANSCRIPT.md`](V0_1_EXECUTION_TRANSCRIPT.md)
- [`docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md`](V0_1_BILATERAL_E2E_TRANSCRIPT.md)

Adversarial failure matrix:

```sh
npm run test:adversarial-failure-matrix
```

## 6. Optional Fresh Public Run

A fresh public signet run is useful for live demonstration but is not required
to audit the committed evidence.

Prerequisites:

- synced Bitcoin Core signet node;
- RPC credentials in `.env`;
- signet coins from a faucet or controlled signet wallet.

Commands:

```sh
npm run public:cdlc-funding-request -- \
  --network signet \
  --out testnet/artifacts/public-signet-funding-request.json
```

Fund the printed address with signet coins, wait for confirmation, then run:

```sh
npm run public:cdlc-execute -- \
  --network signet \
  --out-dir docs/evidence/public-signet \
  --min-confirmations 1 \
  --wait-seconds 7200
```

Detailed guide:

- [`testnet/PUBLIC_SIGNET.md`](../testnet/PUBLIC_SIGNET.md)
- [`testnet/MAINNET_LIVE_RUN.md`](../testnet/MAINNET_LIVE_RUN.md)

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `Missing required tool: jq` | `jq` is not installed. | Install `jq` through the platform package manager and rerun. The demo intentionally uses `jq` for machine-checkable JSON inspection. |
| `npm ci` fails | Node/npm version mismatch or stale cache. | Use Node.js 20+ and rerun `npm ci` from a clean checkout. |
| `gnatprove` missing during full gate | SPARK toolchain is not installed or not on `PATH`. | Either install the SPARK toolchain or use artifact audit mode for public evidence review. |
| Public tx links are slow or unavailable | External block explorer issue. | Use the committed raw tx files and evidence bundle verifier; explorer availability is not part of the proof. |
| Fresh signet run waits for a long time | Public signet block cadence or faucet funding delay. | The committed artifact path does not depend on fresh network confirmations. |

## Audit Checklist

1. Confirm the repository commit under review.
2. Run the Lazy mainnet bundle verifier.
3. Confirm the bundle matches the expected parent, bridge, and child
   outpoints above.
4. Inspect
   [`docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`](evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json).
5. Confirm wrong-outcome rejection and pre-resolution bridge invalidity.
6. Run `npm run demo:v0.1 -- --full-local-gate` when the SPARK/Ada toolchain
   is available.
7. Read [`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md) before
   accepting any claim about compression or current project status.
8. Check [the v0.1 acceptance matrix](V0_1_ACCEPTANCE_MATRIX.md) before
   accepting any claim beyond the narrow technical existence statement.
