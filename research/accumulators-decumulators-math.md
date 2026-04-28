# Accumulators and Decumulators Math

This note defines the mathematical specification for accumulators and decumulators. It models
periodic BTC accumulation and decumulation structures where each observation
settles a fixed or multiplied BTC quantity at a strike price, unless a
knock-out branch terminates the remaining schedule.

The same accounting core covers:

```text
1. BTC accumulators: investor receives BTC and owes strike cash;
2. BTC decumulators: investor delivers BTC and receives strike cash;
3. DCA ladders: multiplier fixed to one and no knock-out;
4. leveraged knock-out accumulators: multiplier greater than one and terminal
   knock-out branch.
```

The model proves finite-step accounting. It does not prove external execution
availability, market impact, funding availability beyond posted collateral, or
price-oracle quality.

## 1. Units

Use integer units.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
Q = posted BTC collateral in satoshis
CashEscrowScaled = posted cash-side collateral scaled by SAT
BaseQ_i = base BTC quantity for period i, in satoshis
M_i = integer quantity multiplier for period i
K_i = strike / accumulation price in cents per BTC
S_i = observation BTC/USD price in cents per BTC
H_i = knock-out barrier in cents per BTC
CumQ_i = cumulative BTC transacted before period i, in satoshis
CashScaled_i = cumulative strike cash obligation before period i, scaled by SAT
Live_i = Boolean schedule state before period i
```

Preconditions:

```text
Q >= 0
CashEscrowScaled >= 0
BaseQ_i >= 0
M_i >= 1
K_i >= 0
S_i > 0
H_i >= 0
CumQ_i >= 0
CashScaled_i >= 0
SAT > 0
```

The scaled strike cash for `q` satoshis at strike `K_i` is:

```text
PeriodCashScaled(q, K_i) = q * K_i
```

The actual cash amount in cents is:

```text
PeriodCashCents(q, K_i) = q * K_i / SAT
```

The model carries `CashScaled` to avoid fractional cents until final settlement
or reporting.

## 2. Branch Priority

The cDLC observation branch order is:

```text
1. KnockOut_i
2. MultipliedQuantity_i
3. BaseQuantity_i
```

Knock-out is tested first.

```text
KnockOut_i:
  S_i >= H_i

MultipliedQuantity_i:
  S_i < H_i and S_i <= K_i

BaseQuantity_i:
  S_i < H_i and S_i > K_i
```

Equality belongs to the knock-out branch for `S_i = H_i` and to the
multiplied branch for `S_i = K_i`, if the schedule remains live.

### Claim 1: Branch Coverage

For every valid observation price `S_i`, exactly one branch holds.

Proof:

Integer order gives either `S_i >= H_i` or `S_i < H_i`. If `S_i >= H_i`, the
knock-out branch holds and the other branches do not because they require
`S_i < H_i`.

If `S_i < H_i`, integer order gives either `S_i <= K_i` or `S_i > K_i`. The
former selects `MultipliedQuantity_i`; the latter selects `BaseQuantity_i`.
The two quantity branches are strict complements under `S_i < H_i`.

### Claim 2: Branch Disjointness

No two branches can hold at the same observation.

Proof:

`KnockOut_i` requires `S_i >= H_i`; both quantity branches require
`S_i < H_i`. Therefore knock-out is disjoint from settlement.

`MultipliedQuantity_i` requires `S_i <= K_i`; `BaseQuantity_i` requires
`S_i > K_i`. Therefore the settlement branches are disjoint.

## 3. Period Quantity

If the schedule is live and does not knock out:

```text
q_i =
  BaseQ_i * M_i  if S_i <= K_i
  BaseQ_i        if S_i > K_i
