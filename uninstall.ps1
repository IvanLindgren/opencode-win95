param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"),
  [switch]$RemoveFiles
)

$ErrorActionPreference = "Stop"
$bakPath = "$AsarPath.bak"

if (-not (Test-Path $bakPath)) {
  Write-Error "Backup not found: $bakPath"
  exit 1
}

if (Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue) {
  Write-Host "Closing OpenCode Desktop..." -ForegroundColor Yellow
  Stop-Process -Name "OpenCode" -Force
  Start-Sleep -Milliseconds 800
}

Copy-Item -Path $bakPath -Destination $AsarPath -Force
Write-Host "Restored original app.asar from backup." -ForegroundColor Green

if ($RemoveFiles) {
  $themeDst = Join-Path $env:USERPROFILE ".config\opencode\win95-theme"
  if (Test-Path $themeDst) {
    Remove-Item -Path $themeDst -Recurse -Force
    Write-Host "Removed $themeDst" -ForegroundColor Green
  }
}
