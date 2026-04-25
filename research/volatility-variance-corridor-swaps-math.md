# Volatility, Variance, and Corridor Variance Swaps Math

This note resolves the mathematical specification for issue #24. It models
oracle-settled realized variance products over discrete price observations:
plain realized variance swaps and corridor variance swaps. Volatility swaps are
documented as a later approximation layer because the first formal model should
not need square roots.

The model uses rational simple returns, not log returns:

```text
R_i = (S_i - S_{i-1}) / S_{i-1}
R_i^2 = (S_i - S_{i-1})^2 / S_{i-1}^2
```

It proves non-negative variance contributions, monotone accumulators,
zero-sum variance payoff before collateral caps, corridor branch coverage, and
BTC collateral conservation after capped settlement.

## 1. Units

Use integer units.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
S_prev = previous BTC/USD observation in cents per BTC
S_cur = current BTC/USD observation in cents per BTC
S_T = final BTC/USD settlement price in cents per BTC
Lower = lower corridor bound in cents per BTC
Upper = upper corridor bound in cents per BTC
N_var = variance notional in cents per variance unit
K_num / K_den = variance strike
LongQ = long-side posted BTC collateral in satoshis
ShortQ = short-side posted BTC collateral in satoshis
```

Preconditions:

```text
S_prev > 0
S_cur > 0
S_T > 0
Lower <= Upper
N_var >= 0
K_num >= 0
K_den > 0
LongQ >= 0
ShortQ >= 0
SAT > 0
```

Realized variance is carried as a rational pair:

```text
Var = VarNum / VarDen
VarNum >= 0
VarDen > 0
```

The initial accumulator is:

```text
VarNum_0 = 0
VarDen_0 = 1
```

## 2. Return Contribution

For one interval:

```text
Delta = S_cur - S_prev
TermNum = Delta^2
TermDen = S_prev^2
```

The squared simple return is:

```text
Term = TermNum / TermDen
```

### Claim 1: Contribution Is Non-Negative

For every valid interval:

```text
TermNum >= 0
TermDen > 0
```

Proof:

`TermNum = Delta^2`, so it is non-negative. `TermDen = S_prev^2`, and
`S_prev > 0`, so `TermDen > 0`.

## 3. Variance Accumulator

Given an existing accumulator:

```text
VarOld = OldNum / OldDen
```

and a new interval term:

```text
Term = TermNum / TermDen
```

the next accumulator is:

```text
NewNum = OldNum * TermDen + TermNum * OldDen
NewDen = OldDen * TermDen
```

This represents:

```text
NewNum / NewDen = OldNum / OldDen + TermNum / TermDen
```

### Claim 2: Accumulator Denominator Remains Positive

If:

```text
OldDen > 0
TermDen > 0
```

then:

```text
NewDen > 0
```

Proof:

`NewDen = OldDen * TermDen`, the product of two positive integers.

### Claim 3: Accumulator Numerator Remains Non-Negative

If:

```text
OldNum >= 0
OldDen > 0
TermNum >= 0
TermDen > 0
```

then:

```text
NewNum >= 0
```

Proof:

Both products in:

```text
OldNum * TermDen + TermNum * OldDen
```

are non-negative.

### Claim 4: Realized Variance Is Monotone Non-Decreasing

The new accumulator is at least the old accumulator:

```text
NewNum / NewDen >= OldNum / OldDen
```

Division-free:

```text
NewNum * OldDen >= OldNum * NewDen
```

Proof:

Substitute the update:

```text
NewNum * OldDen
= (OldNum * TermDen + TermNum * OldDen) * OldDen
= OldNum * TermDen * OldDen + TermNum * OldDen^2
```

and:

```text
OldNum * NewDen
= OldNum * OldDen * TermDen
```

The difference is:

```text
TermNum * OldDen^2 >= 0
```

Therefore the accumulator is monotone non-decreasing.

## 4. Corridor Inclusion

The corridor variant only includes an interval when the current observation is
inside the agreed band:

```text
Include = Lower <= S_cur and S_cur <= Upper
Exclude = S_cur < Lower or S_cur > Upper
```

### Claim 5: Corridor Branch Coverage and Disjointness

If `Lower <= Upper`, exactly one of `Include` and `Exclude` holds.

Proof:

If `S_cur < Lower`, then `Exclude` holds and `Include` cannot hold.

If `S_cur >= Lower`, integer order gives either `S_cur <= Upper` or
`S_cur > Upper`. The first case gives `Include`; the second gives `Exclude`.
The definitions are complements, so both cannot hold.

## 5. Corridor Accumulator

The corridor accumulator uses the same denominator evolution as the full
variance accumulator. It adds the interval numerator only when included.

```text
CorrTermNum =
  TermNum  if Include
  0        if Exclude

