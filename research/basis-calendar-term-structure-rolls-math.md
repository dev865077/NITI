# Basis Trades, Calendar Spreads, and Term-Structure Rolls Math

This note defines the mathematical specification for basis, calendar, and term-structure rolls. It models
BTC-collateralized exposure to relative prices rather than outright BTC price:

```text
1. spot/forward basis;
2. near/far calendar spreads;
3. finite term-structure rolls whose next reference spread is activated by a
   cDLC continuation.
```

The purpose is narrow. The note proves the integer accounting, branch
selection, BTC collateral conservation, collateral caps, and roll-state
invariants that a later SPARK model can encode directly. It does
not prove forward-curve construction, arbitrage convergence, liquidity,
exchange execution, oracle correctness, or the cryptographic cDLC adaptor
claims already covered by the base cDLC proof targets.

## 1. Units

Use integer units throughout.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
R = BTC reference notional in satoshis
P = BTC/USD settlement price in cents per BTC
S = spot BTC/USD price in cents per BTC
F = forward price in cents per BTC
F_near = near-tenor forward price in cents per BTC
F_far = far-tenor forward price in cents per BTC
LongQ = long-spread side posted BTC collateral in satoshis
ShortQ = short-spread side posted BTC collateral in satoshis
```

Preconditions:

```text
SAT > 0
R >= 0
P > 0
S > 0
F > 0
F_near > 0
F_far > 0
LongQ >= 0
ShortQ >= 0
```

Prices are non-negative integer oracle observations. Spreads and PnL are signed
integers, because basis and calendar spreads can be positive, zero, or
negative.

The model uses a BTC reference notional. If `R` satoshis are notionally exposed
to a price spread `X` measured in cents per BTC, then the actual cents value is:

```text
R * X / SAT
```

The division-free scaled value is:

```text
ScaledValue(R, X) = R * X
```

`ScaledValue` is denominated in satoshi-cents per BTC. When converting that
signed scaled value back to BTC at settlement price `P`, the `SAT` factor
cancels:

```text
BTC claim in sats = ScaledValue / P
```

This is why the settlement conversion below divides by `P`, not by `P * SAT`.

## 2. Basis and Calendar Definitions

Spot/forward basis:

```text
Basis(F, S) = F - S
```

Calendar spread between far and near tenors:

```text
Calendar(F_far, F_near) = F_far - F_near
```

Both values are signed integer cents per BTC.

### Claim 1: Basis Change Is Linear

Let:

```text
Basis0 = F0 - S0
Basis1 = F1 - S1
BasisChange = Basis1 - Basis0
```

Then:

```text
BasisChange = (F1 - F0) - (S1 - S0)
```

Proof:

```text
BasisChange
= (F1 - S1) - (F0 - S0)
= F1 - S1 - F0 + S0
= (F1 - F0) - (S1 - S0)
```

This is the algebraic heart of a basis trade: the payoff depends on the
relative move of forward price versus spot price, not on either leg alone.

### Claim 2: Calendar Change Is Linear

Let:

```text
Spread0 = Far0 - Near0
Spread1 = Far1 - Near1
SpreadChange = Spread1 - Spread0
```

Then:

```text
SpreadChange = (Far1 - Far0) - (Near1 - Near0)
```

Proof:

```text
SpreadChange
= (Far1 - Near1) - (Far0 - Near0)
= Far1 - Near1 - Far0 + Near0
= (Far1 - Far0) - (Near1 - Near0)
```

This identity is the calendar-spread analogue of Claim 1.

## 3. One-Period Spread Payoff

A long-spread position benefits when the observed spread is greater than the
initial reference spread. A short-spread position benefits when it is lower.

For any signed spread:

```text
X0 = initial reference spread in cents per BTC
X1 = observed settlement spread in cents per BTC
SpreadMove = X1 - X0
```

The long-side signed scaled payoff is:

```text
LongPayoffScaled = R * SpreadMove
```

The short-side signed scaled payoff is:

```text
ShortPayoffScaled = -LongPayoffScaled
```

### Claim 3: Long and Short Payoffs Are Zero-Sum

Before fees, rounding, and collateral caps:

```text
LongPayoffScaled + ShortPayoffScaled = 0
```

Proof:

```text
LongPayoffScaled + ShortPayoffScaled
= R * SpreadMove - R * SpreadMove
= 0
```

The product transfers value between counterparties; it does not create value.

## 4. Basis Trade Specialization

For a spot/forward basis trade:

```text
X0 = Basis0 = F0 - S0
X1 = Basis1 = F1 - S1
SpreadMove = (F1 - S1) - (F0 - S0)
LongPayoffScaled = R * ((F1 - S1) - (F0 - S0))
```

Using Claim 1:

```text
LongPayoffScaled = R * ((F1 - F0) - (S1 - S0))
```

Interpretation:

```text
Long basis wins if the forward premium over spot widens.
Short basis wins if the forward premium over spot tightens.
```

If the basis is negative, the same formula still applies. A move from `-200`
cents to `-100` cents is a positive `SpreadMove` because the basis widened
toward the long side.

## 5. Calendar Spread Specialization

For a near/far calendar spread:

```text
X0 = Spread0 = Far0 - Near0
X1 = Spread1 = Far1 - Near1
SpreadMove = (Far1 - Near1) - (Far0 - Near0)
LongPayoffScaled = R * ((Far1 - Near1) - (Far0 - Near0))
```

Using Claim 2:

```text
LongPayoffScaled = R * ((Far1 - Far0) - (Near1 - Near0))
```

Interpretation:

```text
Long calendar spread wins if the far tenor richens versus the near tenor.
Short calendar spread wins if the far tenor cheapens versus the near tenor.
```

The formula covers contango flattening, contango steepening, backwardation
flattening, and backwardation steepening without changing signs by hand.

## 6. Settlement Branches

The signed payoff has exactly three possible branches:

```text
LongWins  = LongPayoffScaled > 0
Flat      = LongPayoffScaled = 0
ShortWins = LongPayoffScaled < 0
```

### Claim 4: Payoff Branch Coverage and Disjointness

Exactly one of `LongWins`, `Flat`, and `ShortWins` holds.

Proof:

The integers are totally ordered. For any integer `x`, exactly one of:

```text
x > 0
x = 0
x < 0
```

holds. Substitute `x = LongPayoffScaled`.

## 7. BTC Settlement Conversion

Define the absolute signed payoff:

```text
AbsPayoffScaled =
  LongPayoffScaled   if LongPayoffScaled >= 0
  -LongPayoffScaled  if LongPayoffScaled < 0
