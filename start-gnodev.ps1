# Windows: gnodev's workspace `...` glob does not see packages.
# Run from a nested folder (so Abs(`...\...`) cannot walk %USERPROFILE%)
# and pass -extra-root at the gno.land tree (filepath.WalkDir).
$ErrorActionPreference = "Stop"
$zdex = Split-Path -Parent $MyInvocation.MyCommand.Path
$gnoRoot = "C:\Users\Hi\tools\gno"
$gnodev = "C:\Users\Hi\tools\gnodev.exe"
$ws = Join-Path $zdex "..\zdex-dev\ws"
$ws = [IO.Path]::GetFullPath($ws)
$gnoHome = Join-Path $zdex "..\zdex-dev\.gnohome"
$gnoHome = [IO.Path]::GetFullPath($gnoHome)
New-Item -ItemType Directory -Force -Path $ws, $gnoHome | Out-Null
if (-not (Test-Path (Join-Path $ws "gnowork.toml"))) {
  Set-Content -Path (Join-Path $ws "gnowork.toml") -Value "" -Encoding ascii
}
$env:GNOROOT = $gnoRoot
Set-Location $ws
Write-Host "gnoweb  http://127.0.0.1:8888/r/zdex/v2"
& $gnodev local `
  -no-examples -no-watch -web-with-html `
  -home $gnoHome `
  -web-home /r/zdex/v2 `
  -extra-root (Join-Path $zdex "gno.land")
