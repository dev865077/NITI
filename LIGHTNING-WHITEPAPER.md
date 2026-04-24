# Lightning Composable Discreet Log Contracts

## Abstract

This paper describes a construction for carrying composable Discreet Log
Contract edges inside Lightning-style payment channels. The construction uses
the same oracle attestation scalar that activates an on-chain cDLC bridge, but
represents the edge as a conditional channel update instead of a new on-chain
transaction.

For current hash-locked Lightning channels, the oracle must commit in advance
to the payment hash of each possible attestation scalar:

```text
h_x = H_pay(enc(s_x)).
```

When the oracle later publishes `s_x`, the encoded scalar `enc(s_x)` is the
Lightning HTLC preimage and the same scalar completes the cDLC adaptor
signatures. For point-locked channels, the construction is more direct: the
ordinary DLC attestation point

```text
S_x = s_xG
```

is the payment point, and `s_x` is the settlement witness.

The result is not a claim that every current Lightning implementation already
supports the full protocol. The result is a mathematical statement: the cDLC
activation secret and the Lightning settlement witness can be the same scalar.
Current HTLC Lightning can express this with an additional oracle hash
commitment. Future point-locked channels can express it natively.

## 1. Notation

Let `G` be the generator of the secp256k1 group of order `n`. Lowercase letters
are scalars modulo `n`; uppercase letters are curve points. For a scalar `x`,
`X = xG`. Let `H_chal` be the Schnorr challenge hash interpreted as a scalar
modulo `n`. Let `H_pay` be a 256-bit payment hash, modeled as SHA256 over a
fixed scalar encoding.

For a scalar `s`, define

```text
enc(s)
```

as its fixed 32-byte encoding. The exact byte order is a protocol parameter and
must be fixed before negotiation. All equations below assume one canonical
encoding.

A BIP340 Schnorr signature for message `m` under public key `P = pG` is a pair
`(R, s)` satisfying

```text
sG = R + H_chal(R || P || m)P.
```

An oracle has signing key `v`, public key `V = vG`, and commits to a one-time
nonce point

```text
R_o = r_oG.
```

For outcome `x`, define

```text
e_x = H_chal(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_x V.
```

Before the event, every party can compute `S_x`. Only the oracle knows `s_x`.
After the event, the oracle attests by publishing `s_x`.

## 2. Lightning Conditions

A Lightning channel can be viewed abstractly as a state machine:

```text
Q = (A, B, P)
```

where `A` and `B` are balances and `P` is the set of pending conditional
transfers. For a pending transfer

```text
L = (amount, lock, expiry)
```

define a redemption predicate:

```text
redeem(lock, w) in {true, false}.
```

If `redeem(lock, w) = true` before expiry, the channel applies:

```text
A' = A - amount
B' = B + amount
P' = P \ {L}.
```

If the lock is not redeemed before expiry, the transfer is removed without
paying the receiver:

```text
A' = A
B' = B
P' = P \ {L}.
```

The channel conserves capacity in both cases:

```text
A + B = A' + B'.
```

This abstraction covers the property needed for a Lightning cDLC edge: value
can move inside a channel only if a specific witness is revealed before a
deadline.

## 3. HTLC Encoding

Current Lightning payment invoices and HTLC updates are hash-locked. A payment
hash is a 256-bit hash of a payment preimage. In this paper the cDLC witness is
the oracle scalar itself, encoded as 32 bytes.

For each possible oracle outcome `x`, define:

```text
w_x = enc(s_x)
h_x = H_pay(w_x).
```

The HTLC lock is:

```text
lock_x = h_x.
```

The redemption predicate is:

```text
redeem_HTLC(h_x, w) = true iff H_pay(w) = h_x.
```

### 3.1 Oracle Announcement Extension

The ordinary DLC announcement makes `S_x` public and verifiable:

```text
S_x = R_o + H_chal(R_o || V || x)V.
```

An HTLC cDLC additionally requires the oracle to commit to:

```text
h_x = H_pay(enc(s_x)).
```

A minimal announcement signs:

```text
event_id || R_o || V || root({x, S_x, h_x, expiry_x})
```

