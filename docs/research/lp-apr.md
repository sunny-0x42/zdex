# LP APR — hai lớp, không gán APR cho lump v1

Status: research / product+protocol. Không addpkg. Không sửa `gno.land/r/zdex/v2`. Không overwrite `gno.land/r/zdex/incentives/v1` (Pearl live, **immutable**). `incentives/v2` = pkg mới, Pearl addpkg sau = **human yes**. Không phải lời khuyên đầu tư.

Nguồn số: `gno.land/r/zdex/v2/types.gno` (`ptsScale`, `poolProtocolFeeBps=1667`, `defaultEpochBlocks=28800`, `minListUgnot`), `math.gno` `splitFee`, `gno.land/r/zdex/incentives/v1` (`Fund` lump, `pendingOf`, `scale=1e9`, `minFundUgnot=1e6`), `gno.land/p/zdex/amm/v1` `MulDiv`, `web/src/lib/amm.ts` `lpFeeAprPct`, `web/chain.mjs` `trackVolume` / `HISTORY=48`.

---

## 0. Hai lớp — không cộng thành “APR”

Uniswap-style LP yield trên zdex tách **hai dòng tiền khác nhau**. Product phải hiện hai số (hoặc một số + một non-APR). Không gộp lump gauge vào Fee APR.

| Lớp | Nguồn | Cần gì để gọi là APR | Chỗ |
|---|---|---|---|
| **Fee APR** | LP share của swap fee, **đã nằm trong reserve** (`splitFee` remainder → k) | Trailing volume + `feeBps` + `lpShare` + `reserveU` | AMM v2, UI `lpFeeAprPct` |
| **Reward APR** | Extra `ugnot` emission từ sidecar gauge | **Rate** (`ugnot` / block) trên cửa sổ còn chạy | **Không có trên v1.** Chỉ `incentives/v2` `FundProgram` |

Fee LP **không** cần stake thêm (`noStakeLp`). Gauge extra **không** thay fee LP và **không** thay epoch pot 80% protocol (`points.gno`). `FillOrder` (escrow book) 0 AMM fee, 0 volume vào Fee APR.

APR nào cũng là **est.** trailing / forward từ công thức, không phải return, không phải APY cam kết.

---

## 1. Fee APR — Uniswap v2 style từ volume

LP CreatePool giữ remainder sau protocol skim:

```
fee      = MulDiv(amountIn, feeBps, 10000)
protocol = MulDiv(fee, ProtocolBps, 10000)     // CreatePool: 1667
lp       = fee - creator - protocol            // CreatorBps=0 → ~8333/10000
reserve  += net + lp
```

`lpShare` freeze:

```
CreatePool:  (10000 - 1667) / 10000 = 8333/10000    // ~5/6
Launch:      0.5                                        // 4000 creator + 1000 protocol / 10000 fee
```

UI hiện tại (`web/src/lib/amm.ts`):

```
lpFeeAprPct = volumeU * (feeBps/10000) * lpShare / reserveU * 365 * 100
```

`tvl` trong hàm = `reserveU` (real `ugnot`, không cộng `virtualU`, không ×2). Volume = 0 hoặc TVL = 0 → `null` (UI `"—"`), không `"0%"`.

### 1.1 Volume không phải cửa sổ 24h on-chain

`volumeU` **không** nằm trên realm. `web/chain.mjs` `trackVolume`:

- Store process-memory + `web/data/spark.json` (`vol` map).
- Mỗi poll: nếu `reserveU` đổi thì đẩy `{ t: now, u: |ΔreserveU| }`.
- Filter `now - t < 86_400_000` (24h wall-clock **của server**).
- Spark giá: `HISTORY = 48` mẫu (`priceHist` / `localStorage` `zdex.spark.*`).

Hệ quả product phải ghi **est. 24h volume**:

1. Không phải `SwapExactIn`/`SwapExactOut` cumulative on-chain. `Quote` / `QuoteIn` không đổi reserve → 0 volume.
2. `|ΔreserveU|` đếm cả `AddLiquidity` / `RemoveLiquidity` / `Collect` không phải, và **không** đếm nhánh token-in (sell) đúng notional `ugnot`.
3. Serverless / restart / read-only FS mất cửa sổ. 48 spark ≠ 24h guaranteed.
4. Book fill không đụng `reserveU` → 0 Fee APR từ order.

Label UI: **Fee APR (est.)** · nguồn **24h volume (off-chain)**. Không “APY”. Không “guaranteed”.

---

## 2. incentives/v1 — lump, cấm gắn APR

Pearl live `gno.land/r/zdex/incentives/v1` là **IMMUTABLE**. `Fund` = một `OriginSend` lump. Không `durationBlocks`. Không `rewardPerBlock`. Acc nhảy một lần:

```
sent  = OriginSend ugnot                         // ≥ minFundUgnot = 1_000_000
delta = MulDiv(sent, scale, TotalLP)             // scale = 1e9
Acc  += delta                                    // add64
```

Claimable realtime (đã on-chain, UI `Claimable(poolID, owner)`):

```
eligible  = min(LastLP, live PositionOf)
Claimable = MulDiv(eligible, Acc - LastAcc, scale)     // 0 nếu LastLP=0 (chưa Sync)
```

`Sync`/`Claim` trả `Claimable` rồi snapshot `LastLP = live`, `LastAcc = Acc`. Remove LP trước Claim → forfeit (cố ý, chống insolvency).

### 2.1 Vì sao annualize lump = fake APR

Gọi `TotalFunded / reserveU * 365 * 100` (hay chia “giả” 1 ngày) bịa **rate**. Lump đã vào Acc hết trong **một** tx. Block sau emission = 0. LP mới sau Fund `LastLP=0` → Claimable 0. Số “APR” sẽ:

- Phóng đại ngày Fund, về 0 ngay sau đó mà UI không biết.
- Không forward-looking (hết tiền rồi).
- Không comparable Uniswap (fee APR) hay MasterChef (rewardPerBlock).

**Cấm** cột APR / APY / “reward APR” cho v1. Pill `Incentivized` được; chữ yield không.

### 2.2 Product phải hiện (v1)

Hai số **không annualize**:

| Số | Công thức | Nguồn |
|---|---|---|
| **Claimable** | `min(LastLP, liveLP) * (Acc - LastAcc) / 1e9` | `qeval Claimable` — realtime |
| **Boost %** | `TotalFunded / reserveU * 100` | `GaugeSnapshot` field `totalFunded` vs `PoolInfo.reserveU` |

Boost = **program / TVL**, one-shot, đơn vị “% of GNOT TVL already posted”, không phải APR. `TotalFunded=0` hoặc `reserveU=0` → ẩn boost, không `"0% APR"`.

Copy: extra `ugnot` gauge, không thay swap fee. “Claim after Sync. Remove LP before Claim forfeits unclaimed gauge.” Not financial advice.

---

## 3. incentives/v2 — `FundProgram` linear, mới có Reward APR

Pkg mới: `gno.land/r/zdex/incentives/v2`. **Không** sửa v1, không `SetModule` trên v2 DEX, không copy AMM. Sidecar đọc `PoolInfo` / `PositionOf` như v1. Checkpoint `LastLP` / `LastAcc` giữ nguyên (không retroactive, `min(LastLP, live)`).

### 3.1 Surface

```
FundProgram(cur, poolID, durationBlocks)     // OriginSend ugnot, EOA
```

