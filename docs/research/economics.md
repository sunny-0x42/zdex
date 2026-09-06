# Kinh tế zdex (generation v2)

Nguồn: `gno.land/r/zdex/v2` (`types.gno`, `math.gno` `splitFee`, `pool.gno`, `swap.gno`, `points.gno`, `launch.gno`, `admin.gno` `CollectFees`, `book.gno` `FillOrder`) và `gno.land/p/zdex/amm/v1` (`MulDiv`, `AmountOut`, `AmountIn`). Không phải lời khuyên đầu tư. Số dưới đây là hằng số / công thức trong code, không phải APR kỳ vọng.

Live generation: `gno.land/r/zdex/v2`. `Launch` là legacy; listing DEX-only là `CreatePool`.

---

## 1. Fee split hiện tại

Mọi swap AMM đi qua `amm.AmountOut` / `amm.AmountIn` (trừ `feeBps` trên notional), rồi `splitFee` tách **phần fee** (không phải notional) thành creator / protocol / LP.

```
fee      = MulDiv(amountIn, feeBps, 10000)
creator  = MulDiv(fee, CreatorBps, 10000)
protocol = MulDiv(fee, ProtocolBps, 10000)
lp       = fee - creator - protocol
net      = amountIn - fee
```

Reserve nhận `net + lp`. Creator và protocol **không vào k** — chúng vào bucket `Accrued*` (`creditSwapPoints`). `Quote` / `QuoteIn` chỉ áp `feeBps` trong công thức CPMM; không `splitFee`, không points.

### 1.1 CreatePool (DEX listing)

Hằng số: `types.gno` — `feeTierLow=5`, `feeTierMid=30`, `feeTierHigh=100`, `defaultFeeBps=30`, `poolProtocolFeeBps=1667`, `maxFeeBps=100`, `minListUgnot=1_000_000`.

`CreatePool` (`pool.gno`):

- `CreatorBps` không gán → **0**. Comment trong `types.gno`: *"DEX model: no creator cut on CreatePool"*.
- `ProtocolBps = poolProtocolFeeBps` = **1667 / 10000 ≈ 1/6** của swap fee (1/6 đúng là 1666.6…; code làm tròn lên 1667).
- LP remainder = **8333 / 10000 ≈ 5/6** của swap fee.
- `feeBps` chỉ 5 / 30 / 100 (`validSwapFee`). `feeBps==0` → 30.
- Seed LP: `geoMean(amountU, amountT)` trừ `minLiquidity=1000` (burn, Uniswap-v2 style). `UnlockHeight=0`.

Ví dụ `SwapExactIn` mua token, `amountIn=1_000_000 ugnot`, `FeeBps=30`:

| Bucket | Công thức | ugnot |
|---|---|---|
| Fee gộp | `MulDiv(1e6, 30, 10000)` | 3_000 |
| Creator | `MulDiv(3000, 0, 10000)` | 0 |
| Protocol | `MulDiv(3000, 1667, 10000)` | 500 |
| LP vào reserve | 3000 − 0 − 500 | 2_500 |
| 80% protocol → `epochPot` | `MulDiv(500, 8000, 10000)` | 400 |
| 20% protocol → `AccruedProtocolU` | 500 − 400 | 100 |
| ReserveU tăng | net + lp = 997_000 + 2_500 | 999_500 |

Trên notional: trader trả 30 bps; LP ~25 bps vào k; protocol ~5 bps, trong đó ~4 bps vào pot, ~1 bps admin `CollectFees`.

### 1.2 Launch (legacy, không expose UI)

Hằng số: `launchFeeBps=100`, `launchCreatorFeeBps=4000`, `launchProtocolFeeBps=1000`, `maxCreatorKeepBps=2000`.

`Launch` (`launch.gno`) gán `FeeBps=100`, `CreatorBps=4000`, `ProtocolBps=1000`, `Launched=true`. Keep token ≤ 20% supply, vest tuyến tính (`minVestBlocks=28800`), LP lock ≥ 28800, snipe mặc định `defaultSnipeMaxBps=200` trên **real** reserve (`assertSnipe` trong `swap.gno`). Seed `TotalLP = geoMean(virtualUgnot, poolAmt)` **không có `Position`** — không rút được.

