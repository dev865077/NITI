# Layer 2 Bridge Confirmation Simulation

This document records the deterministic bridge confirmation artifact for issue
#72. The v0.1 harness does not depend on public testnet faucet, mempool, or
local `bitcoind` availability; instead it records a deterministic
regtest-equivalent confirmation transcript for the completed bridge
transaction.

The artifact is emitted in the deterministic cDLC smoke transcript:

```sh
npm run --silent test:cdlc-smoke > testnet/artifacts/cdlc-smoke-transcript.json
```

## Confirmation Record

| Field | Value |
| --- | --- |
| Mode | `deterministic-regtest-equivalent` |
| Bridge txid | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6` |
| Simulated block height | `3000002` |
| Simulated block hash | `82e8a1ac88ad45675e7db99a188cea71c842d6e60374d1bf72be320f9d621bc1` |
| Confirmations | `1` |
| Parent edge spent | `4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d:0` |
| Child funding outpoint | `c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6:0` |
| Child funding value | `98500 sat` |
| Child funding script | `5120f8e8579c126f49ded337c19c4f5f1c1951f0752162d6a61f0a9e15585594394b` |
| Child funding outpoint exists | `true` |
| Child funding outpoint unspent | `true` |

The transcript records the same value at:

```text
bridge.confirmation
chainSimulation.blocks[1]
chainSimulation.unspentOutputs[0]
child.confirmedByBridge
child.fundingOutpointExists
child.fundingOutpointUnspent
```

## Confirmation Invariants

The bridge is considered confirmed into child funding only when:

```text
parent.confirmation.confirmations >= 1
bridge.confirmation.txid = bridge.completedTxid
bridge.confirmation.blockHeight > parent.confirmation.blockHeight
bridge.confirmation.spendsParentEdgeOutput.txid = parent.cetCompletedTxid
bridge.confirmation.spendsParentEdgeOutput.vout = 0
bridge.confirmation.createsChildFundingOutput.txid = bridge.completedTxid
bridge.confirmation.createsChildFundingOutput.vout = 0
bridge.confirmation.childFundingOutpointExists = true
bridge.confirmation.childFundingOutpointUnspent = true
```

For the canonical fixture, the bridge spends:

```text
4022f2d86e4d433bfee78db9572c57598f5c1756625a6fc32d5e0a7aea4ed43d:0
```

and leaves this child funding outpoint unspent:

```text
c67a49c69e90becc5dafcb3cbd4d954431a9029576c99bf2c2a25ac8f2a243e6:0
```

## Why Simulation

Public testnet/signet broadcast is useful evidence, but it is not deterministic
enough for the default CI gate. Faucet availability, fee market state, mempool
policy, node version, and network connectivity are external variables.

The deterministic confirmation transcript is therefore the v0.1 CI artifact.
Live regtest or public testnet evidence can later replace or supplement it
without changing the cDLC transaction logic.

## Boundary

This artifact proves that the completed bridge enters the deterministic chain
simulator, spends the parent edge output, and leaves the child funding outpoint
available for the next cDLC state. It does not prove public network relay,
block inclusion by Bitcoin Core, fee bumping, pinning resistance, reorg
handling, or child oracle settlement.
