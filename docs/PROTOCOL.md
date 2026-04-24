# Protocol Summary

Composable Discreet Log Contracts are finite graphs of DLC transactions. Each
edge represents a conditional activation:

```text
(parent contract, outcome, child contract)
```

If the parent resolves to the chosen outcome, the oracle attestation scalar for
that outcome completes adaptor signatures on a bridge transaction. The bridge
transaction spends a parent outcome output and funds the child DLC.

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

## Graph Discipline

The first safe target is a finite acyclic graph. Cycles require update and
revocation logic and are outside the current scope.

Each edge should have a refund or timeout path in the full production protocol.
The current testnet harness validates graph discipline but does not yet build a
complete multi-transaction DLC graph.

## Lightning cDLC Encoding

A cDLC edge can also be carried by a Lightning channel condition. The parent
outcome scalar remains the witness:

```text
witness = s_x
```

For current HTLC Lightning, the oracle announcement must additionally commit to
the payment hash:

```text
h_x = H_pay(s_x)
```

The channel condition is redeemed when the oracle publishes `s_x`:

```text
H_pay(s_x) = h_x
```

For PTLC Lightning, the normal DLC point is already the lock:

```text
T_x = S_x = s_xG
```

The same oracle scalar can then settle the Lightning condition and complete the
cDLC adaptor signature that activates the child edge. See
[`LIGHTNING-WHITEPAPER.md`](../LIGHTNING-WHITEPAPER.md) and the SPARK model in
[`spark/src/lightning_cdlc_algebra.ads`](../spark/src/lightning_cdlc_algebra.ads).
