# Ping oracle/v1 for each local pool. Spot = pool reserves, not CoinGecko.
$ErrorActionPreference = "Continue"
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$Key = "zload_000"
$Pkg = "gno.land/r/zdex/oracle/v1"
$ids = @("ugnot|USDC", "ugnot|USDT", "ugnot|BTC", "ugnot|ETH", "ugnot|ATONE", "ugnot|ZDEX")
foreach ($id in $ids) {
  Write-Host "Ping $id"
  $argsList = @(
    "maketx", "call", "-pkgpath", $Pkg, "-func", "Ping", "-args", $id,
    "-gas-fee", "1000000ugnot", "-gas-wanted", "20000000",
    "-broadcast", "-simulate", "skip",
    "-chainid", "dev", "-remote", "127.0.0.1:26657",
    "-insecure-password-stdin", $Key
  )
  "`n" | & $Gnokey @argsList
}
