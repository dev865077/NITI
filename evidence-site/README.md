# NITI Evidence Reel

Single-page signet/testnet evidence reel for explaining a cDLC activation from
real transaction screenshots.

The page starts from the bridge transaction screenshot and works backward into
the protocol: parent funding, oracle attestation, parent CET, bridge completion,
child funding, failure paths, retainer holders, and terminal replay.

## Run

```sh
npm run evidence-site:build
npm run evidence-site:serve
```

Open:

```text
http://127.0.0.1:4174
```

## Visual Evidence

- `assets/mempool/parent-funding.png`
- `assets/mempool/parent-cet.png`
- `assets/mempool/bridge.png`

These screenshots are communication assets captured from `mempool.space/signet`.
The authoritative evidence remains the committed bundles and explorer txids.

## Evidence Sources

- `docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json`
- `docs/evidence/lazy-public-signet/lazy-activation-evidence-bundle.json`
- `docs/evidence/lazy-public-testnet/lazy-activation-evidence-bundle.json`
- `docs/evidence/lazy-public-mainnet/lazy-activation-evidence-bundle.json`
- `docs/evidence/economic-stress/economic-stress-results.json`
- `cdlc-lean/PROOF_INVENTORY.md`

Mainnet evidence appears only as historical context. The interactive flow is
signet/testnet only.

## Boundary

The product card is an educational testnet dollar-exposure demo. It is not a
stablecoin, not a redemption promise, not investment advice, not a mainnet
deposit flow, and not production custody software.