```

If the schedule knocks out or was already terminal:

```text
q_i = 0
```

### Claim 3: Period Quantity Bounds

For every live non-knock-out period:

```text
BaseQ_i <= q_i <= BaseQ_i * M_i
```

Proof:

If `S_i <= K_i`, then `q_i = BaseQ_i * M_i`. Since `M_i >= 1`,
`BaseQ_i * M_i >= BaseQ_i`.

If `S_i > K_i`, then `q_i = BaseQ_i`. Since `M_i >= 1`,
`BaseQ_i <= BaseQ_i * M_i`.

If the branch is knock-out or already terminal, `q_i = 0`.

## 4. Accumulator Accounting

In an accumulator, the investor receives BTC and owes strike cash. For a live
settlement branch:

```text
CumQ_{i+1} = CumQ_i + q_i
CashScaled_{i+1} = CashScaled_i + q_i * K_i
Q_{i+1} = Q_i - q_i
```

Precondition for BTC collateral sufficiency:

```text
q_i <= Q_i
```

Then:

```text
Q_{i+1} >= 0
Q_{i+1} + q_i = Q_i
CumQ_{i+1} - CumQ_i = q_i
CashScaled_{i+1} - CashScaled_i = q_i * K_i
```

### Claim 4: Accumulator Period Accounting Is Exact

Under the settlement precondition `q_i <= Q_i`:

```text
CumQ_{i+1} = CumQ_i + q_i
CashScaled_{i+1} = CashScaled_i + q_i * K_i
Q_{i+1} + q_i = Q_i
```

Proof:

All three equalities are direct substitutions from the transition rules. The
BTC collateral equation follows from `Q_{i+1} = Q_i - q_i` and `q_i <= Q_i`.

## 5. Decumulator Accounting

In a decumulator, the investor delivers BTC and receives strike cash. The same
quantity and strike-cash formulas apply, but direction is reversed.

For a live settlement branch:

```text
CumQ_{i+1} = CumQ_i + q_i
CashScaled_{i+1} = CashScaled_i + q_i * K_i
InvestorInventory_{i+1} = InvestorInventory_i - q_i
CashEscrowScaled_{i+1} = CashEscrowScaled_i - q_i * K_i
```

Preconditions:

```text
q_i <= InvestorInventory_i
q_i * K_i <= CashEscrowScaled_i
```

Then:

```text
InvestorInventory_{i+1} + q_i = InvestorInventory_i
CashEscrowScaled_{i+1} + q_i * K_i = CashEscrowScaled_i
CumQ_{i+1} - CumQ_i = q_i
CashScaled_{i+1} - CashScaled_i = q_i * K_i
```

### Claim 5: Decumulator Period Accounting Is Exact

Under the inventory and cash-escrow preconditions:

```text
InvestorInventory_{i+1} >= 0
CashEscrowScaled_{i+1} >= 0
InvestorInventory_{i+1} + q_i = InvestorInventory_i
CashEscrowScaled_{i+1} + q_i * K_i = CashEscrowScaled_i
```

Proof:

Direct substitution from the transition rules. Non-negativity follows from the
two preconditions.

## 6. Knock-Out Transition

If:

```text
KnockOut_i = true
```

then:

```text
Live_{i+1} = false
q_i = 0
CumQ_{i+1} = CumQ_i
CashScaled_{i+1} = CashScaled_i
```

### Claim 6: Knock-Out Stops Future Accumulation

If `Live_{i+1} = false`, then every later period `j > i` has:

```text
q_j = 0
CumQ_{j+1} = CumQ_j
CashScaled_{j+1} = CashScaled_j
```

Proof:

Terminal state is absorbing:

```text
Live_{j+1} = Live_j and not KnockOut_j
```

If `Live_j = false`, then `Live_{j+1} = false`. The period quantity rule sets
`q_j = 0` whenever `Live_j = false`, so cumulative quantity and cash remain
unchanged.

## 7. Live-State Update

The live state evolves as:

```text
Live_{i+1} = Live_i and not KnockOut_i
```

### Claim 7: Live-State Absorption

If:

```text
Live_i = false
```

then:

```text
Live_{i+1} = false
```

Proof:

```text
Live_{i+1}
= false and not KnockOut_i
= false
```

### Claim 8: Continuation Requires Live and No Knock-Out

If:

```text
Live_{i+1} = true
```

then:

```text
Live_i = true
KnockOut_i = false
```

Proof:

The only way an `and` expression is true is for both operands to be true.

## 8. Finite Schedule Bounds

For a finite schedule `i = 0 .. n - 1`, define:

```text
MaxQ_i = BaseQ_i * M_i
MaxCumQ_n = MaxQ_0 + MaxQ_1 + ... + MaxQ_{n-1}
MaxCashScaled_n = MaxQ_0 * K_0 + MaxQ_1 * K_1 + ... + MaxQ_{n-1} * K_{n-1}
```

Because every period quantity satisfies `0 <= q_i <= MaxQ_i`:

```text
CumQ_n - CumQ_0 <= MaxCumQ_n
CashScaled_n - CashScaled_0 <= MaxCashScaled_n
```

### Claim 9: Two-Period Quantity Bound

For two periods:

```text
0 <= q_0 <= BaseQ_0 * M_0
0 <= q_1 <= BaseQ_1 * M_1
```

then:

```text
CumQ_2
= CumQ_0 + q_0 + q_1
<= CumQ_0 + BaseQ_0 * M_0 + BaseQ_1 * M_1
```

Proof:

Apply the one-period update twice:

```text
CumQ_1 = CumQ_0 + q_0
CumQ_2 = CumQ_1 + q_1 = CumQ_0 + q_0 + q_1
```

Then substitute the period quantity upper bounds.

### Claim 10: Two-Period Cash Bound

For two periods:

```text
CashScaled_2
= CashScaled_0 + q_0 * K_0 + q_1 * K_1
```

and if:

```text
q_0 <= BaseQ_0 * M_0
q_1 <= BaseQ_1 * M_1
```

then:

```text
CashScaled_2
<= CashScaled_0
   + BaseQ_0 * M_0 * K_0
   + BaseQ_1 * M_1 * K_1
