param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar")
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

New-Item -ItemType Directory -Force -Path $themeDst | Out-Null
Copy-Item -Path (Join-Path $themeSrc "*") -Destination $themeDst -Recurse -Force

if ($hadState -and $savedState) {
  Set-Content -Path $stateDst -Value $savedState -Encoding UTF8 -NoNewline
}

if (Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue) {
  Write-Host "Closing OpenCode Desktop..." -ForegroundColor Yellow
  Stop-Process -Name "OpenCode" -Force
  Start-Sleep -Milliseconds 800
}

$bakPath = "$AsarPath.bak"
if (Test-Path $bakPath) {
  $hasHook = Select-String -Path $AsarPath -Pattern "win95-trigger-command" -Quiet -ErrorAction SilentlyContinue
  if (-not $hasHook) {
    Write-Host "Detected updated OpenCode Desktop, refreshing backup..." -ForegroundColor Cyan
    Copy-Item -Path $AsarPath -Destination $bakPath -Force
  }
}

node (Join-Path $themeDst "patch-asar.mjs") $AsarPath
Write-Host "Installed. Start OpenCode Desktop as usual." -ForegroundColor Green
