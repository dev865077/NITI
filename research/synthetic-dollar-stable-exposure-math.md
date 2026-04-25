# Synthetic Dollar and Stable Exposure Math

This note resolves the mathematical specification for issue #8. It defines a
BTC-funded stable-value claim whose settlement is selected by a cDLC price
oracle. The goal is not to prove peg stability or market liquidity. The goal is
to prove the integer payoff and continuation invariants that a future SPARK
model can encode directly.

## 1. Units

Use integer units throughout.

```text
B = 100_000_000
```

`B` is the number of satoshis per BTC.

```text
Q  = BTC collateral in satoshis
D  = target stable claim in cents
P  = settlement BTC/USD price in cents per BTC
N  = D * B
```

Preconditions:

```text
Q >= 0
D >= 0
P > 0
B > 0
N = D * B
```

The scaled USD value of `q` satoshis at price `P` is:

```text
ValueScaled(q, P) = q * P
```

The scaled target value is:

```text
TargetScaled(D) = D * B = N
```

The comparison:

```text
q * P >= D * B
```

means that `q` satoshis are worth at least `D` cents.

## 2. Minimal Integer Stable Claim

The exact real-valued stable claim is:

```text
min(Q, D / S_T)
```

where `S_T` is the BTC/USD settlement price. In integer units, with `P` cents
per BTC, the uncapped satoshi claim needed to cover `D` cents is:

```text
Need(D, P) = ceil((D * B) / P)
           = ceil(N / P)
```

Define the actual stable-side BTC claim:

```text
StableClaim(Q, D, P) = min(Q, Need(D, P))
Residual(Q, D, P)    = Q - StableClaim(Q, D, P)
```

The `ceil` convention favors the stable-side holder by at most one satoshi
worth of scaled price. This is the conservative convention for a fixed-dollar
redemption claim. A different product can choose floor rounding, but it must
state the side favored by rounding.

## 3. Quotient Form

For `N >= 0` and `P > 0`, define:

```text
N = k * P + r
0 <= r < P
```

Then:

```text
Need(D, P) =
  k      if r = 0
  k + 1  if r > 0
```

Equivalent division-free characterization:

```text
Need(D, P) * P >= N

Need(D, P) = 0
or
(Need(D, P) - 1) * P < N
```

From the quotient form:

```text
0 <= Need(D, P) * P - N < P
```

when `N > 0`. If `N = 0`, then `Need(D, P) = 0` and the rounding error is
zero.

## 4. Branches

The payoff has two terminal settlement branches.

### 4.1 Solvent Branch

The state is solvent at par when:

```text
Q * P >= N
```

In this branch:

```text
StableClaim = Need(D, P)
Residual    = Q - StableClaim
```

Because `Q * P >= N` and `Need(D, P)` is the least non-negative integer whose
scaled value is at least `N`, the stable claim is bounded by collateral:

```text
Need(D, P) <= Q
```

Therefore:

```text
0 <= StableClaim <= Q
0 <= Residual <= Q
StableClaim + Residual = Q
StableClaim * P >= N
StableClaim = 0
or
(StableClaim - 1) * P < N
```

The stable-side holder receives enough satoshis to cover the target value, up
to the explicit ceil rounding rule.

### 4.2 Insolvent Branch

The state is insolvent at par when:

```text
Q * P < N
```

In this branch:

```text
StableClaim = Q
Residual    = 0
```

Then:

```text
StableClaim + Residual = Q
StableClaim * P = Q * P < N
```

The stable-side holder receives all collateral, and the contract cannot overpay
because there is no residual BTC left to transfer.

## 5. Core Proofs

### Claim 1: Branch Coverage

For `P > 0`, exactly one of the following holds:

```text
Q * P >= N
Q * P < N
```

Therefore the solvent and insolvent terminal branches cover every price
outcome and are disjoint.

### Claim 2: Stable Claim Boundedness

For all valid inputs:

```text
0 <= StableClaim(Q, D, P) <= Q
```

Proof:

`Need(D, P) >= 0` because `D >= 0`, `B > 0`, and `P > 0`.

`StableClaim` is the minimum of `Q` and `Need(D, P)`. Since both are
non-negative, the minimum is non-negative. Since it is also at most `Q`, the
upper bound follows.

### Claim 3: BTC Conservation

For all valid inputs:

