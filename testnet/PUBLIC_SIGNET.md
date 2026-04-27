# Public Signet/Testnet cDLC Evidence

This guide is the public-network layer above the Bitcoin Core regtest bundle.
It is intended for issue #153 and the open #56 Layer 2 EPIC.

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
