# So sánh Uniswap · GnoSwap · Zdex live

Status: research. Không deploy. Không addpkg. Không sửa realm live.
Không overwrite `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`.
Không phải lời khuyên đầu tư. Không “Uniswap-equivalent”.

Ba cột: **Uniswap** (v2 CPMM + v3 concentrated liquidity + v4 hooks như
một family), **GnoSwap** (CL Uniswap-v3-style trên Gno), **Zdex live**
(Pearl generation v2 + sidecar). zSwap chỉ là nguồn cảm hứng README,
không phải cột thứ tư.

Nguồn Zdex: `docs/research/next-inherit.md` §3, `economics.md`,
`hooks-gno.md`, `trust.md`, `lp-apr.md`; skill `zdex-company`;
`gno.land/r/zdex/v2/types.gno` (`minLiquidity=1000`, fee 5/30/100,
`poolProtocolFeeBps=1667`); `gno.land/p/zdex/amm/v1` `MulDiv`.
Nguồn GnoSwap: [docs.gnoswap.io](https://docs.gnoswap.io/) (fees, CL,
GNS, launchpad, FAQ wrap/router/positions), GitHub `gnoswap-labs/gnoswap`
(pool README: “Uniswap V3-style”). Nguồn Uniswap: whitepaper v2/v3 +
v4 hooks / flash accounting (xem `hooks-gno.md` §2).
Live Pearl: qeval `pearl-1` 2026-09-13 (session này). UI
https://zdex-gno.netlify.app.

---

## 0. Kết luận ngắn

GnoSwap **đã** chiếm niche “Uniswap v3 on Gno”: ticks, NFT position,
router, wrap `wugnot`, token GNS, stake position, launchpad.
Uniswap family thêm v4 hooks + flash accounting — **cấm** copy 1:1 lên
Gno (`hooks-gno.md`).

Zdex **cố ý** khác: native `ugnot` `OriginSend`, listing `CreatePool`
DEX-only, CPMM full-range no-stake, escrow book **trong cùng** pkg,
farm = sidecar inherit. Live Pearl: **một** pool `ugnot|ZDEX`
300 GNOT. Không invent pool thứ hai.

**Next ship:** không CL, không DEX v3, không GnoSwap-copy.
Item kế tiếp = **W2.2 book density (B)** trên `web/` — surface Uniswap
và GnoSwap không có. Fund/FundProgram **không** vào Pearl
`incentives/v2`. Chi tiết §8.

---

## 1. Mỗi bên là gì

**Uniswap** là family AMM trên Ethereum (và L2 EVM). v2 là CPMM
`x*y=k`, LP ERC-20 full-range, fee 0.30% ở lại pool, `MINIMUM_LIQUIDITY`
= 1000 burn. v3 thêm concentrated liquidity (ticks, NFT position, fee
tier 0.01/0.05/0.3/1), fee **không** auto-compound vào k. v4 gộp
PoolManager singleton + hooks (CREATE2 address flags, `hookData`,
return-delta, flash accounting EIP-1153). Quote = WETH / ERC-20. Wallet
= MetaMask / wagmi. Listing = factory `CreatePair` / `initialize`. Farm
nằm ngoài (MasterChef, merkl). Không escrow book native.

**GnoSwap** là DEX concentrated-liquidity trên Gno.land, pool README
ghi “Uniswap V3-style”. LP chọn range (Active / Passive / Custom),
position = GRC-721 NFT; fee swap 0.01/0.05/0.3/1% **claim riêng** (không
reinvest vào k). Auto Router multi-hop. Quote chính = GNS
(`gno.land/r/gnoswap/gns`); native GNOT phải wrap `wugnot` vì pool chỉ
giữ GRC-20. Protocol fee: router 0.15% notional, tạo pool 100 GNS,
rút fee LP 1%, unstake 1% — 100% về xGNS staker. Launchpad “lossless”:
lock GNS vào xGNS, yield protocol chuyển team, principal GNS giữ.
Liquidity mining: **stake** position NFT (warm-up). Wallet Adena.

