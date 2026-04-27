# Deterministic Regtest Environment

This guide defines the controlled Bitcoin Core environment for v0.1 testnet
preparation. It is not a public-network claim. Its purpose is to make funding,
confirmation, and replay independent of faucet availability, miner behavior,
or public testnet mempool policy.

## Requirements

- Bitcoin Core with `bitcoind` and `bitcoin-cli` on `PATH`.
- Node.js dependencies installed with `npm ci`.

The helper script writes all node state under `testnet/artifacts/regtest-node`
by default. That directory is ignored by Git.

## Start

```sh
scripts/regtest-env.sh start
scripts/regtest-env.sh env > .env
npm run testnet -- rpc:info
```

`start` creates or loads wallet `niti-regtest`, mines enough blocks to mature
coinbase funds, and writes:

```text
testnet/artifacts/regtest-env.json
```

## Deterministic Funding Flow

Generate a regtest Taproot wallet:

```sh
npm run testnet -- wallet:new \
  --network regtest \
  --out testnet/artifacts/regtest-wallet.json
```

Fund the printed address and mine one confirmation:

```sh
scripts/regtest-env.sh fund-address <bcrt1p...> 0.001 \
  > testnet/artifacts/regtest-funding.json
```

Scan the address through the same RPC path used by public testnet/signet:

```sh
npm run testnet -- rpc:scan-address --address <bcrt1p...>
```

From that point, the normal Taproot adaptor flow in `testnet/README.md` can be
run against the deterministic regtest UTXO. Broadcast remains explicit:

```sh
npm run testnet -- rpc:broadcast \
  --raw-tx-file testnet/artifacts/completed-spend.hex \
  --allow-broadcast
```

## cDLC Evidence Bundle

Issue #132 is generated against the same Bitcoin Core regtest RPC path:

```sh
scripts/regtest-env.sh start
scripts/regtest-env.sh env > .env
npm run regtest:cdlc-evidence -- --out-dir docs/evidence/issue-132-regtest
npm run test:evidence-bundle -- --bundle docs/evidence/issue-132-regtest/tx-evidence-bundle.json
```

The bundle records real regtest `sendrawtransaction`, `testmempoolaccept`,
mining, and confirmation evidence. It is still not public testnet/signet relay
evidence.

## Public Testnet Divergence

Regtest controls:

- funding UTXOs;
- block production;
- confirmation timing;
- replays of the same command sequence.

Public testnet or signet does not control:

- faucet availability;
- miner/relay policy;
- fee spikes;
- mempool eviction;
- third-party chain reorganizations;
- transaction pinning attempts.

For v0.1, public testnet evidence should be treated as an evidence bundle on
top of the deterministic gate, not as the only release gate.

## Useful Commands

```sh
scripts/regtest-env.sh info
scripts/regtest-env.sh mine 1
scripts/regtest-env.sh stop
scripts/regtest-env.sh reset
```

`reset` deletes the local regtest data directory. Do not use it if you need to
preserve an evidence transcript.
