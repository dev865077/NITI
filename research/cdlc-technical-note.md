# Cascading Discreet Log Contracts

## Abstract

This paper describes a construction for Cascading Discreet Log Contracts, or cDLCs. A cDLC is a finite graph of ordinary Bitcoin transactions in which the attestation secret revealed by the oracle of one DLC completes adaptor signatures that activate another DLC. The construction requires no new opcode, no covenant, and no on-chain awareness of the contract graph. Cascading activation is obtained by using the future oracle signature of a parent contract as the hidden scalar of the adaptor signatures that spend a parent outcome output into the funding output of a child contract.

The construction is native to Bitcoin in the same sense as a DLC is native to Bitcoin: the blockchain validates only ordinary signatures and timelocks, while the contract semantics are kept off-chain by pre-signed transactions and oracle attestations.

## 1. Notation

Let `G` be the generator of the secp256k1 group of order `n`. Lowercase letters are scalars modulo `n`; uppercase letters are curve points. For a scalar `x`, `X = xG`. Let `H` be a tagged hash interpreted as a scalar modulo `n`.

A BIP340 Schnorr signature for message `m` under public key `P = pG` is a pair `(R, s)` satisfying

```text
sG = R + H(R || P || m)P.
```

An oracle has signing key `v`, public key `V = vG`, and commits to a one-time nonce point `R_o = r_oG` for an event. For outcome `x`, define

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_x V.
```

Before the event, everyone can compute `S_x` for each possible outcome `x`, but nobody except the oracle knows `s_x`. After the event, the oracle attests by publishing `s_x`. The scalar `s_x` is the transferable fact that makes DLCs possible.

## 2. Signature Adaptors

Let `T = tG` be a public point whose discrete logarithm `t` is unknown. To create an adaptor signature for message `m` under key `P = pG`, the signer chooses nonce `r`, computes

```text
R = rG
R* = R + T
e = H(R* || P || m)
ŝ = r + ep mod n.
```

The adaptor is `(R*, T, ŝ)`. It can be checked without knowing `t`:

```text
ŝG = R* - T + eP.
```

It is not yet a valid Schnorr signature. If `t` is later revealed, anyone holding the adaptor can compute

```text
s = ŝ + t mod n.
```

Then `(R*, s)` is valid because

```text
sG = (ŝ + t)G
   = (R* - T + eP) + T
   = R* + eP.
```

Conversely, a completed signature reveals the hidden scalar to anyone who knows the adaptor:

```text
t = s - ŝ mod n.
```

## 3. A DLC as a Conditional Signature Source

In a regular DLC, Alice and Bob lock funds into a funding output and prepare a set of Contract Execution Transactions, or CETs. Each CET corresponds to an outcome `x` and pays according to a payout function `π(x)`.

For each outcome `x`, the parties use the oracle attestation point `S_x` as the adaptor point for the CET signatures. The CET for `x` cannot be completed until the oracle publishes `s_x`. Once `s_x` is published, the CET for `x` becomes executable.

Thus a DLC does more than choose a payout. It also emits a scalar:

```text
resolve(DLC, x) -> s_x.
```

This scalar is public after resolution, unpredictable before resolution, and bound to a specific oracle event and outcome. A cDLC uses this scalar as the activation secret for another transaction.

## 4. cDLC Construction

A cDLC is a finite directed graph

```text
Γ = (N, E)
```

where each node `C_i in N` is a DLC and each directed edge

```text
e = (C_i, x, C_j)
```

means: if contract `C_i` resolves to outcome `x`, activate contract `C_j`.

For each edge `e = (C_i, x, C_j)`, the parties construct a bridge transaction `B_e`. This transaction spends a designated output of the parent CET `CET_{i,x}` and creates the funding output of the child DLC `C_j`.

The parent CET contains an edge output `O_e`. That output is spendable by signatures from the required cDLC participants, with a timelocked refund path. The bridge transaction `B_e` spends `O_e` into the child funding output `F_j`.

The child contract `C_j` is negotiated before the parent resolves. Its CETs and refund transaction spend the funding output created by `B_e`. This is possible because the `txid` of `B_e` is known before its witness signatures are completed.

All signatures required by `B_e` are adaptor signatures using

```text
T_e = S_{i,x}.
```

For participant `a` with key `P_a = p_aG`, let `m_e` be the sighash message for `B_e`. The participant creates

```text
R_a = r_aG
R*_a = R_a + S_{i,x}
e_a = H(R*_a || P_a || m_e)
ŝ_a = r_a + e_a p_a mod n.
```

The adaptor verifies as

```text
ŝ_aG = R*_a - S_{i,x} + e_aP_a.
```

If the oracle later publishes `s_{i,x}`, anyone holding the adaptor signatures can compute

```text
s_a = ŝ_a + s_{i,x} mod n
```

for every required signer `a`. The resulting signatures satisfy

```text
s_aG = R*_a + e_aP_a,
```

so `B_e` becomes a valid Bitcoin transaction.

If the parent resolves to a different outcome `y`, the oracle publishes `s_{i,y}`, not `s_{i,x}`. Under the discrete logarithm assumption and Schnorr unforgeability, the signatures for `B_e` remain incomplete.

## 5. Native Chaining

The bridge transaction spends an output of a future CET. This is possible because the transaction id of a SegWit or Taproot transaction does not include witness data. The parent CET can be fully specified before its witness signatures are completed, so its `txid` and output index are known before the oracle attests.

Therefore the bridge and the child DLC can be constructed before the parent CET is broadcast:

```text
Funding_i -> CET_{i,x} -> B_e -> Funding_j.
```

The signatures for `B_e` are incomplete until the parent outcome is attested. The child CETs are also incomplete until the child oracle attests. The composition is a pre-signed transaction graph whose edges are unlocked by oracle scalars.

Bitcoin sees only valid transactions and signatures. The chain of meaning is off-chain:

```text
oracle signs x
=> s_{i,x} is revealed
=> CET_{i,x} becomes executable
=> bridge B_e signatures become completable
=> child DLC C_j becomes funded
```

## 6. Security Claims

### Claim 1: Conditional Activation

For an edge `e = (C_i, x, C_j)`, the child bridge `B_e` cannot be completed before `s_{i,x}` is known, except by forging a Schnorr signature or solving the discrete logarithm of `S_{i,x}`.

Proof. Each required signature on `B_e` is an adaptor signature with adaptor point `S_{i,x}`. A valid completed signature is `s_a = ŝ_a + s_{i,x}`. Without `s_{i,x}`, completing the signature requires producing a valid Schnorr signature for `m_e` under `P_a`, contradicting Schnorr unforgeability, or finding the discrete logarithm of `S_{i,x}`.  

### Claim 2: Public Completion After Resolution

If the oracle publishes `s_{i,x}`, any party holding the bridge adaptors can complete `B_e`.

Proof. For every required signature, compute `s_a = ŝ_a + s_{i,x} mod n`. The adaptor verification equation gives `ŝ_aG = R*_a - S_{i,x} + e_aP_a`. Since `S_{i,x} = s_{i,x}G`,

```text
s_aG = (ŝ_a + s_{i,x})G
     = R*_a + e_aP_a.
