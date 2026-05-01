# Layer 3 Bilateral Wrong-Path And Replay Matrix

This document defines the deterministic wrong-path and replay matrix for the
bilateral Layer 3 harness. It checks that accepted setup and adaptor data cannot
be replayed, reordered, swapped, or combined with the wrong oracle scalar to
activate a non-corresponding child path.

## Covered Cases

The matrix covers:

- stale transcript replay with a retained old digest;
- session-id mismatch;
- setup-message reordering;
- reused acknowledgement digests;
- wrong counterparty role binding;
- swapped Alice/Bob adaptor packets;
- wrong oracle outcome scalar;
- non-corresponding bridge edge data;
- mutated retained template/adaptor binding;
- repeated settlement after terminal activation.

## Fail-Closed Rule

Each wrong-path case must fail before activation or enter an explicit terminal
abort/fallback state. A valid happy path is checked in the same replay so that
the negative cases are not passing only because the canonical path is broken.

The retained-state validator also checks that adaptor packets remain bound to
the retained transaction templates. A retained state whose bridge template is
mutated without matching adaptor packet bindings is rejected before settlement.

## Boundary

This is a deterministic local adversarial matrix for bilateral messages and
retained state. It is not a network scheduler, peer authentication protocol,
anti-DoS layer, mempool policy model, or production wallet transport.

## Replay

Run:

```sh
npm run test:bilateral-wrong-path-replay
```

The replay emits:

```text
niti.l3_bilateral_wrong_path_replay_test.v1
```
