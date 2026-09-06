# Fund 100 GNOT into the ugnot|ZDEX gauge on the incentives sidecar.
# Never pass a mnemonic or password as an argument.
#
# If you hold LP and want this Fund to count for you later, Sync first
# (pays 0, checkpoints LastLP), then Fund.
param(
  [Parameter(Mandatory = $true)][string]$KeyName,
  [ValidateSet("Sync", "Fund", "All")][string]$Stage = "All",
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

$Chain = "pearl-1"
$IncPkg = "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1"
$PoolID = "ugnot|ZDEX"
$FundU = "100000000"
$Mode = if ($Broadcast) { "test" } else { "only" }

function Invoke-GnokeyCmd([string[]]$CmdArgs) {
  Write-Host ("gnokey " + ($CmdArgs -join " "))
  & $Gnokey @CmdArgs
  if ($LASTEXITCODE -ne 0) { throw "gnokey failed exit $LASTEXITCODE" }
}

if ($Stage -eq "Sync" -or $Stage -eq "All") {
  Write-Host "=== Sync $PoolID  simulate=$Mode ==="
  Invoke-GnokeyCmd @(
    "maketx", "call",
    "-pkgpath", $IncPkg,
    "-func", "Sync",
    "-args", $PoolID,
    "-gas-fee", "40000ugnot",
    "-gas-wanted", "20000000",
    "-chainid", $Chain,
    "-remote", $Remote,
    "-simulate", $Mode,
    $KeyName
  )
}

if ($Stage -eq "Fund" -or ($Stage -eq "All" -and $Broadcast)) {
  Write-Host "=== Fund $PoolID  100 GNOT  simulate=$Mode ==="
  Invoke-GnokeyCmd @(
    "maketx", "call",
    "-pkgpath", $IncPkg,
    "-func", "Fund",
    "-args", $PoolID,
    "-send", "${FundU}ugnot",
    "-gas-fee", "40000ugnot",
    "-gas-wanted", "20000000",
    "-chainid", $Chain,
    "-remote", $Remote,
    "-simulate", $Mode,
    $KeyName
  )
}

if ($Stage -eq "All" -and -not $Broadcast) {
  Write-Host "Simulated Sync only. Next:"
  Write-Host "  .\deploy\pearl\fund-zdex.ps1 -KeyName $KeyName -Stage Sync -Broadcast"
  Write-Host "  .\deploy\pearl\fund-zdex.ps1 -KeyName $KeyName -Stage Fund -Broadcast"
}
