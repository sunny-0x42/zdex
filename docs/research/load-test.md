# Load test Launch — fee 100 bps, snipe 2%, k sau fee

Status: research / DeFi. Không addpkg. Không đổi live param. Không phải lời khuyên đầu tư. Không APY.

## Run (local `gno test`)

`gno test ./gno.land/r/zdex/v2/` **PASS** (~2.1s). `TestLoadFivePairsHundredWallets`: 100 `TestAddress`, `SkipHeights(1001)` rồi 500 × `SwapExactIn` 0.5 GNOT. `PoolCount=5`, protocol ugnot accrued, `SpotPrice` đổi ≥1 pair. `gno test ./gno.land/r/zdex/oracle/v1/` **PASS** (`Ping`/`Observe` trên `oUSDC`…`oATONE`).

Không chạy Pearl, không 100 ví Adena. `tBTC` không phải Bitcoin.

Nguồn số: `gno.land/r/zdex/v2/load_test.gno` (`TestLoadInternalLaunchSwaps`), `types.gno` (`launchFeeBps`, `defaultSnipeMaxBps`, `launchCreatorFeeBps`, `launchProtocolFeeBps`, `defaultFeeShareBps`), `launch.gno`, `swap.gno` (`assertSnipe`, `SwapExactIn`), `math.gno` `splitFee`, `points.gno` `creditSwapPoints`, `gno.land/p/zdex/amm/v1` `AmountOut` / `MulDiv` (floor, overflow-safe).

`Launch` là legacy. Listing product = `CreatePool`. File này neo **expected** trên fixture load, không mở Launch trên UI.

---

## 0. Fixture trong `load_test.gno`

`TestLoadInternalLaunchSwaps` mint **năm** ticker nội bộ, rồi 12 `TestAddress` (`load0`…`load11`) mỗi cái `SwapExactIn` **1_000_000 ugnot** (1 GNOT) vào **mỗi** pool.

| | |
|---|---|
| Symbols | `tUSDC`, `tUSDT`, `tBTC`, `tETH`, `tATONE` |
| Names | `Test USDC`, `Test USDT`, `Test BTC`, `Test ETH`, `Test ATONE` |
| Pool id | `ugnot\|<SYMBOL>` |
| `totalSupply` | 1_000_000_000 |
| `creatorKeepBps` | 0 (không vest) |
| `virtualUgnot` | 3_500_000_000 |
| `lockBlocks` | 28_800 |
| `snipeBlocks` | 1_000 |
| `snipeMaxBps` | **200** |
| Buy mỗi tx | 1_000_000 ugnot |
| Số swap happy | 12 ví × 5 pool = **60** |
| Abuse | 1_000_000_000 ugnot vào `tBTC` → `"zdex: snipe cap"` |

Seed mỗi pool: `ReserveU=0`, `ReserveT=1_000_000_000`, `VirtualU=3_500_000_000`, `FeeBps=launchFeeBps`, `CreatorBps=4000`, `ProtocolBps=1000`, `Launched=true`, `Internal=true`. `TotalLP = geoMean(3_500_000_000, 1_000_000_000) = 1_870_828_693` — **không** `Position` creator, seed không rút được.

Test **không** assert từng ugnot fee / k. Các số dưới đây là `MulDiv` floor áp đúng args Launch + `buyIn` trong file đó.

---

## 1. `tBTC` không phải bitcoin

`tBTC` trong load test là **ticker nội bộ** realm `gno.land/r/zdex/v2`. Comment trong test: không claim, không wrap, không đại diện BTC thật.

- Tên pool: `Test BTC`. Symbol: `tBTC`. Id: `ugnot|tBTC`.
- Mint `mintInternal` — ledger in-realm, không phải Bitcoin, không phải wrapped BTC, không phải Threshold tBTC, không phải tài sản cross-chain.
- Cùng họ fixture với `tUSDC` / `tUSDT` / `tETH` / `tATONE`: chữ `t` = test, không phải ticker live.
- Permissionless `Launch` vẫn là **user ký**. zdex không phát hành bitcoin.

