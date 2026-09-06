# Gauge ugnot extra — sidecar, không thay fee LP / epoch pot

Status: research / design. Không addpkg. Không sửa `gno.land/r/zdex/v2` (ABI swap/LP immutable). Không concentrated liquidity. Không phải lời khuyên đầu tư.

Nguồn số: `gno.land/r/zdex/v2` (`types.gno`, `pool.gno` `PositionOf` / `PoolInfo` / `AddLiquidity`, `points.gno` `ClaimFeeShare` / `creditSwapPoints`, `swap.gno` `takeUgnot`, `upgrade.gno` `defaultCaps`) và `gno.land/p/zdex/amm/v1` `MulDiv`. Live: Pearl v2, 0 pools — swap/LP phải giữ.

---

## 0. Ba lớp incentive — lớp 3 là extra

| Lớp | Chỗ | User làm gì | Token |
|---|---|---|---|
| 1. LP swap fee ~5/6 | v2 reserve (`splitFee` remainder → k) | `AddLiquidity` rồi hold `Position`. **Không stake thêm.** | ugnot + token trong pool |
| 2. Points + epoch pot | v2 `Score` / `epochPot` | Swap volume + `HarvestPoints`; `ClaimFeeShare` sau khi epoch đóng | 80% protocol **ugnot** phía buy (`defaultFeeShareBps=8000`) |
| 3. Gauge extra | sidecar `gno.land/r/zdex/gauge/v1` (chưa ship) | `Sync` / `Claim(poolID)` đọc LP v2 | ugnot admin `Fund` (`OriginSend`) |

Lớp 3 **không** thay 1 hay 2. Không mint reward token. Không vote-escrow. Không bribe. Không lock LP vào gauge. LP ở lại v2; gauge chỉ đọc.

`defaultCaps` v2 = `swap;lp;create;book;points;quote;feeShare;noStakeLp`. Gauge **không** thêm vào Caps live (package immutable). UI phát hiện path sidecar riêng.

---

## 1. Khác epoch pot (`ClaimFeeShare`)

| | Epoch pot (lớp 2) | Gauge extra (lớp 3) |
|---|---|---|
| Nguồn ugnot | 80% protocol fee **buy** (`creditSwapPoints`) | Admin treasury, `Fund(poolID)` `OriginSend` |
| Ai được chia | Trader volume + LP AccPoints (harvest vào `Score`) | LP đã `Sync`/`Claim` trên **một** `poolID` |
| Chìa khóa | `closedPts` toàn protocol, một pot | `LastLP` / `Acc` **theo pool** |
| Thời gian | Cửa sổ 1 epoch đóng (`defaultEpochBlocks=28800`) | Acc cộng dồn, claim bất kỳ lúc nào — **không roll, không ghi đè** |
| Pause v2 | `ClaimFeeShare` bị `assertNotPaused` | Gauge `Claim` **không** bị v2 pause (fund nằm banker sidecar) |
| Hook swap/LP | Có: `creditSwapPoints` trong `SwapExactIn` | **Không.** v2 không gọi gauge |
| Denominator | `closedPts` | `TotalLP` lúc `Fund` (`PoolInfo`) |
| Bỏ lỡ | Miss >1 epoch → `Closed=0`, ugnot kẹt (xem `economics.md` §3.4) | Không miss cửa sổ. Chỉ mất share nếu đổi LP v2 mà không `Sync`/`Claim` (mục 4) |
| Sell / book | Sell không vào pot; `FillOrder` 0 fee 0 points | Cũng 0. Gauge không đọc volume, không đọc book |

Epoch pot vẫn là fee-share protocol. Gauge là **optional extra ugnot** — admin có thể không `Fund` pool nào; DEX vẫn sống bằng lớp 1+2.

---

## 2. Vì sao sidecar, không hook v2

`SwapExactIn` / `AddLiquidity` trên `gno.land/r/zdex/v2` không được đổi chữ ký, không được gọi realm lạ (`hooks-gno.md`: panic cross-realm abort cả swap).

