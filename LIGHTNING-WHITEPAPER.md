# NITI Lightning cDLCs

## Conditional Synthetic Contracts over Payment Channels

This paper is a companion to the main NITI whitepaper. It studies how a
composable Discreet Log Contract, or cDLC, can be represented inside Lightning
payment channels without changing the algebra of the original construction.

The result is not that today's public Lightning Network already implements every
ideal feature described here. The result is narrower and stronger:

1. a current HTLC-based Lightning channel can carry a cDLC condition when the
   oracle precommits to the hash of the future attestation scalar;
2. a PTLC-based Lightning channel can carry the same cDLC condition directly as
   a point lock;
3. the same scalar that completes a NITI adaptor signature can settle the
   Lightning condition;
4. these identities were modeled and proved in SPARK/Ada in
   [`spark/src/lightning_cdlc_algebra.ads`](spark/src/lightning_cdlc_algebra.ads).

The HTLC construction is deployable only where the involved Lightning software
supports hold-invoice or equivalent deferred-settlement behavior. The PTLC
construction is the cleaner protocol, but depends on PTLC/Taproot channel
support that is not yet the normal public Lightning deployment.

## 1. Motivation

The first NITI model composes DLCs by letting one oracle attestation scalar
unlock a bridge transaction that activates the next contract in a finite graph.
That model is Bitcoin-native, but it still treats on-chain transactions as the
main transition surface.

For user experience, this is expensive:

- every rebalancing step competes with fee markets;
- small synthetic positions become uneconomical;
- contract activation waits for block confirmation;
- interactive market-making requires more liquidity than the user-facing value
  transfer may justify.

Lightning already solves the payment-channel part of this problem. A channel can
hold a funding UTXO on-chain while many updates happen off-chain. A cDLC over
Lightning asks a specific question:

Can the condition "oracle attests outcome `x`" be represented as a Lightning
settlement condition, so that the channel update and the cDLC graph transition
use the same witness?

The answer is yes under two different encodings:

- HTLC mode: the witness is the oracle attestation scalar `s_x`, and the lock is
  `H(s_x)`;
- PTLC mode: the witness is the same scalar `s_x`, and the lock is the point
  `S_x = s_xG`.

The second mode is the native mathematical form. The first mode is the pragmatic
bridge to today's hash-lock Lightning.

## 2. Background

### 2.1 Oracle Attestations

Let the oracle secret key be `v` and public key:

```text
V = vG
```

For an event, the oracle announces a nonce:

```text
R = rG
```

For a finite outcome `x`, the challenge is:

```text
e_x = H_chal(R || V || x)
```

The later attestation scalar is:

```text
s_x = r + e_x v mod n
```

and its public point is known before the oracle signs:

```text
S_x = s_xG = R + e_x V
```

The cDLC observation is that `S_x` is computable before attestation, while
`s_x` is unknown until the oracle publishes the result. Therefore `S_x` can be
used as an adaptor point. After publication, `s_x` completes the adaptor
signature.

### 2.2 Lightning HTLCs

The current Lightning protocol uses HTLCs. In the BOLT model, a channel update
adds an HTLC identified by a payment hash, and the HTLC is fulfilled by
revealing a `payment_preimage`. The peer protocol specifies
`update_add_htlc`, `update_fulfill_htlc`, and failure/timeout messages. The
transaction layer uses scripts containing `payment_hash` checks.

Mathematically, an HTLC is:

```text
lock_h = H(p)
redeem(lock_h, w) = true iff H(w) = lock_h
```

where `p` is the preimage.

For a Lightning cDLC, choose:

```text
p = s_x
lock_h = H_pay(s_x)
```

This requires the oracle announcement to include `H_pay(s_x)` for each finite
outcome, or to commit to those hashes in a Merkle structure. Without that extra
hash commitment, a normal HTLC cannot be built from only `S_x`, because HTLCs
lock to hashes of bytes, not to elliptic-curve points.

### 2.3 Lightning PTLCs

PTLCs replace the hash lock with a point lock. A condition is locked to a point
`T`, and spending requires a signature/adaptor completion that reveals a scalar
`t` such that:

```text
T = tG
```

For a Lightning cDLC, choose:

```text
T = S_x
t = s_x
```

