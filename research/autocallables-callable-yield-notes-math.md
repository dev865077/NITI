# Autocallables and Callable Yield Notes Math

This note defines the mathematical specification for autocallables and callable yield notes. It models a
finite discrete-observation structured note whose cDLC state either redeems
early when an autocall trigger is met or continues with an updated coupon state.

The model covers autocallables, callable yield notes, snowball-style coupon
memory, and a minimal reverse-convertible maturity payoff. It proves branch
coverage, coupon-state updates, early redemption, terminal collateral
conservation, and liability bounds. It does not prove fair coupon pricing,
investor suitability, issuer solvency beyond posted collateral, oracle quality,
or secondary-market liquidity.

## 1. Units

Use integer units.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
Q_i = posted BTC collateral at observation i, in satoshis
N = principal / protected notional in cents
S_i = observation BTC/USD price in cents per BTC
A_i = autocall trigger in cents per BTC
C_i = coupon barrier in cents per BTC
c_i = current period coupon in cents
Accrued_i = unpaid coupon state in cents
R = reverse-convertible BTC reference notional in satoshis
```

Preconditions:

```text
Q_i >= 0
N >= 0
S_i > 0
A_i >= C_i
C_i >= 0
c_i >= 0
Accrued_i >= 0
R >= 0
SAT > 0
```

Scaled USD values use:

```text
Scaled(x cents) = x * SAT
```

The scaled USD value of `q` satoshis at price `S_i` is:

```text
BTCValueScaled(q, S_i) = q * S_i
```

Scaling avoids real-number division in payout and threshold proofs.

## 2. Observation Branches

Each observation has three mutually exclusive branches.

```text
Autocall_i:
  S_i >= A_i

CouponContinue_i:
  S_i < A_i and S_i >= C_i

NoCouponContinue_i:
  S_i < C_i
```

The condition `A_i >= C_i` is a product convention. It means the autocall level
is not below the coupon barrier.

### Claim 1: Branch Coverage

For every valid observation price `S_i`, exactly one of the three branches
holds.

Proof:

Integer order gives either `S_i >= A_i` or `S_i < A_i`. If `S_i >= A_i`, the
autocall branch holds. Because the other branches require `S_i < A_i` or
`S_i < C_i`, they cannot both hold with autocall.

If `S_i < A_i`, integer order gives either `S_i >= C_i` or `S_i < C_i`. The
former selects `CouponContinue_i`; the latter selects `NoCouponContinue_i`.
The two continuation branches are strict complements under `S_i < A_i`.

Since `A_i >= C_i`, `S_i < C_i` implies `S_i < A_i`, so the no-coupon branch
does not need to repeat the autocall exclusion.

### Claim 2: Branch Disjointness

No two branches can hold at the same observation.

Proof:

`Autocall_i` requires `S_i >= A_i`; both continuation branches imply
`S_i < A_i`. Therefore autocall is disjoint from continuation.

`CouponContinue_i` requires `S_i >= C_i`; `NoCouponContinue_i` requires
`S_i < C_i`. Therefore the continuation branches are disjoint.

## 3. Coupon-State Variants

The coupon state must be explicit. This spec separates memory and non-memory
variants because they have different postconditions.

### 3.1 Memory Coupon

In the memory variant, missed coupon entitlement remains in the state.

Autocall redemption uses:

```text
RedeemUSD_i = N + Accrued_i + c_i
```

Continuation update:

```text
if CouponContinue_i:
  Accrued_{i+1} = Accrued_i + c_i

if NoCouponContinue_i:
  Accrued_{i+1} = Accrued_i
```

### Claim 3: Memory Accrual Is Monotonic

In every continuation branch:

```text
Accrued_{i+1} >= Accrued_i
```

Proof:

If `CouponContinue_i`, then `Accrued_{i+1} = Accrued_i + c_i`, and `c_i >= 0`.
If `NoCouponContinue_i`, then `Accrued_{i+1} = Accrued_i`.

### 3.2 Non-Memory Coupon

In the non-memory variant, a missed observation resets the unpaid coupon state.

Autocall redemption uses:

```text
RedeemUSD_i = N + Accrued_i + c_i
```

Continuation update:

```text
if CouponContinue_i:
  Accrued_{i+1} = Accrued_i + c_i