v2 **đã** export đủ cho pull:

```go
func PoolInfo(poolID string) (reserveU, reserveT, virtualU, totalLP, feeBps int64)
func PositionOf(poolID string, owner address) int64
```

Sidecar `import "gno.land/r/zdex/v2"` rồi đọc. v2 không import gauge, không callback. `Position` / `TotalLP` vẫn chỉ đổi trong `CreatePool` / `AddLiquidity` / `RemoveLiquidity`.

Hệ quả: gauge **không biết** lúc LP đổi. Mọi công thức phải checkpoint lúc user gọi `Sync`/`Claim`. Đó là `LastLP` / `LastAcc`.

---

## 3. Số freeze

Lấy từ hằng v2 / cùng thứ nguyên. Không invent scale mới, không invent concentrated tick.

| Tên | Giá trị | Nguồn / lý do |
|---|---|---|
| `gaugeScale` | `1_000_000_000` (`1e9`) | Trùng `ptsScale` (`types.gno`). Acc = ugnot-per-LP × scale |
| `minFundUgnot` | `1_000_000` | Trùng `minListUgnot` (1 GNOT). Dust `Fund` không làm `MulDiv` floor 0 trên pool vừa |
| `minLiquidity` (cổng Fund) | `1000` | `types.gno`. `Fund` đòi `totalLP > minLiquidity` |
| Denominator Fund | `totalLP` từ `PoolInfo` | Cùng `creditSwapPoints`: `MulDiv(volU, ptsScale, TotalLP)` |
| Curve | constant-product v2, full-range `Position.LP` | Không tick, không range, không NFT vị thế |
| Emission | 0 / block | Chỉ `Fund` rời rạc. Không `rewardPerBlock` |

`MulDiv` = `gno.land/p/zdex/amm/v1` (overflow-safe, panic chỉ khi **quotient** > `int64` max). `add64` / `sub64` cùng semantics v2. Không nhân `LastLP * Acc` trần.

Cổng `Fund` (div0 + floor + burn-only):

```
require(amount >= minFundUgnot, "zdex: min fund")          // 1e6 ugnot
require(totalLP > minLiquidity, "zdex: empty TotalLP")     // >1000
delta = MulDiv(amount, gaugeScale, totalLP)
require(delta > 0, "zdex: fund too small")                 // floor
```

`TotalLP == 0` không xảy ra trên CreatePool sống (`CreatePool` `lp > minLiquidity`, `RemoveLiquidity` giữ burn 1000). Cổng `> minLiquidity` chặn Fund khi chỉ còn LP đốt — Acc sẽ đổ 100% vào share không ai `PositionOf`. `PoolInfo` pool không tồn tại thì panic v2 `"zdex: pool not found"`.

Với `minFundUgnot=1e6`, `gaugeScale=1e9`: `delta >= 1` khi `totalLP <= 1e15`. Pool lớn hơn phải `Fund` nhiều hơn 1 GNOT; không thì reject. Không hạ `minFund` xuống 1 ugnot.

---

## 4. Accrual

State sidecar **theo pool**:

```
Gauge {
  Acc      int64  // cumulative ugnot per LP × gaugeScale
  Weight   int64  // Σ LastLP (query + cổng “có người Sync”)
  Funded   int64  // Σ OriginSend đã nhận
  Claimed  int64  // Σ đã trả
  Stopped  bool
}

User {
  LastLP   int64  // PositionOf tại lần checkpoint cuối
  LastAcc  int64  // Acc tại lần checkpoint cuối
  Owed     int64  // đã settle, chưa Claim
}
```

User chưa bao giờ `Sync`/`Claim`: `LastLP=0`, `LastAcc=0`, `Owed=0`.

### 4.1 Fund (admin)

