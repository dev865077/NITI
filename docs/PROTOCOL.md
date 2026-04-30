# Protocol Summary

Cascading Discreet Log Contracts are finite graphs of DLC transactions. Each
edge represents a conditional activation:

```text
(parent contract, outcome, child contract)
```

If the parent resolves to the chosen outcome, the oracle attestation scalar for
that outcome completes adaptor signatures on a bridge transaction. The bridge
transaction spends a parent outcome output and funds the child DLC.

Lazy cDLC preparation is the current scaling discipline. A graph does not need
to be fully materialized at genesis. For each live edge that is intended to
remain executable, the child funding path must be prepared before the parent
can resolve through that edge.

## Oracle Attestation

For event outcome `x`:

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG
```

`S_x` is public before the event. `s_x` is revealed only when the oracle attests.

## Bridge Adaptor Signature

For a bridge transaction message `m_e`, signer key `P_a = p_aG`, and adaptor
point `T_e = S_x`:

```text
R_a = r_aG
R*_a = R_a + T_e
e_a = H(R*_a || P_a || m_e)
ŝ_a = r_a + e_a p_a mod n
```

The adaptor verifies before completion:

```text
ŝ_aG = R*_a - T_e + e_aP_a
```

After `s_x` is published:

```text
s_a = ŝ_a + s_x mod n
```

Then `(R*_a, s_a)` is a valid Schnorr signature for the bridge transaction.

## Lazy Preparation

The activation equation is local to a prepared edge:

```text
S_x = s_xG
s_a = ŝ_a + s_x mod n
```

If bridge `B_e` is prepared with adaptor point `S_x`, publication of `s_x`
completes `B_e`. Publication of a different outcome scalar does not complete
that same bridge. This does not depend on unrelated future nodes being
prepared.

A Lazy window of depth `K` retains:

```text
C_i, C_{i+1}, ..., C_{i+K-1}
```

The minimum one-step continuation invariant is:

```text
before C_i can resolve through a live continuation edge,
the child funding path for that edge is already prepared.
```

For a non-recombining tree with branching factor `b`, the retained live nodes
are bounded by:

```text
LazyNodes(K) = 1 + b + b^2 + ... + b^(K-1)
```

instead of the full future tree:

```text
EagerNodes(D) = 1 + b + b^2 + ... + b^D.
```

This is a live-state bound. It does not prove indefinite liveness, fee safety,
economic solvency, or universal payoff compression.

## Lightning Extension

After the cDLC bridge construction is defined, the same parent outcome scalar
can also be used as a channel witness in a Lightning-style extension.

For HTLC-compatible channels, the oracle announcement must also commit to:

```text
h_x = H_pay(enc(s_x))
```

The Lightning witness is `enc(s_x)`, while the cDLC adaptor-completion scalar
remains `s_x`.

For point-locked channels, the ordinary DLC point is directly the lock:

```text
lock_x = S_x
witness = s_x
```

Point-locked routing can tweak each hop:

```text
T_{i-1} = T_i + d_iG
t_{i-1} = t_i + d_i mod n
```

so each upstream witness redeems its own upstream point.

## Graph Discipline

The first safe target is a finite acyclic graph. Cycles require update and
revocation logic and are outside the current scope.

Each edge should have a refund or timeout path in the full production protocol.
The current harnesses demonstrate single-path parent CET to bridge to child
funding activation, including Lazy `K = 2` public runs. They do not yet
implement a complete production bilateral DLC negotiation protocol.
