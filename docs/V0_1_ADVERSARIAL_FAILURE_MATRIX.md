# v0.1 Adversarial Failure Matrix

The v0.1 adversarial gate checks that common failure injections fail closed
instead of silently activating a wrong child path.

Run:

```sh
npm run test:adversarial-failure-matrix
```

Expected artifact kind:

```text
niti.v0_1_adversarial_failure_matrix.v1
```

## Covered Failures

| Area | Case | Expected result |
| --- | --- | --- |
| Wrong outcome | Scalar for outcome `y` is applied to the bridge for outcome `x`. | Signature completion fails. |
| Random scalar | A valid random scalar is applied to the selected bridge. | Signature completion fails. |
| Different event | A valid oracle scalar for another event is applied to the selected bridge. | Signature completion fails. |
| Different oracle key | A valid scalar under a different oracle key is applied to the selected bridge. | Signature completion fails. |
| Bridge replay | A completed bridge signature is replayed against a different bridge sighash. | BIP340 verification rejects it. |
| Oracle withholding | No oracle scalar is available. | The pre-resolution adaptor is not a valid witness. |
| Timeout refund | The bridge timeout refund is checked before and after maturity. | Early spend fails; mature spend succeeds. |
| Fee spike | Required relay fee exceeds the modeled bridge fee reserve. | Bridge broadcast is not allowed in the model; fallback is selected. |
| Compressed timeout | Attestation and bridge deadline collide, or bridge and child deadlines race. | Activation window is unavailable; fallback is selected. |

## Companion Bilateral Gates

| Area | Command | Expected artifact kind |
| --- | --- | --- |
| State loss and restart | `npm run test:bilateral-restart-recovery` | `niti.l3_bilateral_restart_recovery_test.v1` |
| Malformed adaptor data | `npm run test:bilateral-malformed-counterparty` | `niti.l3_bilateral_malformed_counterparty_test.v1` |
| Branch replay and double activation | `npm run test:bilateral-wrong-path-replay` | `niti.l3_bilateral_wrong_path_replay_test.v1` |

## Expected Checks

The matrix passes only if all checks are true:

```text
allActivationFailuresClosed
noFailureProducedChildFundingSpend
oracleWithholdingDoesNotActivate
timeoutRefundMatures
feeSpikeSelectsFallback
compressedTimeoutsSelectFallback
companionBilateralCommandsListed
```

## Boundary

The matrix is deterministic failure injection. It does not prove production
network adversary resistance, mempool policy, fee-bump correctness, oracle
truth, wallet safety, or mainnet custody safety. It proves that the modeled
v0.1 failure cases reject, refund, timeout, or select fallback instead of
activating the wrong branch.
