# Architecture

NITI is split into three layers.

## 1. Research Layer

The research layer contains the primary cDLC whitepaper, the legacy NITI draft,
the Lazy cDLC research note, and the focused cDLC technical note:

- [`WHITEPAPER.md`](../WHITEPAPER.md)
- [`LEGACY-WHITEPAPER.md`](../LEGACY-WHITEPAPER.md)
- [`research/lazy-cdlcs-v0.2.md`](../research/lazy-cdlcs-v0.2.md)
- [`research/cdlc-technical-note.md`](../research/cdlc-technical-note.md)
- [`research/cdlc-algebra-check.ts`](../research/cdlc-algebra-check.ts)

It defines the core equation:

```text
S_x = R_o + H(R_o || V || x)V
s_xG = S_x
s_a = ŝ_a + s_x
```

The base cDLC edge is a Bitcoin bridge transaction. The whitepaper later
describes how the same scalar can witness a Lightning-style channel condition
without changing the core adaptor algebra.

The Lazy research line adds the scaling discipline:

```text
EagerNodes(D) = 1 + b + b^2 + ... + b^D
LazyNodes(K) = 1 + b + b^2 + ... + b^(K-1)
```

The claim is that live retained state can be bounded by a preparation window
because activation is local to prepared edges. See
[`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md).

## 2. Proof Layer

The proof layer is in [`spark/`](../spark/). It contains SPARK/Ada models for
the algebra used by the protocol.

Accepted proof targets:

- `cdlc_integer_proofs.gpr`
- `cdlc_residue_proofs.gpr`
- `cdlc_proofs.gpr`
- `lightning_cdlc_proofs.gpr`
- `lazy_cdlc_window_proofs.gpr`
- `lazy_cdlc_edge_proofs.gpr`
- `lazy_cdlc_slide_proofs.gpr`
- `lazy_cdlc_tree_bound_proofs.gpr`
- `lazy_cdlc_recombining_proofs.gpr`
- `lazy_cdlc_compression_proofs.gpr`
- `lazy_cdlc_liveness_proofs.gpr`
- `lazy_cdlc_loan_rollover_proofs.gpr`

The built-in Ada `type mod 97` model now includes explicit ghost lemmas for the
modular sum rotation and cancellation properties that GNATprove does not infer
automatically in the relevant bit-vector VCs.

## 3. Testnet Layer

The testnet layer is in [`testnet/`](../testnet/).

Ada is used for finite cDLC graph validation:

- node limits;
- dust floors;
- edge references;
- bridge value constraints;
- timelock ordering;
- acyclicity.

TypeScript is used where the Bitcoin ecosystem has mature libraries:

- secp256k1/BIP340 math;
- Taproot address and sighash construction;
- raw transaction creation;
- Bitcoin Core JSON-RPC.

## Current End-To-End Primitive

The current end-to-end primitive builds a Taproot key-path activation path and
makes its signatures conditional on oracle attestation scalars.

```text
parent funding
  -> parent CET
  -> oracle publishes s_x
  -> bridge completed with s_x
  -> child funding output
```

The committed evidence includes deterministic/regtest artifacts, public
signet/testnet Lazy runs, and a dust-sized Bitcoin mainnet Lazy run. The
Lightning channel mode is specified and modeled, but production channel support
is outside the current harness boundary.