**Zdex live** là singleton DEX trên Gno Pearl testnet, lấy cảm hứng
zSwap rồi viết lại primitive Gno — không clone EVM (`README.md`,
`zdex-company`). Quote = native `ugnot` qua `OriginSend` / banker
push-only; **không** wrap. Listing product = `CreatePool` (two-sided,
min 1 GNOT, `CreatorBps=0`); `Launch` legacy, ẩn UI. CPMM full-range
`MulDiv`; LP shares trong pool, cap `noStakeLp`. Fee tier 5/30/100 bps;
protocol skim ~1/6 (`1667`), LP ~5/6 vào k. Escrow bid/ask **cùng**
package v2. Farm = sidecar, không stake LP để lấy swap fee. Hub
`Version` / `Caps` / `NextPkg` / `Modules`. UI English Adena:
https://zdex-gno.netlify.app.

---

## 2. Bảng so sánh

| | Uniswap (v2 + v3 + v4) | GnoSwap | Zdex Pearl live |
|---|---|---|---|
| **AMM math** | v2 `x*y=k` full-range. v3 ticks `p(i)=1.0001^i`, L trong `[Pa,Pb]`. v4 curve có thể **hook thay** (AsyncSwap / return-delta) | CL Uniswap-v3-style: cùng công thức `k=L²=(x+L/√Pb)(y+L√Pa)`, tick 1 bps default | CPMM full-range `AmountOut` / `geoMean` (`gno.land/p/…/zdex/amm/v1`). Live `virtualU=0`. **Không** tick trên pool đang sống |
| **Quote asset** | WETH / ERC-20. Native ETH wrap | GNS là primary quote. GNOT → `wugnot` (FAQ: pool chỉ GRC-20) | Native `ugnot` `OriginSend`. Cấm wrap / `wugnot` |
| **Listing** | Factory pair / `initialize`. Permissionless ERC-20 | `CreatePool` permissionless; **100 GNS** creation fee. Launchpad GNS lock riêng | `CreatePool` DEX-only, min `1_000_000` ugnot, fee 5/30/100. `Launch` legacy không expose UI |
| **LP model** | v2: ERC-20 shares, fee vào k, no extra stake. v3/v4: NFT range, fee `tokensOwed`, collect riêng | NFT position + **stake** NFT để farm (warm-up). Collect fee; withdrawal fee 1% | `Position.LP` shares trong pool. Seed `geoMean − minLiquidity(1000)` burn. Cap `noStakeLp`. Không NFT, không stake để lấy swap fee |
| **Fees** | v2 30 bps vào k; `feeTo` ≈ 1/6 √k. v3/v4: 1/5/30/100 bps, LP claim; protocol tuỳ governance | Swap 1/5/30/100 bps (claim). **Thêm** router 0.15% notional, 100 GNS create, 1% withdraw, 1% unstake → xGNS | CreatePool: trader `feeBps`; `ProtocolBps=1667` (~1/6) skim; LP remainder ~8333/10000 vào k. 80% protocol **ugnot buy** → epoch pot (`economics.md` §1). `FillOrder` **0** AMM fee |
| **Orders** | Không native (limit = hook / aggregator) | Không (DEX + router) | Escrow `PlaceBid` / `PlaceAsk` / `FillOrder` **trong** v2 (`book.gno`). Bid lock GNOT; ask lock token |
| **Farm** | Ngoài protocol (MasterChef, merkl) | GNS emission + external incentive trên **staked** position. Launchpad redirect xGNS yield | Sidecar. v1 lump 100 GNOT Acc (cấm APR). v2 **chết** (overwrite Remaining). v3/v4 empty. Không MasterChef. Không ve-token |
| **Upgrade** | Proxy / CREATE2 / new factory | Nhiều realm (`pool` / `router` / `staker` / `gov` / `version_manager`) | Immutable path. Hub `Version=2`, `NextPkg=""`, `Caps` không có `incentives`. Surface mới = sidecar hoặc generation **mới** |
| **Wallet** | MetaMask, wagmi, EIP-1193 | Adena | Adena / GnoConnect. **Không** wagmi. Keplr không `MsgCall` |
| **Network** | Ethereum + L2 EVM, mainnet tiền thật | Gno.land (GnoSwap docs / `gno.land/r/gnoswap/…`) | Public UI default **Pearl testnet** `pearl-1`. Testnet GNOT faucet, no-value (`trust.md`) |

Live Pearl — **không** bịa pool (qeval session này):

