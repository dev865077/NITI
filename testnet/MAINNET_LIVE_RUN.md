# Mainnet cDLC Live Run

This guide prepares the smallest mainnet Bitcoin run for the cDLC activation
path:

```text
parent funding -> parent CET -> bridge -> child funding
```

The run uses real sats. It is a technical activation test only, not production
custody software and not a financial product release.

A committed dust-sized Lazy run exists in
[`docs/evidence/lazy-public-mainnet/`](../docs/evidence/lazy-public-mainnet/).
It was executed through the guarded public Esplora path and confirmed on
Bitcoin mainnet. It is evidence of mechanical activation, not evidence of
production readiness.

## Preconditions

- Either a fully synced Bitcoin Core mainnet node or the explicit guarded
  public Esplora backend.
- RPC credentials in `.env` pointing at the mainnet node when Bitcoin Core is
  used.
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
and bridge pass relay policy.

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

For a Lazy `K = 2` dry run through public Esplora instead of local Bitcoin
Core, add the Lazy and explicit Esplora guards:

```sh
npm run mainnet:cdlc-execute -- \
  --lazy \
  --backend esplora \
  --mainnet-esplora-i-understand \
  --plan testnet/artifacts/mainnet-live-run/private-plan.json \
  --funding-txid <txid> \
  --funding-vout <vout> \
  --funding-value-sat <sat> \
  --out-dir testnet/artifacts/mainnet-live-run
```

The Esplora path verifies the funding transaction, output value, scriptPubKey,
and outspend status through the public explorer API. It does not provide local
Bitcoin Core `testmempoolaccept`; when used for broadcast, acceptance is
recorded as the expected txid returned by the public broadcast endpoint.

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

For the Lazy guarded Esplora path, the broadcast command is:

```sh
npm run mainnet:cdlc-execute -- \
  --lazy \
  --backend esplora \
  --mainnet-esplora-i-understand \
  --plan testnet/artifacts/mainnet-live-run/private-plan.json \
  --funding-txid <txid> \
  --funding-vout <vout> \
  --funding-value-sat <sat> \
  --out-dir docs/evidence/lazy-public-mainnet \
  --min-confirmations 1 \
  --wait-seconds 7200 \
  --mainnet-broadcast-i-understand
```

The harness then:

1. verifies the funded outpoint against the selected backend;
2. broadcasts the parent CET through the selected backend;
3. waits for confirmation;
4. completes the bridge signature with the parent oracle scalar;
5. broadcasts the bridge;
6. waits for confirmation;
7. records the child funding output and prepared child spends.

When Bitcoin Core is the backend, the harness also records
`testmempoolaccept` data. When Esplora is the backend, the bundle records the
public broadcast response and observed confirmations.

## Committed Dust Mainnet Lazy Run

The committed mainnet run used a `K = 2` Lazy preparation window:

```text
C_0 active parent
C_1 prepared child
edge E_0_x_to_1
```

| Item | Value |
| --- | --- |
| Funding output | [`d05aa027...67efee3:0`](https://mempool.space/tx/d05aa027f1e046a7deef5f28d11f7b729149293c5eb4eaaac882eaab567efee3), `31,878 sats` |
| Parent CET | [`2abf8200...54775c9`](https://mempool.space/tx/2abf820058b146d32d186a62675990abeedc55971e2c7e2ecadc936b854775c9), block `947247` |
| Bridge | [`2bd5ff8c...e96263af`](https://mempool.space/tx/2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af), block `947248` |
| Child funding output | `2bd5ff8c7010c0b7803137e6e72e0a41ff0357e3bdf0f3a1ed878552e96263af:0`, `30,378 sats` |
| Evidence bundle | [`lazy-activation-evidence-bundle.json`](../docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json) |

Verify the committed bundle:

```sh
npm run test:evidence-bundle -- \
  --bundle docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json
```

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