```
takeUgnot(cur, amount)                    // EOA, OriginSend == amount, denom ugnot
_, _, _, totalLP, _ = zdex.PoolInfo(poolID)
require(!paused && !g.Stopped)
require(amount >= 1_000_000)
require(totalLP > 1000)
delta = MulDiv(amount, 1_000_000_000, totalLP)
require(delta > 0)
g.Acc    = add64(g.Acc, delta)
g.Funded = add64(g.Funded, amount)
```

Không duyệt từng LP. Không ghi `User`. Ai chưa checkpoint thì **không** ăn `delta` này (mục 5.1).

`Weight > 0` không phải mẫu số Acc. Acc luôn chia `totalLP` (gồm burn 1000 + LP chưa Sync) — cùng pha loãng AccPoints v2. Phần burn / chưa Sync **kẹt** trong banker sidecar (mục 5.3). Admin nên đợi LP `Sync` rồi mới `Fund`; `Weight` chỉ để UI hiện “opted-in LP”.

### 4.2 Checkpoint (`Sync` và đầu `Claim`)

```
live = zdex.PositionOf(poolID, owner)          // 0 nếu không có Position
eligible = min(LastLP, live)                   // không dùng LP mới cho Acc cũ
pending  = MulDiv(eligible, sub64(g.Acc, LastAcc), gaugeScale)
Owed     = add64(Owed, pending)
Weight   = Weight - LastLP + live              // LastLP=0 nếu user mới
LastLP   = live
LastAcc  = g.Acc
```

`eligible = min(LastLP, live)`:

- Tăng LP trên v2 mà chưa checkpoint → `live > LastLP` → chỉ tính `LastLP` trên `(Acc - LastAcc)` → **không** retroactive `Fund` cũ.
- Giảm / xóa LP trên v2 mà chưa checkpoint → `live < LastLP` → `eligible` theo `live` (thường 0) → **forfeit** share `Fund` trong khoảng đó (mục 5.2). Banker không insolvent.

`MulDiv(LastLP, Acc-LastAcc, scale)` **không** min với `live` sẽ overpay nếu nhiều user rút hết rồi admin `Fund` trên `TotalLP` nhỏ (LastLP zombie > TotalLP). Cấm.

### 4.3 Claim(poolID)

```
checkpoint
out = Owed
if out > 0 {
  Owed = 0
  g.Claimed = add64(g.Claimed, out)
  sendUgnot(..., owner, out)             // banker sidecar, IsCurrent
}
return out
```

`Claim` với `out==0` **không** panic — đó là cách opt-in (checkpoint `LastLP=live`, `LastAcc=Acc`). `Sync` = checkpoint, không `sendUgnot`.

User thêm LP rồi muốn earn `Fund` **sau**: gọi `Sync` (hoặc `Claim` 0) **sau** `AddLiquidity`, **trước** `Fund` kế.

User muốn rút LP mà không mất `Owed` + pending đang live: `Sync` (hoặc `Claim`) **trước** `RemoveLiquidity`.

### 4.4 Ví dụ số (CreatePool)

`CreatePool` 1 GNOT + token, `geoMean` cho `TotalLP = 1_000_000` (minLiquidity 1000 đốt, Alice `PositionOf = 999_000`). Alice `Sync`: `LastLP=999_000`, `LastAcc=0`.

Admin `Fund` `1_000_000` ugnot:

```
delta = MulDiv(1_000_000, 1e9, 1_000_000) = 1_000_000_000
```

Alice `Claim`:

```
eligible = min(999_000, 999_000) = 999_000
pending  = MulDiv(999_000, 1e9, 1e9) = 999_000
```

Kẹt 1_000 ugnot = share LP đốt. Bob thêm LP **sau** Fund, `PositionOf=500_000`, `Claim`: `LastLP=0` → pending 0, rồi `LastLP=500_000`, `LastAcc=1e9`. Bob chỉ eat `Fund` sau.

Không phải APR. Không phải cam kết Fund lặp.

---

## 5. Tấn công / grief

### 5.1 New LP after Fund (chặn)

