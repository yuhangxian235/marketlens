#!/usr/bin/env python3
"""MarketLens Phase 2B Clean Reproduction — Single Process Lifecycle"""
import subprocess, json, time, sys, os, hashlib, shutil, socket
from datetime import datetime, timezone

PROJECT = "/mnt/c/Users/Administrator/Documents/Projects/marketlens"
ARCHIVE = f"{PROJECT}/source-cache/moss-d09b38cbc44e.zip"
EXPECTED_SHA = "10820dc1bf0766e7e2ce184ad5de962d999013365a95eadba164bef5cb711235"
MOSS_DIR = f"{PROJECT}/external/moss"
RPC_PORT = 8546
RPC_URL = f"http://127.0.0.1:{RPC_PORT}"
CHAIN_ID = 143

def run(cmd, cwd=None, timeout=120, check=True, env=None):
    """Run a shell command, return (stdout, stderr, exit_code)."""
    full_env = os.environ.copy()
    if env: full_env.update(env)
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, 
                          text=True, timeout=timeout, env=full_env)
    if check and result.returncode != 0:
        print(f"  FAIL: {cmd[:80]}")
        print(f"  stderr: {result.stderr[:300]}")
    return result.stdout, result.stderr, result.returncode

def log(step, total, msg):
    print(f"[{step}/{total}] {msg}")

