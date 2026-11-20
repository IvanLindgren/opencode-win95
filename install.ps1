param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"),
  [switch]$NoGuard,
  [switch]$BlockAutoUpdate
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is required. Install Node.js (v18+) and run this script again."
  exit 1
}

if (-not (Test-Path $AsarPath)) {
  Write-Error "OpenCode Desktop app.asar not found at: $AsarPath`nPass custom path with: .\install.ps1 -AsarPath 'C:\path\to\app.asar'"
  exit 1
}

$themeSrc = Join-Path $PSScriptRoot "theme"
$themeDst = Join-Path $env:USERPROFILE ".config\opencode\win95-theme"
$stateDst = Join-Path $themeDst "state.json"
$hadState = Test-Path $stateDst
$savedState = if ($hadState) { Get-Content -Path $stateDst -Raw } else { $null }

# Stop any previous guard process before overwriting scripts
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*win95-guard.ps1*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Force -Path $themeDst | Out-Null
Copy-Item -Path (Join-Path $themeSrc "*") -Destination $themeDst -Recurse -Force

if ($hadState -and $savedState) {
  Set-Content -Path $stateDst -Value $savedState -Encoding UTF8 -NoNewline
}

# Optional: disable OpenCode auto-updater feed
if ($BlockAutoUpdate) {
  $resDir = Split-Path $AsarPath -Parent
  $activeYml = Join-Path $resDir "app-update.yml"
  $disabledYml = Join-Path $resDir "app-update.yml.disabled"
  if (Test-Path $activeYml) {
    Move-Item -Path $activeYml -Destination $disabledYml -Force
    Write-Host "Disabled auto-updater (renamed app-update.yml -> app-update.yml.disabled)." -ForegroundColor Yellow
  }
}

# Patch current app.asar and repair Desktop/Start Menu shortcuts
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $themeDst "ensure-patched.ps1") -AsarPath $AsarPath -Force -RepairShortcuts -RelaunchIfRunning

# Install auto-start update guard (survives future OpenCode updates automatically)
$startupVbs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\OpenCodeWin95Guard.vbs"
if (-not $NoGuard) {
  $guardPs1 = Join-Path $themeDst "win95-guard.ps1"
  $vbsContent = @"
Set shell = CreateObject("WScript.Shell")
cmd = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""$guardPs1"" -AsarPath ""$AsarPath"""
shell.Run cmd, 0, False
"@
  Set-Content -Path $startupVbs -Value $vbsContent -Encoding ASCII
  Start-Process -FilePath "$env:SystemRoot\System32\wscript.exe" -ArgumentList "`"$startupVbs`""
  Write-Host "Update guard installed and started (Startup: $startupVbs)." -ForegroundColor Cyan
}

Write-Host "Installed. Start OpenCode Desktop as usual." -ForegroundColor Green
