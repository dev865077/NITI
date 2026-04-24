# Composable Discreet Log Contracts

## Abstract

This paper describes a construction for composable Discreet Log Contracts, or
cDLCs. A cDLC is a finite graph of ordinary Bitcoin transactions in which the
attestation secret revealed by the oracle of one DLC completes adaptor
signatures that activate another DLC. The construction requires no new opcode,
no covenant, and no on-chain awareness of the contract graph.

Composition is obtained by using the future oracle signature of a parent
contract as the hidden scalar of adaptor signatures that spend a parent outcome
output into the funding output of a child contract.

The construction is native to Bitcoin in the same sense as a DLC is native to
Bitcoin: the blockchain validates only ordinary signatures and timelocks, while
the contract semantics are kept off-chain by pre-signed transactions and oracle
attestations.

## 1. Notation

Let `G` be the generator of the secp256k1 group of order `n`. Lowercase letters
are scalars modulo `n`; uppercase letters are curve points. For a scalar `x`,
`X = xG`. Let `H` be a tagged hash interpreted as a scalar modulo `n`.

A BIP340 Schnorr signature for message `m` under public key `P = pG` is a pair
`(R, s)` satisfying

```text
sG = R + H(R || P || m)P.
```

An oracle has signing key `v`, public key `V = vG`, and commits to a one-time
nonce point

```text
R_o = r_oG
```

for an event. For outcome `x`, define

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_x V.
```

Before the event, everyone can compute `S_x` for each possible outcome `x`, but
nobody except the oracle knows `s_x`. After the event, the oracle attests by
publishing `s_x`. The scalar `s_x` is the transferable fact that makes DLCs
possible.

## 2. Signature Adaptors

Let `T = tG` be a public point whose discrete logarithm `t` is unknown. To
create an adaptor signature for message `m` under key `P = pG`, the signer
chooses nonce `r`, computes

```text
R = rG
R* = R + T
e = H(R* || P || m)
s_hat = r + ep mod n.
```

The adaptor is `(R*, T, s_hat)`. It can be checked without knowing `t`:

```text
s_hat G = R* - T + eP.
```

It is not yet a valid Schnorr signature. If `t` is later revealed, anyone
holding the adaptor can compute

```text
s = s_hat + t mod n.
```

Then `(R*, s)` is valid because

```text
sG = (s_hat + t)G
   = (R* - T + eP) + T
   = R* + eP.
