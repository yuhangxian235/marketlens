from __future__ import annotations

import pytest
from eth_abi import encode
from eth_utils import event_abi_to_log_topic
from hexbytes import HexBytes

from marketlens.decode import AbiEventDecoder, DecodeError


def test_decoder_rejects_unknown_event_topic():
    decoder = AbiEventDecoder(
        [
            {
                "type": "event",
                "name": "Known",
                "anonymous": False,
                "inputs": [{"name": "value", "type": "uint256", "indexed": False}],
            }
        ]
    )

    with pytest.raises(DecodeError, match="unknown event topic"):
        decoder.decode({"topics": ["0x" + "ff" * 32], "data": "0x"})


def test_decoder_extracts_position_bought_indexer_fields():
    event_abi = {
        "type": "event",
        "name": "PositionBought",
        "anonymous": False,
        "inputs": [
            {"name": "marketId", "type": "uint256", "indexed": True},
            {"name": "wallet", "type": "address", "indexed": True},
            {"name": "outcome", "type": "uint8", "indexed": True},
            {"name": "questionHash", "type": "bytes32", "indexed": False},
            {"name": "amount", "type": "uint256", "indexed": False},
            {"name": "positionUnits", "type": "uint256", "indexed": False},
            {"name": "yesPoolAfter", "type": "uint256", "indexed": False},
            {"name": "noPoolAfter", "type": "uint256", "indexed": False},
        ],
    }
    wallet = "0x" + "12" * 20
    amount = 2_000_000_000
    decoder = AbiEventDecoder([event_abi])
    decoded = decoder.decode(
        {
            "address": "0x" + "34" * 20,
            "blockHash": HexBytes("0x" + "56" * 32),
            "blockNumber": 10,
            "transactionHash": HexBytes("0x" + "78" * 32),
            "transactionIndex": 0,
            "logIndex": 0,
            "topics": [
                HexBytes(event_abi_to_log_topic(event_abi)),
                HexBytes((7).to_bytes(32)),
                HexBytes(b"\0" * 12 + bytes.fromhex(wallet[2:])),
                HexBytes((1).to_bytes(32)),
            ],
            "data": HexBytes(
                encode(
                    ["bytes32", "uint256", "uint256", "uint256", "uint256"],
                    [bytes.fromhex("ab" * 32), amount, amount, amount, 0],
                )
            ),
        }
    )

    assert decoded.event_name == "PositionBought"
    assert decoded.market_id == "7"
    assert decoded.wallet_address == wallet
    assert decoded.args["outcome"] == "YES"
    assert decoded.args["amount"] == str(amount)
