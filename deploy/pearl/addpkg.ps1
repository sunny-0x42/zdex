# Pearl addpkg for zdex v2. Signs with a named gnokey key already on this machine.
# Never pass a mnemonic or password as an argument.
param(
  [Parameter(Mandatory = $true)][string]$KeyName,
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

$Pearl = $PSScriptRoot
$Remote = "https://rpc.pearl.testnets.gno.land:443"
$Chain = "pearl-1"
$Addr = "g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr"
$Mode = if ($Broadcast) { "test" } else { "only" }

$Jobs = @(
  @{
    Path = "gno.land/p/$Addr/zdex/amm/v1"
    Dir  = (Join-Path $Pearl "p-amm-v1")
  },
  @{
    Path = "gno.land/r/$Addr/zdex/v2"
    Dir  = (Join-Path $Pearl "r-v2")
  }
)

foreach ($j in $Jobs) {
  if (-not (Test-Path $j.Dir)) { throw "missing $($j.Dir)" }
  Write-Host "=== $($j.Path)  simulate=$Mode ==="
  & $Gnokey maketx addpkg `
    -pkgpath $j.Path `
    -pkgdir $j.Dir `
    -gas-fee 160000ugnot `
    -gas-wanted 80000000 `
    -max-deposit 20000000ugnot `
    -chainid $Chain `
    -remote $Remote `
    -simulate $Mode `
    $KeyName
  if ($LASTEXITCODE -ne 0) { throw "addpkg failed for $($j.Path) exit $LASTEXITCODE" }
}
