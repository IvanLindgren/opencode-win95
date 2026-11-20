param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar")
)

$ErrorActionPreference = "Stop"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "ensure-patched.ps1") -AsarPath $AsarPath -Force -RepairShortcuts -RelaunchIfRunning
Write-Host "Done. Win95 theme applied." -ForegroundColor Green
