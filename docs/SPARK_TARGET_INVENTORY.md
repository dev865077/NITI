# SPARK Target Inventory

This inventory maps the SPARK proof targets in the repository to their package
files, generated object directories, proof commands, and claim families.

It is an audit map, not a broader proof claim. The targets model finite
algebraic or accounting properties. They do not prove secp256k1, BIP340,
SHA-256, Bitcoin transaction serialization, mempool behavior, wallet safety,
oracle operations, market liquidity, legal enforceability, or economic
profitability.

## Toolchain

The checked commands use GNATprove with CVC5, Z3, and Alt-Ergo. When the
bundled Linux toolchain is installed in the standard location, use:

```sh
export PATH=/opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin:/opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin:/opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin:$PATH
```

The mathematical integer target is expected to run without a per-proof timeout.
The finite modular and product-accounting targets use `--timeout=20`.

## Inventory

| Target | Package files | Object dir | Domain | Expected GNATprove command | Claim family |
| --- | --- | --- | --- | --- | --- |
| `spark/cdlc_integer_proofs.gpr` | `spark/src/cdlc_integer_algebra.ads`, `spark/src/cdlc_integer_algebra.adb` | `spark/obj_integer` | Core cDLC adaptor algebra over mathematical integers. | `gnatprove -P spark/cdlc_integer_proofs.gpr --level=4 --prover=cvc5,z3,altergo --report=all` | Oracle scalar, adaptor verification, completion, extraction, and wrong-scalar rejection for the [primary cDLC construction](../WHITEPAPER.md) and [technical note](../research/cdlc-technical-note.md). |
| `spark/cdlc_residue_proofs.gpr` | `spark/src/cdlc_residue_algebra.ads`, `spark/src/cdlc_residue_algebra.adb` | `spark/obj_residue` | Core cDLC adaptor algebra over explicit residues modulo 97. | `gnatprove -P spark/cdlc_residue_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Finite modular witness for the same bridge/adaptor claims traced in [SPARK-to-Bitcoin Trace](SPARK_TO_BITCOIN_TRACE.md). |
| `spark/cdlc_proofs.gpr` | `spark/src/cdlc_algebra.ads`, `spark/src/cdlc_algebra.adb` | `spark/obj` | Core cDLC adaptor algebra using Ada built-in modular arithmetic. | `gnatprove -P spark/cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Built-in modular proof of the parent oracle scalar completing the selected bridge signature and rejecting non-corresponding outcome scalars. |
| `spark/lazy_cdlc_window_proofs.gpr` | `spark/src/lazy_cdlc_window_algebra.ads`, `spark/src/lazy_cdlc_window_algebra.adb` | `spark/obj_lazy_cdlc_window` | Lazy cDLC finite-window preparation model. | `gnatprove -P spark/lazy_cdlc_window_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Terminal outcomes, live child mapping, in-window preparation requirements, out-of-window non-requirements, active-node containment, and the minimum `K >= 2` convention for one-step continuation in [Lazy Graph Preparation for Cascading DLCs](../research/lazy-cdlcs-v0.2.md). |
| `spark/lightning_cdlc_proofs.gpr` | `spark/src/lightning_cdlc_algebra.ads`, `spark/src/lightning_cdlc_algebra.adb` | `spark/obj_lightning` | Lightning HTLC/PTLC witness model for cDLC activation. | `gnatprove -P spark/lightning_cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | HTLC hash-witness settlement, PTLC point-lock settlement, route tweaks, child activation, timeout/refund abstraction, and channel balance conservation described in the [Lightning extension](../WHITEPAPER.md). |
| `spark/btc_collateral_loan_proofs.gpr` | `spark/src/btc_collateral_loan_algebra.ads`, `spark/src/btc_collateral_loan_algebra.adb` | `spark/obj_btc_loan` | BTC-collateralized loan algebra over integer units. | `gnatprove -P spark/btc_collateral_loan_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Cross-multiplied LTV checks, debt accrual, terminal waterfall, partial liquidation, and target-LTV restoration for [BTC-backed loans](../research/btc-backed-loan-lifecycle-math.md). |
| `spark/covered_call_yield_note_proofs.gpr` | `spark/src/covered_call_yield_note_algebra.ads`, `spark/src/covered_call_yield_note_algebra.adb` | `spark/obj_covered_call_yield_note` | BTC covered calls and BTC yield notes. | `gnatprove -P spark/covered_call_yield_note_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | OTM/ATM/ITM branch partitioning, capped delivery, quotient-bounded ITM claims, and settlement conservation for [covered calls and yield notes](../research/covered-call-yield-note-math.md). |
| `spark/synthetic_dollar_stable_exposure_proofs.gpr` | `spark/src/synthetic_dollar_stable_exposure_algebra.ads`, `spark/src/synthetic_dollar_stable_exposure_algebra.adb` | `spark/obj_synthetic_dollar_stable_exposure` | BTC-funded synthetic dollar and stable exposure accounting. | `gnatprove -P spark/synthetic_dollar_stable_exposure_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Ceil-witness stable claims, solvent/insolvent branch partitioning, reserve-preserving rolls, de-risk transitions, liquidation warning predicates, and BTC conservation for [synthetic dollar exposure](../research/synthetic-dollar-stable-exposure-math.md). |
| `spark/perpetuals_rolling_forwards_proofs.gpr` | `spark/src/perpetuals_rolling_forwards_algebra.ads`, `spark/src/perpetuals_rolling_forwards_algebra.adb` | `spark/obj_perpetuals_rolling_forwards` | Perpetuals and rolling forwards. | `gnatprove -P spark/perpetuals_rolling_forwards_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Zero-sum scaled payoffs, funding accrual, collateral-capped settlement, roll reference updates, and two-period telescoping for [perpetuals and rolling forwards](../research/perpetuals-rolling-forwards-math.md). |
| `spark/btc_loan_lifecycle_proofs.gpr` | `spark/src/btc_loan_lifecycle_algebra.ads`, `spark/src/btc_loan_lifecycle_algebra.adb` | `spark/obj_btc_loan_lifecycle` | Extended BTC-backed loan lifecycle. | `gnatprove -P spark/btc_loan_lifecycle_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Accrual, repayment, refinance, margin-call predicates, partial liquidation, liquidation caps, terminal waterfall, and branch conservation for [BTC-backed loans](../research/btc-backed-loan-lifecycle-math.md). |
| `spark/collars_protective_notes_proofs.gpr` | `spark/src/collars_protective_notes_algebra.ads`, `spark/src/collars_protective_notes_algebra.adb` | `spark/obj_collars_protective_notes` | Collars, protective puts, and principal-protected BTC notes. | `gnatprove -P spark/collars_protective_notes_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Branch partitioning, put/call boundedness, floor and ceiling witnesses, principal protection, and BTC conservation for [collars and protective notes](../research/collars-protective-puts-principal-protected-notes-math.md). |
| `spark/barrier_options_proofs.gpr` | `spark/src/barrier_options_algebra.ads`, `spark/src/barrier_options_algebra.adb` | `spark/obj_barrier_options` | Barrier options and knock continuations. | `gnatprove -P spark/barrier_options_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Barrier branch partitioning, active/inactive selection, bounded option claims, refund/expiry behavior, and continuation conservation for [barrier options](../research/barrier-options-knock-continuations-math.md). |
| `spark/autocallables_proofs.gpr` | `spark/src/autocallables_algebra.ads`, `spark/src/autocallables_algebra.adb` | `spark/obj_autocallables` | Autocallables and callable yield notes. | `gnatprove -P spark/autocallables_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Call/no-call partitioning, coupon accrual, principal redemption, downside participation, knock-in effects, and conservation for [autocallables](../research/autocallables-callable-yield-notes-math.md). |
| `spark/accumulators_decumulators_proofs.gpr` | `spark/src/accumulators_decumulators_algebra.ads`, `spark/src/accumulators_decumulators_algebra.adb` | `spark/obj_accumulators_decumulators` | Accumulators and decumulators. | `gnatprove -P spark/accumulators_decumulators_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Per-period purchase/sale bounds, cumulative notional caps, monotone filled quantity, knock-out behavior, and settlement conservation for [accumulators and decumulators](../research/accumulators-decumulators-math.md). |
| `spark/cppi_proofs.gpr` | `spark/src/cppi_algebra.ads`, `spark/src/cppi_algebra.adb` | `spark/obj_cppi` | CPPI and portfolio-insurance vaults. | `gnatprove -P spark/cppi_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Floor, cushion, exposure, multiplier bounds, rebalancing conservation, no-gap floor preservation, and explicit gap-risk counterexample for [CPPI](../research/cppi-portfolio-insurance-math.md). |
| `spark/variance_corridor_swaps_proofs.gpr` | `spark/src/variance_corridor_swaps_algebra.ads`, `spark/src/variance_corridor_swaps_algebra.adb` | `spark/obj_variance_corridor_swaps` | Variance swaps and corridor variance swaps. | `gnatprove -P spark/variance_corridor_swaps_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Non-negative variance terms, corridor include/exclude partitioning, zero-sum payoff, strike equality, and collateral-conserving settlement for [variance and corridor variance swaps](../research/volatility-variance-corridor-swaps-math.md). |
| `spark/basis_calendar_rolls_proofs.gpr` | `spark/src/basis_calendar_rolls_algebra.ads`, `spark/src/basis_calendar_rolls_algebra.adb` | `spark/obj_basis_calendar_rolls` | Basis trades, calendar spreads, and term-structure rolls. | `gnatprove -P spark/basis_calendar_rolls_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Signed spread linearity, zero-sum payoffs, floor-style BTC transfer witnesses, margin predicates, reduced-notional rolls, and telescoping for [basis and calendar rolls](../research/basis-calendar-term-structure-rolls-math.md). |
| `spark/parametric_insurance_proofs.gpr` | `spark/src/parametric_insurance_algebra.ads`, `spark/src/parametric_insurance_algebra.adb` | `spark/obj_parametric_insurance` | Parametric insurance and event-linked notes. | `gnatprove -P spark/parametric_insurance_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all` | Binary and tiered triggers, linear attachment/exhaustion, USD-indexed ceil witnesses, note waterfalls, renewal residuals, and aggregate limits for [parametric insurance](../research/parametric-insurance-event-linked-notes-math.md). |

## Source Checks

The inventory can be cross-checked mechanically:

```sh
rg --files spark -g "*.gpr" | sort
rg -n "Source_Files|Object_Dir" spark/*.gpr -C 2
rg --files spark/src -g "*.ads" -g "*.adb" | sort
```

The public v0.1 gate runs the core cDLC and Lightning targets. The
product-accounting targets are available for extended proof sweeps with the
commands above.
