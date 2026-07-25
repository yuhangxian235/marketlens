PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ingest_runs (
    ingest_run_id         TEXT PRIMARY KEY,
    chain_id              INTEGER NOT NULL,
    contract_address      TEXT NOT NULL,
    from_block            INTEGER NOT NULL CHECK (from_block >= 0),
    to_block              INTEGER NOT NULL CHECK (to_block >= from_block),
    abi_sha256            TEXT NOT NULL CHECK (length(abi_sha256) = 64),
    fetched_log_count     INTEGER NOT NULL CHECK (fetched_log_count >= 0),
    unique_log_count      INTEGER NOT NULL CHECK (
        unique_log_count >= 0 AND unique_log_count <= fetched_log_count
    ),
    duplicate_log_count   INTEGER NOT NULL CHECK (
        duplicate_log_count = fetched_log_count - unique_log_count
    ),
    decode_error_count    INTEGER NOT NULL CHECK (
        decode_error_count >= 0 AND decode_error_count <= unique_log_count
    ),
    status                TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    started_at            TEXT NOT NULL CHECK (substr(started_at, -1, 1) = 'Z'),
    completed_at          TEXT CHECK (completed_at IS NULL OR substr(completed_at, -1, 1) = 'Z')
);

CREATE TABLE IF NOT EXISTS chain_blocks (
    chain_id              INTEGER NOT NULL,
    block_hash            TEXT NOT NULL CHECK (length(block_hash) = 66),
    block_number          INTEGER NOT NULL CHECK (block_number >= 0),
    parent_hash           TEXT NOT NULL CHECK (length(parent_hash) = 66),
    block_timestamp       TEXT NOT NULL CHECK (substr(block_timestamp, -1, 1) = 'Z'),
    canonical             INTEGER NOT NULL CHECK (canonical IN (0, 1)),
    PRIMARY KEY (chain_id, block_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_chain_blocks_canonical_height
    ON chain_blocks (chain_id, block_number)
    WHERE canonical = 1;

-- Canonical raw log envelope. Logs are enriched with transaction and block
-- metadata returned by RPC; tx hash, block number and timestamp are not event
-- arguments emitted by Solidity.
CREATE TABLE IF NOT EXISTS raw_contract_events (
    chain_id            INTEGER NOT NULL,
    transaction_hash    TEXT NOT NULL,
    log_index            INTEGER NOT NULL CHECK (log_index >= 0),
    contract_address     TEXT NOT NULL CHECK (
        length(contract_address) = 42
        AND contract_address = lower(contract_address)
        AND substr(contract_address, 1, 2) = '0x'
    ),
    block_number         INTEGER NOT NULL CHECK (block_number >= 0),
    block_hash           TEXT NOT NULL CHECK (length(block_hash) = 66),
    transaction_index    INTEGER NOT NULL CHECK (transaction_index >= 0),
    block_timestamp      TEXT NOT NULL CHECK (substr(block_timestamp, -1, 1) = 'Z'),
    event_name           TEXT,
    wallet_address       TEXT CHECK (
        wallet_address IS NULL
        OR (length(wallet_address) = 42 AND wallet_address = lower(wallet_address))
    ),
    market_id            TEXT,
    topic0               TEXT NOT NULL CHECK (length(topic0) = 66),
    topic1               TEXT,
    topic2               TEXT,
    topic3               TEXT,
    data_hex             TEXT NOT NULL CHECK (substr(data_hex, 1, 2) = '0x'),
    raw_log_json         TEXT NOT NULL CHECK (json_valid(raw_log_json)),
    decode_status        TEXT NOT NULL CHECK (decode_status IN ('OK', 'ERROR')),
    decoded_args_json    TEXT CHECK (
        decoded_args_json IS NULL OR json_valid(decoded_args_json)
    ),
    decode_error         TEXT,
    decoder_version      TEXT NOT NULL,
    removed              INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1)),
    first_seen_run_id    TEXT NOT NULL,
    indexed_at           TEXT NOT NULL CHECK (substr(indexed_at, -1, 1) = 'Z'),
    PRIMARY KEY (chain_id, transaction_hash, log_index),
    FOREIGN KEY (first_seen_run_id) REFERENCES ingest_runs (ingest_run_id),
    FOREIGN KEY (chain_id, block_hash) REFERENCES chain_blocks (chain_id, block_hash)
);

