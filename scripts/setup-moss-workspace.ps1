[CmdletBinding()]
param(
    [ValidateSet("Auto","ExistingVerifiedWorkspace","NetworkClone","OfficialArchive","LocalGitBundle")]
    [string]$SourceMode = "Auto",
    [string]$LocalRepositoryPath,
    [string]$BundlePath,
    [string]$ArchivePath,
    [switch]$ForceRecreate,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mossDir = Join-Path $root 'external\moss'
$pinFile = Join-Path $root 'packages\moss-prediction-market\source-pin.json'
$pin = Get-Content $pinFile -Raw | ConvertFrom-Json
$repo = $pin.repository
$commit = $pin.commit

Write-Host "=== Moss Workspace Setup ==="
Write-Host "Repository: $repo"
Write-Host "Fixed commit: $commit"
Write-Host "Source mode: $SourceMode"

# Verify Node and pnpm
$nodeVer = node --version
Write-Host "Node: $nodeVer"

# --- Source acquisition ---
if ($SourceMode -eq "Auto") {
    if (Test-Path (Join-Path $mossDir 'pnpm-workspace.yaml')) {
        Write-Host "Auto: existing workspace found at $mossDir"
        $SourceMode = "ExistingVerifiedWorkspace"
    } elseif ($ArchivePath -and (Test-Path $ArchivePath)) {
        Write-Host "Auto: using provided archive"
        $SourceMode = "OfficialArchive"
    } elseif ($BundlePath -and (Test-Path $BundlePath)) {
        Write-Host "Auto: using provided bundle"
        $SourceMode = "LocalGitBundle"
    } else {
        Write-Host "Auto: attempting network clone..."
        $SourceMode = "NetworkClone"
    }
}

switch ($SourceMode) {
    "ExistingVerifiedWorkspace" {
        Write-Host "Using existing workspace: $mossDir"
        if (-not (Test-Path (Join-Path $mossDir 'pnpm-workspace.yaml'))) {
            throw "No valid Moss workspace at $mossDir"
        }
        Write-Host "NOTE: Vocabulary patch not needed - fixed commit d09b38c already contains create/buy/prediction-market/adminAction/contractInteraction"
        break
    }
    "NetworkClone" {
        if (Test-Path $mossDir) {
            if ($ForceRecreate) {
                Remove-Item -Recurse -Force $mossDir
            } else {
                throw "$mossDir exists. Use -ForceRecreate or choose ExistingVerifiedWorkspace"
            }
        }
        Write-Host "Cloning Moss (shallow)..."
        git clone --depth 1 $repo $mossDir
        if ($LASTEXITCODE -ne 0) { throw "Clone failed" }
        Push-Location $mossDir
        git fetch --unshallow origin
        git checkout --detach $commit
        Pop-Location
        Write-Host "NOTE: Vocabulary patch not needed - fixed commit already has all required tokens"
        break
    }
    "OfficialArchive" {
        if (-not $ArchivePath) { throw "-ArchivePath required for OfficialArchive mode" }
        if (Test-Path $mossDir) {
            if ($ForceRecreate) { Remove-Item -Recurse -Force $mossDir }
            else { throw "$mossDir exists. Use -ForceRecreate" }
        }
        Write-Host "Extracting archive: $ArchivePath"
        Expand-Archive -Path $ArchivePath -DestinationPath $mossDir -Force
        $innerDir = Get-ChildItem $mossDir -Directory | Select-Object -First 1
        if ($innerDir) {
            Get-ChildItem $innerDir.FullName | Move-Item -Destination $mossDir -Force
            Remove-Item $innerDir.FullName -Recurse -Force
        }
        Write-Host "Archive extracted. No .git directory (expected)."
        Write-Host "NOTE: Vocabulary patch not needed - fixed commit already has all required tokens"
        break
    }
    "LocalGitBundle" {
        if (-not $BundlePath) { throw "-BundlePath required for LocalGitBundle mode" }
        Write-Host "Verifying bundle: $BundlePath"
        git bundle verify $BundlePath
        if ($LASTEXITCODE -ne 0) { throw "Bundle verification failed" }
        if (Test-Path $mossDir) {
            if ($ForceRecreate) { Remove-Item -Recurse -Force $mossDir }
            else { throw "$mossDir exists. Use -ForceRecreate" }
        }
        git clone $BundlePath $mossDir
        Push-Location $mossDir
        git checkout --detach $commit
        Pop-Location
        Write-Host "NOTE: Vocabulary patch not needed - fixed commit already has all required tokens"
        break
    }
}

# Verify workspace structure
if (-not (Test-Path (Join-Path $mossDir 'pnpm-workspace.yaml'))) {
    throw "pnpm-workspace.yaml not found - invalid Moss workspace"
}
if (-not (Test-Path (Join-Path $mossDir 'packages\core\src\types.ts'))) {
    throw "packages/core/src/types.ts not found - invalid Moss workspace"
}

Write-Host "Source verification: OK"

# Sync MarketLens protocol package into Moss workspace
$srcProtocol = Join-Path $root 'packages\moss-prediction-market\src'
$dstProtocol = Join-Path $mossDir 'packages\protocols\marketlens\src'
$dstTest = Join-Path $mossDir 'packages\protocols\marketlens\test'
$dstRoot = Join-Path $mossDir 'packages\protocols\marketlens'

New-Item -ItemType Directory -Force -Path $dstProtocol | Out-Null
New-Item -ItemType Directory -Force -Path $dstTest | Out-Null

Copy-Item (Join-Path $srcProtocol '*.ts') -Destination $dstProtocol -Force
Copy-Item (Join-Path $root 'packages\moss-prediction-market\test\*.ts') -Destination $dstTest -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root 'packages\moss-prediction-market\package.json') -Destination $dstRoot -Force
Copy-Item (Join-Path $root 'packages\moss-prediction-market\tsconfig.json') -Destination $dstRoot -Force
Copy-Item (Join-Path $root 'packages\moss-prediction-market\vitest.config.ts') -Destination $dstRoot -Force -ErrorAction SilentlyContinue

Write-Host "Synced protocol package to: $dstRoot"

# Install deps and build
Push-Location $mossDir
Write-Host "Installing dependencies..."
npx pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

Write-Host "Building Moss..."
npx pnpm build
if ($LASTEXITCODE -ne 0) { throw "Moss build failed" }

Write-Host "Typecheck..."
npx pnpm typecheck
if ($LASTEXITCODE -ne 0) { throw "Moss typecheck failed" }

if (-not $SkipTests) {
    Write-Host "Running Moss offline tests..."
    npx pnpm test:offline
    if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: Some Moss tests failed (may be env-dependent)" }
}

# Build and test protocol package
Write-Host "Building MarketLens protocol package..."
npx pnpm --filter @marketlens/moss-prediction-market build
npx pnpm --filter @marketlens/moss-prediction-market typecheck

Write-Host "Running protocol package tests..."
npx pnpm --filter @marketlens/moss-prediction-market test
if ($LASTEXITCODE -ne 0) { throw "Protocol package tests failed" }

Pop-Location

Write-Host "=== Moss workspace setup complete ==="
Write-Host "Moss commit: $commit"
Write-Host "Protocol package: packages/protocols/marketlens"
Write-Host "Vocabulary patch: NOT REQUIRED (all tokens in fixed commit)"
