# Metric definitions

## 1. Global evidence contract

Every metric must expose:

1. definition;
2. numerator;
3. denominator;
4. UTC timestamp range;
5. inclusive block range;
6. versioned SQL file;
7. sample size;
8. example transaction hashes;
9. limitations;
10. SQL/pandas validation status.

Counts have no mathematical denominator; the evidence record states `not_applicable` instead of inventing one.

## 2. Observation window

An `analysis_run_id` fixes:

```text
[window_start_ts, window_end_ts)
and inclusive [from_block, to_block]
```

All event filters exclude `removed=1`. Grouping uses `DATE(block_timestamp)`.

`first_seen_in_sample` means the first qualifying `PositionBought` inside this window. It must never be described as a real new user.

## 3. Market activity

| Metric | Numerator | Denominator |
| --- | --- | --- |
| `trade_count` | distinct qualifying PositionBought event keys | not applicable |
| `unique_wallets` | distinct wallet addresses with a qualifying buy | not applicable |
| `total_amount_mon` | sum of qualifying `amount_mon` | not applicable |
| `average_position_size_mon` | total amount | trade count |
| `yes_amount_share` | YES amount | total amount |
| `no_amount_share` | NO amount | total amount |
| `yes_wallets` | distinct wallets with ≥1 YES buy | not applicable |
| `no_wallets` | distinct wallets with ≥1 NO buy | not applicable |

A wallet may buy both sides. Therefore YES-wallet and NO-wallet counts overlap and their shares of all unique wallets may sum above 100%. The UI must display this note.

## 4. Wallet first-seen cohort

Canonical wallet-level CTE:

```sql
WITH wallet_first_seen AS (
    SELECT
        wallet_address,
        MIN(DATE(block_timestamp)) AS first_seen_date
    FROM position_buys
    WHERE chain_id = :chain_id
      AND contract_address = :contract_address
      AND block_timestamp >= :window_start_ts
      AND block_timestamp < :window_end_ts
    GROUP BY wallet_address
)
SELECT first_seen_date, COUNT(*) AS cohort_wallets
FROM wallet_first_seen
GROUP BY first_seen_date
ORDER BY first_seen_date;
```

Required invariants:

- one row per wallet in `wallet_first_seen`;
- sum of all `cohort_wallets` equals global distinct wallets;
- first-touch market is the earliest event ordered by `(block_number, transaction_index, log_index)`, not an arbitrary market from the first date.

## 5. Repeat participation

Wallet-level fields:

- `active_days`: distinct UTC dates with a qualifying buy;
- `markets_joined`: distinct markets with a qualifying buy;
- `returned_later_in_sample`: any qualifying buy on a date later than `first_seen_date`;
- `next_day_returned`: qualifying buy on `DATE(first_seen_date, '+1 day')`;
- `d1_eligible`: first-seen date and its following date are both completely observed.

Distribution:

| Metric | Numerator | Denominator |
| --- | --- | --- |
| one-day wallet share | wallets with `active_days = 1` | all wallets in run |
| two-day wallet share | wallets with `active_days = 2` | all wallets in run |
| 3+ day wallet share | wallets with `active_days >= 3` | all wallets in run |
| returned later share | wallets with `returned_later_in_sample = 1` | all wallets in run |
| D1 repeat rate | eligible wallets with `next_day_returned = 1` | wallets with `d1_eligible = 1` |

### Partial-day rule

A UTC date is complete only when the indexed block range covers the entire `[00:00:00Z, next 00:00:00Z)` interval. `analysis_days` stores this judgment and its reason. If the first or last date is partial, it remains visible in raw activity charts but is excluded where complete observation is required.

D1 is sample repeat participation, not platform retention.

## 6. Cross-market participation

| Metric | Numerator | Denominator |
| --- | --- | --- |
| single-market wallets | wallets with `markets_joined = 1` | all wallets |
| multi-market wallets | wallets with `markets_joined >= 2` | all wallets |
| A/B overlap | wallets that joined both A and B | not applicable |
| Jaccard overlap | wallets in both A and B | wallets in A or B |
| A→B continuation | wallets whose first B event occurs after first A event | wallets that joined A |

`A→B` is chronological sample behavior. It does not prove that A caused B participation or that a recommendation drove the move.

## 7. Product-analysis output contract

Every finding has three explicitly labeled layers:

- **Fact**: directly supported by metric evidence;
- **Interpretation**: plausible product meaning of the fact;
- **Hypothesis to validate**: possible cause, never written as proven causality.

Example:

- Fact: Market A has the most first-touch wallets, and X% of them join only one market in the sample.
- Interpretation: A may act as an acquisition surface without strong cross-market discovery.
- Hypothesis: the post-purchase page may lack relevant-market recommendations.
- Experiment: randomize a related-market module; primary metric is qualified A→B continuation, guarded by failed-transaction rate and average stake.

No numeric example is published until the pipeline produces it.

## 8. SQL / pandas checks

The Phase 1.5 baseline implements six mandatory publishability checks:

1. `distinct_wallet_count`;
2. `cohort_sum_equals_distinct_wallets`;
3. `per_market_volume_gwei`;
4. `yes_plus_no_equals_total`;
5. `claimed_payout_wei`, using SQL `uint256_sum(payout_wei)` and Python `int`;
6. `decode_errors`.

All six names must exist and all six must PASS. A missing or failing check makes the
analysis run non-publishable.

The following Phase 0 targets are **not yet independent baseline gates**:

- fetched raw log count versus the requested range;
- unique event count after composite-key dedupe;
- an independently summed daily/cohort total;
- exact contract pool/claim conservation from wei strings.

These targets must not be described as implemented until they have their own named,
fail-closed checks.