CREATE INDEX IF NOT EXISTS idx_raw_events_block
    ON raw_contract_events (chain_id, contract_address, block_number, log_index);

CREATE INDEX IF NOT EXISTS idx_raw_events_name
    ON raw_contract_events (chain_id, contract_address, event_name, block_number);

CREATE INDEX IF NOT EXISTS idx_raw_events_wallet
    ON raw_contract_events (chain_id, contract_address, wallet_address, block_number);

CREATE INDEX IF NOT EXISTS idx_raw_events_market
    ON raw_contract_events (chain_id, contract_address, market_id, block_number);

CREATE TABLE IF NOT EXISTS indexer_checkpoints (
    chain_id             INTEGER NOT NULL,
    contract_address     TEXT NOT NULL,
    last_finalized_block INTEGER NOT NULL CHECK (last_finalized_block >= 0),
    last_block_hash      TEXT NOT NULL CHECK (length(last_block_hash) = 66),
    updated_at           TEXT NOT NULL CHECK (substr(updated_at, -1, 1) = 'Z'),
    PRIMARY KEY (chain_id, contract_address)
);

CREATE TABLE IF NOT EXISTS markets (
    chain_id              INTEGER NOT NULL,
    contract_address      TEXT NOT NULL,
    market_id             TEXT NOT NULL,
    question              TEXT NOT NULL CHECK (length(question) BETWEEN 1 AND 280),
    question_hash         TEXT NOT NULL CHECK (length(question_hash) = 66),
    creator_wallet        TEXT NOT NULL CHECK (
        length(creator_wallet) = 42 AND creator_wallet = lower(creator_wallet)
    ),
    closes_at             TEXT NOT NULL CHECK (substr(closes_at, -1, 1) = 'Z'),
    created_block_number  INTEGER NOT NULL CHECK (created_block_number >= 0),
    transaction_index     INTEGER NOT NULL CHECK (transaction_index >= 0),
    created_timestamp     TEXT NOT NULL CHECK (substr(created_timestamp, -1, 1) = 'Z'),
    transaction_hash      TEXT NOT NULL,
    log_index             INTEGER NOT NULL CHECK (log_index >= 0),
    PRIMARY KEY (chain_id, contract_address, market_id),
    UNIQUE (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, transaction_hash, log_index)
        REFERENCES raw_contract_events (chain_id, transaction_hash, log_index)
);

CREATE TABLE IF NOT EXISTS position_buys (
    chain_id             INTEGER NOT NULL,
    transaction_hash     TEXT NOT NULL,
    log_index            INTEGER NOT NULL CHECK (log_index >= 0),
    contract_address     TEXT NOT NULL,
    block_number         INTEGER NOT NULL CHECK (block_number >= 0),
    transaction_index    INTEGER NOT NULL CHECK (transaction_index >= 0),
    block_timestamp      TEXT NOT NULL CHECK (substr(block_timestamp, -1, 1) = 'Z'),
    wallet_address       TEXT NOT NULL CHECK (
        length(wallet_address) = 42 AND wallet_address = lower(wallet_address)
    ),
    market_id            TEXT NOT NULL,
    question_hash        TEXT NOT NULL CHECK (length(question_hash) = 66),
    outcome              TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
    amount_wei           TEXT NOT NULL CHECK (
        amount_wei NOT GLOB '*[^0-9]*'
        AND substr(amount_wei, 1, 1) BETWEEN '1' AND '9'
    ),
    amount_mon           REAL NOT NULL CHECK (amount_mon > 0),
    amount_gwei          INTEGER NOT NULL CHECK (amount_gwei > 0),
    position_units       TEXT NOT NULL CHECK (
        position_units NOT GLOB '*[^0-9]*'
        AND substr(position_units, 1, 1) BETWEEN '1' AND '9'
    ),
    position_units_gwei  INTEGER NOT NULL CHECK (position_units_gwei > 0),
    yes_pool_after_wei   TEXT NOT NULL CHECK (yes_pool_after_wei NOT GLOB '*[^0-9]*'),
    no_pool_after_wei    TEXT NOT NULL CHECK (no_pool_after_wei NOT GLOB '*[^0-9]*'),
    yes_pool_after_gwei  INTEGER NOT NULL CHECK (yes_pool_after_gwei >= 0),
    no_pool_after_gwei   INTEGER NOT NULL CHECK (no_pool_after_gwei >= 0),
    event_name           TEXT NOT NULL DEFAULT 'PositionBought'
        CHECK (event_name = 'PositionBought'),
    PRIMARY KEY (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, transaction_hash, log_index)
        REFERENCES raw_contract_events (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, contract_address, market_id)
        REFERENCES markets (chain_id, contract_address, market_id)
);

