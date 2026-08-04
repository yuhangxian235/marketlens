[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start-local-anvil.ps1')
try {
    pnpm exec vitest run
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    & (Join-Path $PSScriptRoot 'stop-local-anvil.ps1')
}
