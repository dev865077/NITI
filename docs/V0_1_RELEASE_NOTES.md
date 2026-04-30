# NITI v0.1 Release Notes Draft

These are historical v0.1 notes. The current repository also contains Lazy
cDLC compression models and dust-sized Lazy mainnet activation evidence. See
[`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md) for the current project status.

This draft states the v0.1 technical result without overclaiming.

These notes are not investor pitch copy, legal analysis, regulatory analysis,
or production user documentation.

## Release Name

```text
NITI v0.1: public signet cDLC activation evidence
```

## Release Claim

NITI v0.1 demonstrates technical existence of a Cascading DLC activation
path:

```text
parent DLC outcome
  -> oracle scalar revealed
  -> parent CET completed and confirmed
  -> bridge adaptor signature completed
  -> bridge confirmed
  -> prepared child funding output exists
```

The public evidence bundle records that a non-corresponding oracle scalar does
not activate the bridge.

## What Is Included

- Public signet parent funding, parent CET, bridge transaction, and child
  funding output evidence.
- Deterministic local cDLC smoke harness.
- Bitcoin Core regtest transaction evidence bundle.
- Public evidence bundle verifier.
- External auditor quickstart.
- Technical demo script.
- v0.1 limitations document.
- SPARK/Ada proof regression for the core cDLC and Lightning finite models in
  CI.
- Ada manifest validator for finite cDLC graph metadata.

## Allowed Claims

The following claims are permitted for v0.1:

- NITI demonstrates one public signet parent -> bridge -> child cDLC activation
  path.
- The bridge signature is incomplete before the selected oracle scalar is
  known.
- The selected oracle scalar completes the bridge signature.
- A wrong outcome scalar is rejected by the bridge signature check in the
  committed evidence.
- The public signet run confirms both the parent CET and bridge transaction.
- The child funding output exists as the bridge output in the public evidence.
- The core adaptor/oracle equations are modeled in SPARK/Ada and regression
  checked in CI.
- v0.1 is a research prototype suitable for technical review and further
  testnet work.

## Forbidden Claims

The following claims are not permitted:

- NITI is mainnet-ready.
- NITI is safe for user funds.
- NITI is a production wallet or custody system.
- NITI is a complete bilateral DLC protocol.
- NITI is a production oracle network.
- NITI guarantees stable-value redemption.
- NITI eliminates oracle, fee, liquidity, collateral, counterparty, or legal
  risk.
- NITI has production Lightning support.
- The SPARK models prove Bitcoin Core, secp256k1, SHA-256, wallet security,
  mempool behavior, or economic solvency.
- v0.1 is a complete financial product.
- v0.1 is a regulatory or legal conclusion.

## Residual Assumptions

v0.1 depends on the following assumptions.

| Assumption | Release note language |
| --- | --- |
| Oracle liveness | The selected oracle must publish the outcome scalar before relevant timeouts. |
| Oracle integrity | Production use still needs audited announcement, nonce, source, timestamp, and attestation history. |
| Fee policy | Public signet confirmation of one path does not prove mainnet fee-bump, package relay, CPFP/RBF, pinning, or reorg safety. |
| Liquidity | cDLC activation does not create market, channel, collateral, or redemption liquidity. |
| State retention | Parties must retain pre-signed transactions, adaptors, refunds, child-state metadata, and audit records. |
| Counterparty behavior | A production protocol must define negotiation, validation, abort, timeout, and recovery behavior between independent participants. |
| Collateral | Financial products require separate collateral, margin, haircut, liquidation, and shortfall rules. |

## Evidence Required For The Release Claim

Before publishing or presenting v0.1, reviewers should verify:

- [`docs/evidence/public-signet/public-activation-evidence-bundle.json`](evidence/public-signet/public-activation-evidence-bundle.json)
- [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md)
- [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md)
- [`docs/V0_1_LIMITATIONS.md`](V0_1_LIMITATIONS.md)
- [`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md)
- current GitHub Actions `v0.1 validation` status for the release commit

Minimum local command:

```sh
npm run demo:v0.1
```

Stronger local command:

```sh
npm run demo:v0.1 -- --full-local-gate
```

## Reviewer Anti-Overclaim Checklist

Before approving v0.1 language, check:

1. The phrase "public signet" or equivalent test-network boundary is present
   wherever the transaction evidence is described.
2. The release does not say or imply mainnet readiness.
3. The release does not say or imply user-fund safety.
4. The release does not describe NITI as a complete financial product.
5. Oracle liveness and oracle auditability remain explicit assumptions.
6. Fee policy and timelock limitations remain explicit.
7. Liquidity and collateral limitations remain explicit.
8. State-retention requirements remain explicit.
9. Bilateral protocol work remains explicit.
10. Lightning is described as a model/harness extension, not production
    deployment.
11. SPARK claims are limited to modeled equations and finite models.
12. Any statement about stable exposure, yield, lending, or derivatives points
    to separate economic design and stress work.

## Suggested Public Summary

Use this conservative summary:

> NITI v0.1 demonstrates a Cascading DLC activation primitive on public
> signet: a parent DLC oracle scalar completes a bridge signature and funds a
> prepared child path, while the wrong outcome scalar is rejected. This is
> technical existence evidence for the primitive, not mainnet readiness or a
> complete financial product.

## Release Boundary

The release is acceptable only as a technical prototype milestone. A later
release must separately close or waive the bilateral protocol, oracle
auditability, economic stress, adversarial behavior, fee/reorg policy, and
final go/no-go checklist gates before stronger claims are made.
