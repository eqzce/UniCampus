param(
    [switch]$Clean,
    [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Pause-IfInteractive {
    if (-not $NoPause) {
        Write-Host ""
        Read-Host "Press Enter to exit"
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  UniCampus - Android APK Builder" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

# Force IPv4 & UTF-8 in Java, and clear GRADLE_OPTS to avoid PowerShell/cmd argument splitting
$env:JAVA_TOOL_OPTIONS = "-Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8"
$env:GRADLE_OPTS = ""

# 1. Configure Node.js & Java 17
$vsNodePath = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
if (Test-Path (Join-Path $vsNodePath "node.exe")) {
    $env:Path = "$vsNodePath;$env:Path"
}

$temurinPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
if (Test-Path (Join-Path $temurinPath "bin\java.exe")) {
    $env:JAVA_HOME = $temurinPath
    $env:Path = "$temurinPath\bin;$env:Path"
}

Write-Host "[1/5] Checking Java JDK..." -ForegroundColor Yellow
cmd.exe /c "java -version 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Java JDK 17+ not found." -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

# 2. Install Capacitor packages if needed
if (-not (Test-Path (Join-Path $projectRoot "node_modules\@capacitor\core")) -or -not (Test-Path (Join-Path $projectRoot "node_modules\@capacitor\android"))) {
    Write-Host ""
    Write-Host "[2/5] Installing Capacitor (@capacitor/core, @capacitor/cli, @capacitor/android)..." -ForegroundColor Yellow
    & npm.cmd install @capacitor/core @capacitor/cli @capacitor/android --no-save
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Capacitor packages." -ForegroundColor Red
        Pause-IfInteractive
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[2/5] Capacitor packages already installed." -ForegroundColor Green
}

# Ensure @capacitor/cli allows Node 20 LTS as well as Node 22+
$capCliPkg = Join-Path $projectRoot "node_modules\@capacitor\cli\package.json"
if (Test-Path $capCliPkg) {
    $capContent = [System.IO.File]::ReadAllText($capCliPkg) -replace '">=22\.0\.0"', '">=20.0.0"'
    [System.IO.File]::WriteAllText($capCliPkg, $capContent, $utf8NoBom)
}

# 3. Build web application
Write-Host ""
Write-Host "[3/5] Building web bundle (npm run build)..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Web build failed." -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

# 4. Initialize or sync Capacitor Android project
Write-Host ""
$androidDir = Join-Path $projectRoot "android"
if ($Clean -and (Test-Path $androidDir)) {
    Write-Host "[4/5] Removing old Android folder for a clean rebuild..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $androidDir
}

if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
    if (Test-Path $androidDir) {
        Remove-Item -Recurse -Force $androidDir
    }
    Write-Host "[4/5] Creating fresh Android project (npx cap add android)..." -ForegroundColor Yellow
    & npx.cmd cap add android
} else {
    Write-Host "[4/5] Syncing Android project (npx cap sync android)..." -ForegroundColor Yellow
    & npx.cmd cap sync android
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor Android setup failed." -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

# Ensure Gradle 8.14.3 distribution is cached locally to avoid Windows Schannel SSL revocation issues
$gradleZipPath = Join-Path $env:TEMP "gradle-8.14.3-bin.zip"
if (-not (Test-Path $gradleZipPath) -or (Get-Item $gradleZipPath).Length -lt 100000000) {
    Write-Host ""
    Write-Host "[4.1/5] Downloading Gradle 8.14.3..." -ForegroundColor Yellow
    & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L -C - --retry 5 --retry-delay 2 -o $gradleZipPath "https://services.gradle.org/distributions/gradle-8.14.3-bin.zip"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $gradleZipPath) -or (Get-Item $gradleZipPath).Length -lt 100000000) {
        Remove-Item -Force $gradleZipPath -ErrorAction SilentlyContinue
        & "C:\Windows\System32\curl.exe" --ssl-no-revoke -L --retry 5 -o $gradleZipPath "https://github.com/gradle/gradle-distributions/releases/download/v8.14.3/gradle-8.14.3-bin.zip"
    }
}

$wrapperPropsPath = Join-Path $androidDir "gradle\wrapper\gradle-wrapper.properties"
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

# Write all JVM and Gradle HTTP timeout properties cleanly into gradle.properties (no CLI -D flags needed!)
$gradlePropsPath = Join-Path $androidDir "gradle.properties"
$gradlePropsContent = @(
    "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -Djava.net.preferIPv4Stack=true",
    "systemProp.org.gradle.internal.http.connectionTimeout=180000",
    "systemProp.org.gradle.internal.http.socketTimeout=180000",
    "android.useAndroidX=true"
) -join "`r`n"
[System.IO.File]::WriteAllText($gradlePropsPath, $gradlePropsContent, $utf8NoBom)

# Patch Java version to VERSION_17 and ensure no UTF-8 BOM in Gradle scripts
$gradleFilesToPatch = @(
    (Join-Path $androidDir "app\capacitor.build.gradle"),
    (Join-Path $androidDir "capacitor-cordova-android-plugins\build.gradle"),
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

$hasPlatform = Test-Path (Join-Path $sdkRoot "platforms\android-36")
$hasBuildTools = Test-Path (Join-Path $sdkRoot "build-tools\36.0.0")
if (-not $hasPlatform -or -not $hasBuildTools) {
    Write-Host ""
    Write-Host "[4.5/5] Setting up Android SDK packages..." -ForegroundColor Yellow
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup-android-sdk.ps1") -SdkRoot $sdkRoot
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to setup Android SDK." -ForegroundColor Red
        Pause-IfInteractive
        exit 1
    }
}

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$escapedSdk = $sdkRoot.Replace("\", "\\").Replace(":", "\:")
[System.IO.File]::WriteAllText((Join-Path $androidDir "local.properties"), "sdk.dir=$escapedSdk`r`n", $utf8NoBom)

# 6. Build APK with Gradle
Write-Host ""
Write-Host "[5/5] Compiling UniCampus.apk with Gradle (assembleDebug)..." -ForegroundColor Yellow
Push-Location $androidDir
& .\gradlew.bat assembleDebug
$gradleExit = $LASTEXITCODE
Pop-Location

# Restore portable HTTPS distributionUrl in gradle-wrapper.properties so GitHub Actions (Linux) works cleanly
if (Test-Path $wrapperPropsPath) {
    $portableWrapperContent = @(
        "distributionBase=GRADLE_USER_HOME",
        "distributionPath=wrapper/dists",
        "distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip",
        "networkTimeout=180000",
        "validateDistributionUrl=false",
        "zipStoreBase=GRADLE_USER_HOME",
        "zipStorePath=wrapper/dists"
    ) -join "`r`n"
    [System.IO.File]::WriteAllText($wrapperPropsPath, $portableWrapperContent, $utf8NoBom)
}

if ($gradleExit -ne 0) {
    Write-Host "[ERROR] Gradle APK build failed." -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

$apkSource = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$apkDest = Join-Path $projectRoot "UniCampus.apk"

if (Test-Path $apkSource) {
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    $apkSizeMB = [Math]::Round((Get-Item $apkDest).Length / 1MB, 2)
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! APK created ($apkSizeMB MB):" -ForegroundColor Green
    Write-Host "  $apkDest" -ForegroundColor White
    Write-Host "  Send UniCampus.apk to your phone (e.g. via Telegram)" -ForegroundColor Green
    Write-Host "  and tap it to install!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] APK file was not found at $apkSource" -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

Pause-IfInteractive
