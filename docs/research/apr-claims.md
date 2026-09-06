# APR / incentive labels — English UI

Seat: `zdex-trust`. Not a legal opinion. Not investment advice. Does not ship `web/`.

**Surface:** Pools / Liquidity / Portfolio numbers for LP swap-fee APR and the incentives sidecar.  
**Supersedes** informal “APR” on pool cards for this topic. Guide copy stays in `docs/research/ui-guide-claims.md`. Footer still in `trust.md` / Guide footer.

Nguồn số: `web/src/lib/amm.ts` `lpFeeAprPct`, `web/src/i18n.ts`, `gno.land/r/zdex/incentives/v1` (`Fund` / `Claimable` / `GaugeSnapshot`), `deploy/pearl/fund-zdex.ps1` (`FundU=100000000`). Không bịa duration / `rewardPerBlock` — Pearl v1 **không** emit theo block.

Product (`zdex-product`) **phải** dùng đúng chữ English ở §2–§3. Growth không annualize gauge. Không đụng copy `gnomi.fun`.

<!-- product (one-line): i18n.feeApr = "Fee APR (24h est.)"; Markets.tsx card must not say bare "APR"; never annualize Gauge.totalFunded. -->

---

## 0. Hai lớp — không gộp một số

| Lớp | Chỗ | Cơ chế | Được hiện số? |
|---|---|---|---|
| **1. LP swap fee** | v2 pool reserve | Trailing **24h** volume × fee × LP share / GNOT reserve, ×365 | Có, chỉ với label §2.1 |
| **2. Gauge extra** | sidecar `incentives/v1` | `Fund` rời rạc `ugnot` (`OriginSend`). Acc per LP. Không `rewardPerBlock` | Có, **không** phải APR. Label §2.2 |

Lớp 1 **không** gồm lớp 2. Pill `Incentivized` cạnh một số “APR” = user đọc thành farm APR. **Cấm.**

Không custody: user ký Adena; `ugnot` vào pool / gauge bằng `OriginSend` trong cùng tx. zdex không hold keys.

---

## 1. Testnet disclosure (mọi chỗ có số)

Public UI default = Gno.land **Pearl testnet** (`pearl-1`). Testnet GNOT và mọi token trên app **no monetary value**.

Bắt buộc gần số APR / boost / claimable (banner, hint, hoặc cùng card — footer một mình **không** đủ nếu số trông như sản phẩm):

**Allowed (đúng chữ, hoặc cùng fact):**

> Not financial advice. Pearl is a testnet.

> Testnet tokens have no value. This figure is not a return.

Giữ `nfaPearl` / `guide.banner` / `gaugeHint` (“Not financial advice.”). Không gọi faucet GNOT là tiền thật. Không “mainnet soon” cạnh APR.

---

## 2. Allowed English UI labels

Chỉ các chuỗi dưới. Không gắn “earn”. Không đổi APR → APY. Không bịa kỳ hạn.

### 2.1 LP fee (lớp 1)

| Label (English, đúng chữ) | Khi nào | Số |
|---|---|---|
| **Fee APR (24h est.)** | Cột / meta Pools, Liquidity card | `lpFeeAprPct` hoặc **—** |
| `Fee` | Tier 0.05% / 0.30% / 1.00% | `feeBps / 100` + `%` — **không** phải APR |
| `24h volume` | Cùng hàng với fee APR | `volumeU` GNOT |

**Allowed hint (tooltip / Guide, không phải headline):**

> Fee APR (24h est.) annualizes the LP share of swap fees from recent 24h volume. It is not guaranteed. Volume can be zero.

Công thức (`amm.ts`; mô tả, không cam kết):

```
tvl = reserveU
vol = volumeU          // 24h, có thể 0
fee = feeBps / 10000
lpShare = launched ? 0.5 : (10000 - 1667) / 10000   // CreatePool ~5/6
pct = (vol * fee * lpShare) / tvl * 365 * 100
```

`tvl == 0` hoặc `vol == 0` → **không** ra số. UI: `—`. Không `0.0%` như “pool không earn”.

CreatePool: protocol ~1/6 (`ProtocolBps = 1667`), LP ~5/6, **không** extra stake (`noStakeHint`). Legacy `Launched`: LP share 50% fee — cùng label “Fee APR (24h est.)”, không hai sản phẩm.

**Cấm** trên lớp 1: `APY`, `Fee APY`, bare `APR` (thiếu “Fee” + “24h est.”), `estimated APY`, `current yield`.

