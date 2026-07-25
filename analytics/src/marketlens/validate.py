from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    sql_value: str
    pandas_value: str
    details: dict[str, Any]


@dataclass(frozen=True)
class ValidationReport:
    checks: tuple[CheckResult, ...]

    @property
    def publishable(self) -> bool:
        return bool(self.checks) and all(check.status == "PASS" for check in self.checks)


class DataValidator:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def validate(self, run_id: str) -> ValidationReport:
        run = self.connection.execute(
            "SELECT * FROM analysis_runs WHERE analysis_run_id = ?", (run_id,)
        ).fetchone()
        buys = pd.read_sql_query(
            """
            SELECT * FROM position_buys
            WHERE chain_id = ? AND contract_address = ?
              AND block_number BETWEEN ? AND ?
              AND block_timestamp >= ? AND block_timestamp < ?
            """,
            self.connection,
            params=(
                run["chain_id"],
                run["contract_address"],
                run["from_block"],
                run["to_block"],
                run["window_start_ts"],
                run["window_end_ts"],
            ),
        )
        checks: list[CheckResult] = []

        sql_wallets = int(
            self.connection.execute(
                "SELECT COUNT(*) FROM wallet_summary WHERE analysis_run_id = ?",
                (run_id,),
            ).fetchone()[0]
        )
        pandas_wallets = int(buys["wallet_address"].nunique()) if not buys.empty else 0
        checks.append(
            self._check(
                "distinct_wallet_count",
                sql_wallets,
                pandas_wallets,
                {"unit": "wallet addresses"},
            )
        )

        cohort_total = int(
            self.connection.execute(
                """
                SELECT COUNT(*) FROM wallet_summary
                WHERE analysis_run_id = ?
                """,
                (run_id,),
            ).fetchone()[0]
        )
        checks.append(
            self._check(
                "cohort_sum_equals_distinct_wallets",
                cohort_total,
                pandas_wallets,
                {"semantics": "first-seen-in-sample"},
            )
        )

        sql_volume_rows = self.connection.execute(
            """
            SELECT market_id, total_amount_gwei FROM market_summary
            WHERE analysis_run_id = ? ORDER BY market_id
            """,
            (run_id,),
        ).fetchall()
        sql_volumes = {str(row[0]): int(row[1]) for row in sql_volume_rows}
        pandas_volumes = (
            {
                str(key): int(value)
                for key, value in buys.groupby("market_id")["amount_gwei"].sum().items()
            }
            if not buys.empty
            else {}
        )
        checks.append(
            self._check(
                "per_market_volume_gwei",
                sql_volumes,
                pandas_volumes,
                {"exact": True},
            )
        )

        sql_sides = self.connection.execute(
            """
            SELECT COALESCE(SUM(total_amount_gwei), 0),
                   COALESCE(SUM(yes_amount_gwei + no_amount_gwei), 0)
            FROM market_summary WHERE analysis_run_id = ?
            """,
            (run_id,),
        ).fetchone()
        checks.append(
            self._check(
                "yes_plus_no_equals_total",
                int(sql_sides[0]),
                int(sql_sides[1]),
                {"unit": "gwei"},
            )
        )

        sql_payout = str(
            self.connection.execute(
                """
                SELECT COALESCE(uint256_sum(payout_wei), '0') FROM reward_claims
                WHERE chain_id = ? AND contract_address = ?
                  AND block_number BETWEEN ? AND ?
                """,
                (
                    run["chain_id"],
                    run["contract_address"],
                    run["from_block"],
                    run["to_block"],
                ),
            ).fetchone()[0]
        )
        payout_rows = self.connection.execute(
            """
            SELECT payout_wei FROM reward_claims
            WHERE chain_id = ? AND contract_address = ?
              AND block_number BETWEEN ? AND ?
            """,
            (
                run["chain_id"],
                run["contract_address"],
                run["from_block"],
                run["to_block"],
            ),
        ).fetchall()
        python_payout = str(sum(int(row[0]) for row in payout_rows))
        checks.append(
            self._check(
                "claimed_payout_wei",
                sql_payout,
                python_payout,
                {"exact": True, "implementation": "SQLite uint256_sum vs Python int"},
            )
        )

        latest_ingest = self.connection.execute(
            """
            SELECT fetched_log_count, unique_log_count, decode_error_count
            FROM ingest_runs WHERE chain_id = ? AND contract_address = ?
            ORDER BY started_at DESC LIMIT 1
            """,
            (run["chain_id"], run["contract_address"]),
        ).fetchone()
        if latest_ingest:
            checks.append(
                CheckResult(
                    "decode_errors",
                    "PASS" if int(latest_ingest[2]) == 0 else "FAIL",
                    str(latest_ingest[2]),
                    "0",
                    {
                        "fetchedLogs": int(latest_ingest[0]),
                        "uniqueLogs": int(latest_ingest[1]),
                    },
                )
            )

        checked_at = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
        for check in checks:
            self.connection.execute(
                """
                INSERT INTO data_quality_results (
                    analysis_run_id, check_name, status, sql_value, pandas_value,
                    tolerance, details_json, checked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    check.name,
                    check.status,
                    check.sql_value,
                    check.pandas_value,
                    "0",
                    json.dumps(check.details, sort_keys=True),
                    checked_at,
                ),
            )
        return ValidationReport(tuple(checks))

    @staticmethod
    def _check(
        name: str, sql_value: Any, pandas_value: Any, details: dict[str, Any]
    ) -> CheckResult:
        status = "PASS" if sql_value == pandas_value else "FAIL"

        def encode(value: Any) -> str:
            return json.dumps(value, sort_keys=True) if isinstance(value, dict) else str(value)

        return CheckResult(name, status, encode(sql_value), encode(pandas_value), details)