CREATE INDEX IF NOT EXISTS idx_position_buys_wallet_time
    ON position_buys (chain_id, contract_address, wallet_address, block_timestamp);

CREATE INDEX IF NOT EXISTS idx_position_buys_market_time
    ON position_buys (chain_id, contract_address, market_id, block_timestamp);

CREATE TABLE IF NOT EXISTS market_resolutions (
    chain_id             INTEGER NOT NULL,
    contract_address     TEXT NOT NULL,
    market_id            TEXT NOT NULL,
    transaction_hash     TEXT NOT NULL,
    log_index            INTEGER NOT NULL CHECK (log_index >= 0),
    block_number         INTEGER NOT NULL CHECK (block_number >= 0),
    transaction_index    INTEGER NOT NULL CHECK (transaction_index >= 0),
    block_timestamp      TEXT NOT NULL CHECK (substr(block_timestamp, -1, 1) = 'Z'),
    resolver_address     TEXT NOT NULL CHECK (
        length(resolver_address) = 42 AND resolver_address = lower(resolver_address)
    ),
    resolved_outcome     TEXT NOT NULL CHECK (resolved_outcome IN ('YES', 'NO')),
    winning_pool_wei     TEXT NOT NULL CHECK (winning_pool_wei NOT GLOB '*[^0-9]*'),
    total_pool_wei       TEXT NOT NULL CHECK (total_pool_wei NOT GLOB '*[^0-9]*'),
    winning_pool_gwei    INTEGER NOT NULL CHECK (winning_pool_gwei >= 0),
    total_pool_gwei      INTEGER NOT NULL CHECK (total_pool_gwei >= 0),
    refund_mode          INTEGER NOT NULL CHECK (refund_mode IN (0, 1)),
    event_name           TEXT NOT NULL DEFAULT 'MarketResolved'
        CHECK (event_name = 'MarketResolved'),
    PRIMARY KEY (chain_id, contract_address, market_id),
    UNIQUE (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, transaction_hash, log_index)
        REFERENCES raw_contract_events (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, contract_address, market_id)
        REFERENCES markets (chain_id, contract_address, market_id)
);

CREATE TABLE IF NOT EXISTS reward_claims (
    chain_id             INTEGER NOT NULL,
    transaction_hash     TEXT NOT NULL,
    log_index            INTEGER NOT NULL CHECK (log_index >= 0),
    contract_address     TEXT NOT NULL,
    block_number         INTEGER NOT NULL CHECK (block_number >= 0),
    transaction_index    INTEGER NOT NULL CHECK (transaction_index >= 0),
    block_timestamp      TEXT NOT NULL CHECK (substr(block_timestamp, -1, 1) = 'Z'),
    wallet_address       TEXT NOT NULL CHECK (
        length(wallet_address) = 42 AND wallet_address = lower(wallet_address)
    ),
    market_id            TEXT NOT NULL,
    outcome              TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
    winning_stake_wei    TEXT NOT NULL CHECK (winning_stake_wei NOT GLOB '*[^0-9]*'),
    payout_wei           TEXT NOT NULL CHECK (
        payout_wei NOT GLOB '*[^0-9]*'
        AND substr(payout_wei, 1, 1) BETWEEN '1' AND '9'
    ),
    payout_mon           REAL NOT NULL CHECK (payout_mon > 0),
    refund_mode          INTEGER NOT NULL CHECK (refund_mode IN (0, 1)),
    event_name           TEXT NOT NULL DEFAULT 'RewardClaimed'
        CHECK (event_name = 'RewardClaimed'),
    PRIMARY KEY (chain_id, transaction_hash, log_index),
    UNIQUE (chain_id, contract_address, market_id, wallet_address),
    FOREIGN KEY (chain_id, transaction_hash, log_index)
        REFERENCES raw_contract_events (chain_id, transaction_hash, log_index),
    FOREIGN KEY (chain_id, contract_address, market_id)
        REFERENCES markets (chain_id, contract_address, market_id)
);