| Path | Việc | State |
|---|---|---|
| `…/p/…/zdex/amm/v1` | Pure math | Live, immutable |
| `…/r/…/zdex/v2` | DEX hub | `Version=2`. `NextPkg=""`. `PoolList` = `ugnot\|ZDEX` **một** pool |
| `ugnot\|ZDEX` | `PoolInfo` | `reserveU=300_000_000` (300 GNOT), `reserveT=300_000_000_000`, `virtualU=0`, `totalLP=9_486_545_040`, `feeBps=30` |
| `…/incentives/v1` | Lump gauge | `Version=1`. `TotalFunded=100_000_000` (100 GNOT). Acc=`10_541_245`. `On=1`. **Không** `rewardPerBlock` |
| `…/incentives/v2` | Overwrite Remaining | Live path, `GaugeSnapshot` empty. **Cấm Fund** |
| `…/incentives/v3` | `FundProgram` stack Remaining | `Version=3`. Empty `0;0;0;0;0;0;0` |
| `…/incentives/v4` | SweepDust generation (empty) | `Version=4`. Empty. Không Fund vào đây khi v3 Remaining=0 (`next-inherit.md` W2.6) |
| `…/oracle/v1` | Ping TWAP ring | `Version=1`. `DexPkg` = v2. `SampleCount("ugnot\|ZDEX")=0` — sidecar **sống**, ring trống, không AfterSwap |
| `…/token` | GRC20 ví dụ | Live, không phải AMM |
| UI | https://zdex-gno.netlify.app | English, Adena, default Pearl (`README.md`, `web/config.js`) |

`HubSnapshot()`:

```text
2;gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2;;swap;lp;create;book;points;quote;feeShare;noStakeLp
```

`Caps()` không có `incentives`. `SetModule("incentives")` trên v2 panic
(`upgrade.gno` `validModule`).

---

## 3. Zdex thừa kế Uniswap gì — và từ chối gì

### 3.1 Thừa kế (v2 shape trên Gno, không phải port)

| Ý Uniswap | Chỗ Zdex | Cite |
|---|---|---|
| No-stake LP: hold share là earn fee, không farm-stake | Cap `noStakeLp`; `AddLiquidity` → remainder vào k | `types.gno`; `economics.md` §2; `upgrade.gno` `defaultCaps` |
| Fee vào k (v2), không `tokensOwed` NFT | `splitFee` → `lp` vào `Reserve*` | `math.gno` `splitFee`; `swap.gno` |
| Protocol ~1/6 khi `feeTo` on (v2) | `poolProtocolFeeBps=1667` ≈ 1/6 **của swap fee**, skim ngay (không mint LP pha loãng) | `types.gno`; `economics.md` §1.1 |
| Fee tiers 5 / 30 / 100 bps (ý v3, **curve vẫn v2**) | `feeTierLow/Mid/High`; `validSwapFee` | `types.gno` |
| `MINIMUM_LIQUIDITY = 1000` burn | `minLiquidity=1000`; `lpUser = geoMean − 1000` | `pool.gno` `CreatePool` |
| JIT LP quanh một swap | Cùng mechanic v2; AccPoints theo `TotalLP` lúc swap | `economics.md` §2.3 |
| Exact-in / exact-out | `SwapExactIn` / `SwapExactOut` live v2 | `swap.gno` |

Khác cơ chế dù cùng tỷ lệ 1/6: Uniswap v2 `feeTo` mint LP từ tăng trưởng
`√k`; Zdex **skim** protocol ra `AccruedProtocol*` / `epochPot` trước khi
phần LP vào reserve (`economics.md` §2 bảng). Depth mỏng hơn v2
`feeTo=off`.

### 3.2 Từ chối — không copy lên live pool / v2

