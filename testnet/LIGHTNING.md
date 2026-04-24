# Lightning cDLC Test Harness

This harness prepares a real Lightning hold-invoice test for the HTLC form of
the cDLC Lightning extension.

The tested flow is:

```text
oracle precommits to h_x = SHA256(s_x)
receiver creates a hold invoice locked to h_x
payer pays the invoice and waits
oracle attests outcome x and reveals s_x
receiver settles the hold invoice with s_x
```

This is testnet/regtest software only. Mutating LND commands require
`--allow-live-lnd`.

## Requirements

- two funded LND nodes with a channel between them;
- REST enabled on both nodes;
- invoice macaroon for the receiver;
- payment/admin macaroon for the payer;
- TLS cert path or explicit insecure TLS for local regtest only.

Copy the environment template and fill the LND values:

```sh
cp testnet/.env.example .env
```

Check local configuration without touching LND:

```sh
npm run testnet -- lightning:lnd:doctor --role receiver
npm run testnet -- lightning:lnd:doctor --role payer
```

Check live connectivity:

```sh
npm run testnet -- lightning:lnd:doctor --role receiver --connect
npm run testnet -- lightning:lnd:doctor --role payer --connect
```

## Offline Smoke Test

Run the deterministic Lightning mock flow:

```sh
npm run test:lightning
npm run testnet -- lightning:mock-run
```

## Manifest

Generate and validate a Lightning manifest:

```sh
npm run testnet -- lightning:manifest:sample \
  --network regtest \
  --out testnet/artifacts/lightning-manifest.json

npm run testnet -- lightning:manifest:validate \
  --file testnet/artifacts/lightning-manifest.json
```

## Real LND Flow

Prepare the oracle lock. This gives the receiver the payment hash before the
outcome is known.

```sh
npm run testnet -- lightning:oracle-lock \
  --event-id niti-lightning-regtest-1 \
  --outcome BTCUSD_ABOVE_STRIKE \
  --include-test-secrets \
  --out testnet/artifacts/lightning-lock.json
```

Create the receiver hold invoice:

```sh
npm run testnet -- lightning:lnd:create-hold-invoice \
  --role receiver \
  --lock testnet/artifacts/lightning-lock.json \
  --amount-msat 1000 \
  --memo "NITI cDLC Lightning test" \
  --expiry-seconds 900 \
  --allow-live-lnd \
  --out testnet/artifacts/lightning-invoice.json
```

Start payment from the payer node. This may wait until the receiver settles the
hold invoice.

```sh
npm run testnet -- lightning:lnd:pay-invoice \
  --role payer \
  --invoice testnet/artifacts/lightning-invoice.json \
  --fee-limit-sat 10 \
  --allow-live-lnd \
  --out testnet/artifacts/lightning-payment.json
```

In another terminal, publish the oracle attestation:

```sh
npm run testnet -- lightning:oracle-attest \
  --event-id niti-lightning-regtest-1 \
  --outcome BTCUSD_ABOVE_STRIKE \
  --oracle-secret-hex <oracleSecretHex> \
  --nonce-secret-hex <nonceSecretHex> \
  --expected-payment-hash-hex <paymentHashHex> \
  --out testnet/artifacts/lightning-attestation.json
```

Settle the hold invoice with the oracle attestation scalar:

```sh
npm run testnet -- lightning:lnd:settle-invoice \
  --role receiver \
  --attestation testnet/artifacts/lightning-attestation.json \
  --allow-live-lnd \
  --out testnet/artifacts/lightning-settlement.json
```

Lookup the invoice:

```sh
npm run testnet -- lightning:lnd:lookup-invoice \
  --role receiver \
  --payment-hash-hex <paymentHashHex>
```

Cancel an unsettled hold invoice if needed:

```sh
npm run testnet -- lightning:lnd:cancel-invoice \
  --role receiver \
  --payment-hash-hex <paymentHashHex> \
  --allow-live-lnd
```

## Scope

This harness proves operational readiness for the HTLC-compatible cDLC
Lightning path. It does not implement PTLCs on production Lightning, and it
does not prove or replace LND's channel state machine, routing, force-close,
watchtower, liquidity, or fee behavior.
