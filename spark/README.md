# cDLC SPARK Proofs

This directory contains SPARK models of the algebra used in the cDLC technical
note and in the cDLC sections of the complete NITI whitepaper.

There are four models:

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
- `lightning_cdlc_algebra`: proves the Lightning companion identities over
  Ada's built-in `type mod 97`: HTLC compatibility under an ideal hash model,
  PTLC point locks, PTLC route tweaks, child activation, timeout/refund
  abstraction, and channel balance conservation.

## Proven

- Oracle attestation scalar maps to the public attestation point.
- A bridge adaptor signature verifies before completion.
- Adding the oracle scalar completes the signature.
- A completed signature reveals the oracle scalar by subtraction.
- A different oracle scalar does not complete the same bridge signature.
- In the Lightning model, an oracle scalar can settle a hash-locked HTLC when
  the oracle precommits to its payment hash.
- In the Lightning model, the same oracle scalar can settle a point-locked PTLC.
- PTLC hop tweaks preserve route atomicity.
- Correct Lightning witnesses move channel balances while wrong witnesses leave
  the abstract channel state unchanged.

## Not Proven Here

- The discrete logarithm assumption.
- BIP340 implementation correctness.
- Collision resistance or domain separation of real hash functions.
- Bitcoin transaction serialization, sighash, fee policy, mempool policy, or
  timelock ordering.
- Economic claims about stablecoins, collateral, liquidity, or oracle markets.

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

All accepted targets end with `0 errors, 0 warnings and 0 pragma Assume
statements`, with no unproved checks.
