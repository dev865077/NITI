# v0.1 Go/No-Go

This document records the v0.1 release decision for the NITI research
prototype.

## Decision

`v0.1.0` is **GO** as a technical prototype release when the tag points to a
main-branch commit that satisfies the gates in `docs/V0_1_RC1_MANIFEST.md`.

The release is not a production launch, wallet release, custody approval,
financial product, legal conclusion, or user-fund safety statement.

## Required Gates

| Gate | Required command or evidence |
| --- | --- |
| TypeScript build | `npm run build` |
| Deterministic suite | `npm test` |
| Bilateral Lazy holder activation | `npm run test:bilateral-lazy-activation` |
| Layer 3 bilateral package | `npm run test:layer3` |
| Adversarial failure matrix | `npm run test:adversarial-failure-matrix` |
| Node-only v0.1 verifier | `npm run v0.1:verify -- --skip-ada --skip-spark --artifacts-dir /tmp/niti-v0.1-node-audit` |
| Full v0.1 verifier | `npm run v0.1:verify -- --artifacts-dir /tmp/niti-v0.1-full-audit` |
| Lazy SPARK verifier | `npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark --artifacts-dir /tmp/niti-v0.1-lazy-spark-audit` |
| Public-document scan | `./scripts/check-public-docs.sh` |
| Markdown link check | `npx --yes markdown-link-check README.md docs/*.md` |
| Whitespace check | `git diff --check` |
| CI | GitHub Actions `v0.1 validation` succeeds on the release commit. |

## Required Evidence Documents

| Evidence | Path |
| --- | --- |
| Claim lock | `docs/V0_1_CLAIM_LOCK.md` |
| Release-candidate manifest | `docs/V0_1_RC1_MANIFEST.md` |
| Fresh-clone audit | `docs/V0_1_FRESH_CLONE_AUDIT.md` |
| Fixture manifest | `docs/V0_1_FIXTURE_MANIFEST.md` |
| Artifact archive | `docs/V0_1_ARTIFACT_ARCHIVE.md` |
| Semantic trace | `docs/V0_1_SEMANTIC_TRACE.md` |
| Bilateral transcript | `docs/V0_1_BILATERAL_E2E_TRANSCRIPT.md` |
| Limitations | `docs/V0_1_LIMITATIONS.md` |
| Release notes | `docs/V0_1_RELEASE_NOTES.md` |

## Tag Rule

The release tag should be:

```text
v0.1.0
```

The tag should be created only after the final release commit is on `main` and
the `v0.1 validation` workflow succeeds for that commit. The tag message should
state that v0.1.0 is technical evidence for the cDLC activation primitive under
the limitations in `docs/V0_1_LIMITATIONS.md`.

## Remaining Boundaries

The following remain outside v0.1:

- production wallet UX;
- production two-party transport;
- production custody and backup operations;
- production oracle operations;
- fee-bump, package relay, reorg, and pinning policy;
- production Lightning deployment;
- product solvency, liquidity, legal, and regulatory analysis.

## Final Statement

v0.1.0 is ready to tag as a research prototype once the required gates pass on
the tag commit. Stronger public claims require separate evidence.
