from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class QuestionAnswer:
    intent_id: str | None
    supported: bool
    rows: list[dict[str, Any]]
    evidence_ids: list[str]
    guidance: str
    timed_out: bool = False


class QuestionRouter:
    _intents = {
        "most_first_touch_wallets": (
            ("first touch", "first-touch", "首次", "首触", "初次"),
            "most_first_touch_wallets.sql",
        ),
        "low_repeat_participation": (
            ("low repeat", "lowest repeat", "低复购", "低重复", "重复参与低"),
            "low_repeat_participation.sql",
        ),
        "multi_market_wallets": (
            ("multiple markets", "multi-market", "跨市场", "多个市场", "多市场"),
            "multi_market_wallets.sql",
        ),
    }

    def __init__(
        self,
        connection: sqlite3.Connection,
        question_sql_dir: Path,
        *,
        timeout_seconds: float = 0.25,
    ) -> None:
        self.connection = connection
        self.question_sql_dir = question_sql_dir
        self.timeout_seconds = timeout_seconds

    def answer(self, analysis_run_id: str, question: str) -> QuestionAnswer:
        normalized = question.casefold()
        selected = next(
            (
                (intent_id, filename)
                for intent_id, (phrases, filename) in self._intents.items()
                if any(phrase.casefold() in normalized for phrase in phrases)
            ),
            None,
        )
        supported = ", ".join(self._intents)
        if selected is None:
            return QuestionAnswer(
                None,
                False,
                [],
                [],
                f"Supported intents: {supported}",
            )
        intent_id, filename = selected
        sql = (self.question_sql_dir / filename).read_text(encoding="utf-8")
        deadline = time.monotonic() + max(0.0, self.timeout_seconds)
        self.connection.set_progress_handler(
            lambda: int(time.monotonic() >= deadline),
            1_000,
        )
        try:
            rows = [
                dict(row) for row in self.connection.execute(sql, (analysis_run_id,)).fetchmany(50)
            ]
        except sqlite3.OperationalError as error:
            if "interrupted" not in str(error).casefold():
                raise
            return QuestionAnswer(
                intent_id,
                True,
                [],
                [],
                "The registered read-only query exceeded its execution deadline.",
                timed_out=True,
            )
        finally:
            self.connection.set_progress_handler(None, 0)
        evidence_ids = (
            ["global.multi_market_share"]
            if intent_id == "multi_market_wallets"
            else [f"market.{row['market_id']}.first_touch_wallets" for row in rows]
        )
        return QuestionAnswer(
            intent_id,
            True,
            rows,
            evidence_ids,
            "Result came from a pre-registered read-only SQL file; no model-authored SQL ran.",
        )
