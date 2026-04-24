# Architecture

NITI is split into three layers.

## 1. Research Layer

The research layer contains the primary cDLC whitepaper, the legacy NITI draft,
and the focused cDLC technical note:

- [`WHITEPAPER.md`](../WHITEPAPER.md)
- [`LEGACY-WHITEPAPER.md`](../LEGACY-WHITEPAPER.md)
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

## 2. Proof Layer

The proof layer is in [`spark/`](../spark/). It contains SPARK/Ada models for
the algebra used by the protocol.

Accepted proof targets:

- `cdlc_integer_proofs.gpr`
- `cdlc_residue_proofs.gpr`
- `cdlc_proofs.gpr`

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

The current end-to-end test builds a Taproot key-path spend and makes its
signature conditional on an oracle attestation scalar.

```text
funded Taproot UTXO
  -> unsigned spend
  -> adaptor signature under S_x
  -> oracle publishes s_x
  -> completed Schnorr witness
  -> raw transaction ready for broadcast
```

This is the smallest Bitcoin-facing validation of the cDLC activation primitive.
The Lightning channel mode is specified in the primary whitepaper but is not yet
implemented in the testnet harness.
