# NITI

NITI is a research and implementation workspace for composable Discreet Log
Contracts, or cDLCs: finite graphs of Bitcoin-native DLC transactions where an
oracle attestation scalar from one contract can complete adaptor signatures that
activate the next contract.

The project is intentionally open-source and research-first. The current code is
not production software and must not be used with mainnet funds.

## Whitepaper

The cDLC whitepaper is the primary document of this repository. It defines the
Bitcoin cDLC construction first and includes Lightning as a later execution
extension:

- [`WHITEPAPER.md`](WHITEPAPER.md) - primary cDLC whitepaper.
- [`LEGACY-WHITEPAPER.md`](LEGACY-WHITEPAPER.md) - legacy NITI draft kept for
  historical reference.
- [`docs/legacy-whitepaper/index.html`](docs/legacy-whitepaper/index.html) -
  legacy HTML version with images.

The shorter cDLC document in [`research/cdlc-technical-note.md`](research/cdlc-technical-note.md)
is the source technical note for the adaptor-signature construction and formal
proof work.

## What Exists Today

- The primary cDLC whitepaper in [`WHITEPAPER.md`](WHITEPAPER.md).
- The legacy NITI draft in [`LEGACY-WHITEPAPER.md`](LEGACY-WHITEPAPER.md).
- A cDLC source technical note in [`research/cdlc-technical-note.md`](research/cdlc-technical-note.md).
- SPARK/Ada proof models for the core algebra in [`spark/`](spark/).
- A testnet harness in [`testnet/`](testnet/) that builds a Taproot key-path
  spend whose BIP340 witness is completed by a DLC-style oracle attestation
  scalar.
- A Lightning hold-invoice harness in [`testnet/LIGHTNING.md`](testnet/LIGHTNING.md)
  that prepares an LND test where the oracle attestation scalar is the HTLC
  preimage.
- A static research site in [`site/`](site/) with interactive protocol,
  Lightning, proof, and testnet explainers.
- An Ada validator for finite cDLC graph manifests.
- A TypeScript CLI for testnet wallet generation, oracle preparation,
  attestation, adaptor spend preparation, transaction completion, Lightning
  hold-invoice testing, RPC scanning, and opt-in broadcast.

## Core Idea

For a Schnorr oracle with public key `V = vG` and event nonce `R_o = r_oG`, an
outcome `x` has:

```text
e_x = H(R_o || V || x)
s_x = r_o + e_x v mod n
S_x = s_xG = R_o + e_xV
```

Before attestation, everyone can compute `S_x`, but not `s_x`. A cDLC uses
`S_x` as the adaptor point for a bridge transaction. When the oracle later
publishes `s_x`, the bridge signatures can be completed:

```text
s_a = ŝ_a + s_x mod n
```

That bridge can fund the next DLC in a finite pre-negotiated graph. The
whitepaper also describes how the same activation scalar can be used later as a
Lightning channel witness.

## Repository Layout

```text
docs/
  legacy-whitepaper/       Legacy HTML whitepaper and assets
  ARCHITECTURE.md          Implementation architecture
  PROTOCOL.md              cDLC protocol summary
  ROADMAP.md               Engineering roadmap
  SECURITY.md              Threat model and safety boundaries
research/
  cdlc-technical-note.md
  cdlc-algebra-check.ts
spark/
  src/                     SPARK/Ada proof models
  README.md                Proof commands and scope
testnet/
  ada/                     Ada manifest validator
  src/                     TypeScript testnet harness
  README.md                Operational testnet flow
site/
  index.html               Static research site
  src/                     TypeScript interactions
  styles.css               Site visual system
WHITEPAPER.md              Primary cDLC whitepaper with Lightning extension
LEGACY-WHITEPAPER.md       Legacy NITI draft
```

## Quick Start

Install Node dependencies:

```sh
npm install
```

Build and test the TypeScript harness:

```sh
npm run build
npm run test:offline
```

Build and serve the site locally:

```sh
npm run site:build
npm run site:serve
```

Build the Ada validator:

```sh
npm run ada:build
```

Generate and validate a sample cDLC manifest:

```sh
npm run testnet -- manifest:sample --network testnet4 --out testnet/examples/sample-manifest.json
npm run testnet -- manifest:validate --file testnet/examples/sample-manifest.json
```

Expected offline test result:

```json
{
  "oracleSignatureVerifies": true,
  "adaptorVerifies": true,
  "completedSignatureVerifies": true
}
```

## Testnet Harness

See [`testnet/README.md`](testnet/README.md).

The harness supports:

- testnet/signet/regtest-style Taproot addresses;
- oracle outcome preparation and attestation;
- Taproot key-path adaptor spend generation;
- transaction completion after attestation;
- Lightning HTLC hold-invoice preparation and settlement hooks for LND REST;
- Bitcoin Core RPC scan and broadcast.

Broadcast is deliberately blocked unless the CLI receives `--allow-broadcast`.

## Formal Proofs

See [`spark/README.md`](spark/README.md).

Four proof targets currently pass with no unproved checks and no
`pragma Assume` statements:

- mathematical integer model with `SPARK.Big_Integers`;
- finite modular residue model over `Z/97Z` with explicit modular reduction.
- Ada built-in modular type model over `type mod 97`.
- Lightning cDLC model over `type mod 97`.

The proof covers the core cDLC algebra: oracle attestation, adaptor
verification, signature completion, extraction of the hidden scalar, and
rejection of a wrong hidden scalar. The Lightning proof target covers the
finite model of HTLC/PTLC redemption, oracle witness compatibility, routed HTLC
hash reuse, routed PTLC point tweaks, child activation, timeout/refund behavior,
and abstract channel-balance conservation.

The Lightning model does not prove a production Lightning implementation,
real hash security, route liquidity, force-close behavior, watchtower behavior,
or wallet integration.

## Security Boundary

NITI currently proves and tests the activation primitive. It does not yet prove
or implement a complete production DLC stack.

Not yet covered:

- full bilateral DLC negotiation;
- complete parent CET -> bridge -> child funding graphs;
- production Lightning channel integration;
- mainnet-safe fee bumping and mempool policy;
- production key management;
- multi-oracle threshold attestations;
- economic safety of synthetic assets or stable exposure;
- regulatory suitability.

## Status

Research prototype. Testnet only.

## License

ISC. See [`LICENSE`](LICENSE).