Ví dụ cùng `1_000_000 ugnot` buy:

| Bucket | bps của fee | ugnot | ~bps notional |
|---|---|---|---|
| Fee gộp | 100% của 100 bps | 10_000 | 100 |
| Creator (`AccruedCreatorU`) | 4000 | 4_000 | 40 |
| Protocol | 1000 | 1_000 | 10 |
| LP vào reserve | 5000 | 5_000 | 50 |
| `epochPot` (80% protocol ugnot) | | 800 | 8 |
| `AccruedProtocolU` | | 200 | 2 |

Creator Launch lấy **40% fee**, gấp nhiều lần protocol. Đây là lý do listing mới đi `CreatePool`, không mở `Launch`.

### 1.3 Hai phía swap và `CollectFees`

`creditSwapPoints` (`points.gno`):

- **Buy** (`ugnotSide=true`, input `ugnot`): protocol ugnot tách 80/20 (`defaultFeeShareBps=8000`) → `epochPot` + `AccruedProtocolU`. Creator ugnot (nếu `CreatorBps>0`) vào `AccruedCreatorU` **toàn bộ**, không vào pot.
- **Sell** (input token): `AccruedCreatorT` + `AccruedProtocolT` nhận 100% phần của chúng. **Không** vào `epochPot`.

`CollectFees` (`admin.gno`): creator rút `AccruedCreator*`; admin rút `AccruedProtocol*`. Không `assertNotPaused` (test `TestFeeBucketsIndependent` pause rồi vẫn collect). `ClaimFeeShare` thì pause-blocked.

`creditFees` trong `swap.gno` **không được gọi**. Swap thật đi `creditSwapPoints`. Nếu sau này gọi `creditFees`, protocol ugnot sẽ **bỏ qua** 80% pot.

### 1.4 Book không trả AMM fee

`FillOrder` (`book.gno`) chuyển escrow 1-1 theo ratio order. Không `splitFee`, không `creditSwapPoints`, không so với `SpotPrice`. Limit order có thể fill xuyên pool price mà không đóng góp LP fee hay epoch pot.

`Quote` / `SwapExactIn` / `SwapExactOut` thì có. `SwapExactOut` refund `ugnot` thừa; fee tính trên `AmountIn` thực trả.

Dust: `MulDiv` floor — swap nhỏ trên tier 5 bps có thể `fee=0` (ví dụ `amountIn=1000`, `feeBps=5`).

---

## 2. No-stake LP fees = mô hình Uniswap v2 — hệ quả cho zdex

Uniswap v2: 0.30% fee **ở lại pool**, tăng `k`. LP nhận khi `burn`. Không farm, không stake LP vào contract khác. Protocol fee (khi `feeTo` bật) ≈ **1/6** tăng trưởng `sqrt(k)`, mint LP cho protocol.

zdex CreatePool cùng tỷ lệ **~1/6 protocol / ~5/6 LP**, và cap `noStakeLp` (`upgrade.gno` `defaultCaps`). Khác cơ chế:

| | Uniswap v2 (`feeTo` on) | zdex CreatePool |
|---|---|---|
| Chỗ fee LP | Toàn bộ fee vào reserve, rồi mint pha loãng 1/6 | Chỉ `lp` vào reserve (`net+lp`) |
| Protocol | LP token, realize lúc mint/burn | Skim ngay vào `AccruedProtocol*` / `epochPot` |
| Stake thêm | Không | Không — `Position` trong pool; `HarvestPoints` không deposit |
| Creator cut | Không | 0 trên CreatePool; 40% fee trên Launch legacy |

Hệ quả:

