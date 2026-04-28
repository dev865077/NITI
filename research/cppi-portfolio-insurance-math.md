# CPPI and Portfolio-Insurance Vaults Math

This note defines the mathematical specification for CPPI portfolio insurance. It models a
discrete Constant Proportion Portfolio Insurance (CPPI) vault whose cDLC state
reduces BTC exposure as account value approaches a protected floor and
increases BTC exposure as the cushion rises.

The model proves allocation conservation, exposure bounds, scaled account
updates, defensive floor behavior, and the exact gap-risk condition needed for
a discrete observation model. It does not prove continuous-time floor
protection, slippage-free rebalancing, liquidity, oracle correctness, or
portfolio suitability.

## 1. Units

Use integer units.

```text
SAT = 100_000_000
```

`SAT` is the number of satoshis per BTC.

```text
A_i = account value at observation i, in cents
F_i = protected floor value at observation i, in cents
S_i = BTC/USD price at observation i, in cents per BTC
S_j = BTC/USD price at next observation j, in cents per BTC
M = M_num / M_den = CPPI multiplier
Q_i = posted BTC collateral at observation i, in satoshis
```

Preconditions:

```text
A_i >= 0
F_i >= 0
S_i > 0
S_j > 0
M_num >= 0
M_den > 0
Q_i >= 0
SAT > 0
```

The model keeps CPPI exposure in multiplier-scaled cents:

```text
ValueScaled(x cents) = x * M_den
```

This avoids fractional exposure when `M_num / M_den` is not an integer.

## 2. Cushion

The cushion is:

```text
C_i = max(A_i - F_i, 0)
```

Equivalently:

```text
if A_i >= F_i:
  C_i = A_i - F_i
else:
  C_i = 0
```

### Claim 1: Cushion Bounds

For all valid inputs:

```text
0 <= C_i <= A_i
```

Proof:

If `A_i >= F_i`, then `C_i = A_i - F_i`. Since `F_i >= 0`,
`A_i - F_i <= A_i`, and the branch condition gives non-negativity.

If `A_i < F_i`, then `C_i = 0`, so `0 <= C_i <= A_i` because `A_i >= 0`.

## 3. Allocation Rule

The CPPI risky exposure is:

```text
E_i = min(A_i, M * C_i)
```

In scaled integer form:

```text
E_scaled_i = min(A_i * M_den, M_num * C_i)
Safe_scaled_i = A_i * M_den - E_scaled_i
```

`E_scaled_i / M_den` is the risky BTC exposure value in cents. `Safe_scaled_i
/ M_den` is the safe or defensive exposure value in cents.

### Claim 2: Allocation Conservation

For all valid inputs:

```text
E_scaled_i + Safe_scaled_i = A_i * M_den
```

Proof:

By definition:

```text
Safe_scaled_i = A_i * M_den - E_scaled_i
```

Since `E_scaled_i <= A_i * M_den`, subtraction is non-negative, and adding
back `E_scaled_i` gives the account value in scaled units.

### Claim 3: Exposure Bound

For all valid inputs:

```text
0 <= E_scaled_i <= A_i * M_den
0 <= Safe_scaled_i <= A_i * M_den
```

Proof:

`E_scaled_i` is the minimum of two non-negative values:

```text
A_i * M_den
M_num * C_i
```

therefore it is non-negative and at most `A_i * M_den`. Claim 2 gives
`Safe_scaled_i = A_i * M_den - E_scaled_i`, so it is non-negative and at most
`A_i * M_den`.

### Claim 4: Floor Branch Sets Risky Exposure to Zero

If:

```text
A_i <= F_i
```

then:

```text
C_i = 0
E_scaled_i = 0
Safe_scaled_i = A_i * M_den
```

Proof:

If `A_i <= F_i`, then `max(A_i - F_i, 0) = 0`, so `C_i = 0`.
Therefore:

```text
M_num * C_i = 0
E_scaled_i = min(A_i * M_den, 0) = 0
Safe_scaled_i = A_i * M_den
```

The defensive branch has zero risky BTC exposure.

## 4. Account Update

The intended financial formula is:

```text
A_j = E_i * (S_j / S_i) + Safe_i
```

With scaled exposure, the division-free update numerator is:

```text
A_next_num =
  E_scaled_i * S_j + Safe_scaled_i * S_i
```

The denominator is:

```text
A_next_den = S_i * M_den
```

Thus:

```text
A_j = A_next_num / A_next_den
```

and the exact cross-multiplied identity is:

```text
A_j * S_i * M_den
  = E_scaled_i * S_j + Safe_scaled_i * S_i
```

### Claim 5: Scaled Account Update Matches the Financial Formula

If rational account value is represented by `A_next_num / (S_i * M_den)`, then:

