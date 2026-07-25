from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from .validate import DataValidator, ValidationReport


def _parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamps must include UTC timezone")
    return parsed.astimezone(UTC)


def _utc(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


@dataclass(frozen=True)
class AnalysisWindow:
    chain_id: int
    contract_address: str
    from_block: int
    to_block: int
    window_start_ts: str
    window_end_ts: str


@dataclass(frozen=True)
class AnalysisRun:
    analysis_run_id: str
    publishable: bool
    validation: ValidationReport


class AnalyticsPipeline:
    version = "marketlens-pipeline-v1.1-baseline"

    def __init__(self, connection: sqlite3.Connection, sql_dir: Path) -> None:
        self.connection = connection
        self.sql_dir = sql_dir

    def run(self, window: AnalysisWindow) -> AnalysisRun:
        start = _parse_utc(window.window_start_ts)
        end = _parse_utc(window.window_end_ts)
        if end <= start:
            raise ValueError("analysis window end must be after start")
        if window.to_block < window.from_block:
            raise ValueError("analysis block range is invalid")

        run_id = f"analysis-{uuid4()}"
        start_partial = int(start.time() != datetime.min.time())
        end_partial = int(end.time() != datetime.min.time())
        source_count = self.connection.execute(
            """
            SELECT COUNT(*) FROM position_buys
            WHERE chain_id = ? AND contract_address = ?
              AND block_number BETWEEN ? AND ?
              AND block_timestamp >= ? AND block_timestamp < ?
            """,
            (
                window.chain_id,
                window.contract_address.lower(),
                window.from_block,
                window.to_block,
                _utc(start),
                _utc(end),
            ),
        ).fetchone()[0]
        self.connection.execute(
            """
            INSERT INTO analysis_runs (
                analysis_run_id, chain_id, contract_address, from_block, to_block,
                window_start_ts, window_end_ts, start_day_is_partial,
                end_day_is_partial, pipeline_version, source_event_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                window.chain_id,
                window.contract_address.lower(),
                window.from_block,
                window.to_block,
                _utc(start),
                _utc(end),
                start_partial,
                end_partial,
                self.version,
                source_count,
                _utc(datetime.now(UTC)),
            ),
        )
        self._insert_analysis_days(run_id, start, end, window)
        self.connection.execute("DROP TABLE IF EXISTS temp._analysis_context")
        self.connection.execute(
            """
            CREATE TEMP TABLE _analysis_context AS
            SELECT
                analysis_run_id, chain_id, contract_address, from_block, to_block,
                window_start_ts, window_end_ts
            FROM analysis_runs WHERE analysis_run_id = ?
            """,
            (run_id,),
        )
        for filename in (
            "wallet_repeat_participation.sql",
            "wallet_first_seen.sql",
            "market_activity.sql",
        ):
            self.connection.executescript((self.sql_dir / filename).read_text(encoding="utf-8"))

        validation = DataValidator(self.connection).validate(run_id)
        self.connection.commit()
        return AnalysisRun(run_id, validation.publishable, validation)

    def _insert_analysis_days(
        self,
        run_id: str,
        start: datetime,
        end: datetime,
        window: AnalysisWindow,
    ) -> None:
        coverage = self.connection.execute(
            """
            SELECT MIN(block_timestamp), MAX(block_timestamp)
            FROM chain_blocks
            WHERE chain_id = ? AND canonical = 1
              AND block_number BETWEEN ? AND ?
            """,
            (window.chain_id, window.from_block, window.to_block),
        ).fetchone()
        coverage_start = coverage[0] if coverage else None
        coverage_end = coverage[1] if coverage else None
        current: date = start.date()
        last_inclusive = (end - timedelta(microseconds=1)).date()
        while current <= last_inclusive:
            day_start = datetime.combine(current, datetime.min.time(), tzinfo=UTC)
            day_end = day_start + timedelta(days=1)
            window_complete = start <= day_start and end >= day_end
            block_range_complete = (
                coverage_start is not None
                and coverage_end is not None
                and coverage_start <= _utc(day_start)
                and coverage_end >= _utc(day_end)
            )
            complete = window_complete and block_range_complete
            block_row = self.connection.execute(
                """
                SELECT MIN(block_number), MAX(block_number)
                FROM chain_blocks
                WHERE chain_id = ? AND canonical = 1
                  AND block_number BETWEEN ? AND ?
                  AND block_timestamp >= ? AND block_timestamp < ?
                """,
                (
                    window.chain_id,
                    window.from_block,
                    window.to_block,
                    _utc(day_start),
                    _utc(day_end),
                ),
            ).fetchone()
            if complete:
                reason = None
            elif not window_complete:
                reason = "analysis window does not cover full UTC day"
            else:
                reason = "indexed block range does not bracket full UTC day"
            self.connection.execute(
                """
                INSERT INTO analysis_days (
                    analysis_run_id, utc_date, is_complete, first_block_number,
                    last_block_number, partial_reason
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    current.isoformat(),
                    int(complete),
                    block_row[0],
                    block_row[1],
                    reason,
                ),
            )
            current += timedelta(days=1)
