# Layer 2 Deterministic E2E Transcript

This document records the externally auditable Layer 2 transcript artifact.

The raw smoke transcript is still emitted as:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

The audit transcript is generated from that raw transcript:

```sh
npm run test:l2-e2e-transcript -- \
  --input testnet/artifacts/cdlc-smoke-transcript.json \
  --out testnet/artifacts/l2-e2e-transcript.json
```

The full v0.1 runner now writes both files:

```sh
npm run v0.1:verify -- --artifacts-dir testnet/artifacts/replay-l2-e2e
```

## Artifact

The audit transcript kind is:

```text
niti.v0_1_l2_e2e_audit_transcript.v1
```

It contains:

- replay commands for a fresh clone;
- the raw transcript kind and boundary;
- a redaction manifest;
- Boolean pass/fail checks;
- the redacted raw cDLC transcript.

The GitHub Actions `v0.1 validation` workflow uploads the audit transcript in
the `v0-1-layer-2-transcripts` artifact, alongside the raw smoke transcript.

## Redaction Boundary

The audit transcript keeps public verification material:

- public keys and script pubkeys;
- oracle nonce points and attestation points;
- attestation-derived public scalar evidence;
- adaptor points;
- transaction ids;
- raw completed transactions;
- signatures;
- sighashes;
- locktime and sequence evidence;
- deterministic chain-simulation records.

It redacts only deterministic test-only adaptor nonce secrets:

```text
selectedAdaptorNonceSecretHex
```

Those nonce secrets are not needed to replay the pass/fail results, and they
should not be normalized as publishable evidence even though they are test
fixtures.

## Replay Check

A fresh clone should be able to run:

```sh
npm ci
npm run v0.1:verify -- --artifacts-dir testnet/artifacts/replay-l2-e2e
jq -e '.checks | all(. == true)' testnet/artifacts/replay-l2-e2e/l2-e2e-transcript.json
```

The last command must print:

```text
true
```

## Required Checks

The generated transcript records these checks under `checks`:

```text
fundingSignatureVerifies
parentCetStableTxid
parentCetCompletedSignatureVerifies
parentWrongOutcomeRejected
parentConfirmed
parentEdgeRefundEarlyRejected
parentEdgeRefundMatureAccepted
bridgeSpendsParentCet
bridgeStableTxid
bridgeCompletedSignatureVerifies
bridgeWrongScalarRejected
bridgeConfirmed
childFundingVisible
childPreparedCetConsumesFunding
childPreparedCetAdaptorVerifies
childPreparedCetPreResolutionIncomplete
childPreparedRefundConsumesFunding
childPreparedRefundSignatureVerifies
childPreparedRefundIsTimelocked
chainSimulationLeavesChildFundingUnspent
```

Every value must be `true`.

## Boundary

This transcript is deterministic and regtest-equivalent. It proves replayable
transaction construction, signature/adaptor verification, wrong-outcome
rejection, confirmation simulation, and prepared refund/CET paths for the
single-parent/single-child Layer 2 scenario. It does not prove public mempool
relay, fee-market inclusion, pinning resistance, reorg handling, production
key custody, bilateral negotiation, or live testnet/signet broadcast.
