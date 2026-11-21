param(
  [Parameter(Mandatory)] [string]$Act,
  [Parameter(Mandatory)] [string]$Output
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$data = [IO.File]::ReadAllBytes($Act)
if ([BitConverter]::ToUInt32($data, 0) -ne 0x0002504c) { throw 'Not an Actor 2.0 pack' }
$resource = [BitConverter]::ToUInt32($data, 10)
$payload = $resource + [BitConverter]::ToUInt32($data, $resource+0x26)
$first = $resource + [BitConverter]::ToUInt32($data, $resource+0x2a)
$last = $resource + [BitConverter]::ToUInt32($data, $resource+0x2e) - 4
New-Item -ItemType Directory -Force -Path $Output | Out-Null
$i = 0
for ($index = $first; $index -lt $last; $index += 4) {
  $p = $payload + [BitConverter]::ToUInt32($data, $index)
  if ([BitConverter]::ToUInt32($data, $p) -ne 2596720087) { continue }
  $size = [BitConverter]::ToUInt32($data, $p+28) * 2 + 22
  $width = [BitConverter]::ToInt16($data, $p+10) - [BitConverter]::ToInt16($data, $p+6)
  $height = [BitConverter]::ToInt16($data, $p+12) - [BitConverter]::ToInt16($data, $p+8)
  $stream = [IO.MemoryStream]::new($data, $p, $size)
  $frame = [Drawing.Image]::FromStream($stream)
  $pixels = [Drawing.Bitmap]::new([int]($width*2), [int]($height*2))
  $graphics = [Drawing.Graphics]::FromImage($pixels)
  try {
    $graphics.DrawImage($frame, 0, 0, $pixels.Width, $pixels.Height)
    $pixels.Save((Join-Path $Output ("{0:d3}.png" -f $i)), [Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $pixels.Dispose()
    $frame.Dispose()
    $stream.Dispose()
  }
  $i++
}
