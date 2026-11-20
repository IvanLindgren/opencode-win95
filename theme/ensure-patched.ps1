param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar"),
  [switch]$Launch,
  [switch]$RelaunchIfRunning,
  [switch]$RepairShortcuts,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$themeDir = $PSScriptRoot
$patcher = Join-Path $themeDir "patch-asar.mjs"
$exePath = Join-Path (Split-Path (Split-Path $AsarPath -Parent) -Parent) "OpenCode.exe"
$logFile = Join-Path $themeDir "guard.log"

function Write-GuardLog([string]$msg) {
  try {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $logFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
  } catch {}
}

function Set-Win95Shortcuts {
  try {
    $vbs = Join-Path $themeDir "launch-win95.vbs"
    if (-not (Test-Path $vbs) -or -not (Test-Path $exePath)) { return }
    $wsh = New-Object -ComObject WScript.Shell
    $targets = @(
      (Join-Path ([Environment]::GetFolderPath("Desktop")) "OpenCode.lnk"),
      (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\OpenCode.lnk")
    )
    foreach ($lnkPath in $targets) {
      if (Test-Path $lnkPath) {
        $lnk = $wsh.CreateShortcut($lnkPath)
        $wantArgs = "`"$vbs`""
        if ($lnk.TargetPath -notmatch 'wscript\.exe$' -or $lnk.Arguments -ne $wantArgs) {
          $lnk.TargetPath = "$env:SystemRoot\System32\wscript.exe"
          $lnk.Arguments = $wantArgs
          $lnk.WorkingDirectory = (Split-Path $exePath -Parent)
          $lnk.IconLocation = "$exePath,0"
          $lnk.Save()
          Write-GuardLog "Repaired shortcut: $lnkPath"
        }
      }
    }
  } catch {
    Write-GuardLog "Shortcut repair error: $_"
  }
}

function Wait-FileReady([string]$path, [int]$timeoutSec = 25) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $prevLen = -1
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $path) {
      try {
        $fi = Get-Item $path -ErrorAction Stop
        $stream = [System.IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
        $stream.Close()
        if ($fi.Length -gt 1000000 -and $fi.Length -eq $prevLen) {
          return $true
        }
        $prevLen = $fi.Length
      } catch {}
    }
    Start-Sleep -Milliseconds 400
  }
  return (Test-Path $path)
}

if (-not (Test-Path $AsarPath)) {
  if ($Launch -and (Test-Path $exePath)) {
    Start-Process -FilePath $exePath
  }
  exit 0
}

$needsPatch = $Force.IsPresent
if (-not $needsPatch) {
  & node $patcher --check $AsarPath 2>$null
  if ($LASTEXITCODE -ne 0) {
    $needsPatch = $true
  }
}

if ($needsPatch) {
  Write-GuardLog "Unpatched app.asar detected ($AsarPath). Starting auto-repatch..."
  [void](Wait-FileReady $AsarPath 25)

  $wasRunning = [bool](Get-Process -Name "OpenCode" -ErrorAction SilentlyContinue)
  if ($wasRunning) {
    Write-GuardLog "Stopping OpenCode to apply Win95 patch..."
    Stop-Process -Name "OpenCode" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 900
  }

  $ok = $false
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      $out = & node $patcher $AsarPath 2>&1 | Out-String
      if ($LASTEXITCODE -eq 0) {
        Write-GuardLog "Patch succeeded: $($out.Trim())"
        $ok = $true
        break
      }
      Write-GuardLog "Patch attempt $attempt failed (exit $LASTEXITCODE): $($out.Trim())"
    } catch {
      Write-GuardLog "Patch attempt $attempt exception: $_"
    }
    Start-Sleep -Milliseconds 1000
  }

  if ($RepairShortcuts -or $Launch) {
    Set-Win95Shortcuts
  }

  if (($Launch -or ($RelaunchIfRunning -and $wasRunning)) -and (Test-Path $exePath)) {
    Write-GuardLog "Launching patched OpenCode Desktop..."
    Start-Process -FilePath $exePath
  }
  if (-not $ok) { exit 1 }
} else {
  if ($RepairShortcuts) {
    Set-Win95Shortcuts
  }
  if ($Launch -and (Test-Path $exePath)) {
    Start-Process -FilePath $exePath
  }
}