```

Conversely, a completed signature reveals the hidden scalar to anyone who knows
the adaptor:

```text
t = s - s_hat mod n.
```

## 3. A DLC as a Conditional Signature Source

In a regular DLC, Alice and Bob lock funds into a funding output and prepare a
set of Contract Execution Transactions, or CETs. Each CET corresponds to an
outcome `x` and pays according to a payout function `pi(x)`.

For each outcome `x`, the parties use the oracle attestation point `S_x` as the
adaptor point for the CET signatures. The CET for `x` cannot be completed until
the oracle publishes `s_x`. Once `s_x` is published, the CET for `x` becomes
executable.

Thus a DLC does more than choose a payout. It also emits a scalar:

```text
resolve(DLC, x) -> s_x.
```

This scalar is public after resolution, unpredictable before resolution, and
bound to a specific oracle event and outcome. A cDLC uses this scalar as the
activation secret for another transaction.

## 4. cDLC Construction

A cDLC is a finite directed graph

```text
Gamma = (N, E)
```

where each node `C_i in N` is a DLC and each directed edge

```text
e = (C_i, x, C_j)
```

means: if contract `C_i` resolves to outcome `x`, activate contract `C_j`.

For each edge `e = (C_i, x, C_j)`, the parties construct a bridge transaction
`B_e`. This transaction spends a designated output of the parent CET
`CET_{i,x}` and creates the funding output of the child DLC `C_j`.

The parent CET contains an edge output `O_e`. That output is spendable by
signatures from the required cDLC participants, with a timelocked refund path.
The bridge transaction `B_e` spends `O_e` into the child funding output `F_j`.

The child contract `C_j` is negotiated before the parent resolves. Its CETs and
refund transaction spend the funding output created by `B_e`. This is possible
because the `txid` of `B_e` is known before its witness signatures are
completed.

All signatures required by `B_e` are adaptor signatures using

```text
T_e = S_{i,x}.
```

For participant `a` with key `P_a = p_aG`, let `m_e` be the sighash message for
`B_e`. The participant creates

```text
R_a = r_aG
R*_a = R_a + S_{i,x}
e_a = H(R*_a || P_a || m_e)
s_hat_a = r_a + e_a p_a mod n.
```

The adaptor verifies as

```text
s_hat_a G = R*_a - S_{i,x} + e_aP_a.
```

If the oracle later publishes `s_{i,x}`, anyone holding the adaptor signatures
can compute

```text
s_a = s_hat_a + s_{i,x} mod n
```

for every required signer `a`. The resulting signatures satisfy

```text
s_aG = R*_a + e_aP_a,
```

so `B_e` becomes a valid Bitcoin transaction.

If the parent resolves to a different outcome `y`, the oracle publishes
`s_{i,y}`, not `s_{i,x}`. Under the discrete logarithm assumption and Schnorr
unforgeability, the signatures for `B_e` remain incomplete.

## 5. Native Chaining

The bridge transaction spends an output of a future CET. This is possible
because the transaction id of a SegWit or Taproot transaction does not include
witness data. The parent CET can be fully specified before its witness
signatures are completed, so its `txid` and output index are known before the
oracle attests.

Therefore the bridge and the child DLC can be constructed before the parent CET
is broadcast:

```text
Funding_i -> CET_{i,x} -> B_e -> Funding_j.
```

The signatures for `B_e` are incomplete until the parent outcome is attested.
The child CETs are also incomplete until the child oracle attests. The
composition is a pre-signed transaction graph whose edges are unlocked by
oracle scalars.

Bitcoin sees only valid transactions and signatures. The chain of meaning is
off-chain:

```text
oracle signs x
=> s_{i,x} is revealed
=> CET_{i,x} becomes executable
=> bridge B_e signatures become completable
=> child DLC C_j becomes funded.
```

## 6. Security Claims

### Claim 1: Conditional Activation

For an edge `e = (C_i, x, C_j)`, the child bridge `B_e` cannot be completed
before `s_{i,x}` is known, except by forging a Schnorr signature or solving the
discrete logarithm of `S_{i,x}`.

Proof. Each required signature on `B_e` is an adaptor signature with adaptor
point `S_{i,x}`. A valid completed signature is

```text
s_a = s_hat_a + s_{i,x}.
```

Without `s_{i,x}`, completing the signature requires producing a valid Schnorr
signature for `m_e` under `P_a`, contradicting Schnorr unforgeability, or
finding the discrete logarithm of `S_{i,x}`.

### Claim 2: Public Completion After Resolution

If the oracle publishes `s_{i,x}`, any party holding the bridge adaptors can
complete `B_e`.

Proof. For every required signature, compute

```text
s_a = s_hat_a + s_{i,x} mod n.
```

The adaptor verification equation gives

```text
s_hat_a G = R*_a - S_{i,x} + e_aP_a.
```

Since `S_{i,x} = s_{i,x}G`,

```text
s_aG = (s_hat_a + s_{i,x})G
     = R*_a + e_aP_a.
```

Thus `(R*_a, s_a)` is a valid Schnorr signature.

### Claim 3: Outcome Isolation

If the oracle signs outcome `y != x`, the bridge for edge `(C_i, x, C_j)` is
not activated by `s_{i,y}`.

Proof. The bridge signatures are adapted to `S_{i,x}`. Completing them with
`s_{i,y}` gives

```text
(s_hat_a + s_{i,y})G
  = R*_a - S_{i,x} + e_aP_a + S_{i,y}.
