# v0.1 Release Candidate

This document defines the v0.1 release-candidate gate.

## Status

`v0.1-rc1` is acceptable as a technical prototype release candidate when all
required gates in `docs/V0_1_RC1_MANIFEST.md` pass for the release commit.

## Go/No-Go Checklist

| Gate | Decision rule | Evidence |
| --- | --- | --- |
| Claim lock | Public language uses only the allowed claim and required qualifiers. | `docs/V0_1_CLAIM_LOCK.md` |
| Fresh-clone audit | Clean checkout path is documented and reproducible. | `docs/V0_1_FRESH_CLONE_AUDIT.md` |
| Manifest | Candidate evidence surface is versioned. | `docs/V0_1_RC1_MANIFEST.md` |
| Fixture manifest | Deterministic fixture sources and expected artifact kinds are documented. | `docs/V0_1_FIXTURE_MANIFEST.md` |
| Artifact archive | Durable committed artifacts, local artifacts, CI artifacts, and redaction rules are documented. | `docs/V0_1_ARTIFACT_ARCHIVE.md` |
| Go/no-go | Tag readiness, required gates, and residual boundaries are documented. | `docs/V0_1_GO_NO_GO.md` |
| Semantic trace | Oracle scalar, bridge signature, state map, and proof boundary are connected. | `docs/V0_1_SEMANTIC_TRACE.md` |
| Bilateral transcript | Alice/Bob deterministic protocol path and holder-level lazy activation are readable and reproducible. | `docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md` |
| Adversarial behavior | Wrong scalar, replay, withholding, fee, timeout, state-loss, and malformed-counterparty paths fail closed. | `docs/V0_1_ADVERSARIAL_FAILURE_MATRIX.md` |
| Public evidence | Public signet, public testnet, Lazy bilateral holder, dust-sized mainnet, and regtest evidence remain inspectable. | `docs/evidence/public-signet/`, `docs/evidence/lazy-public-testnet/`, `docs/evidence/lazy-bilateral-public-signet/`, `docs/evidence/lazy-bilateral-public-testnet/`, `docs/evidence/lazy-public-mainnet/`, `docs/evidence/regtest-cdlc/` |
| CI | TypeScript, Ada manifest, core SPARK, Lightning SPARK, and Lazy SPARK regression pass on the release branch. | GitHub Actions `v0.1 validation` |

## Non-Negotiable Failure Criteria

The release candidate must not be promoted if any of these occur:

- a wrong outcome scalar activates the selected child path;
- the deterministic smoke transcript cannot be reproduced;
- the bridge does not fund the prepared child output in the harness;
- timeout refund behavior is undocumented or non-reproducible;
- Layer 3 retained state can be missing while settlement still claims success;
- holder-level lazy activation succeeds without a retained prepared-edge
  package;
- malformed counterparty data is accepted silently;
- the SPARK proof regression is missing or failing for the release branch;
- public documentation implies mainnet readiness or user-fund safety;
- public evidence cannot be audited without private context.

## Waiver Rule

A waiver is valid only when it records the blocked gate, owner, rationale,
residual risk, and expiration condition. Waivers cannot apply to wrong-branch
activation, missing deterministic smoke evidence, missing SPARK regression, or
overstated public claims.

## Release Decision

The release candidate is a **go** only if every required gate passes or has a
valid waiver under the rule above.

The release candidate is a **no-go** if any non-negotiable failure criterion is
present.

## Boundary

The release candidate is technical evidence for a research prototype. It is not
a production launch, mainnet custody approval, financial product launch, legal
opinion, or regulatory conclusion.
