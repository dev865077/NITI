# Perpetuals and Rolling Forwards Math

This note defines the mathematical specification for perpetuals and rolling forwards. It models a
finite sequence of one-period USD-notional forwards that can roll through a
cDLC graph. The construction approximates perpetual exposure by repeatedly
settling mark-to-market and funding, then funding the next pre-negotiated
forward node if margin conditions hold.

The model is intentionally discrete. It proves the one-period accounting
invariants and the induction-compatible roll state. It does not prove that a
funding formula makes the contract track a centralized perpetual swap index.

## 1. Units

Use integer units.

```text
B = 100_000_000
```

`B` is the number of satoshis per BTC.

```text
LQ = long-side BTC collateral in satoshis
SQ = short-side BTC collateral in satoshis
N  = USD notional in cents
F  = forward price for the period in cents per BTC
P  = settlement price in cents per BTC
Phi = signed funding amount credited to the long in cents
```

Preconditions:

```text
LQ >= 0
SQ >= 0
N >= 0
F > 0
P > 0
B > 0
```

`Phi > 0` means the long receives funding from the short. `Phi < 0` means the
long pays funding to the short.

The value of `q` satoshis at settlement is:

```text
ValueCents(q, P) = q * P / B
```

The model avoids division by scaling every cents value by `B * F`.

## 2. One-Period Forward PnL

For a USD-notional long forward:

```text
LongPnL_Cents = N * (P - F) / F
ShortPnL_Cents = -LongPnL_Cents
```

With funding credited to the long:

```text
LongDelta_Cents = N * (P - F) / F + Phi
ShortDelta_Cents = -LongDelta_Cents
```

Scaled by `B * F`, the signed long delta is:

```text
DeltaScaled = B * (N * (P - F) + Phi * F)
```

The short delta is:

```text
ShortDeltaScaled = -DeltaScaled
```

Therefore mark-to-market plus funding is zero-sum before rounding:

```text
DeltaScaled + ShortDeltaScaled = 0
```

## 3. Scaled Equity

The long and short raw equities after price observation and before BTC output
rounding are:

```text
LongEquityScaled  = LQ * P * F + DeltaScaled
ShortEquityScaled = SQ * P * F - DeltaScaled
```

These are exactly the division-free forms of the intended rational formulas:

```text
LongEquity_Cents
  = LQ * P / B + N * (P - F) / F + Phi

ShortEquity_Cents
  = SQ * P / B - N * (P - F) / F - Phi
```

Multiplying each side by `B * F` gives:

```text
B * F * LongEquity_Cents
= LQ * P * F + B * N * (P - F) + B * Phi * F
= LongEquityScaled

B * F * ShortEquity_Cents
= SQ * P * F - B * N * (P - F) - B * Phi * F
= ShortEquityScaled
```

The total scaled equity is conserved:

```text
LongEquityScaled + ShortEquityScaled
= LQ * P * F + SQ * P * F
= (LQ + SQ) * P * F
```

This identity is the core mark-to-market conservation claim. PnL and funding
move value between counterparties; they do not create BTC collateral.

## 4. BTC Settlement Transfer

Define:

```text
UnitScaled = P * F
AbsDeltaScaled = abs(DeltaScaled)
Transfer = floor(AbsDeltaScaled / UnitScaled)
Remainder = AbsDeltaScaled - Transfer * UnitScaled
```

The quotient invariant is:

```text
0 <= Remainder < UnitScaled
```

`Transfer` is the integer number of satoshis paid by the losing side to the
winning side. Floor rounding prevents the winner from receiving more than the
computed period delta. The unpaid rounding amount is worth less than one
satoshi at the settlement price.

Equivalently:

```text
Transfer * P * F <= AbsDeltaScaled
AbsDeltaScaled - Transfer * P * F < P * F
```

## 5. Solvent Transfer Branches

### 5.1 Long Wins

The long wins when:

```text
DeltaScaled >= 0
```

If the short can pay:

```text
Transfer <= SQ
```

then the solvent settlement is:

```text
LQ' = LQ + Transfer
SQ' = SQ - Transfer
```

BTC conservation:

```text
LQ' + SQ'
= LQ + Transfer + SQ - Transfer
= LQ + SQ
```

The long's post-settlement BTC value is within one satoshi-scaled unit of the
raw scaled equity:

```text
0 <= LongEquityScaled - LQ' * P * F < P * F
```

Proof:

```text
LongEquityScaled - LQ' * P * F
= (LQ * P * F + DeltaScaled) - (LQ + Transfer) * P * F
= DeltaScaled - Transfer * P * F
= Remainder
```

