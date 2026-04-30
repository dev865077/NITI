# Oracle Price, Source, And Timestamp Policy

This document defines a deterministic price observation policy for cDLC test and
audit artifacts. Its purpose is to make oracle outcomes reproducible: given an
event id, observation time, source set, and rounding rule, a reviewer should be
able to determine which integer price outcome should have been attested.

This is not a claim that the policy is economically optimal, manipulation
resistant in all markets, legally sufficient, or suitable for production without
external review.

## Price Unit

BTC/USD prices are represented as integer cents per BTC:

```text
price_cents = round_to_policy(BTCUSD * 100)
```

Contract outcome labels should state the integer unit explicitly. A test should
not infer whether an outcome is dollars, cents, sats, or fixed-point decimals
from context.

## Observation Event

Each price event should define:

| Field | Meaning |
| --- | --- |
| `eventId` | Stable identifier for the observation event. |
| `baseAsset` | Asset being priced, for example `BTC`. |
| `quoteAsset` | Quote unit, for example `USD`. |
| `observationStartIso` | Inclusive start of the observation window. |
| `observationEndIso` | Exclusive end of the observation window. |
| `sourceSet` | Ordered list of acceptable data sources. |
| `aggregationRule` | Deterministic method for combining source observations. |
| `roundingRule` | Deterministic fixed-point rounding rule. |
| `stalenessLimitSeconds` | Maximum permitted age of source observations. |
| `outageRule` | Behavior when too few valid sources remain. |
| `correctionRule` | Behavior for late corrections after attestation. |

Timestamps use UTC ISO-8601 with a trailing `Z`.

## Source Selection

The minimum deterministic source record is:

```json
{
  "sourceId": "example-exchange",
  "observedAtIso": "2026-04-30T12:00:00Z",
  "priceText": "63250.1250",
  "priceCents": "6325013"
}
```

The oracle should preserve the raw `priceText`, parsed integer `priceCents`,
and source timestamp. Tests should reject source records with missing timestamps,
non-decimal price text, negative prices, or unit ambiguity.

## Aggregation Rule

The default audit policy is median-of-valid-sources:

```text
valid_sources = sources whose observedAtIso is inside the staleness limit
median_price = median(valid_sources.price_cents)
```

For an even number of valid sources, use the lower median:

```text
median([a, b, c, d]) = b when a <= b <= c <= d.
```

The lower median avoids introducing a fractional cent during aggregation. A
production oracle may choose a different rule, but the event announcement must
commit to it before the observation window closes.

## Rounding Rule

When a source reports a decimal BTC/USD value, parse it exactly as decimal text
and convert to cents using half-away-from-zero rounding:

```text
price_cents = floor(abs(price_usd * 100) + 0.5)
```

Prices must be non-negative, so this is equivalent to ordinary half-up rounding.
Binary floating-point parsing should not be used for consensus-critical test
vectors.

## Stale Prices And Outages

A source observation is stale if:

```text
observationEnd - observedAt > stalenessLimitSeconds.
```

Stale sources are excluded before aggregation.

If fewer than the required minimum source count remains, the oracle must not
attest a price outcome. The event should resolve by its pre-announced outage
branch, timeout branch, or no-attestation fallback.

## Corrections

The default correction rule is no retroactive correction after attestation. If a
source revises historical data after the oracle signs an outcome, the revision
does not change the already-attested cDLC branch.

If a product needs correction windows, the event announcement must define them
before the event and the contract must include corresponding timeout or dispute
branches. This document does not define that protocol.

## Example Event

```json
{
  "eventId": "btc-usd-2026-04-30T12:00:00Z",
  "baseAsset": "BTC",
  "quoteAsset": "USD",
  "observationStartIso": "2026-04-30T11:59:30Z",
  "observationEndIso": "2026-04-30T12:00:00Z",
  "sourceSet": [
    "source-a",
    "source-b",
    "source-c"
  ],
  "aggregationRule": "median-of-valid-sources-lower-median-for-even-count",
  "roundingRule": "decimal-cents-half-away-from-zero",
  "stalenessLimitSeconds": 60,
  "minimumSourceCount": 2,
  "outageRule": "no-attestation-fallback",
  "correctionRule": "no-retroactive-correction-after-attestation"
}
```

## Edge-Case Examples

### Half-Cent Rounding

Input:

```text
BTCUSD = 63250.125
```

Conversion:

```text
63250.125 * 100 = 6325012.5
price_cents = 6325013
```

### Even Source Count

Input source prices:

```text
[6325010, 6325011, 6325019, 6325025]
```

Sorted order is the same. The lower median is:

```text
price_cents = 6325011
```

### Stale Source Exclusion

Event end:

```text
2026-04-30T12:00:00Z
```

Staleness limit:

```text
60 seconds
```

Source observations:

```text
source-a observedAt = 2026-04-30T11:59:45Z -> valid
source-b observedAt = 2026-04-30T11:58:59Z -> stale
source-c observedAt = 2026-04-30T11:59:50Z -> valid
```

Only `source-a` and `source-c` enter the median. If the event requires three
valid sources, this becomes an outage instead of a price attestation.

## Audit Boundary

This policy makes one oracle event mechanically reviewable. It does not prove
that the chosen sources are honest, that exchange markets are liquid, that the
reported price resists manipulation, that the oracle will remain online, or that
the result is legally enforceable.