```

Thus `(R*_a, s_a)` is a valid Schnorr signature.  

### Claim 3: Outcome Isolation

If the oracle signs outcome `y != x`, the bridge for edge `(C_i, x, C_j)` is not activated by `s_{i,y}`.

Proof. The bridge signatures are adapted to `S_{i,x}`. Completing them with `s_{i,y}` gives

```text
(ŝ_a + s_{i,y})G
  = R*_a - S_{i,x} + e_aP_a + S_{i,y}.
```

This equals `R*_a + e_aP_a` only if `S_{i,y} = S_{i,x}`. With unique oracle nonces and collision-resistant tagged hashes, this does not occur except with negligible probability or oracle equivocation.  

## 7. Refunds and Failure Modes

Each edge output `O_e` should include a timelocked refund path. If the parent outcome occurs but the bridge transaction is not broadcast before a deadline, the funds return according to a fallback policy agreed by the parties.

The construction assumes:

```text
1. The oracle does not sign conflicting outcomes for the same nonce.
2. The oracle eventually publishes the attestation for the event.
3. Parties retain the pre-signed transactions and adaptor signatures.
4. Fee rates are handled by CPFP, anchor outputs, or pre-agreed fee reserves.
5. Timelocks are ordered so parent settlement, bridge activation, and child refunds do not race.
```

If the oracle signs multiple outcomes, multiple branches can become executable. This is not unique to cDLCs; it is the standard oracle equivocation failure of DLCs. The oracle's conflicting signatures are cryptographic evidence of fault.

## 8. Graph Discipline

The simplest safe cDLC graph is acyclic. Cycles require state updates and revocation logic and should be treated as a separate protocol.

For a finite acyclic graph, the number of bridge transactions is

```text
|E| = sum_i active_edges(C_i).
```

The construction does not remove the known DLC state-size problem. Numeric outcome compression, payout interpolation, and multi-oracle threshold attestations remain applicable to each node.

## 9. Applications

A cDLC can express rolling contracts, automatic re-hedging, periodic synthetic exposure, and conditional refinancing. A synthetic asset can be represented as a sequence of DLC positions whose next funding transaction is activated by the settlement of the previous position.

This does not eliminate oracle risk, liquidity risk, or collateral risk. It also does not create a global account-based token inside Bitcoin. It creates native Bitcoin UTXO contracts whose continuation is controlled by oracle-revealed scalars.

## 10. Conclusion

A DLC already contains a hidden scalar that becomes public only when a specific real-world outcome is attested. A cDLC uses that scalar twice: first to settle the parent contract, and second to complete adaptor signatures that fund the next contract.

The core equation is:

```text
S_x = R_o + H(R_o || V || x)V
s_xG = S_x
s_a = ŝ_a + s_x
```

This is sufficient to build a graph of conditional Bitcoin transactions in which one DLC outcome activates another DLC without new consensus rules. The construction is composable because the oracle attestation secret is a reusable adaptor secret, and it is discreet because the blockchain validates only ordinary transaction signatures.

## References

1. Thaddeus Dryja, "Discreet Log Contracts", MIT Digital Currency Initiative: https://adiabat.github.io/dlc.pdf
2. BIP340, "Schnorr Signatures for secp256k1": https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
3. Discreet Log Contract interoperability specifications: https://github.com/discreetlogcontracts/dlcspecs
4. Bitcoin Optech, "Adaptor signatures": https://bitcoinops.org/en/topics/adaptor-signatures/
