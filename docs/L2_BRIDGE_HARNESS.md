# Layer 2 Bridge Transaction Harness

This document records the bridge transaction artifact for issue #69. The bridge
transaction `B_e` spends the parent CET edge output `O_e` and creates the child
DLC funding output `F_j`.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Bridge Input

| Field | Value |
| --- | --- |
| Parent CET txid | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |
| Parent CET vout | `0` |
| Input value | `99000 sat` |
| Input script pubkey | `5120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d` |

The parent CET edge output is defined in
[`L2_PARENT_CET_HARNESS.md`](L2_PARENT_CET_HARNESS.md).

## Serialized Bridge

Unsigned bridge transaction:

```text
02000000013dd44eea7a0a5e2dc36f5a6256175c8f59572c57b98de7fe3b434d6ed8f222400000000000ffffffff01c480010000000000225120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b00000000
```

Completed bridge transaction:

```text
020000000001013dd44eea7a0a5e2dc36f5a6256175c8f59572c57b98de7fe3b434d6ed8f222400000000000ffffffff01c480010000000000225120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b0140f12d0d54effef159d6b389f58c53c95e1b12f0526f75609701d19845bcc74ac8508f14fbe66ed9b7584a51d039da1af6fa46327c6c9faa7db44efc7035a7de8200000000
```

| Field | Value |
| --- | --- |
| Bridge txid before witness | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Bridge txid after witness | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Sighash | `81f51fe6c02b8fc39734061b2125f15b2d4de34fe62d231a310654381d4ee836` |
| Adaptor point | `03a9853a7527b53165a23208738656cb6337d734297173e4939e1d6420f31a1124` |
| Adaptor verifies | `true` |
| Completed signature verifies | `true` |
| Wrong outcome rejected | `true` |

The bridge txid is known before oracle resolution because witness data is not
part of the transaction id.

## Child Funding Output `F_j`

| Field | Value |
| --- | --- |
| Output name | `child_funding` |
| Vout | `0` |
| Value | `98500 sat` |
| Address | `tb1plr5908qjdayaa5ehcxwy7hcur9glqafpvtt2v8c2nc24s4v5899seky47r` |
| Script pubkey | `5120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b` |

The child funding outpoint is:

```text
c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6:0
```

## Transcript Fields

Issue #69 evidence lives under these transcript fields:

| Evidence | Transcript field |
| --- | --- |
| Serialized unsigned bridge | `bridge.unsignedTxHex` |
| Serialized completed bridge | `bridge.completedRawTxHex` |
| Stable txid before witness | `bridge.unsignedTxid` |
| Stable txid after witness | `bridge.completedTxid` |
| Sighash input map | `bridge.sighashInputs[]` |
| Sighash | `bridge.sighashHex` |
| Child funding output map | `bridge.outputMap[]` |
| Child funding outpoint | `child.fundedByBridgeTxid`, `child.fundedByBridgeVout` |

## Boundary

This harness proves that the bridge transaction is fully specified before
oracle resolution except for the adaptor-completed witness, has a stable txid,
spends the parent edge output, and creates the child funding output. It does
not prove public relay, confirmation, fee bumping, full child DLC settlement,
or production refund scripts.
