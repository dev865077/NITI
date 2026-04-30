# v0.1 One-Command Runner

`scripts/run-v0.1.sh` is the local reproducibility entry point for the narrow
v0.1 claim. It is deliberately stricter than the normal developer loop: missing
tools, failed proofs, failed tests, or failed invariants return a nonzero exit
code.

## Default Command

```sh
npm run v0.1:verify
```

The default run performs:

1. TypeScript build.
2. Deterministic adaptor, bilateral setup, Lightning, and cDLC smoke tests.
3. A fresh parent funding artifact at
   `testnet/artifacts/v0.1-*/parent-funding.json` and raw transaction at
   `testnet/artifacts/v0.1-*/parent-funding.hex`.
4. A fresh cDLC smoke transcript at
   `testnet/artifacts/v0.1-*/cdlc-smoke-transcript.json`.
5. A redacted Layer 2 audit transcript at
   `testnet/artifacts/v0.1-*/l2-e2e-transcript.json`.
6. Ada cDLC manifest validator build.
7. Sample finite cDLC manifest generation and validation.
8. `pragma Assume` scan over SPARK proof sources.
9. Core SPARK proof targets:
   - `spark/cdlc_integer_proofs.gpr`
   - `spark/cdlc_residue_proofs.gpr`
   - `spark/cdlc_proofs.gpr`
   - `spark/lightning_cdlc_proofs.gpr`

Each step writes a log under the selected artifact directory. The runner also
writes `summary.json` with the git commit, enabled suites, SPARK suite, and
artifact path.

## Tool Requirements

The full command requires:

- Node.js and `npm`;
- GNAT/GPRbuild for the Ada manifest validator;
- GNATprove with CVC5, Z3, and Alt-Ergo available for SPARK proof runs.

If a required tool is missing, the runner fails immediately. That behavior is
intentional: a successful v0.1 verification should not depend on hidden manual
interpretation.

## Scoped Runs

CI and local debugging can run the same entry point in scoped mode:

```sh
npm run v0.1:verify -- --skip-ada --skip-spark
npm run v0.1:verify -- --skip-node --skip-spark
npm run v0.1:verify -- --skip-node --skip-ada
```

To run every extended SPARK target, including product models and Lazy cDLC
models, use:

```sh
npm run v0.1:verify -- --all-spark-products
```

To run only the Lazy cDLC SPARK targets, use:

```sh
npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark
```

The extended sweeps are intentionally outside the default v0.1 command because
the v0.1 release claim is the cDLC activation primitive, not production
readiness for every modeled financial product or every lazy-continuation
protocol condition.

## CI Mapping

The GitHub Actions workflow invokes this runner in scoped jobs:

- TypeScript deterministic harness job: `--skip-ada --skip-spark`
- Ada manifest validator job: `--skip-node --skip-spark`
- SPARK proof regression job: `--skip-node --skip-ada`
- Lazy cDLC SPARK regression step: `--skip-node --skip-ada --lazy-spark`

This keeps toolchain setup isolated while still exercising the same
reproducibility entry point used by auditors locally.

## Boundary

The runner does not broadcast transactions, fund wallets, start Bitcoin Core,
or mutate LND. Public testnet/signet execution remains explicit and opt-in.
Use the regtest guide for controlled Bitcoin Core execution before attempting a
public network run.