CorrNewNum = CorrOldNum * TermDen + CorrTermNum * CorrOldDen
CorrNewDen = CorrOldDen * TermDen
```

### Claim 6: Corridor Accumulator Is Monotone

For every interval:

```text
CorrNewNum * CorrOldDen >= CorrOldNum * CorrNewDen
```

Proof:

The proof is identical to Claim 4, replacing `TermNum` with `CorrTermNum`.
Since `CorrTermNum` is either `TermNum >= 0` or `0`, it is non-negative.

### Claim 7: Excluded Interval Leaves Value Unchanged

If:

```text
Exclude = true
```

then:

```text
CorrTermNum = 0
CorrNewNum / CorrNewDen = CorrOldNum / CorrOldDen
```

Division-free:

```text
CorrNewNum * CorrOldDen = CorrOldNum * CorrNewDen
```

Proof:

Substitute `CorrTermNum = 0`:

```text
CorrNewNum = CorrOldNum * TermDen
CorrNewDen = CorrOldDen * TermDen
```

Then:

```text
CorrNewNum * CorrOldDen
= CorrOldNum * TermDen * CorrOldDen
= CorrOldNum * CorrOldDen * TermDen
= CorrOldNum * CorrNewDen
```

### Claim 8: Included Interval Matches Full Contribution

If:

```text
Include = true
```

then:

```text
CorrTermNum = TermNum
```

and the corridor update uses the same interval contribution as the full
variance update.

### Claim 9: Corridor Variance Is Bounded by Full Variance

Assume full and corridor accumulators start equal:

```text
FullNum_0 = CorrNum_0 = 0
FullDen_0 = CorrDen_0 = 1
```

and use the same denominator evolution each interval. If before an interval:

```text
CorrNum * FullDen <= FullNum * CorrDen
CorrTermNum <= TermNum
```

then after the interval:

```text
CorrNewNum * FullNewDen <= FullNewNum * CorrNewDen
```

Proof:

The updates are:

```text
CorrNewNum = CorrNum * TermDen + CorrTermNum * CorrDen
CorrNewDen = CorrDen * TermDen

FullNewNum = FullNum * TermDen + TermNum * FullDen
FullNewDen = FullDen * TermDen
```

We need:

```text
CorrNewNum * FullNewDen <= FullNewNum * CorrNewDen
```

Substitute and remove one common positive factor `TermDen` from both sides:

```text
(CorrNum * TermDen + CorrTermNum * CorrDen) * FullDen
  <=
(FullNum * TermDen + TermNum * FullDen) * CorrDen
```

Expand:

```text
CorrNum * TermDen * FullDen
  + CorrTermNum * CorrDen * FullDen
<=
FullNum * TermDen * CorrDen
  + TermNum * FullDen * CorrDen
