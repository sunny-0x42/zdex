# Local gnodev: two-sided pools at demo USD marks. GNOT = $0.65. Not mainnet assets.
# $1M TVL per pool ( $500k GNOT + $500k token). Signs zload_000 empty password.
$ErrorActionPreference = "Continue"
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$Key = "zload_000"
$Pkg = "gno.land/r/zdex/v2"
$GnotUsd = 0.65
$HalfUsd = 500000
$amountU = [int64][math]::Round($HalfUsd / $GnotUsd * 1000000)
# token 6-dec: amountT = (500000 / tokenUsd) * 1e6
$pairs = @(
  @{ name = "USD Coin"; symbol = "USDC"; tokenUsd = 1.0; fee = "5" },
  @{ name = "Tether"; symbol = "USDT"; tokenUsd = 1.0; fee = "5" },
  @{ name = "Bitcoin"; symbol = "BTC"; tokenUsd = 76700.0; fee = "30" },
  @{ name = "Ether"; symbol = "ETH"; tokenUsd = 2477.0; fee = "30" },
  @{ name = "AtomOne"; symbol = "ATONE"; tokenUsd = 0.101; fee = "30" },
  @{ name = "ZDEX"; symbol = "ZDEX"; tokenUsd = 0.10; fee = "30" }
)
function Invoke-Seed($p) {
  $amountT = [int64][math]::Round($HalfUsd / $p.tokenUsd * 1000000)
  $send = "${amountU}ugnot"
  Write-Host ("Seed {0} U={1} T={2} fee={3}bps  (~`${4}k / side)" -f $p.symbol, $amountU, $amountT, $p.fee, ($HalfUsd/1000))
  $argsList = @(
    "maketx", "call",
    "-pkgpath", $Pkg,
    "-func", "SeedListedPool",
    "-args", $p.name, "-args", $p.symbol, "-args", "6",
    "-args", "$amountU", "-args", "$amountT", "-args", $p.fee,
    "-send", $send,
    "-gas-fee", "1000000ugnot",
    "-gas-wanted", "80000000",
    "-broadcast", "-simulate", "skip",
    "-chainid", "dev", "-remote", "127.0.0.1:26657",
    "-insecure-password-stdin", $Key
  )
  "`n" | & $Gnokey @argsList
}
foreach ($p in $pairs) { Invoke-Seed $p }
Write-Host "priced seed done amountU=$amountU"
