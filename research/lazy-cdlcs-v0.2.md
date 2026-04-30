# Lazy Graph Preparation for Cascading Discreet Log Contracts

Research draft, v0.2.

## Abstract

Cascading Discreet Log Contracts, or cDLCs, use the oracle attestation scalar
revealed by a parent DLC outcome to complete adaptor signatures on a bridge
transaction that funds a child DLC. The base construction is intentionally
conservative: every spendable child edge must be prepared before the parent
outcome is known.

That requirement gives the construction a clear safety boundary, but it also
creates a practical state problem. Deep financial graphs can require many
future continuation states to be negotiated, signed, stored, and protected long
before those states are economically relevant.

This draft proposes lazy graph preparation. Instead of materializing the full
future graph at genesis, the parties maintain a sliding preparation window. The
currently active node and the next live continuation states are prepared in
advance; more distant states are prepared only as time passes and the reachable
state space becomes narrower.

The core claim is narrow: lazy preparation does not change the cDLC adaptor
activation algebra. If a bridge is prepared against the parent outcome point
`S_{i,x}`, then publication of the matching oracle scalar `s_{i,x}` completes
that bridge, and a non-matching scalar does not. This claim is local to the
edge. It does not depend on whether unrelated future nodes have already been
materialized.

Lazy preparation does not solve liveness by itself. It turns the full-graph
preparation burden into a bounded-window protocol requirement. If the next
continuation state is not prepared before the current node can resolve, the
contract must fall back to a terminal settlement, refund, liquidation, unwind,
or other non-roll branch.

## 1. Base Construction Recap

Let `C_i` be a parent DLC, `x` an outcome of `C_i`, and `C_j` a child DLC. A
cDLC edge is:

```text
e = (C_i, x, C_j)
```

The parent CET for outcome `x` creates an edge output `O_e`. The bridge
transaction `B_e` spends `O_e` and creates the funding output of `C_j`.

For the oracle event of `C_i`, the oracle has public key `V` and committed
nonce point `R_o`. For outcome `x`:

```text
S_{i,x} = R_o + H(R_o || V || x)V
S_{i,x} = s_{i,x}G
```

The bridge signatures for `B_e` are adaptor signatures using `S_{i,x}` as the
adaptor point. If a participant has adaptor scalar `s_hat`, then publication
of the oracle scalar completes the signature:

```text
s = s_hat + s_{i,x} mod n
```

The completed signature verifies because:

```text
sG = R* + cP
```

This is the only cDLC fact needed for lazy preparation. The timing of unrelated
future graph construction is not part of the signature equation.

## 2. Mathematical Model

Let a cDLC graph be a finite directed outcome graph:

```text
Gamma = (N, E)
```

Each node `C_i in N` is a DLC state. Each directed edge is:

```text
e = (i, x, j) in E
```

meaning that outcome `x` of node `C_i` funds child node `C_j`.

For every node `C_i`, let:

```text
X_i       = finite outcome set of C_i
Live_i    = subset of X_i whose outcomes are intended to continue
Term_i    = X_i \ Live_i
next_i(x) = child index j for continuation outcome x in Live_i
```

For `x in Live_i`, the continuation edge is:

```text
e_{i,x} = (i, x, next_i(x)).
```

For `x in Term_i`, the outcome does not require a child funding path. It must
settle through an already-defined terminal, refund, liquidation, or unwind
path.

Define a preparation predicate:

```text
Prepared(e, t) in {true, false}
```

`Prepared(e, t) = true` means that by time `t`, the parties have enough retained
state to execute edge `e` if its parent outcome occurs. At minimum this means:

```text
parent CET output O_e is defined
bridge transaction B_e is defined
child funding output F_j is defined
required bridge adaptor signatures verify against S_{i,x}
child spend policy or fallback from F_j is defined
state needed to broadcast or audit those transactions is retained
```

Let `rho_i` be the earliest time at which `C_i` can become forced by oracle
attestation or timeout into settlement. The lazy safety precondition for node
`C_i` is:

