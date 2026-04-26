# v0.1 CI Gate

The `v0.1 validation` GitHub Actions workflow is the remote release gate for
the narrow v0.1 claim.

It runs on every pull request and on pushes to `main`.

## Jobs

| Job | Purpose | Commands |
| --- | --- | --- |
| TypeScript deterministic harness | Build and run the deterministic protocol harnesses, including the cDLC smoke path. | `npm ci`, `npm run build`, `npm test`, `npm run test:cdlc-smoke` |
| Ada manifest validator | Build the finite cDLC graph manifest validator and validate the canonical fixture. | `npm run ada:build`, `npm run testnet -- manifest:validate --file testnet/examples/sample-manifest.json` |
| SPARK proof regression | Run the core cDLC and Lightning SPARK proof targets and reject `pragma Assume` in proof sources. | `gnatprove -P spark/cdlc_integer_proofs.gpr`, `gnatprove -P spark/cdlc_residue_proofs.gpr`, `gnatprove -P spark/cdlc_proofs.gpr`, `gnatprove -P spark/lightning_cdlc_proofs.gpr` |

The TypeScript job uploads `v0-1-cdlc-smoke-transcript.json` as a workflow
artifact. That transcript is the reproducible remote evidence for the minimum
parent-CET -> bridge -> child-funding smoke path.

## Manual Or External Steps

The workflow deliberately does not do the following:

- public testnet or signet broadcast;
- faucet funding;
- mempool relay or confirmation testing;
- fee-bump, CPFP, anchor, or transaction-pinning testing;
- production wallet key storage;
- live Lightning channel force-close or watchtower behavior;
- full product-model SPARK proof sweep across every financial product target.

Those are separate release gates. The v0.1 CI gate proves that regressions in
the core proof targets and deterministic harnesses are caught remotely before a
PR can be treated as release-ready.

## Interpreting A Pass

A green workflow means:

- the TypeScript code compiles;
- the deterministic adaptor, Lightning, and cDLC smoke harnesses pass;
- the Ada cDLC graph manifest validator builds and accepts the canonical
  manifest fixture;
- the core cDLC and Lightning SPARK proof targets pass in CI;
- the proof sources used by the gate contain no `pragma Assume`.

It does not mean the software is mainnet-ready or safe for user funds.
