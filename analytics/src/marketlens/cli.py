from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from web3 import Web3

from .config import NetworkConfig, ProjectPaths, load_contract_artifact
from .decode import AbiEventDecoder
from .evidence import EvidenceCatalog
from .indexer import EventIndexer
from .rpc import Web3RpcAdapter
from .store import EventStore, connect_database
from .transform import AnalysisWindow, AnalyticsPipeline


def _utc_timestamp(value: str) -> int:
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


def _json_hash(value: Any) -> str:
    encoded = json.dumps(value, indent=2).encode("utf-8")
    return "0x" + hashlib.sha256(encoded).hexdigest()


def _set_next_timestamp(rpc: Web3RpcAdapter, timestamp: int) -> None:
    rpc.rpc("evm_setNextBlockTimestamp", [timestamp])
    rpc.rpc("evm_mine", [])


def _wait(web3: Web3, transaction_hash) -> Any:
    receipt = web3.eth.wait_for_transaction_receipt(transaction_hash, timeout=30)
    if receipt.status != 1:
        raise RuntimeError(f"transaction reverted: {Web3.to_hex(transaction_hash)}")
    return receipt


def deploy_and_seed(paths: ProjectPaths, rpc_url: str) -> dict[str, Any]:
    rpc = Web3RpcAdapter(rpc_url)
    web3 = rpc.web3
    network = NetworkConfig.load(paths.network_manifest)
    if rpc.chain_id() != network.chain_id:
        raise RuntimeError(f"expected chain ID {network.chain_id}, got {rpc.chain_id()}")
    fork_header = web3.eth.get_block(network.fork_block_number)
    actual_fork_hash = Web3.to_hex(fork_header.hash).lower()
    if actual_fork_hash != network.fork_block_hash:
        raise RuntimeError(
            f"fork header mismatch: expected {network.fork_block_hash}, got {actual_fork_hash}"
        )
    accounts = web3.eth.accounts
    if len(accounts) < 7:
        raise RuntimeError("demo requires at least seven unlocked Anvil accounts")

    artifact = load_contract_artifact(paths.contract_artifact)
    contract_factory = web3.eth.contract(
        abi=artifact["abi"], bytecode=artifact["bytecode"]["object"]
    )
    deployment_receipt = _wait(
        web3,
        contract_factory.constructor().transact({"from": accounts[0]}),
    )
    address = deployment_receipt.contractAddress.lower()
    contract = web3.eth.contract(address=Web3.to_checksum_address(address), abi=artifact["abi"])

    close_timestamp = _utc_timestamp("2026-07-29T00:00:00Z")
    questions = (
        "Will Monad ship feature A?",
        "Will weekly active wallets grow?",
        "Will the demo market enter refund mode?",
    )
    market_ids: list[int] = []
    transaction_hashes = [Web3.to_hex(deployment_receipt.transactionHash)]
    for question in questions:
        receipt = _wait(
            web3,
            contract.functions.createMarket(question, close_timestamp).transact(
                {"from": accounts[0]}
            ),
        )
        event = contract.events.MarketCreated().process_receipt(receipt)[0]
        market_ids.append(int(event["args"]["marketId"]))
        transaction_hashes.append(Web3.to_hex(receipt.transactionHash))

    yes, no = 1, 2
    trade_plan = (
        (
            "2026-07-26T01:00:00Z",
            (
                (accounts[1], market_ids[0], yes, 2),
                (accounts[2], market_ids[0], no, 3),
                (accounts[3], market_ids[1], yes, 1),
                (accounts[4], market_ids[1], no, 2),
            ),
        ),
        (
            "2026-07-27T01:00:00Z",
            (
                (accounts[1], market_ids[1], yes, 1),
                (accounts[4], market_ids[0], yes, 2),
                (accounts[5], market_ids[2], yes, 1),
                (accounts[6], market_ids[1], no, 1),
            ),
        ),
        (
            "2026-07-28T01:00:00Z",
            (
                (accounts[1], market_ids[2], yes, 2),
                (accounts[2], market_ids[1], no, 1),
                (accounts[5], market_ids[0], no, 2),
                (accounts[6], market_ids[0], yes, 1),
            ),
        ),
    )
    for timestamp, trades in trade_plan:
        _set_next_timestamp(rpc, _utc_timestamp(timestamp))
        for wallet, market_id, outcome, mon in trades:
            receipt = _wait(
                web3,
                contract.functions.buyPosition(market_id, outcome).transact(
                    {"from": wallet, "value": mon * 10**18}
                ),
            )
            transaction_hashes.append(Web3.to_hex(receipt.transactionHash))

    _set_next_timestamp(rpc, close_timestamp)
    for market_id, result in (
        (market_ids[0], yes),
        (market_ids[1], no),
        (market_ids[2], no),
    ):
        receipt = _wait(
            web3,
            contract.functions.resolveMarket(market_id, result).transact({"from": accounts[0]}),
        )
        transaction_hashes.append(Web3.to_hex(receipt.transactionHash))

    claims = (
        (accounts[1], market_ids[0]),
        (accounts[4], market_ids[0]),
        (accounts[6], market_ids[0]),
        (accounts[2], market_ids[1]),
        (accounts[4], market_ids[1]),
        (accounts[6], market_ids[1]),
        (accounts[1], market_ids[2]),
        (accounts[5], market_ids[2]),
    )
    for wallet, market_id in claims:
        receipt = _wait(
            web3,
            contract.functions.claimReward(market_id).transact(
                {"from": wallet, "gas": 300_000, "gasPrice": 0}
            ),
        )
        transaction_hashes.append(Web3.to_hex(receipt.transactionHash))

    boundary_timestamp = _utc_timestamp("2026-07-30T00:00:00Z")
    _set_next_timestamp(rpc, boundary_timestamp)
    rpc.rpc("evm_mine", [])
    to_block = web3.eth.block_number

    runtime_code = bytes(web3.eth.get_code(Web3.to_checksum_address(address)))
    generated_at = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
    deployment = {
        "schemaVersion": 1,
        "status": "deployed",
        "networkProfile": network.profile,
        "chainId": network.chain_id,
        "contractName": "PredictionMarket",
        "address": address,
        "deploymentBlock": deployment_receipt.blockNumber,
        "deploymentBlockHash": Web3.to_hex(web3.eth.get_block(deployment_receipt.blockNumber).hash),
        "transactionHash": Web3.to_hex(deployment_receipt.transactionHash),
        "deployer": accounts[0].lower(),
        "runtimeBytecodeHash": Web3.to_hex(web3.keccak(runtime_code)),
        "abiHash": _json_hash(artifact["abi"]),
        "generatedAt": generated_at,
    }
    paths.deployment_manifest.write_text(json.dumps(deployment, indent=2) + "\n", encoding="utf-8")
    demo_manifest = {
        "schemaVersion": 1,
        "networkProfile": network.profile,
        "chainId": network.chain_id,
        "forkBlockNumber": network.fork_block_number,
        "forkBlockHash": network.fork_block_hash,
        "contractAddress": address,
        "marketIds": market_ids,
        "walletAddresses": [account.lower() for account in accounts[1:7]],
        "fromBlock": deployment_receipt.blockNumber,
        "toBlock": to_block,
        "windowStart": "2026-07-26T00:00:00Z",
        "windowEnd": "2026-07-30T00:00:00Z",
        "transactionHashes": transaction_hashes,
        "generatedAt": generated_at,
        "limitations": [
            "Deterministic local-fork fixture; not production behavior.",
            "Resolution is manual and trusted.",
            "Wallet addresses are not natural-person identities.",
        ],
    }
    demo_path = paths.root / "demo" / "local-run.json"
    demo_path.write_text(json.dumps(demo_manifest, indent=2) + "\n", encoding="utf-8")
    return demo_manifest


