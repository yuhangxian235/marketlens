from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    root: Path

    @classmethod
    def discover(cls) -> ProjectPaths:
        return cls(Path(__file__).resolve().parents[3])

    @property
    def schema(self) -> Path:
        return self.root / "analytics" / "sql" / "schema.sql"

    @property
    def sql(self) -> Path:
        return self.root / "analytics" / "sql"

    @property
    def contract_artifact(self) -> Path:
        return self.root / "contracts" / "out" / "PredictionMarket.sol" / "PredictionMarket.json"

    @property
    def network_manifest(self) -> Path:
        return self.root / "config" / "networks" / "local-monad-fork.json"

    @property
    def deployment_manifest(self) -> Path:
        return self.root / "config" / "deployments" / "local-monad-fork.json"

    @property
    def evidence_output(self) -> Path:
        return self.root / "web" / "public" / "data"


@dataclass(frozen=True)
class NetworkConfig:
    profile: str
    chain_id: int
    local_rpc_url: str
    upstream_rpc_label: str
    fork_block_number: int
    fork_block_hash: str

    @classmethod
    def load(cls, path: Path) -> NetworkConfig:
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            profile=data["profile"],
            chain_id=int(data["chainId"]),
            local_rpc_url=data["localRpcUrl"],
            upstream_rpc_label=data["upstreamRpcLabel"],
            fork_block_number=int(data["forkBlockNumber"]),
            fork_block_hash=data["forkBlockHash"].lower(),
        )


def load_contract_artifact(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Contract artifact is missing: {path}. Run `forge build` first.")
    return json.loads(path.read_text(encoding="utf-8"))
