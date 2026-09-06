# Pearl addpkg for zdex v2. Signs with a named gnokey key already on this machine.
# Never pass a mnemonic or password as an argument.
#
# AMM must land on-chain before the realm can typecheck (it imports the AMM path).
param(
  [Parameter(Mandatory = $true)][string]$KeyName,
  [ValidateSet("Amm", "Realm", "Incentives", "All")][string]$Stage = "All",
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

$Amm = @{
  Path      = "gno.land/p/$Addr/zdex/amm/v1"
  Dir       = (Join-Path $Pearl "p-amm-v1")
  GasWanted = "20000000"
  GasFee    = "40000ugnot"
}
$Realm = @{
  Path      = "gno.land/r/$Addr/zdex/v2"
  Dir       = (Join-Path $Pearl "r-v2")
  GasWanted = "100000000"
  GasFee    = "200000ugnot"
}
$Incentives = @{
  Path      = "gno.land/r/$Addr/zdex/incentives/v1"
  Dir       = (Join-Path $Pearl "incentives-v1")
  GasWanted = "50000000"
  GasFee    = "100000ugnot"
}

$Jobs = @()
if ($Stage -eq "Amm" -or $Stage -eq "All") { $Jobs += $Amm }
if ($Stage -eq "Realm") { $Jobs += $Realm }
if ($Stage -eq "Incentives") { $Jobs += $Incentives }
if ($Stage -eq "All" -and $Broadcast) { $Jobs += $Realm; $Jobs += $Incentives }
if ($Stage -eq "All" -and -not $Broadcast) {
  Write-Host "Simulate AMM only. Realm typecheck needs AMM on-chain first."
  Write-Host "After AMM broadcast:  .\deploy\pearl\addpkg.ps1 -KeyName $KeyName -Stage Realm"
  Write-Host "After v2 broadcast:   .\deploy\pearl\addpkg.ps1 -KeyName $KeyName -Stage Incentives"
}

foreach ($j in $Jobs) {
  if (-not (Test-Path $j.Dir)) { throw "missing $($j.Dir)" }
  Write-Host "=== $($j.Path)  simulate=$Mode ==="
  & $Gnokey maketx addpkg `
    -pkgpath $j.Path `
    -pkgdir $j.Dir `
    -gas-fee $j.GasFee `
    -gas-wanted $j.GasWanted `
    -max-deposit 20000000ugnot `
    -chainid $Chain `
    -remote $Remote `
    -simulate $Mode `
    $KeyName
  if ($LASTEXITCODE -ne 0) { throw "addpkg failed for $($j.Path) exit $LASTEXITCODE" }
}
