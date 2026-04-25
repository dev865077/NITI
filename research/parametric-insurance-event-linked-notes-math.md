# Parametric Insurance and Event-Linked Notes Math

This note resolves the mathematical specification for issue #28. It models
binary and tiered oracle-event risk transfer using BTC collateral:

```text
1. parametric insurance;
2. catastrophe-style event-linked notes;
3. uptime, weather, hashrate, rainfall, fee-rate, or other objective-index
   products with a pre-agreed oracle measurement.
```

The goal is narrow. The note proves trigger partitioning, payout boundedness,
BTC conservation, collateral caps, renewal accounting, and event-linked note
principal waterfalls. It does not prove event-oracle correctness, actuarial
pricing, moral hazard, legal insurance classification, claims adjustment, or
the base cDLC adaptor-signature security.

## 1. Units

Use integer units throughout.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
Q = BTC collateral posted by protection seller, in satoshis
Premium = premium/coupon escrowed in the DLC, in satoshis
E = oracle event measurement, in integer event units
T = binary trigger threshold, in event units
Limit = maximum protection payout, in satoshis
Payout_j = tier payout for tier j, in satoshis
P = BTC/USD settlement price, in cents per BTC
D = USD-denominated claim target, in cents
```

Preconditions for BTC-denominated payout models:

```text
SAT > 0
Q >= 0
Premium >= 0
Limit >= 0
Payout_j >= 0
```

Preconditions for USD-indexed payout conversion:

```text
P > 0
D >= 0
```

The event measurement `E` may represent rainfall, wind speed, hashrate,
uptime downtime, fee rate, crop index, political-event score, or another
integerized oracle fact. The math treats it only as an integer.

## 2. Premium Convention

Two conventions are useful. A concrete product must choose one.

### 2.1 Upfront Premium

The protection buyer pays the premium outside the settlement graph before the
contract starts. The cDLC settlement conserves only posted BTC collateral:

```text
BuyerPayout + SellerResidual = Q
```

The seller's total economic result is:

```text
SellerEconomicBTC = SellerResidual + Premium
```

where `Premium` is not part of the cDLC settlement outputs.

### 2.2 Escrowed Premium

The premium is funded into the cDLC. The settlement graph conserves:

```text
Q + Premium
```

Outputs:

```text
BuyerOutput = BuyerPayout
SellerOutput = Q - BuyerPayout + Premium
```

Then:

```text
BuyerOutput + SellerOutput = Q + Premium
```

The rest of this note states the core protection accounting over `Q`. The
escrowed-premium convention is obtained by adding `Premium` to the seller or
note investor output after proving that `BuyerPayout <= Q`.

## 3. Binary Parametric Trigger

An up-trigger pays when the event measurement reaches or exceeds a threshold:

```text
TriggeredUp(E, T) = E >= T
NoTriggerUp(E, T) = E < T
```

A down-trigger pays when the event measurement is at or below a threshold:

```text
TriggeredDown(E, T) = E <= T
NoTriggerDown(E, T) = E > T
```

Examples:

```text
wind speed >= T              -> up-trigger
rainfall deficit <= T        -> down-trigger
uptime percentage <= T       -> down-trigger
Bitcoin fee rate >= T        -> up-trigger
```

### Claim 1: Binary Up-Trigger Branches Are Complete and Disjoint

For every integer `E` and threshold `T`, exactly one of:

```text
E >= T
E < T
```

holds.

Proof:

The integers are totally ordered. For any `E` and `T`, either `E >= T` or
`E < T`; both cannot hold at once.

### Claim 2: Binary Down-Trigger Branches Are Complete and Disjoint

For every integer `E` and threshold `T`, exactly one of:

```text
E <= T
E > T
```

holds.

Proof:

The proof is the same total-order argument with the inequality direction
reversed.

## 4. Binary BTC Payout

For an up-trigger binary contract:

```text
RawPayout(E) =
  Limit  if E >= T
  0      if E < T
