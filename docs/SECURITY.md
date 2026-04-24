# Security Notes

NITI is research software. It is not mainnet-ready.

## Do Not Use Mainnet Funds

The testnet harness prints and stores testnet secrets when requested. Never reuse
generated testnet keys on mainnet.

## Broadcast Safety

The CLI refuses to broadcast unless `--allow-broadcast` is explicitly provided.

## What The Current Code Tests

The current harness tests:

- BIP340-style oracle attestation;
- adaptor signature verification;
- completion of a Taproot key-path witness after attestation;
- extraction of the hidden scalar from a completed signature;
- finite graph manifest validation in Ada.

## What It Does Not Yet Secure

- production key storage;
- multi-party negotiation;
- full DLC state machines;
- full parent CET -> bridge -> child funding graph construction;
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
