[CmdletBinding()]
param([string]$RpcUrl = 'http://127.0.0.1:8546')
$ErrorActionPreference = 'Continue'
Write-Host "=== Moss Trace Endpoint Probe ==="
Write-Host "RPC: $RpcUrl"

function Test-Rpc($method, $params) {
    $body = @{jsonrpc="2.0";id=1;method=$method;params=$params} | ConvertTo-Json -Compress
    try {
        $r = Invoke-RestMethod -Uri $RpcUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 5
        if ($r.error) { return @{supported=$false;error=$r.error.message} }
        return @{supported=$true;result=$r.result}
    } catch { return @{supported=$false;error=$_.Exception.Message} }
}

$checks = @(
    @{method="eth_chainId";params=@();label="Chain ID"}
    @{method="debug_traceCall";params=@(@{to="0x0000000000000000000000000000000000000000";data="0x"},"latest",@{tracer="callTracer"});label="debug_traceCall (callTracer)"}
    @{method="debug_traceCall";params=@(@{to="0x0000000000000000000000000000000000000000";data="0x"},"latest",@{tracer="prestateTracer"});label="debug_traceCall (prestateTracer)"}
)

foreach ($c in $checks) {
    $result = Test-Rpc $c.method $c.params
    $status = if ($result.supported) { "PASS" } else { "FAIL" }
    Write-Host "  [$status] $($c.label)"
    if (-not $result.supported) { Write-Host "    Error: $($result.error)" }
}

Write-Host ""
Write-Host "Conclusion: If all PASS, Anvil supports Moss trace simulation."
Write-Host "If any FAIL, Moss will fail-closed (as designed)."