```

The collateral-capped buyer payout is:

```text
BuyerPayout(E) = min(Q, RawPayout(E))
SellerResidual(E) = Q - BuyerPayout(E)
```

For a down-trigger contract, replace the trigger predicate with `E <= T`.

### Claim 3: No-Trigger Payout Is Zero

If the binary trigger is false, then:

```text
BuyerPayout(E) = 0
SellerResidual(E) = Q
```

Proof:

In the no-trigger branch, `RawPayout(E) = 0`. Since `Q >= 0`:

```text
min(Q, 0) = 0
```

Therefore `BuyerPayout(E) = 0`, and:

```text
SellerResidual(E) = Q - 0 = Q
```

### Claim 4: Binary Payout Is Bounded by Collateral

For every valid binary state:

```text
0 <= BuyerPayout(E) <= Q
```

Proof:

`RawPayout(E)` is either `0` or `Limit`, both non-negative. The minimum of two
non-negative values is non-negative, and `min(Q, RawPayout(E)) <= Q`.

### Claim 5: Binary BTC Conservation

For every valid binary state:

```text
BuyerPayout(E) + SellerResidual(E) = Q
```

Proof:

By definition:

```text
SellerResidual(E) = Q - BuyerPayout(E)
```

By Claim 4, `BuyerPayout(E) <= Q`, so the subtraction is non-negative. Then:

```text
BuyerPayout(E) + SellerResidual(E)
= BuyerPayout(E) + Q - BuyerPayout(E)
= Q
```

### Claim 6: Max-Loss Branch Pays the Cap or All Collateral

If the trigger is true, then:

```text
BuyerPayout(E) = min(Q, Limit)
```

Therefore:

```text
if Limit <= Q:
  BuyerPayout(E) = Limit
  SellerResidual(E) = Q - Limit

if Limit > Q:
  BuyerPayout(E) = Q
  SellerResidual(E) = 0
```

Proof:

In the trigger branch, `RawPayout(E) = Limit`. Substitute into
`BuyerPayout(E) = min(Q, RawPayout(E))`.

## 5. Three-Region Tiered Payout

The minimal tiered model has three branches:

```text
T1 < T2
Partial <= Limit
```

Payout schedule:

```text
if E < T1:
  RawPayout = 0

if T1 <= E and E < T2:
  RawPayout = Partial

if E >= T2:
  RawPayout = Limit
```

The buyer payout remains collateral-capped:

```text
BuyerPayout = min(Q, RawPayout)
SellerResidual = Q - BuyerPayout
```

### Claim 7: Three-Region Tier Branches Cover All Events

If `T1 < T2`, exactly one of the following holds:

```text
E < T1
T1 <= E and E < T2
E >= T2
```

Proof:

If `E < T1`, the first branch holds and the other two do not.

If `E >= T1`, total order gives either `E < T2` or `E >= T2`. The former
selects the middle branch; the latter selects the final branch. The strict
upper bound in the middle branch prevents overlap with the final branch.

### Claim 8: Tiered Payout Is Bounded

If:

```text
0 <= Partial <= Limit
```

then:

```text
0 <= RawPayout <= Limit
0 <= BuyerPayout <= Q
```

Proof:

The raw payout is one of `0`, `Partial`, or `Limit`. Under the precondition,
each is between `0` and `Limit`. The buyer payout is `min(Q, RawPayout)`, so it
is non-negative and no greater than `Q`.

### Claim 9: Tiered BTC Conservation

For every valid tiered state:

```text
BuyerPayout + SellerResidual = Q
```

Proof:

The proof is identical to Claim 5 after applying Claim 8.

## 6. General Finite Tiers

A general tier schedule can be represented by ordered thresholds:

```text
T_1 < T_2 < ... < T_m
```

and non-decreasing payouts:

```text
0 = A_0 <= A_1 <= ... <= A_m <= Limit
```

Branches:

```text
Tier 0:
  E < T_1
  RawPayout = A_0 = 0

Tier j for 1 <= j < m:
  T_j <= E and E < T_{j+1}
  RawPayout = A_j

Tier m:
  E >= T_m
  RawPayout = A_m