and `0 <= Remainder < P * F`.

### 5.2 Short Wins

The short wins when:

```text
DeltaScaled < 0
```

If the long can pay:

```text
Transfer <= LQ
```

then the solvent settlement is:

```text
LQ' = LQ - Transfer
SQ' = SQ + Transfer
```

BTC conservation:

```text
LQ' + SQ'
= LQ - Transfer + SQ + Transfer
= LQ + SQ
```

The short's post-settlement BTC value is within one satoshi-scaled unit of the
raw scaled equity:

```text
0 <= ShortEquityScaled - SQ' * P * F < P * F
```

Proof:

Since `DeltaScaled < 0`, `AbsDeltaScaled = -DeltaScaled`.

```text
ShortEquityScaled - SQ' * P * F
= (SQ * P * F - DeltaScaled) - (SQ + Transfer) * P * F
= -DeltaScaled - Transfer * P * F
= AbsDeltaScaled - Transfer * P * F
= Remainder
```

and `0 <= Remainder < P * F`.

## 6. Insolvent Liquidation Branches

### 6.1 Short Cannot Pay Long

If:

```text
DeltaScaled >= 0
Transfer > SQ
```

then the short-side loss is capped at posted collateral:

```text
LQ' = LQ + SQ
SQ' = 0
```

The long receives all short collateral, and the short cannot lose more than
`SQ` satoshis.

BTC conservation:

```text
LQ' + SQ' = LQ + SQ
```

### 6.2 Long Cannot Pay Short

If:

```text
DeltaScaled < 0
Transfer > LQ
```

then the long-side loss is capped at posted collateral:

```text
LQ' = 0
SQ' = SQ + LQ
```

The short receives all long collateral, and the long cannot lose more than
`LQ` satoshis.

BTC conservation:

```text
LQ' + SQ' = LQ + SQ
```

## 7. Funding Is Zero-Sum

The funding component credited to the long is:

```text
LongFundingScaled = B * Phi * F
```

The funding component credited to the short is:

```text
ShortFundingScaled = -B * Phi * F
```

Therefore:

```text
LongFundingScaled + ShortFundingScaled = 0
```

The same statement holds after conversion to the settlement transfer: funding
is included inside `DeltaScaled`, so any BTC transfer caused by funding is paid
by one side and received by the other side. It changes allocation, not total
collateral.

## 8. Margin Trigger

Let the maintenance margin ratio be:

```text
MMR = MMR_num / MMR_den
```

with:

```text
MMR_num >= 0
MMR_den > 0
```

After a solvent transfer, the long has sufficient margin if:

```text
LQ' * P * MMR_den >= N * B * MMR_num
```

The short has sufficient margin if:

```text
SQ' * P * MMR_den >= N * B * MMR_num
```

These are the cross-multiplied forms of:

```text
LQ' * P / B >= N * MMR_num / MMR_den
SQ' * P / B >= N * MMR_num / MMR_den
```

The cDLC roll branch is valid only when both predicates hold after the
period-transfer branch.

## 9. Roll Transition

If settlement is solvent and both margin predicates hold, the next forward
state is:

```text
LQ_next = LQ'
SQ_next = SQ'
N_next  = N
F_next  = chosen next forward price
```

The child receives exactly the post-settlement BTC balances. The raw rational
equity before BTC output rounding is tracked by the residual bounds in the
solvent-transfer proofs.

The roll preserves posted BTC collateral:

```text
LQ_next + SQ_next = LQ + SQ
```

Proof:

By branch conservation:

```text
LQ' + SQ' = LQ + SQ
```

Substitute `LQ_next = LQ'` and `SQ_next = SQ'`.

The roll also carries the post-settlement margin state into the child DLC:

```text
LQ_next * P * MMR_den >= N_next * B * MMR_num
SQ_next * P * MMR_den >= N_next * B * MMR_num
```

Proof:

Substitute `LQ_next = LQ'`, `SQ_next = SQ'`, and `N_next = N` into the margin
predicates used to authorize the roll.

## 10. Reduce-Notional Transition

If settlement is solvent but one side fails the margin predicate, the graph may
roll into a reduced-notional child state rather than liquidate immediately.

Choose:

```text
0 <= N_red <= N
```

The reduced-notional roll is valid only if:

```text
LQ' * P * MMR_den >= N_red * B * MMR_num
SQ' * P * MMR_den >= N_red * B * MMR_num
```

Then:

```text
LQ_next = LQ'
SQ_next = SQ'
N_next  = N_red
```

and the child state satisfies maintenance margin by direct substitution.

This specification deliberately treats `N_red` as a policy-selected value. A
production protocol can choose the maximum safe reduced notional, but the cDLC
branch should verify the selected `N_red` using the cross-multiplied margin
predicate above.

## 11. Finite Rolling Sequence

For a finite sequence of periods `i = 0 .. k - 1`, define each step:

```text
(LQ_i, SQ_i, N_i, F_i, P_i, Phi_i)
  -> (LQ_{i+1}, SQ_{i+1}, N_{i+1})
```

If every step is a solvent roll or a valid reduced-notional roll, then:

```text
LQ_{i+1} + SQ_{i+1} = LQ_i + SQ_i
```

By induction:

```text
LQ_k + SQ_k = LQ_0 + SQ_0
```

If a liquidation branch occurs at step `j`, then:

```text
LQ_{j+1} + SQ_{j+1} = LQ_j + SQ_j
```

and one side's collateral becomes zero. The contract graph can terminate or
continue only through a separately defined refinancing or recapitalization
branch.

## 12. cDLC Mapping

For each period, the parent DLC has price and funding outcomes. Each outcome
selects a CET whose payout matches one of the branches above.

```text
Period outcome (P_i, Phi_i)
  -> compute DeltaScaled_i
  -> compute Transfer_i
  -> choose long-win, short-win, or liquidation branch
  -> test margin using cross multiplication
  -> activate roll, reduce-notional, or terminal child edge
```

Solvent roll:

```text
CET_i reallocates Transfer_i satoshis between counterparties
B_roll funds the next forward DLC with LQ_next, SQ_next, N_next
```

Liquidation:

```text
CET_i transfers the losing side's posted collateral to the winner
No same-notional child forward is funded
```

Reduce-notional:

```text
CET_i performs the same solvent transfer
B_reduce funds a child forward with N_red <= N
```

The cryptographic fact that only the correct oracle outcome activates the
matching bridge is outside this financial proof and remains covered by the
core cDLC adaptor-signature proofs.

## 13. SPARK Encoding Requirements

A future SPARK target should encode:

```text
DeltaScaled = B * (N * (P - F) + Phi * F)
UnitScaled = P * F
Transfer = floor(abs(DeltaScaled) / UnitScaled)
LongEquityScaled = LQ * P * F + DeltaScaled
ShortEquityScaled = SQ * P * F - DeltaScaled
```

Required proof obligations:

```text
1. LongDeltaScaled + ShortDeltaScaled = 0.
2. LongEquityScaled + ShortEquityScaled = (LQ + SQ) * P * F.
3. Transfer * P * F <= abs(DeltaScaled).
4. abs(DeltaScaled) - Transfer * P * F < P * F.
5. Long-win solvent transfer conserves BTC.
6. Short-win solvent transfer conserves BTC.
7. Long-win rounding residual is less than one satoshi-scaled unit.
8. Short-win rounding residual is less than one satoshi-scaled unit.
9. Short-insolvent liquidation caps short loss at SQ and conserves BTC.
10. Long-insolvent liquidation caps long loss at LQ and conserves BTC.
11. Funding is zero-sum in scaled form.
12. Margin predicates are cross-multiplied equivalents of maintenance margin.
13. Same-notional roll preserves BTC conservation and margin predicates.
14. Reduced-notional roll preserves BTC conservation and proves child margin.
15. A finite all-roll sequence preserves total BTC collateral by induction.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers so signed funding and signed PnL are direct.
- Put non-negativity and denominator constraints in Pre conditions.
- Represent floor division using quotient and remainder lemmas.
- Keep price, notional, and margin tests in cross-multiplied integer form.
- Model one period first, then add a simple two-step or induction-compatible
  lemma for finite rolling.
- Do not use pragma Assume.
```

## 14. Boundary

This specification proves:

```text
- one-period mark-to-market conservation;
- funding zero-sum behavior;
- BTC conservation across solvent transfers and liquidations;
- settlement rounding bounded by less than one satoshi-scaled unit;
- margin trigger predicates without division;
- same-notional and reduced-notional roll invariants;
- finite-sequence collateral conservation under repeated valid rolls.
```

It does not prove:

```text
- continuous perpetual funding convergence;
- exchange index quality;
- oracle correctness;
- liquidation market depth;
- price-manipulation resistance;
- fee safety or mempool behavior;
- production DLC negotiation;
- cDLC cryptographic branch activation, which is covered by the core proofs.
```