| Ý Uniswap | Vì sao Zdex từ chối |
|---|---|
| Concentrated liquidity (v3 ticks, NFT) trên pool đang sống | Phá k full-range, phá Acc v1, phá `Quote`. Gno **không** cấm math tick trên realm **mới**; product **cấm** gắn lên `ugnot\|ZDEX` (`next-inherit.md` §5, W2.8) |
| Uniswap v4 hooks 1:1 | **Cấm.** Không `func()`, không stored `IHooks`, không `hookData`, không return-delta, không CREATE2 flags (`hooks-gno.md` §1–4) |
| Wrap ETH / WETH | Zdex quote native `ugnot`. Wrap = GnoSwap path. `zdex-company`: no wrap / `wugnot` |
| Flash / flash accounting / `take`/`settle` | Impossible / dangerous: không EIP-1153; OriginSend một envelope; banker push-only |
| Factory clone / CREATE2 pair | Gno pkg path = identity. Pair model `ugnot\|SYMBOL` một symbol một pool |
| Multi-hop router | Hop 2 cần pool khác-GNOT — **chưa có**. Single-hop |
| ve-token / gauge vote | Product cấm — biến `CreatePool` thành wars, phá `noStakeLp` |
| `Launch` như Pump / Uniswap không có pad; Zdex pad là **legacy** | Listing mới = `CreatePool` only |

Hooks **làm được** trên Gno (không phải 1:1): `/p/` types + `/r/` hook
realm allowlist + `cross(cur)` AfterSwap observe-only. Oracle live là
**Ping sidecar** (`…/oracle/v1`), không nằm trong `SwapExactIn` v2.
`SampleCount=0` hôm nay.

---

## 4. GnoSwap có — Zdex không — **cấm copy lên v2**

GnoSwap gần Uniswap v3 hơn Zdex. Đó là sản phẩm **khác**. Copy lên
bytecode v2 = phá inherit (path immutable, một pool full-range, Acc v1
indexed `TotalLP`).

| GnoSwap có | Zdex live | Copy lên v2? |
|---|---|---|
| Concentrated liquidity + ticks + range UI | Full-range CPMM | **Không.** Realm mới + pool id mới, không tuần này |
| NFT GRC-721 position | `Position` struct trong AVL | Không. Share v2 không migrate thành NFT |
| Auto Router multi-hop / split route | Single hop `ugnot\|SYMBOL` | Không. Chưa có pair khác-GNOT |
| Wrap `wugnot` | `OriginSend` native | **Không.** Inverse của product |
| GNS quote + emission + xGNS | Không token protocol. Points = `Score` không transfer | **Không.** `economics.md` §5 cấm ve(3,3) / mint điểm |
| Stake position để farm (warm-up) | Sidecar đọc `PositionOf`; swap fee **không** cần stake | Không MasterChef. Fee LP đã no-stake |
| Launchpad lock GNS “lossless” | DEX-only. `Launch` legacy ẩn | **Không** pad / bonding-curve listing mới |
| Protocol fee 0.15% router + 100 GNS create + 1% withdraw/unstake | ~1/6 **của** swap fee; CreatePool 0 GNS listing fee (seed ≥ 1 GNOT) | Không thêm GNS tax lên v2 |
| Swap callback / Uniswap-v3 flash-swap style | Sync `SwapExactIn`; banker push | **Không.** Class 4 `func()` + flash cấm (`hooks-gno.md`) |
| TWAP **trong** `Swap` pool | Oracle Ping sidecar, ring trống; không feed `AmountOut` | AfterSwap auto = DEX generation **mới**, không vá v2 |
| Governance xGNS | Admin two-step trên hub; `NextPkg=""` | Không ship ve |

Zdex **không** cạnh tranh GnoSwap bằng cách trở thành GnoSwap.
Public copy: native GNOT AMM + escrow; không CL / APY / launchpad
(`ui-guide-copy.md`).

---

## 5. Zdex unique

Bốn điểm Uniswap family và GnoSwap **không** ghép cùng lúc:

1. **`OriginSend` ugnot.** Buy / seed / bid gắn native trong cùng
   MsgCall. `IsUserCall` + envelope exact. Không wrap, không WETH
   unwrap refund phức tạp (OpenZeppelin GnoSwap audit: wrap/unwrap
   confusion). Banker **push-only**.
2. **Escrow book cùng pkg.** `orders` AVL cạnh `pools`.
   `SetModule("book", other)` **tách sổ** — UI không làm.
   `FillOrder` 1-1, 0 AMM fee, 0 points (`economics.md` §1.4).