- `durationBlocks <= 0` → default **28800** (~1 ngày, trùng `defaultEpochBlocks` / `minVestBlocks`).
- Cho phép **7 * 28800** (tuần). Bound trên: reject duration quá lớn làm `ugnotPerBlock = MulDiv(sent, 1, duration) == 0` (dust rate).
- Cổng giống v1: `sent >= minFundUgnot` (1e6), `totalLP > minLiquidity` (1000), `MulDiv` overflow-safe, `IsUserCall`, chỉ `ugnot`.
- `Fund` lump v1 **không** có trên v2 (hoặc alias `FundProgram(..., 0)` → default 28800 — không Acc-jump một block).

State program (theo pool, có thể 1 program active — research: không stack chồng rate trừ khi Acc gộp cùng scale):

```
RewardRate      int64   // ugnot / block  = MulDiv(sent, 1, durationBlocks)
StartHeight     int64
FinishHeight    int64   // Start + duration
LastUpdate      int64
Remaining       int64   // banker leftover (sent - paid)
Acc             int64   // same units v1: ugnot-per-LP × 1e9
```

Poke (`FundProgram` / `Sync` / `Claim` / query `AccOf`):

```
to      = min(height, FinishHeight)
elapsed = to - LastUpdate                          // 0 nếu hết hạn / lần đầu
pay     = MulDiv(elapsed, RewardRate, 1)           // không elapsed*rate trần
pay     = min(pay, Remaining)
Acc    += MulDiv(pay, scale, TotalLP)              // TotalLP tại poke, giống v1 Fund
Remaining   -= pay
LastUpdate   = to
```

Hết `FinishHeight`: `RewardRate` hiệu dụng 0. Claimable công thức **giống v1** (cùng `min` + `MulDiv` / scale). Không Recover. Pause chặn Fund mới, không chặn Claim.

### 3.2 Reward APR (chỉ khi rate > 0)

```
blocksPerYear = 28800 * 365                         // 10_512_000
ugnotPerBlock = RewardRate                          // 0 sau FinishHeight
rewardAprPct  = ugnotPerBlock * blocksPerYear / reserveU * 100
```

