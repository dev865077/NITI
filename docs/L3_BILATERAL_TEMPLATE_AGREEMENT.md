# Layer 3 Bilateral Template Agreement

This document defines the deterministic template-agreement check used by the
Layer 3 harness. The purpose is to ensure both participants agree on the same
transaction skeleton before adaptor signatures are accepted.

## Canonical Fields

The template digest covers:

- parent funding outpoint, value, and script;
- parent CET unsigned txid, sighash, fee, input role, output role, output value,
  output script, and adaptor point;
- bridge unsigned txid, sighash, fee, input role, output role, output value,
  output script, and adaptor point;
- child funding output;
- prepared child CET sighash and output;
- edge timeout refund locktime, sequence, fee, input, output, and sighash;
- child timeout refund locktime, sequence, fee, input, output, and sighash;
- timelock ordering.

The digest is computed over canonical JSON. Alice and Bob independently derive
the same canonical object and compare the digest before adaptor exchange.

## Rejection Rule

Any critical template change is rejected before adaptor acceptance. The harness
currently checks mutations for:

- wrong parent txid;
- wrong parent vout;
- wrong amount;
- wrong script;
- wrong fee;
- wrong locktime;
- wrong adaptor sighash;
- swapped output role.

Each mutation must change the canonical template digest and produce a
deterministic rejection reason.

## Boundary

Template agreement is stronger than message-shape validation and weaker than a
complete production DLC negotiation protocol. It proves that the fixture
participants agree on the concrete transaction identifiers, fees, outputs,
timelocks, and sighashes used by this harness. It does not implement coin
selection, authenticated network transport, fee estimation, wallet policy, or
production backup.

## Replay

Run:

```sh
npm run test:bilateral-template-agreement
```

The replay emits:

```text
niti.l3_bilateral_template_agreement_test.v1
```
