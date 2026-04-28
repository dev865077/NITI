# Collars, Protective Puts, and Principal-Protected Notes Math

This note defines the mathematical specification for collars, protective puts, and principal-protected notes. It models
three closely related BTC-linked payoff packages:

```text
1. protective put: BTC exposure with a downside price floor;
2. collar: BTC exposure bounded by a downside floor and upside cap;
3. principal-protected participation note: fixed protected principal plus
   capped BTC upside participation.
```

The note separates these payoffs instead of forcing them into one overloaded
formula. That makes the branch predicates, bounds, continuity claims, and
SPARK obligations explicit.

## 1. Units

Use integer units.

```text
B = 100_000_000
```

`B` is the number of satoshis per BTC.

```text
Q = total BTC collateral in satoshis
R = BTC reference notional in satoshis
P = expiry BTC/USD oracle price in cents per BTC
S0 = initial BTC/USD price in cents per BTC
K_put = put/floor strike in cents per BTC
K_call = call/cap strike in cents per BTC
Principal = protected USD principal in cents
Alpha = Alpha_Num / Alpha_Den
```

Preconditions:

```text
Q >= 0
R >= 0
P > 0
S0 > 0
K_put >= 0
K_call >= K_put
Principal >= 0
Alpha_Num >= 0
Alpha_Den > 0
B > 0
```

For principal-protected participation notes, additionally require:

```text
K_call >= S0
```

All USD values are represented in scaled units:

```text
Scale = B * Alpha_Den
```

If `ValueCents` is a USD-cent value, then:

```text
ValueScaled = ValueCents * B * Alpha_Den
```

The scaled value of `q` satoshis at expiry price `P` is:

```text
BTCValueScaled(q, P) = q * P * Alpha_Den
```

## 2. Integer Helpers

Positive part:

```text
Pos(x - y) =
  x - y  if x > y
  0      otherwise
```

Minimum and maximum:

```text
Min(a, b) = a if a <= b else b
Max(a, b) = a if a >= b else b
```

The capped price used by a collar is:

```text
CollarPrice(P, K_put, K_call)
  = Min(Max(P, K_put), K_call)
```

When `K_put <= K_call`, this is equivalently:

```text
K_put          if P < K_put
P              if K_put <= P <= K_call
K_call         if P > K_call
```

## 3. Protective Put

A protective put gives reference BTC exposure with a downside price floor.

Scaled payoff:

```text
ProtectivePutScaled(P) = R * Max(P, K_put) * Alpha_Den
```

Equivalent branches:

```text
if P < K_put:
  ProtectivePutScaled = R * K_put * Alpha_Den

if P >= K_put:
  ProtectivePutScaled = R * P * Alpha_Den
```

### Claim 1: Protective Put Floor

For all valid inputs:

```text
ProtectivePutScaled(P) >= R * K_put * Alpha_Den
```

Proof:

`Max(P, K_put) >= K_put`. Multiplying by non-negative `R` and positive
`Alpha_Den` preserves the inequality.

### Claim 2: Protective Put Continuity

At `P = K_put`, both branches give:

```text
R * K_put * Alpha_Den
```

Therefore the branch formula is continuous at the strike.

## 4. Collar

A collar gives reference BTC exposure with a lower floor and an upper cap.

Scaled payoff:

```text
CollarScaled(P) = R * CollarPrice(P, K_put, K_call) * Alpha_Den
```

Equivalent branches:

```text
if P < K_put:
  CollarScaled = R * K_put * Alpha_Den

if K_put <= P and P <= K_call:
  CollarScaled = R * P * Alpha_Den

if P > K_call:
  CollarScaled = R * K_call * Alpha_Den
```

### Claim 3: Collar Branch Coverage and Disjointness

If `K_put <= K_call`, exactly one of the following branches holds:

```text
P < K_put
K_put <= P and P <= K_call
P > K_call
```

Proof:

Integer order gives either `P < K_put` or `P >= K_put`. If `P < K_put`, the
first branch holds and the other two do not.

If `P >= K_put`, integer order gives either `P <= K_call` or `P > K_call`.
The former selects the middle branch; the latter selects the upper branch.
The strict inequalities make overlap impossible.

### Claim 4: Collar Floor and Cap

For all valid inputs:

```text
R * K_put * Alpha_Den
  <= CollarScaled(P)
  <= R * K_call * Alpha_Den
```

Proof:

`CollarPrice = Min(Max(P, K_put), K_call)`.

Since `Max(P, K_put) >= K_put`, and `K_put <= K_call`, the minimum with
`K_call` remains at least `K_put`. It is also at most `K_call` by definition
of minimum. Multiplying by non-negative `R` and positive `Alpha_Den` preserves
both inequalities.

