# SPARK To Bitcoin Trace

This document maps the formally modeled cDLC algebra to the concrete Bitcoin
operations exercised by the v0.1 deterministic harness.

It is intentionally narrow. The SPARK targets prove algebraic obligations over
finite or symbolic models. The TypeScript harness applies the same equations to
BIP340-style oracle attestations, Taproot sighashes, adaptor signatures, and
witness insertion. This trace explains where the boundary is.

## Reproduce The Evidence

Run the deterministic harness:

```sh
npm run test:cdlc-smoke
```

The command emits a JSON transcript of kind:

```text
niti.v0_1_cdlc_smoke_transcript.v1
```

The transcript is deterministic and regtest-equivalent. It uses a signed
fixture parent funding transaction, whose source prevout is deterministic test
data, and does not claim public testnet broadcast or mempool confirmation.

The core proof targets are:

```sh
gnatprove -P spark/cdlc_integer_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
gnatprove -P spark/cdlc_residue_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
gnatprove -P spark/cdlc_proofs.gpr --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=all
```

CI runs the core cDLC targets plus the Lightning target in
[`.github/workflows/v0-1-validation.yml`](../.github/workflows/v0-1-validation.yml).

## Object Correspondence

| Whitepaper object | SPARK model object | TypeScript object | Bitcoin execution object |
| --- | --- | --- | --- |
| Oracle nonce scalar `r_o` | `Oracle_Nonce` | `nonceSecret` in [`testnet/src/secp.ts`](../testnet/src/secp.ts) | Not placed on-chain; used to compute the oracle signature scalar. |
| Oracle signing key `v` | `Oracle_Secret` | `oracleSecret` in [`testnet/src/secp.ts`](../testnet/src/secp.ts) | Not placed on-chain; public key is used for attestation verification. |
| Oracle challenge `e_x` | `Challenge` | `bip340Challenge(...)` in [`testnet/src/secp.ts`](../testnet/src/secp.ts) | Hash challenge for the oracle attestation message. |
| Oracle scalar `s_x` | `Oracle_Attestation_Secret(...)`, `Hidden` | `attestationSecretHex` | Scalar later added to adaptor signatures. |
| Attestation point `S_x` | `Oracle_Attestation_Point(...)`, `Point_Of(Hidden)` | `attestationPointCompressedHex` | Public adaptor point committed before attestation. |
| Signer nonce `r` | `Signer_Nonce` | adaptor nonce in `createBip340AdaptorSignature(...)` | Hidden nonce for the Taproot key-path signature. |
| Adapted nonce `R*` | `Adapted_Nonce_Point(...)` | `adaptedNonceXOnlyHex` / `adaptedNonceCompressedHex` | Schnorr `R` value in the completed witness signature. |
| Adaptor scalar `s_hat` | `Adaptor_Signature(...)` | `adaptorSignatureScalarHex` | Incomplete signature scalar retained off-chain. |
| Completed scalar `s` | `Complete(Adaptor, Hidden)` | `completedScalarHex` | Scalar in the final BIP340 witness signature. |
| Bridge sighash `m_e` | Abstracted as the signature challenge input | `sighashHex` from `hashForWitnessV1(...)` | Taproot key-path transaction digest being signed. |

## Claim Trace Matrix

