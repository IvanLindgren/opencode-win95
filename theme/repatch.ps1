$ErrorActionPreference = "Stop"
$asar = Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"
$bak  = "$asar.bak"
$patcher = Join-Path $PSScriptRoot "patch-asar.mjs"

if (Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue) {
  Write-Host "Закрываю OpenCode перед патчингом..." -ForegroundColor Yellow
  Stop-Process -Name "OpenCode" -Force
  Start-Sleep -Milliseconds 800
}

# If OpenCode updated itself (app.asar newer than backup and not patched), refresh backup cleanly
if ((Test-Path $bak) -and (Test-Path $asar)) {
  $hasHook = Select-String -Path $asar -Pattern "win95-trigger-command" -Quiet -ErrorAction SilentlyContinue
  if (-not $hasHook) {
    Write-Host "Обнаружена обновлённая версия OpenCode — обновляю app.asar.bak..." -ForegroundColor Cyan
    Copy-Item -Path $asar -Destination $bak -Force
  }
}

node $patcher $asar
Write-Host "Готово! Можно запускать OpenCode." -ForegroundColor Green
