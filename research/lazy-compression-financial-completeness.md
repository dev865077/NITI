# Financial Turing Completeness Of cDLCs With Lazy Compression

## Abstract

Cascading Discreet Log Contracts with Lazy Compression are financially Turing
complete in the bounded expressiveness sense defined here: they form a
universal representation layer for computable, collateral-bounded financial
contracts. The claim is not that Bitcoin Script executes arbitrary programs,
and not that an infinite transaction graph is committed at inception. The claim
is that a financial contract whose next state and terminal payoff are
computable from an oracle stream can be represented as a sequence of local cDLC
state transitions, while Lazy Compression retains only the live compressed
state classes needed for the current preparation window.

## Model

Let `Sigma` be a finite oracle alphabet. A financial state is

```text
z = (q, m, a, b, r)
```

where `q` is finite control, `m` is the finite encoded contract memory, `a` is
Alice's claim, `b` is Bob's claim, and `r` is fee/reserve collateral. The funded
collateral is conserved:

```text
a + b + r = T.
```

A computable financial contract is represented by two computable functions:

```text
delta : Z x Sigma -> Z
sigma : Z -> Option (A_payout, B_payout)
```

`delta` is the next-state function. `sigma` is defined only at terminal states.
Every terminal payout must satisfy:

```text
A_payout + B_payout <= T.
```

The model covers finite-horizon contracts directly and covers path-dependent
contracts by including accumulated path state inside `m`. A non-computable
payoff rule is outside the claim, as no protocol can compile it into finite
transaction templates.

## cDLC Step

For a current compressed state class `kappa(z)`, each oracle outcome `x` has a
compiled branch:

```text
B_(kappa(z),x) : z -> delta(z,x).
```

The branch is implemented by a cDLC bridge whose adaptor point is the oracle
attestation point for `x`. When the oracle publishes `s_x`, the bridge becomes
spendable and funds the child state. A different outcome scalar does not
complete the same branch under the cDLC outcome-isolation claim.

The balance update inside the branch is a signed financial flow:

```text
Alice gains d:  (a,b,r) -> (a+d,b-d,r)
Bob gains d:    (a,b,r) -> (a-d,b+d,r)
No flow:        (a,b,r) -> (a,b,r)
```

Each update is defined only when the paying side has enough collateral. Thus
positive and negative financial flows are represented as conservative
redistributions of funded sats.

## Lazy Compression

Lazy Compression separates histories from continuation state. Two oracle
histories `h1` and `h2` are financially equivalent when they produce the same
compressed state:

```text
kappa(z(h1)) = kappa(z(h2)).
```

Equivalent compressed states share the same continuation template. The protocol
therefore does not need to retain a separate continuation for every path. It
retains the compressed state classes in the current preparation window and
materializes the next window as execution advances.

The already-proved Lazy cDLC targets establish the finite-window facts used
here: prepared in-window edges can activate, unrelated future materialization
is not required for an already prepared edge, retained state is bounded by the
window, recombination and per-node compression do not increase retained state,
and missing preparation or timing gates select fallback.

## Theorem

For every computable, collateral-bounded financial contract over oracle streams,
there exists a cDLC family with Lazy Compression that implements the contract's
terminal payoff on every terminating execution path for which the required
window materialization and oracle attestations occur.

In this sense, cDLCs with Lazy Compression are financially Turing complete.

## Proof

Let `F` be a computable, collateral-bounded financial contract. Since `F` is
computable, there is a finite program computing its transition and terminal
payoff functions. Encode the program counter, working memory, and current
funded balances as a financial state `z`.

For each compressed state class `kappa(z)` and oracle outcome `x`, compile one
cDLC branch for the transition `delta(z,x)`. The branch's bridge transaction is
adapted to the oracle attestation point for `x`. The child funding output
contains the collateral distribution for `delta(z,x)`.

Correctness follows by induction on the oracle prefix.

Base case: the seed cDLC represents the initial financial state.

Inductive step: assume the active cDLC represents state `z`. If the oracle
attests outcome `x`, the cDLC adaptor algebra makes exactly the prepared branch
for `x` completable. The branch funds the child state `delta(z,x)`. The SPARK
model `lazy_cdlc_financial_completeness_algebra` proves that the compiled
financial flow preserves total funded collateral and moves to the intended
compressed target class. Lazy Compression permits later histories that reach
the same compressed class to share the same continuation template.

Termination: if `sigma(z)` is defined, the terminal CET pays the stated
collateral-conserving payout. The SPARK model proves the terminal conservation
predicate for the funded state.

Therefore every terminating execution path receives the same payout as the
computable financial contract. Since `F` was arbitrary within the stated class,
cDLCs with Lazy Compression are financially complete for computable,
collateral-bounded financial contracts.

## Scope

The theorem is an expressiveness result. It does not claim practical
efficiency, infinite storage, guaranteed liveness, oracle truth, mempool
confirmation, wallet safety, or legal/economic suitability.

The phrase "financially Turing complete" is used in this bounded sense:

```text
Any computable financial transition and terminal payoff can be represented by
a cDLC family with Lazy Compression, provided the payoff is collateral-bounded
and the required windows are prepared before use.
```

This is distinct from saying that Bitcoin consensus rules become general
purpose computation. Bitcoin still validates ordinary signatures, timelocks,
and transaction spends. The computation is represented by off-chain template
selection and oracle-conditioned state transition.

## Machine-Checked Companion

The SPARK target
`spark/lazy_cdlc_financial_completeness_proofs.gpr` proves the finite algebraic
obligations used by the theorem:

- no-flow branches preserve balances;
- Alice-positive flows are Bob-negative flows;
- Bob-positive flows are Alice-negative flows;
- prepared matching branches activate;
- wrong outcomes do not activate the branch;
- unprepared matching branches fall back;
- compiled steps preserve total funded collateral and move to the target state
  class;
- equivalent compressed states share the same continuation template;
- prepared in-window branches are executable;
- out-of-window descendants are not claimed as prepared;
- terminal payout accounting conserves total funded collateral.

The proof target does not prove the external computability theorem itself,
secp256k1, BIP340, SHA-256, oracle truth, Bitcoin relay, or production wallet
safety. It proves the local algebra that makes the cDLC representation faithful
once a computable transition has been compiled into prepared branches.
