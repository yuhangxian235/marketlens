SELECT market_id, first_touch_wallets, unique_wallets
FROM market_summary
WHERE analysis_run_id = ?
ORDER BY first_touch_wallets DESC, market_id
LIMIT 1;

