# BTC-Backed Loan Lifecycle Math

This note resolves the mathematical specification for issue #12. It extends
the existing BTC-collateralized loan algebra into a full lifecycle model:
origination, interest accrual, LTV branch selection, auto-refinancing, margin
top-up, partial liquidation, full liquidation, and residual roll.

The model is deliberately integer-based. It proves collateral accounting and
threshold behavior. It does not prove borrower willingness, lender liquidity,
real liquidation execution, oracle correctness, or legal enforceability.

## 1. Units

Use integer units.

```text
B = 100_000_000
```

`B` is the number of satoshis per BTC.

```text
Q = BTC collateral in satoshis
S = BTC/USD oracle price in cents per BTC
D = outstanding loan debt in cents
I = accrued interest in cents
R = borrower repayment in cents
```

Preconditions:

```text
Q >= 0
S > 0
D >= 0
I >= 0
R >= 0
B > 0
R <= D + I
```

The scaled collateral value is:

```text
CollateralScaled(Q, S) = Q * S
```

The scaled debt value is:

```text
DebtScaled(D) = D * B
```

The actual collateral value in cents is `Q * S / B`. Scaling both sides by `B`
keeps all LTV tests division-free.

## 2. Debt Accrual

The debt after one period is:

```text
D_accr = D + I - R
```

The precondition `R <= D + I` gives:

```text
D_accr >= 0
```

If `R = 0`, then:

```text
D_accr = D + I >= D
```

This is the exact algebra already represented by the existing
`Debt_After_Period` SPARK function.

### Interest Rate Form

If interest is generated from a rational period rate:

```text
rate = Rate_Num / Rate_Den
Rate_Num >= 0
Rate_Den > 0
```

then a borrower-side conservative convention is:

```text
I = ceil(D * Rate_Num / Rate_Den)
```

which proves:

```text
I * Rate_Den >= D * Rate_Num
I = 0 or (I - 1) * Rate_Den < D * Rate_Num
```

The lifecycle proof does not require this rate formula; it only requires
`I >= 0`.

## 3. LTV Tests

Let an LTV threshold be:

```text
Theta = Theta_Num / Theta_Den
```

with:

```text
Theta_Num >= 0
Theta_Den > 0
```

The loan is at or below the threshold when:

```text
D * B * Theta_Den <= Theta_Num * Q * S
```

This is the cross-multiplied form of:

```text
D / (Q * S / B) <= Theta_Num / Theta_Den
```

The loan is above the threshold when:

```text
D * B * Theta_Den > Theta_Num * Q * S
```

No division is needed in the cDLC branch predicate or in the SPARK proof.

## 4. Threshold Ordering and Branches

Use ordered thresholds:

```text
Theta_Target <= Theta_Roll < Theta_Call < Theta_Liq
```

Each threshold is represented by a numerator and denominator. Ordering between
two thresholds is expressed by cross multiplication:

```text
A_Num / A_Den <= B_Num / B_Den
iff
A_Num * B_Den <= B_Num * A_Den
```

After accrual, compute `D_accr`. The lifecycle branch predicates are:

```text
Healthy:
  D_accr * B * Roll_Den <= Roll_Num * Q * S

Watch:
  D_accr * B * Roll_Den > Roll_Num * Q * S
  and D_accr * B * Call_Den <= Call_Num * Q * S

MarginCall:
  D_accr * B * Call_Den > Call_Num * Q * S
  and D_accr * B * Liq_Den <= Liq_Num * Q * S

Liquidation:
  D_accr * B * Liq_Den > Liq_Num * Q * S
```

### Claim 1: Branch Disjointness

Under the threshold ordering, no state can satisfy two branch predicates at the
same time.

Proof:

`Healthy` requires LTV at or below `Theta_Roll`. `Watch` requires LTV strictly
above `Theta_Roll`. Therefore they are disjoint.