```

The first term on the left is bounded by the first term on the right because:

```text
CorrNum * FullDen <= FullNum * CorrDen
```

and `TermDen > 0`. The second term on the left is bounded by the second term
on the right because:

```text
CorrTermNum <= TermNum
```

and `CorrDen, FullDen > 0`. Adding the two inequalities gives the desired
result. Since `CorrTermNum` is either `0` or `TermNum`, the premise
`CorrTermNum <= TermNum` always holds.

## 6. Variance Swap Payoff

Let realized variance be:

```text
VarRealized = VarNum / VarDen
```

and variance strike be:

```text
K_var = K_num / K_den
```

The signed long variance payoff in cents is:

```text
LongPayoff = N_var * (VarRealized - K_var)
```

Use rational representation:

```text
PayoffNum = N_var * (VarNum * K_den - K_num * VarDen)
PayoffDen = VarDen * K_den
```

Then:

```text
LongPayoff = PayoffNum / PayoffDen
ShortPayoff = -PayoffNum / PayoffDen
```

### Claim 10: Payoff Denominator Is Positive

If:

```text
VarDen > 0
K_den > 0
```

then:

```text
PayoffDen > 0
```

Proof:

`PayoffDen = VarDen * K_den`, a product of positive integers.

### Claim 11: Long and Short Payoffs Are Zero-Sum Before Caps

Using a shared denominator:

```text
LongPayoffNum = PayoffNum
ShortPayoffNum = -PayoffNum
```

Therefore:

```text
LongPayoffNum + ShortPayoffNum = 0
```

Proof:

Immediate cancellation.

### Claim 12: Strike Equality Gives Zero Payoff

If:

```text
VarNum * K_den = K_num * VarDen
```

then:

```text
PayoffNum = 0
```

Proof:

Substitute the equality into:

```text
PayoffNum = N_var * (VarNum * K_den - K_num * VarDen)
```

The parenthesized term is zero.

## 7. BTC Settlement of Signed Payoff

Let:

```text
AbsPayoffNum = abs(PayoffNum)
PayoffDen > 0
```

The absolute USD-cent payoff is:

```text
AbsPayoff = AbsPayoffNum / PayoffDen
```

The BTC claim in satoshis at final price `S_T` is:

```text
ClaimBTC = ceil((AbsPayoffNum * SAT) / (PayoffDen * S_T))
```

Quotient form:

```text
AbsPayoffNum * SAT = k * PayoffDen * S_T + rem
0 <= rem < PayoffDen * S_T

ClaimBTC =
  k      if rem = 0
  k + 1  if rem > 0
```

Then:

```text
ClaimBTC * PayoffDen * S_T >= AbsPayoffNum * SAT

ClaimBTC = 0
or
(ClaimBTC - 1) * PayoffDen * S_T < AbsPayoffNum * SAT
```

### Claim 13: Settlement Rounding Bound

If `AbsPayoffNum > 0`, then:

```text
0 <= ClaimBTC * PayoffDen * S_T - AbsPayoffNum * SAT
  < PayoffDen * S_T
```

If `AbsPayoffNum = 0`, then `ClaimBTC = 0` and the rounding error is zero.

Proof:

Directly from the quotient form of ceiling division.

## 8. Collateral-Capped Settlement

If `PayoffNum > 0`, long variance is owed by the short:

```text
PaidBTC = min(ShortQ, ClaimBTC)
LongOut = LongQ + PaidBTC
ShortOut = ShortQ - PaidBTC
```

If `PayoffNum < 0`, short variance is owed by the long:

```text
PaidBTC = min(LongQ, ClaimBTC)
LongOut = LongQ - PaidBTC
ShortOut = ShortQ + PaidBTC
```

If `PayoffNum = 0`:

```text
PaidBTC = 0
LongOut = LongQ
ShortOut = ShortQ
```

### Claim 14: Collateral-Capped Settlement Conserves BTC

For every payoff sign:

```text
LongOut + ShortOut = LongQ + ShortQ
```

Proof:

If long wins:

```text
LongOut + ShortOut
= LongQ + PaidBTC + ShortQ - PaidBTC
= LongQ + ShortQ
```

If short wins:

```text
LongOut + ShortOut
= LongQ - PaidBTC + ShortQ + PaidBTC
= LongQ + ShortQ
```

If payoff is zero, the identity is immediate.

### Claim 15: Losing-Side Loss Is Capped by Posted Collateral

If long wins:

```text
0 <= PaidBTC <= ShortQ
```

If short wins:

```text
0 <= PaidBTC <= LongQ
```

Proof:

`PaidBTC` is the minimum of the losing side's posted collateral and a
non-negative `ClaimBTC`.

## 9. cDLC Mapping

Each observation node updates a rational variance state.

Plain variance:

```text
price interval (S_{i-1}, S_i)
  -> compute TermNum = (S_i - S_{i-1})^2
  -> compute TermDen = S_{i-1}^2
  -> update VarNum, VarDen
  -> bridge to next observation state
