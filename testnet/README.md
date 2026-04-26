# NITI cDLC Testnet Harness

This harness is for testnet/signet/regtest validation only. Do not use these
commands or generated secrets on mainnet.

## What This Tests

The first real Bitcoin-facing experiment is intentionally narrow:

1. Generate a Taproot testnet address.
2. Fund it with testnet coins.
3. Build a Taproot key-path spend whose Schnorr signature is an adaptor
   signature.
4. Complete that signature with a DLC-style oracle attestation scalar.
5. Broadcast only when `--allow-broadcast` is explicitly provided.

This validates the core cDLC activation primitive on a real Bitcoin transaction:
an oracle attestation scalar turns an incomplete adaptor signature into a valid
Taproot witness.

The Ada validator checks a canonical cDLC graph manifest: node ids, dust floors,
edge references, bridge values, timelock ordering, and acyclicity.

The Lightning harness prepares an LND hold-invoice test where the oracle
attestation scalar is the invoice preimage. See [`LIGHTNING.md`](LIGHTNING.md).

For controlled Bitcoin Core execution that avoids faucet and public mempool
variance, use the deterministic regtest guide in [`REGTEST.md`](REGTEST.md).

## Build And Offline Test

```sh
npm run build
npm run ada:build
npm run test:offline
npm run test:lightning
npm run test:cdlc-smoke
npm run v0.1:verify -- --skip-spark
npm run testnet -- manifest:sample --network testnet4 --out testnet/examples/sample-manifest.json
npm run testnet -- manifest:validate --file testnet/examples/sample-manifest.json
```

Expected offline result:

```json
{
  "oracleSignatureVerifies": true,
  "adaptorVerifies": true,
  "completedSignatureVerifies": true
}
```

The v0.1 cDLC smoke test is the mandatory release-gate command for the
single-parent/single-child path:

```sh
npm run test:cdlc-smoke
```

The canonical fixture, transaction graph, amounts, timelock ordering, and
expected pass/fail criteria are specified in
[`docs/L2_SINGLE_CDLC_SCENARIO.md`](../docs/L2_SINGLE_CDLC_SCENARIO.md).
The parent CET evidence fields are specified in
[`docs/L2_PARENT_CET_HARNESS.md`](../docs/L2_PARENT_CET_HARNESS.md).
The bridge transaction evidence fields are specified in
[`docs/L2_BRIDGE_HARNESS.md`](../docs/L2_BRIDGE_HARNESS.md).
The bridge adaptor completion evidence fields are specified in
[`docs/L2_BRIDGE_ADAPTOR_COMPLETION.md`](../docs/L2_BRIDGE_ADAPTOR_COMPLETION.md).
The parent CET confirmation simulation is specified in
[`docs/L2_PARENT_CET_CONFIRMATION.md`](../docs/L2_PARENT_CET_CONFIRMATION.md).

It produces a deterministic regtest-equivalent transcript with:

- a signed parent funding transaction fixture and known parent funding
  txid/vout;
- a parent CET whose adaptor witness is completed by the oracle scalar;
- a materialized parent edge output;
- an oracle announcement/attestation for the activating outcome;
- a bridge transaction whose adaptor signature is completed by the parent
  oracle scalar;
- a visible child funding output in the completed bridge transaction;
- a paired wrong-outcome negative check that must fail before the test passes.

This command does not claim public testnet confirmation. Public broadcast is a
separate Layer 2 artifact because mempool and faucet availability are external
conditions.

To emit only the parent funding artifact required by the Layer 2 funding
harness:

```sh
npm run testnet -- cdlc:parent-funding \
  --network testnet4 \
  --out testnet/artifacts/parent-funding.json \
  --raw-out testnet/artifacts/parent-funding.hex
```

The expected funding output is documented in
[`docs/L2_PARENT_FUNDING_HARNESS.md`](../docs/L2_PARENT_FUNDING_HARNESS.md).

## RPC Configuration

Copy the example and fill in your local Bitcoin Core testnet/signet RPC values:

```sh
cp testnet/.env.example .env
npm run testnet -- config:check
npm run testnet -- rpc:info
```

