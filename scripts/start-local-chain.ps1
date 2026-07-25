[CmdletBinding()]
param([int]$Port = 8545, [int]$ChainId = 31337, [string]$HostAddr = '127.0.0.1')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$genDir = Join-Path $projectRoot 'demo\generated'
New-Item -ItemType Directory -Force -Path $genDir | Out-Null
$pidFile = Join-Path $genDir 'anvil.pid'
$outLog = Join-Path $genDir 'anvil-stdout.log'
$errLog = Join-Path $genDir 'anvil-stderr.log'
$anvilPath = (wsl.exe -e bash -lc 'printf %s "$HOME/.foundry/bin/anvil"').Trim()
if (-not $anvilPath) { throw 'Anvil not found in WSL2 ~/.foundry/bin' }
$anvilArgs = @('-e', $anvilPath, '--host', $HostAddr, '--port', [string]$Port, '--chain-id', [string]$ChainId, '--base-fee', '0', '--gas-limit', '30000000', '--balance', '10000')
Write-Host "Starting clean Anvil (chain $ChainId) on ${HostAddr}:${Port}..."
$proc = Start-Process -FilePath 'wsl.exe' -ArgumentList $anvilArgs -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
$proc.Id | Out-File -FilePath $pidFile -NoNewline
$rpcUrl = "http://${HostAddr}:$Port"
$ready = $false
foreach ($i in 1..60) {
    Start-Sleep -Milliseconds 500
    try {
        $resp = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' -TimeoutSec 2
        if ($resp.result -eq ('0x' + $ChainId.ToString('x'))) { $ready = $true; break }
    } catch { }
}
if (-not $ready) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; throw "Anvil did not start within 30s" }
Write-Host "Anvil ready: $rpcUrl (chain $ChainId, PID $($proc.Id))"
@{"rpcUrl"=$rpcUrl;"chainId"=$ChainId;"pid"=$proc.Id} | ConvertTo-Json | Out-File (Join-Path $genDir 'anvil-status.json') -Encoding utf8