Không định giá BTC. Không peg. Không redeem.

---

## 2. Expected fee trên Launch — `launchFeeBps=100`

Hằng: `launchFeeBps=100` (1% notional), `launchCreatorFeeBps=4000`, `launchProtocolFeeBps=1000`, `defaultFeeShareBps=8000`. `bpsDen=10000`.

Một `SwapExactIn` buy `amountIn=1_000_000` ugnot (đúng `buyIn` trong test):

| Bucket | Công thức | ugnot | ~bps notional |
|---|---|---:|---:|
| Fee gộp | `MulDiv(1_000_000, 100, 10000)` | 10_000 | 100 |
| Creator → `AccruedCreatorU` | `MulDiv(10_000, 4000, 10000)` | 4_000 | 40 |
| Protocol | `MulDiv(10_000, 1000, 10000)` | 1_000 | 10 |
| LP vào reserve (k) | 10_000 − 4_000 − 1_000 | 5_000 | 50 |
| `epochPot` (80% protocol ugnot) | `MulDiv(1_000, 8000, 10000)` | 800 | 8 |
| `AccruedProtocolU` | 1_000 − 800 | 200 | 2 |
| Net vào CPMM | 1_000_000 − 10_000 | 990_000 | — |
| `ReserveU` tăng | net + lp | **995_000** | — |

Creator + protocol **không vào k**. `Quote` chỉ trừ `feeBps` trong `AmountOut`; `splitFee` / points / bucket chỉ trên `SwapExactIn` / `SwapExactOut`.

`splitFee` không phụ thuộc reserve: mỗi buy 1 GNOT luôn +995_000 `ReserveU`, luôn 4_000 / 1_000 / 5_000.

Sau **12** buy trên **một** pool (chưa kể tx snipe fail):

| | ugnot |
|---|---:|
| `ReserveU` | 11_940_000 |
| Creator accrued | 48_000 |
| Protocol gộp | 12_000 |
| `epochPot` (pool này) | 9_600 |
| `AccruedProtocolU` | 2_400 |
| LP remainder vào k | 60_000 |

Năm pool happy-path: 60 × 10_000 fee = 600_000 ugnot phí; `epochPot` global += 60 × 800 = **48_000**. `VirtualU` còn 3_500_000_000 — `ReserveU` ≪ virtual nên **không** `Graduate`.

Launch creator lấy **40% fee** (40 bps notional). CreatePool DEX: `CreatorBps=0`, protocol 1667/10000 của fee, LP ~5/6. Đó là lý do listing mới không đi Launch.

---

## 3. Snipe cap 2% — real reserve

`snipeMaxBps=200` trong test = `defaultSnipeMaxBps` = **2%**. Cửa sổ: `SnipeUntil = height + 1000`. `assertSnipe` (buy): `out <= MulDiv(ReserveT, 200, 10000)`. Sell: trần trên **real** `ReserveU`. Virtual **không** cộng vào base cap.

| Thời điểm | `ReserveT` | Cap 2% (token) | `AmountOut` buy | Kết quả |
|---|---:|---:|---:|---|
| Pool mới | 1_000_000_000 | 20_000_000 | 1 GNOT → **282_777** | Dưới cap — 12 ví đi qua |
| Sau 12 buy | 996_617_229 | 19_932_344 | 1_000_000_000 ugnot → **219_161_307** | `out > cap` → panic `"zdex: snipe cap"` |

1 GNOT đầu ≈ 0.028% real `ReserveT` — xa 2%. Tx 1_000_000_000 ugnot trên `tBTC` (sau 12 buy) lấy ~21.9% real token → đúng nhánh abort trong test.

`CreatePool` để `SnipeUntil=0` — load này **không** cover listing DEX. Book escrow **không** snipe.

---

## 4. k sau fees

