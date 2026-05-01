# v0.1 Fresh-Clone Audit

This audit path starts from a clean checkout and verifies the narrow v0.1
claim without private context.

## Environment

Required for the full local gate:

| Tool | Used for |
| --- | --- |
| Node.js and npm | TypeScript harnesses, evidence verifiers, and documentation tooling. |
| GNAT toolchain | Ada manifest validator. |
| GNATprove | SPARK proof regression. |
| Git | Commit identity and repository status checks. |

The Node-only path can be run without GNAT or GNATprove. Remote CI covers the
Ada and SPARK paths for the release branch.

## Clean Checkout

```sh
git clone https://github.com/dev865077/NITI.git
cd NITI
git status --short
npm ci
```

Expected result:

```text
git status --short
# no tracked changes

npm ci
# dependencies installed
```

## Core Local Gate

```sh
npm run build
npm test
npm run test:bilateral-lazy-activation
npm run test:layer3
npm run test:adversarial-failure-matrix
npm run v0.1:verify -- --skip-ada --skip-spark --artifacts-dir /tmp/niti-v0.1-node-audit
```

Expected result:

```text
v0.1 verification passed.
```

The Node gate validates the deterministic transaction harness, bilateral setup
and settlement harnesses, lazy holder activation, adversarial failure matrix,
public evidence verifier, and cDLC smoke transcript.

Fixture sources and expected artifact kinds are listed in
`docs/V0_1_FIXTURE_MANIFEST.md`. Durable committed artifacts, generated local
artifacts, and CI artifacts are listed in `docs/V0_1_ARTIFACT_ARCHIVE.md`.

## Full Local Gate

When GNAT and GNATprove are installed:

```sh
npm run v0.1:verify -- --artifacts-dir /tmp/niti-v0.1-full-audit
npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark --artifacts-dir /tmp/niti-v0.1-lazy-spark-audit
```

Expected result:

```text
v0.1 verification passed.
```

This additionally checks the Ada manifest validator and SPARK proof targets.
The Lazy SPARK command checks the finite-window, edge-local, slide, tree-bound,
recombining, compression, liveness, and loan-rollover Lazy targets.

## Public Documentation Gate

```sh
./scripts/check-public-docs.sh
npx --yes markdown-link-check README.md docs/*.md
git diff --check
```

Expected result:

```text
# contamination scan prints no matches
# markdown-link-check exits 0
# git diff --check exits 0
```

## Audit Boundary

Passing this audit means the repository reproduces the v0.1 technical claim:
the selected oracle scalar completes the prepared parent and bridge path, the
bridge funds the prepared child path, and non-corresponding scalars or modeled
failure cases fail closed.

It does not prove production wallet safety, production oracle integrity,
mainnet fee policy, public mempool relay, financial solvency, or legal
readiness.
