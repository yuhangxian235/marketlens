from __future__ import annotations

from datetime import UTC, datetime

from conftest import CONTRACT, FakeDecoder, FakeRpc, block, market_created

from marketlens.indexer import EventIndexer


def test_checkpoint_hash_change_marks_old_events_removed(store, paths):
    timestamp = int(datetime(2026, 7, 26, tzinfo=UTC).timestamp())
    rpc = FakeRpc({10: block(10, timestamp, "aa")}, [market_created(10, "1", "11")])
    indexer = EventIndexer(
        rpc,
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )
    indexer.sync(CONTRACT, 10, 10)

    rpc.blocks[10] = block(10, timestamp + 1, "bb")
    rpc.logs = [market_created(10, "2", "22")]
    indexer.sync(CONTRACT, 10, 10)

    rows = store.connection.execute(
        "SELECT market_id, removed FROM raw_contract_events ORDER BY market_id"
    ).fetchall()
    assert [tuple(row) for row in rows] == [("1", 1), ("2", 0)]
    markets = store.connection.execute("SELECT market_id FROM markets").fetchall()
    assert [row[0] for row in markets] == ["2"]
