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
- `cppi_algebra`: proves the integer allocation and state-transition
  identities for CPPI and portfolio-insurance vaults: cushion bounds, risky and
  safe exposure bounds, allocation conservation, zero risky exposure at or
  below the floor, cross-multiplied account update, floor preservation under
  up moves or explicit bounded down-move assumptions, floor-safe/breached
  branch coverage, defensive zero-risk state, next cushion non-negativity, BTC
  funding split conservation, two-step collateral conservation, and an explicit
  finite counterexample documenting gap risk.

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
- CPPI cushion is non-negative and bounded by account value.
- Risky exposure and safe exposure are non-negative, bounded by
  `A_i * M_den`, and conserve scaled account value.
- At or below the floor, risky exposure is zero and safe exposure equals
  scaled account value.
- The next-account numerator equals the cross-multiplied CPPI update.
- Up moves preserve the floor when the starting account is at or above floor.
- Down moves preserve the floor only under the explicit bounded-loss
  inequality.
- Floor-safe and floor-breached branches are disjoint and exhaustive.
- Defensive branch sets risky exposure to zero, while floor-safe continuation
  has a non-negative next cushion numerator.
- BTC funding split conserves posted collateral, and two fee-free continuation
  steps preserve posted collateral.
- A concrete gap-risk counterexample proves that discrete CPPI does not imply
  unconditional floor preservation.

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
  conventions, continuous-time floor guarantees, slippage-free rebalancing,
  safe-asset credit quality, investor suitability, or legal enforceability.

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

CPPI and portfolio-insurance vault model:

```sh
PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH \
gnatprove -P spark/cppi_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

All accepted targets end with `0 errors, 0 warnings and 0 pragma Assume
statements`, with no unproved checks.