```

The payout is:

```text
BuyerPayout = min(Q, RawPayout)
SellerResidual = Q - BuyerPayout
```

### Claim 10: Finite Tier Disjointness

If the thresholds are strictly increasing, no event measurement can satisfy two
different tier predicates.

Proof:

Each non-terminal tier is a half-open interval:

```text
[T_j, T_{j+1})
```

Strictly increasing thresholds make these intervals disjoint. The first tier is
`(-infinity, T_1)`, and the final tier is `[T_m, infinity)`, so neither
overlaps its neighbor.

### Claim 11: Finite Tier Coverage

If the thresholds are strictly increasing, every integer event measurement
belongs to at least one tier predicate.

Proof:

If `E < T_1`, tier 0 applies. Otherwise, scan thresholds in order. If there is
a first `T_{j+1}` greater than `E`, then `T_j <= E < T_{j+1}` and tier `j`
applies. If no later threshold is greater than `E`, then `E >= T_m` and the
final tier applies.

### Claim 12: Monotone Schedule Implies Monotone Raw Payout

If:

```text
T_1 < ... < T_m
0 = A_0 <= A_1 <= ... <= A_m
```

then for event measurements `E_a <= E_b`:

```text
RawPayout(E_a) <= RawPayout(E_b)
```

Proof:

Strictly increasing thresholds order the tiers by event severity. If
`E_a <= E_b`, the tier index selected by `E_b` is no lower than the tier index
selected by `E_a`. Since payouts are non-decreasing by tier index, the raw
payout is non-decreasing.

The first SPARK model does not need the fully general tier proof. It can encode
the three-region schedule first, then add a finite-array tier-disjointness
lemma after the binary and three-region obligations are clean.

## 7. Linear Attachment and Exhaustion Schedule

Some parametric products interpolate between no-loss and max-loss. Let:

```text
Attach < Exhaust
Limit >= 0
```

The exact rational raw payout is:

```text
0                                      if E <= Attach
Limit * (E - Attach) / (Exhaust-Attach) if Attach < E < Exhaust
Limit                                  if E >= Exhaust
```

Define:

```text
Range = Exhaust - Attach
PartialNum = Limit * (E - Attach)
PartialPayout = floor(PartialNum / Range)
PartialRemainder = PartialNum - PartialPayout * Range
```

for the partial branch.

Then:

```text
0 <= PartialRemainder < Range
PartialPayout * Range <= Limit * (E - Attach)
(PartialPayout + 1) * Range > Limit * (E - Attach)
```

The floor convention prevents overpaying the exact interpolated amount. A
buyer-favoring ceil convention can be proven similarly, with a maximum error of
less than one satoshi.

### Claim 13: Linear Partial Payout Is Bounded

If:

```text
Attach < E < Exhaust
```

then:

```text
0 < E - Attach < Exhaust - Attach
```

Multiplying by `Limit >= 0`:

```text
0 <= Limit * (E - Attach) < Limit * (Exhaust - Attach)
```

Therefore:

```text
0 <= PartialPayout <= Limit
```

After collateral cap:

```text
0 <= BuyerPayout <= Q
```

## 8. USD-Indexed Protection Amounts

Some event-linked products define the loss amount in USD cents instead of
satoshis. Let:

```text
D = USD claim amount in cents
P = BTC/USD settlement price in cents per BTC
```

The uncapped satoshi amount needed to cover `D` cents is:

```text
NeedBTC(D, P) = ceil(D * SAT / P)
```

The actual buyer payout is:

```text
BuyerPayoutUSDIndexed = min(Q, NeedBTC(D, P))
SellerResidual = Q - BuyerPayoutUSDIndexed
```

Quotient form:

```text
D * SAT = k * P + r
0 <= r < P

NeedBTC(D, P) =
  k      if r = 0
  k + 1  if r > 0
```

Equivalent division-free characterization:

```text
NeedBTC(D, P) * P >= D * SAT