No additional oracle hash is required. The oracle's normal DLC announcement
already gives the point lock.

PTLCs also support per-hop point tweaking. If a downstream point is:

```text
T_i = t_iG
```

and a hop uses tweak `delta_i`, then the upstream point is:

```text
T_{i-1} = T_i + delta_iG
```

The upstream witness after downstream settlement is:

```text
t_{i-1} = t_i + delta_i
```

and therefore:

```text
t_{i-1}G = (t_i + delta_i)G = T_i + delta_iG = T_{i-1}
```

This preserves atomicity while allowing each hop to see a different point lock.

## 3. Definitions

Let:

```text
G       = generator of secp256k1
n       = group order
H_chal  = BIP340-style challenge hash domain
H_pay   = Lightning payment preimage hash domain
```

For each outcome `x`:

```text
e_x = H_chal(R || V || x)
s_x = r + e_x v mod n
S_x = R + e_x V
```

A Lightning cDLC edge is:

```text
E = (C_parent, x, C_child, amount, expiry, mode)
```

where:

- `C_parent` is the channel state or contract state before the outcome;
- `x` is the oracle outcome that activates the edge;
- `C_child` is the pre-negotiated child contract state;
- `amount` is the Lightning amount moved across the edge;
- `expiry` is the timeout boundary;
- `mode` is either `HTLC` or `PTLC`.

The lock for the edge is:

```text
Lock_HTLC(E) = H_pay(s_x)
Lock_PTLC(E) = S_x
```

The witness for both modes is:

```text
Witness(E) = s_x
```

The cDLC graph remains finite. Lightning is used to carry a state transition
whose unlocking condition is the same event witness already used by the cDLC.

## 4. HTLC Construction

### 4.1 Oracle Announcement Extension

For HTLC compatibility, the oracle announcement must contain, for each possible
outcome:

```text
x
R
V
S_x = R + H_chal(R || V || x)V
h_x = H_pay(s_x)
```

The oracle cannot reveal `s_x` before the event, but it can commit to `h_x`.
This creates a bridge from the point-based DLC world to the hash-based Lightning
world.

The announcement must be authenticated. A minimal announcement signs:

```text
event_id || R || V || MerkleRoot({x, S_x, h_x})
```

For a small finite outcome set, a flat list is acceptable. For price grids or
large enumerations, a Merkle commitment is required to avoid large invoices and
large announcements.

### 4.2 Hold-Invoice Settlement

The receiving side creates a Lightning invoice or internal channel HTLC with:

```text
payment_hash = h_x
```

The invoice is not settled immediately. It is held until the oracle publishes:

```text
s_x
```

When the oracle attests `x`, the receiver supplies `s_x` as the Lightning
preimage:

```text
H_pay(s_x) = h_x
```

The same scalar can then be used to complete the cDLC adaptor signature:

```text
sig = pre_sig + s_x mod n
```

Thus one oracle message activates both:

1. the Lightning transfer;
2. the child cDLC transition.

### 4.3 Correctness

**Theorem 1: HTLC settlement.**

Given:

```text
h_x = H_pay(s_x)
```

then:

```text
redeem_HTLC(h_x, s_x) = true
```

**Proof.**

By definition:

```text
redeem_HTLC(h_x, w) = (H_pay(w) = h_x)
```

Substitute `w = s_x`:

```text
H_pay(s_x) = h_x
```

which is true by construction.

**Theorem 2: HTLC outcome isolation.**

If:

```text
s_y != s_x
H_pay is injective for the modeled domain
```

then:

```text
redeem_HTLC(H_pay(s_x), s_y) = false
```

**Proof.**

If redemption were true:

```text
H_pay(s_y) = H_pay(s_x)
```

Injectivity implies:

```text
s_y = s_x
```

which contradicts `s_y != s_x`.

In production this is not literal mathematical injectivity of SHA256. It is the
standard preimage/collision-resistance assumption of HTLC systems. The SPARK
model proves the protocol identity under an ideal injective hash model; it does
not prove SHA256 cryptography.

### 4.4 Limits of HTLC Mode

HTLC mode is useful because it aligns with today's BOLT architecture, but it is
not the ideal NITI form.

It has four costs:

