# Economic Stress Go/No-Go

The current parameter set is **NO-GO** for a long-running public testnet pilot
that represents stable-value product behavior.

This decision does not affect the cDLC activation primitive. It applies only to
the tested financial-product parameters.

## Gate Criteria

| Criterion | Required threshold | Observed | Result |
| --- | --- | --- | --- |
| Historical 2022 path has no holder shortfall | `0` cents shortfall | `0` cents | Pass |
| 70% overnight gap has no holder shortfall | `0` cents shortfall | `580484` cents | Fail |
| Fee reserve covers required relay fee | `feeReserveSat >= requiredRelayFeeSat` | `25000 / 140000` sat | Fail |
| Oracle and confirmation delay fit bridge timeout | `actionDelayBlocks < bridgeTimeoutBlocks < childRefundTimeoutBlocks` | `1494 < 144 < 180` | Fail |

## Decision

```text
long_running_pilot = NO_GO
```

The blocking reasons are:

- the 70% gap scenario creates holder shortfall;
- the delayed-oracle fee-spike scenario exhausts the fee reserve;
- the delayed-oracle fee-spike scenario creates a timeout race.

## Required Changes Before Reconsideration

At least one of the following must change before the same product class can be
considered for a long-running pilot:

- larger collateral or lower stable target;
- earlier liquidation threshold;
- explicit gap-risk reserve;
- larger fee reserve;
- longer bridge and child refund timeouts;
- faster oracle attestation policy;
- product terms that explicitly allocate shortfall rather than promising par
  recovery.

The stress suite must be rerun after any parameter change:

```sh
npm run test:economic-stress
```

## Evidence

- [`docs/ECONOMIC_STRESS_REPORT.md`](ECONOMIC_STRESS_REPORT.md)
- [`docs/evidence/economic-stress/economic-stress-results.json`](evidence/economic-stress/economic-stress-results.json)
- [`testnet/src/economic-stress.ts`](../testnet/src/economic-stress.ts)
- [`testnet/src/economic-stress-test.ts`](../testnet/src/economic-stress-test.ts)
- [`testnet/fixtures/economic-stress/btc-usd-gemini-2022-daily.json`](../testnet/fixtures/economic-stress/btc-usd-gemini-2022-daily.json)
