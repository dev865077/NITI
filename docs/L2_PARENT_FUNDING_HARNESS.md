# Layer 2 Parent Funding Harness

This document records the deterministic parent funding artifact.
It materializes the parent funding output consumed by the canonical parent CET
fixture in [`L2_SINGLE_CDLC_SCENARIO.md`](L2_SINGLE_CDLC_SCENARIO.md).

The artifact is a signed Taproot key-path transaction built from a fixture
source prevout. It is Bitcoin-serialized and signature-checked locally, but it
is not a public testnet broadcast because the source prevout is deterministic
test data.

## Reproduce

```sh
npm run testnet -- cdlc:parent-funding \
  --network testnet4 \
  --out testnet/artifacts/parent-funding.json \
  --raw-out testnet/artifacts/parent-funding.hex
```

The broader v0.1 runner also archives this artifact:

```sh
npm run v0.1:verify -- --skip-spark
```

## Source Fixture

| Field | Value |
| --- | --- |
| Source txid | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |
| Source vout | `0` |
| Source value | `101000 sat` |
| Source address | `tb1prtq4raemy34qwdcpry2w7grzvsj8uzp0phc3t0k4ry79pr9vhjzqfjd30x` |
| Source script pubkey | `51201ac151f73b246a0737011914ef206264247e082f0df115bed5193c508cacbc84` |
| Source signature nonce | `0x7777777777777777777777777777777777777777777777777777777777777777` |

## Parent Funding Output

| Field | Value |
| --- | --- |
| Funding txid | `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` |
| Funding vout | `0` |
| Funding value | `100000 sat` |
| Funding address | `tb1p9fjtrm3nwhemkjek0wxtswz2glmneu33w9lcylrvd7alttk0psmqds9pcj` |
| Funding script pubkey | `51202a64b1ee3375f3bb4b367b8cb8384a47f73cf231717f827c6c6fbbf5aecf0c36` |
| Funding fee | `1000 sat` |
| Signature verifies | `true` |

Raw funding transaction:

```text
02000000000101aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffff01a0860100000000002251202a64b1ee3375f3bb4b367b8cb8384a47f73cf231717f827c6c6fbbf5aecf0c3601407962d45b38e8bcf82fa8efa8432a01f20c9a53e24c7d3f11df197cb8e70926da06c7b6294292228540a1291d18096ec5d00bcacac387a1e0bfd80a97b7c1706200000000
```

## Consumption By Parent CET

The deterministic smoke transcript must show:

| Transcript field | Required value |
| --- | --- |
| `funding.parentFunding.txid` | `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` |
| `funding.parentFunding.vout` | `0` |
| `funding.parentFunding.valueSat` | `100000` |
| `funding.parentFunding.signatureVerifies` | `true` |
| `parent.fundingTxid` | `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` |
| `parent.edgeOutput.valueSat` | `99000` |

Run:

```sh
npm run test:cdlc-smoke
```

The parent CET fixture is considered compatible with the funding artifact only
when `parent.fundingTxid` equals the funding txid above and the parent CET edge
output is still `99000 sat`.

## Boundary

This harness proves that the parent funding output is materialized as a
specific signed Taproot transaction and that the parent CET fixture consumes
that txid/vout. It does not prove public relay, confirmation, fee bumping, or
that the deterministic source prevout exists on any public network.
