# Layer 2 Child Prepared Spends

This document records the child DLC prepared-spend artifact. It
shows that the child funding output `F_j` created by the bridge is accepted by
two child-state spends:

1. a child CET adaptor spend, incomplete until the child oracle attests; and
2. a timelocked child refund key spend, signed and ready for the refund path.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Child Funding Input

Both prepared child spends consume the bridge output:

| Field | Value |
| --- | --- |
| Child funding txid | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Child funding vout | `0` |
| Child funding value | `98500 sat` |
| Child funding script | `5120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b` |

The transcript records the same funding outpoint at:

```text
child.preparedCet.input
child.preparedRefund.input
```

## Child Oracle Condition

The child CET uses a child oracle event independent from the parent oracle
event:

| Field | Value |
| --- | --- |
| Child event id | `niti-v0.1-child-cdlc-smoke` |
| Child activating outcome | `CHILD_SETTLEMENT_READY` |
| Child nonce point | `028985087b1818714f67e494a076ca0284c060fabc5d2ba66885b4ac60f801d3f5` |
| Child oracle public key | `021617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b` |
| Child attestation point | `03324002d204506cbec89b376a0069e96a6bd3789b56ac3c78ab846b89f7f506f9` |

## Prepared Child CET

The prepared child CET is an adaptor spend from `F_j` to the settlement
destination:

| Field | Value |
| --- | --- |
| Destination | `tb1p9fjtrm3nwhemkjek0wxtswz2glmneu33w9lcylrvd7alttk0psmqds9pcj` |
| Send value | `98000 sat` |
| Fee | `500 sat` |
| Unsigned txid | `5d01d123367e84710d7912caa9ea09b0708f70bacce291bf079c58ae9217ae98` |
| Sighash | `b4f600df082f3a77f4d6b2374778829856e3fcbb7f3f4f203abfc191d2fea036` |
| Adaptor point | `03324002d204506cbec89b376a0069e96a6bd3789b56ac3c78ab846b89f7f506f9` |
| Adaptor verifies | `true` |
| Pre-resolution signature verifies | `false` |

The child CET is intentionally not completed in this artifact. Completion
requires the child oracle scalar, which is outside this prepared-spend evidence
boundary.

## Prepared Child Refund

The prepared refund is a signed Taproot key-path spend from `F_j` back to the
child funding signer. It is timelocked by `nLockTime` and non-final input
sequence:

| Field | Value |
| --- | --- |
| Destination | `tb1plr5908qjdayaa5ehcxwy7hcur9glqafpvtt2v8c2nc24s4v5899seky47r` |
| Send value | `98000 sat` |
| Fee | `500 sat` |
| Locktime | `3000300` |
| Sequence | `4294967294` |
| Txid before witness | `f2ef987793adbece1b2d0580785a02b5f0909e565321b0585c1753179dc4fa1d` |
| Sighash | `7aa7d51bddc9ea6fbb5133a4ea1b5b602fb60dcb5c01344d2ebc52ed4c9a2dc6` |
| Signature verifies | `true` |

## Required Checks

The smoke transcript records:

```text
child.preparedSpendChecks.cetSpendsChildFunding = true
child.preparedSpendChecks.refundSpendsChildFunding = true
child.preparedSpendChecks.cetAdaptorVerifies = true
child.preparedSpendChecks.cetPreResolutionSignatureVerifies = false
child.preparedSpendChecks.refundSignatureVerifies = true
child.preparedSpendChecks.refundIsTimelocked = true
```

These checks mean `F_j` is usable as a child DLC funding output, not merely
visible in the completed bridge transaction.

## Boundary

This artifact proves that the deterministic child funding output is accepted
by prepared child CET and refund spends with expected sighashes. It does not
prove child oracle settlement, broadcast of the child CET, public relay,
fee-bumping, reorg handling, or the negative refund/timelock path documented
separately.