```

Proof:

The update formula gives the first equality. Since all strikes and quantities
are non-negative, multiplying the quantity bounds by `K_0` and `K_1` preserves
the inequalities.

## 9. Cash Rounding at Final Settlement

`CashScaled` is denominated in satoshi-scaled cents. To settle or report in
whole cents:

```text
CashCents = floor(CashScaled / SAT)
Remainder = CashScaled - CashCents * SAT
```

Then:

```text
0 <= Remainder < SAT
CashCents * SAT <= CashScaled
CashScaled - CashCents * SAT < SAT
```

If the product chooses conservative rounding against the paying side, use
ceiling instead:

```text
CashCentsCeil = ceil(CashScaled / SAT)
```

and prove:

```text
CashCentsCeil * SAT >= CashScaled
CashCentsCeil = 0
or
(CashCentsCeil - 1) * SAT < CashScaled
```

The cDLC branch must state which side receives the rounding benefit.

## 10. BTC/Cash Conservation Convention

This product family has two assets. Conservation is per asset under the chosen
settlement convention.

Accumulator settlement:

```text
issuer BTC collateral decreases by q_i
investor BTC received increases by q_i
investor cash obligation increases by q_i * K_i
issuer cash claim increases by q_i * K_i
```

Decumulator settlement:

```text
investor BTC inventory decreases by q_i
issuer BTC received increases by q_i
cash escrow decreases by q_i * K_i
investor cash received increases by q_i * K_i
```

### Claim 11: Per-Asset Conservation

For accumulator BTC:

```text
Q_{i+1} + InvestorReceivedBTC_i = Q_i
```

when `InvestorReceivedBTC_i = q_i`.

For decumulator BTC:

```text
InvestorInventory_{i+1} + IssuerReceivedBTC_i = InvestorInventory_i
```

when `IssuerReceivedBTC_i = q_i`.

For decumulator cash escrow:

```text
CashEscrowScaled_{i+1} + InvestorCashReceivedScaled_i
  = CashEscrowScaled_i
