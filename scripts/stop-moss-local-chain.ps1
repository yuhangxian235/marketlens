[CmdletBinding()]
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root 'demo\generated\anvil-moss.pid'
if (-not (Test-Path $pidFile)) { Write-Host "No anvil-moss.pid found."; exit 0 }
$pid = (Get-Content $pidFile).Trim()
try {
    $proc = Get-Process -Id $pid -ErrorAction Stop
    if ($proc.ProcessName -match 'wsl') { Stop-Process -Id $pid -Force; Write-Host "Anvil (PID $pid) stopped." }
} catch { Write-Host "PID $pid not found." }
Remove-Item $pidFile -EA SilentlyContinue