1. Admin `Fund` → `Acc` tăng.
2. Attacker `AddLiquidity` trên v2 (TotalLP lúc Fund đã chốt).
3. `Claim` ngay.

Nếu pending = `MulDiv(live, Acc, scale)` với `LastAcc=0` → attacker lấy gần như cả pot.

Với `LastLP` khởi tạo 0: `eligible=0` → pending 0 → `LastAcc` bắt kịp `Acc`. Attacker chỉ earn Fund **kế**. Đúng “không retroactive”.

Cùng pattern nếu attacker **tăng** LP giữa hai Fund mà không `Sync`: phần LP mới không nhân `Acc` cũ.

### 5.2 Remove without claim (user mất share, banker an toàn)

1. Alice `Sync` (`LastLP=L`).
2. `Fund` → `Acc` tăng.
3. Alice `RemoveLiquidity` trên v2, **không** gọi gauge.
4. Alice `Claim`: `live=0` → `eligible=0` → pending khoảng Acc đó = 0. `Owed` cũ (nếu có) vẫn trả.

Share `Fund` bước 2 kẹt (cùng lớp dust burn). Không chuyển cho LP còn lại — `Acc` đã chia theo `TotalLP` lúc Fund.

Grief ngược: Alice cố **earn sau khi exit** bằng cách không `Sync` rồi `Claim` với `LastLP` zombie. `min(LastLP, live)` chặn. Muốn giữ pending: `Sync`/`Claim` trước khi rút.

### 5.3 Admin rug — pause / stop / không Recover

| Hành vi admin | Cho phép? | Hệ quả |
|---|---|---|
| `Pause` sidecar | Có — chặn **`Fund` mới** | `Claim` / `Sync` **vẫn chạy**. Khác `ClaimFeeShare` v2 (pause-block). Pause mà khóa claim = custodial rug |
| `Stop(poolID)` / `Resume` | Có — hết `Fund` pool đó | Acc cũ claim được. Tín hiệu “hết incentive”, không phải tịch thu |
| `Fund` pool `TotalLP <= 1000` | Không — panic `empty TotalLP` | Tránh 100% vào burn |
| `Fund` trước ai `Sync` | Được (nếu `totalLP > 1000`) | 100% kẹt nếu mọi `LastLP=0`. Footgun treasury, không phải user rug |
| `Fund` pool Launch seed (unowned `TotalLP`) | Được về mặt code | Seed không có `Position` (`economics.md` §1.2). Đừng Fund Launch legacy |
| `Recover` / `Collect` ugnot đã `Fund` | **Cấm** | Không có đường admin rút `Funded - Claimed` |
| `SetPaused` v2 | Độc lập | v2 pause chặn swap/LP; `PositionOf` vẫn đọc; gauge `Claim` vẫn trả |
| Two-step `ProposeAdmin` / `AcceptAdmin` | Có, copy v2 | Admin mới cũng không `Recover` |

Rug còn lại (công khai, không che):

1. Ngừng `Fund` — APR extra → 0. Lớp 1+2 không đổi.
2. `Fund` pool mỏng / không ai Sync — đốt treasury.
3. `Stop` + im lặng — UI phải hiện `Stopped`.
4. Overflow `g.Acc` (`add64`) → `Fund` pool đó panic; `Claim` pending cũ vẫn tính được nếu `sub64(Acc, LastAcc)` chưa tràn. Không reset `Acc`.

Không `SweepDust`. Dust (burn 1000 / chưa Sync / `MulDiv` floor / forfeit remove) nằm banker sidecar. Sweep “unclaimed” = lấy nhầm `Owed` của người chưa `Claim`.

### 5.4 Khác

