# Layer 3 Bilateral Funding Validation

This document defines the deterministic funding validation used by the Layer 3
setup harness. Funding validation happens after role announcements and before
transaction templates or adaptor points are accepted.

## Accepted Funding Data

The funding message is accepted only when:

- Alice and Bob have both announced role material;
- Alice and Bob both provide funding inputs;
- each funding script matches the funding script in that participant's role
  announcement;
- no outpoint is duplicated;
- every value is above the conservative Taproot dust floor used by the harness;
- every value satisfies the deterministic fee reserve for the canonical
  scenario;
- the funding message appears before adaptor-point exchange.

The harness derives a canonical funding digest from the funding input list.
Both participant views must observe the same digest before later setup steps
can rely on the funding data.

## Rejection Matrix

The replay rejects:

- missing participant funding;
- duplicate outpoints;
- scripts that do not match role announcements;
- values below dust;
- values below the deterministic fee reserve;
- funding messages placed after adaptor exchange.

These checks are fixture-level protocol checks. They do not implement coin
selection, mempool policy, wallet ownership proofs, or external UTXO lookup.

## Replay

Run:

```sh
npm run test:bilateral-funding-validation
```

The replay emits:

```text
niti.l3_bilateral_funding_validation_test.v1
```
