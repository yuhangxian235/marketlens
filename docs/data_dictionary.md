# Data dictionary

Executable DDL: [`analytics/sql/schema.sql`](../analytics/sql/schema.sql).

## Conventions

- address fields: lowercase `0x` strings, 42 characters;
- transaction/block hashes: `0x` hex, 66 characters;
- `market_id`: canonical base-10 text, because Solidity `uint256` may exceed SQLite integer range;
- exact native-token quantities: base-10 wei text;
- `*_gwei INTEGER`: exact SQL aggregation unit only for gwei-aligned contributions, positions and pools;
- `*_mon REAL`: presentation helper, never the exact source of truth;
- timestamps: UTC ISO-8601 ending in `Z`;
- dates: `YYYY-MM-DD`, derived with `DATE(block_timestamp)`;
- event identity: `(chain_id, transaction_hash, log_index)`.

## Source and normalized tables

### `ingest_runs`

One row per RPC fetch attempt. It preserves the pre-deduplication evidence that a unique-key table cannot:

- requested block range and ABI SHA-256;
- fetched, unique and duplicate log counts;
- decode error count;
- RUNNING / SUCCEEDED / FAILED status.

### `chain_blocks`

Canonical block/header evidence:

- block number, hash, parent hash and UTC timestamp;
- at most one canonical hash per chain/height.

### `raw_contract_events`

One row per unique RPC log, including decode failures and removed/reorged logs.

Key fields:

- `chain_id`, `transaction_hash`, `log_index`: primary key;
- `contract_address`;
- `block_number`, `block_hash`, `transaction_index`, `block_timestamp`;
- nullable `event_name`;
- nullable decoded search keys `wallet_address` and `market_id`;
- `topic0`–`topic3`, `data_hex`;
- `raw_log_json`;
- `decode_status`, nullable `decoded_args_json`, `decode_error`, `decoder_version`;
- `removed`, first ingest run and `indexed_at`.

### `markets`

One row per `MarketCreated`.

- natural key: `(chain_id, contract_address, market_id)`;
- `question`, `question_hash`;
- `creator_wallet`, `closes_at`;
- creation block/timestamp/event identity.

### `position_buys`

One row per `PositionBought`.

- event primary key;
- `wallet_address`, `market_id`, `outcome`;
- exact `amount_wei` and `position_units`;
- exact SQL `amount_gwei` / `position_units_gwei`, plus display `amount_mon`;
- `question_hash`;
- `yes_pool_after_wei`, `no_pool_after_wei`;
- full block/time/event provenance.

### `market_resolutions`

At most one row per market.

- resolver and resolved outcome;
- winning and total pool;
- exact gwei totals and `refund_mode`;
- resolution block/time/event provenance.

### `reward_claims`

One row per `RewardClaimed`; unique per market and wallet.

- wallet, market and winning outcome;
- winning stake and payout;
- exact wei plus display MON;
- `refund_mode`;
- full block/time/event provenance.

Ordinary pari-mutuel division can produce a payout that is not divisible by 1 gwei, even when every contribution is aligned. Consequently `reward_claims` deliberately has no `payout_gwei` column.

## Operational tables

### `indexer_checkpoints`

Last finalized block/hash per chain and contract. A resume verifies the stored hash before indexing forward.

### `analysis_runs`

Immutable sample manifest:

- chain/contract;
- inclusive block range;
- half-open timestamp range;
- partial-day flags;
- pipeline version;
- source event count.

### `analysis_days`

One row per UTC date touched by a run:

- `is_complete`;
- first and last covered block;
- partial reason.

This table is the only source for D1 eligibility.

## Analytical tables

### `wallet_daily_activity`

One row per `(analysis_run_id, wallet_address, activity_date)`.

- trades and markets joined;
- total/YES/NO amounts;
- exact total/YES/NO gwei conservation;
- YES/NO trade counts.

### `wallet_summary`

Exactly one row per wallet per run.

- `first_seen_date`;
- deterministic `first_touch_market_id`;
- `active_days`, `markets_joined`;
- `returned_later_in_sample`;
- `d1_eligible`, nullable `next_day_returned`;
- total amount.
- exact total gwei.

Invariant:

```text
COUNT(wallet_summary rows)
= COUNT(DISTINCT position_buys.wallet_address in the run)
```

### `market_summary`

One row per market per run:

- trade count and unique wallets;
- total and average position;
- YES/NO amount and wallet counts;
- both-outcome wallet count, allowing `YES + NO - both = unique`;
- first-touch wallet count.

## Evidence and quality tables

### `data_quality_results`

One row per named check:

- PASS / FAIL / WARN;
- SQL and pandas values;
- tolerance;
- JSON details and check timestamp.

### `metric_evidence`

One row per UI metric card:

- definition;
- numerator and denominator definitions;
- SQL filename;
- sample size;
- example transaction hashes;
- limitations.

## Why both exact wei and MON exist

SQLite has no built-in arbitrary-precision decimal type. A Solidity `uint256` can exceed signed 64-bit range, and casting long wei strings to SQLite numeric values may become floating point.

The MVP contract additionally requires `msg.value` to be divisible by 1 gwei. Therefore:

- contributions, position units and pool totals use exact bounded `*_gwei INTEGER` aggregation;
- payouts remain canonical decimal-string wei and SQL aggregates them through a registered, tested `uint256_sum(TEXT)` SQLite aggregate;
- pandas independently recomputes payout totals with Python `int`;
- `*_mon REAL` is display-only;
- exact-wei conservation checks remain integer-exact.