NeedBTC(D, P) = 0
or
(NeedBTC(D, P) - 1) * P < D * SAT
```

### Claim 14: USD-Indexed Claim Covers Target When Solvent

If:

```text
Q * P >= D * SAT
```

then:

```text
BuyerPayoutUSDIndexed * P >= D * SAT
```

Proof:

The premise says `Q` is a candidate satoshi amount whose scaled value covers
`D`. `NeedBTC(D, P)` is the least non-negative satoshi amount whose scaled
value covers `D`. Therefore:

```text
NeedBTC(D, P) <= Q
```

so the collateral cap does not bind and:

```text
BuyerPayoutUSDIndexed = NeedBTC(D, P)
```

The ceiling definition gives:

```text
NeedBTC(D, P) * P >= D * SAT
```

### Claim 15: USD-Indexed Insolvency Exhausts Collateral

If:

```text
Q * P < D * SAT
```

then:

```text
BuyerPayoutUSDIndexed = Q
SellerResidual = 0
```

Proof:

If `NeedBTC(D, P) <= Q`, then by the ceiling definition:

```text
Q * P >= NeedBTC(D, P) * P >= D * SAT
```

which contradicts `Q * P < D * SAT`. Therefore `NeedBTC(D, P) > Q`, so the
minimum with `Q` is `Q`.

## 9. Event-Linked Note Waterfall

An event-linked note is the same protection payout viewed from the investor
side. The investor is economically the protection seller: they post principal
at risk and receive premium/coupon for bearing event risk.

Let:

```text
Principal = Q
Loss = BuyerPayout
Coupon = Premium
```

Under upfront coupon accounting:

```text
ProtectionBuyerOutput = Loss
InvestorPrincipalRedemption = Principal - Loss
```

Under escrowed coupon accounting:

```text
ProtectionBuyerOutput = Loss
InvestorOutput = Principal - Loss + Coupon
```

### Claim 16: Investor Principal Redemption Is Bounded

If:

```text
0 <= Loss <= Principal
```

then:

```text
0 <= Principal - Loss <= Principal
```

Proof:

`Loss <= Principal` gives `Principal - Loss >= 0`. Since `Loss >= 0`,
subtracting it from `Principal` cannot increase the result:

```text
Principal - Loss <= Principal
```

### Claim 17: Note Principal Waterfall Conserves Posted BTC

Under upfront coupon accounting:

```text
ProtectionBuyerOutput + InvestorPrincipalRedemption = Principal
```

Proof:

Substitute:

```text
ProtectionBuyerOutput + InvestorPrincipalRedemption
= Loss + (Principal - Loss)
= Principal
```

### Claim 18: Escrowed Coupon Waterfall Conserves Funded BTC

Under escrowed coupon accounting:

```text
ProtectionBuyerOutput + InvestorOutput = Principal + Coupon
```

Proof:

Substitute:

```text
ProtectionBuyerOutput + InvestorOutput
= Loss + (Principal - Loss + Coupon)
= Principal + Coupon
```

This is the event-linked note equivalent of the escrowed-premium convention in
Section 2.2.

## 10. Renewal and Residual Coverage

A no-loss branch can roll the full collateral into a renewal cDLC:

```text
Loss = 0
Q_next = Q
```

A loss branch can either terminate or roll residual collateral:

```text
Q_next = Q - Loss
Limit_next <= Q_next
```

### Claim 19: No-Loss Renewal Preserves Collateral

If:

```text
Loss = 0
```

then:

```text
Q_next = Q - Loss = Q
```

Proof:

Substitute `Loss = 0`.

### Claim 20: Loss Renewal Preserves Residual and Prevents Over-Limit Child

If:

```text
0 <= Loss <= Q
Q_next = Q - Loss
Limit_next <= Q_next
```

then:

```text
Q_next >= 0
Limit_next <= Q_next
```

Proof:

`Loss <= Q` gives `Q - Loss >= 0`, so `Q_next >= 0`. The child limit bound is
an explicit precondition that prevents the renewal branch from promising more
BTC protection than the residual collateral can fund.

## 11. Aggregate Multi-Event Limit

Some event-linked notes cover multiple observations or multiple events under
one aggregate limit.

Let:

```text
AggLimit >= 0
Paid_i = cumulative paid losses before event i
Claim_i = event-i raw claim, after per-event cap
```

Aggregate update:

```text
Paid_{i+1} = min(AggLimit, Paid_i + Claim_i)
Available_{i+1} = AggLimit - Paid_{i+1}
```

Preconditions:

```text
0 <= Paid_i <= AggLimit
Claim_i >= 0
```

### Claim 21: Aggregate Paid Loss Is Monotone and Capped

For every valid aggregate update:

```text
Paid_i <= Paid_{i+1} <= AggLimit
```

Proof:

`Claim_i >= 0` gives:

```text
Paid_i <= Paid_i + Claim_i
```

Taking the minimum with `AggLimit`, and using `Paid_i <= AggLimit`, gives:

```text
Paid_i <= min(AggLimit, Paid_i + Claim_i)
```

The result is also at most `AggLimit` by definition of minimum.

### Claim 22: Aggregate Available Limit Is Non-Negative

Since:

```text
Paid_{i+1} <= AggLimit
```

then:

```text
Available_{i+1} = AggLimit - Paid_{i+1} >= 0
```

This aggregate section is optional for the first SPARK target. Binary and
single-event tiered payout should be proven first.

## 12. cDLC Lifecycle

A practical event-linked cDLC graph can use the following nodes:

```text
C_0 = active coverage or event-linked note
C_renew = renewal coverage after no loss
C_residual = residual coverage after partial loss
C_terminal = terminal payout after full loss or expiry
```

The oracle outcome includes:

```text
event_id
event measurement E
event timestamp or observation window identifier
```

For each outcome:

```text
1. select the binary, tiered, or linear payout branch;
2. compute RawPayout;
3. apply BuyerPayout = min(Q, RawPayout);
4. output BuyerPayout to protection buyer;
5. output Q - BuyerPayout to seller/investor, plus Premium if escrowed;
6. if renewal is selected, bridge residual collateral into the next coverage
   cDLC with Limit_next <= Q_next.
