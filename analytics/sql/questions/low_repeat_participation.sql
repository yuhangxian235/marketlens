WITH first_touch AS (
    SELECT
        first_touch_market_id AS market_id,
        COUNT(*) AS first_touch_wallets,
        SUM(returned_later_in_sample) AS returned_wallets
    FROM wallet_summary
    WHERE analysis_run_id = ?
    GROUP BY first_touch_market_id
)
SELECT
    market_id,
    first_touch_wallets,
    returned_wallets,
    CAST(returned_wallets AS REAL) / first_touch_wallets AS repeat_share
FROM first_touch
ORDER BY repeat_share, market_id
LIMIT 1;