where `root` can be a flat hash for a small outcome set or a Merkle root for a
large outcome set.

Unlike `S_x`, the relation between `h_x` and `s_x` cannot be verified before
attestation without revealing `s_x`. This is not a theft vector by itself, but
it is a liveness dependency: if the oracle commits to a wrong `h_x`, the HTLC
edge will fail and must refund by timeout.

### 3.2 HTLC Settlement Claim

**Claim 1: HTLC settlement after oracle resolution.**

If the oracle publishes `s_x` and the HTLC lock is

```text
h_x = H_pay(enc(s_x)),
```

then the HTLC is redeemable by witness `enc(s_x)`.

Proof. By definition:

```text
redeem_HTLC(h_x, w) = true iff H_pay(w) = h_x.
```

Substitute `w = enc(s_x)`:

```text
H_pay(enc(s_x)) = h_x.
```

This holds by construction.

### 3.3 Wrong Outcome Isolation

**Claim 2: A different oracle outcome does not redeem the HTLC edge.**

Let `y != x`. If

```text
H_pay(enc(s_y)) != H_pay(enc(s_x)),
```

then `enc(s_y)` does not redeem the HTLC locked to `h_x`.

Proof. The HTLC accepts `enc(s_y)` only if:

```text
H_pay(enc(s_y)) = h_x.
```

Since `h_x = H_pay(enc(s_x))`, this would require:

```text
H_pay(enc(s_y)) = H_pay(enc(s_x)).
```

That contradicts the premise. In production, the premise is the standard
collision and second-preimage resistance assumption used by hash-locked
payments.

## 4. Same Scalar, Two Effects

The parent cDLC edge uses the oracle scalar in two independent ways:

```text
1. enc(s_x) redeems the Lightning HTLC.
2. s_x completes adaptor signatures for the child activation.
```

Let a cDLC adaptor signature for message `m` under key `P = pG` have adaptor
point:

```text
T = S_x = s_xG.
```

The signer chooses nonce `r`:

```text
R = rG
R* = R + S_x
e = H_chal(R* || P || m)
s_hat = r + ep mod n.
```

The adaptor verifies before attestation:

```text
s_hat G = R* - S_x + eP.
```

After the oracle publishes `s_x`, compute:

```text
s = s_hat + s_x mod n.
```

Then:

```text
sG = (s_hat + s_x)G
   = (R* - S_x + eP) + S_x
   = R* + eP.
```

Thus `(R*, s)` is a valid Schnorr signature.

**Claim 3: HTLC settlement and adaptor completion are synchronized.**

If the channel edge is locked to `h_x = H_pay(enc(s_x))` and the cDLC adaptor
point is `S_x = s_xG`, then publication of `s_x` both redeems the HTLC and
completes the adaptor signature.

Proof. HTLC redemption follows from Claim 1. Adaptor completion follows from
the equation above. Both use the same scalar `s_x`.

## 5. Routed HTLC cDLCs

Consider a route of channel peers:

```text
N_0 -> N_1 -> ... -> N_k.
```

Every hop uses the same hash lock:

```text
h_x = H_pay(enc(s_x)).
```

Each hop `i` has a pending HTLC:

```text
L_i = (amount_i, h_x, expiry_i).
```

The expiries must satisfy the ordinary Lightning ordering discipline:

```text
expiry_0 > expiry_1 > ... > expiry_k.
```

When the final receiver obtains `enc(s_x)`, it fulfills `L_{k-1}`. Each
intermediate node that learns the preimage from its downstream channel can use
the same preimage to fulfill its upstream channel.

**Claim 4: Routed HTLC atomicity.**

Assume every honest intermediate node has enough time to claim upstream after
learning `enc(s_x)` downstream. Then a revealed `enc(s_x)` propagates settlement
back through the route; without `enc(s_x)`, the route times out.

Proof. For every hop, the redemption predicate is identical:

```text
redeem_HTLC(h_x, enc(s_x)) = true.
```

