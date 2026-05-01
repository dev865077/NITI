# Layer 3 CI Artifact Gate

The Layer 3 artifact gate turns the bilateral protocol harness into a
replayable evidence package. It runs every deterministic bilateral replay,
writes each replay as JSON, then verifies that all required artifacts are
present and that every required check passed.

## Command

Run:

```sh
npm run test:layer3 -- --artifacts-dir testnet/artifacts/layer3-review
```

The command writes:

```text
l3-bilateral-roles.json
l3-bilateral-setup-schema.json
l3-bilateral-state-machine.json
l3-bilateral-template-agreement.json
l3-bilateral-funding-validation.json
l3-bilateral-adaptor-exchange.json
l3-bilateral-state-retention.json
l3-bilateral-two-process.json
l3-bilateral-restart-recovery.json
l3-bilateral-malformed-counterparty.json
l3-bilateral-settlement-execution.json
l3-bilateral-wrong-path-replay.json
l3-bilateral-summary.json
```

The summary is emitted only after the verifier opens every required artifact
and checks the expected pass/fail fields.

## Remote CI

The `v0.1 validation` workflow runs the same command in the TypeScript
deterministic harness job and uploads the JSON files as
`layer-3-bilateral-artifacts`.

## Boundary

This gate proves that the local bilateral evidence is reproducible in CI. It
does not implement production encrypted transport, production wallet storage,
peer discovery, anti-DoS policy, public-network broadcast, oracle operations,
or mainnet custody safety.
