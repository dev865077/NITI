# Economic Stress Evidence

This directory contains deterministic economic-stress output for a
BTC-collateralized synthetic stable-value claim.

Current artifact:

| File | Meaning |
| --- | --- |
| [`economic-stress-results.json`](economic-stress-results.json) | Scenario results, pass/fail fields, liquidation timing, holder recovery, shortfall, fee/timelock checks, and go/no-go criteria. |

Regenerate the artifact with:

```sh
npm run economic-stress:write-evidence
```

Verify the artifact with:

```sh
npm run test:economic-stress
```

The test compares the generated report with the committed JSON snapshot.
