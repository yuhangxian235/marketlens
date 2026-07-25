from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any


class UInt256Sum:
    def __init__(self) -> None:
        self.total = 0

    def step(self, value: str | None) -> None:
        if value is not None:
            self.total += int(value)

    def finalize(self) -> str:
        return str(self.total)


def connect_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.create_aggregate("uint256_sum", 1, UInt256Sum)
    return connection


class EventStore:
    def __init__(self, connection: sqlite3.Connection, schema_path: Path) -> None:
        self.connection = connection
        self.schema_path = schema_path

    def initialize(self) -> None:
        self.connection.executescript(self.schema_path.read_text(encoding="utf-8"))
        self.connection.commit()

    def begin_ingest(
        self,
        run_id: str,
        chain_id: int,
        address: str,
        from_block: int,
        to_block: int,
        abi_sha256: str,
        started_at: str,
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO ingest_runs (
                ingest_run_id, chain_id, contract_address, from_block, to_block,
                abi_sha256, fetched_log_count, unique_log_count, duplicate_log_count,
                decode_error_count, status, started_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'RUNNING', ?)
            """,
            (run_id, chain_id, address, from_block, to_block, abi_sha256, started_at),
        )
        self.connection.commit()

    def complete_ingest(
        self,
        run_id: str,
        *,
        fetched: int,
        unique: int,
        decode_errors: int,
        status: str,
        completed_at: str,
    ) -> None:
        self.connection.execute(
            """
            UPDATE ingest_runs
            SET fetched_log_count = ?, unique_log_count = ?,
                duplicate_log_count = ?, decode_error_count = ?,
                status = ?, completed_at = ?
            WHERE ingest_run_id = ?
            """,
            (
                fetched,
                unique,
                fetched - unique,
                decode_errors,
                status,
                completed_at,
                run_id,
            ),
        )
        self.connection.commit()

    def canonical_hash(self, chain_id: int, block_number: int) -> str | None:
        row = self.connection.execute(
            """
            SELECT block_hash FROM chain_blocks
            WHERE chain_id = ? AND block_number = ? AND canonical = 1
            """,
            (chain_id, block_number),
        ).fetchone()
        return str(row["block_hash"]) if row else None

    def mark_reorg_from(self, chain_id: int, block_number: int) -> None:
        event_keys = self.connection.execute(
            """
            SELECT transaction_hash, log_index
            FROM raw_contract_events
            WHERE chain_id = ? AND block_number >= ? AND removed = 0
            """,
            (chain_id, block_number),
        ).fetchall()
        for table in ("reward_claims", "market_resolutions", "position_buys", "markets"):
            for key in event_keys:
                self.connection.execute(
                    f"DELETE FROM {table} WHERE chain_id = ? AND transaction_hash = ? "
                    "AND log_index = ?",
                    (chain_id, key["transaction_hash"], key["log_index"]),
                )
        self.connection.execute(
            """
            UPDATE raw_contract_events SET removed = 1
            WHERE chain_id = ? AND block_number >= ?
            """,
            (chain_id, block_number),
        )
        self.connection.execute(
            """
            UPDATE chain_blocks SET canonical = 0
            WHERE chain_id = ? AND block_number >= ?
            """,
            (chain_id, block_number),
        )
        self.connection.execute(
            """
            DELETE FROM indexer_checkpoints
            WHERE chain_id = ? AND last_finalized_block >= ?
            """,
            (chain_id, block_number),
        )

    def upsert_block(
        self,
        chain_id: int,
        *,
        block_hash: str,
        block_number: int,
        parent_hash: str,
        block_timestamp: str,
    ) -> None:
        existing = self.canonical_hash(chain_id, block_number)
        if existing is not None and existing != block_hash:
            self.mark_reorg_from(chain_id, block_number)
        self.connection.execute(
            """
            INSERT INTO chain_blocks (
                chain_id, block_hash, block_number, parent_hash, block_timestamp, canonical
            ) VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(chain_id, block_hash) DO UPDATE SET canonical = 1
            """,
            (chain_id, block_hash, block_number, parent_hash, block_timestamp),
        )

    def insert_raw_event(self, values: Mapping[str, Any]) -> bool:
        before = self.connection.total_changes
        self.connection.execute(
            """
            INSERT OR IGNORE INTO raw_contract_events (
                chain_id, transaction_hash, log_index, contract_address,
                block_number, block_hash, transaction_index, block_timestamp,
                event_name, wallet_address, market_id, topic0, topic1, topic2, topic3,
                data_hex, raw_log_json, decode_status, decoded_args_json, decode_error,
                decoder_version, removed, first_seen_run_id, indexed_at
            ) VALUES (
                :chain_id, :transaction_hash, :log_index, :contract_address,
                :block_number, :block_hash, :transaction_index, :block_timestamp,
                :event_name, :wallet_address, :market_id, :topic0, :topic1, :topic2,
                :topic3, :data_hex, :raw_log_json, :decode_status, :decoded_args_json,
                :decode_error, :decoder_version, 0, :first_seen_run_id, :indexed_at
            )
            """,
            values,
        )
        return self.connection.total_changes > before

    def set_checkpoint(
        self, chain_id: int, address: str, block_number: int, block_hash: str, updated_at: str
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO indexer_checkpoints (
                chain_id, contract_address, last_finalized_block, last_block_hash, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(chain_id, contract_address) DO UPDATE SET
                last_finalized_block = excluded.last_finalized_block,
                last_block_hash = excluded.last_block_hash,
                updated_at = excluded.updated_at
            """,
            (chain_id, address, block_number, block_hash, updated_at),
        )

    def checkpoint(self, chain_id: int, address: str) -> sqlite3.Row | None:
        return self.connection.execute(
            """
            SELECT * FROM indexer_checkpoints
            WHERE chain_id = ? AND contract_address = ?
            """,
            (chain_id, address),
        ).fetchone()

    def rebuild_normalized(self, sql_path: Path) -> None:
        self.connection.executescript(sql_path.read_text(encoding="utf-8"))

    def rows(self, query: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
        return list(self.connection.execute(query, tuple(params)).fetchall())


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