```

The integer BTC transfer is:

```text
Transfer = floor(AbsPayoffScaled / P)
Remainder = AbsPayoffScaled - Transfer * P
```

with quotient invariant:

```text
0 <= Remainder < P
```

Equivalently:

```text
Transfer * P <= AbsPayoffScaled
AbsPayoffScaled - Transfer * P < P
```

The floor convention prevents the winner from receiving more than the exact
spread payoff. The unpaid residual is worth less than one satoshi at settlement
price `P` in this scaled representation.

### Claim 5: Zero Payoff Implies Zero Transfer

If:

```text
LongPayoffScaled = 0
```

then:

```text
AbsPayoffScaled = 0
Transfer = 0
Remainder = 0
```

Proof:

The absolute value of zero is zero. Since `P > 0`, floor division gives:

```text
floor(0 / P) = 0
```

and the remainder is:

```text
0 - 0 * P = 0
```

## 8. Solvent Settlement

### 8.1 Long Wins and Short Can Pay

If:

```text
LongPayoffScaled > 0
Transfer <= ShortQ
```

then:

```text
LongQ' = LongQ + Transfer
ShortQ' = ShortQ - Transfer
```

BTC conservation:

```text
LongQ' + ShortQ'
= LongQ + Transfer + ShortQ - Transfer
= LongQ + ShortQ
```

The long-side integer settlement is within one satoshi-scaled unit of the exact
payoff:

```text
0 <= LongPayoffScaled - Transfer * P < P
```

This follows directly from the quotient invariant because
`AbsPayoffScaled = LongPayoffScaled` in the long-wins branch.

### 8.2 Short Wins and Long Can Pay

If:

```text
LongPayoffScaled < 0
Transfer <= LongQ
```

then:

```text
LongQ' = LongQ - Transfer
ShortQ' = ShortQ + Transfer
```

BTC conservation:

```text
LongQ' + ShortQ'
= LongQ - Transfer + ShortQ + Transfer
= LongQ + ShortQ
```

The short-side integer settlement is within one satoshi-scaled unit of the
exact payoff:

```text
0 <= -LongPayoffScaled - Transfer * P < P
```

This follows from the quotient invariant because
`AbsPayoffScaled = -LongPayoffScaled` in the short-wins branch.

### 8.3 Flat Settlement

If:

```text
LongPayoffScaled = 0
```

then:

```text
LongQ' = LongQ
ShortQ' = ShortQ
```

BTC conservation is immediate:

```text
LongQ' + ShortQ' = LongQ + ShortQ
```

## 9. Collateral-Capped Settlement

If the losing side cannot pay the computed integer transfer, losses are capped
by posted collateral.

### 9.1 Short Cannot Pay Long

If:

```text
LongPayoffScaled > 0
Transfer > ShortQ
```

then:

```text
LongQ' = LongQ + ShortQ
ShortQ' = 0
```

The short loses no more than `ShortQ` satoshis. BTC conservation:

```text
LongQ' + ShortQ'
= LongQ + ShortQ + 0
= LongQ + ShortQ
```

### 9.2 Long Cannot Pay Short

If:

```text
LongPayoffScaled < 0
Transfer > LongQ
```

then:

```text
LongQ' = 0
ShortQ' = ShortQ + LongQ
```

The long loses no more than `LongQ` satoshis. BTC conservation:

```text
LongQ' + ShortQ'
= 0 + ShortQ + LongQ
= LongQ + ShortQ
```

### Claim 6: Capped Settlement Conserves BTC

Every branch in Sections 8 and 9 satisfies:

```text
LongQ' + ShortQ' = LongQ + ShortQ
```

Proof:

The solvent branches add `Transfer` to the winning side and subtract exactly
`Transfer` from the losing side. The capped branches move the losing side's
entire posted collateral to the winning side. In both cases the output sum is
the input sum.

## 10. Margin Predicate for Continuation

A roll into a child cDLC should only occur if both sides have enough remaining
collateral for the next agreed stress move.

Let:

```text
H = stress spread move in cents per BTC
R_next = next-period reference BTC notional in satoshis
P_roll = BTC/USD price used for the roll margin test in cents per BTC
```

Preconditions:

```text
H >= 0
R_next >= 0
P_roll > 0
```

The scaled adverse spread loss for either side is:

```text
StressLossScaled = R_next * H
```

The scaled value of a side's BTC collateral is:

```text
CollateralScaled(Q_side, P_roll) = Q_side * P_roll
```

The division-free margin predicate is:

```text
MarginOK(Q_side, R_next, H, P_roll)
  = Q_side * P_roll >= R_next * H
