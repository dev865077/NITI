# Barrier Options and Knock-In/Knock-Out Continuations Math

This note resolves the mathematical specification for issue #16. It models
discrete barrier observation states and the option payoffs that depend on those
states: one-touch, no-touch, knock-in calls/puts, knock-out calls/puts, and
barrier-triggered cDLC continuation states.

The model is discrete. It proves finite observation accounting and payoff
selection. It does not prove continuous-time monitoring, oracle sampling
quality, latency, or manipulation resistance around observation times.

## 1. Units

Use integer units.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
Q = posted BTC collateral in satoshis
R = BTC reference notional in satoshis
S_i = observed BTC/USD price at observation i, in cents per BTC
S_T = expiry BTC/USD price in cents per BTC
H = barrier level in cents per BTC
K = strike in cents per BTC
A = digital touch payout in cents
Touched_i = Boolean barrier state after observations through i
Live_i = Boolean knock-out state after observations through i
```

Preconditions:

```text
Q >= 0
R >= 0
S_i > 0
S_T > 0
H >= 0
K >= 0
A >= 0
SAT > 0
```

The scaled USD value of `q` satoshis at price `S` is:

```text
BTCValueScaled(q, S) = q * S
```

If `ValueCents` is a USD-cent amount, its scaled value is:

```text
ValueScaled = ValueCents * SAT
```

The model keeps payoffs scaled by `SAT`, so settlement conversion back to
satoshis uses integer ceiling division.

## 2. Barrier Predicates

Equality belongs to the touch branch. This is a protocol convention and must be
fixed before transaction negotiation.

Up barrier:

```text
HitUp(S, H) = S >= H
MissUp(S, H) = S < H
```

Down barrier:

```text
HitDown(S, H) = S <= H
MissDown(S, H) = S > H
```

### Claim 1: Up-Barrier Branch Coverage

For every integer price `S`, exactly one of the following holds:

```text
HitUp(S, H)
MissUp(S, H)
```

Proof:

Integer order gives either `S >= H` or `S < H`. These predicates are strict
complements, so they cannot both hold.

### Claim 2: Down-Barrier Branch Coverage

For every integer price `S`, exactly one of the following holds:

```text
HitDown(S, H)
MissDown(S, H)
```

Proof:

Integer order gives either `S <= H` or `S > H`. These predicates are strict
complements, so they cannot both hold.

## 3. Touch-State Update

For a knock-in or one-touch product, the barrier state is absorbing:

```text
Touched_{i+1} = Touched_i or Hit(S_i, H)
```

where `Hit` is either `HitUp` or `HitDown`.

### Claim 3: Touch Monotonicity

If:

```text
Touched_i = true
```

then:

```text
Touched_{i+1} = true
```

Proof:

```text
Touched_{i+1}
= Touched_i or Hit(S_i, H)
= true or Hit(S_i, H)
= true
```

### Claim 4: Touch Activation

If:

```text
Touched_i = false
Hit(S_i, H) = true
```

then:

```text
Touched_{i+1} = true
```

Proof:

```text
Touched_{i+1}
= false or true
= true
```

### Claim 5: Touch Remains False Only If Missed

If:

```text
Touched_{i+1} = false
```

then:

```text
Touched_i = false
Hit(S_i, H) = false
```

Proof:

The only way an `or` expression is false is for both operands to be false.

## 4. Knock-Out Live-State Update

For a knock-out or no-touch product, the live state is also absorbing, but in
the opposite direction:

```text
Live_{i+1} = Live_i and Miss(S_i, H)
```

where `Miss` is either `MissUp` or `MissDown`.

### Claim 6: Knock-Out Absorption

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
= false and Miss(S_i, H)
= false
```

### Claim 7: Live Continuation Requires Prior Live State and Miss

If:

```text
Live_{i+1} = true
```

then:

```text
Live_i = true
Miss(S_i, H) = true
```

Proof:

The only way an `and` expression is true is for both operands to be true.

## 5. Observation Transition Accounting

Pure observation transitions do not transfer collateral:

```text
Q_next = Q
```

Therefore:

```text
Q_next = Q
```

and collateral is preserved exactly.

For an immediate knock-out termination with a rebate:

```text
RebateScaled = A * SAT
RebateBTC = ceil(RebateScaled / S_i)
PaidBTC = Min(Q, RebateBTC)
ResidualBTC = Q - PaidBTC
```

Then:

```text
0 <= PaidBTC <= Q
0 <= ResidualBTC <= Q
PaidBTC + ResidualBTC = Q
```

The rebate is covered if `RebateBTC <= Q`. If collateral is insufficient,
`PaidBTC = Q` and the product pays all posted collateral.

## 6. Vanilla Expiry Payoffs

Use reference notional `R` in satoshis. The scaled vanilla call payoff is:

```text
CallScaled(S_T, K) =
  R * (S_T - K)  if S_T > K
  0              otherwise
```

The scaled vanilla put payoff is:

```text
PutScaled(S_T, K) =
  R * (K - S_T)  if K > S_T
  0              otherwise
```