```text
For all x in Live_i:
  Prepared(e_{i,x}, rho_i^-) = true.
```

Here `rho_i^-` means before the resolution point of `C_i`. The condition is
strictly about preparation before resolution. It does not require the entire
future graph below `C_{next_i(x)}` to exist.

For window depth `K >= 1`, define the window around active node `C_i` by graph
distance:

```text
W_i(K) = { C_j in N : distance(C_i, C_j) < K }.
```

This convention counts the active node. Thus `K = 1` contains only `C_i`; a
one-step continuation window needs `K >= 2`.

A lazy schedule is valid at `C_i` when every live edge leaving every non-terminal
node inside the active window, except those beyond the window boundary, is
prepared before its parent can resolve:

```text
ValidWindow(i, K) iff
  for every C_u in W_i(K):
    for every x in Live_u:
      if C_{next_u(x)} in W_i(K)
      then Prepared(e_{u,x}, rho_u^-) = true.
```

This is only a safety predicate for already-windowed states. A separate
extension rule is needed to make the window move:

```text
Extend(i, K):
  after C_i resolves into C_j,
  prepare the boundary successors needed so that ValidWindow(j, K) holds.
```

`Extend` is the liveness problem. The adaptor algebra proves edge activation
when `Prepared` holds. It does not prove that `Extend` will always succeed.

## 3. The State Explosion Problem

The base cDLC construction requires each spendable child edge to be prepared
before its parent can resolve. That gives every live edge a clear Bitcoin
execution path, but it can make deep graphs expensive to hold.

There is no single universal asymptotic formula for this cost. It depends on
the graph topology and the financial state representation.

In a non-recombining tree, where each outcome leads to a distinct future state
that never merges with other states, the number of reachable nodes can grow
exponentially with depth. In a recombining structure, such as a grid of price
bands or a state machine with bounded accounting variables, different paths may
merge into the same future state and the growth can be much slower.

The practical problem is therefore not merely "many outcomes." It is the
combination of three burdens:

```text
total lifetime negotiation work
maximum live retained state
per-window signing and storage burden
```

Full eager preparation moves future work to the start of the contract. It asks
the parties to negotiate and retain all reachable continuation states before
many of those states are relevant. That is a poor fit for financial contracts
whose terms are rolled, marked to market, re-margined, or repriced over time.

## 4. Lazy Graph Preparation

Lazy graph preparation keeps only a bounded continuation window live.

Let the active node be `C_i`. For window depth `K >= 1`, define:

```text
W_i = {C_i, C_{i+1}, ..., C_{i+K-1}}
```

The exact meaning of `C_{i+1}` is product-specific. It may be the next monthly
loan state, the next forward period, the next volatility observation state, or
another continuation state. The important property is that the next state which
can receive funds from `C_i` has already been negotiated.

The minimum preparation invariant is:

```text
Before C_i can resolve, every continuation edge from C_i that is intended to
remain live has its child funding path prepared.
```

When `C_i` resolves to outcome `x`:

```text
1. The oracle publishes s_{i,x}.
2. The bridge B_e for e = (C_i, x, C_{next_i(x)}) is completed.
3. C_{next_i(x)} becomes the active funded state.
4. The parties attempt to extend the window by preparing C_{i+K}.
```

This construction changes when graph nodes are materialized. It does not
change how an edge is activated.

## 5. Edge-Local Safety Claims

The safety claim is local.

Let `B_e` be a bridge transaction for edge:

```text
e = (C_i, x, C_j)
```

Assume `B_e` has valid adaptor signatures whose adaptor point is:

```text
T_e = S_{i,x}
```

Then publication of `s_{i,x}` completes `B_e`. For a different outcome `y`,
publication of `s_{i,y}` does not complete `B_e`, except under the ordinary
failure assumptions of the base cDLC construction: oracle equivocation, nonce
misuse, hash collision in the outcome construction, Schnorr forgery, or
discrete-log break.

