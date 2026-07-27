$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$androidRoot = Join-Path $root "android"
$sdk = $env:ANDROID_HOME
if (-not $sdk) {
  $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
if (-not (Test-Path -LiteralPath $sdk)) {
  throw "Android SDK not found. Set ANDROID_HOME or install Android Studio."
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

$gradleCommand = Get-Command gradle -ErrorAction SilentlyContinue
if ($gradleCommand) {
  $gradle = $gradleCommand.Source
} else {
  $gradle = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE ".gradle\wrapper\dists") -Recurse -Filter "gradle.bat" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $gradle) {
  throw "Gradle not found. Install Gradle or open the android folder in Android Studio."
}

Push-Location $androidRoot
try {
  & $gradle --no-daemon assembleDebug
} finally {
  Pop-Location
}

$apk = Join-Path $androidRoot "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path -LiteralPath $apk)) {
  throw "Android build finished but APK was not found at $apk"
}

$dist = Join-Path $root "dist\android"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$target = Join-Path $dist "SydneyCourseFinder-debug.apk"
Copy-Item -LiteralPath $apk -Destination $target -Force
Write-Host "Debug APK ready: $target"