-- One record fixes the exact sample and transformation version behind every
-- summary row and Evidence card.
CREATE TABLE IF NOT EXISTS analysis_runs (
    analysis_run_id       TEXT PRIMARY KEY,
    chain_id              INTEGER NOT NULL,
    contract_address      TEXT NOT NULL,
    from_block            INTEGER NOT NULL CHECK (from_block >= 0),
    to_block              INTEGER NOT NULL CHECK (to_block >= from_block),
    window_start_ts       TEXT NOT NULL CHECK (substr(window_start_ts, -1, 1) = 'Z'),
    window_end_ts         TEXT NOT NULL CHECK (substr(window_end_ts, -1, 1) = 'Z'),
    start_day_is_partial  INTEGER NOT NULL CHECK (start_day_is_partial IN (0, 1)),
    end_day_is_partial    INTEGER NOT NULL CHECK (end_day_is_partial IN (0, 1)),
    pipeline_version      TEXT NOT NULL,
    source_event_count    INTEGER NOT NULL CHECK (source_event_count >= 0),
    created_at            TEXT NOT NULL CHECK (substr(created_at, -1, 1) = 'Z')
);

CREATE TABLE IF NOT EXISTS analysis_days (
    analysis_run_id       TEXT NOT NULL,
    utc_date              TEXT NOT NULL CHECK (
        length(utc_date) = 10 AND utc_date = DATE(utc_date)
    ),
    is_complete           INTEGER NOT NULL CHECK (is_complete IN (0, 1)),
    first_block_number    INTEGER,
    last_block_number     INTEGER,
    partial_reason        TEXT,
    PRIMARY KEY (analysis_run_id, utc_date),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_daily_activity (
    analysis_run_id       TEXT NOT NULL,
    wallet_address        TEXT NOT NULL CHECK (
        length(wallet_address) = 42 AND wallet_address = lower(wallet_address)
    ),
    activity_date         TEXT NOT NULL CHECK (
        length(activity_date) = 10
        AND activity_date = DATE(activity_date)
    ),
    trade_count           INTEGER NOT NULL CHECK (trade_count > 0),
    markets_joined        INTEGER NOT NULL CHECK (markets_joined > 0),
    total_amount_wei      TEXT NOT NULL CHECK (total_amount_wei NOT GLOB '*[^0-9]*'),
    total_amount_mon      REAL NOT NULL CHECK (total_amount_mon > 0),
    total_amount_gwei     INTEGER NOT NULL CHECK (total_amount_gwei > 0),
    yes_trade_count       INTEGER NOT NULL CHECK (yes_trade_count >= 0),
    no_trade_count        INTEGER NOT NULL CHECK (no_trade_count >= 0),
    yes_amount_wei        TEXT NOT NULL CHECK (yes_amount_wei NOT GLOB '*[^0-9]*'),
    no_amount_wei         TEXT NOT NULL CHECK (no_amount_wei NOT GLOB '*[^0-9]*'),
    yes_amount_gwei       INTEGER NOT NULL CHECK (yes_amount_gwei >= 0),
    no_amount_gwei        INTEGER NOT NULL CHECK (no_amount_gwei >= 0),
    CHECK (total_amount_gwei = yes_amount_gwei + no_amount_gwei),
    PRIMARY KEY (analysis_run_id, wallet_address, activity_date),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);

-- Exactly one row per address-level participant within an analysis run.
CREATE TABLE IF NOT EXISTS wallet_summary (
    analysis_run_id            TEXT NOT NULL,
    wallet_address             TEXT NOT NULL CHECK (
        length(wallet_address) = 42 AND wallet_address = lower(wallet_address)
    ),
    first_seen_date            TEXT NOT NULL CHECK (
        length(first_seen_date) = 10
        AND first_seen_date = DATE(first_seen_date)
    ),
    first_touch_market_id      TEXT NOT NULL,
    active_days                INTEGER NOT NULL CHECK (active_days > 0),
    markets_joined             INTEGER NOT NULL CHECK (markets_joined > 0),
    returned_later_in_sample   INTEGER NOT NULL CHECK (returned_later_in_sample IN (0, 1)),
    d1_eligible                INTEGER NOT NULL CHECK (d1_eligible IN (0, 1)),
    next_day_returned          INTEGER CHECK (next_day_returned IN (0, 1) OR next_day_returned IS NULL),
    total_amount_wei           TEXT NOT NULL CHECK (total_amount_wei NOT GLOB '*[^0-9]*'),
    total_amount_mon           REAL NOT NULL CHECK (total_amount_mon > 0),
    total_amount_gwei          INTEGER NOT NULL CHECK (total_amount_gwei > 0),
    PRIMARY KEY (analysis_run_id, wallet_address),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS market_summary (
    analysis_run_id        TEXT NOT NULL,
    market_id              TEXT NOT NULL,
    trade_count            INTEGER NOT NULL CHECK (trade_count >= 0),
    unique_wallets         INTEGER NOT NULL CHECK (unique_wallets >= 0),
    total_amount_wei       TEXT NOT NULL CHECK (total_amount_wei NOT GLOB '*[^0-9]*'),
    total_amount_mon       REAL NOT NULL CHECK (total_amount_mon >= 0),
    total_amount_gwei      INTEGER NOT NULL CHECK (total_amount_gwei >= 0),
    average_position_mon   REAL,
    yes_amount_wei         TEXT NOT NULL CHECK (yes_amount_wei NOT GLOB '*[^0-9]*'),
    no_amount_wei          TEXT NOT NULL CHECK (no_amount_wei NOT GLOB '*[^0-9]*'),
    yes_amount_gwei        INTEGER NOT NULL CHECK (yes_amount_gwei >= 0),
    no_amount_gwei         INTEGER NOT NULL CHECK (no_amount_gwei >= 0),
    yes_wallets            INTEGER NOT NULL CHECK (yes_wallets >= 0),
    no_wallets             INTEGER NOT NULL CHECK (no_wallets >= 0),
    both_outcome_wallets   INTEGER NOT NULL CHECK (both_outcome_wallets >= 0),
    first_touch_wallets    INTEGER NOT NULL CHECK (first_touch_wallets >= 0),
    CHECK (total_amount_gwei = yes_amount_gwei + no_amount_gwei),
    CHECK (unique_wallets = yes_wallets + no_wallets - both_outcome_wallets),
    PRIMARY KEY (analysis_run_id, market_id),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_quality_results (
    analysis_run_id   TEXT NOT NULL,
    check_name        TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN')),
    sql_value         TEXT,
    pandas_value      TEXT,
    tolerance         TEXT,
    details_json      TEXT NOT NULL CHECK (json_valid(details_json)),
    checked_at        TEXT NOT NULL CHECK (substr(checked_at, -1, 1) = 'Z'),
    PRIMARY KEY (analysis_run_id, check_name),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metric_evidence (
    analysis_run_id       TEXT NOT NULL,
    metric_id             TEXT NOT NULL,
    definition            TEXT NOT NULL,
    numerator_definition  TEXT,
    denominator_definition TEXT,
    sql_file              TEXT NOT NULL,
    sample_size           INTEGER NOT NULL CHECK (sample_size >= 0),
    sample_tx_hashes_json TEXT NOT NULL CHECK (json_valid(sample_tx_hashes_json)),
    limitations           TEXT NOT NULL,
    PRIMARY KEY (analysis_run_id, metric_id),
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs (analysis_run_id)
        ON DELETE CASCADE
);
