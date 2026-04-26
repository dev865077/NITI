# cDLC SPARK Proofs

This directory contains SPARK models of the core adaptor algebra used in the
cDLC technical note and in the primary cDLC whitepaper, plus finite financial
product models that prove cDLC settlement accounting over integer units.

There are seventeen models:

- `cdlc_integer_algebra`: proves the core identities over mathematical
  integers with `SPARK.Big_Integers`. These are polynomial identities. Because
  quotient maps preserve addition and multiplication, the same identities
  transport to arithmetic modulo `n`.
- `cdlc_residue_algebra`: proves the same bridge/adaptor identities over the
  finite residue ring `Z/97Z`, with explicit `mod 97` reduction and no
  `pragma Assume` statements.
- `cdlc_algebra`: proves the same identities using Ada's built-in `type mod 97`.
  This target includes explicit ghost lemmas for modular sum rotation and
  left-cancellation so GNATprove can close the bit-vector modular obligations.
- `lightning_cdlc_algebra`: proves the Lightning companion identities using
  Ada's built-in `type mod 97`: HTLC compatibility under an ideal injective
  hash model, PTLC point locks, HTLC route witness reuse, PTLC route tweaks,
  child activation, timeout/refund abstraction, and channel balance
  conservation.
- `btc_collateral_loan_algebra`: proves the algebraic finance identities for a
  BTC-collateralized loan model over mathematical integers: cross-multiplied
  LTV checks, debt accrual, terminal collateral waterfall, partial liquidation,
  and exact target-LTV restoration under the stated liquidation-size equation.
- `covered_call_yield_note_algebra`: proves the integer payoff and settlement
  identities for BTC covered calls and BTC yield notes: OTM/ITM branch
  partitioning, capped deliverable notional, floor-quotient ITM claim bounds,
  escrowed/upfront conservation, and explicit OTM, ATM, ITM, capped-claim, and
  maximum-delivery vectors.
- `synthetic_dollar_stable_exposure_algebra`: proves integer accounting for
  BTC-collateralized synthetic dollar exposure: cross-multiplied stable-value
  checks, collateral caps, residual BTC conservation, re-hedge continuation,
  and wrong-branch settlement exclusion at the financial-state layer.
- `perpetuals_rolling_forwards_algebra`: proves one-period forward/perpetual
  payoff accounting, zero-sum long/short scaled payoffs, funding accrual,
  collateral-capped BTC settlement, roll-state reference updates, and
  two-period same-notional telescoping.
- `btc_loan_lifecycle_algebra`: proves the extended BTC-backed loan lifecycle:
  accrual, repayment, refinance, margin-call predicates, partial liquidation,
  liquidation caps, terminal waterfall, and collateral-conserving branch
  outputs.
- `collars_protective_notes_algebra`: proves collars, protective puts, and
  principal-protected BTC note accounting: branch partitioning, put/call
  boundedness, floor/ceiling witnesses, principal protection, and BTC
  conservation.
- `barrier_options_algebra`: proves barrier-option and knock-in/knock-out
  continuation accounting: barrier branch partitioning, activation/deactivation
  predicates, bounded option claims, refund/expiry behavior, and continuation
  conservation.
- `autocallables_algebra`: proves autocallable and callable yield-note
  accounting: call/no-call branch partitioning, coupon accrual, principal
  redemption, downside participation, knock-in effects, and conservation.
- `accumulators_decumulators_algebra`: proves accumulator/decumulator
  accounting: per-period purchase/sale bounds, cumulative notional caps,
  monotone filled quantity, knock-out behavior, and BTC settlement
  conservation.
- `cppi_algebra`: proves CPPI and portfolio-insurance vault accounting:
  floor/cushion/exposure relations, multiplier bounds, rebalancing
  conservation, floor preservation under modeled no-gap conditions, and an
  explicit gap-risk counterexample.
- `variance_corridor_swaps_algebra`: proves realized variance and corridor
  variance swap accounting: non-negative variance terms, monotone
  accumulation, corridor include/exclude partitioning, bounded corridor terms,
  zero-sum payoff, strike equality, and BTC settlement conservation.
- `basis_calendar_rolls_algebra`: proves signed spread accounting for
  spot/forward basis trades, near/far calendar spreads, and finite
  term-structure rolls: linearity, zero-sum payoffs, floor-style BTC transfer
  witnesses, margin predicates, reduced-notional rolls, and telescoping.
- `parametric_insurance_algebra`: proves integer accounting for parametric
  insurance and event-linked notes: binary up/down triggers, tiered payouts,
  linear attachment/exhaustion, USD-indexed ceil witnesses, note waterfalls,
  renewal residuals, and aggregate limits.

## Proven

- Oracle attestation scalar maps to the public attestation point.
- A bridge adaptor signature verifies before completion.
- Adding the oracle scalar completes the signature.
- A completed signature reveals the oracle scalar by subtraction.
- A different oracle scalar does not complete the same bridge signature.
- In the Lightning model, an oracle scalar settles an HTLC when the oracle
  precommits to its payment hash.
- In the Lightning model, the same oracle scalar settles a point-locked PTLC.
- HTLC route locks sharing the same payment hash are redeemed by the same
  oracle witness and reject a wrong witness.
