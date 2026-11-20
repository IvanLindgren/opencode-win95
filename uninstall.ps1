param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"),
  [switch]$RemoveFiles
)

$ErrorActionPreference = "Stop"
$themeDst = Join-Path $env:USERPROFILE ".config\opencode\win95-theme"
$restoreScript = Join-Path $themeDst "restore.ps1"

if (Test-Path $restoreScript) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $restoreScript -AsarPath $AsarPath
} else {
  $bakPath = "$AsarPath.bak"
  if (-not (Test-Path $bakPath)) {
    Write-Error "Backup not found: $bakPath"
    exit 1
  }
  if (Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue) {
    Stop-Process -Name "OpenCode" -Force
    Start-Sleep -Milliseconds 800
  }
  Copy-Item -Path $bakPath -Destination $AsarPath -Force
  Write-Host "Restored original app.asar from backup." -ForegroundColor Green
}

if ($RemoveFiles -and (Test-Path $themeDst)) {
  Remove-Item -Path $themeDst -Recurse -Force
  Write-Host "Removed $themeDst" -ForegroundColor Green
}
