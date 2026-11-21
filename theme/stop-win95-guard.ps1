function Stop-Win95Guard([string]$ThemePath) {
  $nodeGuard = [WildcardPattern]::Escape((Join-Path $ThemePath "win95-guard.mjs"))
  $legacyGuard = [WildcardPattern]::Escape((Join-Path $ThemePath "win95-guard.ps1"))
  $nativeGuard = Join-Path $ThemePath "win95-guard.exe"
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='node.exe' OR Name='win95-guard.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ProcessId -ne $PID -and (
        ($_.Name -eq 'powershell.exe' -and $_.CommandLine -like "*$legacyGuard*") -or
        ($_.Name -eq 'node.exe' -and $_.CommandLine -like "*$nodeGuard*") -or
        ($_.ExecutablePath -eq $nativeGuard)
      )
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