```

The bridge into a renewal or residual child cDLC is activated by the parent
DLC oracle scalar exactly as in the base cDLC construction. This financial
model assumes the selected outcome branch is activated correctly and proves
only the branch accounting.

## 13. SPARK Handoff for Issue #29

The first SPARK target should model binary first, then the three-region tiered
schedule. Recommended types:

```text
Amount = non-negative Big_Integer
EventValue = signed Big_Integer
Price = positive Big_Integer
```

Suggested functions:

```text
Triggered_Up(E, T) = E >= T
Triggered_Down(E, T) = E <= T
Min(A, B)
Binary_Raw_Payout(E, T, Limit)
Buyer_Payout(Q, Raw) = Min(Q, Raw)
Seller_Residual(Q, Payout) = Q - Payout
Tier3_Raw_Payout(E, T1, T2, Partial, Limit)
Linear_Partial_Payout(E, Attach, Exhaust, Limit)
Need_BTC(D, P) = ceil(D * SAT / P)
Investor_Redemption(Principal, Loss) = Principal - Loss
Aggregate_Paid_Next(AggLimit, Paid, Claim)
```

Suggested proof obligations:

```text
1. Up-trigger coverage and disjointness:
   E >= T xor E < T.

2. Down-trigger coverage and disjointness:
   E <= T xor E > T.

3. No-trigger binary payout is zero.

4. Binary payout is bounded:
   0 <= BuyerPayout <= Q.

5. Binary settlement conserves BTC:
   BuyerPayout + SellerResidual = Q.

6. Triggered max-loss branch pays Limit if Limit <= Q and pays Q otherwise.

7. Three-region tier predicates cover all E and are disjoint when T1 < T2.

8. Tiered payout is bounded when 0 <= Partial <= Limit.

9. Tiered settlement conserves BTC.

10. Linear attachment/exhaustion partial payout is between 0 and Limit.

11. USD-indexed NeedBTC satisfies:
    NeedBTC * P >= D * SAT
    and NeedBTC = 0 or (NeedBTC - 1) * P < D * SAT.

12. USD-indexed solvent branch covers the target.

13. USD-indexed insolvent branch exhausts collateral and leaves zero residual.

14. Investor principal redemption is between 0 and Principal.

15. Upfront note waterfall conserves Principal.

16. Escrowed coupon waterfall conserves Principal + Coupon.

17. No-loss renewal preserves Q.

18. Loss renewal gives Q_next >= 0 and requires Limit_next <= Q_next.

19. Aggregate paid loss is monotone and capped, if aggregate coverage is
    included in the first target.
```

Keep every assumption in explicit `Pre` conditions. Do not use
`pragma Assume`. The model should not encode oracle truth, legal insurance
status, pricing adequacy, or Bitcoin transaction validity.

## 14. Proof Boundary

This note proves the arithmetic of finite, pre-funded parametric coverage
states. It does not prove:

```text
- that the oracle measurement is correct;
- that the event definition is legally enforceable;
- that the premium is actuarially fair;
- that the buyer had an insurable interest;
- that the seller can hedge the risk;
- that a multi-oracle committee is honest;
- that a cDLC bridge confirms during fee pressure;
- that adaptor signatures are secure.
```

The narrow claim is:

```text
Given a valid integer event measurement, posted BTC collateral, a pre-agreed
binary/tiered/linear payout schedule, and a selected cDLC outcome branch, the
protection payout is bounded by posted collateral, settlement conserves BTC,
event-linked note redemption is the residual principal after loss, and renewal
branches can only fund child coverage from remaining collateral.
```
