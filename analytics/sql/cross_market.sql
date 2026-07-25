-- Read-only overlap matrix for one analysis run (:analysis_run_id).
WITH wallet_markets AS (
    SELECT analysis_run_id, wallet_address, first_touch_market_id AS market_id
    FROM wallet_summary
    WHERE analysis_run_id = :analysis_run_id
    UNION
    SELECT DISTINCT
        context.analysis_run_id,
        buys.wallet_address,
        buys.market_id
    FROM position_buys AS buys
    JOIN analysis_runs AS context
      ON context.analysis_run_id = :analysis_run_id
    WHERE buys.chain_id = context.chain_id
      AND buys.contract_address = context.contract_address
      AND buys.block_timestamp >= context.window_start_ts
      AND buys.block_timestamp < context.window_end_ts
),
pairs AS (
    SELECT
        left_side.market_id AS market_a,
        right_side.market_id AS market_b,
        COUNT(DISTINCT left_side.wallet_address) AS overlap_wallets
    FROM wallet_markets AS left_side
    JOIN wallet_markets AS right_side
      ON right_side.analysis_run_id = left_side.analysis_run_id
     AND right_side.wallet_address = left_side.wallet_address
     AND right_side.market_id > left_side.market_id
    GROUP BY left_side.market_id, right_side.market_id
)
SELECT * FROM pairs ORDER BY overlap_wallets DESC, market_a, market_b;