1. **LP fee là thanh khoản**, không phải reward token. APR UI (`web/src/lib/amm.ts` `lpFeeAprPct`) dùng `lpShare = launched ? 0.5 : (10000-1667)/10000` trên volume — công thức mô tả, không phải cam kết.
2. Depth CreatePool mỏng hơn Uniswap v2 `feeTo=off` (100% fee vào k). Protocol 5 bps (tier 30) không nằm trong reserve.
3. Không có “stake LP để earn” — ai `AddLiquidity` là earn. JIT LP quanh một swap lớn vẫn lấy đúng phần `lp` + `AccPoints` lúc `TotalLP` tăng (`creditSwapPoints` chia `volU * ptsScale / TotalLP`).
4. `RemoveLiquidity` / `AddLiquidity` gọi `harvestLP` trước khi đổi share — ra/vào pool không ăn cắp AccPoints của người khác, nhưng **điểm harvest vào epoch hiện tại** (mục 3).
5. Launch seed LP unowned + `UnlockHeight` → LP fee trên pool launched chỉ hiện hữu sau lock, và chỉ cho LP **thêm vào sau**; creator Launch earn bằng `CreatorBps`, không bằng LP share của seed.

Không phải MasterChef / Sushi: không có emission, không có pid, không lock LP để farm.

---

## 3. Points + epoch fee-share 80%

Hằng số: `ptsScale=1e9`, `defaultEpochBlocks=28800` (~1 ngày block 3s), `defaultFeeShareBps=8000`. State: `epoch`, `epochEnd`, `epochPts`, `epochPot`, `closedID`, `closedPts`, `closedPot` (`state.gno`). Admin: `SetEpochBlocks`, `SetFeeShareBps` — **live param, cần human yes**.

### 3.1 Ai được điểm

`creditSwapPoints`:

- Trader: `addPoints(trader, volU)` — buy: `amountIn` ugnot; sell: ugnot **out**. 1 ugnot volume = 1 point, không nhân fee.
- LP: `AccPoints += MulDiv(volU, ptsScale, TotalLP)` nếu `TotalLP>0`. `harvestLP` trả `LP * AccPoints / ptsScale - RewardDebt` vào `Score` (`HarvestPoints`, và lúc add/remove).

`Score`: `Life` (cộng dồn, không reset), `Epoch` (epoch đang mở), `Closed` (điểm epoch vừa đóng, nếu còn cửa sổ), `ClaimedID`.

Pot **chỉ** 80% protocol **ugnot** phía buy. Sell không đổ pot. Trader sell vẫn được points trên ugnot out.

`ClaimFeeShare`: `out = MulDiv(s.Closed, closedPot, closedPts)` — pro-rata pot epoch **vừa đóng**. Một lần mỗi `closedID`.

Test neo: `TestPointsFeeShareNoStake` — swap 2e6 ugnot → `Life=2e6`; LP không stake thêm; `HarvestPoints` > 0; `ClaimFeeShare` > 0.

### 3.2 Ai thắng (cơ chế, không phải lời khuyên)

- **Trader volume**: points tuyến tính theo ugnot. Wash buy+sell farm `Life` rẻ hơn so với pot (pot chỉ ~4 bps notional buy trên CreatePool 30) — **fee-share cash không bù 30+30 bps**. `Life` vẫn là surface airdrop.
- **LP đang hold lúc có volume**: AccPoints đúng lúc swap. Pool mỏng → nhiều AccPoints / LP. Không cần harvest mỗi swap; nợ nằm ở `RewardDebt`.
- **Protocol / admin**: 20% protocol ugnot buy + 100% protocol token sell qua `CollectFees`.
- **Creator Launch**: 40% fee, không chia pot.
- **Creator CreatePool**: 0% fee; thắng nếu họ là LP (5/6 fee + points).

### 3.3 Ai game được

1. **Wash volume** để phình `Life` / `Epoch`. Chi phí là swap fee + impact. Pot không đủ hoàn phí trừ khi vừa LP gần 100% pool (JIT + round-trip: leak còn ~1 bps protocol keep + gas trên CreatePool 30). Động cơ chính là `Life`, không phải pot.
2. **Harvest trễ**: `harvestLP` → `addPoints` **epoch hiện tại**. Hold nhiều epoch không harvest, rồi harvest vào epoch pot dày → cướp share. Ngược lại, harvest vào epoch mỏng thì tự pha loãng.
3. **JIT LP**: `AddLiquidity` ngay trước swap lớn, `RemoveLiquidity` sau. Lấy `lp` fee + AccPoints đúng swap đó; harvest vào epoch hiện tại. Giống Uniswap v2 JIT.
4. **FillOrder**: 0 fee, 0 points — né AMM và né (hoặc không đóng góp) pot.
5. **Dust 5 bps**: `fee=0` nhưng `volU` vẫn cộng points nếu `volU>0` (points không phụ thuộc fee > 0).
6. **Admin `SetFeeShareBps(0)`**: pot tương lai = 0; 100% protocol ugnot vào `AccruedProtocolU`.

