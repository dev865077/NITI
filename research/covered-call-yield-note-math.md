# Covered Calls And BTC Yield Notes

This note gives the mathematical specification for a BTC-collateralized
covered-call/yield-note model. A later SPARK target should encode the same
invariants directly.

The purpose is narrow: prove the payoff algebra for a BTC-collateralized
covered call or yield note whose settlement is selected by a DLC oracle price.
This note does not prove option pricing, volatility, market liquidity, tax
treatment, oracle correctness, or the cDLC adaptor-signature security already
covered by the base cDLC proof targets.

## 1. Product Model

There are two economic parties:

- `W`: the writer, who posts BTC collateral and sells upside.
- `B`: the buyer, who receives the call payoff and pays the premium/coupon.

The product is a physically settled covered call over a covered BTC amount. It
can also be read as a BTC yield note: the writer earns a premium or coupon in
exchange for giving the buyer some upside above a strike.

The DLC oracle publishes the expiry price:

```text
S = BTC/USD price at expiry
```

All variables are non-negative integers in fixed units:

```text
Q      = total BTC collateral posted by W, in sats
N      = covered BTC notional, in sats
Cap    = optional maximum deliverable BTC, in sats
D      = deliverable notional used by the call, in sats
K      = strike price, in fixed USD-price units per BTC
S      = settlement price, in the same fixed USD-price units per BTC
P      = premium/coupon amount, in sats, if escrowed in the DLC funding
```

The preconditions are:

```text
S > 0
K >= 0
0 <= D <= N
0 <= D <= Q
P >= 0
```

If no cap is used:

```text
D = N
```

If a cap is used:

```text
D = min(N, Cap, Q)
```

All proofs below are stated in terms of `D`, so the capped and uncapped cases
share the same algebra once `D` is selected.

## 2. Premium Convention

Two conventions are useful. A concrete implementation must choose one.

### 2.1 Upfront Premium

The premium is paid outside the settlement graph before the DLC starts. The
settlement graph only conserves posted BTC collateral:

```text
BuyerClaimBTC(S) + WriterCollateralResidualBTC(S) = Q
```

The writer's total economic result is:

```text
WriterEconomicBTC(S) = WriterCollateralResidualBTC(S) + P
```

where `P` is not part of the DLC settlement outputs.

### 2.2 Escrowed Premium

The buyer funds the premium into the DLC funding output. The total funded BTC is
`Q + P`, and settlement conserves that total:

```text
BuyerClaimBTC(S) + WriterOutputBTC(S) = Q + P
WriterOutputBTC(S) = Q - BuyerClaimBTC(S) + P
```

The SPARK target should model one convention first. The recommended first pass
is the escrowed-premium convention because it proves total on-chain BTC
conservation directly.

## 3. Branch Predicates

The payoff has two price branches:

```text
OTM(S) = S <= K
ITM(S) = S > K
```

For any integer `S` and `K`, exactly one branch holds:

```text
OTM(S) or ITM(S)
not (OTM(S) and ITM(S))
```

This branch partition is what the cDLC outcome set must implement. In practice,
the oracle event may expose a bounded integer price range or use the standard
DLC numeric-outcome decomposition. This math note assumes the settlement price
is a valid positive integer outcome.

## 4. Exact Rational Payoff

The exact call intrinsic value in USD units is:

```text
IntrinsicUSD(S) = max(S - K, 0) * D
```

The exact BTC claim is:

```text
ExactClaimBTC(S) = IntrinsicUSD(S) / S
```

Equivalently, in piecewise form:

```text
if S <= K:
  ExactClaimBTC(S) = 0

if S > K:
  ExactClaimBTC(S) = ((S - K) * D) / S
```

The division-free ITM identity is:

```text
ExactClaimBTC(S) * S = (S - K) * D
```

This is useful for mathematical reasoning, but Bitcoin outputs require integer
sat amounts. The executable model should therefore use the integer payoff below.

## 5. Integer Settlement Payoff

For integer settlement, define:

```text
BuyerClaimBTC(S) = 0
```

when `S <= K`.

When `S > K`, define:

```text
A(S) = (S - K) * D
BuyerClaimBTC(S) = floor(A(S) / S)
Remainder(S) = A(S) - BuyerClaimBTC(S) * S
```

with:

```text
0 <= Remainder(S) < S
```

Equivalently:

```text
BuyerClaimBTC(S) * S <= (S - K) * D
(BuyerClaimBTC(S) + 1) * S > (S - K) * D
```

