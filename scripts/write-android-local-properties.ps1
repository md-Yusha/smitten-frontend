# Writes android/local.properties using first detected SDK (or first arg).
param([string]$SdkPath = "")

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $repoRoot "android"
$outFile = Join-Path $androidDir "local.properties"

if (-not (Test-Path $androidDir)) {
    Write-Host "Missing android folder. Run: npx expo prebuild --platform android"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($SdkPath)) {
    $candidates = @()
    foreach ($scope in @("Process", "User", "Machine")) {
        foreach ($k in @("ANDROID_HOME", "ANDROID_SDK_ROOT")) {
            $v = [Environment]::GetEnvironmentVariable($k, $scope)
            if ($v) { $candidates += $v.TrimEnd('\', '/') }
        }
    }
    foreach ($reg in @('HKLM:\SOFTWARE\Android SDK Tools', 'HKLM:\SOFTWARE\WOW6432Node\Android SDK Tools', 'HKCU:\SOFTWARE\Android SDK Tools')) {
        $p = (Get-ItemProperty -LiteralPath $reg -ErrorAction SilentlyContinue).Path
        if ($p) { $candidates += $p.TrimEnd('\', '/') }
    }
    $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk")
    $candidates += "E:\Android\Sdk"
    $candidates += "D:\Android\Sdk"

    $sdk = $null
    foreach ($c in $candidates) {
        if ($c -and (Test-Path (Join-Path $c "platform-tools"))) { $sdk = $c; break }
    }
    if (-not $sdk) {
        Write-Host "Could not detect SDK. Pass path explicitly:"
        Write-Host "  powershell -File scripts/write-android-local-properties.ps1 -SdkPath 'E:/Android/Sdk'"
        exit 1
    }
    $SdkPath = $sdk
}

$SdkPath = $SdkPath.TrimEnd('\', '/')
if (-not (Test-Path (Join-Path $SdkPath "platform-tools"))) {
    Write-Host "Not a valid Android SDK (missing platform-tools): $SdkPath"
    exit 1
}

$line = "sdk.dir=" + ($SdkPath -replace "\\", "/")
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = "# Android SDK (Android Studio -> Settings -> Android SDK -> Android SDK location)`r`n$line"
[System.IO.File]::WriteAllText($outFile, $content, $utf8NoBom)
Write-Host "Wrote $outFile"
Write-Host $line