1. the oracle must precommit to `H_pay(s_x)`;
2. every finite outcome needs a hash commitment, directly or by Merkle proof;
3. the same preimage can correlate related HTLCs if reused across hops or
   channels;
4. normal wallet UX needs hold-invoice behavior, because the receiver does not
   know `s_x` until the oracle attests.

These costs are engineering tradeoffs, not algebraic failures.

## 5. PTLC Construction

### 5.1 Native Point Lock

In PTLC mode the lock is the normal DLC public attestation point:

```text
T_x = S_x = R + e_x V
```

The witness is:

```text
s_x = r + e_x v
```

Correctness follows immediately:

```text
s_xG = (r + e_xv)G
     = rG + e_xvG
     = R + e_xV
     = S_x
```

No `H_pay(s_x)` is needed.

### 5.2 Routed PTLCs

For a multi-hop path, the final receiver's condition can be `T_k = S_x`. Each
upstream hop applies a private tweak:

```text
T_{i-1} = T_i + delta_iG
```

When downstream settlement reveals `t_i`, the upstream hop computes:

```text
t_{i-1} = t_i + delta_i mod n
```

Then:

```text
t_{i-1}G = T_{i-1}
```

This means the same oracle result propagates atomically through a route, while
each hop can use a different point. Unlike repeated hash locks, point locks do
not require every hop to share the same visible hash.

### 5.3 Correctness

**Theorem 3: PTLC settlement.**

Given:

```text
T_x = S_x = s_xG
```

then:

```text
redeem_PTLC(T_x, s_x) = true
```

**Proof.**

By definition:

```text
redeem_PTLC(T, w) = (wG = T)
```

Substitute `T = s_xG` and `w = s_x`:

```text
s_xG = s_xG
```

**Theorem 4: PTLC outcome isolation.**

If:

```text
s_y != s_x
```

and scalar multiplication by `G` is injective modulo the group order, then:

```text
redeem_PTLC(S_x, s_y) = false
```

**Proof.**

If redemption were true:

```text
s_yG = S_x = s_xG
```

Injectivity in the prime-order group implies:

```text
s_y = s_x
```

which contradicts the premise.

**Theorem 5: Routed PTLC atomicity.**

Given:

```text
T_{i-1} = T_i + delta_iG
T_i = t_iG
t_{i-1} = t_i + delta_i
```

then:

```text
t_{i-1}G = T_{i-1}
```

**Proof.**

```text
t_{i-1}G
= (t_i + delta_i)G
= t_iG + delta_iG
= T_i + delta_iG
= T_{i-1}
```

The SPARK proof models this exact route identity over `Z/97Z`.

## 6. Channel-State Model

A Lightning channel state can be abstracted as:

```text
State = (Alice, Bob)
Alice + Bob = Capacity
```

For a payment from Alice to Bob:

```text
pay(State, amount) =
  (Alice - amount, Bob + amount)
```

with preconditions:

```text
amount >= 0
amount <= Alice
```

The cDLC edge settlement is:

```text
settle_HTLC(State, amount, lock, witness) =
  if redeem_HTLC(lock, witness)
  then pay(State, amount)
  else State
```

and:

```text
settle_PTLC(State, amount, lock, witness) =
  if redeem_PTLC(lock, witness)
  then pay(State, amount)
  else State
```

**Theorem 6: Capacity conservation.**

If:

```text
Alice + Bob = Capacity
amount <= Alice
```

then:

```text
(Alice - amount) + (Bob + amount) = Capacity
```

**Proof.**

By associativity and cancellation over integer balances:

```text
Alice - amount + Bob + amount
= Alice + Bob
= Capacity
```

The SPARK model proves the range checks and the postcondition that the resulting
state is valid.

## 7. cDLC Graph Activation

The parent contract and child contract are pre-negotiated. Lightning does not
create the child contract by itself; it carries the conditional transition that
allows the already prepared child edge to become live.

Define:

```text
activate_child(prepared, lock, witness) =
  prepared AND redeem(lock, witness)
```

For HTLC mode:

```text
activate_child_HTLC(prepared, H_pay(s_x), s_x) = prepared
```

For PTLC mode:

```text
activate_child_PTLC(prepared, S_x, s_x) = prepared
```