- **JIT LP + Fund**: không hook, attacker không thấy `Fund` trong cùng tx v2. Họ có thể `AddLiquidity` → `Sync` → (block sau) nhận Fund nếu admin `Fund` sau. Đó là LP thật lúc Fund, không phải retroactive.
- **Book**: `FillOrder` không đổi `PositionOf` → 0 gauge. Đúng.
- **MsgRun / envelope**: `Fund` `IsUserCall` + `OriginSend` match, copy `takeUgnot`.
- **Cross-realm Fund**: không. Admin EOA. Sidecar không `OriginSend` hộ DEX.
- **Wash LP**: add/remove để game lớp 1 (JIT fee) không tự `Sync` gauge. Không earn extra nếu không checkpoint.

---

## 6. Ở v2 vs module

**Giữ nguyên v2** (`gno.land/r/zdex/v2`):

- `CreatePool`, `AddLiquidity`, `RemoveLiquidity`, `SwapExactIn`, `SwapExactOut`, `Quote`, `QuoteIn`
- `splitFee`, `CreatorBps=0`, `ProtocolBps=1667`, LP remainder ~8333, fee tier 5/30/100
- `minListUgnot=1e6`, `minLiquidity=1000`, `maxCreatorKeepBps=2000`, vest/lock/snipe (Launch legacy)
- `AccPoints`, `harvestLP`, `HarvestPoints`, `maybeRollEpoch`, `ClaimFeeShare`, `epochPot` 80%
- `CollectFees` buckets `Accrued*`
- Escrow book
- `PositionOf`, `PoolInfo`, `Position.LP` / `RewardDebt` (RewardDebt = points, **không** reuse cho gauge)
- `Caps` / `Version` / `Modules` — không thêm `"gauge"` trên generation đã addpkg

**Module mới** (`gno.land/r/zdex/gauge/v1`, chưa viết realm trong pass này):

- `Fund(cur, poolID)` admin, `OriginSend` ugnot
- `Sync(cur, poolID)`, `Claim(cur, poolID)` user
- `Pause` / `Stop` / `Resume` / two-step admin
- Query: `AccOf(poolID)`, `Pending(poolID, owner)`, `PositionOf` ủy quyền v2, `Weight`, `Funded`, `Claimed`, `Stopped`
- Banker riêng; `MulDiv` từ `/p/zdex/amm/v1`
- `import` v2 **một chiều**

Không `SetModule("lp", gauge)`. Không farm-stake LP token. Không GRC20 emission. Không ve(3,3). Không Uniswap v3 range.

`NextPkg` v2 có thể trỏ UI sang hub khác; LP + epoch pot vẫn ở v2. Gauge path ghi trong UI config, không trong `HubSnapshot` cho đến generation có Caps mới.

---

## 7. Thứ tự ship (khi human yes)

1. Realm sidecar + test: Fund div0, min 1e6, new LP after Fund = 0, remove without claim = 0 pending, Claim khi pause, không Recover, `MulDiv(1e18-1, 1e9, 1e9)` không panic.
2. Không đụng test golden v2 swap/LP.
3. UI: opt-in Sync/Claim **tách** HarvestPoints / ClaimFeeShare. Copy: extra ugnot, không phải “APR”.
4. addpkg / Fund live — **human yes** riêng. Pearl 0 pools: có thể addpkg gauge trước pool đầu; vẫn không `Fund` khi `TotalLP <= 1000`.

---

## Tham chiếu nhanh

| Mục | Chỗ |
|---|---|
| `ptsScale=1e9`, `minListUgnot=1e6`, `minLiquidity=1000`, `8000`, `1667` | `gno.land/r/zdex/v2/types.gno` |
| `PositionOf`, `PoolInfo`, no-stake LP | `pool.gno` |
| Epoch pot, harvest, miss-epoch | `points.gno`; `docs/research/economics.md` §3 |
| `MulDiv` overflow-safe | `gno.land/p/zdex/amm/v1` |
| `takeUgnot` EOA + OriginSend | `swap.gno` |
| Không hook live ABI | `docs/research/hooks-gno.md` |
| Không ve(3,3) / không gauge vote | `docs/research/economics.md` §5 |
| Caps `feeShare;noStakeLp` | `upgrade.gno` `defaultCaps` |
