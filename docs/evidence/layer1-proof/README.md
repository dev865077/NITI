# Layer 1 Proof Evidence Bundle

This bundle collects the minimum evidence needed to review the Layer 1 formal
claim without reading the full repository first.

## Claim Summary

The Layer 1 claim is narrow:

```text
In the modeled scalar arithmetic, the oracle attestation scalar for a selected
DLC outcome completes the corresponding prepared adaptor signature, and a
non-corresponding modeled scalar does not complete that signature.
```

This supports the cDLC activation equation:

```text
S_x = s_x G
s = s_hat + s_x
sG = R* + eP
```

It does not prove Bitcoin implementation correctness, oracle honesty, wallet
safety, mempool reliability, Lightning deployment safety, or economic solvency.

## Evidence Index

| Evidence | Path | Purpose |
| --- | --- | --- |
| Primary whitepaper | [`../../../Cascading Discreet Log Contracts (cDLCs).pdf`](<../../../Cascading Discreet Log Contracts (cDLCs).pdf>) | Defines the cDLC construction, equations, assumptions, and limitations. |
| Formal proof boundary | [`../../FORMAL_PROOF_BOUNDARY.md`](../../FORMAL_PROOF_BOUNDARY.md) | States the positive proof claim and explicit exclusions. |
| SPARK target inventory | [`../../SPARK_TARGET_INVENTORY.md`](../../SPARK_TARGET_INVENTORY.md) | Maps proof targets to packages, commands, and claim families. |
| Formal-to-Bitcoin trace | [`../../SPARK_TO_BITCOIN_TRACE.md`](../../SPARK_TO_BITCOIN_TRACE.md) | Maps core proof claims to harness fields and transaction objects. |
| All-target runner | [`../../../scripts/run-gnatprove-all.sh`](../../../scripts/run-gnatprove-all.sh) | Runs every `spark/*.gpr` target and rejects proof shortcuts. |
| Machine-readable bundle | [`layer1-proof-evidence.json`](layer1-proof-evidence.json) | Stable index of claim, evidence paths, commands, and expected checks. |

## Reproduce

Run the full SPARK sweep:

```sh
npm run spark:prove-all -- --artifacts-dir testnet/artifacts/layer1-proof
```

Inspect the generated summary:

```sh
cat testnet/artifacts/layer1-proof/summary.json
```

The expected summary has:

```text
status = passed
targetCount = 25
```

Inspect the proof-shortcut scan:

```sh
cat testnet/artifacts/layer1-proof/spark-proof-shortcut-scan.log
```

The expected scan result is:

```text
No pragma Assume or Assert(False) statements found.
```

## Failure Policy

The runner exits nonzero if any of the following occurs:

- `gnatprove` is missing;
- no `spark/*.gpr` target is found;
- any GNATprove target fails;
- a proof log contains a warning;
- a proof log contains an unproved obligation;
- a proof source contains `pragma Assume`;
- a proof source contains `Assert(False)`.

## Boundary

This bundle is formal evidence for modeled algebra and finite predicates. It is
not a production security audit, not a wallet audit, not a market-risk report,
and not a claim that funds are safe on mainnet.
