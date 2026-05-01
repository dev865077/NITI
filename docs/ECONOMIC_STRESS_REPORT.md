# Economic Stress Report

This report records deterministic product-level stress results for a
BTC-collateralized synthetic stable-value claim. It is not part of the cDLC
activation proof. It tests whether a candidate product parameter set survives
historical and adversarial market paths after fees, oracle delay, and timelock
assumptions are applied.

The tested payoff is the integer stable-claim formula:

```text
StableClaim(Q, D, P) = min(Q, ceil(D * 100_000_000 / P))
```

where `Q` is BTC collateral in satoshis, `D` is the target value in cents, and
`P` is the BTC/USD settlement price in cents per BTC.

## Reproduction

```sh
npm run test:economic-stress
```

The committed machine-readable report is
[`docs/evidence/economic-stress/economic-stress-results.json`](evidence/economic-stress/economic-stress-results.json).

To regenerate it:

```sh
npm run economic-stress:write-evidence
```

## Dataset

| Field | Value |
| --- | --- |
| Source | CryptoDataDownload Gemini BTC/USD daily CSV |
| Source URL | `https://www.cryptodatadownload.com/cdd/Gemini_BTCUSD_d.csv` |
| Date range | 2022-01-01 through 2022-12-31 |
| Rows | 365 |
| Replay field | Daily close, normalized to integer cents per BTC |
| Selection policy | One row per UTC calendar date; if multiple rows exist, use the greatest source timestamp |
| Curated data SHA-256 | `31c22c188edbd5e74551ac7fb7547c064309d8762ca0c13a0dd35a10797e7d81` |

The fixture is
[`testnet/fixtures/economic-stress/btc-usd-gemini-2022-daily.json`](../testnet/fixtures/economic-stress/btc-usd-gemini-2022-daily.json).

## Parameter Set

Baseline scenarios use:

| Parameter | Value |
| --- | ---: |
| Collateral | `100000000` sat |
| Stable target | `2000000` cents |
| Liquidation threshold | `15000` bps |
| Oracle cadence | 1 day |
| Oracle delay | 2 days |
| Confirmation delay | 6 blocks |
| Liquidation claim window | 12 blocks |
| Bridge timeout | 432 blocks |
| Child refund timeout | 720 blocks |
| Fee reserve | `50000` sat |
| Required relay fee | `25000` sat |
| Acceptable shortfall | `0` cents |

## Results

| Scenario | Result | Trigger | Settlement | Holder shortfall | Recovery | Main cause |
| --- | --- | --- | --- | ---: | ---: | --- |
| Historical 2022 drawdown | Pass | 2022-05-10 | 2022-05-12 | `0` cents | 100.00% | None |
| Overnight 20% gap | Pass | None | 2022-01-03 | `0` cents | 100.00% | None |
| Overnight 40% gap | Pass | 2022-01-02 | 2022-01-03 | `0` cents | 100.00% | None |
| Overnight 70% gap | Fail | 2022-01-02 | 2022-01-03 | `580484` cents | 70.97% | Holder shortfall |
| Oracle delay and fee spike | Fail | 2022-05-10 | 2022-05-20 | `0` cents | 100.00% | Fee reserve shortfall and timeout race |
| Thin collateral 70% gap | Fail | 2022-01-01 | 2022-01-03 | `1148433` cents | 42.57% | Holder shortfall |

Aggregate result:

| Metric | Value |
| --- | ---: |
| Scenarios | 6 |
| Passing scenarios | 3 |
| Failing scenarios | 3 |
| Worst shortfall | `1148433` cents |
| Worst shortfall scenario | Thin collateral 70% gap |
| BTC accounting conserved | Yes |
| False solvency observed | No |

## Interpretation

The baseline parameter set survives the historical 2022 path and the modeled
20% and 40% overnight gaps. It does not survive a 70% overnight gap without
holder shortfall. It also fails the operational stress where oracle delay and a
fee spike exceed the bridge timeout and fee reserve.

The result is therefore not a product approval. It shows that the accounting
model detects both solvent and insolvent cases and reports shortfall instead of
presenting false solvency.

## Boundary

This simulation does not prove:

- future solvency;
- market liquidity;
- exchange execution;
- oracle correctness;
- legal enforceability;
- production fee policy;
- wallet safety;
- user-fund safety.

It is deterministic product diligence above the cDLC activation primitive.