These are scaled USD-cent values. For example, the unscaled call payoff in
cents is `R * max(S_T - K, 0) / SAT`.

### Claim 8: Vanilla Payoffs Are Non-Negative

For all valid inputs:

```text
CallScaled(S_T, K) >= 0
PutScaled(S_T, K) >= 0
```

Proof:

Each payoff is either zero or a product of non-negative terms.

## 7. Knock-In Payoffs

A knock-in option pays the vanilla option only if the barrier has touched by
expiry.

Knock-in call:

```text
KICallScaled =
  CallScaled(S_T, K)  if Touched_T
  0                   otherwise
```

Knock-in put:

```text
KIPutScaled =
  PutScaled(S_T, K)   if Touched_T
  0                   otherwise
```

### Claim 9: Knock-In Equals Vanilla After Activation

If:

```text
Touched_T = true
```

then:

```text
KICallScaled = CallScaled(S_T, K)
KIPutScaled = PutScaled(S_T, K)
```

Proof:

Substitute `Touched_T = true` into the payoff definitions.

### Claim 10: Knock-In Payoff Is Zero Without Activation

If:

```text
Touched_T = false
```

then:

```text
KICallScaled = 0
KIPutScaled = 0
```

Proof:

Substitute `Touched_T = false` into the payoff definitions.

## 8. Knock-Out Payoffs

A knock-out option pays the vanilla option only if the barrier has not knocked
the option out by expiry.

Knock-out call:

```text
KOCallScaled =
  CallScaled(S_T, K)  if Live_T
  0                   otherwise
```

Knock-out put:

```text
KOPutScaled =
  PutScaled(S_T, K)   if Live_T
  0                   otherwise
```

### Claim 11: Knock-Out Equals Vanilla While Live

If:

```text
Live_T = true
```

then:

```text
KOCallScaled = CallScaled(S_T, K)
KOPutScaled = PutScaled(S_T, K)
```

Proof:

Substitute `Live_T = true` into the payoff definitions.

### Claim 12: Knock-Out Payoff Is Zero After Knock-Out

If:

```text
Live_T = false
```

then:

```text
KOCallScaled = 0
KOPutScaled = 0
```

Proof:

Substitute `Live_T = false` into the payoff definitions.

## 9. One-Touch and No-Touch Digitals

The issue text asks for a no-touch zero-payoff proof if the barrier predicate
never held. That is not the market convention. This specification uses the
standard convention:

```text
one-touch pays if the barrier touched;
no-touch pays if the barrier never touched.
```

One-touch:

```text
OneTouchScaled =
  A * SAT  if Touched_T
  0        otherwise
```

No-touch:

```text
NoTouchScaled =
  A * SAT  if Live_T
  0        otherwise
```

where `Live_T = true` means the barrier was never hit during the observation
window.

### Claim 13: One-Touch Is Zero If Never Touched

If:

```text
Touched_T = false
```

then:

```text
OneTouchScaled = 0
```

### Claim 14: No-Touch Is Zero If Touched

If:

```text
Live_T = false
```

then:

```text
NoTouchScaled = 0
```

Both claims follow directly from the digital payoff definitions.

## 10. BTC Settlement Conversion

For any non-negative scaled payoff:

```text
ClaimBTC = ceil(PayoffScaled / S_T)
```

Quotient form:

```text
PayoffScaled = k * S_T + rem
0 <= rem < S_T

ClaimBTC =
  k      if rem = 0
  k + 1  if rem > 0
```

Then:

```text
ClaimBTC * S_T >= PayoffScaled

ClaimBTC = 0
or
(ClaimBTC - 1) * S_T < PayoffScaled
```

The cDLC settlement outputs are:

```text
OptionHolderBTC = Min(Q, ClaimBTC)
ResidualBTC = Q - OptionHolderBTC
```

### Claim 15: BTC Settlement Conserves Collateral

For all valid inputs:

```text
0 <= OptionHolderBTC <= Q
0 <= ResidualBTC <= Q
OptionHolderBTC + ResidualBTC = Q
```

Proof:

`OptionHolderBTC` is the minimum of `Q` and a non-negative claim, so it is
non-negative and at most `Q`. Therefore `ResidualBTC = Q - OptionHolderBTC` is
non-negative. Conservation follows by substitution.

### Claim 16: Sufficient Collateral Covers Payoff

If:

```text
ClaimBTC <= Q
```

then:

```text
OptionHolderBTC = ClaimBTC
OptionHolderBTC * S_T >= PayoffScaled
```

Proof:

The first equality follows from `Min(Q, ClaimBTC) = ClaimBTC`. The second
follows from ceiling division.

### Claim 17: Settlement Rounding Bound

If `ClaimBTC <= Q` and `PayoffScaled > 0`, then:

```text
0 <= OptionHolderBTC * S_T - PayoffScaled < S_T
```

If `PayoffScaled = 0`, the rounding error is zero.

Proof:

Under sufficient collateral, `OptionHolderBTC = ClaimBTC`. The quotient form
of ceiling division gives the lower and upper bounds.

## 11. Finite Observation Graph