```

Corridor variance:

```text
price interval (S_{i-1}, S_i)
  -> if Lower <= S_i <= Upper:
       add TermNum / TermDen
     else:
       add 0
  -> bridge to next observation state
```

Final settlement:

```text
final VarNum / VarDen
  -> compute PayoffNum / PayoffDen
  -> compute ClaimBTC
  -> settle long/short collateral with cap
```

The cryptographic fact that only the matching oracle outcome activates the
matching branch remains covered by the core cDLC adaptor-signature proofs. This
note proves the financial accumulator, payoff, and settlement invariants
attached to those branches.

## 10. Volatility Swap Boundary

A volatility swap payoff would depend on:

```text
sqrt(VarRealized) - K_vol
```

This introduces square-root approximation and rounding questions. The first
formal model should prove variance swaps only. A later volatility extension can
define an integer square-root approximation and prove:

```text
Root^2 <= VarScaled < (Root + 1)^2
```

before defining a volatility payoff. That is outside this issue's first
machine-checkable target.

## 11. SPARK Encoding Requirements

A future SPARK target for issue #25 should encode:

```text
TermNum(S_prev, S_cur)
TermDen(S_prev)
NextVarNum(OldNum, OldDen, TermNum, TermDen)
NextVarDen(OldDen, TermDen)
IncludeCorridor(S_cur, Lower, Upper)
CorrTermNum(TermNum, Include)
PayoffNum(N_var, VarNum, VarDen, K_num, K_den)
PayoffDen(VarDen, K_den)
ClaimBTC(AbsPayoffNum, PayoffDen, S_T)
CappedSettlement(LongQ, ShortQ, ClaimBTC, PayoffSign)
```

Required proof obligations:

```text
1. TermNum is non-negative.
2. TermDen is positive.
3. NextVarDen is positive.
4. NextVarNum is non-negative.
5. Variance accumulator is monotone non-decreasing.
6. Corridor include/exclude branches are disjoint and exhaustive.
7. Excluded corridor interval leaves rational variance value unchanged.
8. Included corridor interval matches the full interval contribution.
9. Corridor term numerator is bounded by the full term numerator.
10. Corridor variance is bounded by full variance under shared denominator evolution.
11. PayoffDen is positive.
12. Long and short payoff numerators sum to zero before caps.
13. Strike equality gives zero payoff.
14. ClaimBTC ceiling conversion covers absolute payoff.
15. ClaimBTC rounding error is less than one settlement denominator unit.
16. Collateral-capped settlement conserves total BTC.
17. Losing-side payout is capped by posted collateral.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers.
- Represent variance as rational pairs.
- Avoid logarithms and square roots in the first target.
- Carry signs in payoff numerators; keep denominators positive.
- Encode corridor include/exclude as separate Boolean branch predicates.
- Use quotient/remainder lemmas for ClaimBTC ceiling division.
- Do not use pragma Assume.
```

## 12. Boundary

This specification proves:

```text
- non-negative squared simple-return contributions;
- rational realized-variance accumulation;
- monotone variance accumulator behavior;
- corridor branch coverage and exclusion behavior;
- zero-sum variance payoff before caps;
- strike equality zero payoff;
- BTC settlement conservation and loss caps.
```

It does not prove:

```text
- log-return equivalence;
- square-root volatility approximation;
- fair variance or volatility pricing;
- oracle observation quality;
- manipulation resistance around observation times;
- market liquidity;
- fee safety or mempool confirmation;
- cDLC cryptographic activation, which is covered by the core proofs.
```
