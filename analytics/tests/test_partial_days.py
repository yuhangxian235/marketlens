from __future__ import annotations

from conftest import CONTRACT
from test_metrics import _indexed_sample

from marketlens.transform import AnalysisWindow, AnalyticsPipeline


def test_d1_is_ineligible_when_first_seen_day_is_partial(store, paths):
    _indexed_sample(store, paths)
    result = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            143,
            CONTRACT,
            0,
            7,
            "2026-07-26T00:30:00Z",
            "2026-07-29T00:00:00Z",
        )
    )

    eligibility = store.connection.execute(
        """
        SELECT DISTINCT d1_eligible, next_day_returned
        FROM wallet_summary
        WHERE analysis_run_id = ? AND first_seen_date = '2026-07-26'
        """,
        (result.analysis_run_id,),
    ).fetchall()
    assert [tuple(row) for row in eligibility] == [(0, None)]


def test_d1_is_ineligible_when_block_range_does_not_cover_full_days(store, paths):
    _indexed_sample(store, paths)
    result = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            143,
            CONTRACT,
            1,
            6,
            "2026-07-26T00:00:00Z",
            "2026-07-29T00:00:00Z",
        )
    )

    eligibility = store.connection.execute(
        """
        SELECT DISTINCT d1_eligible, next_day_returned
        FROM wallet_summary
        WHERE analysis_run_id = ? AND first_seen_date = '2026-07-26'
        """,
        (result.analysis_run_id,),
    ).fetchall()
    assert [tuple(row) for row in eligibility] == [(0, None)]
