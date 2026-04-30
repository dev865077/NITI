# Public Signet/Testnet cDLC Evidence

This guide is the public-network layer above the Bitcoin Core regtest bundle.

The workflow does not mine blocks locally. It requires a synced Bitcoin Core
node on `signet`, `testnet`, or `testnet4`, with `txindex=1`, and a funded
Taproot output controlled by the test-only cDLC harness key.

## 1. Generate Funding Request

```sh
npm run public:cdlc-funding-request -- \
  --network signet \
  --out testnet/artifacts/public-signet-funding-request.json
```

The request prints:

- public network;
- funding address;
- scriptPubKey;
- executable minimum value in sats and BTC;
- deterministic fixture value used by the stable local docs;
- the exact follow-up command.

The deterministic address is testnet/signet only. Never send mainnet BTC to
any address produced by this harness.

## 2. Fund And Wait For Confirmation

Fund the printed address with at least the executable minimum. For signet, a
public faucet or a manually controlled signet wallet can be used. The harness
will not proceed until the funded UTXO has the requested confirmation count.

The executable minimum is derived from the public activation path:

```text
V_min = max(
  parent_cet_fee + dust,
  parent_cet_fee + bridge_fee + dust,
  parent_cet_fee + bridge_fee + child_cet_fee + dust,
  parent_cet_fee + bridge_fee + child_refund_fee + dust
)
```

With the current canonical fees and the conservative Taproot dust floor, this
is lower than the 100,000 sat deterministic fixture size used in the local
documentation. The fixture size is intentionally retained for stable local
artifacts; it is not the public faucet funding minimum.

The Bitcoin Core RPC node must be synced and configured through `.env`:

```text
BITCOIN_RPC_URL=http://127.0.0.1:38332
BITCOIN_RPC_USER=...
BITCOIN_RPC_PASSWORD=...
```

Use the RPC port and credentials for the public network being tested.

## 3. Execute Activation

```sh
npm run public:cdlc-execute -- \
  --network signet \
  --out-dir docs/evidence/public-signet \
  --min-confirmations 1 \
  --wait-seconds 7200
```

The command:

1. scans the UTXO set for the funded parent address;
2. builds the parent CET from the funded UTXO;
3. rejects completion with the wrong oracle scalar;
4. broadcasts the completed parent CET;
5. waits for observed confirmation;
6. builds and broadcasts the bridge transaction;
7. waits for observed confirmation;
8. prepares child CET and child refund transactions;
9. records raw tx files, txids, block hashes, and signature-state boundaries.

## Lazy Bounded-Window Run

The Lazy runner uses the same public-network path, but records an explicit
`K = 2` preparation window:

```text
C_0 active parent
C_1 prepared child
edge E_0_x_to_1
```

Before the parent CET is completed with the oracle scalar, the runner prepares:

- the parent CET adaptor spend;
- the bridge adaptor spend from `C_0` to `C_1`;
- the child CET adaptor spend;
- the child timelocked refund.

Then the parent oracle scalar completes both the parent CET and the bridge
signature. The bundle records the Lazy window manifest and checks that the
child prepared spend consumes the bridge output identified before bridge
witness completion.

```sh
npm run public:lazy-cdlc-funding-request -- \
  --network signet \
  --out testnet/artifacts/lazy-public-signet-funding-request.json

npm run public:lazy-cdlc-execute -- \
  --network signet \
  --out-dir docs/evidence/lazy-public-signet \
  --min-confirmations 1 \
  --wait-seconds 7200
```

The Lazy evidence bundle is verified with the same verifier:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-signet/lazy-activation-evidence-bundle.json
```

## Committed Lazy Public Runs

Two Lazy bounded-window public-network runs are committed:

| Network | Parent funding | Parent CET | Bridge | Child funding output | Bundle |
| --- | --- | --- | --- | --- | --- |
| Signet | [`49f1dc18...3958bf92`](https://mempool.space/signet/tx/49f1dc1897ffd93dd2e7c97d7fadac511a6e067c6b70f213ead0733d3958bf92) | [`be667402...cf34f225`](https://mempool.space/signet/tx/be6674029b01d39ddc04a0ace79d6b3725bcb2ed7ad6d623c2d0229bcf34f225) | [`c33346d4...f3b3c097`](https://mempool.space/signet/tx/c33346d461f408ef4b0a463e0d4b63498d29b69eca34dc61359f8460f3b3c097) | `c33346d4...f3b3c097:0`, 8,500 sats | [`docs/evidence/lazy-public-signet/`](../docs/evidence/lazy-public-signet/) |
| Testnet | [`fb1cd26f...b74c79b9`](https://mempool.space/testnet/tx/fb1cd26fd4723f55a986e93a4a6c4d53a34e395e7c5dc91bc71181aeb74c79b9) | [`f2e08e70...8dd18d7d`](https://mempool.space/testnet/tx/f2e08e70ec1135cea46b41dbbddbff24a9dc0030b1ae0743376d6d598dd18d7d) | [`63dc4419...27507e13`](https://mempool.space/testnet/tx/63dc4419059c28306794cd95179e6c8adcc553f788fb2b1c52e988fa27507e13) | `63dc4419...27507e13:0`, 227,663 sats | [`docs/evidence/lazy-public-testnet/`](../docs/evidence/lazy-public-testnet/) |

## 4. Verify Bundle

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/public-signet/public-activation-evidence-bundle.json
```

The verifier checks raw transaction files, txids, input/output continuity,
signature-state boundaries, and bundle checks.

## Boundary

Public signet/testnet evidence is stronger than the deterministic regtest
bundle because confirmations come from a public network. It is still not
mainnet evidence, not a fee-policy guarantee, and not a production wallet
integration.
