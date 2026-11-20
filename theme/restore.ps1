$ErrorActionPreference = "Stop"
$asar = Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"
$bak  = "$asar.bak"

if (-not (Test-Path $bak)) {
  Write-Error "Файл бэкапа не найден: $bak"
  exit 1
}

if (Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue) {
  Write-Host "Закрываю OpenCode перед восстановлением..." -ForegroundColor Yellow
  Stop-Process -Name "OpenCode" -Force
  Start-Sleep -Milliseconds 800
}

Copy-Item -Path $bak -Destination $asar -Force
Write-Host "Оригинальный OpenCode Desktop полностью восстановлен из $bak!" -ForegroundColor Green
