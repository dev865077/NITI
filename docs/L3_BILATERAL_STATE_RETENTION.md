# Layer 3 Bilateral State Retention

This document defines the deterministic retained-state schema used by the
Layer 3 harness. The retained state is the minimum local record a participant
needs after setup to resume safely after process restart.

## Retained State

Each participant persists:

- setup transcript and transcript digest;
- funding validation result and funding digest;
- agreed transaction templates and template digest;
- adaptor-signature exchange messages;
- parent and child oracle metadata;
- parent refund, bridge timeout, and child refund deadlines;
- local secret handles for signing policy.

The retained state stores local secret handles, not raw private keys. Refund
signing still requires access to the participant's local signing material after
restart.

## Restart Rule

After restart, a participant first validates its retained-state digest and all
critical retained artifacts. A recovered participant may:

- complete the bridge with the oracle attestation scalar when the retained
  bridge adaptor signature verifies;
- wait while no oracle attestation is available and the timeout has not
  matured;
- use the retained refund template after the timeout height;
- abort when critical retained state is missing or inconsistent.

The bridge completion path uses the retained adaptor signature and the oracle
attestation scalar. It does not require recomputing the original adaptor
signature.

## Failure Boundary

This is a local deterministic retention harness. It does not implement cloud
backup, encrypted key storage, hardware wallet policy, authenticated transport,
or production recovery UX. Total loss of retained state remains a protocol
failure unless an external backup exists.

## Replay

Run:

```sh
npm run test:bilateral-state-retention
```

The replay emits:

```text
niti.l3_bilateral_state_retention_test.v1
```
