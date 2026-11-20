param(
  [string]$AsarPath = (Join-Path $env:LOCALAPPDATA "Programs\@opencode-aidesktop\resources\app.asar")
)

$ErrorActionPreference = "SilentlyContinue"
$themeDir = $PSScriptRoot
$ensureScript = Join-Path $themeDir "ensure-patched.ps1"
$logFile = Join-Path $themeDir "guard.log"

# Single-instance mutex so only one guard runs per user session
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\OpenCodeWin95Guard", [ref]$createdNew)
if (-not $createdNew) {
  exit 0
}

$script:lastFailedStamp = ""

function Write-Log([string]$msg) {
  try {
    if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 131072) {
      Set-Content -Path $logFile -Value "" -Encoding UTF8
    }
    Add-Content -Path $logFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [guard] $msg" -Encoding UTF8
  } catch {}
}

function Get-FileStamp([string]$p) {
  try {
    $fi = Get-Item $p -ErrorAction Stop
    return "$($fi.Length):$($fi.LastWriteTimeUtc.Ticks)"
  } catch {
    return ""
  }
}

function Invoke-Heal([string]$reason) {
  try {
    $patcher = Join-Path $themeDir "patch-asar.mjs"
    if (-not (Test-Path $AsarPath) -or -not (Test-Path $patcher)) { return }
    $stamp = Get-FileStamp $AsarPath
    if ($stamp -and $stamp -eq $script:lastFailedStamp) { return }

    & node $patcher --check $AsarPath 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Log "Trigger ($reason): app.asar is unpatched, waiting for installer to settle..."
      Start-Sleep -Seconds 2
      & powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $ensureScript -AsarPath $AsarPath -RelaunchIfRunning -RepairShortcuts
      if ($LASTEXITCODE -ne 0) {
        $script:lastFailedStamp = Get-FileStamp $AsarPath
        Write-Log "Auto-patch failed for stamp $($script:lastFailedStamp); pausing retries until next update."
      } else {
        $script:lastFailedStamp = ""
      }
    }
  } catch {
    Write-Log "Heal error: $_"
  }
}

Write-Log "Win95 update guard started (PID $PID), watching $AsarPath"
Invoke-Heal "startup"

$resDir = Split-Path $AsarPath -Parent
$watcher = $null

function Ensure-Watcher {
  if ($script:watcher -and (Test-Path $resDir)) { return }
  if ($script:watcher) {
    try { $script:watcher.Dispose() } catch {}
    $script:watcher = $null
  }
  if (Test-Path $resDir) {
    $w = New-Object System.IO.FileSystemWatcher
    $w.Path = $resDir
    $w.Filter = "app.asar"
    $w.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::Size
    $w.EnableRaisingEvents = $true
    $script:watcher = $w
  }
}

try {
  while ($true) {
    Ensure-Watcher
    if ($watcher) {
      $res = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 20000)
      if (-not $res.TimedOut) {
        Start-Sleep -Milliseconds 1200
        Invoke-Heal "fs-$($res.ChangeType)"
      } else {
        Invoke-Heal "heartbeat"
      }
    } else {
      Start-Sleep -Seconds 15
      Invoke-Heal "poll"
    }
  }
} finally {
  if ($watcher) { try { $watcher.Dispose() } catch {} }
  try { $mutex.ReleaseMutex(); $mutex.Dispose() } catch {}
}
