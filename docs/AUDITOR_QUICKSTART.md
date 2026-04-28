# External Auditor Quickstart

This quickstart gives an external reviewer the shortest path to reproduce or
audit the NITI v0.1 technical claim without private instructions.

The claim under review is narrow:

> NITI v0.1 demonstrates one public signet cDLC activation path where the
> oracle scalar that resolves the parent DLC also completes the bridge
> signature that funds the prepared child path, while the wrong outcome scalar
> is rejected.

This quickstart does not certify mainnet readiness, production custody,
solvency, bilateral protocol completeness, or production oracle quality.

## Dependency Profiles

| Profile | Required tools | Runtime | What it proves or checks |
| --- | --- | --- | --- |
| Artifact audit | Node.js 20+, `npm`, `jq` | Seconds after `npm ci` | Verifies the committed public signet evidence bundle and prints the parent -> bridge -> child trace. |
| Full local gate | Node.js 20+, `npm`, `jq`, GNAT/GPRbuild, GNATprove, CVC5, Z3, Alt-Ergo | Usually minutes | Runs the local deterministic v0.1 gate, Ada manifest validator, no-`pragma Assume` scan, and core SPARK proof targets. |
| Fresh signet execution | Artifact audit tools plus synced Bitcoin Core signet RPC and signet funds | Depends on public signet confirmation time | Produces a new public signet activation artifact. This is optional for auditing the committed run. |

## 1. Clone And Install

```sh
git clone https://github.com/dev865077/NITI.git
cd NITI
npm ci
```

Expected result:

- dependencies install without modifying committed sources;
- no Bitcoin Core node is required for the artifact audit path.

## 2. Verify The Public Signet Demo

```sh
npm run demo:v0.1
```

Expected result:

- `test:evidence-bundle` returns `"ok": true`;
- `checkedTransactions` is `5`;
- every entry under `checks` is printed as `true`;
- parent funding outpoint is
  `65d17c3ccddb83733030995a7b1c59796beb4e4012b5706caa4ab6abb9db2490:0`;
- parent CET is
  `b6d800695fa61219bdf7de10a4b97e0efae0bf974283293284aa40e893b9838c`;
- bridge transaction is
  `6b0c1951480aa62914ed38ca3629666d4d37033b2dabf9f424ffb7450f8042cc`;
- child funding outpoint is
  `6b0c1951480aa62914ed38ca3629666d4d37033b2dabf9f424ffb7450f8042cc:0`;
- `bridge_pre_resolution_signature_valid` is `false`;
- `bridge_completed_signature_valid` is `true`;
- `bridge_wrong_scalar_rejected` is `true`;
- the script ends with the explicit demo boundary.

Committed transcript:

- [`docs/evidence/auditor-quickstart/demo-v0.1.log`](evidence/auditor-quickstart/demo-v0.1.log)

## 3. Inspect The Evidence Bundle Directly

```sh
jq '.checks' docs/evidence/public-signet/public-activation-evidence-bundle.json
jq '.activationPath.parentCet.confirmation' docs/evidence/public-signet/public-activation-evidence-bundle.json
jq '.activationPath.bridge.confirmation' docs/evidence/public-signet/public-activation-evidence-bundle.json
```

Expected result:

- all checks are true;
- parent CET confirmation records signet block `302040`;
- bridge confirmation records signet block `302041`.

Primary artifact:

- [`docs/evidence/public-signet/public-activation-evidence-bundle.json`](evidence/public-signet/public-activation-evidence-bundle.json)

Raw transactions:

- [`public-01-parent-funding.hex`](evidence/public-signet/public-01-parent-funding.hex)
- [`public-02-parent-cet.hex`](evidence/public-signet/public-02-parent-cet.hex)
- [`public-03-bridge.hex`](evidence/public-signet/public-03-bridge.hex)
- [`public-04-child-prepared-cet-unsigned.hex`](evidence/public-signet/public-04-child-prepared-cet-unsigned.hex)
- [`public-05-child-refund-timelocked.hex`](evidence/public-signet/public-05-child-refund-timelocked.hex)

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

The full gate writes a timestamped artifact directory under
`testnet/artifacts/v0.1-*` with logs and `summary.json`.

## 5. Optional Fresh Public Signet Run

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

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `Missing required tool: jq` | `jq` is not installed. | Install `jq` through the platform package manager and rerun. The demo intentionally uses `jq` for machine-checkable JSON inspection. |
| `npm ci` fails | Node/npm version mismatch or stale cache. | Use Node.js 20+ and rerun `npm ci` from a clean checkout. |
| `gnatprove` missing during full gate | SPARK toolchain is not installed or not on `PATH`. | Either install the SPARK toolchain or use artifact audit mode for public evidence review. |
| Public signet tx links are slow or unavailable | External block explorer issue. | Use the committed raw tx files and evidence bundle verifier; explorer availability is not part of the proof. |
| Fresh signet run waits for a long time | Public signet block cadence or faucet funding delay. | The committed artifact path does not depend on fresh network confirmations. |

## Audit Checklist

1. Confirm the repository commit under review.
2. Run `npm run demo:v0.1`.
3. Confirm the transcript matches the expected parent, bridge, and child
   outpoints above.
4. Inspect
   [`docs/evidence/public-signet/public-activation-evidence-bundle.json`](evidence/public-signet/public-activation-evidence-bundle.json).
5. Confirm wrong-outcome rejection and pre-resolution bridge invalidity.
6. Run `npm run demo:v0.1 -- --full-local-gate` when the SPARK/Ada toolchain
   is available.
7. Check [the v0.1 acceptance matrix](V0_1_ACCEPTANCE_MATRIX.md) before
   accepting any claim beyond the narrow technical existence statement.