`Watch` requires LTV at or below `Theta_Call`. `MarginCall` requires LTV
strictly above `Theta_Call`. Therefore they are disjoint.

`MarginCall` requires LTV at or below `Theta_Liq`. `Liquidation` requires LTV
strictly above `Theta_Liq`. Therefore they are disjoint.

### Claim 2: Branch Coverage

For any valid state, exactly one of the four predicates holds.

Proof:

For each threshold comparison, integer trichotomy gives either `<=` or `>`.
Check the comparisons in order: roll, call, liquidation. The first threshold
that is not exceeded selects the corresponding branch; if all three are
exceeded, the liquidation branch is selected.

## 5. Healthy Roll and Auto-Refinance

In the healthy branch, the loan can roll into a child DLC with updated debt:

```text
Q_next = Q - FeeBTC
D_next = D_accr + CashOut + FeeDebt - RefiRepayment
```

Preconditions:

```text
FeeBTC >= 0
FeeBTC <= Q
CashOut >= 0
FeeDebt >= 0
RefiRepayment >= 0
RefiRepayment <= D_accr + CashOut + FeeDebt
```

Then:

```text
Q_next >= 0
D_next >= 0
Q_next + FeeBTC = Q
```

If there is no BTC fee or collateral withdrawal:

```text
FeeBTC = 0
```

then collateral is preserved:

```text
Q_next = Q
```

A same-risk roll is valid only if the child state satisfies the chosen target
or roll threshold:

```text
D_next * B * Target_Den <= Target_Num * Q_next * S
```

or:

```text
D_next * B * Roll_Den <= Roll_Num * Q_next * S
```

The math does not assume the refinance is safe because it is called a
refinance. The child branch must verify the cross-multiplied LTV predicate.

## 6. Margin Top-Up

In a margin-call branch, the borrower can add collateral before a deadline.

Let:

```text
U = top-up collateral in satoshis
Q_top = Q + U
```

The top-up restores target LTV if:

```text
D_accr * B * Target_Den <= Target_Num * Q_top * S
```

Equivalently, define the target shortfall:

```text
Shortfall =
  D_accr * B * Target_Den - Target_Num * Q * S
```

when this value is positive. Any `U` satisfying:

```text
Target_Num * U * S >= Shortfall
```

restores target LTV, because:

```text
Target_Num * (Q + U) * S
= Target_Num * Q * S + Target_Num * U * S
>= Target_Num * Q * S + Shortfall
= D_accr * B * Target_Den
```

### Claim 3: Exact Top-Up Restores Target

If:

```text
Shortfall = D_accr * B * Target_Den - Target_Num * Q * S
Shortfall > 0
Target_Num * U * S >= Shortfall
```

then:

```text
D_accr * B * Target_Den <= Target_Num * (Q + U) * S
```

This is the margin-call restoration invariant.

## 7. Partial Liquidation

Partial liquidation sells or transfers `q` satoshis of collateral and applies a
recovery ratio to debt repayment.

Let:

```text
Recovery = Recovery_Num / Recovery_Den
```

with:

```text
Recovery_Num >= 0
Recovery_Den > 0
```

Liquidating `q` satoshis has preconditions:

```text
0 <= q <= Q
D_accr * B * Recovery_Den >= q * S * Recovery_Num
```

The post-liquidation collateral is:

```text
Q_liq = Q - q
```

To avoid fractional cents, carry post-liquidation debt as a scaled debt:

```text
D_liq_scaled = D_accr * B * Recovery_Den - q * S * Recovery_Num
```

This represents actual debt:

```text
D_liq = D_liq_scaled / (B * Recovery_Den)
```

The collateral accounting invariant is:

```text
Q_liq + q = Q
```

The debt deleveraging invariant is:

```text
D_liq_scaled <= D_accr * B * Recovery_Den
```

These are the invariants already modeled in
`Btc_Collateral_Loan_Algebra`.

