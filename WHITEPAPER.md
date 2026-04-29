# Cascading Discreet Log Contracts

## Abstract

This paper describes a construction for Cascading Discreet Log Contracts, or
cDLCs. A cDLC is a finite graph of ordinary Bitcoin transactions in which the
attestation secret revealed by the oracle of one DLC completes adaptor
signatures that activate another DLC. The construction requires no new opcode,
no covenant, and no on-chain awareness of the contract graph.

Cascading activation is obtained by using the future oracle signature of a parent
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

## 7. Machine-Checked Algebra

The algebra above is also modeled in Ada/SPARK and checked with GNATprove. The
proof artifacts are in the repository's `spark/` directory. They are not a
replacement for cryptographic assumptions, but they are machine-checked
evidence that the core cDLC equations used by this paper are internally
consistent.

The checked proof targets are:

```text
spark/cdlc_integer_proofs.gpr
spark/cdlc_residue_proofs.gpr
spark/cdlc_proofs.gpr
```

The integer target uses `SPARK.Big_Integers` to prove the symbolic polynomial
identities without machine-integer overflow. The residue target proves the same
bridge/adaptor identities over `Z/97Z` with explicit modular reduction. The Ada
built-in modular target proves the same identities with `type mod 97`, using
ghost lemmas for modular rotation and cancellation so that GNATprove can close
the bit-vector modular obligations.

The SPARK models prove the following finite algebraic claims:

```text
1. The oracle scalar maps to the advertised attestation point.
2. A bridge adaptor signature verifies before completion.
3. Adding the oracle scalar completes the bridge signature.
4. A completed signature reveals the hidden oracle scalar by subtraction.
5. A different oracle scalar does not complete the same bridge signature.
```

These are exactly the equations used by Claims 1, 2, and 3. In proof terms,
the models check the algebraic heart of the cDLC construction:

```text
S_x = s_xG
s_hat G = R* - S_x + eP
s = s_hat + s_x mod n
sG = R* + eP
s - s_hat = s_x mod n.
```

For this repository revision, all three targets were checked with GNATprove
using the CVC5, Z3, and Alt-Ergo provers and completed with no unproved checks
and no `pragma Assume` statements. This matters because the proof evidence does
not rely on an assumed lemma inside the Ada/SPARK model.

The proof boundary is narrow. The SPARK code models scalar and group equations;
it does not prove secp256k1, BIP340 implementation correctness, SHA-256,
Bitcoin transaction serialization, sighash behavior, mempool policy, or
Lightning state-machine behavior. Those remain implementation and protocol
assumptions outside the machine-checked core.

The Lightning extension has a separate machine-checked model described in
Section 11.7.

## 8. Refunds and Failure Modes

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

## 9. Graph Discipline

The simplest safe cDLC graph is acyclic. Cycles require state updates and
revocation logic and should be treated as a separate protocol.

For a finite acyclic graph, the number of bridge transactions is

```text
|E| = sum_i active_edges(C_i).
```

The construction does not remove the known DLC state-size problem. Numeric
outcome compression, payout interpolation, and multi-oracle threshold
attestations remain applicable to each node.

## 10. Applications

A cDLC can express rolling contracts, automatic re-hedging, periodic synthetic
exposure, and conditional refinancing. A synthetic asset can be represented as
a sequence of DLC positions whose next funding transaction is activated by the
settlement of the previous position.

This does not eliminate oracle risk, liquidity risk, or collateral risk. It
also does not create a global account-based token inside Bitcoin. It creates
native Bitcoin UTXO contracts whose continuation is controlled by
oracle-revealed scalars.

## 11. Lightning Network Extension

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

### 11.1 Channel Condition Model

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

### 11.2 HTLC Encoding

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

### 11.3 Routed HTLC cDLCs

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

### 11.4 Point-Locked Encoding

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

### 11.5 Routed Point-Locked cDLCs

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

### 11.6 Channel Failure Modes

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

### 11.7 Machine-Checked Lightning Model

The Lightning extension is also modeled in Ada/SPARK and checked with
GNATprove. The proof target is:

```text
spark/lightning_cdlc_proofs.gpr
```

This target is separate from the base cDLC proof targets because it proves
channel-condition behavior rather than bridge-signature algebra. It uses Ada's
built-in `type mod 97` model for finite scalar, point, and digest values.

The model proves the following Lightning companion claims:

```text
1. The oracle scalar redeems an HTLC when the oracle precommits to its hash.
2. A wrong scalar does not redeem that HTLC in the ideal digest model.
3. The oracle scalar redeems a point-locked PTLC whose lock is S_x.
4. A wrong scalar does not redeem that PTLC.
5. The same HTLC witness redeems every hop whose lock is h_x.
6. PTLC route tweaks preserve one-hop and two-hop route atomicity.
7. Correct witnesses activate prepared child states.
8. Wrong witnesses do not activate prepared child states.
9. Wrong witnesses flow to timeout/refund behavior.
10. Correct redemption prevents timeout/refund behavior.
11. Correct settlement moves channel balance from Alice to Bob.
12. Wrong-witness settlement leaves the abstract channel state unchanged.
13. Channel balance is conserved by the abstract payment transition.
```

The synchronization claim is also checked: the same oracle attestation scalar
that redeems the HTLC lock also matches the point lock used by the adaptor/PTLC
side of the construction.

For this repository revision, the Lightning target was checked with GNATprove
using the CVC5, Z3, and Alt-Ergo provers and completed with no unproved checks
and no `pragma Assume` statements. The checked run analyzed 51 SPARK
subprograms and discharged 118 total obligations.

The model's hash function is intentionally an ideal injective digest model:

```text
Hash_Of(s) = s.
```