### Claim 5: Collar Continuity

At the lower strike:

```text
P = K_put
lower branch = R * K_put * Alpha_Den
middle branch = R * P * Alpha_Den = R * K_put * Alpha_Den
```

At the upper strike:

```text
P = K_call
middle branch = R * P * Alpha_Den = R * K_call * Alpha_Den
upper branch = R * K_call * Alpha_Den
```

Therefore the collar payoff has no jump at either strike.

## 5. Principal-Protected Participation Note

A principal-protected BTC note pays protected principal plus a fraction of BTC
upside, capped at `K_call`.

Define capped upside in cents per BTC:

```text
CappedUpside(P) = Min(Pos(P - S0), K_call - S0)
```

with precondition `K_call >= S0`.

Scaled payoff:

```text
NoteScaled(P)
  = Principal * B * Alpha_Den
    + R * CappedUpside(P) * Alpha_Num
```

Equivalent branches:

```text
if P <= S0:
  NoteScaled = Principal * B * Alpha_Den

if S0 < P and P < K_call:
  NoteScaled = Principal * B * Alpha_Den
    + R * (P - S0) * Alpha_Num

if P >= K_call:
  NoteScaled = Principal * B * Alpha_Den
    + R * (K_call - S0) * Alpha_Num
```

### Claim 6: Principal Protection

For all valid inputs:

```text
NoteScaled(P) >= Principal * B * Alpha_Den
```

Proof:

`CappedUpside(P) >= 0` and `R * CappedUpside(P) * Alpha_Num >= 0`.
Adding this non-negative amount to protected principal proves the bound.

### Claim 7: Upside Cap

For all valid inputs:

```text
NoteScaled(P)
  <= Principal * B * Alpha_Den
     + R * (K_call - S0) * Alpha_Num
```

Proof:

`CappedUpside(P) = Min(Pos(P - S0), K_call - S0)`, so:

```text
CappedUpside(P) <= K_call - S0
```

Multiplying by non-negative `R` and `Alpha_Num`, then adding protected
principal, preserves the inequality.

### Claim 8: Note Branch Coverage and Continuity

If `K_call > S0`, exactly one of the following holds:

```text
P <= S0
S0 < P and P < K_call
P >= K_call
```

If `S0 = K_call`, the middle branch is empty. The endpoint `P = S0 = K_call`
can be assigned to either boundary branch because both formulas agree. A cDLC
implementation should still choose one canonical branch predicate for the
exact endpoint to keep transaction construction deterministic.

At `P = S0`, the first and middle formulas both equal:

```text
Principal * B * Alpha_Den
```

At `P = K_call`, the middle and upper formulas both equal:

```text
Principal * B * Alpha_Den
  + R * (K_call - S0) * Alpha_Num
```

Therefore the note payoff is continuous at its kink points.

## 6. BTC Settlement Conversion

For any non-negative scaled payoff `PayoffScaled`, define the BTC claim needed
to cover that value at expiry price `P`:

```text
ClaimBTC = ceil(PayoffScaled / (P * Alpha_Den))
```

Quotient form:

```text
PayoffScaled = k * P * Alpha_Den + rem
0 <= rem < P * Alpha_Den

ClaimBTC =
  k      if rem = 0
  k + 1  if rem > 0
```

Then:

```text
ClaimBTC * P * Alpha_Den >= PayoffScaled

ClaimBTC = 0
or
(ClaimBTC - 1) * P * Alpha_Den < PayoffScaled
```

The actual cDLC output is capped by posted BTC collateral:

```text
InvestorBTC = Min(Q, ClaimBTC)
StructurerBTC = Q - InvestorBTC
```

### Claim 9: BTC Conservation

For every payoff package:

```text
0 <= InvestorBTC <= Q
0 <= StructurerBTC <= Q
InvestorBTC + StructurerBTC = Q
```

Proof:

`InvestorBTC` is the minimum of `Q` and a non-negative `ClaimBTC`, so it is
non-negative and at most `Q`. Therefore `StructurerBTC = Q - InvestorBTC` is
non-negative. Conservation follows by substitution.

### Claim 10: Sufficient Collateral Covers the Scaled Payoff

If:

```text
ClaimBTC <= Q
```

then:

```text
InvestorBTC = ClaimBTC
InvestorBTC * P * Alpha_Den >= PayoffScaled
```

Proof:

The first equality follows from `InvestorBTC = Min(Q, ClaimBTC)`. The second
is the ceiling-division property.

### Claim 11: Settlement Rounding Bound

If `ClaimBTC <= Q` and `PayoffScaled > 0`, then:

```text
0 <= InvestorBTC * P * Alpha_Den - PayoffScaled < P * Alpha_Den
```