For observations `i = 0 .. n - 1`, define:

```text
Touched_0 = initial touched state
Touched_{i+1} = Touched_i or Hit(S_i, H)
```

Then:

```text
Touched_n = true
```

if and only if either `Touched_0 = true` or at least one observation hit the
barrier.

### Claim 18: Finite Touch-State Characterization

For a finite observation sequence:

```text
Touched_n = Touched_0 or Hit(S_0, H) or ... or Hit(S_{n-1}, H)
```

Proof:

By induction on `n`.

Base case `n = 0`:

```text
Touched_0 = Touched_0
```

Induction step:

Assume the statement holds for `n`. Then:

```text
Touched_{n+1}
= Touched_n or Hit(S_n, H)
= Touched_0 or Hit(S_0, H) or ... or Hit(S_{n-1}, H) or Hit(S_n, H)
```

### Claim 19: Every Observation Has Exactly One Next State

At each observation node, the up-barrier branch pair:

```text
HitUp(S_i, H)
MissUp(S_i, H)
```

or the down-barrier branch pair:

```text
HitDown(S_i, H)
MissDown(S_i, H)
```

covers every oracle price outcome exactly once. Therefore a finite observation
graph whose nodes use one of these branch pairs has exactly one next state for
each price outcome at each node.

## 12. cDLC Mapping

Observation node for knock-in:

```text
if Hit(S_i, H):
  bridge to active option state with Touched = true
else:
  bridge to latent next observation state
```

Observation node for knock-out:

```text
if Hit(S_i, H):
  terminate, rebate, or bridge to refund state with Live = false
else:
  bridge to live next observation state
```

Expiry node:

```text
state flag + S_T
  -> compute option or digital PayoffScaled
  -> compute ClaimBTC
  -> pay OptionHolderBTC and ResidualBTC
```

For pure observation transitions:

```text
Q_next = Q
```

For terminal or rebate transitions:

```text
PaidBTC + ResidualBTC = Q
```

The cryptographic fact that only the matching oracle outcome activates the
matching bridge is covered by the core cDLC adaptor-signature proofs. This note
proves the financial state and payoff invariants attached to those branches.

## 13. SPARK Encoding Requirements

A future SPARK target for issue #17 should encode:

```text
HitUp(S, H)
MissUp(S, H)
HitDown(S, H)
MissDown(S, H)
NextTouched(Touched, Hit)
NextLive(Live, Miss)
CallScaled(S_T, K, R)
PutScaled(S_T, K, R)
KICallScaled(Touched_T, S_T, K, R)
KOCallScaled(Live_T, S_T, K, R)
OneTouchScaled(Touched_T, A)
NoTouchScaled(Live_T, A)
ClaimBTC(PayoffScaled, S_T)
OptionHolderBTC(Q, ClaimBTC)
ResidualBTC(Q, ClaimBTC)
```

Required proof obligations:

```text
1. Up-barrier hit/miss predicates are disjoint and exhaustive.
2. Down-barrier hit/miss predicates are disjoint and exhaustive.
3. Touched is monotonic: once true, always true.
4. Touch activation occurs when a hit happens.
5. Touched can remain false only when prior state was false and hit was false.
6. Live is absorbing false after knock-out.
7. Live continuation requires prior live state and miss.
8. Pure observation transitions preserve Q.
9. Immediate rebate/termination conserves Q.
10. Vanilla call and put payoffs are non-negative.
11. Knock-in payoff equals vanilla payoff after activation.
12. Knock-in payoff is zero without activation.
13. Knock-out payoff equals vanilla payoff while live.
14. Knock-out payoff is zero after knock-out.
15. One-touch is zero if never touched.
16. No-touch is zero if touched.
17. ClaimBTC ceiling conversion covers PayoffScaled.
18. ClaimBTC rounding error is less than one satoshi-valued unit.
19. OptionHolderBTC + ResidualBTC = Q.
20. Finite observation characterization holds for at least a one-step and
    two-step lemma, with an induction-compatible statement documented.
```

Suggested proof style:

```text
- Represent barrier state as Boolean fields.
- Encode hit and miss predicates separately for up and down barriers.
- Keep equality in the hit branch.
- Use SPARK.Big_Integers for payoff and settlement arithmetic.
- Use quotient/remainder lemmas for ClaimBTC ceiling division.
- Put all product convention choices in Pre conditions.
- Do not use pragma Assume.
```

## 14. Boundary

This specification proves:

```text
- discrete barrier branch coverage and disjointness;
- monotonic touch-state behavior;
- absorbing knock-out live-state behavior;
- one-step collateral conservation;
- finite observation path coverage;
- knock-in/knock-out payoff selection;
- one-touch/no-touch convention;
- BTC settlement conservation and rounding bounds.
```

It does not prove:

```text
- continuous-time barrier monitoring;
- oracle sampling correctness;
- latency or price-manipulation resistance;
- implied-volatility pricing;
- market liquidity;
- fee safety or mempool confirmation;
- Bitcoin transaction serialization;
- cDLC cryptographic activation, which is covered by the core proofs.
```
