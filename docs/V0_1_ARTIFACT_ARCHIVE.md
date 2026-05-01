# v0.1 Artifact Archive

This archive map identifies the durable evidence needed to audit the v0.1
technical claim.

## Committed Artifacts

| Artifact | Path | Audit use |
| --- | --- | --- |
| Primary whitepaper | `Cascading Discreet Log Contracts (cDLCs).pdf` | Mathematical construction, assumptions, and limitations. |
| Public signet evidence | `docs/evidence/public-signet/` | Original public signet parent -> bridge -> child activation bundle and raw transactions. |
| Lazy public signet evidence | `docs/evidence/lazy-public-signet/` | Public signet Lazy `K = 2` activation bundle and raw transactions. |
| Lazy bilateral public signet evidence | `docs/evidence/lazy-bilateral-public-signet/` | Public signet Lazy holder evidence for Alice, Bob, and watchtower holders. |
| Lazy public testnet evidence | `docs/evidence/lazy-public-testnet/` | Public testnet Lazy `K = 2` activation bundle and raw transactions. |
| Lazy bilateral public testnet evidence | `docs/evidence/lazy-bilateral-public-testnet/` | Public testnet Lazy holder evidence for Alice, Bob, and watchtower holders. |
| Lazy public mainnet evidence | `docs/evidence/lazy-public-mainnet/` | Dust-sized mainnet Lazy `K = 2` activation bundle and raw transactions. |
| Regtest evidence | `docs/evidence/regtest-cdlc/` | Bitcoin Core regtest activation and timeout evidence. |
| Auditor demo transcript | `docs/evidence/auditor-quickstart/demo-v0.1.log` | Human-readable public evidence replay transcript. |

## Generated Local Artifacts

The local verifier writes logs and transcripts to the selected artifacts
directory.

```sh
npm run v0.1:verify -- --artifacts-dir /tmp/niti-v0.1-full-audit
npm run v0.1:verify -- --skip-node --skip-ada --lazy-spark --artifacts-dir /tmp/niti-v0.1-lazy-spark-audit
```

Expected generated files include:

| Artifact | Expected file |
| --- | --- |
| Build log | `node-build.log` |
| Test log | `node-tests.log` |
| Parent funding fixture | `parent-funding.json` and `parent-funding.hex` |
| cDLC smoke transcript | `cdlc-smoke-transcript.json` |
| Layer 2 readable transcript | `l2-e2e-transcript.json` |
| Ada build log | `ada-build.log` |
| Manifest sample | `sample-manifest.json` |
| Manifest validation log | `manifest-validate.log` |
| SPARK no-assume scan | `spark-pragma-assume-scan.log` |
| SPARK target logs | `spark-*.log` |
| Run summary | `summary.json` |

## CI Artifacts

The `v0.1 validation` workflow uploads:

| Workflow artifact | Contents |
| --- | --- |
| `v0-1-layer-2-transcripts` | cDLC smoke transcript and Layer 2 transcript JSON. |
| `layer-3-bilateral-artifacts` | Layer 3 bilateral JSON artifacts and logs. |

The SPARK and Ada jobs expose their logs through the GitHub Actions run. A
successful run must show:

- TypeScript deterministic harness: success;
- Ada manifest validator: success;
- SPARK proof regression: success;
- core cDLC SPARK verifier: `v0.1 verification passed.`;
- Lazy cDLC SPARK verifier: `v0.1 verification passed.`.

## Redaction Rule

Committed public artifacts must not include production secrets. Deterministic
fixture scalars are public test material and are unsafe for production use.
Private live-run plans, wallet private keys, RPC credentials, and production
oracle secrets must not be committed.

## Boundary

This archive map is sufficient to reproduce or audit the v0.1 technical
claim. It is not a long-term retention policy, a custody record, or a
production incident record.
