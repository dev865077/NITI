# Cascading Discreet Log Contracts

## Abstract

Cascading Discreet Log Contracts, or cDLCs, provide a framework for creating
sequential, conditionally activated smart contracts on the Bitcoin network,
enabling rolling contracts, synthetic exposures, and renewable fixed-term
positions. Cascading activation is obtained by using the future oracle signature
of a parent contract as the hidden scalar of adaptor signatures that spend a
parent outcome output into the funding output of a child contract.

## 1. Notation

Let `G` be the generator of the secp256k1 group of order `n`. Lowercase letters
denote scalars modulo `n`; uppercase letters denote curve points. For a scalar
`x`, write `X = xG`. Let `H` denote a tagged hash interpreted as a scalar
modulo `n`.

A BIP340 Schnorr signature for message `m` under public key `P = pG` is a pair
`(R, s)` satisfying:

```text
sG = R + H(R || P || m)P.
```

An oracle has signing key `v`, public key `V = vG`, and commits to a one-time
nonce point `R_o = r_oG` for an event. For outcome `x`, define:

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_x V.
```

Before the event, anyone can compute `S_x` for each outcome `x`, but only the
oracle knows `s_x`. After the event, the oracle attests by publishing `s_x`.
This scalar is the transferable fact that makes DLCs possible.

## 2. Signature Adaptors

Let `T = tG` be a public point whose discrete logarithm `t` is unknown. To
create an adaptor signature for message `m` under key `P = pG`, the signer
chooses nonce `r` and computes:

```text
R = rG
R* = R + T
e = H(R* || P || m)
s_hat = r + ep mod n.
```

The adaptor `(R*, T, s_hat)` can be verified without knowing `t`:

```text
s_hat G = R* - T + eP.
```

It is not yet a valid Schnorr signature. Once `t` is revealed, anyone holding
the adaptor computes:

```text
s = s_hat + t mod n
```

and `(R*, s)` is valid because:

```text
sG = (s_hat + t)G
   = (R* - T + eP) + T
   = R* + eP.