For a wrong outcome secret `s_y != s_x`:

```text
activate_child_HTLC(true, H_pay(s_x), s_y) = false
activate_child_PTLC(true, S_x, s_y) = false
```

This is the off-chain equivalent of the original NITI bridge transaction: the
bridge is now a Lightning conditional update rather than a new on-chain UTXO.

## 8. Timeout and Refund

The timeout condition is outside the oracle algebra but inside the channel
contract. The abstract rule is:

```text
refund(redeemed, expired) = expired AND NOT redeemed
```

Therefore, if the wrong outcome secret is presented and the HTLC/PTLC expires:

```text
redeem(lock_x, s_y) = false
refund(redeem(lock_x, s_y), true) = true
```

This models the important safety property: an unfulfilled Lightning cDLC edge
does not silently transfer value. It either settles with the correct oracle
attestation scalar or expires back according to the channel rules.

The model does not prove all real-world timeout details: CLTV deltas, mempool
conditions, force-close race handling, fee bumping, watchtower behavior, and
implementation-specific channel recovery remain outside this paper.

## 9. SPARK/Ada Verification

The formal model is in:

```text
spark/src/lightning_cdlc_algebra.ads
spark/src/lightning_cdlc_algebra.adb
spark/lightning_cdlc_proofs.gpr
```

The proof command is:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/lightning_cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

The model proves:

- the oracle attestation scalar maps to the public attestation point;
- an oracle scalar can redeem the HTLC lock made from its hash;
- a wrong scalar cannot redeem that HTLC in the ideal hash model;
- an oracle scalar can redeem the PTLC lock made from its point;
- a wrong scalar cannot redeem that PTLC in the scalar-embedding model;
- a PTLC route tweak preserves atomicity;
- a wrong routed scalar cannot redeem the tweaked upstream point;
- a prepared child contract activates exactly when the parent condition redeems;
- wrong secrets do not activate child contracts;
- expired wrong-secret paths refund in the abstract timeout model;
- channel payments conserve capacity;
- correct HTLC/PTLC witnesses move channel balance;
- wrong HTLC/PTLC witnesses leave channel balance unchanged.

The model intentionally uses `type mod 97`, not the full secp256k1 order. This
is normal for a diagnostic algebra proof: the goal is to prove the protocol
identities in a finite modular ring small enough for automated verification.
The production curve inherits the same algebraic shape under the standard group
assumptions, but the SPARK target is not a replacement for a cryptographic proof
of secp256k1 or SHA256.

No proof in this repository claims to verify:

- BOLT implementation correctness;
- SHA256 preimage or collision resistance;
- BIP340 implementation correctness;
- network liveness;
- fee market behavior;
- channel force-close safety;
- watchtower behavior;
- liquidity availability;
- PTLC deployment across public Lightning nodes;
- economic stability of synthetic assets.

These limits matter. The paper proves the conditional-settlement algebra, not a
complete financial system.

## 10. Deployment Modes

### 10.1 Mode A: HTLC cDLC over Current Lightning Primitives

This mode uses existing hash-lock channel semantics.

Requirements:

- oracle announcement includes `h_x = H_pay(s_x)` for each finite outcome;
- the receiver can create a hold invoice or equivalent unresolved HTLC;
- the contract engine maps oracle outcomes to payment hashes;
- the application waits for oracle attestation before fulfilling the invoice.

Flow:

1. Parties choose the cDLC edge `(parent, x, child)`.
2. Oracle announcement supplies `S_x` and `h_x`.
3. Receiver creates Lightning condition with `payment_hash = h_x`.
4. Parent cDLC state is prepared with adaptor point `S_x`.
5. Oracle attests `x` by publishing `s_x`.
6. Receiver fulfills HTLC using `s_x`.
7. The same `s_x` completes the cDLC adaptor signature.
8. Child cDLC state becomes active.

This is the most practical first prototype path, because it can be tested using
current Lightning implementations that support hold invoices.

### 10.2 Mode B: PTLC cDLC over Taproot/PTLC Lightning

This mode is the protocol-native form.

Requirements:

- channel implementation supports PTLCs or adaptor-signature point locks;
- oracle announcement supplies normal DLC points `S_x`;
- route construction supports per-hop point tweaks;
- settlement reveals or derives the scalar witness for each hop.

