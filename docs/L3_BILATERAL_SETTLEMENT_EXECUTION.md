# Layer 3 Bilateral Settlement Execution

This document defines the deterministic bilateral settlement-execution harness.
It checks that Alice and Bob can use retained setup state and the oracle scalar
to complete the selected parent CET and bridge signatures.

## Execution Path

The harness starts from per-participant retained state. After the oracle scalar
is available, each participant independently:

- validates retained setup state;
- completes the parent CET adaptor signature;
- completes the bridge adaptor signature;
- verifies both completed signatures;
- checks the parent edge outpoint, bridge input, and child funding output.

The cross-participant transcript must match: both participants derive the same
completed signatures and the same graph transition.

## Missing-State Behavior

If retained adaptor state is removed before attestation, settlement does not
continue. The recovered action is fail-closed abort.

## Boundary

This is a deterministic local settlement harness. It does not implement public
network broadcast, production wallet persistence, encrypted peer transport, or
fee management. It demonstrates that the post-setup settlement path can be
replayed from retained bilateral state without a hidden single-party builder.

## Replay

Run:

```sh
npm run test:bilateral-settlement-execution
```

The replay emits:

```text
niti.l3_bilateral_settlement_execution_test.v1
```