The timing of unrelated future graph preparation is irrelevant to this
statement. The bridge verifies against its own transaction message, signer key,
adapted nonce, adaptor point, and oracle scalar. If those objects are fixed
before resolution, the edge behaves like any other cDLC edge.

Lazy preparation therefore preserves cryptographic activation safety for
already-prepared edges:

```text
prepared edge + matching scalar -> completed bridge
prepared edge + wrong scalar    -> rejected bridge
```

It does not prove that future edges will be prepared in time. That is a
liveness property, not an adaptor-signature property.

### Claim 1: Local Completion

For an edge `e = (i, x, j)`, assume the bridge adaptor signature satisfies:

```text
c = H(R* || P || m_e)
s_hat G = R* - S_{i,x} + cP
S_{i,x} = s_{i,x}G
s = s_hat + s_{i,x} mod n
```

Then `(R*, s)` is a valid Schnorr signature for the bridge message.

Proof:

```text
sG = (s_hat + s_{i,x})G
   = s_hat G + S_{i,x}
   = (R* - S_{i,x} + cP) + S_{i,x}
   = R* + cP.
```

The proof mentions only the local edge data:

```text
(B_e, P, R*, s_hat, S_{i,x}, s_{i,x}).
```

It does not mention any descendant of `C_j`.

### Claim 2: Wrong-Outcome Isolation

For `y != x`, completing the same adaptor with `s_{i,y}` gives:

```text
s' = s_hat + s_{i,y} mod n
```

The signature verifies only if:

```text
S_{i,y} = S_{i,x}.
```

Proof:

```text
s'G = (s_hat + s_{i,y})G
    = s_hat G + S_{i,y}
    = R* - S_{i,x} + cP + S_{i,y}.
```

For `(R*, s')` to verify, it must satisfy:

```text
s'G = R* + cP.
```

Therefore:

```text
R* - S_{i,x} + cP + S_{i,y} = R* + cP
S_{i,y} = S_{i,x}.
```

Under the ordinary cDLC assumptions, distinct non-equivocated outcomes do not
produce the same attestation point except with negligible probability. Thus
`s_{i,y}` does not complete `B_e`.

### Claim 3: Materialization Independence

Let two preparation schedules `M` and `M'` have identical local edge data for
`e = (i, x, j)`:

```text
B_e^M       = B_e^{M'}
P^M         = P^{M'}
R*^M        = R*^{M'}
s_hat^M     = s_hat^{M'}
S_{i,x}^M   = S_{i,x}^{M'}
s_{i,x}^M   = s_{i,x}^{M'}
```

They may differ on all unrelated future nodes:

```text
C_k^M may differ from C_k^{M'} for k not in {i, j}.
```

Then bridge completion for `e` is identical under `M` and `M'`.

Proof: by Claim 1, bridge validity is a function only of:

```text
f(B_e, P, R*, s_hat, S_{i,x}, s_{i,x}).
```

All inputs to `f` are equal under `M` and `M'`. Therefore the completed bridge
signature is valid or invalid identically under both schedules. Unrelated
future graph materialization is not an input to the verification equation.

### Claim 4: Conditional Lazy Safety

If node `C_i` satisfies:

```text
For all x in Live_i:
  Prepared(e_{i,x}, rho_i^-) = true
```

then every live continuation outcome of `C_i` has an executable prepared bridge
at resolution, assuming the oracle publishes the matching scalar and ordinary
Bitcoin transaction assumptions hold.

Proof: take any `x in Live_i`. By the precondition, `e_{i,x}` is prepared before
`C_i` resolves. By Claim 1, publication of `s_{i,x}` completes the bridge for
`e_{i,x}`. By Claim 2, non-matching outcome scalars do not complete that bridge.
Since the argument holds for arbitrary `x in Live_i`, it holds for all live
continuation outcomes of `C_i`.

This is conditional safety, not progress. If the precondition is false, the
claim does not apply.

## 6. Proof Boundary

