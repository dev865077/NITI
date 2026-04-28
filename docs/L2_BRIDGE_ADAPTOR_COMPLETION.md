# Layer 2 Bridge Adaptor Completion

This document records the executable bridge-signature evidence.
It shows that the bridge adaptor is not a valid Taproot/Schnorr signature before
oracle resolution, that the parent outcome scalar `s_x` completes it, and that
the wrong outcome scalar `s_y` does not.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Bridge Adaptor

| Field | Value |
| --- | --- |
| Bridge txid | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Sighash | `81f51fe6c02b8fc39734061b2125f15b2d4de34fe62d231a310654381d4ee836` |
| Signer public key | `624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d` |
| Adaptor point `S_x` | `03a9853a7527b53165a23208738656cb6337d734297173e4939e1d6420f31a1124` |
| Adapted nonce | `f12d0d54effef159d6b389f58c53c95e1b12f0526f75609701d19845bcc74ac8` |
| Adaptor scalar `s_hat` | `24eb1a2feec68b850343928411ee2727e8eb2702aa607dd8aa7f47b4b91c2665` |
| Adaptor equation verifies | `true` |

The pre-resolution signature candidate is:

```text
f12d0d54effef159d6b389f58c53c95e1b12f0526f75609701d19845bcc74ac824eb1a2feec68b850343928411ee2727e8eb2702aa607dd8aa7f47b4b91c2665
```

It does not verify as a BIP340 signature:

```text
bridge.adaptor.preResolutionSignatureVerifies = false
```

## Correct Scalar Completion

When the oracle attests the activating parent outcome, it reveals:

```text
s_x = 2ba3facbf7a84e325506bf4c27ebf3cf115b0b79c23f2ca509cfb4bb7c8bb81d
```

The completed bridge signature is:

```text
f12d0d54effef159d6b389f58c53c95e1b12f0526f75609701d19845bcc74ac8508f14fbe66ed9b7584a51d039da1af6fa46327c6c9faa7db44efc7035a7de82
```

The transcript must show:

```text
bridge.completion.completedSignatureVerifies = true
bridge.completion.extractedSecretMatchesOracleScalar = true
```

## Wrong Scalar Rejection

For the non-corresponding outcome, the wrong attestation point is:

```text
S_y = 036d53cf539f9f0b5480dfa984b6a8c9644dcd86b6deb65911e8b0d1266e554b0b
```

Completing the same bridge adaptor with `s_y` is rejected:

```text
bridge.wrongScalar.rejected = true
bridge.wrongScalar.reason = completed adaptor signature does not verify
```

## Transcript Fields

The evidence lives under these transcript fields:

| Evidence | Transcript field |
| --- | --- |
| Adaptor equation verifies before scalar publication | `bridge.adaptor.preResolutionVerifies` |
| Adaptor is not a completed BIP340 signature | `bridge.adaptor.preResolutionSignatureVerifies` |
| Correct scalar completed signature | `bridge.completion.completedSignatureHex` |
| Correct scalar verifies | `bridge.completion.completedSignatureVerifies` |
| Extracted scalar matches oracle scalar | `bridge.completion.extractedSecretMatchesOracleScalar` |
| Wrong scalar rejection | `bridge.wrongScalar.rejected`, `bridge.wrongScalar.reason` |

## Boundary

This is executable signature evidence over the concrete bridge transaction
sighash. It does not replace the SPARK algebra or prove secp256k1 itself,
Bitcoin Core relay policy, confirmation, or production key management.
