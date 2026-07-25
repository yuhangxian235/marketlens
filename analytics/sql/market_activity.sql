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
wallet_sides AS (
    SELECT
        market_id,
        wallet_address,
        MAX(CASE WHEN outcome = 'YES' THEN 1 ELSE 0 END) AS bought_yes,
        MAX(CASE WHEN outcome = 'NO' THEN 1 ELSE 0 END) AS bought_no
    FROM qualifying
    GROUP BY market_id, wallet_address
),
side_counts AS (
    SELECT
        market_id,
        SUM(bought_yes) AS yes_wallets,
        SUM(bought_no) AS no_wallets,
        SUM(CASE WHEN bought_yes = 1 AND bought_no = 1 THEN 1 ELSE 0 END)
            AS both_outcome_wallets
    FROM wallet_sides
    GROUP BY market_id
),
activity AS (
    SELECT
        market_id,
        COUNT(*) AS trade_count,
        COUNT(DISTINCT wallet_address) AS unique_wallets,
        SUM(amount_gwei) AS total_amount_gwei,
        SUM(amount_mon) AS total_amount_mon,
        SUM(CASE WHEN outcome = 'YES' THEN amount_gwei ELSE 0 END) AS yes_amount_gwei,
        SUM(CASE WHEN outcome = 'NO' THEN amount_gwei ELSE 0 END) AS no_amount_gwei
    FROM qualifying
    GROUP BY market_id
)
INSERT INTO market_summary (
    analysis_run_id, market_id, trade_count, unique_wallets, total_amount_wei,
    total_amount_mon, total_amount_gwei, average_position_mon, yes_amount_wei,
    no_amount_wei, yes_amount_gwei, no_amount_gwei, yes_wallets, no_wallets,
    both_outcome_wallets, first_touch_wallets
)
SELECT
    context.analysis_run_id,
    activity.market_id,
    activity.trade_count,
    activity.unique_wallets,
    CAST(activity.total_amount_gwei AS TEXT) || '000000000',
    activity.total_amount_mon,
    activity.total_amount_gwei,
    activity.total_amount_mon / activity.trade_count,
    CAST(activity.yes_amount_gwei AS TEXT) || '000000000',
    CAST(activity.no_amount_gwei AS TEXT) || '000000000',
    activity.yes_amount_gwei,
    activity.no_amount_gwei,
    side_counts.yes_wallets,
    side_counts.no_wallets,
    side_counts.both_outcome_wallets,
    (
        SELECT COUNT(*)
        FROM wallet_summary AS wallets
        WHERE wallets.analysis_run_id = context.analysis_run_id
          AND wallets.first_touch_market_id = activity.market_id
    )
FROM activity
JOIN side_counts USING (market_id)
CROSS JOIN _analysis_context AS context;