def _store(paths: ProjectPaths, database: Path) -> EventStore:
    store = EventStore(connect_database(database), paths.schema)
    store.initialize()
    return store


def run_local_demo(paths: ProjectPaths, database: Path, rpc_url: str) -> dict[str, Any]:
    demo = deploy_and_seed(paths, rpc_url)
    store = _store(paths, database)
    artifact = load_contract_artifact(paths.contract_artifact)
    decoder = AbiEventDecoder(artifact["abi"])
    indexer = EventIndexer(
        Web3RpcAdapter(rpc_url),
        store,
        decoder,
        abi_json=json.dumps(artifact["abi"], sort_keys=True),
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )
    sync = indexer.sync(demo["contractAddress"], int(demo["fromBlock"]), int(demo["toBlock"]))
    analysis = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(
            demo["chainId"],
            demo["contractAddress"],
            demo["fromBlock"],
            demo["toBlock"],
            demo["windowStart"],
            demo["windowEnd"],
        )
    )
    outputs = EvidenceCatalog(store.connection).export(
        analysis.analysis_run_id, paths.evidence_output
    )
    return {
        "deployment": demo["contractAddress"],
        "fromBlock": demo["fromBlock"],
        "toBlock": demo["toBlock"],
        "fetchedLogs": sync.fetched_log_count,
        "uniqueLogs": sync.unique_log_count,
        "decodeErrors": sync.decode_error_count,
        "analysisRunId": analysis.analysis_run_id,
        "publishable": analysis.publishable,
        "outputs": {key: str(value) for key, value in outputs.items()},
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="marketlens")
    commands = parser.add_subparsers(dest="command", required=True)
    init_db = commands.add_parser("init-db")
    init_db.add_argument("--database", type=Path, required=True)
    demo = commands.add_parser("run-local-demo")
    demo.add_argument("--database", type=Path, required=True)
    demo.add_argument("--rpc-url", default="http://127.0.0.1:8545")
    demo.add_argument("--reset", action="store_true")
    return parser


def main() -> None:
    args = _parser().parse_args()
    paths = ProjectPaths.discover()
    if args.command == "init-db":
        _store(paths, args.database)
        print(json.dumps({"database": str(args.database), "status": "initialized"}))
        return
    if args.command == "run-local-demo":
        if args.reset and args.database.exists():
            args.database.unlink()
        print(
            json.dumps(
                run_local_demo(paths, args.database, args.rpc_url),
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
