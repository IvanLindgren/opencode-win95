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

if (-not (Test-Path -LiteralPath $AsarPath -PathType Leaf)) {
  Write-Error "OpenCode Desktop app.asar not found at: $AsarPath`nPass custom path with: .\install.ps1 -AsarPath 'C:\path\to\app.asar'"
  exit 1
}
$AsarPath = (Resolve-Path -LiteralPath $AsarPath).ProviderPath

$themeSrc = Join-Path $PSScriptRoot "theme"
$themeDst = Join-Path $env:USERPROFILE ".config\opencode\win95-theme"
. (Join-Path $themeSrc "stop-win95-guard.ps1")
Stop-Win95Guard -ThemePath $themeDst

New-Item -ItemType Directory -Force -Path $themeDst | Out-Null
foreach ($item in (Get-ChildItem -LiteralPath $themeSrc)) {
  if ($item.Name -eq "guard.log") { continue }
  if ($item.Name -eq "state.json" -and (Test-Path -LiteralPath (Join-Path $themeDst "state.json"))) { continue }
  if ($item.Name -eq "clippy") {
    $clippyDst = Join-Path $themeDst "clippy"
    foreach ($name in @("src", "tools", "media")) {
      New-Item -ItemType Directory -Force -Path (Join-Path $clippyDst $name) | Out-Null
    }
    # Ship sources only; keep generated artwork and dependencies local.
    foreach ($name in @("package.json", "bun.lock", "tsconfig.json", "vite.config.ts", "tools/extract-clippit97.ps1", "tools/clippit97.py", "media/README.md")) {
      Copy-Item -LiteralPath (Join-Path $item.FullName $name) -Destination (Join-Path $clippyDst $name) -Force
    }
    Copy-Item -Path (Join-Path $item.FullName "src\*") -Destination (Join-Path $clippyDst "src") -Recurse -Force
    continue
  }
  Copy-Item -LiteralPath $item.FullName -Destination $themeDst -Recurse -Force
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
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Install auto-start update guard (survives future OpenCode updates automatically)
$startupVbs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\OpenCodeWin95Guard.vbs"
if ($NoGuard) {
  if (Test-Path -LiteralPath $startupVbs) { Remove-Item -LiteralPath $startupVbs }
} else {
  $guardVbs = Join-Path $themeDst "win95-guard.vbs"
  $wscript = "$env:SystemRoot\System32\wscript.exe"
  $vbsContent = @"
Set shell = CreateObject("WScript.Shell")
cmd = """$wscript"" ""$guardVbs"" ""$AsarPath"""
shell.Run cmd, 0, False
"@
  New-Item -ItemType Directory -Force -Path (Split-Path $startupVbs -Parent) | Out-Null
  Set-Content -LiteralPath $startupVbs -Value $vbsContent -Encoding Unicode
  Start-Process -FilePath $wscript -ArgumentList "`"$startupVbs`""
  Write-Host "Update guard installed and started (Startup: $startupVbs)." -ForegroundColor Cyan
}

Write-Host "Installed. Start OpenCode Desktop as usual." -ForegroundColor Green
