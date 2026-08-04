[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start-local-anvil.ps1')
try {
    pnpm --filter @marketlens/agent-planner build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    pnpm --filter @marketlens/moss-prediction-market build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    pnpm --filter @marketlens/batch-policy build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    node (Join-Path $PSScriptRoot 'generate-artifacts.mjs')
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    & (Join-Path $PSScriptRoot 'stop-local-anvil.ps1')
}