```text
A_next_num =
  E_scaled_i * S_j + Safe_scaled_i * S_i
```

is exactly the cross-multiplied CPPI update.

Proof:

Substitute:

```text
E_i = E_scaled_i / M_den
Safe_i = Safe_scaled_i / M_den
```

into:

```text
A_j = E_i * (S_j / S_i) + Safe_i
```

Then multiply both sides by `S_i * M_den`:

```text
A_j * S_i * M_den
= E_scaled_i * S_j + Safe_scaled_i * S_i
```

## 5. Floor Preservation and Gap Risk

CPPI does not guarantee the floor between discrete observations unless the
price move is bounded or the exposure is over-defensive. The exact discrete
condition is algebraic.

Assume the account starts at or above the floor:

```text
A_i >= F_i
```

Then:

```text
C_i = A_i - F_i
```

The next account is at or above the same floor when:

```text
A_next_num >= F_i * S_i * M_den
```

Using allocation conservation:

```text
A_next_num
= E_scaled_i * S_j + (A_i * M_den - E_scaled_i) * S_i
= A_i * M_den * S_i - E_scaled_i * (S_i - S_j)
```

Therefore:

```text
A_next_num - F_i * S_i * M_den
= (A_i - F_i) * M_den * S_i
   - E_scaled_i * (S_i - S_j)
```

### Claim 6: Floor Is Preserved Under Bounded Down Move

If:

```text
A_i >= F_i
S_j <= S_i
E_scaled_i * (S_i - S_j)
  <= (A_i - F_i) * M_den * S_i
```

then:

```text
A_next_num >= F_i * S_i * M_den
```

Proof:

The difference between next scaled account value and the scaled floor is:

```text
(A_i - F_i) * M_den * S_i
  - E_scaled_i * (S_i - S_j)
```

The precondition states this value is non-negative. Therefore the next account
value is at or above the floor in the scaled account representation.

### Claim 7: Up Moves Preserve the Floor

If:

```text
A_i >= F_i
S_j >= S_i
```

then:

```text
A_next_num >= F_i * S_i * M_den
```

Proof:

Since `S_j >= S_i`:

```text
E_scaled_i * S_j >= E_scaled_i * S_i
```

Therefore:

```text
A_next_num
= E_scaled_i * S_j + Safe_scaled_i * S_i
>= E_scaled_i * S_i + Safe_scaled_i * S_i
= (E_scaled_i + Safe_scaled_i) * S_i
= A_i * M_den * S_i
>= F_i * M_den * S_i
```

### Claim 8: Gap-Risk Limitation

Without a bounded down-move assumption, floor preservation is not guaranteed.

Counterexample:

```text
A_i = 100
F_i = 90
M_den = 1
M_num = 10
S_i = 100
S_j = 1
E_scaled_i = 100
```

Then:

```text
A_next_num = E_scaled_i * S_j + Safe_scaled_i * S_i
```

If `Safe_scaled_i = 0`, then `A_next_num = 100`, while the scaled floor is
`F_i * S_i * M_den = 9000`. The next account value is below the floor even
though all prices are positive.

The production interpretation is precise: cDLC CPPI can enforce the next
branch selected by an oracle observation, but discrete CPPI cannot promise
continuous floor protection unless the protocol also assumes a maximum gap,
uses deeper overcollateralization, or floors risky exposure more aggressively.

## 6. Branches

After computing the next account value in scaled form, use the branch
predicate:

```text
FloorSafe_j:
  A_next_num >= F_i * S_i * M_den

FloorBreached_j:
  A_next_num < F_i * S_i * M_den
```

### Claim 9: Floor Branch Coverage and Disjointness

Exactly one of `FloorSafe_j` and `FloorBreached_j` holds.

Proof:

Integer order gives either `>=` or `<` for the two sides of the comparison.
The predicates are strict complements.

### Defensive Branch

If `FloorBreached_j` holds, the defensive child state sets:

```text
E_scaled_j = 0
Safe_scaled_j = A_next_num
```

with denominator:

```text
A_next_den = S_i * M_den
```

This branch does not claim the original floor was preserved. It only proves
that the next state carries no risky BTC exposure.

### Continue Branch

If `FloorSafe_j` holds, the child state can compute a new cushion against the
floor using the same account representation:

```text
C_next_num = A_next_num - F_i * S_i * M_den
C_next_den = S_i * M_den
```

and:

```text
C_next_num >= 0
```

## 7. Bucket Funding and Collateral Conservation

The financial allocation conserves account value:

```text
E_scaled_i + Safe_scaled_i = A_i * M_den
```

The cDLC funding split conserves posted BTC collateral separately:

```text
RiskyFundingBTC_i + SafeFundingBTC_i = Q_i
```