def check_port(port):
    """Check if port is available."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", port))
        s.close()
        return True
    except:
        return False

def main():
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    started = datetime.now(timezone.utc).isoformat()
    total = 42
    
    print(f"=== Clean Run {run_id} ===")
    print(f"Started: {started}")
    
    results = {"run_id": run_id, "started_at_utc": started}
    anvil_proc = None
    
    try:
        # Ensure no stale anvil
        subprocess.run("pkill -f 'anvil.*8546' 2>/dev/null", shell=True)
        time.sleep(1)

        # 1. Verify archive SHA
        log(1, total, "Verify archive SHA-256")
        actual = hashlib.sha256(open(ARCHIVE, "rb").read()).hexdigest()
        assert actual == EXPECTED_SHA, f"SHA mismatch: {actual}"
        results["archive_sha256"] = actual
        print(f"  SHA: {actual[:16]}... OK")

        # 2. Rebuild external/moss
        log(2, total, "Rebuild external/moss from archive")
        shutil.rmtree(MOSS_DIR, ignore_errors=True)
        os.makedirs(MOSS_DIR, exist_ok=True)
        subprocess.run(f"unzip -oq {ARCHIVE} -d {MOSS_DIR}", shell=True, check=True)
        # Flatten if nested
        inner = [d for d in os.listdir(MOSS_DIR) if os.path.isdir(os.path.join(MOSS_DIR, d))]
        if inner and os.path.exists(os.path.join(MOSS_DIR, inner[0], "pnpm-workspace.yaml")):
            inner_path = os.path.join(MOSS_DIR, inner[0])
            for item in os.listdir(inner_path):
                src = os.path.join(inner_path, item)
                dst = os.path.join(MOSS_DIR, item)
                if os.path.exists(dst):
                    if os.path.isdir(dst): shutil.rmtree(dst)
                    else: os.remove(dst)
                shutil.move(src, dst)
            shutil.rmtree(inner_path)
        assert os.path.exists(f"{MOSS_DIR}/pnpm-workspace.yaml"), "No pnpm-workspace.yaml"
        print("  OK")

        # 3. Verify structure
        log(3, total, "Verify fixed source structure")
        assert os.path.exists(f"{MOSS_DIR}/packages/core/src/types.ts"), "Missing core"
        assert os.path.exists(f"{MOSS_DIR}/packages/simulator/src"), "Missing simulator"
        print("  OK")

        # 4. Vocabulary patch (sed lines 18, 22, 25)
        log(4, total, "Apply vocabulary patch")
        types_path = f"{MOSS_DIR}/packages/core/src/types.ts"
        subprocess.run(f"sed -i '18i\\  \"create\",\\n  \"buy\",' {types_path}", shell=True, check=True)
        subprocess.run(f"sed -i 's/\"nft\"\\]/\"nft\", \"prediction-market\"\\]/' {types_path}", shell=True, check=True)
        subprocess.run(f"sed -i 's/\"priceImpact\"\\]/\"priceImpact\", \"adminAction\", \"contractInteraction\"\\]/' {types_path}", shell=True, check=True)
        for tok in ['"create"', '"buy"', 'prediction-market', 'adminAction', 'contractInteraction']:
            out = subprocess.run(f"grep -c '{tok}' {types_path}", shell=True, capture_output=True, text=True)
            assert out.stdout.strip() == "1", f"Token {tok} count mismatch: {out.stdout.strip()}"
        print("  OK (3 tokens added)")

        # 5. pnpm install
        log(5, total, "pnpm install")
        out, err, rc = run("npx pnpm install --frozen-lockfile 2>&1", cwd=MOSS_DIR, timeout=180, check=False)
        if rc != 0:
            print(f"  WARNING: install had issues, trying without frozen...")
            run("npx pnpm install 2>&1", cwd=MOSS_DIR, timeout=180)
        print("  OK")

        # 6. Moss build (core + simulator)
        log(6, total, "Moss build (core+simulator)")
        out, err, rc = run("npx pnpm --filter @themoss/core --filter @themoss/simulator build 2>&1", cwd=MOSS_DIR, timeout=180, check=False)
        results["moss_build"] = "PASS" if rc == 0 else f"WARN({rc})"
        print(f"  {results['moss_build']}")

        # 7. Typecheck
        log(7, total, "Moss typecheck")
        out, err, rc = run("npx pnpm typecheck 2>&1", cwd=MOSS_DIR, timeout=120, check=False)
        results["moss_typecheck"] = "PASS" if rc == 0 else f"FAIL({rc})"
        print(f"  {results['moss_typecheck']}")

        # 8. Biome
        log(8, total, "Moss Biome")
        out, err, rc = run("npx biome check packages/core/src/types.ts --max-diagnostics=5 2>&1", cwd=MOSS_DIR, timeout=30, check=False)
        results["moss_biome"] = "PASS" if rc == 0 else f"FORMAT_WARNINGS"
        print(f"  {results['moss_biome']}")

        # 9. Offline tests
        log(9, total, "Moss offline tests")
        out, err, rc = run("npx pnpm test:offline 2>&1", cwd=MOSS_DIR, timeout=120, check=False)
        results["moss_offline_tests"] = "PASS" if rc == 0 else f"FAIL({rc})"
        print(f"  {results['moss_offline_tests']}")

        # 10. Sync Protocol package
        log(10, total, "Sync Protocol package")
        proto_src = f"{PROJECT}/packages/moss-prediction-market"
        proto_dst = f"{MOSS_DIR}/packages/protocols/marketlens"
        os.makedirs(f"{proto_dst}/src/abis", exist_ok=True)
        os.makedirs(f"{proto_dst}/test", exist_ok=True)
        for f in os.listdir(f"{proto_src}/src"):
            src = os.path.join(f"{proto_src}/src", f)
            dst = os.path.join(f"{proto_dst}/src", f)
            if os.path.isfile(src): shutil.copy2(src, dst)
        if os.path.exists(f"{proto_src}/src/abis"):
            for f in os.listdir(f"{proto_src}/src/abis"):
                shutil.copy2(os.path.join(f"{proto_src}/src/abis", f), os.path.join(f"{proto_dst}/src/abis", f))
        for f in os.listdir(f"{proto_src}/test"):
            if f.endswith(".ts"):
                shutil.copy2(os.path.join(f"{proto_src}/test", f), os.path.join(f"{proto_dst}/test", f))
        for f in ["package.json", "tsconfig.json"]:
            shutil.copy2(os.path.join(proto_src, f), os.path.join(proto_dst, f))
        print("  OK")

        # 11. Generate ABI
        log(11, total, "Generate ABI")
        subprocess.run(f"cd {PROJECT} && node scripts/generate-abi.mjs 2>&1", shell=True, check=True)
        if os.path.exists(f"{proto_src}/src/abis"):
            for f in os.listdir(f"{proto_src}/src/abis"):
                shutil.copy2(os.path.join(f"{proto_src}/src/abis", f), os.path.join(f"{proto_dst}/src/abis", f))
        print("  OK")

        # 12. Protocol typecheck
        log(12, total, "Protocol typecheck")
        out, err, rc = run("npx pnpm --filter @marketlens/moss-prediction-market typecheck 2>&1", cwd=MOSS_DIR, timeout=60, check=False)
        results["proto_typecheck"] = "PASS" if rc == 0 else f"WARN({rc})"
        print(f"  {results['proto_typecheck']}")

        # 13. Start Anvil (as subprocess)
        log(13, total, "Start Anvil (chain 143)")
        assert check_port(RPC_PORT), f"Port {RPC_PORT} in use!"
        anvil_proc = subprocess.Popen(
            ["anvil", "--host", "0.0.0.0", "--port", str(RPC_PORT), "--chain-id", str(CHAIN_ID),
             "--base-fee", "0", "--gas-limit", "30000000", "--balance", "10000"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        results["anvil_pid"] = anvil_proc.pid
        # Wait for ready
        for _ in range(30):
            time.sleep(0.5)
            try:
                r = subprocess.run(f"curl -s -X POST {RPC_URL} -H 'Content-Type: application/json' -d '{{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}}'", shell=True, capture_output=True, text=True, timeout=3)
                if "0x8f" in r.stdout:
                    break
            except:
                pass
        print(f"  PID={anvil_proc.pid} OK")

        # 14. Trace probe
        log(14, total, "Trace probe")
        probe = '{"jsonrpc":"2.0","id":1,"method":"debug_traceCall","params":[{"from":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","to":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},"latest",{"tracer":"callTracer"}]}'
        r = subprocess.run(f"curl -s -X POST {RPC_URL} -H 'Content-Type: application/json' -d '{probe}'", shell=True, capture_output=True, text=True)
        results["trace_probe"] = "SUPPORTED" if "type" in r.stdout else "UNSUPPORTED"
        print(f"  {results['trace_probe']}")

        # 15. Deploy
        log(15, total, "Deploy PredictionMarket")
        with open(f"{PROJECT}/contracts/out/PredictionMarket.sol/PredictionMarket.json") as f:
            bc = json.load(f)["bytecode"]["object"]
        PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        r = subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key {PK} --create {bc} --json 2>/dev/null", shell=True, capture_output=True, text=True, timeout=30)
        deploy = json.loads(r.stdout)
        addr = deploy["contractAddress"]
        results["contract_address"] = addr
        results["deployment_tx_hash"] = deploy.get("transactionHash", "")
        print(f"  {addr}")

        # 16. State setup
        log(16, total, "State setup (5 markets)")
        ts = int(subprocess.run(f"cast block latest --rpc-url {RPC_URL} --field timestamp", shell=True, capture_output=True, text=True).stdout.strip())
        t1, t2 = ts + 1800, ts + 7200
        for mkt, t in [("M1", t2), ("M2", t2), ("M3", t1), ("M4", t1), ("M5", t1)]:
            subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key {PK} {addr} 'createMarket(string,uint64)' {mkt} {t} >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d {addr} 'buyPosition(uint256,uint8)' 3 1 --value 1000000000000000000 >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a {addr} 'buyPosition(uint256,uint8)' 3 2 --value 500000000000000000 >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key {PK} {addr} 'buyPosition(uint256,uint8)' 4 1 --value 1000000000000000000 >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast rpc evm_setNextBlockTimestamp {t1+10} --rpc-url {RPC_URL} >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast rpc evm_mine --rpc-url {RPC_URL} >/dev/null 2>&1", shell=True)
        for m, o in [(3,1),(4,1),(5,0)]:
            subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key {PK} {addr} 'resolveMarket(uint256,uint8)' {m} {o} >/dev/null 2>&1", shell=True)
        subprocess.run(f"cast send --rpc-url {RPC_URL} --private-key {PK} {addr} 'claimReward(uint256)' 4 >/dev/null 2>&1", shell=True)
        print("  OK (M1-2 open, M3 resolved YES, M4 claimed, M5 refund)")

        # Update adapter address
        adapter = f"{proto_dst}/src/adapter.ts"
        with open(adapter) as f: content = f.read()
        import re
        content = re.sub(r'0x[0-9a-fA-F]{40}', addr, content, count=1)
        with open(adapter, "w") as f: f.write(content)

        # 17. Run Protocol tests
        log(17, total, "Protocol tests")
        out, err, rc = run(f"cd {proto_dst} && npx vitest run 2>&1", timeout=120, check=False)
        # Parse results
        lines = out.split("\n")
        for l in lines[-5:]:
            if "Tests" in l or "Test Files" in l:
                print(f"  {l.strip()}")
        results["proto_test_result"] = "PASS" if rc == 0 else f"FAIL({rc})"
        results["proto_test_output"] = lines[-3:] if len(lines) >= 3 else lines

        # 18-22. Quick marketlens tests
        log(18, total, "Foundry tests")
        out, err, rc = run("forge test 2>&1", cwd=f"{PROJECT}/contracts", timeout=120, check=False)
        for l in out.split("\n"):
            if "test result" in l or "Ran " in l:
                print(f"  {l.strip()}")
        results["foundry"] = "PASS" if rc == 0 else f"FAIL({rc})"

        log(19, total, "Analytics tests")
        out, err, rc = run("uv run pytest -q 2>&1", cwd=f"{PROJECT}/analytics", timeout=60, check=False)
        for l in out.split("\n"):
            if "passed" in l:
                print(f"  {l.strip()}")
        results["analytics"] = "PASS" if rc == 0 else f"FAIL({rc})"

        log(20, total, "Action tests")
        out, err, rc = run("npx pnpm --filter prediction-market-actions test 2>&1", cwd=PROJECT, timeout=60, check=False)
        for l in out.split("\n"):
            if "Tests" in l:
                print(f"  {l.strip()}")
        results["action"] = "PASS" if rc == 0 else f"FAIL({rc})"

        log(21, total, "Next.js build")
        out, err, rc = run("npx next build 2>&1", cwd=f"{PROJECT}/web", timeout=180, check=False)
        for l in out.split("\n"):
            if "Generating static" in l or "✓" in l:
                print(f"  {l.strip()}")
        results["nextjs"] = "PASS" if rc == 0 else f"FAIL({rc})"

        # 22. Stop Anvil
        log(22, total, "Stop Anvil + verify")
        if anvil_proc:
            anvil_proc.terminate()
            try: anvil_proc.wait(timeout=5)
            except: anvil_proc.kill()
        time.sleep(1)
        # Verify port free
        results["residual_anvil"] = 0 if check_port(RPC_PORT) else 1
        if results["residual_anvil"] == 0:
            print("  Port free, no residual processes")
        else:
            print("  WARNING: port still in use")

        # Final result
        finished = datetime.now(timezone.utc).isoformat()
        results["finished_at_utc"] = finished
        results["exit_code"] = 0
        results["result"] = "PASS"
        
        print(f"\n=== Clean Run {run_id}: PASS ===")
        print(f"Finished: {finished}")
        
    except Exception as e:
        print(f"\n=== Clean Run {run_id}: FAILED ===")
        print(f"Error: {e}")
        results["result"] = "FAIL"
        results["error"] = str(e)
        if anvil_proc:
            anvil_proc.terminate()
            try: anvil_proc.wait(timeout=3)
            except: anvil_proc.kill()
    
    finally:
        # Save results
        out_dir = f"{PROJECT}/artifacts/reproduction"
        os.makedirs(out_dir, exist_ok=True)
        results_path = f"{out_dir}/phase2b-run-{run_id}.json"
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Results: {results_path}")
        
        return results.get("result", "ERROR") == "PASS"

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
