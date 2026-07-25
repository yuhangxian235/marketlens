[CmdletBinding()]
param(
    [string]$DatabasePath = 'analytics\data\marketlens.sqlite',
    [switch]$KeepAnvil
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$networkPath = Join-Path $projectRoot 'config\networks\local-monad-fork.json'
$network = Get-Content -LiteralPath $networkPath -Raw | ConvertFrom-Json
$database = Join-Path $projectRoot $DatabasePath

$anvilPath = (
    wsl.exe -e bash -lc 'printf %s "$HOME/.foundry/bin/anvil"'
).Trim()
if (-not $anvilPath) {
    throw 'Monad Anvil is missing in WSL2. Run scripts/bootstrap.ps1 first.'
}
$anvilArguments = @(
    '-e'
    $anvilPath
    '--fork-url'
    'https://rpc.monad.xyz'
    '--fork-block-number'
    [string]$network.forkBlockNumber
    '--host'
    '127.0.0.1'
    '--port'
    '8545'
    '--chain-id'
    '143'
    '--base-fee'
    '0'
)
$workDirectory = Join-Path $projectRoot 'work'
New-Item -ItemType Directory -Force -Path $workDirectory | Out-Null
$anvilOutput = Join-Path $workDirectory 'anvil.stdout.log'
$anvilError = Join-Path $workDirectory 'anvil.stderr.log'

Write-Host (
    "Starting disposable Monad Anvil fork at block " +
    "$($network.forkBlockNumber)..."
)
$anvil = Start-Process -FilePath 'wsl.exe' -ArgumentList $anvilArguments `
    -WindowStyle Hidden -RedirectStandardOutput $anvilOutput `
    -RedirectStandardError $anvilError -PassThru

try {
    $ready = $false
    foreach ($attempt in 1..40) {
        Start-Sleep -Milliseconds 500
        try {
            $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8545' `
                -Method Post -ContentType 'application/json' `
                -Body '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' `
                -TimeoutSec 1
            if ($response.result -eq '0x8f') {
                $ready = $true
                break
            }
        } catch {
            # Anvil is still starting.
        }
    }
    if (-not $ready) {
        $diagnostic = if (Test-Path $anvilError) {
            (Get-Content -LiteralPath $anvilError -Tail 20) -join [Environment]::NewLine
        } else {
            'no Anvil stderr was captured'
        }
        throw (
            'Anvil did not become ready on http://127.0.0.1:8545.' +
            [Environment]::NewLine + $diagnostic
        )
    }

    Push-Location $projectRoot
    try {
        uv run --project analytics marketlens run-local-demo `
            --database $database --rpc-url 'http://127.0.0.1:8545' --reset
        if ($LASTEXITCODE -ne 0) {
            throw 'MarketLens local demo failed.'
        }
    } finally {
        Pop-Location
    }
} finally {
    if (-not $KeepAnvil -and -not $anvil.HasExited) {
        Stop-Process -Id $anvil.Id -Force
    }
}
