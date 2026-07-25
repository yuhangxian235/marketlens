from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from hexbytes import HexBytes

from .decode import DecodeError, Decoder
from .rpc import RpcAdapter
from .store import EventStore, canonical_json


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _hex(value: Any) -> str:
    if isinstance(value, str):
        return value.lower()
    return HexBytes(value).to_0x_hex().lower()


def _integer(value: Any) -> int:
    if isinstance(value, str):
        return int(value, 16) if value.startswith("0x") else int(value)
    return int(value)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, (bytes, bytearray, HexBytes)):
        return HexBytes(value).to_0x_hex()
    return value


def _block_timestamp(value: Any) -> str:
    return (
        datetime.fromtimestamp(_integer(value), tz=UTC)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


@dataclass(frozen=True)
class SyncReport:
    ingest_run_id: str
    fetched_log_count: int
    unique_log_count: int
    duplicate_log_count: int
    decode_error_count: int
    from_block: int
    to_block: int


class EventIndexer:
    def __init__(
        self,
        rpc: RpcAdapter,
        store: EventStore,
        decoder: Decoder,
        *,
        abi_json: str,
        normalize_sql_path,
        chunk_size: int = 1_000,
    ) -> None:
        self.rpc = rpc
        self.store = store
        self.decoder = decoder
        self.abi_sha256 = hashlib.sha256(abi_json.encode("utf-8")).hexdigest()
        self.normalize_sql_path = normalize_sql_path
        self.chunk_size = chunk_size

    def sync(self, contract_address: str, from_block: int, to_block: int) -> SyncReport:
        if from_block < 0 or to_block < from_block:
            raise ValueError("invalid inclusive block range")
        chain_id = self.rpc.chain_id()
        address = contract_address.lower()
        run_id = f"ingest-{uuid4()}"
        started_at = _utc_now()
        self.store.begin_ingest(
            run_id,
            chain_id,
            address,
            from_block,
            to_block,
            self.abi_sha256,
            started_at,
        )

        fetched = unique = decode_errors = 0
        block_cache: dict[int, dict[str, Any]] = {}
        try:
            checkpoint = self.store.checkpoint(chain_id, address)
            if checkpoint is not None:
                checkpoint_number = int(checkpoint["last_finalized_block"])
                current = self.rpc.get_block(checkpoint_number)
                current_hash = _hex(current["hash"])
                if current_hash != checkpoint["last_block_hash"]:
                    self.store.mark_reorg_from(chain_id, checkpoint_number)

            initial_block = dict(self.rpc.get_block(from_block))
            block_cache[from_block] = initial_block
            self.store.upsert_block(
                chain_id,
                block_hash=_hex(initial_block["hash"]),
                block_number=from_block,
                parent_hash=_hex(initial_block["parentHash"]),
                block_timestamp=_block_timestamp(initial_block["timestamp"]),
            )

            for chunk_start in range(from_block, to_block + 1, self.chunk_size):
                chunk_end = min(to_block, chunk_start + self.chunk_size - 1)
                logs = self.rpc.get_logs(address, chunk_start, chunk_end)
                fetched += len(logs)
                for raw in logs:
                    log = dict(raw)
                    block_number = _integer(log["blockNumber"])
                    if block_number not in block_cache:
                        block_cache[block_number] = dict(self.rpc.get_block(block_number))
                    block = block_cache[block_number]
                    block_hash = _hex(block["hash"])
                    timestamp = _block_timestamp(block["timestamp"])
                    self.store.upsert_block(
                        chain_id,
                        block_hash=block_hash,
                        block_number=block_number,
                        parent_hash=_hex(block["parentHash"]),
                        block_timestamp=timestamp,
                    )

                    event_name = wallet = market_id = decoded_json = error = None
                    status = "OK"
                    try:
                        decoded = self.decoder.decode(log)
                        event_name = decoded.event_name
                        wallet = decoded.wallet_address
                        market_id = decoded.market_id
                        decoded_json = canonical_json(decoded.args)
                    except DecodeError as exc:
                        status = "ERROR"
                        error = str(exc)

                    topics = [_hex(topic) for topic in log.get("topics", [])]
                    inserted = self.store.insert_raw_event(
                        {
                            "chain_id": chain_id,
                            "transaction_hash": _hex(log["transactionHash"]),
                            "log_index": _integer(log["logIndex"]),
                            "contract_address": address,
                            "block_number": block_number,
                            "block_hash": block_hash,
                            "transaction_index": _integer(log["transactionIndex"]),
                            "block_timestamp": timestamp,
                            "event_name": event_name,
                            "wallet_address": wallet,
                            "market_id": market_id,
                            "topic0": topics[0],
                            "topic1": topics[1] if len(topics) > 1 else None,
                            "topic2": topics[2] if len(topics) > 2 else None,
                            "topic3": topics[3] if len(topics) > 3 else None,
                            "data_hex": _hex(log.get("data", "0x")),
                            "raw_log_json": json.dumps(
                                _json_safe(log), sort_keys=True, separators=(",", ":")
                            ),
                            "decode_status": status,
                            "decoded_args_json": decoded_json,
                            "decode_error": error,
                            "decoder_version": self.decoder.version,
                            "first_seen_run_id": run_id,
                            "indexed_at": started_at,
                        }
                    )
                    if inserted:
                        unique += 1
                        decode_errors += int(status == "ERROR")

            final_block = dict(self.rpc.get_block(to_block))
            final_hash = _hex(final_block["hash"])
            self.store.upsert_block(
                chain_id,
                block_hash=final_hash,
                block_number=to_block,
                parent_hash=_hex(final_block["parentHash"]),
                block_timestamp=_block_timestamp(final_block["timestamp"]),
            )
            self.store.set_checkpoint(chain_id, address, to_block, final_hash, _utc_now())
            self.store.rebuild_normalized(self.normalize_sql_path)
            self.store.complete_ingest(
                run_id,
                fetched=fetched,
                unique=unique,
                decode_errors=decode_errors,
                status="SUCCEEDED",
                completed_at=_utc_now(),
            )
        except Exception:
            self.store.complete_ingest(
                run_id,
                fetched=fetched,
                unique=unique,
                decode_errors=decode_errors,
                status="FAILED",
                completed_at=_utc_now(),
            )
            raise

        return SyncReport(
            ingest_run_id=run_id,
            fetched_log_count=fetched,
            unique_log_count=unique,
            duplicate_log_count=fetched - unique,
            decode_error_count=decode_errors,
            from_block=from_block,
            to_block=to_block,
        )