```text
StableClaim(Q, D, P) + Residual(Q, D, P) = Q
```

Proof:

By definition:

```text
Residual = Q - StableClaim
```

By Claim 2, `StableClaim <= Q`, so subtraction is non-negative. Therefore:

```text
StableClaim + Residual
= StableClaim + (Q - StableClaim)
= Q
```

### Claim 4: Solvent Coverage

If:

```text
Q * P >= N
```

then:

```text
StableClaim(Q, D, P) * P >= N
```

Proof:

In the solvent branch, `StableClaim = Need(D, P)`. By the definition of
ceiling division:

```text
Need(D, P) * P >= N
```

Therefore the stable-side BTC claim covers the target in scaled integer form.

### Claim 5: Solvent Claim Fits Collateral

If:

```text
Q * P >= N
```

then:

```text
Need(D, P) <= Q
```

Proof:

`Need(D, P)` is the least non-negative integer `c` such that:

```text
c * P >= N
```

The premise gives such an integer candidate, namely `Q`. Since `Need(D, P)` is
least among all such candidates:

```text
Need(D, P) <= Q
```

### Claim 6: Insolvent Exhaustion

If:

```text
Q * P < N
```

then:

```text
StableClaim(Q, D, P) = Q
Residual(Q, D, P) = 0
StableClaim(Q, D, P) * P < N
```

Proof:

If `Q * P < N`, then the full collateral is worth less than the target. The
terminal waterfall transfers all BTC collateral to the stable-side holder:

```text
StableClaim = Q
Residual = 0
```

Substituting:

```text
StableClaim * P = Q * P < N
```

### Claim 7: Rounding Error Bound

If the solvent branch holds, then:

```text
0 <= StableClaim(Q, D, P) * P - N < P
```

for `N > 0`. If `N = 0`, the error is `0`.

Proof:

In the solvent branch, `StableClaim = Need(D, P)`. The quotient form of
ceiling division gives:

```text
Need(D, P) * P >= N
Need(D, P) * P - N < P
```

The first inequality gives the lower bound. The second gives the strict upper
bound. For `N = 0`, `Need(D, P) = 0`, so the error is zero.

## 6. Reserve and Continuation Thresholds

Let the target reserve ratio be:

```text
H = H_num / H_den
```

with:

```text
H_num >= H_den > 0
```

The reserve invariant is:

```text
Q * P * H_den >= D * B * H_num
```

This means collateral value is at least `H` times the stable target.

Define:

```text
Healthy(Q, D, P, H_num, H_den)
  iff Q * P * H_den >= D * B * H_num

ParSolvent(Q, D, P)
  iff Q * P >= D * B

Insolvent(Q, D, P)
  iff Q * P < D * B

NeedsDeRisk(Q, D, P, H_num, H_den)
  iff ParSolvent(Q, D, P) and not Healthy(Q, D, P, H_num, H_den)
```

The `Healthy`, `NeedsDeRisk`, and `Insolvent` branches do not by themselves
prove a market peg. They are deterministic cDLC branch predicates over oracle
price outcomes.

## 7. Healthy Roll

If:

```text
Healthy(Q, D, P, H_num, H_den)
```

then the child synthetic-dollar state can be funded with the same collateral
and target:

```text
Q' = Q
D' = D
P_0' = P
```

and the child state starts with the reserve invariant:

```text
Q' * P_0' * H_den >= D' * B * H_num
```

Proof:

Substitute the child values:

```text
Q' * P_0' * H_den
= Q * P * H_den
>= D * B * H_num
= D' * B * H_num
```

## 8. De-Risk Transition

When the state is solvent but below the reserve target, the protocol can repay
part of the stable target and roll the remaining liability.

Let:

```text
A = stable target reduction in cents
```

with:

```text
0 <= A <= D
```

The BTC paid to reduce the target by `A` cents is:

```text
PayBTC(A, P) = ceil((A * B) / P)
```

The post-transition child state is:

```text
Q' = Q - PayBTC(A, P)
D' = D - A
P_0' = P
```

This transition is valid only if:

```text
PayBTC(A, P) <= Q
Q' * P_0' * H_den >= D' * B * H_num
```

Under those preconditions, the de-risk transition proves:

```text
0 <= Q' <= Q
0 <= D' <= D
PayBTC(A, P) + Q' = Q
Q' * P_0' * H_den >= D' * B * H_num
```

