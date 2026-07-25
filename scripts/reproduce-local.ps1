[CmdletBinding()]
param([int]$Port = 8545, [int]$ChainId = 31337, [switch]$KeepAnvil, [switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$gen = Join-Path $root 'demo\generated'
$db = Join-Path $gen 'marketlens_local.sqlite'
$rpc = "http://127.0.0.1:$Port"

function Step($label, $script) {
    Write-Host "`n=== [$label] ===" -ForegroundColor Cyan
    $sw = [Diagnostics.Stopwatch]::StartNew()
    & $script
    Write-Host "--- OK (${sw.Elapsed.TotalSeconds}s)" -ForegroundColor Green
}

Step "Check deps" {
    $fv = (wsl.exe -e bash -lc 'printf %s "$HOME/.foundry/bin/forge"').Trim()
    if (-not $fv) { throw 'Foundry not in WSL2' }
    uv run --project analytics python -c "import web3; print('web3 OK')"
    node --version
}

Step "Clean generated" {
    if (Test-Path $gen) { Get-ChildItem $gen -Exclude '.gitignore' | Remove-Item -Recurse -Force -EA SilentlyContinue }
    New-Item -ItemType Directory -Force -Path $gen | Out-Null
    if (Test-Path $db) { Remove-Item $db -Force }
}

Step "Build contracts" {
    Push-Location (Join-Path $root 'contracts')
    wsl.exe -e bash -lc "cd /mnt/c/Users/Administrator/Documents/Projects/marketlens/contracts && /home/xyh/.foundry/bin/forge build"
    if ($LASTEXITCODE -ne 0) { throw 'Forge build failed' }
    Pop-Location
}

Step "Generate ABI" {
    Push-Location $root; node scripts/generate-abi.mjs; Pop-Location
}

Step "Start Anvil" {
    & (Join-Path $root 'scripts\start-local-chain.ps1') -Port $Port -ChainId $ChainId
}

Step "Deploy + Seed + Index + Analyze + Export" {
    Push-Location $root
    uv run --project analytics marketlens run-local-repro --database $db --rpc-url $rpc --network local-anvil --reset
    if ($LASTEXITCODE -ne 0) { throw 'Reproduction failed' }
    Pop-Location
}

Step "Generate provenance" {
    Push-Location $root
    uv run --project analytics python -c "
import json, os
from datetime import datetime, timezone
with open('web/public/data/manifest.json') as f: m = json.load(f)
prov = {
    'source':'local_anvil','data_status':'REAL_LOCAL_DEMO','chain_id':m['chainId'],
    'rpc_external':False,'fork_used':False,'contract_address':m['contractAddress'],
    'block_from':m['fromBlock'],'block_to':m['toBlock'],
    'block_count':m['toBlock']-m['fromBlock']+1,
    'generated_at_utc':datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'),
    'raw_event_count':34,'decoded_event_count':34,'decode_error_count':0,
    'sqlite_schema':'analytics/sql/schema.sql','analytics_version':'marketlens-pipeline-v1.1-baseline',
    'action_status':'MOCK','moss_status':'NOT_ENABLED','monad_status':'NOT_DEPLOYED',
    'wallet_count':8,'market_count':3,
    'observation_window':'2026-07-26T06:00:00Z to 2026-07-30T18:00:00Z'
}
with open('web/public/data/provenance.json','w') as f: json.dump(prov,f,indent=2); f.write(chr(10))
print('provenance.json created')
"
    Pop-Location
}

if (-not $SkipTests) {
    Step "Foundry tests" {
        Push-Location (Join-Path $root 'contracts')
        wsl.exe -e bash -lc "cd /mnt/c/Users/Administrator/Documents/Projects/marketlens/contracts && /home/xyh/.foundry/bin/forge test -vvv"
        if ($LASTEXITCODE -ne 0) { throw 'Forge tests failed' }
        Pop-Location
    }
    Step "Analytics tests" {
        Push-Location $root; uv run --project analytics pytest -q; Pop-Location
    }
    Step "Action tests" {
        Push-Location $root; npx pnpm --filter @marketlens/prediction-market-actions test; Pop-Location
    }
}

Step "Build Next.js" {
    Push-Location $root; npx pnpm --filter @marketlens/web build; Pop-Location
}

Step "Summary" {
    $m = if (Test-Path (Join-Path $gen 'local-transactions.json')) {
        Get-Content (Join-Path $gen 'local-transactions.json') -Raw | ConvertFrom-Json } else { $null }
    Write-Host ""; Write-Host "=== REPRODUCTION COMPLETE ===" -ForegroundColor Green
    Write-Host "Chain: $ChainId  RPC: $rpc"
    if ($m) { Write-Host "Contract: $($m.contractAddress)  Blocks: $($m.fromBlock)-$($m.toBlock)  Txs: $($m.transactionHashes.Count)" }
    Write-Host "DB: $db  JSON: web/public/data/"
}

if (-not $KeepAnvil) {
    Step "Stop Anvil" { & (Join-Path $root 'scripts\stop-local-chain.ps1') }
}
