[CmdletBinding()]
param(
    [int]$Port = 8546,
    [int]$ChainId = 143,
    [string]$HostAddr = '127.0.0.1',
    [switch]$KeepAnvil
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$genDir = Join-Path $root 'demo\generated'
New-Item -ItemType Directory -Force -Path $genDir | Out-Null

$anvilPath = (wsl.exe -e bash -lc 'printf %s "$HOME/.foundry/bin/anvil"').Trim()
if (-not $anvilPath) { throw 'Anvil not found' }

# Kill existing anvil
$pidFile = Join-Path $genDir 'anvil-moss.pid'
if (Test-Path $pidFile) {
    try { Stop-Process -Id (Get-Content $pidFile).Trim() -Force -EA SilentlyContinue } catch {}
    Remove-Item $pidFile -EA SilentlyContinue
}
Start-Sleep -Seconds 1

Write-Host "=== DEPLOY MOSS LOCAL STATE (Chain $ChainId) ===" -ForegroundColor Cyan
Write-Host "NOT MONAD. LOCAL ANVIL ONLY." -ForegroundColor Yellow

$anvilArgs = @('-e', $anvilPath, '--host', $HostAddr, '--port', [string]$Port, '--chain-id', [string]$ChainId, '--base-fee', '0', '--gas-limit', '30000000', '--balance', '10000')
$proc = Start-Process -FilePath 'wsl.exe' -ArgumentList $anvilArgs -WindowStyle Hidden -RedirectStandardOutput (Join-Path $genDir 'anvil-moss-stdout.log') -RedirectStandardError (Join-Path $genDir 'anvil-moss-stderr.log') -PassThru
$proc.Id | Out-File -FilePath $pidFile -NoNewline

$rpcUrl = "http://${HostAddr}:$Port"
$ready = $false
foreach ($i in 1..60) {
    Start-Sleep -Milliseconds 500
    try {
        $resp = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' -TimeoutSec 2
        if ($resp.result -eq '0x8f') { $ready = $true; break }
    } catch {}
}
if (-not $ready) { Stop-Process -Id $proc.Id -Force -EA SilentlyContinue; throw "Anvil did not start" }
Write-Host "Anvil ready: $rpcUrl"

$wslRoot = (wsl.exe -e wslpath -a ($root -replace '\\', '/')).Trim()

$OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
$ALICE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
$BOB   = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
$OWNER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
$ALICE_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
$BOB_PK   = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

# Deploy contract
$bytecode = (Get-Content (Join-Path $root 'contracts\out\PredictionMarket.sol\PredictionMarket.json') -Raw | ConvertFrom-Json).bytecode.object
Write-Host "Deploying PredictionMarket..."
$deployResult = wsl.exe -e bash -lc "cast send --rpc-url '$rpcUrl' --private-key $OWNER_PK --create $bytecode --json 2>/dev/null"
$receipt = ($deployResult | Out-String).Trim() | ConvertFrom-Json
$contractAddress = $receipt.contractAddress
Write-Host "Contract: $contractAddress"

# Get current timestamp
$tsRaw = wsl.exe -e bash -lc "cast block latest --rpc-url '$rpcUrl' --field timestamp"
$NOW = [int64]($tsRaw | Out-String).Trim()
$T1 = $NOW + 1800   # 30 min - markets to close
$T2 = $NOW + 7200   # 2 hrs - open markets
$T3 = $NOW + 36000  # 10 hrs - far future

function Invoke-Send($pk, $sig, $args, $value) {
    $cmd = "cast send --rpc-url '$rpcUrl' --private-key $pk '$contractAddress' '$sig'"
    if ($args) { $cmd += " $args" }
    if ($value) { $cmd += " --value $value" }
    wsl.exe -e bash -lc $cmd *>$null
}

Write-Host "Creating markets..."
# Market 1 (B): buy YES - open, far closeTime
Invoke-Send $OWNER_PK 'createMarket(string,uint64)' '"Will BTC hit 200K?"' " $T3"
Write-Host "  M1 (buy YES): id=1 open"

# Market 2 (C): buy NO - open, far closeTime  
Invoke-Send $OWNER_PK 'createMarket(string,uint64)' '"Will ETH drop below 1K?"' " $T3"
Write-Host "  M2 (buy NO): id=2 open"

# Market 3 (D): claim + losing - seed then close
Invoke-Send $OWNER_PK 'createMarket(string,uint64)' '"Will AI surpass humans?"' " $T1"
Write-Host "  M3 (claim): id=3"

Invoke-Send $ALICE_PK 'buyPosition(uint256,uint8)' '3 1' ' 1000000000000000000'
Invoke-Send $BOB_PK 'buyPosition(uint256,uint8)' '3 2' ' 500000000000000000'
Write-Host "  M3 seeded: ALICE=1ETH YES, BOB=0.5ETH NO"

# Market 4 (F): already claimed
Invoke-Send $OWNER_PK 'createMarket(string,uint64)' '"Will SOL flip ETH?"' " $T1"
Invoke-Send $OWNER_PK 'buyPosition(uint256,uint8)' '4 1' ' 1000000000000000000'
Write-Host "  M4 (already-claimed): id=4"

# Market 5 (G): closed market buy
Invoke-Send $OWNER_PK 'createMarket(string,uint64)' '"Will ETH hit 10K?"' " $T1"
Write-Host "  M5 (closed): id=5"

# Market 6 (X): extra open for create_market simulation
# Not creating - simulation will create it

Write-Host "Advancing time to close M3, M4, M5..."
$advanceTo = $T1 + 10
wsl.exe -e bash -lc "cast rpc evm_setNextBlockTimestamp $advanceTo --rpc-url '$rpcUrl'" *>$null
wsl.exe -e bash -lc "cast rpc evm_mine --rpc-url '$rpcUrl'" *>$null

Write-Host "Resolving markets..."
Invoke-Send $OWNER_PK 'resolveMarket(uint256,uint8)' '3 1'
Write-Host "  M3 resolved YES"
Invoke-Send $OWNER_PK 'resolveMarket(uint256,uint8)' '4 1'
Write-Host "  M4 resolved YES"

# Pre-claim M4
Invoke-Send $OWNER_PK 'claimReward(uint256)' '4'
Write-Host "  M4 pre-claimed by owner"

# M5: resolve as refund (no stakes on YES/NO)
Invoke-Send $OWNER_PK 'resolveMarket(uint256,uint8)' '5 0'
Write-Host "  M5 resolved Unset (refund mode)"

# Generate state file
$stateFile = Join-Path $genDir 'moss-local-state.json'
@{
    schemaVersion = 1
    environment = 'local_anvil_moss'
    dataStatus = 'REAL_LOCAL_MOSS_STATE'
    chainId = $ChainId
    contractAddress = $contractAddress
    rpcUrl = $rpcUrl
    generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    closeBlockTimestamp = $advanceTo
    markets = @(
        @{ marketId = 1; label = 'B'; scenario = 'buy_YES_open'; closesAt = $T3; state = 'open' }
        @{ marketId = 2; label = 'C'; scenario = 'buy_NO_open'; closesAt = $T3; state = 'open' }
        @{ marketId = 3; label = 'D'; scenario = 'claim_win_lose'; closesAt = $T1; result = 'YES'; state = 'resolved' }
        @{ marketId = 4; label = 'F'; scenario = 'already_claimed'; closesAt = $T1; result = 'YES'; state = 'claimed' }
        @{ marketId = 5; label = 'G'; scenario = 'closed_buy_refund'; closesAt = $T1; result = 'Unset'; state = 'resolved_refund' }
    )
    accounts = @(
        @{ role = 'owner'; address = $OWNER }
        @{ role = 'alice_winner'; address = $ALICE }
        @{ role = 'bob_loser'; address = $BOB }
    )
    privateKeysNote = 'Anvil default test keys. NOT for production.'
} | ConvertTo-Json -Depth 5 | Out-File -FilePath $stateFile -Encoding utf8

Write-Host "`n=== STATE DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Contract: $contractAddress"
Write-Host "Port: $Port  Chain: $ChainId"
Write-Host "State file: $stateFile"
