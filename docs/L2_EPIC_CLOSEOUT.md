# Layer 2 Deterministic Closeout

This document records the deterministic/regtest-equivalent Layer 2
single-cDLC execution evidence tracked under issue #56.

It does not claim public testnet/signet broadcast, mempool relay, or miner
confirmation. That stronger public-network evidence remains gated by issue
#132.

## Scope Completed

The Layer 2 path now has a replayable deterministic transcript for one
single-parent/single-child cDLC:

```text
parent funding
  -> parent CET for the selected outcome
  -> bridge transaction completed by the parent oracle scalar
  -> child funding output
  -> prepared child CET/refund spends
```

It also has a negative path:

```text
parent CET edge output
  -> bridge not completed before timeout
  -> parent edge timeout refund rejected before maturity
  -> parent edge timeout refund accepted after maturity
```

## Child Issue Status

| Issue | Evidence |
| --- | --- |
| #66 | [`L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md) defines the canonical scenario. |
| #67 | [`L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md) records the signed parent funding artifact. |
| #68 | [`L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md) records the parent CET and edge output. |
| #69 | [`L2_BRIDGE_HARNESS.md`](L2_BRIDGE_HARNESS.md) records the bridge and child funding output. |
| #70 | [`L2_BRIDGE_ADAPTOR_COMPLETION.md`](L2_BRIDGE_ADAPTOR_COMPLETION.md) records parent scalar completion and wrong-scalar rejection. |
| #71 | [`L2_PARENT_CET_CONFIRMATION.md`](L2_PARENT_CET_CONFIRMATION.md) records deterministic parent CET confirmation. |
| #72 | [`L2_BRIDGE_CONFIRMATION.md`](L2_BRIDGE_CONFIRMATION.md) records deterministic bridge confirmation. |
| #73 | [`L2_CHILD_PREPARED_SPENDS.md`](L2_CHILD_PREPARED_SPENDS.md) records child CET/refund prepared spends. |
| #74 | [`L2_EDGE_REFUND_TIMEOUT.md`](L2_EDGE_REFUND_TIMEOUT.md) records timeout refund behavior. |
| #75 | [`L2_E2E_TRANSCRIPT.md`](L2_E2E_TRANSCRIPT.md) records the redacted replayable audit transcript. |

## Replay Command

From a fresh clone with the documented toolchain:

```sh
npm ci
npm run v0.1:verify -- --artifacts-dir testnet/artifacts/replay-l2-e2e
jq -e '.checks | all(. == true)' testnet/artifacts/replay-l2-e2e/l2-e2e-transcript.json
```

The final command must print:

```text
true
```

## Exact Claim

Layer 2 now supports this bounded deterministic claim:

> Under the documented assumptions, the deterministic v0.1 harness constructs
> a parent funding output, completes the selected parent CET with the parent
> oracle scalar, uses the same scalar to complete the bridge adaptor signature,
> creates an unspent child funding output, prepares child CET/refund spends
> from that output, rejects a wrong parent outcome scalar, and demonstrates an
> alternative parent-edge timeout refund path.

## Live Testnet Gate

Issue #132 is the live testnet/signet transaction evidence bundle. It should
remain open until another engineer can audit named public-network or archived
signet/testnet transaction artifacts without relying on private context.

If issue #56 is interpreted as requiring public broadcast rather than accepting
the deterministic fallback in its written scope, then issue #56 should also
remain open until #132 is complete.

## Residual Risk

This closeout does not prove:

- public testnet/signet mempool relay or miner confirmation;
- fee bumping, CPFP, anchor policy, pinning resistance, or reorg handling;
- bilateral negotiation or state retention between two independent parties;
- production key custody or wallet safety;
- oracle source integrity, liveness, nonce operations, or audit history;
- full child oracle settlement;
- production Lightning semantics.

Those are later release gates, not part of the Layer 2 deterministic execution
epic.
