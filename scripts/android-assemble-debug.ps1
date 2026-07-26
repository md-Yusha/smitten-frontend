# Build app-debug.apk: finds JDK (JAVA_HOME / Android Studio JBR) and Android SDK (writes android/local.properties).
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $repoRoot "android"

if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
    Write-Host "Missing android/gradlew.bat. From repo root run: npx expo prebuild --platform android"
    exit 1
}

# --- JAVA_HOME (JDK root, not ...\bin\java.exe) ---
$jbr = $null
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $jbr = $env:JAVA_HOME.TrimEnd('\', '/')
}

if (-not $jbr) {
    $javaCandidates = @(
        "E:\Android\Android Studio\jbr"
        "$env:LOCALAPPDATA\Android\Android Studio\jbr"
        "${env:ProgramFiles}\Android\Android Studio\jbr"
        "${env:ProgramFiles(x86)}\Android\Android Studio\jbr"
        "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr"
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
    )
    foreach ($c in $javaCandidates) {
        if (Test-Path (Join-Path $c "bin\java.exe")) {
            $jbr = $c
            break
        }
    }
}

if (-not $jbr) {
    Write-Host @"
Could not find Java. Set JAVA_HOME to your JDK folder (contains bin\java.exe), e.g.:
  E:\Android\Android Studio\jbr
NOT the path to java.exe itself.
"@
    exit 1
}

$env:JAVA_HOME = $jbr
Write-Host "Using JAVA_HOME=$jbr"

# --- Android SDK -> local.properties ---
$sdk = $null
foreach ($k in @("ANDROID_HOME", "ANDROID_SDK_ROOT")) {
    $v = $null
    foreach ($scope in @("Process", "User", "Machine")) {
        $v = [Environment]::GetEnvironmentVariable($k, $scope)
        if (-not [string]::IsNullOrWhiteSpace($v)) { break }
    }
    if (-not [string]::IsNullOrWhiteSpace($v)) {
        $v = $v.TrimEnd('\', '/')
        if (Test-Path (Join-Path $v "platform-tools")) {
            $sdk = $v
            break
        }
    }
}

if (-not $sdk) {
    foreach ($reg in @('HKLM:\SOFTWARE\Android SDK Tools', 'HKLM:\SOFTWARE\WOW6432Node\Android SDK Tools', 'HKCU:\SOFTWARE\Android SDK Tools')) {
        $p = (Get-ItemProperty -LiteralPath $reg -ErrorAction SilentlyContinue).Path
        if ($p) {
            $p = $p.TrimEnd('\', '/')
            if (Test-Path (Join-Path $p "platform-tools")) { $sdk = $p; break }
        }
    }
}

if (-not $sdk) {
    $sdkCandidates = @(
        (Join-Path $env:LOCALAPPDATA "Android\Sdk")
        (Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk")
        "E:\sdk"
        "E:\Android\Sdk"
        "D:\Android\Sdk"
    )
    foreach ($c in $sdkCandidates) {
        if ($c -and (Test-Path (Join-Path $c "platform-tools"))) {
            $sdk = $c
            break
        }
    }
}

if (-not $sdk) {
    Write-Host @"
Could not find Android SDK (need a folder that contains platform-tools).

Run this to see paths Gradle will accept on your PC:
  npm run android:find-sdk

Then either set ANDROID_HOME to that folder, or run:
  npm run android:local-props
  (or pass your path: powershell -File scripts/write-android-local-properties.ps1 -SdkPath 'E:/Android/Sdk')

In Android Studio: Settings -> Languages & frameworks -> Android SDK -> copy ""Android SDK location"".
"@
    exit 1
}

& (Join-Path $PSScriptRoot "write-android-local-properties.ps1") -SdkPath $sdk
$env:ANDROID_HOME = $sdk
$env:NODE_ENV = "production"

Set-Location $androidDir
& .\gradlew.bat assembleDebug --no-daemon

if ($LASTEXITCODE -eq 0) {
    $apk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
    Write-Host ""
    Write-Host "APK: $apk"
}