### 2.2 Gauge / incentive (lớp 2) — Pearl v1 lump-sum

`Fund` là một lần `OriginSend`. Không cửa sổ, không emission/block. `Claimable(poolID, owner)` = pending checkpoint (`LastLP` / `LastAcc`). Remove LP trước Claim → forfeit.

| Label (English, đúng chữ) | Khi nào | Số |
|---|---|---|
| **Pending rewards** | Accrued `ugnot` chưa Claim / chưa Sync ra | `Claimable` → GNOT. `0` thì ẩn hoặc `—` |
| **Program** | Tên hàng / heading cho Fund trên pool | Không gắn %. Copy: extra ugnot program. Không “yield program” |
| **Boost vs TVL** | Tỷ lệ snapshot funded / GNOT reserve | `totalFunded / reserveU`, **một lần**, không ×365 |
| **Claimable** | CTA / Portfolio / query sidecar | Cùng `Claimable()`; đơn vị GNOT, không `%` |

Giữ (đã khóa `i18n.test.ts`):

- `gaugeHint`: “Extra ugnot gauge. Does not replace LP swap fees. Not financial advice.”
- `fundGauge` / `claimIncentive` / `syncGauge` / `incentivized` / `gaugeFunded` — **không** chứa APY
- `Incentivized` = pill “có gauge On”, không phải “APR boosted”

**Allowed Boost vs TVL hint:**

> Boost vs TVL is funded ugnot divided by current GNOT reserve. One-shot. Not APR. Not a return.

`reserveU == 0` hoặc chưa `Fund` → `—`. Không `Infinity%`.

**Allowed Program copy:**

> Program: extra ugnot funded on this pool’s gauge. It does not replace LP swap fees or the epoch pot.

Không: “emissions”, “farm”, “boosted yield”, “stake LP to earn”.

### 2.3 CTA / đơn vị được

`Claim`, `Claim incentive`, `Sync position`, `Fund gauge`, `Amount (GNOT)`, `Gauge funded` + số GNOT. Đơn vị **GNOT / ugnot**, không USD, không APY.

Points (`Claim fee share`, `Harvest LP points`) **không** đổi thành Pending rewards. Epoch pot ≠ gauge.

---

## 3. Forbidden (không gần đúng)

Không nói, không tooltip, không alt, không meta, không gnoweb. Trust **không** soften.

| Cấm | Vì sao |
|---|---|
| **APY** / Fee APY / “APY (24h)” | Không có compounding product. `feeApr` ≠ APY. `i18n.test.ts` khóa gauge không chứa APY |
| **Guaranteed** / “earn X%” / fixed yield | Volume, Fund, pot đều có thể 0. Fee APR là est. |
| **Risk-free** / “safe LP” / “no IL” | CPMM; IL và testnet mất hết là thật |
| **“Real yield”** / real-yield / “organic APY” | Fee là mechanics. Gauge là extra ugnot. Không promise |
| **1000% APR** (và mọi APR annualize từ `Fund`) | §4. Lump-sum **không** có kỳ hạn để ×365 |
| Gộp fee APR + gauge thành một “APR” / “pool APR” | Hai lớp. Pill `Incentivized` không được đứng cạnh bare `APR` |
| `rewardPerBlock` APR / emissions APR | Pearl v1 emission = 0 / block |
| Gauge như guaranteed income | Ngừng `Fund` → extra = 0. Lớp 1+2 v2 không đổi |
| Points = APR / airdrop | Ledger. Không token |
| Testnet token có giá cạnh số | Pearl **testnet** |

Từ cấm (headline, pill, chart): *APY, guaranteed, risk-free, real yield, 1000% APR, farm APR, boosted APR, emissions, earn X%.*

---

## 4. Pearl v1 — 100 GNOT trên 300 GNOT TVL ≠ 1000% APR

**Critical.** Không làm dịu.

Worked example (Pearl `incentives/v1`, pool ví dụ `ugnot|ZDEX`):

| Input | Giá trị | Nguồn |
|---|---|---|
| Lump-sum `Fund` | **100 GNOT** (`100000000` ugnot) | `deploy/pearl/fund-zdex.ps1` |
| TVL (GNOT reserve) | **300 GNOT** | ví dụ `reserveU` — snapshot, không target |
| Duration / `rewardPerBlock` | **không có** | `Fund` rời rạc; `GaugeSnapshot` = id;acc;funded;on;paused |

**Allowed:**

