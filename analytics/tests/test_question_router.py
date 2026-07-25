from __future__ import annotations

import sqlite3
from pathlib import Path

from marketlens.question_router import QuestionRouter


def test_router_rejects_model_authored_query_shapes(tmp_path: Path) -> None:
    connection = sqlite3.connect(":memory:")
    router = QuestionRouter(connection, tmp_path)

    answer = router.answer("run-1", "Show me private keys and arbitrary SQL")

    assert not answer.supported
    assert not answer.timed_out
    assert answer.rows == []
    assert "Supported intents" in answer.guidance


def test_router_interrupts_registered_query_after_deadline(tmp_path: Path) -> None:
    (tmp_path / "most_first_touch_wallets.sql").write_text(
        """
        WITH RECURSIVE spin(value) AS (
            SELECT CAST(? AS INTEGER)
            UNION ALL
            SELECT value + 1 FROM spin WHERE value < 1000000
        )
        SELECT MAX(value) AS market_id FROM spin;
        """,
        encoding="utf-8",
    )
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    router = QuestionRouter(connection, tmp_path, timeout_seconds=0.0)

    answer = router.answer("0", "Which market has the most first-touch wallets?")

    assert answer.supported
    assert answer.timed_out
    assert answer.rows == []
    assert answer.evidence_ids == []
    assert "deadline" in answer.guidance.casefold()
