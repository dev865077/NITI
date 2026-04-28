# Layer 2 Parent CET Confirmation Simulation

This document records the deterministic parent CET confirmation artifact. The
v0.1 harness does not depend on public testnet faucet, mempool, or local
`bitcoind` availability; instead it records a deterministic regtest-equivalent
confirmation transcript for the selected parent outcome.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Confirmation Record

| Field | Value |
| --- | --- |
| Mode | `deterministic-regtest-equivalent` |
| Parent CET txid | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d` |
| Simulated block height | `3000001` |
| Simulated block hash | `f128de18be5a9bff64b277c171addf5e1d8128d6cef12e8bd79c558bf1edf3c0` |
| Confirmations | `1` |
| Spendable by bridge | `true` |

The transcript records the same value at:

```text
parent.confirmation
chainSimulation.blocks[0]
```

## Bridge Spendability

The parent CET is considered spendable by the bridge only when:

```text
parent.confirmation.txid = parent.cetCompletedTxid
parent.confirmation.confirmations >= 1
parent.confirmation.spendableByBridge = true
bridge.sighashInputs[0].txid = parent.cetCompletedTxid
bridge.sighashInputs[0].vout = 0
```

For the canonical fixture this means the bridge spends:

```text
4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d:0
```

## Why Simulation

Public testnet/signet broadcast is useful evidence, but it is not deterministic
enough for the default CI gate. Faucet availability, fee market state, mempool
policy, node version, and network connectivity are external variables.

The deterministic confirmation transcript is therefore the v0.1 CI artifact.
Live regtest or public testnet evidence can later replace or supplement it
without changing the cDLC transaction logic.

## Boundary

This artifact proves that the selected parent outcome enters the deterministic
chain simulator and becomes spendable by the bridge fixture. It does not prove
public network relay, block inclusion by Bitcoin Core, fee bumping, pinning
resistance, or reorg handling.
