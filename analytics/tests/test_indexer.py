from __future__ import annotations

from datetime import UTC, datetime

import pytest
from conftest import CONTRACT, FakeDecoder, FakeRpc, block, market_created, position_bought

from marketlens.decode import AbiEventDecoder
from marketlens.indexer import EventIndexer


def test_sync_is_idempotent_at_the_public_event_ledger_seam(store, paths):
    timestamp = int(datetime(2026, 7, 26, tzinfo=UTC).timestamp())
    rpc = FakeRpc({10: block(10, timestamp)}, [market_created(10, "1", "11")])
    indexer = EventIndexer(
        rpc,
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )

    first = indexer.sync(CONTRACT, 10, 10)
    second = indexer.sync(CONTRACT, 10, 10)

    assert first.fetched_log_count == 1
    assert first.unique_log_count == 1
    assert second.fetched_log_count == 1
    assert second.unique_log_count == 0
    assert second.duplicate_log_count == 1
    assert store.connection.execute("SELECT COUNT(*) FROM markets").fetchone()[0] == 1
    assert store.connection.execute("SELECT COUNT(*) FROM raw_contract_events").fetchone()[0] == 1


def test_sync_records_decode_failure_without_normalizing_unknown_log(store, paths):
    timestamp = int(datetime(2026, 7, 26, tzinfo=UTC).timestamp())
    rpc = FakeRpc({10: block(10, timestamp)}, [market_created(10, "1", "11")])
    indexer = EventIndexer(
        rpc,
        store,
        AbiEventDecoder([]),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )

    report = indexer.sync(CONTRACT, 10, 10)

    assert report.decode_error_count == 1
    row = store.connection.execute(
        "SELECT decode_status, event_name FROM raw_contract_events"
    ).fetchone()
    assert tuple(row) == ("ERROR", None)
    assert store.connection.execute("SELECT COUNT(*) FROM markets").fetchone()[0] == 0


def test_sync_fails_closed_when_block_timestamp_is_missing(store, paths):
    timestamp = int(datetime(2026, 7, 26, tzinfo=UTC).timestamp())
    missing_timestamp = block(10, timestamp)
    del missing_timestamp["timestamp"]
    rpc = FakeRpc({10: missing_timestamp}, [market_created(10, "1", "11")])
    indexer = EventIndexer(
        rpc,
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )

    with pytest.raises(KeyError, match="timestamp"):
        indexer.sync(CONTRACT, 10, 10)

    status = store.connection.execute("SELECT status FROM ingest_runs").fetchone()[0]
    assert status == "FAILED"


def test_normalization_preserves_aligned_wei_above_sqlite_integer_limit(store, paths):
    timestamp = int(datetime(2026, 7, 26, tzinfo=UTC).timestamp())
    amount_gwei = 10_000_000_000
    rpc = FakeRpc(
        {
            10: block(10, timestamp, "10"),
            11: block(11, timestamp + 1, "11"),
        },
        [
            market_created(10, "1", "10"),
            position_bought(
                11,
                "1",
                "0x" + "11" * 20,
                "YES",
                amount_gwei,
                "11",
            ),
        ],
    )
    EventIndexer(
        rpc,
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    ).sync(CONTRACT, 10, 11)

    row = store.connection.execute("SELECT amount_wei, amount_gwei FROM position_buys").fetchone()
    assert tuple(row) == (str(amount_gwei * 1_000_000_000), amount_gwei)