| Claim | Formal source | Harness source | Execution artifact | What is outside SPARK |
| --- | --- | --- | --- | --- |
| Oracle scalar maps to the advertised attestation point: `s_xG = S_x`. | `Prove_Oracle_Attestation` in [`spark/src/cdlc_algebra.ads`](../spark/src/cdlc_algebra.ads), [`spark/src/cdlc_integer_algebra.adb`](../spark/src/cdlc_integer_algebra.adb), and [`spark/src/cdlc_residue_algebra.ads`](../spark/src/cdlc_residue_algebra.ads). | `prepareOracleOutcome(...)` computes `attestationPoint = nonce.point.add(oracle.point.multiply(challenge))`; `attestOracleOutcome(...)` computes `attestationSecret = nonceSecret + challenge * oracleSecret` and verifies the BIP340 signature in [`testnet/src/secp.ts`](../testnet/src/secp.ts). | `oracle.activatingSignatureVerifies = true`; `oracle.activatingAttestationPointCompressedHex` is the adaptor point used by parent and bridge; wrong outcome has a distinct `oracle.wrongAttestationPointCompressedHex`. | secp256k1 correctness, BIP340 implementation correctness, SHA-256/tagged-hash behavior, oracle key custody, and unique nonce operation. |
| A bridge adaptor signature verifies before the oracle scalar is known. | `Prove_Adaptor_Verifies` and `Verify_Adaptor(...)` in [`spark/src/cdlc_algebra.ads`](../spark/src/cdlc_algebra.ads). | `createBip340AdaptorSignature(...)` checks `s_hat G = R* - T + eP`; `buildTaprootAdaptorSpend(...)` stores `verifiesAdaptor` in [`testnet/src/secp.ts`](../testnet/src/secp.ts) and [`testnet/src/taproot.ts`](../testnet/src/taproot.ts). | `parent.adaptorVerifies = true`; `bridge.adaptorVerifies = true`. | Correct Taproot sighash construction, transaction serialization, witness digest domain separation, and library behavior. |
| Adding the correct oracle scalar completes the Taproot signature. | `Prove_Completion_Verifies` and `Verify_Completed(...)` in [`spark/src/cdlc_algebra.ads`](../spark/src/cdlc_algebra.ads). | `completeAdaptorSignature(...)` computes `completed = adaptorSignatureScalar + attestationSecret`; `completeTaprootAdaptorSpend(...)` inserts the completed signature as the witness in [`testnet/src/secp.ts`](../testnet/src/secp.ts) and [`testnet/src/taproot.ts`](../testnet/src/taproot.ts). | `parent.completedSignatureVerifies = true`; `bridge.completedSignatureVerifies = true`; `parent.cetRawTxHex` is a complete transaction; `bridge.completedTxid` identifies the completed bridge. | Bitcoin Core policy, mempool relay, fee policy, confirmation, and mainnet safety. |
| A completed signature reveals the hidden oracle scalar by subtraction. | `Prove_Extraction` and `Extract(...)` in [`spark/src/cdlc_algebra.ads`](../spark/src/cdlc_algebra.ads). | `completeAdaptorSignature(...)` computes `extracted = completed - adaptorSignatureScalar` in [`testnet/src/secp.ts`](../testnet/src/secp.ts). | `parent.extractedSecretMatchesOracleScalar = true`; `bridge.extractedSecretMatchesOracleScalar = true`. | Operational secrecy before attestation, signer storage safety, and whether counterparties retain adaptor records. |
| A wrong oracle scalar does not complete the same adaptor signature. | `Prove_Wrong_Secret_Does_Not_Verify` in [`spark/src/cdlc_algebra.ads`](../spark/src/cdlc_algebra.ads), with explicit modular variants in [`spark/src/cdlc_algebra.adb`](../spark/src/cdlc_algebra.adb) and [`spark/src/cdlc_residue_algebra.adb`](../spark/src/cdlc_residue_algebra.adb). | `completeTaprootAdaptorSpend(...)` throws when the completed signature fails verification; the smoke test asserts this for both parent and bridge wrong-outcome attempts in [`testnet/src/cdlc-smoke-test.ts`](../testnet/src/cdlc-smoke-test.ts). | `parent.wrongOutcomeRejected = true`; `bridge.wrongOutcomeRejected = true`; wrong attestation point differs from the activating point. | Oracle equivocation, hash collisions, nonce reuse, and any implementation bug that bypasses signature verification. |
| The parent outcome funds the child path through a bridge transaction. | The SPARK algebra proves activation of the signature condition, not Bitcoin transaction graph validity. The graph transition is a harness invariant. | The smoke test builds a signed parent funding fixture, completes the parent CET that spends `funding.parentFunding.txid:0`, extracts output `0`, builds a bridge spending that output, completes the bridge, and checks the child funding output in [`testnet/src/cdlc-smoke-test.ts`](../testnet/src/cdlc-smoke-test.ts). | `funding.parentFunding.signatureVerifies = true`; `parent.fundingTxid = funding.parentFunding.txid`; `bridge.spendsParentCetTxid = parent.cetCompletedTxid`; `bridge.spendsParentCetVout = 0`; `child.fundedByBridgeTxid = bridge.completedTxid`; `child.visibleInCompletedBridge = true`. | Full DLC negotiation, public broadcast, transaction package relay, CPFP/anchor policy, reorg handling, and wallet state management. |

## Data Path

The v0.1 smoke harness uses the same oracle scalar twice:

```text
oracle attests outcome x
  -> attestationSecretHex is produced
  -> signed parent funding fixture creates the parent funding txid/vout
  -> parent CET adaptor signature is completed
  -> parent edge output is materialized
  -> bridge adaptor signature is completed with the same scalar
  -> bridge output pays the child funding script
```

Wrong outcome path:

```text
oracle attests outcome y
  -> wrong attestation point differs from S_x
  -> completion with s_y fails signature verification
  -> parent/bridge wrongOutcomeRejected fields remain true
```

## Proof Boundary

The SPARK targets prove the modeled algebra:

```text
S_x = s_xG
s_hat G = R* - S_x + eP
s = s_hat + s_x
sG = R* + eP
s - s_hat = s_x
wrong scalar does not verify
```

The TypeScript harness demonstrates that those equations are wired into a
Taproot key-path spend and a deterministic parent-to-bridge-to-child
transaction chain.

The following remain assumptions or separate release gates:

- secp256k1 and BIP340 implementation correctness;
- SHA-256 and tagged-hash security;
- Bitcoin transaction serialization and sighash correctness in dependencies;
- Bitcoin Core mempool policy, fee bumping, and confirmation;
- oracle liveness, nonce uniqueness, and non-equivocation;
- bilateral negotiation, state retention, and production key management;
- public testnet/signet broadcast evidence;
- complete financial-product solvency or regulatory analysis.

## Reviewer Checklist

1. Run `npm run test:cdlc-smoke`.
2. Confirm `parent.adaptorVerifies`, `parent.completedSignatureVerifies`, and
   `parent.extractedSecretMatchesOracleScalar` are true.
3. Confirm `bridge.adaptorVerifies`, `bridge.completedSignatureVerifies`, and
   `bridge.extractedSecretMatchesOracleScalar` are true.
4. Confirm `parent.wrongOutcomeRejected` and `bridge.wrongOutcomeRejected` are
   true.
5. Confirm `child.visibleInCompletedBridge` is true and
   `child.fundedByBridgeTxid = bridge.completedTxid`.
6. Run the core SPARK targets or inspect the CI run for the same commit.
7. Treat any claim beyond the proof boundary as unproven by this trace.
