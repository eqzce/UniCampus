param(
    [Parameter(Mandatory=$true)]
    [string]$SdkRoot
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Android SDK at: $SdkRoot" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

$cmdlineToolsDir = Join-Path $SdkRoot "cmdline-tools\latest"
$sdkManager = Join-Path $cmdlineToolsDir "bin\sdkmanager.bat"

if (-not (Test-Path $sdkManager)) {
    $zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $zipPath = Join-Path $env:TEMP "commandlinetools-win.zip"
    $extractDir = Join-Path $env:TEMP "cmdline-tools-extract"

    Write-Host "Downloading Android Command-Line Tools via curl.exe..." -ForegroundColor Yellow
    & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L -C - --retry 5 --retry-delay 2 -o $zipPath $zipUrl
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
        & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L --retry 5 -o $zipPath $zipUrl
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to download Android Command-Line Tools"
        }
    }

    Write-Host "Extracting Android Command-Line Tools..." -ForegroundColor Yellow
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
    & "C:\Windows\System32\tar.exe" -xf $zipPath -C $extractDir
    if ($LASTEXITCODE -ne 0) {
        Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineToolsDir -Parent) | Out-Null
    if (Test-Path $cmdlineToolsDir) { Remove-Item -Recurse -Force $cmdlineToolsDir }
    Move-Item -Path (Join-Path $extractDir "cmdline-tools") -Destination $cmdlineToolsDir -Force
}

# Write standard Android SDK license files directly so Gradle and sdkmanager never block on prompts
$licensesDir = Join-Path $SdkRoot "licenses"
New-Item -ItemType Directory -Force -Path $licensesDir | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path $licensesDir "android-sdk-license"),
    "`n8933bad161af4178b1185d1a37fbf41ea5269c55`nd56f5187479451eabf01fb78af6dfcb131a6481e`n24333f8a63b6825ea9c5514f83c2829b004d1fee`n",
    $utf8NoBom
)
[System.IO.File]::WriteAllText(
    (Join-Path $licensesDir "android-sdk-preview-license"),
    "`n84831b9409646a918e30573bab4c9c91346d8abd`n",
    $utf8NoBom
)

Write-Host "Installing Android SDK packages (platform-tools, platforms;android-36, build-tools;36.0.0)..." -ForegroundColor Yellow
& $sdkManager "--sdk_root=$SdkRoot" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
if ($LASTEXITCODE -ne 0) {
    throw "sdkmanager failed to install required packages."
}

Write-Host "Android SDK is ready!" -ForegroundColor Green
