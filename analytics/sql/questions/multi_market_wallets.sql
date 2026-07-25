SELECT
    COUNT(*) AS all_wallets,
    SUM(CASE WHEN markets_joined >= 2 THEN 1 ELSE 0 END) AS multi_market_wallets,
    CAST(SUM(CASE WHEN markets_joined >= 2 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)
        AS multi_market_share
FROM wallet_summary
WHERE analysis_run_id = ?;