if NoCouponContinue_i:
  Accrued_{i+1} = 0
```

### Claim 4: Non-Memory Accrual Postconditions

If `CouponContinue_i`, then:

```text
Accrued_{i+1} = Accrued_i + c_i
Accrued_{i+1} >= Accrued_i
```

If `NoCouponContinue_i`, then:

```text
Accrued_{i+1} = 0
```

Proof:

Direct substitution from the non-memory update rules. The inequality in the
coupon branch follows from `c_i >= 0`.

## 4. Early Redemption

If the autocall trigger is met, the note terminates and redeems:

```text
RedeemUSD_i = N + Accrued_i + c_i
RedeemScaled_i = RedeemUSD_i * SAT
State_{i+1} = Terminal
```

Because `A_i >= C_i`, an autocall observation also satisfies the coupon barrier
when the current coupon is due:

```text
S_i >= A_i and A_i >= C_i
=> S_i >= C_i
```

### Claim 5: Redemption Amount Equals Principal Plus Accrued Coupons

In the autocall branch:

```text
RedeemUSD_i = N + Accrued_i + c_i
RedeemScaled_i = (N + Accrued_i + c_i) * SAT
```

Proof:

Direct substitution from the redemption definition.

### Claim 6: No Continuation After Terminal Autocall

In the autocall branch:

```text
State_{i+1} = Terminal
```

Therefore no child observation state is funded by the same branch.

Proof:

This is a state-machine rule, not a market assumption. The cDLC graph for the
autocall branch must point to terminal settlement outputs, while continuation
branches point to child observation DLCs.

## 5. BTC Redemption Conversion

For any terminal redemption amount:

```text
ClaimBTC_i = ceil(RedeemScaled_i / S_i)
```

Quotient form:

```text
RedeemScaled_i = k * S_i + rem
0 <= rem < S_i

ClaimBTC_i =
  k      if rem = 0
  k + 1  if rem > 0
```

Then:

```text
ClaimBTC_i * S_i >= RedeemScaled_i

ClaimBTC_i = 0
or
(ClaimBTC_i - 1) * S_i < RedeemScaled_i
```

Actual outputs are capped by posted collateral:

```text
InvestorBTC_i = Min(Q_i, ClaimBTC_i)
IssuerResidualBTC_i = Q_i - InvestorBTC_i
```

### Claim 7: Terminal Branch Conserves BTC Collateral

For every terminal redemption:

```text
0 <= InvestorBTC_i <= Q_i
0 <= IssuerResidualBTC_i <= Q_i
InvestorBTC_i + IssuerResidualBTC_i = Q_i
```

Proof:

`InvestorBTC_i` is the minimum of `Q_i` and a non-negative claim, so it is
non-negative and at most `Q_i`. Therefore `IssuerResidualBTC_i` is
non-negative. Conservation follows by substitution.

### Claim 8: Sufficient Collateral Covers Redemption

If:

```text
ClaimBTC_i <= Q_i
```

then:

```text
InvestorBTC_i = ClaimBTC_i
InvestorBTC_i * S_i >= RedeemScaled_i
```

Proof:

The first equality follows from `Min(Q_i, ClaimBTC_i) = ClaimBTC_i`. The
second follows from the ceiling-division property.

### Claim 9: Redemption Rounding Bound

If `ClaimBTC_i <= Q_i` and `RedeemScaled_i > 0`, then:

```text
0 <= InvestorBTC_i * S_i - RedeemScaled_i < S_i
```

If `RedeemScaled_i = 0`, the rounding error is zero.

Proof:

Under sufficient collateral, `InvestorBTC_i = ClaimBTC_i`. The quotient form
of ceiling division gives the lower and upper bounds.

## 6. Continuation Branches

Continuation branches do not redeem principal. They fund the next observation
state.

Memory continuation:

```text
Q_{i+1} = Q_i

