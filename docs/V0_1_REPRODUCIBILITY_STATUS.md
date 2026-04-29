# v0.1 Reproducibility Status

NITI's v0.1 reproducibility surface has three independently inspectable parts:
remote CI, local deterministic verification, and committed public-network
evidence.

## Recorded Baseline

| Field | Value |
| --- | --- |
| Recorded `main` commit | [`f13e662751eadfc4e0038b82ece88c099b6ab574`](https://github.com/dev865077/NITI/commit/f13e662751eadfc4e0038b82ece88c099b6ab574) |
| Remote workflow | [`v0.1 validation`](https://github.com/dev865077/NITI/actions/workflows/v0-1-validation.yml) |
| Recorded green run | [`25088426740`](https://github.com/dev865077/NITI/actions/runs/25088426740) |
| Local full-gate command | `npm run v0.1:verify` |

The workflow badge in the README reports the current status of the same remote
gate for `main`.

## Status Matrix

| Surface | Status | Reproduce or inspect |
| --- | --- | --- |
| TypeScript deterministic harness | Covered by remote CI and local runner. | `npm run v0.1:verify -- --skip-ada --skip-spark` |
| Ada finite graph manifest validator | Covered by remote CI and local runner. | `npm run v0.1:verify -- --skip-node --skip-spark` |
| Core SPARK proof regression | Covered by remote CI and local runner. | `scripts/run-v0.1.sh --skip-node --skip-ada` |
| Full local v0.1 gate | Covered when Node, Ada, and SPARK dependencies are installed. | `npm run v0.1:verify` |
| Public signet activation evidence | Committed and independently inspectable. | [`docs/evidence/public-signet/`](evidence/public-signet/) |
| Regtest Bitcoin Core evidence | Committed and independently inspectable. | [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/) |
| Auditor quickstart | Committed reproduction path. | [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md) |

## Manual And Experimental Boundaries

The automated v0.1 gate does not claim to cover:

- fresh public signet or testnet faucet funding;
- public mempool relay for a newly generated run;
- fee-bump, CPFP, anchor, package-relay, or pinning behavior;
- production wallet storage or mainnet custody;
- production Lightning channel operation;
- product-level economic solvency;
- the optional full SPARK sweep for every financial product model.

The product-model SPARK sweep is available as an extended local command:

```sh
npm run v0.1:verify -- --all-spark-products
```

That extended sweep is useful for review, but it is outside the narrow v0.1
release claim, which is the cDLC activation primitive.
