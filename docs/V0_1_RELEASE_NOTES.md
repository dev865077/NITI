# NITI v0.1 Release Notes

The current repository contains cDLC activation evidence, Lazy cDLC compression
models, and dust-sized Lazy mainnet activation evidence. See
[`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md) for the current project status.

These notes state the v0.1 technical result without overclaiming.

These notes are not investor pitch copy, legal analysis, regulatory analysis,
or production user documentation.

## Release Name

```text
NITI v0.1: cDLC activation research prototype
```

## Release Claim

NITI v0.1 demonstrates technical existence of a Cascading DLC activation path
under documented assumptions:

```text
parent DLC outcome
  -> oracle scalar revealed
  -> parent CET completed and confirmed
  -> bridge adaptor signature completed
  -> bridge confirmed
  -> prepared child funding output exists
```

The committed evidence records that a non-corresponding oracle scalar does not
activate the bridge.

The canonical allowed language is maintained in
[`docs/V0_1_CLAIM_LOCK.md`](V0_1_CLAIM_LOCK.md).

## What Is Included

- Public signet, public testnet, dust-sized mainnet, and regtest parent ->
  bridge -> child evidence.
- Deterministic local cDLC smoke harness.
- Bitcoin Core regtest transaction evidence bundle.
- Public evidence bundle verifier.
- External auditor quickstart.
- Technical demo script.
- v0.1 limitations document.
- v0.1 release-candidate manifest and fresh-clone audit path.
- v0.1 fixture manifest, artifact archive, and go/no-go gate.
- v0.1 semantic trace and bilateral transcript.
- Lazy holder activation evidence for Alice, Bob, and watchtower holders.
- SPARK/Ada proof regression for the core cDLC and Lightning finite models in
  CI.
- Ada manifest validator for finite cDLC graph metadata.

## Allowed Claims

The following claims are permitted for v0.1:

- NITI demonstrates reproducible parent -> bridge -> child cDLC activation
  paths in deterministic, regtest, and committed public-network artifacts.
- The bridge signature is incomplete before the selected oracle scalar is
  known.
- The selected oracle scalar completes the bridge signature.
- A wrong outcome scalar is rejected by the bridge signature check in the
  committed evidence.
- The committed public-network artifacts include confirmed parent CET and bridge
  transactions.
- The child funding output exists as the bridge output in the public evidence.
- A retained prepared-edge package lets Alice, Bob, or a watchtower holder
  complete the same bridge after oracle attestation in the lazy holder
  evidence.
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
- [`docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json`](evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json)
- [`docs/evidence/lazy-bilateral-public-testnet/lazy-activation-evidence-bundle.json`](evidence/lazy-bilateral-public-testnet/lazy-activation-evidence-bundle.json)
- [`docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`](evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json)
- [`docs/AUDITOR_QUICKSTART.md`](AUDITOR_QUICKSTART.md)
- [`docs/V0_1_TECHNICAL_DEMO.md`](V0_1_TECHNICAL_DEMO.md)
- [`docs/V0_1_LIMITATIONS.md`](V0_1_LIMITATIONS.md)
- [`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md)
- [`docs/V0_1_RELEASE_CANDIDATE.md`](V0_1_RELEASE_CANDIDATE.md)
- [`docs/V0_1_RC1_MANIFEST.md`](V0_1_RC1_MANIFEST.md)
- [`docs/V0_1_CLAIM_LOCK.md`](V0_1_CLAIM_LOCK.md)
- [`docs/V0_1_FRESH_CLONE_AUDIT.md`](V0_1_FRESH_CLONE_AUDIT.md)
- [`docs/V0_1_FIXTURE_MANIFEST.md`](V0_1_FIXTURE_MANIFEST.md)
- [`docs/V0_1_ARTIFACT_ARCHIVE.md`](V0_1_ARTIFACT_ARCHIVE.md)
- [`docs/V0_1_GO_NO_GO.md`](V0_1_GO_NO_GO.md)
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

1. Public signet, public testnet, dust-sized mainnet, deterministic, or regtest
   boundary language is present wherever transaction evidence is described.
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
> signet/testnet, dust-sized mainnet, regtest, and deterministic evidence: a
> parent DLC oracle scalar completes a bridge signature and funds a prepared
> child path, while wrong outcome scalars are rejected. This is technical
> existence evidence for the primitive, not production readiness or a complete
> financial product.

## Release Boundary

The release is acceptable only as a technical prototype milestone. A later
release must separately close production transport, production wallet UX,
oracle operations, economic stress, adversarial review, fee/reorg policy, and
mainnet custody gates before stronger claims are made.
