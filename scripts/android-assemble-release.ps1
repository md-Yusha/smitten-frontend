# Build app-release.apk (release JS bundle, not a debug dev client). Same JDK/SDK setup as android-assemble-debug.ps1.
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $repoRoot "android"

if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
    Write-Host "Missing android/gradlew.bat. From repo root run: npx expo prebuild --platform android"
    exit 1
}

# --- JAVA_HOME ---
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
  ${env:ProgramFiles}\Android\Android Studio\jbr
"@
    exit 1
}

$env:JAVA_HOME = $jbr
Write-Host "Using JAVA_HOME=$jbr"

# --- Android SDK ---
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
    Write-Host "Could not find Android SDK. Run: npm run android:local-props (or set ANDROID_HOME)."
    exit 1
}

& (Join-Path $PSScriptRoot "write-android-local-properties.ps1") -SdkPath $sdk
$env:ANDROID_HOME = $sdk
$env:NODE_ENV = "production"

Set-Location $androidDir

function Stop-AndroidBuildDaemons {
    Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -and (
                $_.CommandLine -like "*GradleDaemon*" -or
                $_.CommandLine -like "*kotlin-daemon*"
            )
        } |
        ForEach-Object {
            try {
                [void]$_.Terminate()
            } catch {
                Write-Host "Could not stop stale build daemon PID $($_.ProcessId): $($_.Exception.Message)"
            }
        }
}

function Remove-DirectoryWithRetry($Path) {
    for ($i = 1; $i -le 5; $i++) {
        try {
            if (Test-Path -LiteralPath $Path) {
                Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
            }
            return
        } catch {
            if ($i -eq 5) { throw }
            Start-Sleep -Milliseconds (500 * $i)
        }
    }
}

# Release APKs target physical Android devices. Clearing stale native/Kotlin
# outputs avoids locked cache failures from previous interrupted builds.
& .\gradlew.bat --stop | Out-Null
Stop-AndroidBuildDaemons
foreach ($relativePath in @(
    "app\build",
    "..\node_modules\expo-modules-core\android\build",
    "..\node_modules\lottie-react-native\android\build"
)) {
    $path = Join-Path $androidDir $relativePath
    if (Test-Path -LiteralPath $path) {
        Remove-DirectoryWithRetry $path
    }
}

& .\gradlew.bat assembleRelease `
    --no-daemon `
    --no-parallel `
    "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a" `
    "-Pkotlin.compiler.execution.strategy=in-process" `
    "-Pkotlin.incremental=false"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if ($LASTEXITCODE -eq 0) {
    $apk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
    $releaseDir = Join-Path $repoRoot "dist\android"
    $stableApk = Join-Path $releaseDir "smitten-release.apk"
    New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
    Copy-Item -LiteralPath $apk -Destination $stableApk -Force

    Write-Host ""
    Write-Host "Release APK: $apk"
    Write-Host "Saved APK copy: $stableApk"
    Write-Host "Note: Default Expo template still signs release with the debug keystore until you configure a release keystore (required for Play Store). For cloud-signed production builds use: npm run build:apk:release"
}