```

This is the cross-multiplied form of:

```text
Q_side >= R_next * H / P_roll
```

### Claim 7: Margin Predicate Covers the Stress Loss

If:

```text
Q_side * P_roll >= R_next * H
```

then the side's collateral value covers the agreed stress loss in scaled units.

Proof:

This is exactly the definition of `MarginOK`. The model avoids division by
comparing both sides in the same scaled units.

### Reduced-Notional Roll

If a side fails the predicate for `R_next`, the graph can either terminate or
roll with a lower notional `R_reduced`.

The reduced notional is valid if:

```text
0 <= R_reduced <= R_next
Q_side * P_roll >= R_reduced * H
```

### Claim 8: Lower Notional Preserves a Passing Margin Test

If:

```text
R_reduced <= R_next
Q_side * P_roll >= R_next * H
H >= 0
```

then:

```text
Q_side * P_roll >= R_reduced * H
```

Proof:

Since `H >= 0` and `R_reduced <= R_next`:

```text
R_reduced * H <= R_next * H
```

Combining with `Q_side * P_roll >= R_next * H` gives the result.

## 11. Term-Structure Roll State

A term-structure roll is a finite sequence of spread observations where each
child contract uses the previous observation as the next reference spread.

Let:

```text
X_i = observed spread at roll date i
Ref_i = reference spread for period i
R_i = reference BTC notional for period i
```

The period payoff is:

```text
PayoffScaled_i = R_i * (X_i - Ref_i)
```

The exact reference update for a same-product roll is:

```text
Ref_{i+1} = X_i
```

The child cDLC for period `i+1` is funded only if the settlement and margin
branches select continuation. The financial state carried forward is:

```text
LongQ_{i+1}, ShortQ_{i+1} = settled collateral outputs from period i
Ref_{i+1} = X_i
R_{i+1} = agreed next notional
```

### Claim 9: Roll Reference Is Exact

If the child state is built with:

```text
Ref_{i+1} = X_i
```

then the next period payoff is computed from the spread move after the latest
observation:

```text
PayoffScaled_{i+1} = R_{i+1} * (X_{i+1} - X_i)
```

Proof:

Substitute `Ref_{i+1} = X_i` into:

```text
PayoffScaled_{i+1} = R_{i+1} * (X_{i+1} - Ref_{i+1})
```

which gives the stated expression.

### Claim 10: Same-Notional Rolls Telescope

For a same-notional finite roll sequence:

```text
R_i = R
Ref_i = X_{i-1}
```

for `i = 1 .. m`, the sum of scaled payoffs is:

```text
Sum_{i=1..m} R * (X_i - X_{i-1}) = R * (X_m - X_0)
```

Proof:

Expand the sum:

```text
R * (X_1 - X_0)
+ R * (X_2 - X_1)
+ ...
+ R * (X_m - X_{m-1})
```

All intermediate observations cancel:

```text
-R * X_0 + R * X_m
```

so:

```text
Sum_{i=1..m} R * (X_i - X_{i-1}) = R * (X_m - X_0)
```

This is the formal statement that a chain of same-notional spread rolls tracks
the cumulative term-structure move exactly before rounding, fees, and caps.

If notional changes across rolls, each period remains exact:

```text
PayoffScaled_i = R_i * (X_i - X_{i-1})
```

but the finite sum no longer collapses to a single endpoint expression unless
the `R_i` are equal.

## 12. cDLC Lifecycle

A practical cDLC graph can use the following nodes.

```text
C_i = current basis/calendar spread contract
```

The oracle outcome includes the prices needed to compute the selected spread:

```text
Basis outcome:   (S_i, F_i)
Calendar outcome: (F_near_i, F_far_i)
```

For each outcome:

```text
1. compute X_i;
2. compute PayoffScaled_i = R_i * (X_i - Ref_i);
3. choose LongWins, Flat, or ShortWins;
4. settle BTC transfer using the floor conversion and collateral cap;
5. if both sides satisfy continuation margin, bridge residual collateral into
   child C_{i+1};
