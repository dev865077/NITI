# v0.1 Limitations For Technical Diligence

This document is written for technical and commercial diligence. It is not
legal advice, regulatory advice, an offer document, or a production risk
disclosure.

The central v0.1 result is real but bounded:

> NITI demonstrates a public signet cDLC activation path in which a parent DLC
> oracle scalar completes the parent settlement and the bridge signature that
> funds a prepared child path. A non-corresponding oracle scalar is rejected.

Everything below defines the boundary around that result.

## Summary Boundary

| Category | v0.1 status |
| --- | --- |
| Formal adaptor algebra | Proved in SPARK/Ada finite models for the modeled equations. |
| Bitcoin execution evidence | Demonstrated through deterministic harnesses, regtest evidence, and one public signet activation bundle. |
| Public network claim | Public signet evidence exists for one parent -> bridge -> child funding path. |
| Bilateral protocol | Not complete. The current evidence is not a production two-party DLC negotiation protocol. |
| Oracle layer | Not production. The scalar relation is exercised, but audit history, price-source policy, and equivocation monitoring remain open gates. |
| Economic stress | Not complete. Financial payoff models exist, but historical stress replay and solvency reporting remain open Layer 5 gates. |
| Mainnet readiness | Not claimed. Do not use with mainnet funds. |

## What v0.1 Proves

The SPARK/Ada proof targets prove modeled algebraic properties:

- the oracle scalar maps to the advertised attestation point;
- a bridge adaptor signature verifies before scalar publication;
- adding the correct oracle scalar completes the signature;
- subtracting the adaptor scalar from the completed scalar recovers the oracle
  scalar;
- a wrong scalar does not complete the same modeled signature condition;
- the Lightning companion model checks HTLC/PTLC-style witness transitions in a
  finite model.

Evidence:

- [`spark/`](../spark/)
- [`docs/SPARK_TO_BITCOIN_TRACE.md`](SPARK_TO_BITCOIN_TRACE.md)
- [`docs/V0_1_CI.md`](V0_1_CI.md)

The proofs do not prove secp256k1 itself, SHA-256, Bitcoin Core, wallet key
management, mempool behavior, production Lightning state machines, or economic
solvency.

## What v0.1 Demonstrates

v0.1 demonstrates a concrete activation path:

```text
public signet parent funding
  -> parent CET confirmed
  -> parent oracle scalar completes bridge signature
  -> bridge confirmed
  -> child funding output exists
```

Evidence:

- [`docs/evidence/public-signet/`](evidence/public-signet/)
- [`docs/evidence/public-signet/public-activation-evidence-bundle.json`](evidence/public-signet/public-activation-evidence-bundle.json)
- [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md)
- [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md)

This demonstrates technical existence on public signet. It does not demonstrate
production wallet UX, broad market liquidity, hardened fee management, or safe
mainnet operations.

## What v0.1 Simulates Or Models

v0.1 includes deterministic and formal models for:

- parent funding, parent CET, bridge, child prepared CET, and child refund
  structure;
- wrong-outcome rejection;
- timelocked refund behavior in the harness;
- financial product payoff/accounting invariants in separate research and
  SPARK targets.

Evidence:

- [`docs/L2_DETERMINISTIC_CLOSEOUT.md`](L2_DETERMINISTIC_CLOSEOUT.md)
- [`docs/evidence/regtest-cdlc/`](evidence/regtest-cdlc/)
- [`research/`](../research/)
- [`spark/`](../spark/)

These models are not substitutes for historical market stress, production
oracles, external liquidity, or legal enforceability.

## Required Assumptions

v0.1 still depends on the following assumptions.

| Area | Assumption |
| --- | --- |
| Cryptography | Discrete log hardness on secp256k1, Schnorr unforgeability, secure hashes, unique oracle nonces. |
| Oracle liveness | The oracle eventually publishes exactly one valid outcome scalar for the event. |
| Oracle integrity | Price/source methodology, timestamping, and equivocation monitoring are good enough for the product being built. |
| State retention | Parties retain the relevant pre-signed transactions, adaptor signatures, refund transactions, and audit metadata. |
| Fees and policy | Transactions remain economically confirmable with sufficient timeout margins, fee reserves, and package/CPFP/RBF strategy. |
| Counterparty behavior | Parties follow the negotiated protocol or fall back to specified timeout/refund paths. |
| Liquidity | Channel, wallet, collateral, and market liquidity exist when continuation, liquidation, or redemption is needed. |

