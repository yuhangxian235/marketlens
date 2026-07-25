from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

REQUIRED_BASELINE_CHECKS = frozenset(
    {
        "distinct_wallet_count",
        "cohort_sum_equals_distinct_wallets",
        "per_market_volume_gwei",
        "yes_plus_no_equals_total",
        "claimed_payout_wei",
        "decode_errors",
    }
)


@dataclass(frozen=True)
class MetricEvidence:
    metric_id: str
    definition: str
    numerator_definition: str
    denominator_definition: str
    sql_file: str
    sample_size: int
    sample_tx_hashes: list[str]
    limitations: str


class EvidenceCatalog:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def get(self, metric_id: str, analysis_run_id: str) -> MetricEvidence:
        row = self.connection.execute(
            """
            SELECT * FROM metric_evidence
            WHERE analysis_run_id = ? AND metric_id = ?
            """,
            (analysis_run_id, metric_id),
        ).fetchone()
        if row is None:
            raise KeyError(metric_id)
        return MetricEvidence(
            metric_id=row["metric_id"],
            definition=row["definition"],
            numerator_definition=row["numerator_definition"] or "not_applicable",
            denominator_definition=row["denominator_definition"] or "not_applicable",
            sql_file=row["sql_file"],
            sample_size=int(row["sample_size"]),
            sample_tx_hashes=json.loads(row["sample_tx_hashes_json"]),
            limitations=row["limitations"],
        )

    def export(self, analysis_run_id: str, output_dir: Path) -> dict[str, Path]:
        run = self.connection.execute(
            "SELECT * FROM analysis_runs WHERE analysis_run_id = ?",
            (analysis_run_id,),
        ).fetchone()
        if run is None:
            raise KeyError(analysis_run_id)
        quality = self.connection.execute(
            """
            SELECT * FROM data_quality_results
            WHERE analysis_run_id = ? ORDER BY check_name
            """,
            (analysis_run_id,),
        ).fetchall()
        status_by_name = {row["check_name"]: row["status"] for row in quality}
        missing = sorted(REQUIRED_BASELINE_CHECKS - status_by_name.keys())
        if missing:
            raise RuntimeError(f"evidence publication blocked by missing checks: {missing}")
        not_passing = sorted(
            name for name in REQUIRED_BASELINE_CHECKS if status_by_name.get(name) != "PASS"
        )
        if not_passing:
            raise RuntimeError(f"evidence publication blocked by checks: {not_passing}")

        self._materialize_evidence(analysis_run_id)
        evidence_rows = self.connection.execute(
            """
            SELECT metric_id FROM metric_evidence
            WHERE analysis_run_id = ? ORDER BY metric_id
            """,
            (analysis_run_id,),
        ).fetchall()
        evidence = {
            row["metric_id"]: asdict(self.get(row["metric_id"], analysis_run_id))
            for row in evidence_rows
        }
        market_rows = self.connection.execute(
            """
            SELECT
                markets.market_id, markets.question, markets.question_hash,
                markets.closes_at, markets.creator_wallet,
                summary.trade_count, summary.unique_wallets,
                summary.total_amount_mon, summary.yes_amount_gwei,
                summary.no_amount_gwei, summary.first_touch_wallets,
                resolutions.resolved_outcome, resolutions.refund_mode
            FROM markets
            JOIN market_summary AS summary
              ON summary.market_id = markets.market_id
             AND summary.analysis_run_id = ?
            LEFT JOIN market_resolutions AS resolutions
              ON resolutions.chain_id = markets.chain_id
             AND resolutions.contract_address = markets.contract_address
             AND resolutions.market_id = markets.market_id
            WHERE markets.chain_id = ? AND markets.contract_address = ?
            ORDER BY CAST(markets.market_id AS INTEGER)
            """,
            (analysis_run_id, run["chain_id"], run["contract_address"]),
        ).fetchall()
        markets = [
            {
                "marketId": row["market_id"],
                "question": row["question"],
                "questionHash": row["question_hash"],
                "closesAt": row["closes_at"],
                "creatorWallet": row["creator_wallet"],
                "tradeCount": int(row["trade_count"]),
                "uniqueWallets": int(row["unique_wallets"]),
                "totalAmountMon": float(row["total_amount_mon"]),
                "yesAmountGwei": int(row["yes_amount_gwei"]),
                "noAmountGwei": int(row["no_amount_gwei"]),
                "firstTouchWallets": int(row["first_touch_wallets"]),
                "resolvedOutcome": row["resolved_outcome"],
                "refundMode": bool(row["refund_mode"]) if row["refund_mode"] is not None else None,
            }
            for row in market_rows
        ]
        overview = self.connection.execute(
            """
            SELECT
                COUNT(*) AS all_wallets,
                SUM(CASE WHEN markets_joined >= 2 THEN 1 ELSE 0 END)
                    AS multi_market_wallets,
                SUM(returned_later_in_sample) AS returned_wallets,
                SUM(d1_eligible) AS d1_eligible_wallets,
                SUM(CASE WHEN next_day_returned = 1 THEN 1 ELSE 0 END)
                    AS d1_returned_wallets
            FROM wallet_summary WHERE analysis_run_id = ?
            """,
            (analysis_run_id,),
        ).fetchone()
        all_wallets = int(overview["all_wallets"] or 0)
        multi_wallets = int(overview["multi_market_wallets"] or 0)
        d1_eligible = int(overview["d1_eligible_wallets"] or 0)
        d1_returned = int(overview["d1_returned_wallets"] or 0)
        analytics = {
            "analysisRunId": analysis_run_id,
            "allWallets": all_wallets,
            "multiMarketWallets": multi_wallets,
            "multiMarketShare": multi_wallets / all_wallets if all_wallets else None,
            "returnedLaterWallets": int(overview["returned_wallets"] or 0),
            "d1EligibleWallets": d1_eligible,
            "d1ReturnedWallets": d1_returned,
            "d1RepeatRate": d1_returned / d1_eligible if d1_eligible else None,
            "semantics": {
                "wallet": "address-level participant, not a natural person",
                "firstSeen": "first-seen-in-sample, not platform acquisition",
                "repeat": "sample repeat participation, not platform retention",
            },
        }
        manifest = {
            "schemaVersion": 1,
            "analysisRunId": analysis_run_id,
            "publishable": True,
            "chainId": int(run["chain_id"]),
            "contractAddress": run["contract_address"],
            "fromBlock": int(run["from_block"]),
            "toBlock": int(run["to_block"]),
            "windowStart": run["window_start_ts"],
            "windowEnd": run["window_end_ts"],
            "pipelineVersion": run["pipeline_version"],
            "generatedAt": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "qualityChecks": [
                {
                    "name": row["check_name"],
                    "status": row["status"],
                    "sqlValue": row["sql_value"],
                    "pandasValue": row["pandas_value"],
                }
                for row in quality
            ],
        }

        output_dir.mkdir(parents=True, exist_ok=True)
        outputs: dict[str, Path] = {}
        for name, value in (
            ("manifest", manifest),
            ("markets", markets),
            ("analytics", analytics),
            ("evidence", evidence),
        ):
            path = output_dir / f"{name}.json"
            path.write_text(
                json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            outputs[name] = path
        return outputs

    def _materialize_evidence(self, run_id: str) -> None:
        run = self.connection.execute(
            """
            SELECT chain_id, contract_address, from_block, to_block,
                   window_start_ts, window_end_ts
            FROM analysis_runs WHERE analysis_run_id = ?
            """,
            (run_id,),
        ).fetchone()
        if run is None:
            raise KeyError(run_id)
        self.connection.execute("DELETE FROM metric_evidence WHERE analysis_run_id = ?", (run_id,))
        wallets = int(
            self.connection.execute(
                "SELECT COUNT(*) FROM wallet_summary WHERE analysis_run_id = ?",
                (run_id,),
            ).fetchone()[0]
        )
        common_limitations = (
            "Address-level, first-seen-in-sample evidence from the configured block/time "
            "window. Seeded local-fork data is a reproducibility fixture, not product evidence."
        )
        global_metrics = [
            (
                "global.unique_wallets",
                "Distinct wallet addresses with a qualifying PositionBought event.",
                "Distinct wallet addresses",
                "not_applicable",
                "wallet_first_seen.sql",
            ),
            (
                "global.multi_market_share",
                "Share of sampled wallets that joined at least two markets.",
                "Wallets with markets_joined >= 2",
                "All sampled wallets",
                "cross_market.sql",
            ),
            (
                "global.d1_repeat_rate",
                "Eligible wallets active on the UTC day after first-seen-in-sample.",
                "Eligible wallets with next_day_returned = 1",
                "Wallets whose cohort day and next UTC day are complete",
                "wallet_first_seen.sql",
            ),
        ]
        for metric in global_metrics:
            self._insert(run_id, *metric, wallets, common_limitations, [])

        market_rows = self.connection.execute(
            """
            SELECT market_id, trade_count, unique_wallets
            FROM market_summary WHERE analysis_run_id = ?
            """,
            (run_id,),
        ).fetchall()
        for market in market_rows:
            hashes = [
                row[0]
                for row in self.connection.execute(
                    """
                    SELECT transaction_hash FROM position_buys
                    WHERE chain_id = ?
                      AND contract_address = ?
                      AND market_id = ?
                      AND block_number BETWEEN ? AND ?
                      AND block_timestamp >= ?
                      AND block_timestamp < ?
                    ORDER BY block_number, transaction_index, log_index
                    LIMIT 3
                    """,
                    (
                        run["chain_id"],
                        run["contract_address"],
                        market["market_id"],
                        run["from_block"],
                        run["to_block"],
                        run["window_start_ts"],
                        run["window_end_ts"],
                    ),
                ).fetchall()
            ]
            prefix = f"market.{market['market_id']}"
            for suffix, definition, numerator, denominator in (
                (
                    "trade_count",
                    "Qualifying PositionBought events for this market.",
                    "Distinct event keys",
                    "not_applicable",
                ),
                (
                    "unique_wallets",
                    "Distinct wallet addresses buying in this market.",
                    "Distinct wallet addresses",
                    "not_applicable",
                ),
                (
                    "total_amount_mon",
                    "Total aligned contribution amount, displayed in MON.",
                    "Sum of exact contribution gwei",
                    "not_applicable",
                ),
                (
                    "first_touch_wallets",
                    "Wallets whose earliest sampled buy is in this market.",
                    "Wallets first touching this market",
                    "All sampled wallets",
                ),
            ):
                self._insert(
                    run_id,
                    f"{prefix}.{suffix}",
                    definition,
                    numerator,
                    denominator,
                    "market_activity.sql",
                    wallets,
                    common_limitations,
                    hashes,
                )

    def _insert(
        self,
        run_id: str,
        metric_id: str,
        definition: str,
        numerator: str,
        denominator: str,
        sql_file: str,
        sample_size: int,
        limitations: str,
        hashes: list[str],
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO metric_evidence (
                analysis_run_id, metric_id, definition, numerator_definition,
                denominator_definition, sql_file, sample_size,
                sample_tx_hashes_json, limitations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                metric_id,
                definition,
                numerator,
                denominator,
                sql_file,
                sample_size,
                json.dumps(hashes),
                limitations,
            ),
        )
