# Persist 6 GNOT pairs on local gnodev via Launch (test tickers, not mainnet BTC).
# Signs with zload_000 (empty password). Chainid dev, remote 127.0.0.1:26657.
$ErrorActionPreference = "Continue"
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$Key = "zload_000"
$Pkg = "gno.land/r/zdex/v2"
$pairs = @(
  @{ name = "ZDEX"; symbol = "ZDEX" },
  @{ name = "USD Coin"; symbol = "USDC" },
  @{ name = "Tether"; symbol = "USDT" },
  @{ name = "Bitcoin"; symbol = "BTC" },
  @{ name = "Ether"; symbol = "ETH" },
  @{ name = "AtomOne"; symbol = "ATONE" }
)
function Invoke-Launch($sym, $nm) {
  $argsList = @(
    "maketx", "call",
    "-pkgpath", $Pkg,
    "-func", "Launch",
    "-args", $nm, "-args", $sym,
    "-args", "6", "-args", "1000000000", "-args", "0",
    "-args", "3500000000", "-args", "0", "-args", "28800",
    "-args", "1", "-args", "200",
    "-gas-fee", "1000000ugnot",
    "-gas-wanted", "50000000",
    "-broadcast",
    "-simulate", "skip",
    "-chainid", "dev",
    "-remote", "127.0.0.1:26657",
    "-insecure-password-stdin",
    $Key
  )
  Write-Host "Launch $sym"
  "`n" | & $Gnokey @argsList
}
foreach ($p in $pairs) { Invoke-Launch $p.symbol $p.name }
Write-Host "seed done"
