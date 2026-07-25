from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Protocol

from web3 import HTTPProvider, Web3


class RpcAdapter(Protocol):
    def chain_id(self) -> int: ...

    def get_logs(
        self, address: str, from_block: int, to_block: int
    ) -> Sequence[Mapping[str, Any]]: ...

    def get_block(self, block_identifier: int | str) -> Mapping[str, Any]: ...


class Web3RpcAdapter:
    def __init__(self, rpc_url: str, *, request_timeout: float = 30.0) -> None:
        self.web3 = Web3(HTTPProvider(rpc_url, request_kwargs={"timeout": request_timeout}))

    def chain_id(self) -> int:
        return int(self.web3.eth.chain_id)

    def get_logs(self, address: str, from_block: int, to_block: int) -> Sequence[Mapping[str, Any]]:
        return self.web3.eth.get_logs(
            {
                "address": Web3.to_checksum_address(address),
                "fromBlock": from_block,
                "toBlock": to_block,
            }
        )

    def get_block(self, block_identifier: int | str) -> Mapping[str, Any]:
        return self.web3.eth.get_block(block_identifier, full_transactions=False)

    def rpc(self, method: str, params: list[Any]) -> Any:
        response = self.web3.provider.make_request(method, params)
        if "error" in response:
            raise RuntimeError(f"{method} failed: {response['error']}")
        return response.get("result")