The floor convention favors the writer by less than one sat of BTC claim. A
ceil convention could be used instead if the intended product should favor the
buyer by at most one sat. The SPARK target should encode exactly one rounding
direction.

## 6. Settlement Outputs

Under upfront premium:

```text
BuyerOutputBTC(S) = BuyerClaimBTC(S)
WriterOutputBTC(S) = Q - BuyerClaimBTC(S)
```

Under escrowed premium:

```text
BuyerOutputBTC(S) = BuyerClaimBTC(S)
WriterOutputBTC(S) = Q - BuyerClaimBTC(S) + P
```

The rest of this note proves the escrowed-premium convention. The upfront
premium convention is the special case where settlement conservation is applied
to `Q` and the premium is accounted outside the graph.

## 7. Proofs

### Claim 1: Branch Coverage And Isolation

For every settlement price `S` and strike `K`, exactly one branch is selected:

```text
S <= K
```

or:

```text
S > K
```

Proof. The integer order is total. For any integers `S` and `K`, either
`S <= K` or `S > K`. Both cannot hold simultaneously by antisymmetry of the
order. Therefore the branch predicates cover all outcomes and are disjoint.

### Claim 2: OTM Payoff Is Zero

If `S <= K`, then:

```text
BuyerClaimBTC(S) = 0
```

Proof. This is the definition of the OTM branch in the integer payoff function.
It also matches the exact rational payoff because:

```text
max(S - K, 0) = 0
```

when `S <= K`.

### Claim 3: ITM Cross-Multiplied Payoff

If `S > K`, then:

```text
BuyerClaimBTC(S) * S <= (S - K) * D
(BuyerClaimBTC(S) + 1) * S > (S - K) * D
```

Proof. In the ITM branch, `BuyerClaimBTC(S)` is defined as:

```text
floor(((S - K) * D) / S)
```

for `S > 0`. The quotient-remainder theorem gives a unique quotient `q` and
remainder `r` such that:

```text
(S - K) * D = q * S + r
0 <= r < S
```

with:

```text
q = floor(((S - K) * D) / S)
```

Substitute `q = BuyerClaimBTC(S)` and rearrange:

```text
BuyerClaimBTC(S) * S <= (S - K) * D
```

because `r >= 0`, and:

```text
(BuyerClaimBTC(S) + 1) * S > (S - K) * D
```

because `r < S`.

### Claim 4: Buyer Claim Is Bounded

For all valid inputs:

```text
0 <= BuyerClaimBTC(S) <= D <= Q
```

Proof.

OTM case: if `S <= K`, then `BuyerClaimBTC(S) = 0`, so the bound follows from
`0 <= D <= Q`.

ITM case: if `S > K`, then `S - K > 0`, so:

```text
A(S) = (S - K) * D >= 0
```

and therefore:

```text
BuyerClaimBTC(S) = floor(A(S) / S) >= 0
```

Since `K >= 0` and `S > K`, we have:

```text
S - K <= S
```

Multiplying by `D >= 0`:

```text
(S - K) * D <= S * D
```

Dividing by positive `S`:

```text
((S - K) * D) / S <= D
```

Taking the floor preserves the upper bound:

```text
BuyerClaimBTC(S) <= D
```

Finally, `D <= Q` by precondition.

### Claim 5: Writer Residual Is Non-Negative

Under the escrowed-premium convention:

```text
WriterOutputBTC(S) = Q - BuyerClaimBTC(S) + P
```

is non-negative.

Proof. By Claim 4:

```text
BuyerClaimBTC(S) <= Q
```

Therefore:

```text
Q - BuyerClaimBTC(S) >= 0
```

Since `P >= 0`, adding `P` preserves non-negativity:

```text
Q - BuyerClaimBTC(S) + P >= 0
```

### Claim 6: BTC Conservation

Under the escrowed-premium convention:

```text
BuyerOutputBTC(S) + WriterOutputBTC(S) = Q + P
```

Proof. Substitute the output definitions:

```text
BuyerOutputBTC(S) + WriterOutputBTC(S)
= BuyerClaimBTC(S) + (Q - BuyerClaimBTC(S) + P)
= Q + P
```

Thus the CET output allocation exactly conserves funded BTC.

Under the upfront premium convention, the same proof gives:

```text
BuyerClaimBTC(S) + (Q - BuyerClaimBTC(S)) = Q
```

and the premium is accounted outside the settlement graph.

### Claim 7: Exact Payoff Rounding Error Is Less Than One Sat

In the ITM branch, let:

```text
ExactClaimBTC(S) = ((S - K) * D) / S
BuyerClaimBTC(S) = floor(ExactClaimBTC(S))
```

