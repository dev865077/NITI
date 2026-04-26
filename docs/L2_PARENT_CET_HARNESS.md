# Layer 2 Parent CET Harness

This document records the parent Contract Execution Transaction artifact for
issue #68. It is the parent outcome transaction that exposes the edge output
`O_e` consumed by the bridge.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

The v0.1 runner archives the same transcript:

```sh
npm run v0.1:verify -- --skip-spark
```

## Parent CET Input

| Field | Value |
| --- | --- |
| Funding txid | `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` |
| Funding vout | `0` |
| Funding value | `100000 sat` |
| Funding script pubkey | `51202a64b1ee3375f3bb4b367b8cb8384a47f73cf231717f827c6c6fbbf5aecf0c36` |

The funding output is defined in
[`L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md).

## Serialized CET

Unsigned parent CET:

```text
0200000001da00598be0aeef97acd259308aeddbfa4185c5edcce2e73b277ee10264ef8ad10000000000ffffffff01b882010000000000225120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d00000000
```

Completed parent CET:

```text
02000000000101da00598be0aeef97acd259308aeddbfa4185c5edcce2e73b277ee10264ef8ad10000000000ffffffff01b882010000000000225120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d0140f12d0d54effef159d6b389f58c53c95e1b12f0526f75609701d19845bcc74ac83fa6166d1db3a36ea5c9e957ad2f5bedf5692edfc434e0d12032f44b7d9497e500000000
```

| Field | Value |
| --- | --- |
| CET txid before witness | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |
| CET txid after witness | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |
| Sighash | `c2bef27e870ef087a18f35326835c4ce8703f262d4ef551a392d98ab584d0cda` |
| Adaptor point | `03a9853a7527b53165a23208738656cb6337d734297173e4939e1d6420f31a1124` |
| Adaptor verifies | `true` |
| Completed signature verifies | `true` |
| Wrong outcome rejected | `true` |

The txid remains stable across witness completion because Taproot witness data
is not part of the transaction id.

## Edge Output `O_e`

| Field | Value |
| --- | --- |
| Output name | `edge` |
| Vout | `0` |
| Value | `99000 sat` |
| Script pubkey | `5120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d` |
| Spend role | Bridge signer |

The bridge fixture must spend:

```text
4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d:0
```

The smoke transcript records that as:

```text
bridge.spendsParentCetTxid = parent.cetCompletedTxid
bridge.spendsParentCetVout = 0
```

## Transcript Fields

Issue #68 evidence lives under these transcript fields:

| Evidence | Transcript field |
| --- | --- |
| Serialized unsigned CET | `parent.cetUnsignedTxHex` |
| Serialized completed CET | `parent.cetRawTxHex` |
| Stable txid before witness | `parent.cetUnsignedTxid` |
| Stable txid after witness | `parent.cetCompletedTxid` |
| Sighash input map | `parent.sighashInputs[]` |
| Sighash | `parent.cetSighashHex` |
| Edge output map | `parent.outputMap[]` |
| Bridge reference | `bridge.spendsParentCetTxid`, `bridge.spendsParentCetVout` |

## Boundary

This harness proves that the parent CET is constructed, has a stable txid
before witness completion, exposes the intended edge output, and is referenced
by the bridge fixture. It does not implement full DLC payout negotiation,
script-level refund branches, public relay, or child settlement.
