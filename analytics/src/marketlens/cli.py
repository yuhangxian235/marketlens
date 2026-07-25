from __future__ import annotations

import argparse
import os
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


def _utc_timestamp(value: str) -> int:
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


def _json_hash(value: Any) -> str:
    return "0x" + hashlib.sha256(json.dumps(value, indent=2).encode("utf-8")).hexdigest()


def _set_next_timestamp(rpc: Web3RpcAdapter, timestamp: int) -> None:
    rpc.rpc("evm_setNextBlockTimestamp", [timestamp])
    rpc.rpc("evm_mine", [])


def _wait(web3: Web3, tx_hash) -> Any:
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt.status != 1:
        raise RuntimeError(f"tx reverted: {Web3.to_hex(tx_hash)}")
    return receipt


def deploy_and_seed_local(paths: ProjectPaths, rpc_url: str) -> dict[str, Any]:
    """Deploy PredictionMarket on clean Anvil and seed with multi-date demo trades."""
    rpc = Web3RpcAdapter(rpc_url)
    web3 = rpc.web3
    network = NetworkConfig.load(paths.network_manifest)
    if rpc.chain_id() != network.chain_id:
        raise RuntimeError(f"Chain mismatch: config {network.chain_id}, RPC {rpc.chain_id()}")
    accounts = web3.eth.accounts
    if len(accounts) < 9:
        raise RuntimeError(f"Need >=9 accounts, got {len(accounts)}")
    artifact = load_contract_artifact(paths.contract_artifact)
    factory = web3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"]["object"])

    # Deploy
    deploy_receipt = _wait(web3, factory.constructor().transact({"from": accounts[0]}))
    addr = deploy_receipt.contractAddress.lower()
    contract = web3.eth.contract(address=Web3.to_checksum_address(addr), abi=artifact["abi"])
    deploy_block = deploy_receipt.blockNumber
    deploy_block_hash = Web3.to_hex(web3.eth.get_block(deploy_block).hash)
    tx_hashes = [Web3.to_hex(deploy_receipt.transactionHash)]
    all_attempts = [{"action": "deploy", "tx_hash": Web3.to_hex(deploy_receipt.transactionHash), "status": 1, "block": deploy_block}]

    # Create 3 markets
    close_ts = _utc_timestamp("2026-07-30T12:00:00Z")
    questions = (
        "Will the protocol reach 10k daily active wallets?",
        "Will ETH exceed $5000 by EOY 2026?",
        "Will the demo market enter refund mode?",
    )
    market_ids = []
    for q in questions:
        r = _wait(web3, contract.functions.createMarket(q, close_ts).transact({"from": accounts[0]}))
        ev = contract.events.MarketCreated().process_receipt(r)[0]
        market_ids.append(int(ev["args"]["marketId"]))
        tx_hashes.append(Web3.to_hex(r.transactionHash))

    # Multi-date trade plan: 8 wallets, 5 UTC days, 3 markets
    YES, NO = 1, 2
    trade_plan = (
        ("2026-07-26T01:00:00Z", (
            (accounts[1], market_ids[0], YES, 2), (accounts[2], market_ids[0], NO, 3),
            (accounts[3], market_ids[1], YES, 1), (accounts[4], market_ids[1], NO, 2),
        )),
        ("2026-07-27T01:00:00Z", (
            (accounts[1], market_ids[1], YES, 1), (accounts[4], market_ids[0], YES, 2),
            (accounts[5], market_ids[2], YES, 1), (accounts[6], market_ids[1], NO, 1),
        )),
        ("2026-07-28T01:00:00Z", (
            (accounts[1], market_ids[2], YES, 2), (accounts[2], market_ids[1], NO, 1),
            (accounts[5], market_ids[0], NO, 2), (accounts[6], market_ids[0], YES, 1),
        )),
        ("2026-07-29T01:00:00Z", (
            (accounts[3], market_ids[2], NO, 1), (accounts[7], market_ids[0], YES, 3),
            (accounts[8], market_ids[1], YES, 2), (accounts[4], market_ids[2], NO, 1),
        )),
        ("2026-07-30T01:00:00Z", (
            (accounts[1], market_ids[1], NO, 1), (accounts[8], market_ids[2], NO, 2),
        )),
    )
    for ts, trades in trade_plan:
        _set_next_timestamp(rpc, _utc_timestamp(ts))
        for wallet, mid, outcome, mon in trades:
            r = _wait(web3, contract.functions.buyPosition(mid, outcome).transact(
                {"from": wallet, "value": mon * 10**18}))
            tx_hashes.append(Web3.to_hex(r.transactionHash))

    # Resolve
    _set_next_timestamp(rpc, close_ts)
    for mid, result in ((market_ids[0], YES), (market_ids[1], NO), (market_ids[2], NO)):
        r = _wait(web3, contract.functions.resolveMarket(mid, result).transact({"from": accounts[0]}))
        tx_hashes.append(Web3.to_hex(r.transactionHash))

    # Claims
    claims = (
        (accounts[1], market_ids[0]), (accounts[4], market_ids[0]),
        (accounts[6], market_ids[0]), (accounts[7], market_ids[0]),
        (accounts[2], market_ids[1]), (accounts[3], market_ids[1]),
        (accounts[4], market_ids[1]), (accounts[6], market_ids[1]),
        (accounts[3], market_ids[2]), (accounts[4], market_ids[2]),
        (accounts[8], market_ids[2]),
    )
    failed_attempts = []
    for wallet, mid in claims:
        try:
            r = _wait(web3, contract.functions.claimReward(mid).transact(
                {"from": wallet, "gas": 300000, "gasPrice": 0}))
            tx_hashes.append(Web3.to_hex(r.transactionHash))
        except RuntimeError as e:
            failed_attempts.append({
                "action": "claim_reward", "wallet": wallet.lower(),
                "market_id": mid, "error": str(e)
            })

    # Advance to boundary
    _set_next_timestamp(rpc, _utc_timestamp("2026-07-31T00:00:00Z"))
    rpc.rpc("evm_mine", [])
    to_block = web3.eth.block_number
    runtime_code = bytes(web3.eth.get_code(Web3.to_checksum_address(addr)))
    generated_at = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")

    # Deployment manifest
    deployment = {
        "schemaVersion": 1, "status": "deployed",
        "environment": "local_anvil", "dataStatus": "REAL_LOCAL_DEMO",
        "chainId": network.chain_id, "contractName": "PredictionMarket",
        "address": addr, "deploymentBlock": deploy_block,
        "deploymentBlockHash": deploy_block_hash,
        "transactionHash": Web3.to_hex(deploy_receipt.transactionHash),
        "deployer": accounts[0].lower(),
        "runtimeBytecodeHash": Web3.to_hex(web3.keccak(runtime_code)),
        "abiHash": _json_hash(artifact["abi"]),
        "generatedAt": generated_at,
        "externalRpcUsed": False, "forkUsed": False,
    }
    paths.deployment_manifest.parent.mkdir(parents=True, exist_ok=True)
    paths.deployment_manifest.write_text(json.dumps(deployment, indent=2) + "\n", encoding="utf-8")

    # Local deployment + transactions manifests
    os.makedirs(paths.generated_dir, exist_ok=True)
    (paths.generated_dir / "local-deployment.json").write_text(
        json.dumps(deployment, indent=2) + "\n", encoding="utf-8")

    demo = {
        "schemaVersion": 1, "environment": "local_anvil",
        "dataStatus": "REAL_LOCAL_DEMO",
        "chainId": network.chain_id, "contractAddress": addr,
        "marketIds": market_ids,
        "walletAddresses": [accounts[i].lower() for i in range(1, 9)],
        "fromBlock": deploy_block, "toBlock": to_block,
        "windowStart": "2026-07-26T06:00:00Z", "windowEnd": "2026-07-30T18:00:00Z",
        "transactionHashes": tx_hashes, "generatedAt": generated_at,
        "externalRpcUsed": False, "forkUsed": False,
        "transactionAttempts": len(tx_hashes) + len(failed_attempts),
        "successfulTransactions": len(tx_hashes),
        "revertedTransactions": len(failed_attempts),
        "failedAttempts": failed_attempts,
        "limitations": [
            "Clean local Anvil demo; not production behavior.",
            "Resolution is manual and trusted.",
            "Wallet addresses are not natural-person identities.",
            "D1 is sample-window repeat rate, not platform retention."
        ],
    }
    (paths.generated_dir / "local-transactions.json").write_text(
        json.dumps(demo, indent=2) + "\n", encoding="utf-8")
    return demo