Then:

```text
0 <= ExactClaimBTC(S) - BuyerClaimBTC(S) < 1
```

Proof. This is the defining property of the floor function. In integer
quotient-remainder form:

```text
(S - K) * D = BuyerClaimBTC(S) * S + Remainder(S)
0 <= Remainder(S) < S
```

Dividing by `S > 0`:

```text
ExactClaimBTC(S)
= BuyerClaimBTC(S) + Remainder(S) / S
```

and:

```text
0 <= Remainder(S) / S < 1
```

Therefore the floor settlement underpays the exact rational BTC claim by less
than one sat-denominated unit.

### Claim 8: Buyer Claim Is Non-Decreasing In Price

For fixed `K >= 0` and `D >= 0`, if:

```text
S_2 >= S_1 > 0
```

then:

```text
BuyerClaimBTC(S_2) >= BuyerClaimBTC(S_1)
```

Proof.

If `S_2 <= K`, then `S_1 <= S_2 <= K`, so both claims are zero.

If `S_1 <= K < S_2`, then:

```text
BuyerClaimBTC(S_1) = 0
BuyerClaimBTC(S_2) >= 0
```

so the claim does not decrease.

If `K < S_1 <= S_2`, both prices are ITM. Consider the exact rational function:

```text
f(S) = ((S - K) * D) / S
     = D - (K * D) / S
```

Since `K * D >= 0` and `S_2 >= S_1 > 0`:

```text
(K * D) / S_2 <= (K * D) / S_1
```

Therefore:

```text
D - (K * D) / S_2 >= D - (K * D) / S_1
```

so:

```text
f(S_2) >= f(S_1)
```

The floor function is monotone, so:

```text
floor(f(S_2)) >= floor(f(S_1))
```

which is:

```text
BuyerClaimBTC(S_2) >= BuyerClaimBTC(S_1)
```

## 8. cDLC State Mapping

The financial model maps to a cDLC as follows:

```text
C_0 = covered call or yield-note DLC
x_S = oracle outcome whose settlement price is S
CET_S = CET for outcome x_S
```

For each valid price outcome `S`, `CET_S` pays:

```text
BuyerOutputBTC(S) = BuyerClaimBTC(S)
WriterOutputBTC(S) = Q - BuyerClaimBTC(S) + P
```

under escrowed premium.

If the product rolls into the next yield period, the writer output can be split
into:

```text
WriterSpendableBTC(S) + NextFundingBTC(S)
```

with:

```text
WriterSpendableBTC(S) + NextFundingBTC(S)
= Q - BuyerClaimBTC(S) + P
```

The bridge into the next cDLC uses the existing cDLC activation mechanism:
the oracle scalar for `x_S` completes the bridge adaptor signatures. This note
does not restate the cryptographic proof.

## 9. Requirements For The SPARK Target

The SPARK proof target should encode these functions first:

```text
OTM(S, K) = S <= K
ITM(S, K) = S > K
Intrinsic_Numerator(S, K, D) =
  if S <= K then 0 else (S - K) * D
Buyer_Claim(S, K, D) =
  floor(Intrinsic_Numerator(S, K, D) / S)
Writer_Output(Q, P, Claim) = Q - Claim + P
```

The first target should prove:

```text
1. Branch coverage and disjointness.
2. OTM claim is zero.
3. ITM claim satisfies quotient-remainder inequalities.
4. 0 <= Buyer_Claim <= D <= Q.
5. Writer_Output >= 0.
6. Buyer_Claim + Writer_Output = Q + P.
7. Rounding error is less than one sat-denominated unit.
8. Buyer_Claim is non-decreasing in S for fixed K and D.
```

Recommended SPARK modeling choices:

```text
Amount = SPARK.Big_Integers.Valid_Big_Integer
Price = SPARK.Big_Integers.Valid_Big_Integer
Preconditions:
  S > 0
  K >= 0
  Q >= 0
  P >= 0
  0 <= D <= Q
```

If integer division causes excessive proof complexity, the first SPARK target
may model `Buyer_Claim` and `Remainder` as inputs constrained by the
quotient-remainder relation:

```text
Intrinsic = Buyer_Claim * S + Remainder
0 <= Remainder < S
```

That approach is acceptable if the proof target clearly states that it proves
payoff correctness for any quotient-remainder pair satisfying the relation.

## 10. Completion Criteria

This specification is mathematically complete when this note is accepted as the
canonical covered-call/yield-note specification and the future SPARK target can encode
the formulas without adding financial assumptions.
