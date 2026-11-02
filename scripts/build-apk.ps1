$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  UniCampus - Android APK Automated Builder" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

# Force IPv4 & UTF-8 in Java to prevent SocketTimeoutException and BOM issues on Windows
$env:JAVA_TOOL_OPTIONS = "-Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8"
$env:GRADLE_OPTS = "-Dorg.gradle.internal.http.connectionTimeout=180000 -Dorg.gradle.internal.http.socketTimeout=180000 -Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8"

# 1. Configure Java 17
$temurinPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
if (Test-Path (Join-Path $temurinPath "bin\java.exe")) {
    $env:JAVA_HOME = $temurinPath
    $env:Path = "$temurinPath\bin;$env:Path"
}

Write-Host "[1/5] Checking Java JDK..." -ForegroundColor Yellow
& java -version
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Java JDK 17+ not found." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 2. Install Capacitor packages if needed
if (-not (Test-Path (Join-Path $projectRoot "node_modules\@capacitor\core")) -or -not (Test-Path (Join-Path $projectRoot "node_modules\@capacitor\android"))) {
    Write-Host ""
    Write-Host "[2/5] Installing Capacitor for Android (@capacitor/core, @capacitor/cli, @capacitor/android)..." -ForegroundColor Yellow
    & npm.cmd install @capacitor/core @capacitor/cli @capacitor/android --no-save
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Capacitor packages via npm." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[2/5] Capacitor packages already installed." -ForegroundColor Green
}

# 3. Build web application
Write-Host ""
Write-Host "[3/5] Building web bundle (npm run build)..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Web build failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 4. Initialize or sync Capacitor Android project
Write-Host ""
if (-not (Test-Path (Join-Path $projectRoot "android\gradlew.bat"))) {
    if (Test-Path (Join-Path $projectRoot "android")) {
        Remove-Item -Recurse -Force (Join-Path $projectRoot "android")
    }
    Write-Host "[4/5] Creating Android project (npx cap add android)..." -ForegroundColor Yellow
    & npx.cmd cap add android
} else {
    Write-Host "[4/5] Syncing Android project (npx cap sync android)..." -ForegroundColor Yellow
    & npx.cmd cap sync android
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor Android setup failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Pre-download Gradle 8.14.3 via curl.exe with --ssl-no-revoke (fixes CRYPT_E_REVOCATION_OFFLINE on Windows!)
$gradleZipPath = Join-Path $env:TEMP "gradle-8.14.3-bin.zip"
if (-not (Test-Path $gradleZipPath) -or (Get-Item $gradleZipPath).Length -lt 100000000) {
    Write-Host ""
    Write-Host "[4.2/5] Downloading Gradle 8.14.3 via curl.exe (--ssl-no-revoke)..." -ForegroundColor Yellow
    & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L -C - --retry 5 --retry-delay 2 -o $gradleZipPath "https://services.gradle.org/distributions/gradle-8.14.3-bin.zip"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $gradleZipPath) -or (Get-Item $gradleZipPath).Length -lt 100000000) {
        Write-Host "Trying GitHub mirror for Gradle 8.14.3..." -ForegroundColor Yellow
        Remove-Item -Force $gradleZipPath -ErrorAction SilentlyContinue
        & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L --retry 5 -o $gradleZipPath "https://github.com/gradle/gradle-distributions/releases/download/v8.14.3/gradle-8.14.3-bin.zip"
    }
}

$wrapperPropsPath = Join-Path $projectRoot "android\gradle\wrapper\gradle-wrapper.properties"
if (Test-Path $wrapperPropsPath) {
    $fileUri = "file\:///" + ($gradleZipPath.Replace("\", "/").Replace(":", "\:"))
    $wrapperContent = @(
        "distributionBase=GRADLE_USER_HOME",
        "distributionPath=wrapper/dists",
        "distributionUrl=$fileUri",
        "networkTimeout=180000",
        "validateDistributionUrl=false",
        "zipStoreBase=GRADLE_USER_HOME",
        "zipStorePath=wrapper/dists"
    ) -join "`r`n"
    [System.IO.File]::WriteAllText($wrapperPropsPath, $wrapperContent, $utf8NoBom)
}

# Ensure gradle.properties forces UTF-8 and IPv4
$gradlePropsPath = Join-Path $projectRoot "android\gradle.properties"
$gradlePropsContent = @(
    "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -Djava.net.preferIPv4Stack=true",
    "android.useAndroidX=true"
) -join "`r`n"
[System.IO.File]::WriteAllText($gradlePropsPath, $gradlePropsContent, $utf8NoBom)

# Ensure Gradle files are compatible with JDK 17 and written WITHOUT UTF-8 BOM!
$gradleFilesToPatch = @(
    (Join-Path $projectRoot "android\app\capacitor.build.gradle"),
    (Join-Path $projectRoot "android\capacitor-cordova-android-plugins\build.gradle"),
    (Join-Path $projectRoot "node_modules\@capacitor\android\capacitor\build.gradle")
)
foreach ($gf in $gradleFilesToPatch) {
    if (Test-Path $gf) {
        $content = [System.IO.File]::ReadAllText($gf).TrimStart([char]0xFEFF)
        $content = $content -replace "VERSION_21", "VERSION_17"
        [System.IO.File]::WriteAllText($gf, $content, $utf8NoBom)
    }
}

# 5. Setup Android SDK if needed
$sdkRoot = $env:ANDROID_HOME
if ([string]::IsNullOrWhiteSpace($sdkRoot)) {
    if (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
        $sdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
    } else {
        $sdkRoot = Join-Path $projectRoot ".android-sdk"
    }
}

if (-not (Test-Path (Join-Path $sdkRoot "licenses\android-sdk-license"))) {
    Write-Host ""
    Write-Host "[4.5/5] Setting up Android SDK Command-Line Tools..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup-android-sdk.ps1") -SdkRoot $sdkRoot
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to setup Android SDK." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$escapedSdk = $sdkRoot.Replace("\", "\\").Replace(":", "\:")
[System.IO.File]::WriteAllText((Join-Path $projectRoot "android\local.properties"), "sdk.dir=$escapedSdk`r`n", $utf8NoBom)

# 6. Build APK with Gradle
Write-Host ""
Write-Host "[5/5] Compiling UniCampus.apk with Gradle (assembleDebug)..." -ForegroundColor Yellow
Push-Location (Join-Path $projectRoot "android")
& .\gradlew.bat assembleDebug -Dorg.gradle.internal.http.connectionTimeout=180000 -Dorg.gradle.internal.http.socketTimeout=180000 -Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8
$gradleExit = $LASTEXITCODE
Pop-Location

if ($gradleExit -ne 0) {
    Write-Host "[ERROR] Gradle APK build failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$apkSource = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = Join-Path $projectRoot "UniCampus.apk"

if (Test-Path $apkSource) {
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! APK created at:" -ForegroundColor Green
    Write-Host "  $apkDest" -ForegroundColor White
    Write-Host "  Send UniCampus.apk to your phone (e.g. via Telegram)" -ForegroundColor Green
    Write-Host "  and tap it to install!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] APK file was not found at $apkSource" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close"
