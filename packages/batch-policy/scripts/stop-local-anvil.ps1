[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$pidFile = Join-Path $projectRoot 'work\phase4a-anvil.pid'
if (-not (Test-Path -LiteralPath $pidFile)) {
    return
}
$processId = [int](Get-Content -Raw -LiteralPath $pidFile)
Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $pidFile -Force