Use the RPC URL that matches your node. Common defaults are:

- testnet: `http://127.0.0.1:18332`
- signet: `http://127.0.0.1:38332`
- regtest: `http://127.0.0.1:18443`
- testnet4: set the RPC port used by your Bitcoin Core build/config

For deterministic regtest, the helper can generate the `.env` values:

```sh
scripts/regtest-env.sh start
scripts/regtest-env.sh env > .env
```

## Testnet Flow

Generate a testnet Taproot wallet:

```sh
npm run testnet -- wallet:new --network testnet4 --out testnet/artifacts/wallet.json
```

Fund the printed `address` with testnet coins, then scan it:

```sh
npm run testnet -- rpc:scan-address --address <tb1p...>
```

Prepare an oracle outcome:

```sh
npm run testnet -- oracle:prepare \
  --event-id niti-demo-1 \
  --outcome BTCUSD_ABOVE_STRIKE \
  --out testnet/artifacts/oracle-prepared.json
```

Prepare the Taproot adaptor spend from a funded UTXO:

```sh
npm run testnet -- taproot:prepare \
  --network testnet4 \
  --signer-output-secret-hex <wallet.outputSecretHex> \
  --signer-script-pubkey-hex <wallet.scriptPubKeyHex> \
  --utxo-txid <funding_txid> \
  --utxo-vout <vout> \
  --utxo-value-sat <value_sat> \
  --destination <testnet_destination_address> \
  --fee-sat 500 \
  --adaptor-point-hex <oracle.attestationPointCompressedHex> \
  --out testnet/artifacts/pending-spend.json
```

Attest the oracle outcome:

```sh
npm run testnet -- oracle:attest \
  --event-id niti-demo-1 \
  --outcome BTCUSD_ABOVE_STRIKE \
  --oracle-secret-hex <oracle.oracleSecretHex> \
  --nonce-secret-hex <oracle.nonceSecretHex> \
  --out testnet/artifacts/oracle-attestation.json
```

Complete the transaction:

```sh
npm run testnet -- taproot:complete \
  --pending testnet/artifacts/pending-spend.json \
  --attestation-secret-hex <attestation.attestationSecretHex> \
  --out testnet/artifacts/completed-spend.json \
  --raw-out testnet/artifacts/completed-spend.hex
```

Broadcast is deliberately opt-in:

```sh
npm run testnet -- rpc:broadcast \
  --raw-tx-file testnet/artifacts/completed-spend.hex \
  --allow-broadcast
```

## Current Boundary

Implemented:

- Taproot key-path adaptor signature over real BIP340/Taproot sighash.
- Oracle prepare/attest flow using the BIP340 equation.
- Bitcoin Core JSON-RPC client for info, scan, and broadcast.
- Ada manifest validator for finite cDLC graphs.
- Deterministic signed Taproot parent funding transaction fixture consumed by
  the parent CET smoke path.
- Parent CET transcript fields for serialized unsigned/completed tx, stable
  txid, sighash inputs, edge output map, and bridge reference.
- Bridge transcript fields for serialized unsigned/completed tx, stable txid,
  parent edge input, and child funding output map.
- Bridge adaptor transcript fields for pre-resolution signature failure,
  correct scalar completion, scalar extraction, and wrong scalar rejection.
- Deterministic parent CET confirmation transcript showing the parent outcome
  output is spendable by the bridge.
- Offline test proving that completed adaptor witness verifies.
- Deterministic v0.1 smoke test for one parent CET edge, one bridge transaction,
  one child funding output, and wrong-outcome non-activation.
- LND REST hold-invoice preparation for the Lightning HTLC extension.
- Offline Lightning mock proving that the oracle scalar matches the payment
  hash and settles the prepared condition.

Not implemented yet:

- Full bilateral DLC negotiation.
- Full live-broadcast parent CET -> bridge -> child funding transaction graph.
- Fee bump/anchor policy.
- Production Lightning channel state machines, force-close behavior, watchtowers,
  route liquidity, or PTLC deployment.
- Multi-oracle threshold attestations.
- Production key storage.