```

This equals `R*_a + e_aP_a` only if `S_{i,y} = S_{i,x}`. With unique oracle
nonces and collision-resistant tagged hashes, this does not occur except with
negligible probability or oracle equivocation.

## 7. Refunds and Failure Modes

Each edge output `O_e` should include a timelocked refund path. If the parent
outcome occurs but the bridge transaction is not broadcast before a deadline,
the funds return according to a fallback policy agreed by the parties.

The construction assumes:

```text
1. The oracle does not sign conflicting outcomes for the same nonce.
2. The oracle eventually publishes the attestation for the event.
3. Parties retain the pre-signed transactions and adaptor signatures.
4. Fee rates are handled by CPFP, anchor outputs, or pre-agreed fee reserves.
5. Timelocks are ordered so parent settlement, bridge activation, and child refunds do not race.
```

If the oracle signs multiple outcomes, multiple branches can become executable.
This is not unique to cDLCs; it is the standard oracle equivocation failure of
DLCs. The oracle's conflicting signatures are cryptographic evidence of fault.

## 8. Graph Discipline

The simplest safe cDLC graph is acyclic. Cycles require state updates and
revocation logic and should be treated as a separate protocol.

For a finite acyclic graph, the number of bridge transactions is

```text
|E| = sum_i active_edges(C_i).
```

The construction does not remove the known DLC state-size problem. Numeric
outcome compression, payout interpolation, and multi-oracle threshold
attestations remain applicable to each node.

## 9. Applications

A cDLC can express rolling contracts, automatic re-hedging, periodic synthetic
exposure, and conditional refinancing. A synthetic asset can be represented as
a sequence of DLC positions whose next funding transaction is activated by the
settlement of the previous position.

This does not eliminate oracle risk, liquidity risk, or collateral risk. It
also does not create a global account-based token inside Bitcoin. It creates
native Bitcoin UTXO contracts whose continuation is controlled by
oracle-revealed scalars.

## 10. Lightning Network Extension

The previous sections define the cDLC construction. This section describes how
the same activation scalar can be used inside Lightning-style payment channels.
The goal is not to redefine cDLCs as channel contracts. The goal is to show
that, when the parties already have a prepared child state, the parent outcome
scalar can also serve as the witness for a channel condition.

In the base construction, `s_{i,x}` completes bridge signatures for `B_e`. In
the channel extension, `s_{i,x}` or its encoding `enc(s_{i,x})` settles a
channel condition `L_e` whose child state was already prepared.

The child state still must be negotiated in advance. Lightning only carries the
conditional value transfer.

### 10.1 Channel Condition Model

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

### 10.2 HTLC Encoding

Current Lightning payment invoices and HTLC updates are hash-locked. A payment
hash is a 256-bit hash of a payment preimage. In HTLC mode, the cDLC witness is
the oracle scalar itself, encoded as 32 bytes.

For each possible oracle outcome `x`, define

```text
w_x = enc(s_x)
h_x = H_pay(w_x).
```

The HTLC lock is

```text
lock_x = h_x.
```

The redemption predicate is

```text
redeem_HTLC(h_x, w) = true iff H_pay(w) = h_x.
```

The ordinary DLC announcement makes `S_x` public and verifiable:

```text
S_x = R_o + H(R_o || V || x)V.
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
edge will fail and must refund by timeout. After attestation, the mismatch is
publicly checkable.

**Claim L1: HTLC settlement after oracle resolution.**

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

**Claim L2: HTLC outcome isolation.**

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

**Claim L3: HTLC settlement and adaptor completion are synchronized.**

If the channel edge is locked to `h_x = H_pay(enc(s_x))` and the cDLC adaptor
point is `S_x = s_xG`, then publication of `s_x` both redeems the HTLC and
completes the adaptor signature.

Proof. HTLC redemption follows from Claim L1. Adaptor completion follows from
the adaptor equation:

```text
(s_hat + s_x)G
= (R* - S_x + eP) + S_x
= R* + eP.
```

Both effects use the same scalar `s_x`.

### 10.3 Routed HTLC cDLCs

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

**Claim L4: Routed HTLC atomicity.**

Assume every honest intermediate node has enough time to claim upstream after
learning `enc(s_x)` downstream. Then a revealed `enc(s_x)` propagates
settlement back through the route; without `enc(s_x)`, the route times out.

Proof. For every hop, the redemption predicate is identical:

```text
redeem_HTLC(h_x, enc(s_x)) = true.
```