Flow:

1. Parties choose the cDLC edge `(parent, x, child)`.
2. Oracle announcement supplies `S_x`.
3. Receiver creates PTLC lock `T_x = S_x`.
4. Each route hop tweaks the point as needed.
5. Oracle publishes `s_x`.
6. Downstream settlement reveals `s_x` or a tweaked scalar.
7. Each upstream hop computes its own tweaked witness.
8. The cDLC adaptor signature completes with the relevant scalar.
9. Child cDLC state becomes active.

This is the cleaner design because it avoids hash precommitments and reduces
cross-hop correlation.

### 10.3 Mode C: Hybrid Channel Peer Prototype

Before broad PTLC deployment, a two-party channel peer prototype can combine:

- HTLC settlement for Lightning compatibility;
- local adaptor signatures between the two peers;
- oracle hash precommitments for invoice settlement;
- oracle points for local cDLC graph activation.

This does not require convincing the whole network to route PTLCs. It is a good
engineering bridge for a testnet proof of concept.

## 11. Practical Implications

Lightning cDLCs move NITI from "each contract transition may need an on-chain
transaction" to "many contract transitions can be channel updates." That changes
the UX envelope:

- smaller notional positions become practical;
- synthetic exposure can rebalance more frequently;
- market makers can quote with lower operational friction;
- users do not need to wait for every intermediate Bitcoin confirmation;
- the on-chain footprint can be limited to channel open, splice, cooperative
  close, or dispute close.

This does not remove collateral, oracle, liquidity, or legal risk. It changes
where the conditional settlement happens.

## 12. Open Problems

The most important open engineering problems are:

1. standardized oracle announcements containing both `S_x` and `H_pay(s_x)`;
2. compact outcome commitments for large price grids;
3. wallet APIs for hold-invoice cDLC settlement;
4. robust timeout selection across cDLC expiries and Lightning CLTV deltas;
5. privacy analysis for repeated oracle-linked HTLC hashes;
6. PTLC implementation status across Lightning clients;
7. route construction for point-tweaked cDLC conditions;
8. liquidity management for multi-step synthetic positions;
9. failure recovery when the oracle attests close to timeout;
10. multi-oracle threshold attestations for reducing oracle trust.

These are not reasons the algebra fails. They are the work needed to turn the
algebra into production infrastructure.

## 13. Conclusion

The cDLC activation scalar can be used as a Lightning settlement witness.

For current HTLC Lightning, the price is an additional oracle commitment:

```text
h_x = H_pay(s_x)
```

With that commitment, the oracle's future scalar `s_x` is both:

```text
the Lightning HTLC preimage
the cDLC adaptor-completion scalar
```

For PTLC Lightning, no hash bridge is required:

```text
S_x = s_xG
```

The oracle's normal DLC attestation point is already the payment lock.

Therefore the core NITI idea survives the move from on-chain bridge
transactions to Lightning channel updates. The mathematical statement is not
"all Lightning wallets support this today." The mathematical statement is:

```text
one oracle scalar can simultaneously settle a Lightning condition
and activate the next cDLC edge.
```

That statement is proved in the repository's SPARK/Ada model.

## 14. References

- [NITI complete whitepaper](WHITEPAPER.md)
- [NITI cDLC technical note](research/cdlc-technical-note.md)
- [SPARK Lightning cDLC proof model](spark/src/lightning_cdlc_algebra.ads)
- [BOLT #2: Peer Protocol for Channel Management](https://github.com/lightning/bolts/blob/master/02-peer-protocol.md)
- [BOLT #3: Bitcoin Transaction and Script Formats](https://github.com/lightning/bolts/blob/master/03-transactions.md)
- [BOLT #4: Onion Routing Protocol](https://github.com/lightning/bolts/blob/master/04-onion-routing.md)
- [BOLT #11: Invoice Protocol for Lightning Payments](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
- [BIP340: Schnorr Signatures for secp256k1](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [Bitcoin Optech: Point Time Locked Contracts](https://bitcoinops.org/en/topics/ptlc/)
- [Bitcoin Optech: Adaptor Signatures](https://bitcoinops.org/en/topics/adaptor-signatures/)