These are different ledgers. The first is account-value accounting. The second
is UTXO collateral accounting. A production implementation must define a
policy that maps desired exposure values to BTC funding outputs.

For a chosen BTC funding split:

```text
0 <= RiskyFundingBTC_i <= Q_i
SafeFundingBTC_i = Q_i - RiskyFundingBTC_i
```

### Claim 10: BTC Funding Split Conserves Collateral

For every chosen split satisfying `RiskyFundingBTC_i <= Q_i`:

```text
0 <= SafeFundingBTC_i <= Q_i
RiskyFundingBTC_i + SafeFundingBTC_i = Q_i
```

Proof:

By definition:

```text
SafeFundingBTC_i = Q_i - RiskyFundingBTC_i
```

The precondition gives non-negativity, and addition restores `Q_i`.

## 8. Finite-Step Conservation

For each observation step, there are two exact conservation identities.

Account allocation:

```text
E_scaled_i + Safe_scaled_i = A_i * M_den
```

BTC collateral split:

```text
RiskyFundingBTC_i + SafeFundingBTC_i = Q_i
```

If every child state is funded with:

```text
Q_{i+1} = RiskyFundingBTC_i + SafeFundingBTC_i
```

then:

```text
Q_{i+1} = Q_i
```

except for explicit fees, withdrawals, or payouts included as separate
transfers.

### Claim 11: Two-Step Collateral Conservation

If two consecutive continuation steps have no explicit fees, withdrawals, or
payouts, then:

```text
Q_1 = Q_0
Q_2 = Q_1
```

therefore:

```text
Q_2 = Q_0
```

Proof:

Substitute the first equality into the second.

This is the induction-compatible conservation statement for a finite cDLC CPPI
graph.

## 9. cDLC Mapping

At observation `i`:

```text
state (A_i, F_i, M_num, M_den, Q_i)
  -> compute C_i
  -> compute E_scaled_i and Safe_scaled_i
  -> observe S_j
  -> compute A_next_num
  -> choose FloorSafe_j or FloorBreached_j
```

Floor-safe continuation:

```text
B_continue funds the next CPPI child state
child state computes the next allocation from A_next_num / A_next_den
```

Floor-breached defensive state:

```text
B_defensive funds a zero-risky-exposure child state
E_scaled_j = 0
```

The cryptographic fact that only the matching oracle outcome activates the
matching bridge remains covered by the core cDLC adaptor-signature proofs. This
note proves the financial allocation and state-transition invariants attached
to those branches.

## 10. SPARK Encoding Requirements

A future SPARK target should encode:

```text
Cushion(A, F)
ExposureScaled(A, F, M_Num, M_Den)
SafeScaled(A, ExposureScaled, M_Den)
AccountNextNumerator(E_scaled, Safe_scaled, S_i, S_j)
FloorSafe(A_next_num, F, S_i, M_Den)
RiskyFundingSplit(Q, RiskyFundingBTC)
```

Required proof obligations:

```text
1. Cushion is non-negative and bounded by account value.
2. ExposureScaled is non-negative and bounded by A * M_Den.
3. SafeScaled is non-negative and bounded by A * M_Den.
4. ExposureScaled + SafeScaled = A * M_Den.
5. If A <= F, ExposureScaled = 0.
6. AccountNextNumerator is the cross-multiplied CPPI update.
7. Up moves preserve the floor when the initial account is at or above floor.
8. Down moves preserve the floor only under the explicit bounded-loss inequality.
9. FloorSafe and FloorBreached branches are disjoint and exhaustive.
10. Defensive branch sets risky exposure to zero.
11. Floor-safe branch has non-negative next cushion numerator.
12. BTC funding split conserves posted collateral.
13. Two-step continuation without fees preserves posted collateral.
14. Gap-risk limitation is documented as a boundary, not proved away.
```

Suggested proof style:

```text
- Use SPARK.Big_Integers for the first pass.
- Encode max and min with explicit branch functions.
- Keep multiplier as numerator/denominator.
- Carry next account as numerator/denominator instead of rounding to cents.
- Put gap-risk and funding-policy assumptions in Pre conditions.
- Do not use pragma Assume.
```

## 11. Boundary

This specification proves:

```text
- CPPI allocation conservation;
- exposure and safe-bucket bounds;
- zero risky exposure at or below floor;
- scaled account-update equivalence;
- floor preservation under explicit bounded-gap assumptions;
- branch coverage/disjointness for floor-safe and breached states;
- BTC funding split conservation;
- two-step collateral conservation for fee-free continuations.
```

It does not prove:

```text
- continuous-time floor guarantee;
- slippage-free rebalancing;
- liquidity or execution availability;
- oracle correctness;
- safe-asset credit quality;
- fee safety or mempool confirmation;
- investor suitability;
- cDLC cryptographic activation, which is covered by the core proofs.
```