Therefore each node that learns `enc(s_x)` from its outgoing channel has the
exact witness needed for its incoming channel. If the witness is not revealed,
no hop can satisfy `H_pay(w) = h_x` except by finding a preimage or collision,
so the timeout branch remains the only valid branch.

This is precisely why HTLC cDLCs require careful timeout selection. The algebra
gives the same witness to every hop; the channel protocol must give every hop
time to use it.

## 6. Point-Locked Encoding

The HTLC construction needs the extra oracle hash commitment `h_x`. A
point-locked channel does not.

A point-locked transfer uses:

```text
lock_x = S_x
witness = s_x
```

with redemption predicate:

```text
redeem_PTLC(S_x, s) = true iff sG = S_x.
```

Since the ordinary DLC announcement already gives:

```text
S_x = R_o + H_chal(R_o || V || x)V = s_xG,
```

the cDLC point is directly usable as the channel payment point.

**Claim 5: PTLC settlement after oracle resolution.**

If a point-locked transfer is locked to `S_x`, then oracle publication of `s_x`
redeems it.

Proof.

```text
s_xG = S_x
```

by the oracle attestation equation. Therefore

```text
redeem_PTLC(S_x, s_x) = true.
```

**Claim 6: PTLC outcome isolation.**

If `s_yG != S_x`, then outcome `y` does not redeem the point lock for outcome
`x`.

Proof. The point lock accepts `s_y` only if:

```text
s_yG = S_x.
```

This contradicts the premise. In the prime-order group, equality
`s_yG = s_xG` implies `s_y = s_x mod n`; therefore a wrong outcome scalar
cannot redeem the edge except by oracle equivocation or a collision in the
oracle outcome construction.

## 7. Routed Point-Locked cDLCs

Point locks allow each hop to see a different point while preserving the same
final oracle witness.

Let the receiver's point be:

```text
T_k = S_x.
```

For hop `i`, choose a private scalar tweak `d_i` and define the upstream point:

```text
T_{i-1} = T_i + d_iG.
```

If downstream settlement reveals `t_i` such that:

```text
t_iG = T_i,
```

then the upstream witness is:

```text
t_{i-1} = t_i + d_i mod n.
```

**Claim 7: Point-lock route tweak correctness.**

The upstream witness `t_{i-1}` redeems the upstream point `T_{i-1}`.

Proof.

```text
t_{i-1}G
= (t_i + d_i)G
= t_iG + d_iG
= T_i + d_iG
= T_{i-1}.
```

Thus each hop can use the scalar learned downstream to derive the scalar needed
upstream, while each channel sees a distinct point lock.

## 8. Channel-Resident cDLC Graphs

An on-chain cDLC edge has the form:

```text
C_i resolves to x
=> s_{i,x} is revealed
=> bridge B_e can be signed
=> child funding output F_j is created.
```

A Lightning cDLC edge replaces the bridge transaction with a conditional
channel update:

```text
C_i resolves to x
=> s_{i,x} is revealed
=> channel condition L_e settles
=> child state C_j is activated.
```

Let:

```text
prepared(C_j) in {true, false}
```

mean that the child contract state, refund policy, adaptor signatures, and
timeout rules were negotiated before parent resolution.

Define:

```text
activate(C_j, L_e, w) =
  prepared(C_j) AND redeem(lock_e, w).
```

For HTLC mode:

```text
lock_e = H_pay(enc(s_{i,x}))
w = enc(s_{i,x})
```

For point-lock mode:

```text
lock_e = S_{i,x}
w = s_{i,x}
```

**Claim 8: Conditional child activation.**

If the parent contract resolves to outcome `x`, the oracle publishes
`s_{i,x}`, and `prepared(C_j) = true`, then the Lightning edge activates
`C_j`.

Proof. In HTLC mode, Claim 1 gives `redeem(lock_e, enc(s_{i,x})) = true`. In
point-lock mode, Claim 5 gives `redeem(lock_e, s_{i,x}) = true`. Therefore
`activate(C_j, L_e, w) = true`.

**Claim 9: Wrong outcome non-activation.**

If the parent resolves to `y != x`, then the edge for `(C_i, x, C_j)` does not
activate, except by hash failure, oracle equivocation, or discrete-log failure.