The first three properties are accounting conservation. The last property is
the restored reserve invariant for the child cDLC state.

In an exact real-valued model with no satoshi rounding and `H_num > H_den`, the
minimum target reduction that can restore the reserve target must satisfy:

```text
A * B * (H_num - H_den)
  >= D * B * H_num - Q * P * H_den
```

The integer model should not rely on this formula alone, because satoshi
rounding can make `PayBTC(A, P) * P` slightly larger than `A * B`. A production
policy can use the exact formula as a candidate generator, but the cDLC branch
must verify the post-transition reserve invariant directly.

## 9. Liquidation Threshold

Some products use an additional liquidation threshold:

```text
L = L_num / L_den
```

with:

```text
H_num / H_den >= L_num / L_den >= 1
```

The liquidation-warning predicate is:

```text
Q * P * L_den < D * B * L_num
```

This predicate means collateral is below the policy threshold `L`, not
necessarily below par. If `L > 1`, transferring all collateral to the
stable-side holder can overpay the target. Therefore this math spec makes a
strict distinction:

```text
Full-collateral terminal insolvency:
  Q * P < D * B

Policy liquidation above par:
  Q * P >= D * B
  and Q * P * L_den < D * B * L_num
```

Above-par liquidation must use the solvent payoff or a de-risk waterfall, not
an unconditional transfer of all collateral. Full collateral transfer is only
the insolvent waterfall.

## 10. cDLC Mapping

For each oracle price bucket `P_i`, the parent DLC has a CET whose payout and
continuation branch are determined by the integer predicates above.

```text
Price outcome P_i
  -> compute StableClaim(Q, D, P_i)
  -> compute Residual(Q, D, P_i)
  -> select terminal, roll, or de-risk branch
  -> oracle scalar activates the matching bridge transaction
```

Healthy roll:

```text
CET_i creates an edge output O_roll
B_roll spends O_roll into the next synthetic-dollar DLC funding output
```

De-risk:

```text
CET_i pays PayBTC(A, P_i) to reduce stable target
CET_i or B_derisk funds the child state with Q' and D'
```

Insolvent terminal:

```text
CET_i pays Q to the stable-side holder
No residual child state is funded
```

The cryptographic condition that only the correct price-outcome scalar
activates the corresponding bridge is covered by the existing cDLC algebra.
This note only proves the financial payoff and continuation invariants attached
to each branch.

## 11. SPARK Encoding Requirements

A future SPARK target for issue #9 should encode:

```text
Need(D, P) = ceil((D * B) / P)
StableClaim(Q, D, P) = min(Q, Need(D, P))
Residual(Q, D, P) = Q - StableClaim(Q, D, P)
Healthy(Q, D, P, H_num, H_den)
PayBTC(A, P) = ceil((A * B) / P)
```

Required proof obligations:

```text
1. Need(D, P) * P >= D * B.
2. Need(D, P) = 0 or (Need(D, P) - 1) * P < D * B.
3. 0 <= StableClaim(Q, D, P) <= Q.
4. StableClaim(Q, D, P) + Residual(Q, D, P) = Q.
5. If Q * P >= D * B, then StableClaim(Q, D, P) * P >= D * B.
6. If Q * P < D * B, then StableClaim(Q, D, P) = Q and Residual(Q, D, P) = 0.
7. In the solvent branch, rounding error is less than P in scaled units.
8. Healthy roll preserves the reserve invariant.
9. Valid de-risk preserves BTC conservation and restores the reserve invariant.
10. Full-collateral terminal settlement is restricted to the insolvent branch.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers for the first pass.
- Represent `ceil(n / d)` using quotient and remainder lemmas.
- Keep all thresholds in cross-multiplied integer form.
- Put every economic policy choice in preconditions.
- Do not use pragma Assume.
```

## 12. Boundary

This specification proves:

```text
- integer stable-claim boundedness;
- BTC conservation;
- scaled USD target coverage in the solvent branch;
- collateral exhaustion in the insolvent branch;
- rounding direction and bound;
- reserve preservation for healthy roll and valid de-risk transitions.
```

It does not prove:

```text
- BTC/USD oracle correctness;
- peg stability;
- market liquidity;
- liquidation execution quality;
- fee safety;
- regulatory treatment;
- wallet or transaction serialization correctness;
- cDLC cryptographic activation, which is covered by the core cDLC proofs.
```
