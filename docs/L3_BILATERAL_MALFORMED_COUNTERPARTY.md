# Layer 3 Malformed Counterparty Matrix

This document defines the deterministic malformed-message suite for the
bilateral Layer 3 protocol. It checks that obvious invalid counterparty data is
rejected with explicit failure reasons instead of silently producing an
activating state.

## Covered Cases

The matrix covers:

- unsupported setup versions;
- invalid public keys;
- duplicate adaptor nonce commitments;
- bad funding amounts;
- missing refund templates;
- unordered timelocks;
- wrong adaptor points;
- mutated sighash bindings;
- duplicate adaptor-signature purposes.

## Boundary

This suite is input hardening for deterministic local messages. It is not a
Byzantine network scheduler, peer-discovery protocol, encrypted transport, or
production wallet policy. It complements the schema, state-machine, funding,
adaptor-exchange, retention, process-isolation, and restart-recovery checks.

## Replay

Run:

```sh
npm run test:bilateral-malformed-counterparty
```

The replay emits:

```text
niti.l3_bilateral_malformed_counterparty_test.v1
```
