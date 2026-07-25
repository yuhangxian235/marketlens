from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from eth_utils import event_abi_to_log_topic
from hexbytes import HexBytes
from web3 import Web3
from web3._utils.events import get_event_data


class DecodeError(ValueError):
    pass


@dataclass(frozen=True)
class DecodedEvent:
    event_name: str
    args: dict[str, Any]
    wallet_address: str | None
    market_id: str | None


class Decoder(Protocol):
    version: str

    def decode(self, log: dict[str, Any]) -> DecodedEvent: ...


def _json_value(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, (bytes, bytearray, HexBytes)):
        return HexBytes(value).to_0x_hex()
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str) and value.startswith("0x") and len(value) == 42:
        return value.lower()
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


class AbiEventDecoder:
    version = "prediction-market-abi-v1"

    def __init__(self, abi: list[dict[str, Any]]) -> None:
        self._codec = Web3().codec
        self._events: dict[str, dict[str, Any]] = {}
        for item in abi:
            if item.get("type") != "event":
                continue
            topic = HexBytes(event_abi_to_log_topic(item)).to_0x_hex().lower()
            self._events[topic] = item

    def decode(self, log: dict[str, Any]) -> DecodedEvent:
        topics = log.get("topics") or []
        if not topics:
            raise DecodeError("log has no topic0")
        topic0 = HexBytes(topics[0]).to_0x_hex().lower()
        event_abi = self._events.get(topic0)
        if event_abi is None:
            raise DecodeError(f"unknown event topic: {topic0}")
        try:
            decoded = get_event_data(self._codec, event_abi, log)
        except Exception as exc:
            raise DecodeError(f"{event_abi['name']} decode failed: {exc}") from exc

        args = {key: _json_value(value) for key, value in decoded["args"].items()}
        for key in ("outcome", "result"):
            if key in args:
                args[key] = {"0": "UNSET", "1": "YES", "2": "NO"}.get(
                    str(args[key]), f"UNKNOWN_{args[key]}"
                )

        wallet = next(
            (str(args[key]).lower() for key in ("wallet", "creator", "resolver") if key in args),
            None,
        )
        market_id = str(args["marketId"]) if "marketId" in args else None
        return DecodedEvent(event_abi["name"], args, wallet, market_id)
