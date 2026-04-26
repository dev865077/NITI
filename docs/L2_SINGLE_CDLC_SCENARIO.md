# Layer 2 Single cDLC Scenario

This document defines the canonical Layer 2 v0.1 scenario for one parent DLC
outcome activating one child funding path through one bridge transaction.

It is the scenario contract for issue #66. Later Layer 2 work should implement
or extend this exact case before adding more branches, bilateral negotiation,
or production fee policy.

## Claim

For the activating parent outcome `BTCUSD_ABOVE_STRIKE`, the oracle attestation
scalar completes both:

1. the parent CET signature that spends the parent funding output; and
2. the bridge transaction signature that spends the parent CET edge output into
   the child funding output.

For the non-corresponding outcome `BTCUSD_BELOW_STRIKE`, completion must fail
for both signatures.

The scenario is intentionally single-edge:

```text
parent funding output
  -> parent CET for BTCUSD_ABOVE_STRIKE
  -> bridge transaction
  -> child funding output
```

## Network And Boundary

The canonical fixture uses `testnet4` address encoding because that is the
default public test network target for v0.1. The deterministic smoke harness is
regtest-equivalent: it constructs and verifies transactions locally using a
signed fixture funding transaction and does not claim public mempool relay or
confirmation.

Live regtest/testnet issues may replace only the parent funding txid/vout with
a real funded outpoint. They must preserve the same transaction graph, roles,
outcomes, pass/fail checks, and accounting unless a later issue explicitly
amends this scenario.

## Roles And Fixture Keys

All secrets below are deterministic test fixtures. They are not wallet secrets
and must never be used with mainnet funds.

| Role | Fixture secret | Address | Script pubkey |
| --- | --- | --- | --- |
| Source funding signer | `0x6666666666666666666666666666666666666666666666666666666666666666` | `tb1prtq4raemy34qwdcpry2w7grzvsj8uzp0phc3t0k4ry79pr9vhjzqfjd30x` | `51201ac151f73b246a0737011914ef206264247e082f0df115bed5193c508cacbc84` |
| Parent funding signer | `0x1111111111111111111111111111111111111111111111111111111111111111` | `tb1p9fjtrm3nwhemkjek0wxtswz2glmneu33w9lcylrvd7alttk0psmqds9pcj` | `51202a64b1ee3375f3bb4b367b8cb8384a47f73cf231717f827c6c6fbbf5aecf0c36` |
| Bridge signer | `0x2222222222222222222222222222222222222222222222222222222222222222` | `tb1pvf8l7evgsrnvjsh0e3f8622e0utw2asn0wyt8un8432xshzltqksw4uzcv` | `5120624fff658880e6c942efcc527d29597f16e576137b88b3f267ac54685c5f582d` |
| Child funding signer | `0x3333333333333333333333333333333333333333333333333333333333333333` | `tb1plr5908qjdayaa5ehcxwy7hcur9glqafpvtt2v8c2nc24s4v5899seky47r` | `5120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b` |

Oracle fixture:

| Field | Value |
| --- | --- |
| Oracle secret | `0x4444444444444444444444444444444444444444444444444444444444444444` |
| Oracle nonce secret | `0x5555555555555555555555555555555555555555555555555555555555555555` |
| Event id | `niti-v0.1-parent-cdlc-smoke` |
| Activating outcome | `BTCUSD_ABOVE_STRIKE` |
| Wrong outcome | `BTCUSD_BELOW_STRIKE` |
| Nonce point | `029ac20335eb38768d2052be1dbbc3c8f6178407458e51e6b4ad22f1d91758895b` |
| Oracle public key | `022c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991` |
| Activating attestation point `S_x` | `03a9853a7527b53165a23208738656cb6337d734297173e4939e1d6420f31a1124` |
| Wrong attestation point `S_y` | `036d53cf539f9f0b5480dfa984b6a8c9644dcd86b6deb65911e8b0d1266e554b0b` |

## Transaction Graph

### Parent Funding Output

The deterministic fixture materializes the parent funding output with a signed
Taproot key-path transaction. It starts from this source fixture:

| Field | Value |
| --- | --- |
| Source txid | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |
| Source vout | `0` |
| Source value | `101000 sat` |
| Source spend key | Source funding signer |
| Source signature nonce | `0x7777777777777777777777777777777777777777777777777777777777777777` |

It creates this parent funding output:

| Field | Value |
| --- | --- |
| Funding txid | `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` |
| Funding vout | `0` |
| Funding value | `100000 sat` |
| Funding script | parent funding signer P2TR script pubkey |
| Funding fee | `1000 sat` |
| Signature verifies | `true` |

For live regtest/testnet execution, the source fixture can be replaced by a
real funded Taproot output controlled by the source funding signer. The parent
funding output value must remain `100000 sat` unless the accounting table below
is updated. Downstream parent CET and bridge txids in this document are
deterministic for the fixture funding txid and will change when a live funded
outpoint is substituted.

