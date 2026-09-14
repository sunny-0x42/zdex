# Local gnodev: 100 zload_* wallets buy across 6 pairs until tools/STOP-LOAD.
# Empty key password. Not Pearl. BTC ticker is not Bitcoin.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Stop = Join-Path $Root "tools\STOP-LOAD"
$Log = Join-Path $Root "data\local-trade.log"
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$Pkg = "gno.land/r/zdex/v2"
$ids = @("ugnot|ZDEX", "ugnot|USDC", "ugnot|USDT", "ugnot|BTC", "ugnot|ETH", "ugnot|ATONE")
$n = 0
while (-not (Test-Path $Stop)) {
  $n++
  $w = "{0:d3}" -f ($n % 100)
  $id = $ids[$n % $ids.Count]
  $key = "zload_$w"
  $ts = Get-Date -Format "s"
  $argsList = @(
    "maketx", "call",
    "-pkgpath", $Pkg,
    "-func", "SwapExactIn",
    "-args", $id, "-args", "ugnot", "-args", "500000", "-args", "1", "-args", "0",
    "-send", "500000ugnot",
    "-gas-fee", "1000000ugnot",
    "-gas-wanted", "30000000",
    "-broadcast",
    "-simulate", "skip",
    "-chainid", "dev",
    "-remote", "127.0.0.1:26657",
    "-insecure-password-stdin",
    $key
  )
  $out = "`n" | & $Gnokey @argsList 2>&1 | Out-String
  if ($out -match "OK!") {
    Add-Content $Log "$ts ok $key $id"
  } else {
    $err = ($out -split "`n" | Select-Object -Last 4) -join " "
    Add-Content $Log "$ts FAIL $key $id $err"
  }
  Start-Sleep -Milliseconds 400
}
Add-Content $Log "$(Get-Date -Format s) STOP-LOAD"