```

Conversely, a completed signature reveals the hidden scalar to any holder of
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
the oracle publishes `s_x`.

Thus a DLC does more than choose a payout: it emits a scalar:

```text
resolve(DLC, x) -> s_x.
```

This scalar is public after resolution, unpredictable before, and bound to a
specific oracle event and outcome. A cDLC uses this scalar as the activation
secret for the next transaction.

## 4. cDLC Construction

A cDLC is a finite directed graph:

```text
Gamma = (N, E)
```

where each node `C_i in N` is a DLC and each directed edge:

```text
e = (C_i, x, C_j)
```

means: if contract `C_i` resolves to outcome `x`, activate contract `C_j`.

For each edge `e = (C_i, x, C_j)` the parties construct a bridge transaction
`B_e`. This transaction spends a designated output of the parent CET
`CET_{i,x}` and creates the funding output `F_j` of the child DLC `C_j`. The
parent CET contains an edge output `O_e` spendable by the required cDLC
participants, with a timelocked refund path.

The child contract `C_j` is negotiated before the parent resolves. Its CETs and
refund transaction spend `F_j`, which is possible because the `txid` of `B_e`
is known before its witness signatures are completed.

All signatures on `B_e` are adaptor signatures using `T_e = S_{i,x}`. For
participant `a` with key `P_a = p_aG`, let `m_e` be the sighash for `B_e`. The
participant computes:

```text
R_a = r_aG
R*_a = R_a + S_{i,x}
e_a = H(R*_a || P_a || m_e)
s_hat_a = r_a + e_a p_a mod n.
```

The adaptor verifies as:

```text
s_hat_a G = R*_a - S_{i,x} + e_a P_a.
```

Once the oracle publishes `s_{i,x}`, anyone holding the adaptors completes:

```text
s_a = s_hat_a + s_{i,x} mod n,
```

yielding:

```text
s_aG = R*_a + e_a P_a,
```

a valid Schnorr signature.

Every adaptor on `B_e` must be exchanged and verified before `Funding_i` is
broadcast. The completability step requires at least one honest party to retain
the adaptor set; the oracle scalar alone is insufficient if all adaptor holders
are unavailable.

## 5. Native Chaining

The bridge transaction spends an output of a future CET. This is possible
because the `txid` of a SegWit or Taproot transaction does not include witness
data: the parent CET can be fully specified before its witness signatures are
completed.

Thus the bridge and the child DLC are constructed before the parent CET is
broadcast:

```text
Funding_i -> CET_{i,x} -> B_e -> Funding_j.
```

The off-chain cascade reads:

```text
oracle signs x
=> s_{i,x} revealed
=> CET_{i,x} executable
=> B_e completable
=> C_j funded.
```

Bitcoin validates only ordinary signatures and timelocks. The chain of meaning
is entirely off-chain.

## 6. Security Claims

### Claim 1: Conditional Activation

For an edge `e = (C_i, x, C_j)`, the bridge `B_e` cannot be completed before
`s_{i,x}` is known, except by forging a Schnorr signature or solving the
discrete logarithm of `S_{i,x}`.

Proof. Each required signature on `B_e` is an adaptor with point `S_{i,x}`.
Completing it without `s_{i,x}` requires producing a valid Schnorr signature
for `m_e` under `P_a`, contradicting unforgeability, or finding
`log_G S_{i,x}`.

### Claim 2: Public Completion After Resolution

If the oracle publishes `s_{i,x}`, any party holding the bridge adaptors can
complete `B_e`.

Proof. For every required signature:

```text
s_a = s_hat_a + s_{i,x}.
```

Since `S_{i,x} = s_{i,x}G`, we have:

```text
s_aG = (s_hat_a + s_{i,x})G = R*_a + e_a P_a,
```

a valid Schnorr signature.

### Claim 3: Outcome Isolation

If the oracle signs outcome `y != x` under the same nonce `R_o`, the scalar
`s_{i,y}` does not complete the bridge for edge `(C_i, x, C_j)`.

Proof. Completing with `s_{i,y}` yields:

```text
(s_hat_a + s_{i,y})G = R*_a - S_{i,x} + e_a P_a + S_{i,y},
```

which equals `R*_a + e_a P_a` only if `S_{i,y} = S_{i,x}`. With unique oracle
nonces and collision-resistant tagged hashes, this occurs only with negligible
probability.

### Oracle Equivocation

Claim 3 is conditional on the oracle using a single nonce per event.

Same-nonce equivocation: the oracle signs outcomes `x` and `y` with the same
`R_o`. Only one bridge completes; additionally, the oracle's private key `v` is
recoverable.

Different-nonce equivocation: the oracle signs two outcomes using independent
nonce pairs. Claim 3's isolation argument does not apply; both child edges
could become funded simultaneously. In both cases the conflicting signatures
are publicly verifiable evidence of oracle misconduct.

## 7. Machine-Checked Algebra

The algebra above is modelled in Ada/SPARK and checked with GNATprove. Proof
artifacts are in the repository's `spark/` directory.

Targets:

| Target | Scope |
| --- | --- |
| `spark/cdlc_integer_proofs.gpr` | Symbolic polynomial identities over `SPARK.Big_Integers`. |
| `spark/cdlc_residue_proofs.gpr` | Bridge/adaptor identities over `Z/97Z` with explicit modular reduction. |
| `spark/cdlc_proofs.gpr` | Same identities with Ada `type mod 97`, using ghost lemmas for modular rotation and cancellation. |

The models prove:

1. The oracle scalar maps to the advertised attestation point.
2. A bridge adaptor signature verifies before completion.
3. Adding the oracle scalar completes the bridge signature.
4. A completed signature reveals the hidden scalar by subtraction.
5. A different oracle scalar does not complete the same bridge signature.

These correspond exactly to:

```text
S_x = s_xG
s_hat G = R* - S_x + eP
s = s_hat + s_x
sG = R* + eP
s - s_hat = s_x.
```

All three targets completed with no unproved checks and no `pragma Assume`
statements, using CVC5, Z3, and Alt-Ergo. The proofs establish algebraic
consistency of these five identities; secp256k1, BIP340, SHA-256, transaction
serialisation, and the full protocol remain outside the machine-checked
boundary.

## 8. Refunds and Failure Modes

### 8.1 Assumptions

The construction requires:

1. The oracle uses a unique nonce per event and does not sign conflicting
   outcomes for the same nonce commitment.
2. The oracle publishes the attestation before the fallback timeout.
3. At least one party retains pre-signed transactions and adaptor signatures
   for every live edge in the preparation window.
4. Fee rates are handled by CPFP, anchor outputs, or pre-agreed fee reserves.
5. Timelocks are ordered so that parent settlement, bridge activation, and
   child refunds do not race.

### 8.2 Timeout Ordering

Let `tau_attest` be the expected oracle attestation time, `tau_bridge` the
bridge activation deadline, and `tau_child` the child refund timeout. The
required ordering is:

```text
tau_attest < tau_bridge < tau_child.
```

## 9. Graph Discipline

The simplest safe cDLC graph is acyclic. Cycles require state updates and
revocation logic and are not addressed here.

### 9.1 Lazy Graph Preparation

The cDLC activation equation is edge-local: preparing bridge `B_e` for edge
`(C_i, x, C_j)` depends only on the parent outcome, the bridge transaction, and
the child funding output for that edge. This locality allows lazy preparation.

Let `K >= 2` be a preparation-window depth. At active node `C_i`, the live
window is:

```text
W_i = {C_i, C_{i+1}, ..., C_{i+K-1}}.
```

Before `C_i` resolves, the parties negotiate the next window by exchanging
adaptor signatures for `C_{i+K}`: an asynchronous bilateral exchange identical
in structure to any DLC negotiation, requiring no simultaneous presence. If no
extension is agreed, the fallback executes.

State bounds:

For a non-recombining tree with branching factor `b`, depth `D`, and per-node
weight `P`:

```text
EagerState(D) = P * (b^{D+1} - 1) / (b - 1)
LazyState(K)  = P * (b^K - 1) / (b - 1).
```

For fixed `K`, `LazyState(K)` is independent of `D`: maximum live retained
state is bounded regardless of total product depth. If reachable states
recombine, let `|Sigma_h|` be the distinct states at distance `h`; then:

```text
LiveState_i(K) <= sum_{h=0}^{K-1} |Sigma_h| * P_h.
```

Recombination, payoff compression, and lazy preparation are compatible and
jointly reduce retained state.

## 10. Applications

A cDLC can express rolling contracts, re-hedging, periodic synthetic exposure,
and conditional refinancing. With lazy preparation, a long-duration product is
represented as a sequence of finite windows, each prepared before the current
oracle event forces settlement. These products are more precisely described as
renewable fixed-term contracts with bilateral extension rights: either party
may decline to extend the window, causing the fallback to execute.

cDLCs do not create a global account-based token. They create native Bitcoin
UTXO contracts whose continuation is controlled by oracle-revealed scalars.

## 11. Lightning Network Extension

This section shows that when the parties have already prepared a child state,
the parent outcome scalar can also serve as a channel witness. The child state
must still be negotiated in advance; Lightning only carries the conditional
value transfer.

### 11.1 Channel Condition Model

A Lightning channel is modelled as `Q = (A, B, P)` where `A` and `B` are
balances and `P` is the set of pending conditional transfers. For a pending
transfer `L = (amount, lock, expiry)`, a redemption predicate
`redeem(lock, w)` determines settlement. The channel conserves capacity:
`A + B = A' + B'` in both cases.

### 11.2 HTLC Encoding

For each oracle outcome `x`, define:

```text
w_x = enc(s_x)
h_x = H_pay(w_x).
```

The HTLC lock is `h_x`; the oracle must precommit to `h_x` in its event
announcement.

### Claim 4: HTLC Settlement

If the oracle publishes `s_x` and `h_x = H_pay(enc(s_x))`, the HTLC is
redeemable by witness `enc(s_x)`.

Proof. `redeem(h_x, w) = true` iff `H_pay(w) = h_x`. Substituting
`w = enc(s_x)` holds by construction.

### Claim 5: HTLC Outcome Isolation

If `H_pay(enc(s_y)) != H_pay(enc(s_x))`, then `enc(s_y)` does not redeem the
HTLC locked to `h_x`.

Proof. Acceptance requires `H_pay(enc(s_y)) = h_x`, contradicting the premise
under collision and second-preimage resistance.

### Claim 6: HTLC--Adaptor Synchronisation

Publication of `s_x` both redeems the HTLC locked to `h_x` and completes the
adaptor with point `S_x`.

Proof. HTLC redemption follows from the HTLC settlement claim. Adaptor
completion:

```text
(s_hat + s_x)G = (R* - S_x + eP) + S_x = R* + eP.
```

### 11.3 Routed HTLC cDLCs

For a route `N_0 -> ... -> N_k` with hash lock `h_x` at every hop, the standard
Lightning expiry ordering applies, with the additional constraint:

```text
expiry_k > tau_attest + delta
```

for oracle observation margin `delta`.

### Claim 7: Routed HTLC Atomicity

A revealed `enc(s_x)` propagates settlement back through the route; without it,
the route times out.

Proof. For every hop, `redeem(h_x, enc(s_x)) = true` by the HTLC settlement
claim. Each node that learns the witness from its outgoing channel has the
exact witness for its incoming channel. Without the witness, no hop can satisfy
`H_pay(w) = h_x` except by preimage or collision.

### 11.4 Point-Locked Encoding

A point-locked transfer uses lock `S_x` and witness `s_x` with predicate
`redeem_PTLC(S_x, s) = true` iff `sG = S_x`. Since the ordinary DLC
announcement already provides `S_x = s_xG`, no additional oracle hash
commitment is required. PTLC deployment requires channel protocol changes not
present in current major Lightning implementations.

### Claim 8: Point-Lock Settlement

Oracle publication of `s_x` redeems a transfer locked to `S_x`, since
`s_xG = S_x`.

### Claim 9: Point-Lock Outcome Isolation

If `s_yG != S_x`, then `s_y` does not redeem the point lock. In the
prime-order group, `s_yG = s_xG` implies `s_y = s_x mod n`.

### 11.5 Routed Point-Locked cDLCs

Let the receiver's point be `T_k = S_x`. For each hop `i`, the node chooses a
private tweak `d_i` and defines the upstream point:

```text
T_{i-1} = T_i + d_iG.
```

If downstream settlement reveals `t_i` with `t_iG = T_i`, the upstream witness
is:

```text
t_{i-1} = t_i + d_i mod n.
```

### Claim 10: Route Tweak Correctness

```text
t_{i-1}G = (t_i + d_i)G = T_i + d_iG = T_{i-1}.
```

### 11.6 Machine-Checked Lightning Model

The Lightning extension is modelled in Ada/SPARK, proof target
`spark/lightning_cdlc_proofs.gpr`, using `type mod 97` for finite scalars and
the ideal injective digest `Hash_Of(s) = s`. The target proves 13 companion
claims covering HTLC and PTLC settlement, outcome isolation, route atomicity,
tweak correctness, state activation and non-activation, channel balance
conservation, and HTLC--adaptor synchronisation. The run analysed 51 SPARK
subprograms and discharged 118 obligations with no unproved checks and no
`pragma Assume` statements.

## 12. Limitations

The construction is an activation primitive, not a complete production
protocol.

### 12.1 Cryptographic Assumptions

The construction assumes discrete logarithm hardness in secp256k1, Schnorr
unforgeability, collision-resistant hash functions, and unique oracle nonces.
Oracle nonce reuse in a cDLC graph compromises the entire downstream graph.

### 12.2 Oracle and Liveness Risk

If the oracle never publishes the outcome scalar, the child graph is not
activated and funds follow the fallback policy. In HTLC mode, a wrong
precommitted `h_x` causes liveness failure for the channel edge even when the
DLC algebra is satisfied.

### 12.3 State and Negotiation Cost

Lazy preparation bounds maximum live retained state to `LazyState(K)`,
independent of total product depth `D`. Cumulative negotiation work scales with
`D * b`: long-running contracts require bilateral window extension at every
period. If one party will not negotiate, the fallback executes.

### 12.4 Bitcoin Policy, Fees, and Timelocks

The proofs guarantee that the right scalar completes the right signature, not
that a transaction confirms. Production systems must handle feerates, mempool
policy, package relay, transaction pinning, anchor outputs, CPFP/RBF, dust
limits, and timeout margins.

### 12.5 Privacy Limits

On-chain cDLCs are discreet at the script level under Taproot. In HTLC
Lightning cDLCs, all hops observe the same `h_x`. PTLC cDLC channels resolve
this via per-hop point tweaks.

### 12.6 Collateral Requirements

Every DLC node requires fully collateralized funding with no netting across
positions. Capital locked in the funding output cannot be deployed elsewhere
for the duration of the period.

### 12.7 Scope of the Formal Claim

Under the stated cryptographic assumptions, if all parties have exchanged and
verified adaptors for every live edge in the current preparation window, at
least one party retains the full adaptor state, and the oracle publishes
exactly one valid outcome scalar before the bridge activation deadline, then
that scalar activates the corresponding prepared child edge and cannot activate
non-corresponding edges except through the failure modes stated above.

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
which one DLC outcome activates another.

## References

1. T. Dryja, "Discreet Log Contracts", MIT Digital Currency Initiative:
   <https://adiabat.github.io/dlc.pdf>
2. BIP340, "Schnorr Signatures for secp256k1":
   <https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki>
3. Discreet Log Contract Interoperability Specifications:
   <https://github.com/discreetlogcontracts/dlcspecs>
4. Bitcoin Optech, "Adaptor signatures":
   <https://bitcoinops.org/en/topics/adaptor-signatures/>
5. Lightning BOLT #2:
   <https://github.com/lightning/bolts/blob/master/02-peer-protocol.md>
6. Lightning BOLT #3:
   <https://github.com/lightning/bolts/blob/master/03-transactions.md>
7. Lightning BOLT #4:
   <https://github.com/lightning/bolts/blob/master/04-onion-routing.md>
8. Lightning BOLT #11:
   <https://github.com/lightning/bolts/blob/master/11-payment-encoding.md>
9. Bitcoin Optech, "Point Time Locked Contracts":
   <https://bitcoinops.org/en/topics/ptlc/>