## Major Limitations

### Oracle

The current repository proves and exercises the scalar relation. It does not
yet provide a production oracle service with:

- signed public announcements for all production events;
- enforced one-time nonce operations;
- append-only attestation history;
- price-source and timestamp policy;
- public equivocation evidence format;
- operational key management and monitoring.

Remaining oracle work is summarized in the Layer 4 section of
[`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md).

### Fees, Timelocks, And Mempool Policy

The public signet run confirms one path. It does not prove that future mainnet
transactions will confirm under fee spikes, pinning attempts, package relay
constraints, reorgs, or compressed timeout windows.

Production work still needs:

- fee reserve policy;
- CPFP/RBF or anchor strategy;
- timeout schedules by contract topology;
- reorg handling;
- transaction-pinning analysis;
- watchtower or monitoring policy where channels are involved.

### Liquidity

cDLC activation does not create liquidity. Any financial product built on the
primitive still needs:

- posted collateral;
- exchange or market-making liquidity where liquidation is required;
- channel liquidity for Lightning-style routes;
- redemption reserves or external hedges where stable exposure is promised.

### Collateral And Solvency

The repository contains math and SPARK models for several payoff/accounting
structures. That is not the same as solvency for a real product.

Production collateral design still needs:

- margin parameters;
- haircut policy;
- liquidation triggers;
- shortfall allocation;
- gap-risk treatment;
- historical and adversarial stress testing.

Layer 5 economic stress work remains open in
[`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md).

### State Retention

cDLCs require parties to retain off-chain state. If a participant loses the
relevant adaptors, transaction templates, refund paths, or child-state
metadata, the oracle scalar may become public while the party cannot execute
the intended continuation.

v0.1 does not yet provide production backup, recovery, or state synchronization.

### Bilateral Protocol

The current public signet evidence is not a complete bilateral DLC
negotiation. It does not yet demonstrate two independent participants
negotiating, exchanging and validating messages, persisting state, and
recovering from malformed counterparty messages.

Layer 3 work remains open in
[`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md).

### Lightning

The Lightning section is a mathematical and harness-level extension. It is not
a claim that today's Lightning Network supports end-to-end cDLCs in production.

Open constraints include:

- hold-invoice or deferred-settlement behavior for HTLC mode;
- PTLC-like support for point-lock mode;
- route liquidity;
- force-close and watchtower behavior;
- timeout ordering across hops.

### Mainnet Readiness

v0.1 is not mainnet-ready. Do not use this repository with mainnet funds. The
test keys and harness flows are for signet, testnet, and regtest only.

## Claim Control

Allowed claim:

> NITI v0.1 demonstrates technical existence of a composable cDLC activation
> path on public signet under documented assumptions.

Forbidden claims:

- "NITI is mainnet-ready."
- "NITI is safe for user funds."
- "NITI is a complete financial product."
- "NITI guarantees stable-value redemption."
- "NITI eliminates oracle risk."
- "NITI solves liquidity or collateral risk."
- "NITI has production Lightning support."
- "The SPARK models prove the Bitcoin implementation or economic solvency."

## Evidence Map

| Evidence | Use |
| --- | --- |
| [`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md) | Release contract and open gates. |
| [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md) | External reproduction path. |
| [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md) | Presenter/reviewer demo script. |
| [`docs/SPARK_TO_BITCOIN_TRACE.md`](SPARK_TO_BITCOIN_TRACE.md) | Mapping from formal equations to harness objects. |
| [`docs/evidence/public-signet/`](evidence/public-signet/) | Public signet activation artifacts. |
| [`docs/SECURITY.md`](SECURITY.md) | Security notes and explicit non-goals. |

## Diligence Conclusion

The current evidence supports a serious technical prototype claim: the
composable cDLC activation primitive exists and has been demonstrated on public
signet for one path. It does not yet support claims about production financial
operations, broad product-market readiness, mainnet safety, or user-fund
custody.
