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

    Write-Host "Downloading Android Command-Line Tools via curl.exe (resuming if partially downloaded)..." -ForegroundColor Yellow
    & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L -C - --retry 5 --retry-delay 2 -o $zipPath $zipUrl
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Retrying fresh download..." -ForegroundColor Yellow
        Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
        & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L --retry 5 -o $zipPath $zipUrl
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to download Android Command-Line Tools"
        }
    }

    Write-Host "Extracting Android Command-Line Tools via tar.exe..." -ForegroundColor Yellow
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

Write-Host "Accepting Android SDK licenses and installing platform-tools, android-36, build-tools;36.0.0..." -ForegroundColor Yellow
$yesFile = Join-Path $env:TEMP "android_yes.txt"
Set-Content -Path $yesFile -Value (@("y") * 50 -join "`r`n") -Encoding ASCII

cmd.exe /c "`"$sdkManager`" --sdk_root=`"$SdkRoot`" --licenses < `"$yesFile`""
cmd.exe /c "`"$sdkManager`" --sdk_root=`"$SdkRoot`" `"platform-tools`" `"platforms;android-36`" `"build-tools;36.0.0`" < `"$yesFile`""

Write-Host "Android SDK successfully installed!" -ForegroundColor Green
