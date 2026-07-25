from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "analytics" / "src"))

from marketlens.config import ProjectPaths  # noqa: E402
from marketlens.decode import DecodedEvent  # noqa: E402
from marketlens.store import EventStore, connect_database  # noqa: E402

CONTRACT = "0x" + "aa" * 20
OWNER = "0x" + "01" * 20
WALLET_1 = "0x" + "11" * 20
WALLET_2 = "0x" + "22" * 20
WALLET_3 = "0x" + "33" * 20


@dataclass
class FakeDecoder:
    version: str = "fake-v1"

    def decode(self, log: dict[str, Any]) -> DecodedEvent:
        event = log["fake_event"]
        args = event["args"]
        wallet = next(
            (args[key].lower() for key in ("wallet", "creator", "resolver") if key in args),
            None,
        )
        return DecodedEvent(event["name"], args, wallet, str(args["marketId"]))


class FakeRpc:
    def __init__(self, blocks: dict[int, dict[str, Any]], logs: list[dict[str, Any]]) -> None:
        self.blocks = blocks
        self.logs = logs

    def chain_id(self) -> int:
        return 143

    def get_logs(self, address: str, from_block: int, to_block: int):
        return [
            log
            for log in self.logs
            if from_block <= int(log["blockNumber"]) <= to_block
            and log["address"].lower() == address.lower()
        ]

    def get_block(self, block_identifier: int | str):
        return self.blocks[int(block_identifier)]


def block(number: int, timestamp: int, marker: str = "ab") -> dict[str, Any]:
    return {
        "number": number,
        "hash": "0x" + marker * 32,
        "parentHash": "0x" + "cd" * 32,
        "timestamp": timestamp,
    }


def event_log(
    block_number: int,
    tx_marker: str,
    log_index: int,
    event_name: str,
    args: dict[str, Any],
    transaction_index: int = 0,
) -> dict[str, Any]:
    return {
        "address": CONTRACT,
        "blockNumber": block_number,
        "transactionHash": "0x" + tx_marker * 32,
        "transactionIndex": transaction_index,
        "logIndex": log_index,
        "topics": ["0x" + "99" * 32],
        "data": "0x",
        "fake_event": {"name": event_name, "args": args},
    }


def market_created(block_number: int, market_id: str, tx_marker: str) -> dict[str, Any]:
    return event_log(
        block_number,
        tx_marker,
        0,
        "MarketCreated",
        {
            "marketId": market_id,
            "creator": OWNER,
            "questionHash": "0x" + market_id.zfill(64),
            "question": f"Question {market_id}",
            "closesAt": str(1_800_000_000),
        },
    )


def position_bought(
    block_number: int,
    market_id: str,
    wallet: str,
    outcome: str,
    amount_gwei: int,
    tx_marker: str,
    transaction_index: int = 0,
    log_index: int = 0,
) -> dict[str, Any]:
    amount = str(amount_gwei * 1_000_000_000)
    return event_log(
        block_number,
        tx_marker,
        log_index,
        "PositionBought",
        {
            "marketId": market_id,
            "wallet": wallet,
            "outcome": outcome,
            "questionHash": "0x" + market_id.zfill(64),
            "amount": amount,
            "positionUnits": amount,
            "yesPoolAfter": amount if outcome == "YES" else "0",
            "noPoolAfter": amount if outcome == "NO" else "0",
        },
        transaction_index,
    )


@pytest.fixture
def paths() -> ProjectPaths:
    return ProjectPaths(ROOT)


@pytest.fixture
def store(tmp_path: Path, paths: ProjectPaths) -> EventStore:
    database = connect_database(tmp_path / "test.sqlite")
    result = EventStore(database, paths.schema)
    result.initialize()
    return result