Lazy cDLCs inherit the proof boundary of the base construction.

The existing cDLC algebra proves a modeled statement of the form:

```text
S_x = s_xG
s_hat G = R* - S_x + cP
s = s_hat + s_x mod n
sG = R* + cP
```

Lazy preparation does not add a new cryptographic equation. It adds a protocol
discipline around when the parties must prepare the next edge.

The lazy claim does not prove:

- secp256k1 implementation correctness;
- BIP340 implementation correctness;
- SHA-256 or tagged-hash security;
- Bitcoin transaction serialization or sighash correctness;
- mempool relay, package relay, fee bumping, or confirmation;
- production wallet key management;
- full bilateral DLC negotiation;
- online availability of both parties;
- oracle operations or future nonce scheduling;
- economic solvency of a financial product.

The most that the local safety argument supports is:

```text
If an edge has been prepared correctly, then lazy materialization of unrelated
future edges does not weaken that edge's activation isolation.
```

## 7. Liveness and Fallback

Lazy cDLCs do not guarantee indefinite continuation.

The minimum liveness condition is:

```text
C_{i+1} must be fully prepared before C_i reaches the point where its oracle
attestation can force settlement.
```

If that condition is not met, `C_i` cannot safely rely on a continuation edge.
The contract must instead expose a fallback path. Depending on the product,
that path may be:

- terminal settlement;
- timelocked refund;
- liquidation;
- unwind at a defined payoff;
- non-roll continuation with reduced rights;
- dispute or manual closeout path outside the cDLC graph.

This is not a defect in the adaptor algebra. It is the real cost of replacing
full upfront graph materialization with progressive preparation.

The fallback path must be economically meaningful. A lazy protocol that gives a
party a profitable reason to refuse window extension is not a safe financial
protocol, even if the prepared adaptor signatures are mathematically correct.

### Liveness Inequality

Let:

```text
tau_announce(i) = time when the oracle announces usable nonce data for C_i
tau_resolve(i)  = earliest time when C_i may be resolved by attestation
Delta_prep(i)   = worst-case time to negotiate, verify, sign, and persist C_{i+1}
Delta_margin(i) = safety margin for clock skew, transport delay, backup, and review
```

A necessary scheduling condition for one-step lazy continuation is:

```text
tau_announce(i+1) + Delta_prep(i+1) + Delta_margin(i+1)
  < tau_resolve(i).
```

If this inequality fails, the parties should not treat the `C_i -> C_{i+1}`
continuation as safely available. The correct behavior is to expose a
non-continuation fallback in `C_i`.

For a depth-`K` window, the analogous condition is:

```text
for h in {1, ..., K - 1}:
  tau_announce(i+h) + Delta_prep(i+h) + Delta_margin(i+h)
    < tau_resolve(i+h-1).
```

Preparing the boundary successor `C_{i+K}` for the next slide requires the same
inequality with `h = K` before `C_{i+K-1}` becomes resolvable.

This condition is not sufficient for production safety. It ignores fee spikes,
reorgs, pinning, counterparty sabotage, and wallet failures. It is the minimal
timing inequality that makes the lazy preparation claim meaningful.

## 8. Choosing the Window Depth

There is no universal safe value of `K`.

Window depth depends on:

- oracle announcement cadence;
- expected negotiation time;
- counterparty availability assumptions;
- timeout margins;
- fee and confirmation assumptions;
- product sensitivity to failed rollover;
- backup and state-synchronization policy.

`K = 1` contains only the active node and is sufficient only for a terminal
state with no live child continuation. For a product with one-step rollover,
`K = 2` is the smallest useful policy: the current period and the next period
are prepared, while the parties work on the period after that.

Larger `K` reduces liveness pressure but increases retained state. Smaller `K`
reduces state but gives the protocol less time to recover from offline parties,
oracle delays, fee spikes, or failed negotiation.

The correct value of `K` is a product parameter, not a cryptographic constant.

## 9. Complexity Bound