```

when `InvestorCashReceivedScaled_i = q_i * K_i`.

Each identity follows by substitution from the transition definitions.

## 11. cDLC Mapping

Each period is a cDLC observation node with three branch classes.

```text
Observation outcome S_i
  -> if S_i >= H_i:
       terminal knock-out CET; no future scheduled q_j
  -> else if S_i <= K_i:
       multiplied settlement CET and bridge to next period
  -> else:
       base settlement CET and bridge to next period
```

Accumulator settlement branch:

```text
q_i = BaseQ_i * M_i or BaseQ_i
Q_{i+1} = Q_i - q_i
CumQ_{i+1} = CumQ_i + q_i
CashScaled_{i+1} = CashScaled_i + q_i * K_i
```

Decumulator settlement branch:

```text
q_i = BaseQ_i * M_i or BaseQ_i
InvestorInventory_{i+1} = InvestorInventory_i - q_i
CashEscrowScaled_{i+1} = CashEscrowScaled_i - q_i * K_i
CumQ_{i+1} = CumQ_i + q_i
CashScaled_{i+1} = CashScaled_i + q_i * K_i
```

Knock-out branch:

```text
Live_{i+1} = false
q_i = 0
CumQ_{i+1} = CumQ_i
CashScaled_{i+1} = CashScaled_i
```

The cryptographic fact that only the matching oracle outcome activates the
matching branch remains covered by the core cDLC adaptor-signature proofs. This
note proves the financial state and accounting invariants attached to those
branches.

## 12. SPARK Encoding Requirements

A future SPARK target should encode:

```text
KnockOut(S, H)
MultipliedQuantityBranch(S, H, K)
BaseQuantityBranch(S, H, K)
PeriodQuantity(Live, KnockOut, BaseQ, Multiplier, S, K)
NextLive(Live, KnockOut)
NextCumQ(CumQ, q)
NextCashScaled(CashScaled, q, K)
NextAccumulatorCollateral(Q, q)
NextDecumulatorInventory(Inventory, q)
NextCashEscrowScaled(CashEscrowScaled, q, K)
```

Required proof obligations:

```text
1. Knock-out, multiplied-quantity, and base-quantity branches are disjoint.
2. The three branches cover every integer observation price.
3. Live state is absorbing false after knock-out.
4. Continuation requires prior live state and no knock-out.
5. Period quantity is zero when terminal or knocked out.
6. Live settlement quantity is bounded by BaseQ and BaseQ * M.
7. Cumulative quantity update is exact.
8. Cumulative cash update is exact.
9. Accumulator BTC settlement conserves BTC under q <= Q.
10. Decumulator BTC settlement conserves BTC under q <= inventory.
11. Decumulator cash escrow settlement conserves scaled cash under
    q * K <= CashEscrowScaled.
12. Knock-out stops future accumulation.
13. Two-period cumulative quantity equals the sum of settled quantities.
14. Two-period cash obligation equals the sum of q_i * K_i.
15. Total finite-schedule quantity and cash are bounded by the maximum schedule.
16. Final cash rounding has the documented floor or ceiling bound.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers for the first pass.
- Model one period with scalar fields; add two-period helper lemmas before any
  array model.
- Keep branch predicates as separate Boolean functions.
- Put collateral/escrow sufficiency in Pre conditions.
- Carry cash in scaled integer units until final rounding.
- Do not use pragma Assume.
```

## 13. Boundary

This specification proves:

```text
- branch coverage and disjointness;
- exact cumulative quantity updates;
- exact scaled cash-obligation updates;
- knock-out terminal behavior;
- live-state absorption;
- per-period and finite-schedule bounds;
- BTC and cash conservation under explicit collateral/escrow preconditions;
- final cash rounding bounds.
```

It does not prove:

```text
- external execution availability;
- market impact of scheduled flows;
- funding availability beyond posted collateral or cash escrow;
- oracle correctness;
- tax, accounting, or regulatory treatment;
- fee safety or mempool confirmation;
- cDLC cryptographic activation, which is covered by the core proofs.
```