### 3.4 Missed-epoch loss

`maybeRollEpoch`: khi `height >= epochEnd`, **ghi đè** `closedPot` / `closedPts` / `closedID`. Pot epoch trước không roll. `ugnot` đã vào pot cũ mà chưa `ClaimFeeShare` **kẹt trong realm** — không trả `AccruedProtocolU`, không cộng epoch sau.

`syncScore`:

- `EpochID == epoch` → no-op.
- `EpochID == closedID` → `Closed = Epoch` (cửa sổ claim = đúng 1 epoch vừa đóng).
- else → **`Closed = 0`**.

Hệ quả:

- Claim được **duy nhất** epoch liền trước, và chỉ nếu `Score` còn `EpochID == closedID` hoặc đã sync trong epoch đang mở.
- Bỏ qua **cả** epoch N+1 (không claim, không swap, không harvest): lúc epoch N+2, `EpochID` không khớp `closedID` → `ClaimableFeeShare` = 0, `ClaimFeeShare` panic `"zdex: no epoch points"`.
- Gọi bất kỳ `addPoints` sau khi đã skip >1 epoch sẽ `syncScore` xóa `Closed` trước khi cộng điểm mới.
- LP không `HarvestPoints` trong cửa sổ: điểm LP chưa vào `Score.Epoch` của epoch volume — harvest muộn đổ hết vào epoch khác (mục 3.3).

Default cửa sổ ≈ 28800 block. Không có reminder on-chain.

---

## 4. Ba mục ship kinh tế tiếp theo (xếp hạng)

Không đề xuất launchpad / bonding-curve / mở lại `Launch`. Không đổi live param (`feeShareBps`, `epochBlocks`) nếu chưa có human yes.

### 1. Cửa sổ claim 2 epoch + roll unclaimed `closedPot`

**Vì sao:** `ugnot` unclaimed đang chết trong realm; user miss 1 ngày là mất share. Đây là lỗ kế toán, không phải “skin in the game”.

**Làm:** giữ `prevClosed*` thêm một generation; `ClaimFeeShare` nhận `closedID` hoặc `prevClosedID` nếu chưa claim. Unclaimed khi trượt khỏi cửa sổ **cộng vào `epochPot` đang mở** (hoặc trả `AccruedProtocolU` — chọn một, ghi rõ).

**Tradeoff:** thêm state; pot epoch sau bị pha bởi người không claim (roll) *hoặc* protocol nhận windfall (trả admin). Roll thì trader chậm vẫn lấy được, admin chậm thu. Không roll thì công khai “protocol giữ dust” để `zdex-trust` không nói “80% luôn về user”. User harvest trễ vẫn game epoch (mục 3) — fix này **không** đóng harvest-delay.

### 2. Fee + points trên `FillOrder` (cùng `splitFee` với pool)

**Vì sao:** book đang là đường 0-fee song song AMM. Volume lớn sẽ né LP và pot. Escrow vẫn đúng; thiếu fee.

**Làm:** taker trả `feeBps` pool (hoặc tier taker riêng ≤ `maxFeeBps`); `splitFee` + `creditSwapPoints` với `volU` = nhánh ugnot. Maker 0 hoặc rebate từ phần `lp` — **không** mint token rebate.

**Tradeoff:** fee cao → book chết, chỉ còn AMM. Fee 0 với maker / thấp với taker thì vẫn lệch vs AMM 30 bps. Phải quyết định fill **không** được xuyên `SpotPrice` quá một bound (không phải launchpad — chỉ khớp book vs pool). JIT LP không áp book. Test: `TestLimitOrderBidFill` hiện 1000 ugnot ↔ 10 token, 0 fee — phải đổi kỳ vọng.

### 3. Gắn LP points vào epoch **lúc volume xảy ra**