Overflow: `MulDiv(ugnotPerBlock, blocksPerYear, reserveU)` rồi `* 100` — **không** nhân trần `int64`. `reserveU == 0` hoặc `RewardRate == 0` → không hiện APR (—" / ẩn), không fake.

Đây là APR **pool-level** trên GNOT TVL (`reserveU`), cùng mẫu số Fee APR. Share user = pro-rata `PositionOf / TotalLP` — không nhân thêm vào % (cùng %).

### 3.3 Human yes

Pearl addpkg `…/zdex/incentives/v2` = **human yes** riêng. Không broadcast. Không `gnokey`. v1 live giữ nguyên path UI `incentivesPkg` cho đến khi yes + config trỏ v2. Hub v2 DEX **không** thêm cap `incentives` (immutable).

---

## 4. Số freeze

Không invent scale, không invent block time khác epoch.

| Tên | Giá trị | Nguồn |
|---|---|---|
| `ptsScale` / `gaugeScale` / `scale` | `1_000_000_000` (`1e9`) | `types.gno`; `incentives/v1/state.gno` |
| `minFundUgnot` | `1_000_000` (1 GNOT) | trùng `minListUgnot` |
| `minLiquidity` (cổng Fund) | `1000` | `types.gno`; `totalLP > 1000` |
| Blocks / ngày | `28800` | `defaultEpochBlocks`, `minVestBlocks`, `minLockBlocks` (block ~3s) |
| `blocksPerYear` | `28800 * 365` = `10_512_000` | derived, không hằng on-chain |
| Fee `lpShare` CreatePool | `(10000 - 1667) / 10000` | `poolProtocolFeeBps=1667` |
| Fee `lpShare` Launch | `0.5` | `CreatorBps=4000`, `ProtocolBps=1000` |
| Fee tiers | 5 / 30 / 100 bps | `validSwapFee` |
| Duration default v2 | `28800` hoặc `7 * 28800` | epoch / tuần |
| TVL mẫu số APR | `reserveU` (real ugnot) | UI `lpFeeAprPct`; không `virtualU` |

`MulDiv` = `gno.land/p/zdex/amm/v1` (overflow-safe; panic chỉ khi quotient > `int64` max). Mọi Acc / APR on-chain đi `MulDiv`, không `a*b` trần.

---

## 5. Trust — copy bắt buộc

UI / Guide / tweet:

- **Fee APR (est.)** — trailing từ **24h volume** (off-chain vol store, không guaranteed on-chain).
- **Reward APR (est.)** — chỉ `incentives/v2` khi `RewardRate > 0`. Prefix **est.**
- v1: **Claimable** + **Boost %** (program/TVL). Không chữ APR.
- Volume = 0 → Fee APR = "—", không 0% giả.
- Testnet Pearl: faucet GNOT, không value.
- **Not financial advice.** Không guaranteed APY, không risk-free, không “earn X%”.

Cấm: gộp Fee APR + lump boost thành “Total APR”. Cấm annualize `TotalFunded`. Cấm nói gauge thay ~5/6 LP fee.

Footer / Guide (giữ English trên UI): fees, points, and any APR figure are mechanics or trailing estimates, not returns.

---

## 6. Công thức product / protocol phải implement

### Product (`web/` — không cần yes)

**Fee APR (est.)** — giữ `lpFeeAprPct`, label `Fee APR (est.)`:

```
lpShare     = launched ? 0.5 : (10000 - 1667) / 10000
feeAprPct   = volumeU * (feeBps/10000) * lpShare / reserveU * 365 * 100
              // null nếu reserveU<=0 || volumeU<=0
```

Volume tooltip: *est. 24h, off-chain `|ΔreserveU|`, not an on-chain window.*

**v1 gauge** — không APR:

```
claimable   = Claimable(poolID, owner)                    // qeval
boostPct    = TotalFunded / reserveU * 100                // ẩn nếu funded=0
```

Hiện `Claimable` GNOT + `Boost {boostPct}% of TVL` + pill Incentivized.

**v2 (khi pkg live)** — cột riêng:

```
rewardAprPct = MulDiv(RewardRate, 28800*365, reserveU) * 100 / 1
               // chỉ hiện nếu RewardRate>0 && height < FinishHeight && reserveU>0
```

Hai cột: `Fee APR (est.)` | `Reward APR (est.)`. Không cộng. User pending = cùng `Claimable`.

### Protocol (`incentives/v2` — human yes trước addpkg)

```
ugnotPerBlock = MulDiv(sent, 1, durationBlocks)           // duration default 28800
pay           = min(MulDiv(elapsed, ugnotPerBlock, 1), Remaining)
Acc          += MulDiv(pay, 1e9, TotalLP)
Claimable     = MulDiv(min(LastLP, liveLP), Acc-LastAcc, 1e9)
rewardApr     = MulDiv(ugnotPerBlock, 28800*365, reserveU)  // query helper, không state
```

Không overwrite v1. Không `rewardPerBlock` trên v1. Không hook `SwapExactIn`. Không farm-stake LP token để nhận fee (fee đã trong k).

---

## Tham chiếu

| Mục | Chỗ |
|---|---|
| Fee split ~5/6 LP | `v2/math.gno` `splitFee`; `types.gno` `1667` |
| Fee APR UI | `web/src/lib/amm.ts` `lpFeeAprPct` |
| Volume / spark 48 | `web/chain.mjs` `trackVolume`, `HISTORY` |
| v1 lump Acc | `incentives/v1/incentives.gno` `Fund` / `pendingOf` |
| Scale / minFund | `incentives/v1/state.gno` |
| Epoch 28800 | `types.gno` `defaultEpochBlocks` |
| Routing sidecar | `docs/research/incentives-routing.md` |
| Không APY | `docs/research/trust.md` |
| Kinh tế fee | `docs/research/economics.md` §1–2 |