3. **Sidecar inherit.** Farm / oracle **không** `import` vào
   `SwapExactIn`. v2 không giữ `ReserveU` của gauge. Path = identity:
   v1 lump 100 GNOT đứng mãi; v3 `FundProgram`; v2 farm **chết**;
   oracle Ping opt-in. Hub `Version` / `Caps` / `NextPkg` / `Modules`
   là bảng UI, không vtable VM (`upgrade-modules.md`).
4. **DEX-only, no launchpad.** `CreatePool` list GRC20 đã có.
   Không GNS mill, không “lossless” pad, không zdex phát hành meme.
   Internal mint = in-realm ledger của **package đó**.

Cộng: `MulDiv` overflow-safe trên `int64`; `Render` + `<gno-form>`;
points volume + AccPoints, 80% protocol ugnot buy → epoch pot — **không**
là token.

---

## 6. Trust

Không nói, không tweet, không ẩn trong UI (`trust.md`):

| Cấm | Vì sao |
|---|---|
| “Uniswap-equivalent” / “Uniswap on Gno” / “Uniswap v3 on ZDEX” | CPMM Gno + OriginSend + escrow + sidecar. Không phải port |
| “GnoSwap-equivalent” / “better GnoSwap” | Sản phẩm khác (wrap, CL, GNS, pad, stake NFT) |
| APY / guaranteed yield / “earn X%” | Fee APR = trailing 24h **est.** (`lpFeeAprPct`). Lump v1 **cấm** annualize. Volume 0 → `—` |
| Mainnet / “live on Gno.land” thiếu **testnet** | UI public = Pearl `pearl-1`. Faucet GNOT = no-value |
| Airdrop / points = token | `Score` không transfer. Không GNS |
| Audited | `gno test` ≠ audit report |
| Promise migrate LP v2 → v3 / CL | Package immutable. User LP lại trên hub mới |

Câu được phép (cơ chế, không promo):

- Native `ugnot` AMM + escrow book on Gno.land.
- CreatePool lists a token. Launch is legacy.
- Holding LP earns swap fees. No extra stake.
- Protocol ~1/6 of the **swap fee**; LPs ~5/6.
- Pearl testnet — not mainnet. Not financial advice.

Ba lớp **không cộng** “Total APR” (`next-inherit.md` §4, `lp-apr.md`):

| Lớp | Live | UI |
|---|---|---|
| 1. LP swap fee | v2 `splitFee` → k | **Fee APR (24h est.)** từ volume off-chain |
| 2. Points + epoch pot | 80% protocol ugnot **buy** | Claimable sau epoch đóng. Không APY |
| 3a. Gauge lump | v1 100 GNOT | Claimable + Boost % of TVL. Cấm APR |
| 3b. Gauge program | v3 empty | Reward APR chỉ khi `RewardPerBlock>0` và height `< EndH` |

Boost v1 ≈ `100e6 / 300e6 * 100` ≈ **33% of GNOT TVL** already posted.
One-shot. Không phải Reward APR.

---

## 7. Feasibility trên Gno — Uniswap idea → Zdex shape

Map `hooks-gno.md` + `next-inherit.md` §5. Không clone EVM.

| Uniswap idea | Trên Gno / Zdex | Class |
|---|---|---|
| v2 CPMM no-stake k | **Đã live** v2 | — |
| v3 fee tiers trên v2 curve | **Đã live** 5/30/100 | — |
| v3 concentrated liquidity | Realm **mới**, pool id mới. Cấm inherit `ugnot\|ZDEX` | (C) / không trên live |
| v3 TWAP trong swap | Ping sidecar **đã addpkg**, ring 0. AfterSwap auto = DEX v3 + `HookPkg` | Ping = (A) live; auto = (C) |
| v4 hooks `func()` / flags / `hookData` / return-delta | **Cấm.** `/p/` interface **không** `cur realm`; `/r/` crossing + `cross(cur)`; allowlist compile-time; readonly taint; không persist `Observer` | Cấm 1:1 |
| Flash / EIP-1153 | Impossible. OriginSend một envelope | Cấm |
| Router multi-hop | Sidecar hoặc hub mới; cần pool khác-GNOT | (C) muộn |
| ve-token | VM cho phép sidecar; product cấm | Không ship |
| Limit orders | Escrow **đã** trong v2 | (B) density UI |

