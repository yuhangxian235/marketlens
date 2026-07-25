from __future__ import annotations

from datetime import UTC, datetime

import pytest
from conftest import (
    CONTRACT,
    WALLET_1,
    WALLET_2,
    WALLET_3,
    FakeDecoder,
    FakeRpc,
    block,
    market_created,
    position_bought,
)

from marketlens.evidence import EvidenceCatalog
from marketlens.indexer import EventIndexer
from marketlens.transform import AnalysisWindow, AnalyticsPipeline


def _indexed_sample(store, paths):
    days = [
        int(datetime(2026, 7, 26, 1, tzinfo=UTC).timestamp()),
        int(datetime(2026, 7, 27, 1, tzinfo=UTC).timestamp()),
        int(datetime(2026, 7, 28, 1, tzinfo=UTC).timestamp()),
    ]
    blocks = {
        0: block(0, int(datetime(2026, 7, 26, tzinfo=UTC).timestamp()), "00"),
        1: block(1, days[0], "01"),
        2: block(2, days[0] + 1, "02"),
        3: block(3, days[0] + 2, "03"),
        4: block(4, days[1], "04"),
        5: block(5, days[1] + 1, "05"),
        6: block(6, days[2], "06"),
        7: block(7, int(datetime(2026, 7, 29, tzinfo=UTC).timestamp()), "08"),
    }
    logs = [
        market_created(1, "1", "01"),
        market_created(2, "2", "02"),
        position_bought(3, "1", WALLET_1, "YES", 2, "03"),
        position_bought(3, "1", WALLET_2, "NO", 3, "04"),
        position_bought(4, "2", WALLET_1, "YES", 1, "05"),
        position_bought(5, "1", WALLET_3, "YES", 4, "06"),
        position_bought(6, "1", WALLET_3, "YES", 5, "07"),
    ]
    indexer = EventIndexer(
        FakeRpc(blocks, logs),
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )
    indexer.sync(CONTRACT, 0, 7)


def test_pipeline_computes_repeat_and_market_metrics_independently(store, paths):
    _indexed_sample(store, paths)
    pipeline = AnalyticsPipeline(store.connection, paths.sql)
    result = pipeline.run(
        AnalysisWindow(
            143,
            CONTRACT,
            0,
            7,
            "2026-07-26T00:00:00Z",
            "2026-07-29T00:00:00Z",
        )
    )

    assert result.publishable
    wallets = store.connection.execute(
        """
        SELECT wallet_address, active_days, markets_joined, d1_eligible,
               next_day_returned
        FROM wallet_summary WHERE analysis_run_id = ?
        ORDER BY wallet_address
        """,
        (result.analysis_run_id,),
    ).fetchall()
    assert [tuple(row) for row in wallets] == [
        (WALLET_1, 2, 2, 1, 1),
        (WALLET_2, 1, 1, 1, 0),
        (WALLET_3, 2, 1, 1, 1),
    ]
    market_one = store.connection.execute(
        """
        SELECT trade_count, unique_wallets, total_amount_gwei,
               yes_amount_gwei, no_amount_gwei
        FROM market_summary
        WHERE analysis_run_id = ? AND market_id = '1'
        """,
        (result.analysis_run_id,),
    ).fetchone()
    assert tuple(market_one) == (4, 3, 14, 11, 3)


def test_evidence_sample_transactions_stay_inside_analysis_run(store, paths):
    _indexed_sample(store, paths)
    result = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            143,
            CONTRACT,
            1,
            3,
            "2026-07-26T00:00:00Z",
            "2026-07-27T00:00:00Z",
        )
    )

    catalog = EvidenceCatalog(store.connection)
    catalog._materialize_evidence(result.analysis_run_id)
    evidence = catalog.get("market.1.trade_count", result.analysis_run_id)

    assert evidence.sample_tx_hashes == ["0x" + "03" * 32, "0x" + "04" * 32]


def test_first_touch_uses_transaction_and_log_order_not_rpc_list_order(store, paths):
    timestamp = int(datetime(2026, 7, 26, 1, tzinfo=UTC).timestamp())
    wallet = "0x" + "44" * 20
    blocks = {
        1: block(1, timestamp - 2, "11"),
        2: block(2, timestamp - 1, "12"),
        3: block(3, timestamp, "13"),
    }
    logs = [
        market_created(1, "1", "11"),
        market_created(2, "2", "12"),
        position_bought(3, "2", wallet, "YES", 1, "21", transaction_index=1),
        position_bought(3, "1", wallet, "YES", 1, "20", transaction_index=0),
    ]
    EventIndexer(
        FakeRpc(blocks, logs),
        store,
        FakeDecoder(),
        abi_json="[]",
        normalize_sql_path=paths.sql / "normalize_events.sql",
    ).sync(CONTRACT, 1, 3)
    result = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            143,
            CONTRACT,
            1,
            3,
            "2026-07-26T00:00:00Z",
            "2026-07-27T00:00:00Z",
        )
    )

    first_touch = store.connection.execute(
        "SELECT first_touch_market_id FROM wallet_summary WHERE analysis_run_id = ?",
        (result.analysis_run_id,),
    ).fetchone()[0]
    assert first_touch == "1"


def test_evidence_export_fails_closed_when_required_check_is_missing(store, paths, tmp_path):
    _indexed_sample(store, paths)
    result = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            143,
            CONTRACT,
            0,
            7,
            "2026-07-26T00:00:00Z",
            "2026-07-29T00:00:00Z",
        )
    )
    store.connection.execute(
        """
        DELETE FROM data_quality_results
        WHERE analysis_run_id = ? AND check_name = 'decode_errors'
        """,
        (result.analysis_run_id,),
    )

    with pytest.raises(RuntimeError, match="missing"):
        EvidenceCatalog(store.connection).export(result.analysis_run_id, tmp_path)