This is not a claim that real HTLC hashes are algebraic identities. It is the
finite SPARK representation of the preimage/collision-resistance assumption
used by the paper. Real SHA-256 security, BOLT state machines, channel
revocation, force-close behavior, watchtowers, routing policy, and liquidity
remain outside the machine-checked Lightning model.

## 12. Limitations

The construction in this paper is an activation primitive, not a complete
production protocol. It shows that an oracle attestation scalar can settle a
parent DLC and simultaneously complete prepared child signatures. The following
limitations are part of the claim.

### 12.1 Cryptographic Assumptions

The construction assumes the hardness of the discrete logarithm problem in the
secp256k1 group, secure Schnorr signatures, collision-resistant and
second-preimage-resistant hashes, and unique oracle nonces. It does not prove
these primitives. If an oracle reuses a nonce across incompatible
announcements, leaks its nonce secret, signs equivocating outcomes, or uses a
weak implementation, the security argument fails at the oracle layer.

The Ada/SPARK and GNATprove artifacts described in Sections 7 and 11.7 prove
finite algebraic properties of the cDLC and Lightning-extension equations. They
do not prove secp256k1 itself, BIP340's implementation, SHA-256, transaction
serialization, signature hashing, wallet key management, or the full DLC
negotiation protocol.

### 12.2 Oracle and Liveness Risk

cDLCs depend on oracle publication. If the oracle never publishes the outcome
scalar, the child graph is not activated and funds must follow the prepared
timeout or refund paths.

The HTLC-compatible Lightning form adds a further requirement: the oracle must
precommit to the exact payment hash derived from the encrypted attestation,

```text
h_x = H_pay(enc(s_x)).
```

If `h_x` is wrong, publication of `s_x` still settles the DLC algebra but does
not redeem the HTLC. This is detectable after publication, but it remains a
liveness failure.

### 12.3 State, Storage, and Graph Size

Every spendable child edge must be prepared before the parent outcome is known.
Parties must retain the relevant transaction states, adaptor signatures,
refunds, timeouts, and routing data. If this state is lost, the oracle scalar
may become public while the child activation data is unavailable.

The paper does not solve state explosion. A large outcome tree can require many
prepared signatures and transactions. Practical deployments need payout
compression, state pruning, oracle decomposition, channel aggregation, or other
engineering techniques that are outside this proof.

### 12.4 Bitcoin Policy, Fees, and Timelocks

The equations prove that the right scalar completes the right signature. They
do not guarantee that a transaction confirms. Production systems must handle
feerates, mempool policy, package relay availability, transaction pinning,
anchor outputs, CPFP/RBF strategy, dust limits, and timeout margins.

Timeout order is a safety condition. Child refunds, parent refunds, channel
expiries, and routed claims must be ordered so that an honest party has time to
learn the witness and claim upstream. The paper specifies this requirement but
does not give a universal parameter schedule for all fee markets and channel
topologies.

### 12.5 Privacy Limits

On-chain cDLCs are discreet at the script level because settlement can appear
as ordinary signature spending. This does not imply perfect privacy. Amounts,
timing, transaction graph structure, fee patterns, address reuse, and oracle
metadata can still reveal relationships between contracts.

The HTLC-compatible Lightning construction has an explicit privacy limitation:
all hops can observe the same payment hash `h_x`. The point-locked construction
can use per-hop point tweaks, but point-locked channel support is not generally
available in today's Lightning implementations.

### 12.6 Lightning Deployment Limits

The Lightning section is a mathematical extension of the cDLC activation
scalar into channel conditions. It is not a claim that today's Lightning
Network already supports cDLCs end-to-end without protocol and implementation
work.

The SPARK Lightning target proves the finite HTLC/PTLC witness model in
Section 11.7. It does not prove the BOLT protocol state machine, production
HTLC scripts, PTLC deployment, route discovery, liquidity availability, channel
revocation, force-close behavior, or watchtower behavior.

The HTLC version requires hold-invoice or deferred-settlement behavior and
correct oracle hash commitments. The point-locked version requires PTLC-like
channel support. Routed use also depends on liquidity, route availability,
watchtower behavior, force-close policy, channel reserve rules, and timeout
coordination across hops.

### 12.7 Economic and Regulatory Limits

cDLCs can express conditional financial graphs, including oracle-settled
contracts that reference prices. That does not by itself create a stablecoin,
guarantee convertibility, guarantee liquidity, eliminate basis risk, or solve
collateral management. Any gold, dollar, or real-denominated product built with
cDLCs still needs an economic design, collateral policy, oracle policy,
liquidation policy, legal analysis, and user-risk disclosure.

### 12.8 Scope of the Formal Claim

The conservative target is a finite, acyclic graph of pre-negotiated cDLC
states. Cyclic or indefinitely updating graphs require an additional state
update, revocation, or channel protocol. That protocol may be possible, but it
is not proven here.

Therefore the precise claim is narrower than "a complete decentralized
financial system exists." The claim is:

```text
Under the stated cryptographic assumptions, if the parties pre-negotiate a
valid finite cDLC graph and the oracle publishes exactly one valid outcome
scalar, then that scalar can activate the corresponding child edge and cannot
activate non-corresponding edges except through the stated failure assumptions.
```

## 13. Conclusion

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

The result is real but bounded. The paper supports the mathematical existence
of Cascading DLC activation under explicit assumptions. It does not remove the
need for robust oracle operations, careful fee and timeout engineering,
Lightning implementation work, liquidity design, collateral design, or legal
analysis. cDLCs are therefore best understood as a new Bitcoin-native
cascading activation primitive: strong enough to justify implementation and
testing, but not by itself a finished financial system.

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