6. set Ref_{i+1} = X_i.
```

The bridge into `C_{i+1}` is activated by the parent DLC oracle scalar exactly
as in the base cDLC construction. This financial model does not reprove that
cryptographic activation. It assumes the selected parent outcome activates the
correct branch and then proves that the branch accounting is coherent.

## 13. SPARK Handoff

The first SPARK target should be minimal and integer-only. Recommended model:

```text
Amount      = non-negative Big_Integer
SignedAmt   = signed Big_Integer
Price       = positive Big_Integer
Spread      = signed Big_Integer
Collateral  = non-negative Big_Integer
```

Suggested functions:

```text
Basis(F, S) = F - S
Calendar(Far, Near) = Far - Near
Spread_Move(Current, Reference) = Current - Reference
Long_Payoff_Scaled(R, Move) = R * Move
Abs_Signed(X)
Transfer(AbsPayoffScaled, P) = floor(AbsPayoffScaled / P)
Remainder(AbsPayoffScaled, P) = AbsPayoffScaled - Transfer * P
Margin_OK(Q, R, H, P) = Q * P >= R * H
```

Suggested proof obligations:

```text
1. Basis change identity:
   (F1 - S1) - (F0 - S0) = (F1 - F0) - (S1 - S0).

2. Calendar change identity:
   (Far1 - Near1) - (Far0 - Near0)
   = (Far1 - Far0) - (Near1 - Near0).

3. Long and short scaled payoffs sum to zero.

4. Payoff branch predicates are complete and disjoint:
   x > 0, x = 0, x < 0.

5. Quotient and remainder:
   Transfer * P <= AbsPayoffScaled
   and AbsPayoffScaled - Transfer * P < P.

6. Solvent long-win settlement conserves BTC.

7. Solvent short-win settlement conserves BTC.

8. Capped long-win settlement conserves BTC and sets ShortQ' = 0.

9. Capped short-win settlement conserves BTC and sets LongQ' = 0.

10. Flat settlement preserves both collateral balances.

11. Margin_OK is exactly the cross-multiplied stress-loss predicate.

12. If R_reduced <= R_next and Margin_OK holds for R_next, then it holds for
    R_reduced.

13. Roll reference update:
    RefNext = CurrentSpread implies next period payoff uses
    NextSpread - CurrentSpread.

14. Two-step telescoping:
    R*(X1-X0) + R*(X2-X1) = R*(X2-X0).

15. Optional finite-step telescoping can be modeled later by induction once the
    two-step lemma is clean.
```

Keep all assumptions in `Pre` conditions. Use signed Big_Integer values for
spreads and PnL, and separate non-negative collateral-transfer functions for
settlement. Do not use `pragma Assume`.

## 14. Proof Boundary

This math note proves the payoff and continuation accounting for finite,
pre-negotiated cDLC graphs. It does not prove:

```text
- whether an oracle's forward curve is economically correct;
- whether spot and forward prices are manipulation-resistant;
- whether a curve should converge by arbitrage;
- whether liquidity exists to hedge the exposure;
- whether a given margin stress move is sufficient in production;
- whether a particular legal agreement creates a futures, swap, note, or loan;
- whether Bitcoin transactions confirm under fee pressure;
- whether cDLC adaptor signatures are secure.
```

Those are separate market, legal, implementation, and cryptographic
assumptions. The narrow claim is:

```text
Given valid integer spread observations, posted BTC collateral, an agreed
reference spread, and a cDLC outcome branch, the basis/calendar payoff can be
settled as a zero-sum signed scaled amount, converted into BTC with explicit
rounding, capped by posted collateral, and rolled into a child state whose next
reference spread is exactly the observed spread.
```