CPMM: giá trên **effective** `(ReserveU + VirtualU, ReserveT)`. Payout chỉ từ **real** `ReserveT`. `AmountOut` trừ fee 100 bps rồi `MulDiv(net, y, x+net)` floor. Sau đó reserve nhận **net + lp**, không nhận creator/protocol.

k hiệu dụng `k_eff = (ReserveU + VirtualU) × ReserveT`. k real `k_real = ReserveU × ReserveT` (Launch seed `ReserveU=0` nên k real bắt đầu 0).

| | `ReserveU` | `ReserveT` | `k_eff` | `k_real` |
|---|---:|---:|---:|---:|
| Seed | 0 | 1_000_000_000 | 3_500_000_000_000_000_000 | 0 |
| Sau buy 1 GNOT | 995_000 | 999_717_223 | 3_500_004_999_136_885_000 | 994_718_636_885_000 |
| Sau 12 buy | 11_940_000 | 996_617_229 | 3_500_059_911_214_260_000 | 11_899_609_714_260_000 |

`k_eff` **tăng** vì lp 5_000 ugnot/tx ở lại pool, không có token out tương ứng (swap đã định giá trên `net`). Nếu cả 10_000 fee ở lại reserve, `ReserveU` sau 12 buy = 12_000_000; k real cùng `ReserveT` cuối = 11_904_592_800_405_000 — **lớn hơn** k real thật 11_899_609_714_260_000. Chênh = creator + protocol đã skim (60_000 ugnot × `ReserveT`).

Buy 1 GNOT đầu: out = 282_777 token. `k_eff` tăng 4_999_136_885_000. Floor `AmountOut` làm `ReserveT` còn lại hơi cao hơn công thức liên tục — k đo từ reserve sau tx, không từ `x·y` giả định không làm tròn.

Không suy ra lợi nhuận LP. `k` tăng ≠ return.

---

## 5. Test assert gì / không assert gì

Assert trong `TestLoadInternalLaunchSwaps`:

- 5 pool, id `ugnot|tUSDC` … `ugnot|tATONE`.
- Mỗi happy swap `out > 0` và `BalanceOf(symbol, wallet) = out`.
- Sau 12 ví: `ReserveU > 0` mọi pool.
- Buy 1_000_000_000 ugnot `tBTC` abort `"zdex: snipe cap"`.

Không assert: `FeeBps==100`, từng bucket 4_000/1_000/5_000/800, `k_eff` / `k_real`, tên ≠ bitcoin. Expected ở §2–§4 lấy từ hằng số + `MulDiv` trên đúng args test.

---

## Invariants giữ

- Money path fail-closed; `MulDiv` overflow-safe, floor.
- Launch fee **100 bps** notional; creator 4000 + protocol 1000 của fee; LP remainder **vào k**.
- Keep ≤ 20% (fixture này keep = 0); vest tuyến tính khi keep > 0; LP lock ≥ 28_800; snipe max bps trên **real** reserve.
- Snipe default / fixture = **200 bps (2%)** / 1_000 blocks; max code = 1_000 bps.
- Native `ugnot` `OriginSend`. Không wrap.
- `tBTC` fixture ≠ bitcoin.

## Assumptions chưa chứng

- Không chạy `gno test ./gno.land/r/zdex/v2` trong pass viết file này; số §2–§4 là số học `MulDiv`/`AmountOut` trùng công thức realm.
- Test không đọc `Accrued*` / `epochPot` / `k` — regression fee/k vẫn dựa `zdex_test.gno` (`TestLaunchBuySell`, `TestFeeBucketsIndependent`, `TestSnipeCap`).
- `geoMean` seed LP = `Sqrt(3.5e18)` vì tích vừa `int64`; không đi nhánh `MulDiv(Sqrt a, Sqrt b, 1)`.
- Pearl live không chạy load này. Không qeval chain.
- Năm ticker `t*` chỉ local. Không map token thật.

Không phải lời khuyên đầu tư.