Panic cross-realm abort cả tx. Hook AfterSwap panic → swap revert.
Nested swap cần in-flight lock trên generation **có** hook — v2 không có.

---

## 8. Findings + next ship

### Findings

| # | Finding | Hệ quả |
|---|---|---|
| F1 | GnoSwap = Uniswap v3-on-Gno (CL, router, wrap, GNS, stake, pad) | Zdex **không** đi đường đó |
| F2 | Uniswap v4 hooks **không** port 1:1 | Observe-only + allowlist `/r/` + `cross(cur)` thôi |
| F3 | Zdex live = v2 CPMM + OriginSend + book + sidecar | Unique surface đã on-chain; gap là UI inherit, không math mới |
| F4 | Một pool `ugnot\|ZDEX` 300 GNOT; v1 lump 100 GNOT; v3/v4 empty; oracle Ping ring 0 | Không invent pool / APR / program đang chạy |
| F5 | Thừa kế Uniswap: no-stake k, tier 5/30/100, burn 1000. Từ chối: CL live, hooks 1:1, wrap | Giữ `noStakeLp` |
| F6 | `FillOrder` 0 fee song song AMM | Book density ≠ “book yield” |
| F7 | Hub v2 không có slot `incentives`/`hooks` | Farm/oracle = sidecar mãi cho đến DEX v3 **khi** cần AfterSwap / slot mới |

### Recommended next ship

**W2.2 (B) — book density trên `web/`.** Escrow đã live trong v2.
Uniswap không có; GnoSwap không có. Không addpkg. Không `SetNextPkg`.
Không `SetModule("book")` (tách sổ). Pool ZDEX đứng.

Cùng sprint, **không** lùi:

- `pkgForFunc(Fund*)` **hard-deny** path `…/incentives/v2` (Pearl v2
  overwrite Remaining). Ưu tiên v3 khi FundProgram; v4 SweepDust **không**
  nhận Fund khi Remaining v3 = 0.
- Claim/Sync **mọi** sidecar còn sổ (v1 100 GNOT bắt buộc).
- Exact-out đã wire `SwapExactOut` — không revert về `minOut=0`.

**Không** xếp: concentrated liquidity, Uniswap v4 hooks, wrap, GNS,
launchpad, DEX hub v3, `incentives/v4` Fund, AfterSwap trong bytecode v2,
multi-hop, ve-token.

Owner: `zdex-product`. Review copy: `zdex-trust`. Routing: `zdex-research`.
Không `zdex-protocol` realm cho item này.

Gate: `cd web; npm test`. Không `gno test` bắt buộc (B). Không broadcast.

Rollback: revert `web/`. AMM / Acc v1 / escrow không đổi.

---

## 9. Việc research này không làm

- Implement realm / `/p/` / UI.
- Overwrite Pearl v2 DEX, AMM v1, incentives v1–v4, oracle/v1.
- `SetNextPkg` / `SetModule` trên live v2.
- Promise APY, airdrop, Uniswap-equivalent, migrate LP.
- Invent pool ngoài `ugnot|ZDEX`.
- Mnemonic, raw `gnokey`, tweet.

---

## Tham chiếu

| Mục | Chỗ |
|---|---|
| Bảng bốn cột cũ (gồm zSwap) | `docs/research/next-inherit.md` §3 |
| Fee 1/6, no-stake, points, FillOrder 0 | `docs/research/economics.md` |
| Hooks ≠ v4 | `docs/research/hooks-gno.md` |
| Public claims | `docs/research/trust.md` |
| Fee APR vs lump | `docs/research/lp-apr.md` |
| Product DEX-only | skill `zdex-company`; `docs/COMPANY.md` |
| Gno primitives, Adena not wagmi | skill `gno-code`; `gno` `clients.md` |
| Live hub / pool / gauge | Pearl qeval 2026-09-13 `HubSnapshot`, `PoolInfo`, `GaugeSnapshot`, `SampleCount` |
| UI | `web/config.js` `NETWORKS.pearl`; https://zdex-gno.netlify.app |
| GnoSwap CL / fees / GNS / pad / wrap | https://docs.gnoswap.io/ ; `gnoswap-labs/gnoswap` pool README |
| Next UI ranked | `docs/research/next-inherit.md` Wave 2; `docs/research/next-ui.md` |
