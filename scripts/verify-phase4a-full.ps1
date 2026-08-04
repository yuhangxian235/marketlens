[CmdletBinding()]
param(
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startAnvil = Join-Path $projectRoot 'packages\batch-policy\scripts\start-local-anvil.ps1'
$stopAnvil = Join-Path $projectRoot 'packages\batch-policy\scripts\stop-local-anvil.ps1'
$seedFixture = Join-Path $projectRoot 'packages\moss-prediction-market\scripts\seed-batch-fixture.mjs'
$analyticsEnvironment = Join-Path $projectRoot 'work\analytics-venv'
$stepsPassed = 0
$startedAt = Get-Date

function Invoke-External {
    param(
        [Parameter(Mandatory)]
        [string]$Executable,
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable failed with exit code $LASTEXITCODE."
    }
}

function Invoke-VerificationStep {
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [scriptblock]$Action
    )

    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    $stepStartedAt = Get-Date
    & $Action
    $script:stepsPassed += 1
    $elapsed = (Get-Date) - $stepStartedAt
    Write-Host ("PASS {0} ({1:n1}s)" -f $Name, $elapsed.TotalSeconds) -ForegroundColor Green
}

foreach ($command in @('node', 'pnpm', 'uv', 'uvx', 'wsl.exe')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $command"
    }
}

$env:UV_PROJECT_ENVIRONMENT = $analyticsEnvironment
$protocolAnvilStarted = $false

Push-Location $projectRoot
try {
    if (-not $SkipInstall) {
        Invoke-VerificationStep 'Install JavaScript dependencies' {
            Invoke-External 'pnpm' @('install', '--frozen-lockfile')
        }
    }

    Invoke-VerificationStep 'Phase 4A artifacts, Batch tests, workspace checks, and Web build' {
        Invoke-External 'pnpm' @('verify:phase4a')
    }

    Invoke-VerificationStep 'Analytics tests (16)' {
        Invoke-External 'uv' @(
            'run', '--project', 'analytics', '--extra', 'dev',
            'pytest', 'analytics/tests', '-q'
        )
    }

    Invoke-VerificationStep 'Analytics lint' {
        Invoke-External 'uv' @(
            'run', '--project', 'analytics', '--extra', 'dev',
            'ruff', 'check', 'analytics'
        )
    }

    Invoke-VerificationStep 'Analytics format check' {
        Invoke-External 'uv' @(
            'run', '--project', 'analytics', '--extra', 'dev',
            'ruff', 'format', '--check', 'analytics'
        )
    }

    Invoke-VerificationStep 'Action tests (6)' {
        Invoke-External 'pnpm' @(
            '--filter', '@marketlens/prediction-market-actions', 'test'
        )
    }

    Invoke-VerificationStep 'Moss core tests (32)' {
        Invoke-External 'pnpm' @('--filter', '@themoss/core', 'test')
    }

    Invoke-VerificationStep 'Moss simulator tests (14)' {
        Invoke-External 'pnpm' @('--filter', '@themoss/simulator', 'test')
    }

    Invoke-VerificationStep 'Polymarket shadow tests (7)' {
        Invoke-External 'pnpm' @('--filter', '@marketlens/polymarket-shadow', 'test')
    }

    Invoke-VerificationStep 'Protocol tests with no-key local Anvil fixture (64)' {
        & $startAnvil
        $protocolAnvilStarted = $true
        Invoke-External 'node' @($seedFixture, 'http://127.0.0.1:8546', 'protocol')
        Invoke-External 'pnpm' @('--filter', '@marketlens/moss-prediction-market', 'test')
        & $stopAnvil
        $protocolAnvilStarted = $false
    }

    $contractsWslPath = (& wsl.exe -e wslpath -a (Join-Path $projectRoot 'contracts')).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $contractsWslPath) {
        throw 'Could not resolve the contracts directory inside WSL.'
    }
    if ($contractsWslPath.Contains("'")) {
        throw 'The WSL contracts path contains an unsupported single quote.'
    }

    Invoke-VerificationStep 'Foundry unit and fuzz tests (39)' {
        Invoke-External 'wsl.exe' @(
            '-e', 'bash', '-lic',
            "cd '$contractsWslPath' && ~/.foundry/bin/forge test --no-match-path test/PredictionMarketInvariants.t.sol"
        )
    }

    Invoke-VerificationStep 'Foundry invariant tests (5)' {
        Invoke-External 'wsl.exe' @(
            '-e', 'bash', '-lic',
            "cd '$contractsWslPath' && ~/.foundry/bin/forge test --match-path test/PredictionMarketInvariants.t.sol"
        )
    }

    Invoke-VerificationStep 'Foundry format check' {
        Invoke-External 'wsl.exe' @(
            '-e', 'bash', '-lic',
            "cd '$contractsWslPath' && ~/.foundry/bin/forge fmt --check"
        )
    }

    Invoke-VerificationStep 'Secret scan' {
        & (Join-Path $PSScriptRoot 'verify-secrets.ps1')
    }

    Invoke-VerificationStep 'Git whitespace check' {
        Invoke-External 'git' @('diff', '--check')
    }
} finally {
    if ($protocolAnvilStarted -or (Test-Path (Join-Path $projectRoot 'work\phase4a-anvil.pid'))) {
        & $stopAnvil
    }
    Pop-Location
}

$totalElapsed = (Get-Date) - $startedAt
Write-Host (
    "`nFULL PHASE 4A VERIFICATION PASSED: {0} steps in {1:n1}s." -f
    $stepsPassed,
    $totalElapsed.TotalSeconds
) -ForegroundColor Green
