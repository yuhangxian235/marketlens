INSERT INTO wallet_daily_activity (
    analysis_run_id, wallet_address, activity_date, trade_count, markets_joined,
    total_amount_wei, total_amount_mon, total_amount_gwei, yes_trade_count,
    no_trade_count, yes_amount_wei, no_amount_wei, yes_amount_gwei, no_amount_gwei
)
SELECT
    context.analysis_run_id,
    buys.wallet_address,
    DATE(buys.block_timestamp),
    COUNT(*),
    COUNT(DISTINCT buys.market_id),
    CAST(SUM(buys.amount_gwei) AS TEXT) || '000000000',
    SUM(buys.amount_mon),
    SUM(buys.amount_gwei),
    SUM(CASE WHEN buys.outcome = 'YES' THEN 1 ELSE 0 END),
    SUM(CASE WHEN buys.outcome = 'NO' THEN 1 ELSE 0 END),
    CAST(SUM(CASE WHEN buys.outcome = 'YES' THEN buys.amount_gwei ELSE 0 END) AS TEXT)
        || '000000000',
    CAST(SUM(CASE WHEN buys.outcome = 'NO' THEN buys.amount_gwei ELSE 0 END) AS TEXT)
        || '000000000',
    SUM(CASE WHEN buys.outcome = 'YES' THEN buys.amount_gwei ELSE 0 END),
    SUM(CASE WHEN buys.outcome = 'NO' THEN buys.amount_gwei ELSE 0 END)
FROM position_buys AS buys
CROSS JOIN _analysis_context AS context
WHERE buys.chain_id = context.chain_id
  AND buys.contract_address = context.contract_address
  AND buys.block_number BETWEEN context.from_block AND context.to_block
  AND buys.block_timestamp >= context.window_start_ts
  AND buys.block_timestamp < context.window_end_ts
GROUP BY context.analysis_run_id, buys.wallet_address, DATE(buys.block_timestamp);
