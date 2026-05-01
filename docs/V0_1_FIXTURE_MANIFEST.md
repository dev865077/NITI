# v0.1 Fixture Manifest

This manifest identifies the deterministic fixture surface used by the v0.1
technical prototype.

## Fixture Rule

v0.1 fixtures are public test material. They are deterministic, safe to
publish, and must not be reused as production keys, oracle keys, wallet
material, or user-fund material.

Changing a fixture source intentionally changes the expected artifacts. A
reviewer should treat fixture-source changes as protocol-evidence changes and
rerun the gates in `docs/V0_1_RC1_MANIFEST.md`.

## Canonical Fixture Sources

| Fixture class | Source | Expected output surface |
| --- | --- | --- |
| Canonical network | `testnet/src/cdlc-scenario.ts` | `canonicalNetwork = testnet4` in deterministic harnesses. |
| Deterministic scalar material | `testnet/src/cdlc-scenario.ts` | `canonicalSecrets` for source funding, parent funding, bridge signer, child funding, oracle, oracle nonce, child oracle, child oracle nonce, and refund nonces. |
| Oracle outcomes | `testnet/src/cdlc-scenario.ts` | Parent event `niti-v0.1-parent-cdlc-smoke`, activating outcome `BTCUSD_ABOVE_STRIKE`, wrong outcome `BTCUSD_BELOW_STRIKE`, child event `niti-v0.1-child-cdlc-smoke`. |
| Amounts and fees | `testnet/src/cdlc-scenario.ts` | Parent funding value, CET fee, bridge fee, refund fee, child CET fee, and child refund fee. |
| Source prevout | `testnet/src/cdlc-scenario.ts` | Deterministic fixture prevout with txid `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0`. |
| secp256k1 and BIP340 helpers | `testnet/src/secp.ts` | Oracle preparation, oracle attestation, adaptor creation, adaptor completion, extraction, and verification. |
| Taproot transaction helpers | `testnet/src/taproot.ts` | Sighash construction, key-path signing, witness insertion, raw transaction hex, and transaction ids. |
| Bilateral fixtures | `testnet/src/bilateral-*.ts` | Alice/Bob roles, setup schema, template agreement, funding validation, adaptor exchange, retained state, restart recovery, malformed-message rejection, settlement execution, and wrong-path replay. |
| Public evidence verifier | `testnet/src/evidence-bundle-verify.ts` | Verification of committed public, Lazy, bilateral Lazy, mainnet, and regtest evidence bundles. |

## Expected Artifact Kinds

| Command | Expected artifact kind |
| --- | --- |
| `npm run test:cdlc-smoke` | `niti.v0_1_cdlc_smoke_transcript.v1` |
| `npm run test:bilateral-lazy-activation` | `niti.l3_lazy_activation_holder_test.v1` |
| `npm run test:layer3` | `niti.l3_bilateral_ci_artifact_summary.v1` |
| `npm run test:adversarial-failure-matrix` | `niti.v0_1_adversarial_failure_matrix.v1` |
| `npm run regtest:cdlc-evidence` | `niti.v0_1_regtest_cdlc_evidence_bundle.v1` |
| `npm run test:evidence-bundle` | JSON result with `ok = true` and checked transaction count. |

## Stable Public Artifact Paths

| Artifact class | Path |
| --- | --- |
| Primary whitepaper | `Cascading Discreet Log Contracts (cDLCs).pdf` |
| Public signet bundle | `docs/evidence/public-signet/public-activation-evidence-bundle.json` |
| Lazy public signet bundle | `docs/evidence/lazy-public-signet/lazy-activation-evidence-bundle.json` |
| Lazy bilateral public signet bundle | `docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json` |
| Lazy public testnet bundle | `docs/evidence/lazy-public-testnet/lazy-activation-evidence-bundle.json` |
| Lazy bilateral public testnet bundle | `docs/evidence/lazy-bilateral-public-testnet/lazy-activation-evidence-bundle.json` |
| Lazy public mainnet bundle | `docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json` |
| Regtest bundle | `docs/evidence/regtest-cdlc/tx-evidence-bundle.json` |

## Expected Negative Cases

The deterministic fixture set includes these negative cases:

| Negative case | Required behavior |
| --- | --- |
| Wrong outcome scalar | Does not complete the selected bridge signature. |
| Random scalar | Does not complete the selected bridge signature. |
| Different event scalar | Does not complete the selected bridge signature. |
| Different oracle key scalar | Does not complete the selected bridge signature. |
| Completed signature replayed against a different bridge sighash | Rejected by BIP340 verification. |
| Oracle withheld | Pre-resolution adaptor is not a valid completed witness. |
| Missing retained bilateral state | Settlement aborts safely. |
| Malformed counterparty message | Setup or adaptor exchange rejects the message with a reason. |
| Missing Lazy prepared-edge package | Holder activation aborts safely. |

## Boundary

The fixture manifest is a reproducibility manifest, not a production parameter
registry. It does not define production keys, production oracle operations,
production fee policy, production wallet behavior, or safe values for user
funds.
