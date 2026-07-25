-- Rebuild disposable typed tables from canonical decoded event envelopes.
DELETE FROM reward_claims;
DELETE FROM market_resolutions;
DELETE FROM position_buys;
DELETE FROM markets;

INSERT INTO markets (
    chain_id, contract_address, market_id, question, question_hash,
    creator_wallet, closes_at, created_block_number, transaction_index,
    created_timestamp, transaction_hash, log_index
)
SELECT
    chain_id,
    contract_address,
    CAST(json_extract(decoded_args_json, '$.marketId') AS TEXT),
    json_extract(decoded_args_json, '$.question'),
    lower(json_extract(decoded_args_json, '$.questionHash')),
    lower(json_extract(decoded_args_json, '$.creator')),
    strftime(
        '%Y-%m-%dT%H:%M:%SZ',
        CAST(json_extract(decoded_args_json, '$.closesAt') AS INTEGER),
        'unixepoch'
    ),
    block_number,
    transaction_index,
    block_timestamp,
    transaction_hash,
    log_index
FROM raw_contract_events
WHERE removed = 0
  AND decode_status = 'OK'
  AND event_name = 'MarketCreated'
ORDER BY block_number, transaction_index, log_index;

INSERT INTO position_buys (
    chain_id, transaction_hash, log_index, contract_address, block_number,
    transaction_index, block_timestamp, wallet_address, market_id,
    question_hash, outcome, amount_wei, amount_mon, amount_gwei,
    position_units, position_units_gwei, yes_pool_after_wei,
    no_pool_after_wei, yes_pool_after_gwei, no_pool_after_gwei
)
SELECT
    chain_id,
    transaction_hash,
    log_index,
    contract_address,
    block_number,
    transaction_index,
    block_timestamp,
    lower(json_extract(decoded_args_json, '$.wallet')),
    CAST(json_extract(decoded_args_json, '$.marketId') AS TEXT),
    lower(json_extract(decoded_args_json, '$.questionHash')),
    json_extract(decoded_args_json, '$.outcome'),
    CAST(json_extract(decoded_args_json, '$.amount') AS TEXT),
    CAST(json_extract(decoded_args_json, '$.amount') AS REAL) / 1000000000000000000.0,
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.amount') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.amount') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.amount') AS TEXT)) - 9
        ) AS INTEGER)
    END,
    CAST(json_extract(decoded_args_json, '$.positionUnits') AS TEXT),
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.positionUnits') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.positionUnits') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.positionUnits') AS TEXT)) - 9
        ) AS INTEGER)
    END,
    CAST(json_extract(decoded_args_json, '$.yesPoolAfter') AS TEXT),
    CAST(json_extract(decoded_args_json, '$.noPoolAfter') AS TEXT),
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.yesPoolAfter') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.yesPoolAfter') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.yesPoolAfter') AS TEXT)) - 9
        ) AS INTEGER)
    END,
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.noPoolAfter') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.noPoolAfter') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.noPoolAfter') AS TEXT)) - 9
        ) AS INTEGER)
    END
FROM raw_contract_events
WHERE removed = 0
  AND decode_status = 'OK'
  AND event_name = 'PositionBought'
ORDER BY block_number, transaction_index, log_index;

INSERT INTO market_resolutions (
    chain_id, contract_address, market_id, transaction_hash, log_index,
    block_number, transaction_index, block_timestamp, resolver_address,
    resolved_outcome, winning_pool_wei, total_pool_wei, winning_pool_gwei,
    total_pool_gwei, refund_mode
)
SELECT
    chain_id,
    contract_address,
    CAST(json_extract(decoded_args_json, '$.marketId') AS TEXT),
    transaction_hash,
    log_index,
    block_number,
    transaction_index,
    block_timestamp,
    lower(json_extract(decoded_args_json, '$.resolver')),
    json_extract(decoded_args_json, '$.result'),
    CAST(json_extract(decoded_args_json, '$.winningPool') AS TEXT),
    CAST(json_extract(decoded_args_json, '$.totalPool') AS TEXT),
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.winningPool') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.winningPool') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.winningPool') AS TEXT)) - 9
        ) AS INTEGER)
    END,
    CASE
        WHEN length(CAST(json_extract(decoded_args_json, '$.totalPool') AS TEXT)) <= 9
            THEN 0
        ELSE CAST(substr(
            CAST(json_extract(decoded_args_json, '$.totalPool') AS TEXT),
            1,
            length(CAST(json_extract(decoded_args_json, '$.totalPool') AS TEXT)) - 9
        ) AS INTEGER)
    END,
    CAST(json_extract(decoded_args_json, '$.refundMode') AS INTEGER)
FROM raw_contract_events
WHERE removed = 0
  AND decode_status = 'OK'
  AND event_name = 'MarketResolved'
ORDER BY block_number, transaction_index, log_index;

INSERT INTO reward_claims (
    chain_id, transaction_hash, log_index, contract_address, block_number,
    transaction_index, block_timestamp, wallet_address, market_id, outcome,
    winning_stake_wei, payout_wei, payout_mon, refund_mode
)
SELECT
    chain_id,
    transaction_hash,
    log_index,
    contract_address,
    block_number,
    transaction_index,
    block_timestamp,
    lower(json_extract(decoded_args_json, '$.wallet')),
    CAST(json_extract(decoded_args_json, '$.marketId') AS TEXT),
    json_extract(decoded_args_json, '$.outcome'),
    CAST(json_extract(decoded_args_json, '$.winningStake') AS TEXT),
    CAST(json_extract(decoded_args_json, '$.payout') AS TEXT),
    CAST(json_extract(decoded_args_json, '$.payout') AS REAL) / 1000000000000000000.0,
    CAST(json_extract(decoded_args_json, '$.refundMode') AS INTEGER)
FROM raw_contract_events
WHERE removed = 0
  AND decode_status = 'OK'
  AND event_name = 'RewardClaimed'
ORDER BY block_number, transaction_index, log_index;
