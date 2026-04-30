# Security Notes

NITI is research software. It is not production-ready.

## Do Not Use Production Funds

The repository contains a guarded dust-sized mainnet activation run. That run is
evidence of mechanical cDLC activation, not evidence of custody safety, wallet
safety, product safety, or fee-policy hardening.

Do not use this repository with production funds. Do not reuse generated test
keys or harness keys for production custody.

The Lightning harness can call live LND REST endpoints. Commands that create,
pay, settle, or cancel invoices require `--allow-live-lnd`. Use it only with
regtest, signet, or testnet nodes.

## Broadcast Safety

Mainnet broadcast paths require explicit acknowledgement flags. The guarded
Esplora path requires `--mainnet-esplora-i-understand`, and mainnet broadcast
requires `--mainnet-broadcast-i-understand`.

Mutating Lightning commands refuse to call LND unless `--allow-live-lnd` is
explicitly provided.

## What The Current Code Tests

The current harness tests:

- BIP340-style oracle attestation;
- adaptor signature verification;
- completion of a Taproot key-path witness after attestation;
- extraction of the hidden scalar from a completed signature;
- parent CET -> bridge -> child funding activation;
- Lazy `K = 2` public-network activation evidence;
- finite Lazy window, edge-locality, compression, liveness fallback, and loan
  rollover models in SPARK/Ada;
- finite graph manifest validation in Ada;
- LND hold-invoice artifacts for the Lightning HTLC extension;
- offline Lightning mock settlement using the oracle attestation scalar.

## What It Does Not Yet Secure

- production key storage;
- multi-party negotiation;
- full DLC state machines;
- production Lazy window synchronization and recovery;
- production Lightning channel state-machine safety;
- route liquidity, force-close, and watchtower behavior;
- CPFP/anchor fee strategy;
- mempool pinning resistance;
- oracle equivocation handling beyond cryptographic evidence;
- regulatory compliance.

## Secret Handling

`.env`, `testnet/artifacts/`, build outputs, and proof outputs are ignored by
Git. Before publishing or committing, run:

```sh
find testnet/artifacts -maxdepth 1 -type f -not -name .gitkeep -print
test ! -f .env && echo ".env absent"
```