- PTLC hop tweaks preserve route atomicity for one-hop and two-hop routes.
- Correct Lightning witnesses move channel balances while wrong witnesses leave
  the abstract channel state unchanged.
- Timeout/refund predicates activate for wrong witnesses and not after correct
  redemption.
- BTC loan LTV checks are represented by the division-free cross product
  `Debt * LTV_Den <= LTV_Num * Collateral_BTC * Price_USD`.
- A roll preserves BTC collateral and updates debt by
  `Debt + Interest - Repayment`.
- A terminal default waterfall conserves BTC between lender claim and borrower
  residual.
- Partial liquidation weakly reduces both remaining collateral and scaled debt.
- If the exact liquidation-sizing equation holds, the post-liquidation state
  reaches the target LTV in cross-multiplied form.
- Covered-call and yield-note OTM/ITM branches cover all settlement prices and
  do not overlap.
- Capped deliverable notional is bounded by covered notional, cap, and posted
  collateral.
- An ITM quotient witness satisfies the floor-style inequalities
  `Claim * S <= (S - K) * D` and
  `(Claim + 1) * S > (S - K) * D`.
- The ITM buyer claim is bounded by deliverable BTC notional.
- Escrowed premium settlement conserves `Collateral + Premium`; upfront
  premium settlement conserves posted collateral.
- Explicit covered-call test vectors prove OTM, ATM, ITM, capped-claim, and
  maximum-delivery cases.
- Synthetic-dollar accounting preserves the BTC-funded state under collateral
  caps and division-free stable-value predicates.
- Perpetual and rolling-forward payoffs are zero-sum before caps, and
  same-notional rolls telescope exactly over modeled periods.
- Extended BTC-loan lifecycle branches preserve collateral accounting across
  repayment, refinance, liquidation, and terminal waterfall states.
- Collar, protective-put, and principal-protected-note branches preserve
  principal/floor constraints and conserve BTC under their settlement
  conventions.
- Barrier branches are complete and disjoint, and knock-in/knock-out states
  select the documented active, inactive, refund, or continuation formula.
- Autocallable call/no-call, coupon, redemption, downside, and knock-in
  branches satisfy their boundedness and conservation contracts.
- Accumulator and decumulator period fills are bounded, cumulative fills are
  capped, and knock-out/settlement branches conserve the funded state.
- CPPI rebalancing preserves abstract account value and floor constraints under
  modeled no-gap conditions; gap risk is represented by an explicit
  counterexample rather than hidden by an assumption.
- Variance/corridor variance terms are non-negative, corridor branches are
  disjoint, long/short payoffs are exact negatives, and settlement is
  collateral-conserving.
- Basis/calendar spread changes are linear identities; margin predicates are
  cross-multiplied; roll references update exactly; two-step same-notional
  rolls telescope.
- Parametric insurance triggers and tier predicates are disjoint and complete;
  payouts are collateral-capped; USD-indexed ceil witnesses cover solvent
  claims; note waterfalls, renewal branches, and aggregate limits conserve
  funded BTC.

## Not Proven Here

- The discrete logarithm assumption.
- BIP340 implementation correctness.
- Collision resistance or domain separation of real hash functions.
- Bitcoin transaction serialization, sighash, fee policy, mempool policy, or
  timelock ordering.
- Production Lightning channel state machines, real HTLC preimage security,
  routing policy, liquidity, force-close behavior, watchtowers, or
  point-lock/PTLC deployment.
- Economic claims about stablecoins, collateral, liquidity, oracle markets,
  borrower behavior, lender solvency, real execution price, slippage beyond the
  modeled recovery ratio, option fair value, implied volatility, assignment
  conventions, or legal enforceability.
- Market microstructure, fair pricing, implied volatility surfaces, forward
  curve construction, funding-rate economics, oracle quality, event-definition
  ambiguity, legal/regulatory classification, hedging liquidity, transaction
  confirmation, or production wallet/key-management behavior for the product
  models.

## Commands

Mathematical integer model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/cdlc_integer_proofs.gpr --level=4 --prover=cvc5,z3,altergo --report=all
```

Finite modular residue model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/cdlc_residue_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Ada built-in modular type model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Lightning cDLC model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/lightning_cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

BTC-collateralized loan model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/btc_collateral_loan_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Covered-call and BTC yield-note model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/covered_call_yield_note_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Synthetic dollar and stable exposure model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/synthetic_dollar_stable_exposure_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Perpetuals and rolling forwards model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/perpetuals_rolling_forwards_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

BTC loan lifecycle model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/btc_loan_lifecycle_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Collars, protective puts, and principal-protected notes model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/collars_protective_notes_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Barrier options model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/barrier_options_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Autocallables and callable yield notes model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/autocallables_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Accumulators and decumulators model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/accumulators_decumulators_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

CPPI and portfolio-insurance vault model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/cppi_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Variance and corridor variance swap model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/variance_corridor_swaps_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Basis, calendar-spread, and term-structure roll model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/basis_calendar_rolls_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

Parametric insurance and event-linked note model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/parametric_insurance_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

All accepted targets end with `0 errors, 0 warnings and 0 pragma Assume
statements`, with no unproved checks.
