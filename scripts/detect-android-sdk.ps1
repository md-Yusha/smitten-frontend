# Print Android SDK paths (run from repo: `npm run android:find-sdk`)
$ErrorActionPreference = "Stop"

function TryAdd([string]$path, [string]$source, [System.Collections.Generic.List[object]]$list) {
  if ([string]::IsNullOrWhiteSpace($path)) { return }
  $p = $path.TrimEnd('\','/')
  if (Test-Path (Join-Path $p "platform-tools")) {
    $list.Add(@{ Source = $source; Path = $p })
  }
}

$found = New-Object 'System.Collections.Generic.List[object]'

# Environment variables
$scopes = @("Process","User","Machine")
$keys = @("ANDROID_HOME","ANDROID_SDK_ROOT")
foreach ($scope in $scopes) {
  foreach ($k in $keys) {
    $v = [Environment]::GetEnvironmentVariable($k, $scope)
    TryAdd -path $v -source "$k ($scope)" -list $found
  }
}

# Common SDK locations
$common = @(
  (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
  (Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk"),
  "E:\Android\Sdk",
  "D:\Android\Sdk"
)
foreach ($c in $common) {
  TryAdd -path $c -source "Common path" -list $found
}

if ($found.Count -eq 0) {
  Write-Host "No Android SDK found (missing folder with platform-tools)."
  Write-Host "Open Android Studio -> Settings -> Android SDK and copy the Android SDK location."
  exit 1
}

$seen = @{}
foreach ($f in $found) {
  $path = $f.Path
  if ($seen.ContainsKey($path)) { continue }
  $seen[$path] = $true
  $fwd = $path -replace "\\","/"
  Write-Host "OK  [$($f.Source)]"
  Write-Host "    $fwd"
}

