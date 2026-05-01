# Lazy cDLC Status

Lazy cDLCs are the current scaling direction for NITI.

The base cDLC activation primitive is edge-local:

```text
S_x = s_xG
s = ŝ + s_x
```

If a bridge edge is prepared with adaptor point `S_x`, publication of the
matching oracle scalar `s_x` completes that bridge signature. A different
outcome scalar does not complete the same bridge. This statement does not
depend on unrelated future graph nodes being materialized.

## Compression Claim

Lazy preparation changes the retained-state burden. A non-recombining eager
tree with branching factor `b` and depth `D` may require retaining all reachable
future states:

```text
EagerNodes(D) = 1 + b + b^2 + ... + b^D.
```

A Lazy window of depth `K` retains only the active continuation window:

```text
LazyNodes(K) = 1 + b + b^2 + ... + b^(K-1).
```

For fixed `K`, live retained state is independent of total product depth `D`.
The lifetime work may still scale with the number of periods actually
traversed, and recombining financial states may scale differently. Lazy cDLCs
therefore compress maximum live state, not every cost of every product.

Per-node payoff compression remains orthogonal and product-dependent. The
repository does not claim universal logarithmic compression for all outcomes.

## What Is Proven

The SPARK/Ada Lazy proof suite models:

- finite-window preparation;
- edge-local activation independence;
- window sliding and fallback selection;
- non-recombining tree retained-state bounds;
- recombining-state bounds;
- per-node compression composition;
- liveness timing gates and fallback behavior;
- BTC loan rollover specialization.

These targets are documented in
[`SPARK_TARGET_INVENTORY.md`](SPARK_TARGET_INVENTORY.md) and
[`../spark/README.md`](../spark/README.md). They prove modeled finite
properties and use no `pragma Assume` in the proof sources.

The proof boundary remains narrow. The models do not prove secp256k1,
SHA-256, Bitcoin serialization, mempool relay, wallet security, economic
solvency, legal enforceability, or a production bilateral negotiation
protocol.

## What Is Demonstrated

Committed public evidence now includes Lazy `K = 2` activation runs on:

| Network | Evidence |
| --- | --- |
| Signet | [`docs/evidence/lazy-public-signet/`](evidence/lazy-public-signet/) |
| Testnet | [`docs/evidence/lazy-public-testnet/`](evidence/lazy-public-testnet/) |
| Signet with bilateral holder activation | [`docs/evidence/lazy-bilateral-public-signet/`](evidence/lazy-bilateral-public-signet/) |
| Testnet with bilateral holder activation | [`docs/evidence/lazy-bilateral-public-testnet/`](evidence/lazy-bilateral-public-testnet/) |
| Mainnet | [`docs/evidence/lazy-public-mainnet/`](evidence/lazy-public-mainnet/) |

The mainnet run is dust-sized and demonstrates mechanical activation only. It
is not production custody software and not a financial product release.

The bilateral holder bundles record the same Lazy activation path with
additional holder evidence: Alice, Bob, and a watchtower copy of the prepared
edge package each complete the same bridge transaction after oracle
attestation. The wrong outcome scalar and missing package paths fail closed.

## Remaining Work

Lazy cDLCs move the main engineering burden from full upfront graph
materialization into a bounded-window protocol. Remaining work includes:

- bilateral negotiation and state synchronization;
- production oracle announcements, nonce operations, and attestation history;
- timeout, reorg, package relay, CPFP/RBF, and pinning policy;
- backup and recovery for retained Lazy window state;
- historical and adversarial economic stress tests;
- wallet UX and external review.

## Correct Short Claim

Lazy cDLCs show that cDLC composability can be compressed at the live-state
level because activation safety is local to a prepared edge. They do not yet
constitute a complete production protocol for financial products.
