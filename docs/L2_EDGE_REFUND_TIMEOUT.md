# Layer 2 Edge Refund Timeout

This document records the negative refund/timelock artifact. It
models the case where the parent CET resolves but the bridge transaction is not
completed or broadcast before the bridge timeout.

In that failure mode, the parent CET edge output `O_e` is recovered by an
alternative timelocked refund spend.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Refund Input

The timeout refund consumes the parent CET edge output:

| Field | Value |
| --- | --- |
| Input txid | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |
| Input vout | `0` |
| Input value | `99000 sat` |
| Input script | `5120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d` |

This is the same output that the bridge would spend on the success path. The
refund is therefore an alternative path, not an additional spend.

## Refund Transaction

| Field | Value |
| --- | --- |
| Scenario | `bridge_not_completed_before_timeout` |
| Destination | `tb1p9fjtrm3nwhemkjek0wxtswz2glmneu33w9lcylrvd7alttk0psmqds9pcj` |
| Output value | `98500 sat` |
| Fee | `500 sat` |
| Locktime | `3000100` |
| Sequence | `4294967294` |
| Txid before witness | `faa93dde1d6d1b113c5283ff42cffdc9039f697e74f2487c567e4a7d2d3f7244` |
| Sighash | `0adb4d665ddad3d26414c739538e242c3e256a9146462b2642f61c6d975b436b` |
| Signature verifies | `true` |

The transcript records this at:

```text
parent.edgeTimeoutRefund
```

## Timelock Check

The refund uses an absolute block-height `nLockTime` with a non-final input
sequence. The deterministic finality model records:

```text
parent.edgeTimeoutRefund.timelockCheck.type = absolute-block-height
parent.edgeTimeoutRefund.timelockCheck.timeoutHeight = 3000100
parent.edgeTimeoutRefund.timelockCheck.earlyCandidateHeight = 3000100
parent.edgeTimeoutRefund.timelockCheck.earlySpendAccepted = false
parent.edgeTimeoutRefund.timelockCheck.matureCandidateHeight = 3000101
parent.edgeTimeoutRefund.timelockCheck.matureSpendAccepted = true
```

The mature candidate height is one block after the locktime boundary because
Bitcoin transaction finality treats a non-final-sequence height lock as final
when the transaction locktime is below the candidate block height.

## Required Checks

The timeout checks are:

```text
parent.edgeTimeoutRefund.input.txid = parent.cetCompletedTxid
parent.edgeTimeoutRefund.input.vout = 0
parent.edgeTimeoutRefund.signatureVerifies = true
parent.edgeTimeoutRefund.sequence < 4294967295
parent.edgeTimeoutRefund.timelockCheck.earlySpendAccepted = false
parent.edgeTimeoutRefund.timelockCheck.matureSpendAccepted = true
```

## Boundary

This artifact proves a deterministic negative path: if the bridge is not
completed before timeout, the parent edge output has a signed refund
transaction that is rejected before the locktime boundary and accepted after
the modeled maturity height. It does not prove fee-market inclusion,
transaction pinning resistance, public mempool relay, or reorg handling.
