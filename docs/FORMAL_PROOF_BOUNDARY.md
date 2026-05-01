# Formal Proof Boundary

NITI uses SPARK/Ada to check finite algebraic models of cDLC activation. The
proofs are evidence for the modeled equations and state predicates. They are
not a proof of Bitcoin, a proof of market behavior, or a safety claim for user
funds.

## Quote-Ready Boundary

The SPARK/Ada targets prove that, inside the modeled scalar arithmetic, the
oracle attestation scalar for a selected outcome completes the corresponding
prepared adaptor signature, and non-corresponding modeled scalars do not
complete that signature. The proofs do not prove secp256k1 implementation
correctness, BIP340 implementation correctness, SHA-256 security, Bitcoin
transaction serialization, sighash implementation, mempool relay, oracle truth,
wallet state retention, Lightning production behavior, or economic solvency.

## What Is Proved

The core cDLC targets prove the following modeled identities:

```text
S_x = s_x G
s_hat G = R* - S_x + eP
s = s_hat + s_x
sG = R* + eP
s - s_hat = s_x
```

They also prove that a non-corresponding modeled oracle scalar does not satisfy
the same adaptor completion predicate.

The Lazy cDLC targets prove finite-window predicates: prepared in-window edges
can activate, unrelated future materialization is not required for an already
prepared edge, retained state is bounded by the modeled window, recombination
and per-node compression do not increase retained state, and missing
preparation or timing gates select fallback.

The Lightning target proves finite HTLC/PTLC companion predicates under the
model's assumptions: correct witnesses settle, wrong witnesses do not settle,
route tweaks preserve point-lock correctness, child activation follows the
correct witness, timeout/refund predicates remain disjoint from correct
redemption, and channel capacity is conserved in the abstract model.

The financial-product targets prove accounting identities over integer units:
branch partitioning, capped settlement, collateral conservation, waterfall
allocation, liquidation predicates, and bounded claim formulas for the modeled
products.

## What Is Demonstrated

The deterministic TypeScript harness demonstrates that the same scalar
relation is wired into a Taproot-style parent-CET-to-bridge-to-child
transaction path. The harness checks adaptor verification, scalar completion,
wrong-scalar rejection, child funding output creation, prepared child spends,
and timeout/refund behavior under fixed fixtures.

Regtest and public-network artifacts demonstrate selected executions of those
transaction paths. They are execution evidence for specific runs, not a proof
that future transactions will relay or confirm under all mempool conditions.

## Explicit Exclusions

The formal proof boundary excludes:

- discrete-log hardness in secp256k1;
- correctness of any secp256k1 implementation;
- correctness of any BIP340 implementation;
- SHA-256, tagged-hash, collision-resistance, or second-preimage assumptions;
- Bitcoin transaction serialization, sighash, witness, or script
  implementation correctness;
- Bitcoin Core policy, mempool relay, package relay, pinning resistance,
  reorg behavior, confirmation probability, or fee-bump strategy;
- oracle truth, source quality, key custody, liveness, nonce operations, or
  non-equivocation outside the modeled scalar relation;
- bilateral transport, user interface, production backups, watchtower
  operation, or wallet state retention;
- production Lightning channel state machines, route discovery, channel
  liquidity, force-close behavior, watchtower behavior, or deployed PTLC
  support;
- product liquidity, solvency, fair pricing, gap-risk coverage, liquidation
  execution, legal enforceability, regulatory treatment, or user-fund safety.

## Evidence Labels

Use these labels when describing NITI evidence:

| Label | Meaning |
| --- | --- |
| Proved | A SPARK/Ada target checks the modeled equation, predicate, or accounting invariant. |
| Demonstrated | A deterministic harness, regtest artifact, or public-network artifact shows a concrete execution. |
| Modeled | A bounded simulation checks a specified condition under stated inputs. |
| Assumed | The claim depends on an external cryptographic, operational, network, or market assumption. |
| Out of scope | NITI does not make the claim. |

The safe public statement is:

```text
NITI proves modeled cDLC scalar/adaptor identities and demonstrates selected
Bitcoin transaction executions under documented assumptions. It does not prove
production wallet safety, oracle honesty, mempool reliability, Lightning
deployment safety, or economic solvency.
```

## Reproduction

The target inventory lists the proof commands, source packages, object
directories, and claim families:

```text
docs/SPARK_TARGET_INVENTORY.md
```

The formal-to-Bitcoin trace maps the core proof claims to concrete harness
objects and execution artifacts:

```text
docs/SPARK_TO_BITCOIN_TRACE.md
```

The v0.1 local verifier runs the deterministic harness, Ada manifest validator,
proof-shortcut scan, and configured SPARK proof targets:

```sh
npm run v0.1:verify
```