if CouponContinue_i:
  Accrued_{i+1} = Accrued_i + c_i

if NoCouponContinue_i:
  Accrued_{i+1} = Accrued_i
```

Non-memory continuation:

```text
Q_{i+1} = Q_i

if CouponContinue_i:
  Accrued_{i+1} = Accrued_i + c_i

if NoCouponContinue_i:
  Accrued_{i+1} = 0
```

### Claim 10: Continuation Preserves BTC Collateral

In every continuation branch:

```text
Q_{i+1} = Q_i
```

Proof:

Direct substitution from the continuation transition. Any fee or coupon paid
out during continuation must be modeled as a separate explicit transfer; this
minimal spec treats coupons as accrued until terminal redemption.

## 7. Liability Bounds

For a finite observation path from `0` to `i`, define:

```text
CouponSum_i = c_0 + c_1 + ... + c_i
```

Assuming `Accrued_0 >= 0`, every memory or non-memory path satisfies:

```text
0 <= Accrued_i <= Accrued_0 + c_0 + ... + c_{i-1}
```

Therefore autocall redemption at observation `i` is bounded by:

```text
RedeemUSD_i <= N + Accrued_0 + CouponSum_i
```

### Claim 11: Finite Coupon Liability Bound

For any finite path before observation `i`:

```text
Accrued_i <= Accrued_0 + c_0 + ... + c_{i-1}
```

Proof:

By induction over continuation steps.

Base case:

```text
Accrued_0 <= Accrued_0
```

Induction step:

In a memory coupon branch, the state either adds `c_i` or preserves the prior
state. In a non-memory branch, the state either adds `c_i` or resets to zero.
In every case:

```text
Accrued_{i+1} <= Accrued_i + c_i
```

Using the induction hypothesis:

```text
Accrued_{i+1}
<= Accrued_0 + c_0 + ... + c_{i-1} + c_i
```

### Claim 12: Maximum Autocall Liability Bound

At observation `i`:

```text
RedeemUSD_i = N + Accrued_i + c_i
```

and Claim 11 gives:

```text
RedeemUSD_i <= N + Accrued_0 + CouponSum_i
```

This is the maximum uncapped USD liability for that observation under the
coupon-state rules.

If the posted collateral satisfies:

```text
Q_i * S_i >= (N + Accrued_0 + CouponSum_i) * SAT
```

then it can cover every autocall redemption amount at observation `i`.

## 8. Maturity Without Autocall

If no autocall has occurred by final observation `T`, the product terminates at
maturity. A principal-protected maturity payoff is:

```text
MaturityUSD = N + Accrued_T
MaturityScaled = MaturityUSD * SAT
```

A minimal reverse-convertible maturity principal component is:

```text
ReferenceScaled = R * S_T
PrincipalScaled = N * SAT
ReversePrincipalScaled = Min(PrincipalScaled, ReferenceScaled)
ReverseMaturityScaled = ReversePrincipalScaled + Accrued_T * SAT
```

If the reference asset fell below the effective conversion value, investor
principal is reduced to the reference value. Otherwise principal is capped at
`N`.

### Claim 13: Reverse Principal Is Bounded

For reverse-convertible maturity:

```text
0 <= ReversePrincipalScaled <= PrincipalScaled
```

Proof:

`ReversePrincipalScaled` is the minimum of two non-negative scaled values, so
it is non-negative and at most `PrincipalScaled`.

### Claim 14: Principal-Protected Maturity Is Covered Under Sufficient Collateral

If:

```text
MaturityClaimBTC = ceil(MaturityScaled / S_T)
MaturityClaimBTC <= Q_T
```

then:

```text
InvestorBTC_T * S_T >= MaturityScaled
```

Proof:

This is Claim 8 applied to the maturity redemption amount.

## 9. cDLC Mapping

Each observation node uses the branch predicates from Section 2.

```text
Observation outcome S_i
  -> if S_i >= A_i:
       terminal autocall CET pays redemption/residual
  -> else if S_i >= C_i:
       bridge to child observation state with updated accrued coupon
  -> else:
       bridge to child observation state with missed-coupon update
