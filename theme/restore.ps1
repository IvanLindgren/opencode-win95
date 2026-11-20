param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar")
)

$ErrorActionPreference = "Stop"
$bakPath = "$AsarPath.bak"
$exePath = Join-Path (Split-Path (Split-Path $AsarPath -Parent) -Parent) "OpenCode.exe"
$startupVbs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\OpenCodeWin95Guard.vbs"

# 1. Remove startup guard and stop running guard process
if (Test-Path $startupVbs) {
  Remove-Item -Path $startupVbs -Force -ErrorAction SilentlyContinue
}
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*win95-guard.ps1*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# 2. Restore original OpenCode shortcuts
try {
  $wsh = New-Object -ComObject WScript.Shell
  $targets = @(
    (Join-Path ([Environment]::GetFolderPath("Desktop")) "OpenCode.lnk"),
    (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\OpenCode.lnk")
  )
  foreach ($lnkPath in $targets) {
    if ((Test-Path $lnkPath) -and (Test-Path $exePath)) {
      $lnk = $wsh.CreateShortcut($lnkPath)
      if ($lnk.Arguments -like '*launch-win95.vbs*') {
        $lnk.TargetPath = $exePath
        $lnk.Arguments = ""
        $lnk.WorkingDirectory = (Split-Path $exePath -Parent)
        $lnk.IconLocation = "$exePath,0"
        $lnk.Save()
      }
    }
  }
} catch {}

# 3. Restore app-update.yml if disabled
$resDir = Split-Path $AsarPath -Parent
$disabledYml = Join-Path $resDir "app-update.yml.disabled"
$activeYml = Join-Path $resDir "app-update.yml"
if ((Test-Path $disabledYml) -and (-not (Test-Path $activeYml))) {
  Move-Item -Path $disabledYml -Destination $activeYml -Force
}

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
Write-Host "Restored original OpenCode Desktop from $bakPath." -ForegroundColor Green
