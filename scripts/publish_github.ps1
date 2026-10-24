<#
.SYNOPSIS
Publish the checked-out CyberGuard source to an EXISTING empty GitHub repository.
.DESCRIPTION
Requires Git, GitHub authentication, and a repository already created on GitHub.
Never runs git push --force, never handles access tokens, never overwrites a remote.
#>
param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('^[A-Za-z0-9-]+$')]
    [string]$Username,
    [ValidatePattern('^[A-Za-z0-9_.-]+$')]
    [string]$RepoName = 'CyberGuard'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed. Get Git from https://git-scm.com/.'
}
if (-not (Test-Path 'README.md') -or -not (Test-Path 'app.py')) {
    throw 'Run this script from the unpacked CyberGuard project (README.md and app.py must exist).'
}
$url = "https://github.com/$Username/$RepoName.git"
Write-Host "Publishing source from: $root" -ForegroundColor Cyan
Write-Host "Destination: $url" -ForegroundColor Cyan
if (-not (Test-Path '.git')) {
    & git init
    if ($LASTEXITCODE -ne 0) { throw 'git init failed' }
}
$existing = & git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($existing.Trim() -ne $url) {
        throw "Existing origin is '$existing', not '$url'. Review manually; refusing to overwrite it."
    }
} else {
    & git remote add origin $url
    if ($LASTEXITCODE -ne 0) { throw 'Cannot set origin remote' }
}
& git add .
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
& git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -eq 1)
if ($hasChanges) {
    & git commit -m 'Initial release: CyberGuard Pro v2.0'
    if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Check git user.name and user.email.' }
}
& git branch -M main
if ($LASTEXITCODE -ne 0) { throw 'Cannot select main branch' }
Write-Host 'Pushing branch main. Git may ask you to sign in to GitHub.' -ForegroundColor Yellow
& git push -u origin main
if ($LASTEXITCODE -ne 0) {
    throw 'Push failed. Check the repository exists, GitHub login/permissions, and remote history. No force push was attempted.'
}
Write-Host "Published: https://github.com/$Username/$RepoName" -ForegroundColor Green