Lazy preparation changes the maximum live state requirement.

Let:

```text
A_i = number of active continuation edges from node C_i
P_i = preparation cost per edge or per compressed edge set at C_i
K   = preparation window depth
```

Under eager preparation, retained state is proportional to all future reachable
prepared states. In a non-recombining graph, that can grow exponentially with
depth. In a recombining graph, it may grow with the size of the reachable state
space.

Under lazy preparation, retained state is bounded by the active window:

```text
LiveState_i ~= sum over C_j in W_i of A_j * P_j
```

This is not a free reduction of total work. If the contract actually runs for
many periods, the parties may still perform work in many periods. The reduction
is in maximum upfront and live retained state, not necessarily in total
lifetime negotiation effort.

Outcome compression, payout interpolation, oracle decomposition, and
hypercube-style encodings are orthogonal. They may reduce `P_i` for a given
node, but the reduction is payoff-dependent. Lazy preparation should not be
described as making every outcome set logarithmic. It bounds the live window;
compression reduces the per-node representation when the product admits it.

### Non-Recombining Tree Bound

For a simple non-recombining tree with constant continuation branching factor
`b > 1`, depth `D`, and uniform per-node preparation weight `P`, eager
preparation requires retaining:

```text
EagerNodes(D) = 1 + b + b^2 + ... + b^D
              = (b^{D+1} - 1) / (b - 1)

EagerState(D) = P * EagerNodes(D).
```

Lazy preparation with fixed window depth `K` retains at most:

```text
LazyNodes(K) = 1 + b + b^2 + ... + b^{K-1}
             = (b^K - 1) / (b - 1)

LazyState(K) = P * LazyNodes(K).
```

For fixed `K`, `LazyState(K)` is independent of total contract depth `D`.
The exponential term is not removed; it is bounded by the chosen live window.

The lifetime work over a realized path of length `D` is different. If each
period requires preparing one new boundary layer, then the cumulative work is
approximately:

```text
LifetimeLazyWork(D, K) ~= D * P * b^{K-1}
```

for this simplified tree. Lazy preparation therefore trades upfront retained
state for repeated boundary preparation.

### Recombining State Bound

Let `Sigma_h` be the set of distinct financial states reachable at distance
`h` from the active node after recombination:

```text
Sigma_h = { state(C_j) : distance(C_i, C_j) = h }.
```

If equivalent states can share the same continuation template, then the live
window bound becomes:

```text
LiveState_i(K) <= sum_{h=0}^{K-1} |Sigma_h| * P_h.
```

If `|Sigma_h| << b^h`, recombination matters more than lazy preparation alone.
The two techniques are compatible:

```text
lazy preparation bounds h by K
recombination reduces |Sigma_h|
compression reduces P_h
```

None of these statements implies that every product admits recombination or
compression.

## 10. Example: BTC-Collateralized Loan Rollover

Consider a BTC-collateralized loan with monthly observation and rollover.

At month `i`, the active cDLC state represents:

```text
collateral amount
debt amount
price observation event
margin or liquidation thresholds
rollover terms for month i+1
fallback settlement rules
```

Before the month `i` oracle can force settlement, the parties prepare the live
month `i+1` child path. If the price outcome selects rollover, the oracle scalar
for month `i` completes the bridge into the month `i+1` funding output.

The transition is:

```text
month i outcome
  -> oracle scalar s_{i,x}
  -> parent CET
  -> bridge completion
  -> month i+1 child funding
```

If the parties also keep a `K = 2` window, they begin preparing month `i+2`
before month `i+1` becomes exposed to resolution.

If month `i+1` cannot be prepared in time, month `i` must not pretend that
rollover is available. It must settle through an already-prepared non-roll
branch: repay, refund, liquidate, unwind, or close according to the loan's
contract terms.

This example does not prove loan solvency. It only illustrates how lazy cDLCs
move the preparation burden from all future monthly states to the current
sliding window.

### Minimal Loan Timing Condition

For a monthly rollover loan, let:

```text
T_i          = scheduled price observation time for month i
A_{i+1}      = oracle nonce announcement time for month i+1
Prep_{i+1}   = preparation time required for the month i+1 child state
Margin_{i+1} = operational safety margin
```

The month `i+1` rollover path is safely available at month `i` only if:

```text
A_{i+1} + Prep_{i+1} + Margin_{i+1} < T_i.
```

If the inequality does not hold, the month `i` node should not include rollover
as an assumed live continuation. It should settle through a prepared fallback.

For `K = 2`, the month `i+2` path does not need to be activated by month `i`,
but the protocol should be preparing it before month `i+1` becomes exposed:

```text
A_{i+2} + Prep_{i+2} + Margin_{i+2} < T_{i+1}.
```

These inequalities are intentionally simple. A production loan would also need
fee margins, liquidation latency, oracle fault policy, grace periods,
jurisdictional closeout rules, and collateral gap-risk treatment.

## 11. Lightning and Channel Context

Lazy preparation is compatible with the channel intuition in the base cDLC
work, but it does not imply that current Lightning implementations support
lazy cDLCs.

In a channel-style setting, the sliding window could be advanced off-chain by
state updates. That may reduce on-chain turnover, but it introduces the usual
channel requirements: update ordering, revocation or replacement discipline,
force-close behavior, watchtower policy, route or channel liquidity, and
timeout coordination.

The lazy claim remains the same:

```text
prepared edge safety is local
window extension is protocol liveness
```

The first statement is adaptor algebra. The second is channel or bilateral
protocol engineering.

## 12. Limitations

The conservative limitations are part of the claim.

Lazy cDLCs do not prove bilateral negotiation. A production protocol still
needs message formats, validation rules, transcript retention, backup,
recovery, malformed-message rejection, and independent participant execution.

They do not guarantee online cooperation. If one party disappears before the
window is extended, the protocol can only use already-prepared fallback paths.

They do not provide production oracle scheduling. Future oracle nonce
commitments must be available early enough for the parties to prepare the next
window.

They do not provide a universal window depth. `K` must be chosen from product
timing, oracle cadence, fee assumptions, and counterparty availability.

They do not guarantee confirmation. Fee spikes, pinning, package relay limits,
reorgs, dust rules, and timeout compression can still break a poorly engineered
deployment.

They do not prove economic solvency. Collateral, liquidation, gap risk,
liquidity, redemption policy, and legal enforceability remain product-specific
problems.

They do not prove Lightning deployment. HTLC or PTLC use requires support from
actual channel protocols and implementations.

They do not establish novelty. A prior-art review is required before making
claims about historical firstness.

## 13. Conclusion

cDLC composability is local, so graph materialization can be lazy.

That is the useful observation. The oracle scalar revealed by a parent outcome
activates a prepared child bridge because the bridge was adapted to that
outcome point. The scalar does not require the entire future graph to have been
constructed at genesis.

Lazy cDLCs appear to convert the main scaling pressure from full upfront graph
preparation into a bounded-window liveness protocol, without changing the cDLC
adaptor activation primitive.

The result is promising but incomplete. Prepared edges keep the same activation
safety as ordinary cDLC edges. Future edges require a disciplined protocol for
oracle scheduling, online negotiation, fallback paths, state retention, fees,
and economic incentives. Until those pieces are specified and tested, lazy
cDLCs should be treated as a research construction, not a production financial
system.

## References

1. [Cascading Discreet Log Contracts whitepaper](../WHITEPAPER.md)
2. [Cascading Discreet Log Contracts technical note](cdlc-technical-note.md)
3. [Discreet Log Contracts, Thaddeus Dryja](https://adiabat.github.io/dlc.pdf)
4. [DLC specifications](https://github.com/discreetlogcontracts/dlcspecs)
5. [BIP340 Schnorr signatures](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
6. [Bitcoin Optech: adaptor signatures](https://bitcoinops.org/en/topics/adaptor-signatures/)