The parent funding artifact is documented separately in
[`L2_PARENT_FUNDING_HARNESS.md`](L2_PARENT_FUNDING_HARNESS.md).

### Parent CET

The parent CET spends the parent funding output and creates exactly one edge
output for this scenario.

| Field | Value |
| --- | --- |
| Input | parent funding txid `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da:0` |
| Output 0 script | bridge signer P2TR script pubkey |
| Output 0 value | `99000 sat` |
| Fee | `1000 sat` |
| Adaptor point | activating attestation point `S_x` |
| Fixture txid without witness | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |

The completed parent CET txid is equal to the no-witness txid because the
witness is excluded from the SegWit/Taproot transaction id.

### Bridge Transaction

The bridge spends the parent CET edge output and creates the child funding
output.

| Field | Value |
| --- | --- |
| Input | parent CET txid `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d:0` |
| Output 0 script | child funding signer P2TR script pubkey |
| Output 0 value | `98500 sat` |
| Fee | `500 sat` |
| Adaptor point | activating attestation point `S_x` |
| Fixture txid without witness | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |

The completed bridge txid is equal to the no-witness txid for the same reason.

### Child Funding Output

The child funding output is the bridge transaction output `0`:

| Field | Value |
| --- | --- |
| Funding txid | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Funding vout | `0` |
| Funding value | `98500 sat` |
| Funding script | `5120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b` |

## Accounting

All amounts are in satoshis.

| Step | Input value | Output value | Fee | Invariant |
| --- | ---: | ---: | ---: | --- |
| Parent funding | `101000` | `100000` | `1000` | input = output + fee |
| Parent CET | `100000` | `99000` | `1000` | input = output + fee |
| Bridge | `99000` | `98500` | `500` | input = output + fee |
| Child funding | `98500` | `98500` | `0` | bridge output becomes child funding |

The output values are above the conservative Taproot dust floor used by the
harness.

## Timelocks And Refund Discipline

The scenario uses this ordering discipline:

```text
parent refund height < bridge timeout height < child refund height
```

The canonical manifest heights are:

| Object | Height |
| --- | ---: |
| Parent node refund height | `3000000` |
| Bridge timeout height | `3000100` |
| Child node refund height | `3000300` |

Live regtest/testnet execution may translate these into relative heights from
the current chain tip, but it must preserve the ordering and at least the same
100-block parent-to-bridge and 200-block bridge-to-child margins.

The deterministic smoke harness currently proves the activation path and wrong
outcome rejection. Full script-level refund branches are later Layer 2 work and
must not be inferred from this scenario document alone.

## Expected Pass Events

The scenario passes only if all of the following hold:

1. `S_x` and `S_y` are distinct.
2. The parent funding transaction signature verifies.
3. The parent CET consumes funding txid
   `d18aef6402e17e273be7e2ccedc58541fadbed8a3059d2ac97efaee08b5900da` at
   vout `0`.
4. The parent CET adaptor signature verifies before completion using `S_x`.
5. Completing the parent CET with `s_x` produces a valid Taproot signature.
6. The scalar extracted from the completed parent CET signature equals `s_x`.
7. The completed parent CET contains output `0` to the bridge signer for
   `99000 sat`.
8. The bridge adaptor signature verifies before completion using the same
   `S_x`.
9. The bridge input spends the completed parent CET txid at vout `0`.
10. Completing the bridge with `s_x` produces a valid Taproot signature.
11. The scalar extracted from the completed bridge signature equals `s_x`.
12. The completed bridge contains output `0` to the child funding script for
    `98500 sat`.

## Expected Fail Events

The scenario fails closed if any of the following happen:

1. Completing the parent CET adaptor with `s_y` verifies.
2. Completing the bridge adaptor with `s_y` verifies.
3. The parent funding signature does not verify.
4. The parent CET consumes a funding txid/vout different from the canonical
   parent funding output.
5. The parent CET output value is not `99000 sat`.
6. The bridge output value is not `98500 sat`.
7. The bridge spends any outpoint other than the parent CET output `0`.
8. The child funding script is not the child funding signer P2TR script.
9. The oracle scalar extracted from either completed adaptor signature does not
   equal the activating attestation scalar.

Oracle non-publication is not an activation failure. It is a liveness failure:
the bridge remains incomplete and funds must follow the relevant timeout or
refund policy.

## Reproduction

Run:

```sh
npm run test:cdlc-smoke
```

The command emits a deterministic transcript of kind:

```text
niti.v0_1_cdlc_smoke_transcript.v1
```

For the broader local v0.1 gate, run:

```sh
npm run v0.1:verify
```

The canonical scenario is satisfied when the transcript fields match the txids,
amounts, scripts, oracle points, and pass/fail events defined in this document.

## Non-Goals

This scenario does not implement or claim:

- multi-branch cDLC graphs;
- bilateral message exchange;
- production DLC negotiation;
- public testnet confirmation;
- fee bumping, package relay, anchor outputs, or pinning resistance;
- production key storage;
- complete child DLC settlement;
- economic solvency of any financial product.
