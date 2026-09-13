# addpkg oracle/v1 Ping sidecar. Does not import into DEX v2 SwapExactIn.
# Never pass a mnemonic or password as an argument.
param(
  [Parameter(Mandatory = $true)][string]$KeyName,
  [string]$Remote = "https://pearl.rpc.onbloc.xyz",
  [switch]$Broadcast
)

$ErrorActionPreference = "Stop"
if ($KeyName -match "\s" -or $KeyName.Split(" ").Count -ge 12) {
  throw "KeyName must be a gnokey key name, not a seed phrase."
}

$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
if (-not (Test-Path $Gnokey)) {
  $found = Get-Command gnokey -ErrorAction SilentlyContinue
  if (-not $found) { throw "gnokey not found" }
  $Gnokey = $found.Source
}

$Dir = Join-Path $PSScriptRoot "oracle-v1"
$Path = "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/oracle/v1"
$Mode = if ($Broadcast) { "test" } else { "only" }
$Cmd = @(
  "maketx", "addpkg",
  "-pkgpath", $Path,
  "-pkgdir", $Dir,
  "-gas-fee", "100000ugnot",
  "-gas-wanted", "40000000",
  "-max-deposit", "20000000ugnot",
  "-chainid", "pearl-1",
  "-remote", $Remote,
  "-simulate", $Mode,
  $KeyName
)
Write-Host ("gnokey " + ($Cmd -join " "))
& $Gnokey @Cmd
if ($LASTEXITCODE -ne 0) { throw "gnokey failed exit $LASTEXITCODE" }
if (-not $Broadcast) {
  Write-Host "Simulate only. Broadcast:"
  Write-Host "  .\deploy\pearl\addpkg-oracle-v1.ps1 -KeyName $KeyName -Broadcast"
}
