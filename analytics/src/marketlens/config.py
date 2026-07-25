from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    root: Path
    network_profile: str = "local-anvil"

    @classmethod
    def discover(cls, network_profile: str | None = None) -> ProjectPaths:
        profile = network_profile or os.environ.get("MARKETLENS_NETWORK", "local-anvil")
        return cls(Path(__file__).resolve().parents[3], network_profile=profile)

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
        return self.root / "config" / "networks" / f"{self.network_profile}.json"

    @property
    def deployment_manifest(self) -> Path:
        return self.root / "config" / "deployments" / f"{self.network_profile}.json"

    @property
    def evidence_output(self) -> Path:
        return self.root / "web" / "public" / "data"

    @property
    def generated_dir(self) -> Path:
        return self.root / "demo" / "generated"


@dataclass(frozen=True)
class NetworkConfig:
    profile: str
    chain_id: int
    local_rpc_url: str
    upstream_rpc_label: str
    fork_block_number: int
    fork_block_hash: str
    fork_used: bool = False
    external_rpc_used: bool = False

    @classmethod
    def load(cls, path: Path) -> NetworkConfig:
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            profile=data["profile"],
            chain_id=int(data["chainId"]),
            local_rpc_url=data["localRpcUrl"],
            upstream_rpc_label=data.get("upstreamRpcLabel", ""),
            fork_block_number=int(data.get("forkBlockNumber", 0)),
            fork_block_hash=data.get("forkBlockHash", "").lower(),
            fork_used=data.get("forkUsed", False),
            external_rpc_used=data.get("externalRpcUsed", False),
        )


def load_contract_artifact(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Contract artifact missing: {path}. Run `forge build` first.")
    return json.loads(path.read_text(encoding="utf-8"))