Proof. HTLC mode follows from Claim 2. Point-lock mode follows from Claim 6.
The adaptor signatures for the child edge also remain incomplete by the normal
cDLC adaptor argument:

```text
(s_hat + s_y)G = R* - S_x + eP + S_y,
```

which equals `R* + eP` only if `S_y = S_x`.

## 9. Refunds and Failure Modes

Lightning cDLCs do not remove the need for refund discipline. They move that
discipline from a bridge transaction into channel expiries and channel recovery.

The construction assumes:

```text
1. The oracle does not sign conflicting outcomes for the same nonce.
2. The oracle eventually publishes the attestation before channel expiry.
3. The oracle's HTLC hash commitments match its later scalar attestations.
4. Parties retain the prepared child state and adaptor signatures.
5. Expiries are ordered so downstream settlement can be claimed upstream.
6. Force-close and watchtower policies protect channel state.
7. Liquidity is available for every channel edge in the route.
```

Failure modes:

```text
oracle never attests
=> HTLC/PTLC expires
=> channel funds return by timeout

oracle commits to wrong h_x in HTLC mode
=> published s_x does not redeem the HTLC
=> channel funds return by timeout
=> oracle fault is publicly checkable after attestation

oracle signs multiple outcomes
=> multiple cDLC branches may become executable
=> equivocation evidence is the pair of conflicting signatures

party loses prepared child state
=> scalar may be public but child activation data is unavailable
=> funds follow fallback channel or contract policy
```

The HTLC version inherits a privacy cost: every hop sees the same payment hash
`h_x`. The point-locked version can avoid this by using per-hop point tweaks,
but it requires point-lock support rather than ordinary current HTLC behavior.

## 10. Security Summary

The Lightning construction has the same core security boundary as the on-chain
cDLC construction.

Before oracle resolution:

```text
s_x is unknown.
enc(s_x) is unknown.
```

Therefore:

```text
HTLC edge cannot be redeemed without a hash preimage.
Point-locked edge cannot be redeemed without the discrete log of S_x.
Adaptor signatures cannot be completed without s_x.
```

After oracle resolution:

```text
s_x is public.
enc(s_x) is public.
```

Therefore:

```text
HTLC edge can be fulfilled.
Point-locked edge can be fulfilled.
Adaptor signatures can be completed.
Child cDLC state can be activated.
```

The single reusable fact is still:

```text
s_xG = S_x.
```

Lightning changes the transport of the conditional value transfer. It does not
change the cDLC activation algebra.

## 11. Conclusion

A cDLC edge is activated by a scalar that is unknowable before an oracle event
and public after that event. Lightning channel conditions are also activated by
witnesses: current HTLCs use preimages, and point-locked channels use scalars.

The HTLC construction binds the oracle scalar to a payment hash:

```text
h_x = H_pay(enc(s_x)).
```

The point-lock construction uses the ordinary DLC point directly:

```text
S_x = s_xG.
```

In both cases, the oracle attestation scalar is the bridge between the cDLC
graph and the Lightning channel state. The same event witness settles the
channel condition and completes the adaptor signatures that activate the child
contract.

Thus the cDLC construction can be lifted from an on-chain transaction graph to a
channel-resident graph without changing the core equation:

```text
S_x = R_o + H_chal(R_o || V || x)V
s_xG = S_x
s = s_hat + s_x mod n.
```

## References

1. Thaddeus Dryja, "Discreet Log Contracts", MIT Digital Currency Initiative:
   https://adiabat.github.io/dlc.pdf
2. BIP340, "Schnorr Signatures for secp256k1":
   https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
3. Lightning BOLT #2, "Peer Protocol for Channel Management":
   https://github.com/lightning/bolts/blob/master/02-peer-protocol.md
4. Lightning BOLT #3, "Bitcoin Transaction and Script Formats":
   https://github.com/lightning/bolts/blob/master/03-transactions.md
5. Lightning BOLT #11, "Invoice Protocol for Lightning Payments":
   https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
6. Discreet Log Contract interoperability specifications:
   https://github.com/discreetlogcontracts/dlcspecs
