[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$allowlistPath = Join-Path $projectRoot 'config\secret-scan-allowlist.json'

Push-Location $projectRoot
try {
    $sourceFiles = @(
        git ls-files -co --exclude-standard |
            Where-Object {
                $_ -notmatch '(^|/)(node_modules|work|artifacts/phase4a-agent-batch|\.next|out|cache)(/|$)' -and
                $_ -ne 'pnpm-lock.yaml' -and
                $_ -ne 'config/secret-scan-allowlist.json'
            }
    )
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed with exit code $LASTEXITCODE."
    }
    if ($sourceFiles.Count -eq 0) {
        throw 'Secret scan did not discover any source files.'
    }

    $scanOutput = @(
        uvx --from 'detect-secrets==1.5.0' detect-secrets scan --all-files @sourceFiles
    )
    if ($LASTEXITCODE -ne 0) {
        throw "detect-secrets failed with exit code $LASTEXITCODE."
    }

    $scan = ($scanOutput -join "`n") | ConvertFrom-Json
    $allowlist = Get-Content -Raw -LiteralPath $allowlistPath | ConvertFrom-Json
    if ($allowlist.scanner -ne 'detect-secrets==1.5.0') {
        throw "Unexpected scanner version in $allowlistPath."
    }

    $allowedKeys = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::Ordinal
    )
    foreach ($entry in $allowlist.allowlist) {
        $key = '{0}|{1}|{2}' -f $entry.file, $entry.type, $entry.hashedSecret
        if (-not $allowedKeys.Add($key)) {
            throw "Duplicate secret-scan allowlist entry: $key"
        }
    }

    $actualKeys = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::Ordinal
    )
    $unexpected = [System.Collections.Generic.List[object]]::new()
    foreach ($property in $scan.results.PSObject.Properties) {
        $file = $property.Name -replace '\\', '/'
        foreach ($finding in $property.Value) {
            $key = '{0}|{1}|{2}' -f $file, $finding.type, $finding.hashed_secret
            [void]$actualKeys.Add($key)
            if (-not $allowedKeys.Contains($key)) {
                $unexpected.Add(
                    [PSCustomObject]@{
                        File = $file
                        Line = $finding.line_number
                        Type = $finding.type
                    }
                )
            }
        }
    }

    $stale = @($allowedKeys | Where-Object { -not $actualKeys.Contains($_) })
    if ($unexpected.Count -gt 0) {
        $unexpected | Sort-Object File, Line | Format-Table -AutoSize
        throw "$($unexpected.Count) unreviewed potential secret(s) found."
    }
    if ($stale.Count -gt 0) {
        $stale | Sort-Object | ForEach-Object { Write-Host "Stale allowlist: $_" }
        throw "$($stale.Count) stale secret-scan allowlist entry or entries found."
    }

    Write-Host (
        "Secret scan passed: {0} source files, {1} reviewed false positives, 0 unreviewed findings." -f
        $sourceFiles.Count,
        $actualKeys.Count
    )
} finally {
    Pop-Location
}
