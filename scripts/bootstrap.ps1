[CmdletBinding()]
param(
    [switch]$SkipMoss
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$network = Get-Content -LiteralPath (
    Join-Path $projectRoot 'config\networks\local-monad-fork.json'
) -Raw | ConvertFrom-Json

Write-Host 'Checking host tools...'
git --version
node --version
corepack --version
uv --version

Write-Host 'Aligning pnpm to the source-pinned Moss workspace requirement...'
corepack prepare pnpm@11.10.0 --activate
corepack pnpm install --frozen-lockfile

Write-Host 'Creating the isolated Python 3.11 environment...'
uv sync --project (Join-Path $projectRoot 'analytics') --extra dev --python 3.11

$wslRoot = (
    wsl.exe -e wslpath -a ($projectRoot -replace '\\', '/')
).Trim()
$forgeCommand = @(
    'export PATH="$HOME/.foundry/bin:$PATH"'
    "cd `"$wslRoot`""
    'forge --version'
    'anvil --version'
    'if [ ! -d lib/forge-std ]; then forge install foundry-rs/forge-std --no-git; fi'
    'cd contracts'
    'forge test'
    'forge build'
) -join '; '

Write-Host 'Building and testing with Monad Foundry in WSL2...'
wsl.exe -e bash -lc $forgeCommand
if ($LASTEXITCODE -ne 0) {
    throw 'Foundry build/test failed.'
}

node (Join-Path $projectRoot 'scripts\generate-abi.mjs')

if (-not $SkipMoss) {
    Write-Host (
        "Moss source pin: d09b38cbc44ee7f5722c5d09e7224f7750187762. " +
        'The real adapter remains disabled until the patched workspace passes.'
    )
}

Write-Host (
    "Bootstrap complete for chain $($network.chainId), " +
    "fork block $($network.forkBlockNumber)."
)
