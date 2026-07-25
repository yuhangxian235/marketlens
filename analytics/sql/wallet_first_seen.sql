WITH qualifying AS (
    SELECT buys.*
    FROM position_buys AS buys
    CROSS JOIN _analysis_context AS context
    WHERE buys.chain_id = context.chain_id
      AND buys.contract_address = context.contract_address
      AND buys.block_number BETWEEN context.from_block AND context.to_block
      AND buys.block_timestamp >= context.window_start_ts
      AND buys.block_timestamp < context.window_end_ts
),
ranked AS (
    SELECT
        qualifying.*,
        ROW_NUMBER() OVER (
            PARTITION BY wallet_address
            ORDER BY block_number, transaction_index, log_index
        ) AS event_rank
    FROM qualifying
),
wallet_rollup AS (
    SELECT
        wallet_address,
        MIN(DATE(block_timestamp)) AS first_seen_date,
        COUNT(DISTINCT DATE(block_timestamp)) AS active_days,
        COUNT(DISTINCT market_id) AS markets_joined,
        SUM(amount_gwei) AS total_amount_gwei
    FROM qualifying
    GROUP BY wallet_address
)
INSERT INTO wallet_summary (
    analysis_run_id, wallet_address, first_seen_date, first_touch_market_id,
    active_days, markets_joined, returned_later_in_sample, d1_eligible,
    next_day_returned, total_amount_wei, total_amount_mon, total_amount_gwei
)
SELECT
    context.analysis_run_id,
    rollup.wallet_address,
    rollup.first_seen_date,
    first_event.market_id,
    rollup.active_days,
    rollup.markets_joined,
    CASE WHEN EXISTS (
        SELECT 1 FROM qualifying AS later
        WHERE later.wallet_address = rollup.wallet_address
          AND DATE(later.block_timestamp) > rollup.first_seen_date
    ) THEN 1 ELSE 0 END,
    CASE WHEN first_day.is_complete = 1 AND next_day.is_complete = 1
        THEN 1 ELSE 0 END,
    CASE WHEN first_day.is_complete = 1 AND next_day.is_complete = 1
        THEN CASE WHEN EXISTS (
            SELECT 1 FROM qualifying AS d1
            WHERE d1.wallet_address = rollup.wallet_address
              AND DATE(d1.block_timestamp) = DATE(rollup.first_seen_date, '+1 day')
        ) THEN 1 ELSE 0 END
        ELSE NULL
    END,
    CAST(rollup.total_amount_gwei AS TEXT) || '000000000',
    rollup.total_amount_gwei / 1000000000.0,
    rollup.total_amount_gwei
FROM wallet_rollup AS rollup
JOIN ranked AS first_event
  ON first_event.wallet_address = rollup.wallet_address
 AND first_event.event_rank = 1
CROSS JOIN _analysis_context AS context
LEFT JOIN analysis_days AS first_day
  ON first_day.analysis_run_id = context.analysis_run_id
 AND first_day.utc_date = rollup.first_seen_date
LEFT JOIN analysis_days AS next_day
  ON next_day.analysis_run_id = context.analysis_run_id
 AND next_day.utc_date = DATE(rollup.first_seen_date, '+1 day');