## 8. Exact Partial Liquidation to Target LTV

Let:

```text
Target = Target_Num / Target_Den
```

The exact target condition after partial liquidation is:

```text
D_liq / (Q_liq * S / B) = Target_Num / Target_Den
```

Using scaled debt:

```text
D_liq_scaled * Target_Den
  = Target_Num * Q_liq * S * Recovery_Den
```

Substitute `Q_liq = Q - q` and
`D_liq_scaled = D_accr * B * Recovery_Den - q * S * Recovery_Num`:

```text
(D_accr * B * Recovery_Den - q * S * Recovery_Num) * Target_Den
  = Target_Num * (Q - q) * S * Recovery_Den
```

Rearranging gives the liquidation sizing equation:

```text
D_accr * B * Recovery_Den * Target_Den
  - Target_Num * Q * S * Recovery_Den
=
q * S * (Recovery_Num * Target_Den
  - Target_Num * Recovery_Den)
```

This matches the existing SPARK equation, with `B` made explicit because this
document measures collateral in satoshis.

### Claim 4: Exact Sizing Reaches Target LTV

Assume:

```text
0 <= q <= Q
Recovery_Num * Target_Den > Target_Num * Recovery_Den
D_accr * B * Recovery_Den >= q * S * Recovery_Num
```

and the liquidation sizing equation holds. Then:

```text
D_liq_scaled * Target_Den
  = Target_Num * (Q - q) * S * Recovery_Den
```

Proof:

Start from the sizing equation:

```text
D_accr * B * Recovery_Den * Target_Den
  - Target_Num * Q * S * Recovery_Den
=
q * S * Recovery_Num * Target_Den
  - q * S * Target_Num * Recovery_Den
```

Move the `q * S * Recovery_Num * Target_Den` term to the left:

```text
D_accr * B * Recovery_Den * Target_Den
  - q * S * Recovery_Num * Target_Den
=
Target_Num * Q * S * Recovery_Den
  - q * S * Target_Num * Recovery_Den
```

Factor both sides:

```text
(D_accr * B * Recovery_Den - q * S * Recovery_Num) * Target_Den
  =
Target_Num * (Q - q) * S * Recovery_Den
```

Substitute `D_liq_scaled` and `Q_liq`.

## 9. Full Liquidation Waterfall

A full liquidation converts the debt claim into a BTC claim and caps the
lender by posted collateral.

Use a conservative integer claim:

```text
DebtClaimBTC = ceil(D_accr * B / S)
```

Then:

```text
DebtClaimBTC * S >= D_accr * B
DebtClaimBTC = 0 or (DebtClaimBTC - 1) * S < D_accr * B
```

The terminal waterfall is:

```text
LenderBTC   = min(Q, DebtClaimBTC)
BorrowerBTC = Q - LenderBTC
```

### Claim 5: Full Liquidation Conserves BTC and Caps Lender Claim

For all valid inputs:

```text
0 <= LenderBTC <= Q
0 <= BorrowerBTC <= Q
LenderBTC + BorrowerBTC = Q
```

Proof:

`LenderBTC` is the minimum of `Q` and a non-negative debt claim, so it is
non-negative and at most `Q`. Therefore `BorrowerBTC = Q - LenderBTC` is
non-negative. Conservation follows by substitution.

If `DebtClaimBTC <= Q`, then:

```text
LenderBTC = DebtClaimBTC
BorrowerBTC = Q - DebtClaimBTC
```

If `DebtClaimBTC > Q`, then:

```text
LenderBTC = Q
BorrowerBTC = 0
```

The lender cannot receive more than posted collateral.

## 10. Residual Roll After Partial Liquidation

If partial liquidation reaches target LTV, the residual child state is:

```text
Q_next = Q - q
D_next_scaled = D_accr * B * Recovery_Den - q * S * Recovery_Num
DebtDen_next = B * Recovery_Den
P_0_next = S
```

