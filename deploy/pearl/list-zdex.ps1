# List ZDEX on Pearl: addpkg GRC20, Approve zdex v2, CreatePool with 300 GNOT.
# Never pass a mnemonic or password as an argument.
param(
  [Parameter(Mandatory = $true)][string]$KeyName,
  [ValidateSet("Token", "Approve", "Pool", "All")][string]$Stage = "All",
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
$DexPkg = "gno.land/r/$Addr/zdex/v2"
$DexRealm = "g1ycznwttc6dfgshkn7a0asgwsl3hpphvhjq7cav"
$TokenPkg = "gno.land/r/$Addr/zdex/token"
$TokenDir = Join-Path $Pearl "token"
$TokenKey = "$TokenPkg.ZDEX"
$AmountU = "300000000"
$AmountT = "300000000000"
$FeeBps = "30"
$Mode = if ($Broadcast) { "test" } else { "only" }

function Invoke-Gnokey {
  param([Parameter(ValueFromRemainingArguments = $true)]$Args)
  Write-Host ("gnokey " + ($Args -join " "))
  & $Gnokey @Args
  if ($LASTEXITCODE -ne 0) { throw "gnokey failed exit $LASTEXITCODE" }
}

if ($Stage -eq "Token" -or $Stage -eq "All") {
  Write-Host "=== addpkg $TokenPkg simulate=$Mode ==="
  Invoke-Gnokey maketx addpkg `
    -pkgpath $TokenPkg `
    -pkgdir $TokenDir `
    -gas-fee 40000ugnot `
    -gas-wanted 20000000 `
    -max-deposit 10000000ugnot `
    -chainid $Chain `
    -remote $Remote `
    -simulate $Mode `
    $KeyName
}

if ($Stage -eq "Approve" -or ($Stage -eq "All" -and $Broadcast)) {
  Write-Host "=== Approve zdex v2 for $AmountT ZDEX-base simulate=$Mode ==="
  Invoke-Gnokey maketx call `
    -pkgpath $TokenPkg `
    -func Approve `
    -args $DexRealm `
    -args $AmountT `
    -gas-fee 40000ugnot `
    -gas-wanted 20000000 `
    -chainid $Chain `
    -remote $Remote `
    -simulate $Mode `
    $KeyName
}

if ($Stage -eq "Pool" -or ($Stage -eq "All" -and $Broadcast)) {
  Write-Host "=== CreatePool ugnot|ZDEX  300 GNOT + 300000 ZDEX  fee 30bps simulate=$Mode ==="
  Invoke-Gnokey maketx call `
    -pkgpath $DexPkg `
    -func CreatePool `
    -args $TokenKey `
    -args ZDEX `
    -args $AmountU `
    -args $AmountT `
    -args $FeeBps `
    -send "${AmountU}ugnot" `
    -gas-fee 100000ugnot `
    -gas-wanted 50000000 `
    -max-deposit 5000000ugnot `
    -chainid $Chain `
    -remote $Remote `
    -simulate $Mode `
    $KeyName
}

if ($Stage -eq "All" -and -not $Broadcast) {
  Write-Host "Simulated token addpkg only. After it is on-chain:"
  Write-Host "  .\deploy\pearl\list-zdex.ps1 -KeyName $KeyName -Stage Token -Broadcast"
  Write-Host "  .\deploy\pearl\list-zdex.ps1 -KeyName $KeyName -Stage Approve -Broadcast"
  Write-Host "  .\deploy\pearl\list-zdex.ps1 -KeyName $KeyName -Stage Pool -Broadcast"
}