Therefore each node that learns `enc(s_x)` from its outgoing channel has the
exact witness needed for its incoming channel. If the witness is not revealed,
no hop can satisfy `H_pay(w) = h_x` except by finding a preimage or collision,
so the timeout branch remains the only valid branch.

This is why HTLC cDLCs require careful timeout selection. The algebra gives the
same witness to every hop; the channel protocol must give every hop time to use
it.

### 10.4 Point-Locked Encoding

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
S_x = R_o + H(R_o || V || x)V = s_xG,
```

the cDLC point is directly usable as the channel payment point.

**Claim L5: Point-lock settlement after oracle resolution.**

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

**Claim L6: Point-lock outcome isolation.**

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

### 10.5 Routed Point-Locked cDLCs

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

If downstream settlement reveals `t_i` such that

```text
t_iG = T_i,
```

then the upstream witness is

```text
t_{i-1} = t_i + d_i mod n.
```

**Claim L7: Point-lock route tweak correctness.**

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

### 10.6 Channel Failure Modes

Lightning cDLCs inherit Lightning's channel safety requirements. The extension
assumes:

```text
1. The oracle eventually publishes the attestation before channel expiry.
2. In HTLC mode, the oracle's hash commitments match its later scalar attestations.
3. Parties retain the prepared child state and adaptor signatures.
4. Expiries are ordered so downstream settlement can be claimed upstream.
5. Force-close and watchtower policies protect channel state.
6. Liquidity is available for every channel edge in the route.
```

Failure modes:

```text
oracle never attests
=> HTLC or point-locked edge expires
=> channel funds return by timeout

oracle commits to wrong h_x in HTLC mode
=> published s_x does not redeem the HTLC
=> channel funds return by timeout
=> oracle fault is publicly checkable after attestation

party loses prepared child state
=> scalar may be public but child activation data is unavailable
=> funds follow fallback channel or contract policy
```

The HTLC version inherits a privacy cost: every hop sees the same payment hash
`h_x`. The point-locked version can avoid this by using per-hop point tweaks,
but it requires point-lock support rather than ordinary current HTLC behavior.

## 11. Conclusion

A DLC already contains a hidden scalar that becomes public only when a specific
real-world outcome is attested. A cDLC uses that scalar twice: first to settle
the parent contract, and second to complete adaptor signatures that fund the
next contract.

The core equation is:

```text
S_x = R_o + H(R_o || V || x)V
s_xG = S_x
s = s_hat + s_x mod n.
```

This is sufficient to build a graph of conditional Bitcoin transactions in
which one DLC outcome activates another DLC without new consensus rules. The
construction is composable because the oracle attestation secret is a reusable
adaptor secret, and it is discreet because the blockchain validates only
ordinary transaction signatures.

The Lightning extension uses the same activation scalar as a channel witness.
In HTLC-compatible channels, the oracle additionally commits to
`H_pay(enc(s_x))`. In point-locked channels, the ordinary DLC point `S_x` is
already the payment point. These channel forms improve the possible execution
surface of cDLCs, but they remain extensions of the cDLC construction rather
than a replacement for it.

## References

1. Thaddeus Dryja, "Discreet Log Contracts", MIT Digital Currency Initiative:
   https://adiabat.github.io/dlc.pdf
2. BIP340, "Schnorr Signatures for secp256k1":
   https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
3. Discreet Log Contract interoperability specifications:
   https://github.com/discreetlogcontracts/dlcspecs
4. Bitcoin Optech, "Adaptor signatures":
   https://bitcoinops.org/en/topics/adaptor-signatures/
5. Lightning BOLT #2, "Peer Protocol for Channel Management":
   https://github.com/lightning/bolts/blob/master/02-peer-protocol.md
6. Lightning BOLT #3, "Bitcoin Transaction and Script Formats":
   https://github.com/lightning/bolts/blob/master/03-transactions.md
7. Lightning BOLT #4, "Onion Routing Protocol":
   https://github.com/lightning/bolts/blob/master/04-onion-routing.md
8. Lightning BOLT #11, "Invoice Protocol for Lightning Payments":
   https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
9. Bitcoin Optech, "Point Time Locked Contracts":
   https://bitcoinops.org/en/topics/ptlc/
