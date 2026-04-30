# Layer 3 Restart Recovery

This document defines the deterministic restart-recovery harness for the
bilateral Layer 3 protocol. It checks that each participant can recover from a
persisted checkpoint and choose the correct safe action for the current phase.

## Recovery Checkpoints

The harness covers three checkpoint phases:

- after funding exchange;
- after adaptor exchange;
- after oracle attestation.

Each checkpoint has a digest over its persisted contents. A recovered process
first validates the checkpoint digest and setup transcript before taking any
settlement action.

## Expected Actions

After funding exchange, the participant has enough information to resume setup
but not enough retained bridge state to settle. If an oracle attestation arrives
before the bridge/adaptor state exists, the recovered action is fail-closed
abort.

After adaptor exchange, the participant can wait for oracle publication, refund
after the bridge timeout, or complete the bridge if the oracle scalar is
available.

After oracle attestation, the participant can complete the retained bridge
adaptor signature from persisted state and the stored oracle scalar.

## Partial Loss

The harness checks that missing retained state, corrupted checkpoint digests,
and missing attestation data after the attestation checkpoint fail closed. Total
state loss is not recovered unless a valid backup exists.

## Replay

Run:

```sh
npm run test:bilateral-restart-recovery
```

The replay emits:

```text
niti.l3_bilateral_restart_recovery_test.v1
```
