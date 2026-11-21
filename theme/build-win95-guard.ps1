param([string]$Compiler = "gcc.exe")

$ErrorActionPreference = "Stop"
$compilerPath = (Get-Command $Compiler -CommandType Application).Source
$target = Join-Path $PSScriptRoot "win95-guard.exe"
$tmp = Join-Path $PSScriptRoot "win95-guard.build.$PID.exe"
try {
  & $compilerPath -std=c11 -Os -Wall -Wextra -Werror -municode -mwindows -static -s `
    (Join-Path $PSScriptRoot "win95-guard.c") -o $tmp -lshell32 -luser32
  if ($LASTEXITCODE -ne 0) { throw "Native Win95 guard build failed ($LASTEXITCODE)." }
  if (Test-Path -LiteralPath $target) {
    $backup = "$tmp.backup"
    [IO.File]::Replace($tmp, $target, $backup)
    Remove-Item -LiteralPath $backup
  } else {
    [IO.File]::Move($tmp, $target)
  }
  Write-Output "Built $target"
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp }
}
