# NITI Evidence Infomercial

Single-page evidence presentation for the testnet/signet cDLC product demo.

The page is intentionally separate from the technical research site. It presents
the cDLC activation path as a scrolling multimedia story and uses committed
public evidence bundles for the transaction data.

## Run

```sh
npm run evidence-site:build
npm run evidence-site:serve
```

Open:

```text
http://127.0.0.1:4174
```

## Evidence Sources

- `docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json`
- `docs/evidence/lazy-public-testnet/lazy-activation-evidence-bundle.json`
- `docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`
- `docs/evidence/economic-stress/economic-stress-results.json`
- `cdlc-lean/PROOF_INVENTORY.md`

The primary demo path uses signet/testnet. Mainnet evidence appears only as a
historical artifact and not as a call to use real funds.

## Boundary

The product card is an educational testnet dollar-exposure demo. It is not a
stablecoin, not a promise of redemption, not investment advice, and not
production custody software.
