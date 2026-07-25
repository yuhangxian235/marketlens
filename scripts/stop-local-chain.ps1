[CmdletBinding()]
$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot 'demo\generated\anvil.pid'
if (-not (Test-Path $pidFile)) { Write-Host "No anvil.pid found. Anvil may not be running."; exit 0 }
$pid = (Get-Content $pidFile).Trim()
if (-not $pid) { Write-Host "PID file is empty."; Remove-Item $pidFile -ErrorAction SilentlyContinue; exit 0 }
try {
    $proc = Get-Process -Id $pid -ErrorAction Stop
    if ($proc.ProcessName -match 'wsl') { Stop-Process -Id $pid -Force; Start-Sleep -Milliseconds 500; Write-Host "Anvil (PID $pid) stopped." }
    else { Write-Host "PID $pid is not WSL ($($proc.ProcessName)). Not stopping." }
} catch { Write-Host "PID $pid not found. Already stopped." }
Remove-Item $pidFile -ErrorAction SilentlyContinue
Remove-Item (Join-Path $projectRoot 'demo\generated\anvil-status.json') -ErrorAction SilentlyContinue