```

Memory coupon child state:

```text
CouponContinue_i:
  (Q_{i+1}, Accrued_{i+1}) = (Q_i, Accrued_i + c_i)

NoCouponContinue_i:
  (Q_{i+1}, Accrued_{i+1}) = (Q_i, Accrued_i)
```

Non-memory coupon child state:

```text
CouponContinue_i:
  (Q_{i+1}, Accrued_{i+1}) = (Q_i, Accrued_i + c_i)

NoCouponContinue_i:
  (Q_{i+1}, Accrued_{i+1}) = (Q_i, 0)
```

Terminal autocall:

```text
RedeemScaled_i = (N + Accrued_i + c_i) * SAT
InvestorBTC_i = Min(Q_i, ceil(RedeemScaled_i / S_i))
IssuerResidualBTC_i = Q_i - InvestorBTC_i
```

The cryptographic fact that only the correct oracle outcome activates the
matching branch remains covered by the core cDLC adaptor-signature proofs. This
note proves the financial state and accounting invariants attached to those
branches.

## 10. SPARK Encoding Requirements

A future SPARK target should encode:

```text
Autocall(S, A)
CouponContinue(S, A, C)
NoCouponContinue(S, C)
MemoryAccruedNext(Accrued, Coupon, Branch)
NonMemoryAccruedNext(Accrued, Coupon, Branch)
RedeemUSD(Principal, Accrued, Coupon)
RedeemScaled(RedeemUSD)
ClaimBTC(RedeemScaled, S)
InvestorBTC(Q, ClaimBTC)
IssuerResidualBTC(Q, ClaimBTC)
ReversePrincipalScaled(Principal, R, S_T)
```

Required proof obligations:

```text
1. Observation branches are disjoint when A >= C.
2. Observation branches cover every integer price when A >= C.
3. Memory coupon update is monotonic across continuation.
4. Non-memory coupon update proves exact coupon and reset postconditions.
5. Autocall redemption equals principal plus accrued plus current coupon.
6. Autocall branch sets terminal state.
7. No continuation state is funded after terminal autocall.
8. Continuation branches preserve posted BTC collateral.
9. Terminal redemption outputs conserve posted BTC collateral.
10. If collateral is sufficient, BTC redemption covers scaled USD redemption.
11. Redemption rounding error is less than one satoshi-valued unit.
12. Finite coupon liability is bounded by initial accrued plus coupon sum.
13. Maximum autocall liability is bounded by principal plus coupon sum.
14. Reverse-convertible principal component is non-negative and capped by principal.
15. Principal-protected maturity is covered under the sufficient-collateral predicate.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers for arithmetic.
- Encode each branch predicate as a separate Boolean function.
- Put `A >= C` in Pre conditions for coverage/disjointness lemmas.
- Keep memory and non-memory coupon updates as separate functions.
- Use quotient/remainder lemmas for ClaimBTC ceiling division.
- Model terminal state as a Boolean or enumeration.
- Do not use pragma Assume.
```

## 11. Boundary

This specification proves:

```text
- observation branch coverage and disjointness;
- memory and non-memory coupon-state updates;
- early redemption amount;
- terminal and continuation state separation;
- BTC collateral conservation;
- sufficient-collateral redemption coverage;
- finite coupon liability bounds;
- minimal reverse-convertible principal cap.
```

It does not prove:

```text
- fair coupon pricing;
- volatility or correlation assumptions;
- investor suitability;
- issuer solvency beyond posted collateral;
- secondary-market liquidity;
- oracle correctness;
- fee safety or mempool confirmation;
- cDLC cryptographic activation, which is covered by the core proofs.
```