The child state carries exact scaled debt:

```text
D_next = D_next_scaled / DebtDen_next
```

The target invariant is:

```text
D_next_scaled * Target_Den
  = Target_Num * Q_next * S * Recovery_Den
```

This is stronger than an inequality threshold: it states that exact partial
liquidation lands on the target LTV.

If a production system requires debt in whole cents, it may round:

```text
D_next_cents = ceil(D_next_scaled / DebtDen_next)
```

That rounding must be proved separately because it can make the child debt
slightly larger than the exact scaled debt. The clean SPARK target should carry
scaled debt first.

## 11. cDLC Mapping

For each oracle price bucket `S_i`, the parent DLC selects one lifecycle branch.

```text
Price outcome S_i
  -> compute D_accr
  -> evaluate ordered LTV predicates
  -> choose healthy roll, watch roll, margin-call wait, partial liquidation,
     or full liquidation
  -> oracle scalar activates the matching bridge transaction
```

Healthy or watch roll:

```text
CET_i funds a child loan DLC with Q_next and D_next
```

Margin call:

```text
CET_i or B_call funds a wait/top-up state with a deadline
top-up path funds a restored child state if U satisfies the target predicate
timeout path moves to liquidation policy
```

Partial liquidation:

```text
CET_i transfers q satoshis to the lender or liquidation agent
B_residual funds a child loan DLC with Q_next and scaled D_next
```

Full liquidation:

```text
CET_i pays LenderBTC to lender and BorrowerBTC to borrower
No residual same-loan child state is funded
```

The cryptographic rule that only the correct price-outcome scalar activates
the corresponding bridge remains covered by the core cDLC adaptor-signature
proofs. This note proves the financial branch and accounting invariants.

## 12. SPARK Encoding Requirements

The existing target:

```text
spark/btc_collateral_loan_proofs.gpr
```

already proves the core loan algebra. A lifecycle companion or extension for
issue #13 should add the following explicit obligations.

```text
1. Debt accrual preserves non-negativity.
2. Accrual without repayment does not decrease debt.
3. LTV threshold predicates are cross-multiplied forms of ratio tests.
4. Ordered thresholds make Healthy, Watch, MarginCall, and Liquidation disjoint.
5. Ordered threshold comparisons cover every valid state.
6. Healthy roll preserves collateral except explicit BTC fees/transfers.
7. Refinance state is valid only under the child LTV predicate.
8. Exact top-up restores target LTV.
9. Partial liquidation conserves collateral: (Q - q) + q = Q.
10. Partial liquidation does not increase scaled debt.
11. Exact liquidation sizing reaches target LTV.
12. Full liquidation conserves BTC.
13. Full liquidation caps lender claim by posted collateral.
14. Residual partial-liquidation roll carries exact scaled debt into child state.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers.
- Keep `B` explicit if modeling satoshis; set `B = 1` only for an abstract BTC
  unit model.
- Encode all ratios by numerator/denominator pairs.
- Use cross multiplication for every LTV and threshold test.
- Carry post-partial-liquidation debt as scaled debt before adding cent rounding.
- Put branch-policy assumptions in Pre conditions.
- Do not use pragma Assume.
```

## 13. Boundary

This specification proves:

```text
- non-negative debt accrual;
- LTV threshold algebra;
- branch disjointness and coverage under ordered thresholds;
- collateral preservation for roll/refi except explicit transfers;
- margin top-up restoration;
- partial liquidation deleveraging and exact target sizing;
- terminal liquidation conservation and lender cap;
- residual roll with exact scaled debt.
```

It does not prove:

```text
- borrower willingness or ability to top up;
- lender ability to refinance;
- liquidation market depth;
- recovery-ratio realism;
- oracle correctness;
- legal enforceability of the debt;
- fee safety or mempool confirmation;
- Bitcoin transaction serialization;
- cDLC cryptographic activation, which is covered by the core proofs.
```
