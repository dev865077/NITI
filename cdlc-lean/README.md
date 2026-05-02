# cDLC Lean Protocol Model

This Lake workspace contains the Lean 4 formal model for the NITI cDLC
protocol layer.

The model focuses on NITI-owned protocol logic:

- contract grids;
- bridge edges;
- retained edge packages;
- adaptor sets as protocol interfaces;
- timeouts and fallback paths;
- materialized preparation windows;
- end-to-end child activation under the matching outcome.

It does not attempt to reprove secp256k1, Schnorr, adaptor signature
cryptography, Bitcoin transaction serialization, mempool behavior, wallet
behavior, fee policy, network liveness, legal enforceability, or economic
solvency.

## Verification

The workspace is pinned to Lean 4.5.0:

```sh
cat lean-toolchain
```

Build the full proof suite:

```sh
~/.elan/bin/lake build
```

Build the top-level claim module:

```sh
~/.elan/bin/lake build SecurityClaims
```

Check for proof holes or unchecked declarations:

```sh
rg -n '\bsorry\b|\badmit\b|\baxiom\b|\bunsafe\b' cdlc-lean -g '*.lean'
```

The proof-hole scan should return no matches.

## Proof Boundary

The Lean layer proves protocol invariants over an abstract protocol model.
Cryptographic and external-system properties are represented as named
interfaces or assumptions.

Proven inside the Lean protocol model:

- a live bridge edge in a materialized window has its child materialized;
- a live bridge edge in a materialized window has retained completion state;
- a retained package binds to the bridge edge it is meant to complete;
- a verified adaptor set completes with its matching secret;
- wrong outcomes and wrong secrets do not activate the modeled bridge path;
- missing retained packages, unmaterialized children, and expired deadlines do
  not activate the modeled bridge path;
- timeout and missing-preparation fallback paths are disjoint from successful
  activation;
- a materialized window plus synchronized retainer plus verified adaptor set
  funds the child bound to the live edge under the matching outcome.

Modeled or assumed at the boundary:

- adaptor set soundness;
- oracle uniqueness and attestation behavior;
- generator injectivity for algebraic point/scalar reasoning;
- correspondence between Lean predicates and concrete implementation artifacts;
- correspondence between implementation artifacts and public network evidence.

Outside this Lean model:

- Bitcoin Core consensus implementation;
- transaction serialization and sighash correctness;
- mempool relay, fees, confirmation timing, and reorg behavior;
- production wallet storage, backup, and signing policy;
- production bilateral transport and online availability;
- economic, legal, or market claims.

## Module Map

| Module | Purpose |
| --- | --- |
| [`Cdlc/ProofBoundary.lean`](Cdlc/ProofBoundary.lean) | Names the proof surfaces and separates protocol claims from external assumptions. |
| [`Cdlc/Algebra.lean`](Cdlc/Algebra.lean) | Abstract scalar/point algebra and generator injectivity. |
| [`Cdlc/Schnorr.lean`](Cdlc/Schnorr.lean) | Minimal algebraic Schnorr signature surface. |
| [`Cdlc/Adaptor.lean`](Cdlc/Adaptor.lean) | Algebraic adaptor signature identities used by lower-level bridge proofs. |
| [`Cdlc/Oracle.lean`](Cdlc/Oracle.lean) | Oracle event surface and point correspondence. |
| [`Cdlc/DlcContract.lean`](Cdlc/DlcContract.lean) | Minimal DLC contract record. |
| [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | Core protocol predicates for state, materialization, activation, timeout, fallback, and child funding. |
| [`Cdlc/ContractGrid.lean`](Cdlc/ContractGrid.lean) | Finite contract grid and node/edge membership invariants. |
| [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | Retained edge packages and retainer/state synchronization. |
| [`Cdlc/Window.lean`](Cdlc/Window.lean) | Materialized window over a contract grid. |
| [`Cdlc/ProtocolEndToEnd.lean`](Cdlc/ProtocolEndToEnd.lean) | End-to-end activation, rejection, and fallback theorems over the protocol model. |
| [`Cdlc/Correspondence.lean`](Cdlc/Correspondence.lean) | Traceability entries to adjacent SPARK, implementation, and evidence surfaces. |
| [`Cdlc/VerificationGate.lean`](Cdlc/VerificationGate.lean) | Reproducible verification commands and proof inventory entries. |
| [`Cdlc/ProtocolInventory.lean`](Cdlc/ProtocolInventory.lean) | Stable theorem inventory for the main protocol claims. |
| [`SecurityClaims.lean`](SecurityClaims.lean) | Top-level theorem aggregation. |

## Main Protocol Claim

The top-level protocol theorem is:

```lean
CdlcSecurityClaims.complete_niti_protocol_claim
```

Informally:

If the active preparation window is materialized, an edge is live, the retainer
is synchronized with protocol state, the retained package binds to the edge, the
adaptor set is verified, the parent is active, and the deadline is still open,
then the matching outcome funds the child contract bound to that edge.

The corresponding negative claims reject wrong outcomes, wrong secrets, missing
packages, unmaterialized children, and expired deadlines.
