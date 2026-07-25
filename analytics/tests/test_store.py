from __future__ import annotations

import sqlite3

import pytest


def test_foreign_keys_reject_analysis_day_without_run(store):
    with pytest.raises(sqlite3.IntegrityError):
        store.connection.execute(
            """
            INSERT INTO analysis_days (
                analysis_run_id, utc_date, is_complete,
                first_block_number, last_block_number, partial_reason
            ) VALUES ('missing-run', '2026-07-26', 1, 1, 2, NULL)
            """
        )