Proof:

Under sufficient collateral, `InvestorBTC = ClaimBTC`. The quotient form of
ceiling division gives both inequalities. If `PayoffScaled = 0`, then
`ClaimBTC = 0` and the rounding error is zero.

### Claim 12: Principal Protection After BTC Conversion

For a principal-protected participation note, if:

```text
ClaimBTC <= Q
```

then:

```text
InvestorBTC * P * Alpha_Den
  >= Principal * B * Alpha_Den
```

Proof:

By Claim 10:

```text
InvestorBTC * P * Alpha_Den >= NoteScaled(P)
```

By Claim 6:

```text
NoteScaled(P) >= Principal * B * Alpha_Den
```

Transitivity proves the result.

## 7. Premium Accounting

Let:

```text
PremiumPut = put premium in cents
PremiumCall = call premium in cents
```

A zero-cost collar convention is:

```text
PremiumPut = PremiumCall
```

Net premium paid by the investor is:

```text
NetPremium = PremiumPut - PremiumCall
```

If `PremiumPut = PremiumCall`, then:

```text
NetPremium = 0
```

If the product uses an explicit net premium, the payoff spec should include it
as a separate upfront or escrowed transfer. The option payoff and BTC
settlement invariants above remain valid; only the initial cash accounting
changes.

## 8. cDLC Mapping

Each oracle price bucket maps to a branch predicate and a deterministic payout.

Protective put:

```text
P_i < K_put        -> floor branch
P_i >= K_put       -> spot branch
```

Collar:

```text
P_i < K_put                  -> floor branch
K_put <= P_i <= K_call       -> spot branch
P_i > K_call                 -> cap branch
```

Principal-protected note:

```text
P_i <= S0                    -> principal branch
S0 < P_i < K_call            -> participation branch
P_i >= K_call                -> capped branch
```

For each branch:

```text
price outcome P_i
  -> compute PayoffScaled(P_i)
  -> compute ClaimBTC(P_i)
  -> set InvestorBTC = Min(Q, ClaimBTC)
  -> set StructurerBTC = Q - InvestorBTC
  -> optionally activate a residual roll with StructurerBTC
```

The cryptographic fact that only the matching oracle scalar activates the
matching branch is covered by the core cDLC adaptor-signature proofs. This note
proves the financial payoff and conservation properties attached to each
branch.

## 9. SPARK Encoding Requirements

A future SPARK target should encode:

```text
Pos(X, Y)
Min(A, B)
Max(A, B)
CollarPrice(P, K_put, K_call)
ProtectivePutScaled(P)
CollarScaled(P)
CappedUpside(P)
NoteScaled(P)
ClaimBTC(PayoffScaled, P, Alpha_Den)
InvestorBTC(Q, ClaimBTC)
StructurerBTC(Q, ClaimBTC)
```

Required proof obligations:

```text
1. Protective put payoff is bounded below by the floor strike.
2. Protective put branch formulas agree at K_put.
3. Collar branches are disjoint and cover every price when K_put <= K_call.
4. Collar payoff is bounded below by K_put and above by K_call.
5. Collar branch formulas agree at K_put and K_call.
6. Principal-protected note payoff is bounded below by protected principal.
7. Principal-protected note payoff is capped above by the capped upside formula.
8. Principal-protected note branch formulas agree at S0 and K_call.
9. ClaimBTC ceiling conversion covers PayoffScaled.
10. ClaimBTC rounding error is less than one satoshi-scaled unit.
11. InvestorBTC + StructurerBTC = Q.
12. InvestorBTC <= Q and StructurerBTC >= 0.
13. If collateral is sufficient, BTC settlement covers the scaled payoff.
14. If collateral is sufficient, principal-protected note settlement covers
    protected principal.
15. Zero-cost collar premium equality implies zero net premium.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers for the first pass.
- Encode each branch predicate as a separate Boolean function.
- Keep all payoff values in scaled integer units.
- Use quotient/remainder lemmas for ClaimBTC ceiling division.
- Put branch ordering assumptions in Pre conditions.
- Do not use pragma Assume.
```

## 10. Boundary

This specification proves:

```text
- branch coverage and disjointness;
- payoff floor and cap properties;
- principal protection under sufficient posted collateral;
- BTC conservation between investor and structurer;
- ceiling-conversion rounding bounds;
- zero-cost premium equality when that convention is selected.
```

It does not prove:

```text
- option fair value;
- implied volatility assumptions;
- issuer creditworthiness outside posted collateral;
- secondary-market liquidity;
- oracle correctness;
- fee safety or mempool confirmation;
- tax, accounting, or regulatory treatment;
- cDLC cryptographic activation, which is covered by the core proofs.
```
