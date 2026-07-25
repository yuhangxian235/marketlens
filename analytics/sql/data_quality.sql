-- Human-readable SQL half of the mandatory SQL/pandas reconciliation.
SELECT
    (SELECT COUNT(DISTINCT wallet_address) FROM wallet_summary
     WHERE analysis_run_id = :analysis_run_id) AS distinct_wallets,
    (SELECT COUNT(*) FROM wallet_summary
     WHERE analysis_run_id = :analysis_run_id) AS wallet_summary_rows,
    (SELECT COALESCE(SUM(total_amount_gwei), 0) FROM market_summary
     WHERE analysis_run_id = :analysis_run_id) AS total_amount_gwei,
    (SELECT COALESCE(uint256_sum(payout_wei), '0') FROM reward_claims)
        AS claimed_payout_wei;