**Vì sao:** `AccPoints` đã công bằng theo thời điểm hold; sai ở chỗ `addPoints` gán epoch lúc harvest. Pot-snipe bằng harvest trễ.

**Làm (chọn một):**

- A. `ClaimFeeShare` / `maybeRollEpoch` harvest mọi `Position` của caller — cần index `owner → []poolID` (hiện key `poolID/owner` một chiều).
- B. Checkpoint `AccPoints` theo `epoch` trên pool (đắt storage).
- C. Tách “LP fee-share points” khỏi `Life` volume: LP không vào `epochPts` trừ khi harvest trong cùng epoch với volume — product phải hiện countdown.

**Tradeoff:** A rẻ nhất, vẫn miss nếu user không gọi gì trong epoch. B đúng nhất, nặng realm. C dễ giải thích, dễ hiểu nhầm “no-stake” nếu UI bắt harvest. Không làm gauge / vote.

Không xếp hạng: đổi `poolProtocolFeeBps`, thêm creator cut CreatePool, emission token, hay “APR boost”.

---

## 5. Không copy từ Pump.fun / ve(3,3)

### Pump.fun — không đưa vào DEX này

- Bonding-curve → graduate lên AMM như **sản phẩm**. `maybeGraduate` chỉ `VirtualU=0` khi `ReserveU >= VirtualU` trên pool **legacy**. Không phải pad, không fee graduate, không king-of-the-hill.
- Creator revenue từ listing spam (fee creator làm động cơ mint). CreatePool đã `CreatorBps=0`. Giữ vậy.
- Keep unlock ngay / không vest. Launch legacy đã `maxCreatorKeepBps=2000` + vest; **đừng nới**.
- Social feed, reply-to-earn, fee stream về creator như prize. zdex là singleton DEX, không memecoin mill.

### ve(3,3) — không đưa vào points

- Vote-escrow lock protocol token, gauge, bribe, rebase locker. zdex **không có** token protocol. `Score` là struct trong `avl.Tree`, không transfer.
- Emission lạm phát để “flywheel”. Fee-share zdex là **ugnot protocol thật** (80% của ~1/6 fee buy). Đừng mint điểm thành GRC20.
- Voters điều hướng reward tới pool. Sẽ biến `CreatePool` thành wars; LP no-stake v2 chết.
- `(3,3)` rebase / penalty unlock / NFT ve. Phức tạp, gameable, không khớp `OriginSend` ugnot.

Points giữ: volume + LP AccPoints, claim ugnot, `Life` không transfer. Public copy: `web/src/i18n.ts` — *"Holding LP earns swap fees. No staking required"* / *"80% of protocol GNOT fees are shared each epoch"* — đúng CreatePool, **sai** nếu áp cho Launch (LP seed 50% fee, creator 40%) hoặc nếu user hiểu 80% của **toàn bộ** swap fee (thật ra 80% của phần protocol, ≈ 4 bps trên tier 30).

---

## Tham chiếu nhanh

| Mục | File / hàm |
|---|---|
| Tier 5/30/100, 1667, 8000, Launch 4000/1000 | `gno.land/r/zdex/v2/types.gno` |
| `splitFee`, wrapper AMM | `gno.land/r/zdex/v2/math.gno` |
| CPMM + `MulDiv` overflow-safe | `gno.land/p/zdex/amm/v1` `MulDiv` / `AmountOut` / `AmountIn` |
| CreatePool, LP no extra stake | `pool.gno` `CreatePool` / `AddLiquidity` / `RemoveLiquidity` |
| Swap, snipe, quote | `swap.gno` `Quote` `QuoteIn` `SwapExactIn` `SwapExactOut` `assertSnipe` |
| Pot 80%, harvest, claim, miss epoch | `points.gno` `creditSwapPoints` `harvestLP` `syncScore` `ClaimFeeShare` `maybeRollEpoch` |
| Launch legacy | `launch.gno` `Launch` `ClaimVest` |
| Buckets | `admin.gno` `CollectFees` |
| Book 0 fee | `book.gno` `FillOrder` |
| Caps `feeShare;noStakeLp` | `upgrade.gno` `defaultCaps` |
| APR UI (mô tả) | `web/src/lib/amm.ts` `lpFeeAprPct` |
