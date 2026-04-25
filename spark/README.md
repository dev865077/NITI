# cDLC SPARK Proofs

This directory contains SPARK models of the core adaptor algebra used in the
cDLC technical note and in the primary cDLC whitepaper, plus finite financial
product models that prove cDLC settlement accounting over integer units.

There are seven models:

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
- `variance_corridor_swaps_algebra`: proves the integer rational identities
  for realized variance and corridor variance swaps: non-negative return
  terms, positive denominators, monotone variance accumulation, corridor
  include/exclude branch partitioning, excluded observations leaving value
  unchanged, included observations matching full variance, corridor terms
  bounded by full one-step variance, zero-sum payoff algebra, strike equality
  zero payoff, and BTC settlement rounding/conservation bounds.

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
- Realized variance return terms are non-negative and use positive
  denominators.
- Adding one realized variance observation weakly increases the accumulated
  numerator while preserving a positive denominator.
- Corridor inclusion and exclusion branches cover all observations and do not
  overlap.
- Excluded corridor observations leave the accumulated variance unchanged.
- Included corridor observations match the corresponding full-variance term.
- A corridor term is bounded by the full one-step variance term when both use
  the same denominator.
- Long and short variance/corridor payoff numerators are exact negatives.
- Strike equality gives zero payoff.
- BTC-denominated settlement claims satisfy ceil-style coverage and positive
  rounding bounds.
- Long-win, short-win, and zero-payoff settlement branches conserve total BTC
  and cap losses by posted collateral.

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
- Equivalence between simple-return variance and log-return variance,
  square-root volatility approximation, variance fair value, realized-vol fair
  value, volatility surface calibration, oracle observation quality,
  observation manipulation, market liquidity, hedging error, or legal
  enforceability for variance products.

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

Variance and corridor swap model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/variance_corridor_swaps_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

All accepted targets end with `0 errors, 0 warnings and 0 pragma Assume
statements`, with no unproved checks.
