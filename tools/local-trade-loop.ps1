# Random non-repeating buys on local priced pools until STOP-LOAD.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Stop = Join-Path $Root "tools\STOP-LOAD"
$Log = Join-Path $Root "data\local-trade.log"
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$Pkg = "gno.land/r/zdex/v2"
$ids = @("ugnot|USDC", "ugnot|USDT", "ugnot|BTC", "ugnot|ETH", "ugnot|ATONE", "ugnot|ZDEX")
$seen = @{}
$n = 0
while (-not (Test-Path $Stop)) {
  $n++
  $w = Get-Random -Minimum 0 -Maximum 100
  $pool = $ids | Get-Random
  $amt = Get-Random -Minimum 100000 -Maximum 25000001
  $key = "zload_{0:d3}" -f $w
  $sig = "$key|$pool|$amt|$n"
  if ($seen.ContainsKey("$key|$pool|$amt")) { continue }
  $seen["$key|$pool|$amt"] = $true
  if ($seen.Count -gt 4000) { $seen.Clear() }
  $ts = Get-Date -Format "s"
  $argsList = @(
    "maketx", "call",
    "-pkgpath", $Pkg, "-func", "SwapExactIn",
    "-args", $pool, "-args", "ugnot", "-args", "$amt", "-args", "1", "-args", "0",
    "-send", "${amt}ugnot",
    "-gas-fee", "1000000ugnot", "-gas-wanted", "30000000",
    "-broadcast", "-simulate", "skip",
    "-chainid", "dev", "-remote", "127.0.0.1:26657",
    "-insecure-password-stdin", $key
  )
  $out = "`n" | & $Gnokey @argsList 2>&1 | Out-String
  if ($out -match "OK!") { Add-Content $Log "$ts ok $key $pool $amt" }
  else {
    $err = (($out -split "`n") | Select-Object -Last 3) -join " "
    Add-Content $Log "$ts FAIL $key $pool $amt $err"
  }
  Start-Sleep -Milliseconds 250
}
Add-Content $Log "$(Get-Date -Format s) STOP-LOAD"
