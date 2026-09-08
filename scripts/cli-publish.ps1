<#
.SYNOPSIS
Publish @involvex/ionic-everywhere to npm with version bump, changelog, tag and push.
#>
param(
    [ValidateSet('patch', 'minor', 'major', 'manual')]
    [string]$Bump = 'patch',
    [switch]$SkipTests,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$packageDir = Join-Path $root 'packages/ionic-everywhere'
$packageJsonPath = Join-Path $packageDir 'package.json'
$changelogScript = Join-Path $root 'scripts/generate-changelog.mjs'

function Write-Step([string]$text) {
    Write-Host "`n==> $text" -ForegroundColor Cyan
}

function Test-Command([string]$cmd) {
    try { $null = Get-Command $cmd -ErrorAction Stop; $true } catch { $false }
}

function Invoke-Command([string]$cmd) {
    Write-Host "+ $cmd"
    if ($DryRun -and $cmd -match '^(git push|bun publish|npm publish)') {
        Write-Host "[dry-run] Skipping: $cmd"
        return 0
    }
    $psi = [System.Diagnostics.ProcessStartContext]::new('cmd', "/c `"$cmd`"")
    # Fallback to direct call for simple commands
    $psi.FileName = 'cmd'
    $psi.Arguments = "/c `"$cmd`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.WaitForExit()
    return $p.ExitCode
}

Write-Step 'Checking preconditions'

if (-not (Test-Command 'git')) { throw 'git is required and not on PATH' }
if (-not (Test-Command 'bun')) { throw 'bun is required and not on PATH' }
if (-not (Test-Command 'npm')) { throw 'npm is required and not on PATH' }

Push-Location $root
try {
    $status = git status --porcelain
    if ($status) {
        throw "Working tree is not clean. Commit or stash changes first:`n$status"
    }

    if (-not $SkipTests) {
        Write-Step 'Running verify (format + lint + tests)'
        bun run verify
        if ($LASTEXITCODE -ne 0) { throw 'verify failed' }
    }

    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $currentVersion = $packageJson.version
    Write-Host "Current local version: $currentVersion"

    Write-Step 'Checking registry for existing version'
    $registryVersion = ''
    try {
        $registryVersion = npm view @involvex/ionic-everywhere version 2>$null
        $registryVersion = $registryVersion.Trim()
    } catch {
        $registryVersion = ''
    }
    Write-Host "Registry version: $(if ($registryVersion) { $registryVersion } else { '<not published yet>' })"

    if ($registryVersion -and [version]$currentVersion -le [version]$registryVersion) {
        if ($Bump -eq 'manual') {
            throw "Local version $currentVersion is <= registry $registryVersion. Use a higher version or run with -Bump patch|minor|major."
        }

        $bumpMap = @{ patch = 0; minor = 1; major = 2 }
        $segment = $bumpMap[$Bump]
        $parts = [version]$currentVersion
        $newVersion = "$($parts.Major).$($parts.Minor).$($parts.Build)"
        switch ($segment) {
            0 { $newVersion = "$($parts.Major).$($parts.Minor).$($parts.Build + 1)" }
            1 { $newVersion = "$($parts.Major).$($parts.Minor + 1).0" }
            2 { $newVersion = "$($parts.Major + 1).0.0" }
        }

        Write-Step "Bumping version: $currentVersion -> $newVersion ($Bump)"
        $rootPkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
        $rootPkg.version = $newVersion
        $rootPkg | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $root 'package.json') -Encoding utf8
        $packageJson.version = $newVersion
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding utf8
        bun run build
        if ($LASTEXITCODE -ne 0) { throw 'build failed after version bump' }
    } else {
        $newVersion = $currentVersion
        Write-Host "Local version $currentVersion is newer than registry $registryVersion. Keeping version."
    }

    Write-Step "Generating changelog for $newVersion"
    if (Test-Path $changelogScript) {
        bun $changelogScript
        if ($LASTEXITCODE -ne 0) { throw 'changelog generation failed' }
    } else {
        Write-Warning "Changelog script not found at $changelogScript; skipping."
    }

    Write-Step 'Building package'
    bun run build
    if ($LASTEXITCODE -ne 0) { throw 'build failed' }

    Write-Step 'Validating publish contents (dry-run)'
    Push-Location $packageDir
    try {
        npm pack --dry-run
        if ($LASTEXITCODE -ne 0) { throw 'npm pack --dry-run failed' }
    } finally {
        Pop-Location
    }

    if ($DryRun) {
        Write-Host "`nDry-run mode: stopping before publish. Would publish v$newVersion."
        Pop-Location
        exit 0
    }

    $commitMessage = "chore(release): v$newVersion"
    Write-Step "Committing release ($commitMessage)"
    git add package.json
    git add (Join-Path $packageDir 'package.json')
    if (Test-Path (Join-Path $packageDir 'CHANGELOG.md')) {
        git add (Join-Path $packageDir 'CHANGELOG.md')
    }
    if (Test-Path (Join-Path $packageDir 'README.md')) {
        git add (Join-Path $packageDir 'README.md')
    }
    if (Test-Path (Join-Path $packageDir 'LICENSE')) {
        git add (Join-Path $packageDir 'LICENSE')
    }
    git commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }

    Write-Step "Tagging v$newVersion"
    git tag "v$newVersion"
    if ($LASTEXITCODE -ne 0) { throw 'git tag failed' }

    Write-Step 'Publishing to npm'
    Push-Location $packageDir
    try {
        bun publish --access public
        if ($LASTEXITCODE -ne 0) { throw 'bun publish failed' }
    } finally {
        Pop-Location
    }

    Write-Step 'Pushing commit and tag'
    git push
    if ($LASTEXITCODE -ne 0) { throw 'git push failed' }
    git push --tags
    if ($LASTEXITCODE -ne 0) { throw 'git push --tags failed' }

    Write-Host "`nPublished @involvex/ionic-everywhere@$newVersion successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
