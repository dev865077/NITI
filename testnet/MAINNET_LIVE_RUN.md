# Mainnet cDLC Live Run

This guide prepares the smallest mainnet Bitcoin run for the cDLC activation
path:

```text
parent funding -> parent CET -> bridge -> child funding
```

The run uses real sats. It is a technical activation test only, not production
custody software and not a financial product release.

## Preconditions

- A fully synced Bitcoin Core mainnet node.
- RPC credentials in `.env` pointing at the mainnet node.
- A private local artifact directory that is not committed to git.
- A small funding UTXO sent to the generated parent funding address.

The default private artifact path is under `testnet/artifacts/`, which is
ignored by git.

## 1. Create A Private Mainnet Plan

```sh
npm run mainnet:cdlc-plan -- \
  --out testnet/artifacts/mainnet-live-run/private-plan.json
```

This writes local signing secrets for the parent funding key, bridge key,
child funding key, and oracle test keys. Keep this file private.

## 2. Generate The Funding Request

```sh
npm run mainnet:cdlc-funding-request -- \
  --plan testnet/artifacts/mainnet-live-run/private-plan.json \
  --out testnet/artifacts/mainnet-live-run/funding-request.json
```

The output contains:

- the mainnet parent funding address;
- the scriptPubKey expected by the harness;
- the minimum mechanical value for the transaction chain.

Fund the printed address with the smallest amount that is viable under current
mainnet relay fees. The mechanical lower bound is printed as `minimumValueSat`;
current mempool policy may require funding a larger amount so the parent CET
and bridge pass `testmempoolaccept`.

## 3. Dry-Run Against The Funded Outpoint

After the funding transaction is visible to your Bitcoin Core node, run:

```sh
npm run mainnet:cdlc-execute -- \
  --plan testnet/artifacts/mainnet-live-run/private-plan.json \
  --funding-txid <txid> \
  --funding-vout <vout> \
  --funding-value-sat <sat> \
  --out-dir testnet/artifacts/mainnet-live-run
```

Dry-run mode is the default. It verifies the funded outpoint, builds the parent
CET, bridge, child prepared CET, and child refund, checks the parent CET with
Bitcoin Core `testmempoolaccept`, and writes raw transaction artifacts without
broadcasting.

If the funding transaction is not available through `getrawtransaction`, pass:

```sh
--funding-raw-tx-hex <raw_tx_hex>
```

## 4. Broadcast The Mainnet Run

Only after the dry-run output is correct, repeat the command with the explicit
mainnet broadcast flag:

```sh
npm run mainnet:cdlc-execute -- \
  --plan testnet/artifacts/mainnet-live-run/private-plan.json \
  --funding-txid <txid> \
  --funding-vout <vout> \
  --funding-value-sat <sat> \
  --out-dir testnet/artifacts/mainnet-live-run \
  --mainnet-broadcast-i-understand
```

The harness then:

1. checks the parent CET with `testmempoolaccept`;
2. broadcasts the parent CET with `sendrawtransaction`;
3. waits for confirmation;
4. completes the bridge signature with the parent oracle scalar;
5. checks and broadcasts the bridge;
6. waits for confirmation;
7. records the child funding output and prepared child spends.

## Evidence

The run writes:

- raw funding, parent CET, bridge, child prepared CET, and child refund hex;
- a dry-run bundle when no broadcast flag is used;
- a mainnet activation evidence bundle after successful broadcast;
- mempool acceptance data;
- txids and confirmations;
- wrong-scalar rejection evidence.

Do not commit the private plan. Commit only redacted evidence after checking
that it contains no private scalar material.