def _store(paths: ProjectPaths, database: Path) -> EventStore:
    store = EventStore(connect_database(database), paths.schema)
    store.initialize()
    return store


def run_local_repro(paths: ProjectPaths, database: Path, rpc_url: str) -> dict[str, Any]:
    demo = deploy_and_seed_local(paths, rpc_url)
    store = _store(paths, database)
    artifact = load_contract_artifact(paths.contract_artifact)
    decoder = AbiEventDecoder(artifact["abi"])
    indexer = EventIndexer(
        Web3RpcAdapter(rpc_url), store, decoder,
        abi_json=json.dumps(artifact["abi"], sort_keys=True),
        normalize_sql_path=paths.sql / "normalize_events.sql",
    )
    sync = indexer.sync(demo["contractAddress"], int(demo["fromBlock"]), int(demo["toBlock"]))

    # Idempotency check
    sync2 = indexer.sync(demo["contractAddress"], int(demo["fromBlock"]), int(demo["toBlock"]))

    from .transform import AnalysisWindow, AnalyticsPipeline
    analysis = AnalyticsPipeline(store.connection, paths.sql).run(
        AnalysisWindow(demo["chainId"], demo["contractAddress"],
                       demo["fromBlock"], demo["toBlock"],
                       demo["windowStart"], demo["windowEnd"]))
    outputs = EvidenceCatalog(store.connection).export(analysis.analysis_run_id, paths.evidence_output)
    return {
        "deployment": demo["contractAddress"],
        "fromBlock": demo["fromBlock"], "toBlock": demo["toBlock"],
        "fetchedLogs": sync.fetched_log_count, "uniqueLogs": sync.unique_log_count,
        "decodeErrors": sync.decode_error_count,
        "idempotency": {
            "firstRunInserted": sync.unique_log_count,
            "secondRunInserted": sync2.unique_log_count,
            "totalAfterFirst": sync.unique_log_count,
            "totalAfterSecond": sync2.unique_log_count,
            "duplicateCount": sync.duplicate_log_count,
        },
        "analysisRunId": analysis.analysis_run_id,
        "publishable": analysis.publishable,
        "validationChecks": [
            {"name": c.name, "status": c.status}
            for c in analysis.validation.checks
        ],
        "outputs": {k: str(v) for k, v in outputs.items()},
    }


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="marketlens")
    sp = p.add_subparsers(dest="command", required=True)
    sp.add_parser("init-db").add_argument("--database", type=Path, required=True)
    d = sp.add_parser("run-local-demo")
    d.add_argument("--database", type=Path, required=True)
    d.add_argument("--rpc-url", default="http://127.0.0.1:8545")
    d.add_argument("--reset", action="store_true")
    r = sp.add_parser("run-local-repro")
    r.add_argument("--database", type=Path, required=True)
    r.add_argument("--rpc-url", default="http://127.0.0.1:8545")
    r.add_argument("--network", default="local-anvil")
    r.add_argument("--reset", action="store_true")
    return p


def main() -> None:
    args = _parser().parse_args()
    if args.command == "init-db":
        paths = ProjectPaths.discover()
        _store(paths, args.database)
        print(json.dumps({"database": str(args.database), "status": "initialized"}))
        return
    if args.command == "run-local-demo":
        paths = ProjectPaths.discover(network_profile="local-monad-fork")
        if args.reset and args.database.exists():
            args.database.unlink()
        print(json.dumps(run_local_repro(paths, args.database, args.rpc_url), indent=2))
    if args.command == "run-local-repro":
        paths = ProjectPaths.discover(network_profile=args.network)
        if args.reset and args.database.exists():
            args.database.unlink()
        print(json.dumps(run_local_repro(paths, args.database, args.rpc_url), indent=2))


if __name__ == "__main__":
    main()