| Label | Số |
|---|---|
| Gauge funded | 100 GNOT |
| Boost vs TVL | 100 / 300 = **33%** (làm tròn 33% hoặc 33.3%; không 1000%) |
| Pending rewards / Claimable | ugnot từ `Claimable()`, thường ≪ 100 GNOT (share LP + burn 1000 + chưa Sync) |
| Program | “Extra ugnot gauge” — không % |

**Forbidden — cùng input:**

```
naive 24h-as-year:  (100 / 300) * 365 * 100  ≈  12,167%
short-window trick: (100 / 300) * (365 / ~12.2) * 100  ≈  1000% APR
```

Trick: lấy boost một lần ~33%, giả chương trình kéo ~12 ngày rồi lặp cả năm → **1000% APR**. Pearl v1 **không** có cửa sổ 12 ngày. **MUST NOT** hiện `1000% APR`, `~1000%`, `1000% APY`, hay `APR` nào từ `totalFunded`.

Cũng cấm: `(100/300)*365` trên card; cộng 33% vào Fee APR; cap `999%+` để giấu 12,167%. Không số → `—` + `Gauge funded 100 GNOT`.

TVL 300 GNOT là **snapshot** testnet. Không “deep liquidity”. Không TVL target.

---

## 5. Swap / listing / fee copy (review)

Growth/product sửa theo bảng. File này không ship UI.

| Copy | OK? | Trust |
|---|---|---|
| `createHint`: list existing GRC20; protocol ~one-sixth | Được | Giữ **list**. Không “launch your coin” |
| `swapHint`: GNOT attached; internal tokens no approval | Được nếu không rút | External GRC20 vẫn Approve. Cấm “no approval needed” cho mọi token |
| `noStakeHint`: “Holding LP earns swap fees. No staking required.” | Được | “Earns” = share phí đã thu. Không gắn %/năm |
| `feeApr`: hiện `"Fee APR"`; card Markets: bare `APR` | **Không đủ** | Đổi label → **Fee APR (24h est.)**. Card không được `APR` trần cạnh `Incentivized` |
| `gaugeHint` extra ugnot, not financial advice | Được | Không thêm APR |
| `pageSub.pools`: “Live markets and liquidity.” | Được | `i18n.test.ts`: không chứa `APR` |
| Internal mint / listed ticker | Không rút | Internal ledger ≠ “zdex issues every meme”. Permissionless `CreatePool` vẫn **user-signed** Adena |
| `Launch` | Không dạy | Legacy. Listing path = `CreatePool`. Permissionless mint nội bộ (nếu còn) vẫn user-signed, không phải zdex phát hành |

Fee split không gộp:

- CreatePool: `ProtocolBps = 1667` (~1/6), creator 0, LP remainder ~5/6.
- Legacy `Launched`: fee 1%, creator 4000 bps của fee, protocol 1000 bps, LP ~50%.

---

## 6. Check chéo UI hiện tại (không sửa trong pass này)

| Chỗ | Hiện | Bắt buộc |
|---|---|---|
| `i18n.ts` `feeApr` | `"Fee APR"` | `"Fee APR (24h est.)"` |
| `Markets.tsx` card meta | `APR {n}%` cạnh pill Incentivized | Cùng label §2.1; không bare `APR` |
| `Markets.tsx` / `Liquidity.tsx` cột | `d.feeApr` + `lpFeeAprPct` | Label mới; `—` khi null |
| `GaugePanel.tsx` | `Gauge funded` + GNOT; Claim GNOT | Được. Thêm Pending rewards / Claimable / Boost vs TVL **không** annualize |
| Guide | Không bán APR | Giữ. Trailing 24h est. nếu bắt buộc nhắc |

`web/src/i18n.test.ts`: gauge copy không `APY`; `pageSub.pools` không `APR`. Không regress. Thêm test: `feeApr` khớp `"Fee APR (24h est.)"`; không `APY` / `guaranteed` / `risk-free` / `real yield`.

---

## 7. Việc file này không làm

- Không ký tx, không Fund, không Claim, không faucet, không broadcast.
- Không hứa return / APY / 1000% APR.
- Không soften Critical (§4; card bare `APR` + Incentivized).
- Không viết tweet. Không đụng gnomemepad / gnomi.fun.
- Không ship `web/` — một dòng comment product ở đầu file.
- Không đổi `lpFeeAprPct` (công thức mô tả). Product chỉ đổi **label** và **không** áp dụng công thức đó lên `totalFunded`.
