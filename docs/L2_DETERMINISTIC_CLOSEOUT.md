# Layer 2 Deterministic Closeout

This document records the deterministic/regtest-equivalent Layer 2
single-cDLC execution evidence.

It does not claim public testnet/signet broadcast, mempool relay, or miner
confirmation. Stronger public-network evidence is documented separately in the
public signet evidence bundle.

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

## Evidence Map

| Component | Evidence |
| --- | --- |
| Canonical scenario | [`L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md) defines the single parent-to-child activation path. |
| Parent funding | [`L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md) records the signed parent funding artifact. |
| Parent CET | [`L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md) records the parent CET and edge output. |
| Bridge transaction | [`L2_BRIDGE_HARNESS.md`](L2_BRIDGE_HARNESS.md) records the bridge and child funding output. |
| Bridge completion | [`L2_BRIDGE_ADAPTOR_COMPLETION.md`](L2_BRIDGE_ADAPTOR_COMPLETION.md) records parent scalar completion and wrong-scalar rejection. |
| Parent confirmation | [`L2_PARENT_CET_CONFIRMATION.md`](L2_PARENT_CET_CONFIRMATION.md) records deterministic parent CET confirmation. |
| Bridge confirmation | [`L2_BRIDGE_CONFIRMATION.md`](L2_BRIDGE_CONFIRMATION.md) records deterministic bridge confirmation. |
| Child prepared spends | [`L2_CHILD_PREPARED_SPENDS.md`](L2_CHILD_PREPARED_SPENDS.md) records child CET/refund prepared spends. |
| Timeout refund | [`L2_EDGE_REFUND_TIMEOUT.md`](L2_EDGE_REFUND_TIMEOUT.md) records timeout refund behavior. |
| Audit transcript | [`L2_E2E_TRANSCRIPT.md`](L2_E2E_TRANSCRIPT.md) records the redacted replayable audit transcript. |

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

## Public Network Gate

The deterministic closeout is distinct from public-network evidence. Public
testnet or signet evidence is sufficient only when another engineer can audit
named public-network or archived transaction artifacts without relying on
private context.

If the release scope requires public broadcast rather than deterministic
execution, the public-network evidence must be reviewed before the Layer 2
claim is treated as complete.

## Residual Risk

This closeout does not prove:

- public testnet/signet mempool relay or miner confirmation;
- fee bumping, CPFP, anchor policy, pinning resistance, or reorg handling;
- bilateral negotiation or state retention between two independent parties;
- production key custody or wallet safety;
- oracle source integrity, liveness, nonce operations, or audit history;
- full child oracle settlement;
- production Lightning semantics.

Those are later release gates, not part of the deterministic Layer 2 execution
claim.
