# Clears Expo launcher icon cache and reapplies app.json icons to android/ (run from repo root).
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$cache = Join-Path $repoRoot ".expo\web\cache\production\images"
if (Test-Path $cache) {
    Remove-Item -LiteralPath $cache -Recurse -Force
    Write-Host "Removed: $cache"
} else {
    Write-Host "No icon cache at $cache (ok)"
}

npx expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Next: uninstall the old app from the device, then rebuild:"
Write-Host "  npm run android:assemble-release"
Write-Host "  (or assembleDebug). Launcher icons are often cached until reinstall."
