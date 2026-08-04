[CmdletBinding()]
param(
    [int]$Port = 8546
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$workDir = Join-Path $projectRoot 'work'
$pidFile = Join-Path $workDir 'phase4a-anvil.pid'
$stdoutFile = Join-Path $workDir 'phase4a-anvil.stdout.log'
$stderrFile = Join-Path $workDir 'phase4a-anvil.stderr.log'
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

if (Test-Path -LiteralPath $pidFile) {
    $stalePid = [int](Get-Content -Raw -LiteralPath $pidFile)
    Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $pidFile -Force
}

$anvilPath = (wsl.exe -e bash -lc 'printf %s "$HOME/.foundry/bin/anvil"').Trim()
if (-not $anvilPath) {
    throw 'Anvil was not found in WSL.'
}

$arguments = @(
    '-e', $anvilPath,
    '--host', '127.0.0.1',
    '--port', [string]$Port,
    '--chain-id', '143',
    '--base-fee', '0',
    '--gas-limit', '30000000',
    '--balance', '10000',
    '--silent'
)
$process = Start-Process -FilePath 'wsl.exe' -ArgumentList $arguments -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile -PassThru
$process.Id | Out-File -LiteralPath $pidFile -NoNewline -Encoding ascii

$rpcUrl = "http://127.0.0.1:$Port"
$ready = $false
foreach ($attempt in 1..60) {
    Start-Sleep -Milliseconds 250
    try {
        $response = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType 'application/json' `
            -Body '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' -TimeoutSec 2
        if ($response.result -eq '0x8f') {
            $ready = $true
            break
        }
    } catch {
    }
}
if (-not $ready) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "Anvil did not become ready on $rpcUrl."
}

node (Join-Path $projectRoot 'packages\moss-prediction-market\scripts\seed-batch-fixture.mjs') $rpcUrl
Write-Output "Phase 4A local Anvil ready at $rpcUrl (PID $($process.Id))."
