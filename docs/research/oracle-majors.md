# Oracle majors — Ping là SpotPrice GNOT, không phải CoinGecko USD

Status: research. Không deploy. Không addpkg. Không sửa realm.
Không overwrite `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`
hay `…/oracle/v1`. Không phải lời khuyên đầu tư. Không “Uniswap-equivalent”.
Uniswap v4 hooks **không** port 1:1.

Câu hỏi: muốn mark BTC / ETH / USDC / USDT / ATONE trên Zdex thì
làm gì? Sidecar `oracle/v1` `Ping` có phải feed USD không?

---

## Nguồn (cite, không bịa)

| Chủ đề | Cite |
|---|---|
| Ping / Observe / ring 32 | `gno.land/r/zdex/oracle/v1/oracle.gno`; Pearl `deploy/pearl/oracle-v1/oracle.gno` |
| `SpotPrice` | `gno.land/r/zdex/v2/swap.gno`; cùng công thức `MulDiv(ReserveT, 1e6, ReserveU+VirtualU)` |
| `PoolInfo` | `gno.land/r/zdex/v2/pool.gno` — `(reserveU, reserveT, virtualU, totalLP, feeBps)` |
| Math | `gno.land/p/zdex/amm/v1` `MulDiv` |
| Listing | `CreatePool` `pool.gno`; `Launch` legacy `launch.gno`. Pool id `ugnot\|SYMBOL` `state.gno` `poolIDFor` |
| UI quote | `web/chain.mjs` `Quote(id, "ugnot", 1000000)` → `quote1gnot`; `Swap.tsx` `"1 GNOT = … SYMBOL"` |
| Icon ≠ feed | `docs/research/token-icons.md`; `web/src/lib/tokenIcons.ts`; `web/public/tokens/README.md` |
| Onbloc avatars | [onbloc/gno-token-resource](https://github.com/onbloc/gno-token-resource) — Adena / GnoScan / GnoSwap. `test_btc.svg` / `test_eth.svg` / `test_usdc.svg` / `test_usdt.svg` / `test_atone.svg` dưới `grc20/images/` |
| Bridge ≠ Pearl pool | `docs/research/cross-chain-gno-evm.md`: Sapphire↔Sepolia testnet GNOT/ETH/USDT; IBC GNOT/ATONE **không public** |
| TWAP spec | `docs/research/hooks-gno.md` §9; `next-inherit.md` W2.5; `upgrade-modules.md` §6.1 |
| Live Pearl | `compare-uniswap-gnoswap.md` qeval 2026-09-13: một pool `ugnot\|ZDEX`; `SampleCount("ugnot\|ZDEX")=0` |
| Fee Ping | `docs/research/fee-schedule.md`: `Ping` **0** protocol cut |
| Kinh tế | `docs/research/economics.md`, `lp-apr.md` |

---

## 0. Verdict

`oracle/v1` `Ping(poolID)` **không** gọi CoinGecko, không USD, không
Chainlink, không Pyth. Nó ghi **một** số: cùng `SpotPrice` của pool
`ugnot|<SYMBOL>` — **token units per 1 GNOT** (scale `1e6` khớp 6
decimals `ugnot`). Đơn vị quote của Zdex là native GNOT, không phải
dollar.

Muốn “mark” BTC / ETH / USDC / USDT / ATONE thì **phải có pool**
`CreatePool` (listing product) hoặc `Launch` (legacy, không dạy UI),
rồi keeper/user `Ping("ugnot|BTC")` (v.v.). Không pool → `Ping` panic
`zdex: empty pool`. Icon Onbloc **không** tạo giá.

**BTC thật không tồn tại trên Gno.** Ticker `BTC` trên một GRC20 /
pool Zdex là symbol in-realm, không phải Bitcoin. ETH/USDT testnet
Onbloc sống trên **Sapphire↔Sepolia**, không phải Pearl v2.
ATONE IBC testnet **không public** (`cross-chain-gno-evm.md`).

**Next ship:** không `CreatePool` majors giả; không feed USD vào UI.
Item kế tiếp = **copy + qeval honesty trên `web/`** (B): icon ≠ mark;
`quote1gnot` = GNOT; Ping chỉ pool đang sống `ugnot|ZDEX`. Chi tiết §8.

---

## 1. `Ping` là gì — công thức, không API giá

### 1.1 Code path

`gno.land/r/zdex/oracle/v1/oracle.gno`:

```text
Ping(cur, poolID):
  require Previous.IsUserCall          // EOA-only, MsgCall
  ru, rt, vu, _, _ := zdex.PoolInfo(poolID)
  den := ru + vu
  require den > 0 && rt > 0            // "zdex: empty pool"
  px := amm.MulDiv(rt, 1_000_000, den) // scaleX6
  ring[poolID] append/overwrite same height; cap 32 drop oldest
  Emit Ping; return px
```

`SpotPrice` (`swap.gno`):

```text
den = ReserveU + VirtualU
return MulDiv(ReserveT, 1_000_000, den)   // 0 nếu den<=0 hoặc ReserveT<=0
```

Hai hàm **cùng số**. Ping **không** gọi `SpotPrice()`; nó nhân bản
công thức từ `PoolInfo` (query, không `cur` trên DEX). Sidecar **không**
`cross(cur)` mutator DEX. v2 **không** `import` oracle
(`next-inherit.md` W2.5).

`DexPkg()` = `"gno.land/r/zdex/v2"` (local) / Pearl rewrite dưới
`g1mv…/zdex/v2`. Getter cho UI, không phải HTTP.

### 1.2 Đơn vị — GNOT, token units, không USD

| Tên | Ý nghĩa | Không phải |
|---|---|---|
| `px` / `SpotPrice` | `ReserveT * 1e6 / (ReserveU+VirtualU)` = **token units per 1 GNOT** | USD, EUR, SAT/USD |
| Scale `1e6` | 1 GNOT = `1_000_000` `ugnot` (`types.gno` `nativeDenom`) | Decimals của token kia |
| UI `quote1gnot` | `Quote(poolID, "ugnot", 1_000_000)` = **AmountOut 1 GNOT** (có `feeBps`) | `SpotPrice` (không fee) |
| `Observe(poolID, agoBlocks)` | TWAP **các px đã Ping**, cửa sổ block | CoinGecko 24h |

`Swap.tsx`: `"1 GNOT = ${fmtInt(pool.quote1gnot)} ${pool.symbol}"`.
Đó là GNOT→token, không phải `$`.

Ping **không** chia `Decimals` của GRC20. Token 8 decimals (BTC-like)
và token 6 decimals (USDC-like) cùng `px` raw — so sánh ngang hàng
là sai. Humanize là việc UI, không việc oracle.

`Quote` ≠ `SpotPrice`: `Quote` đi `AmountOut` + `FeeBps`; Ping/Spot
là tỷ lệ reserve (kể `VirtualU` trên Launch). Spark UI dùng Quote.

### 1.3 Sidecar, không hook, không feed swap

| | Live `oracle/v1` | Uniswap v2/v3 trong pool | Uniswap v4 oracle hook |
|---|---|---|---|
| Khi ghi | User/keeper `Ping` opt-in | Mỗi swap cập nhật cumul | `afterSwap` flag |
| Trong `SwapExactIn` | **Không** | Có | Có nếu hook gắn |
| `func()` / `IHooks` | **Cấm** trên Gno | N/A (v2/v3 hardcoded) | CREATE2 flags + `hookData` |
| Feed `AmountOut` | **Cấm** (`hooks-gno.md` §9.2) | Không (oracle tách) | Hook **có thể** đổi curve — Zdex từ chối |
| Ring | 32 samples, same-height overwrite | `price0CumulativeLast` / observations | Tuỳ hook |
| USD | Không | Không on-chain; USD = aggregator off-chain | Không trừ khi hook gọi oracle EVM |

`Render` oracle: *"Not a price feed for AmountOut. Not financial advice."*
(`oracle/v1/render.gno`).

`Observe` không `cur` — qeval. Window mỏng (`<2` samples, hoặc sample
đầu muộn hơn `now-agoBlocks`) → panic `zdex: thin window`. Query
không đi swap path.

Pearl 2026-09-13: sidecar **sống**, `SampleCount("ugnot|ZDEX")=0` —
chưa ai Ping. Ring trống ≠ “giá 0 USD”.

### 1.4 Gno cấm gì với “oracle majors”

Realm **không** HTTP. Không `net/http`, không CoinGecko, không
Binance REST. Không caller-supplied `func()` (Class 4). Interface
`/p/` **không** nhận `cur realm`. Crossing chỉ `cross(cur)` tới `/r/`
đã import compile-time (`hooks-gno.md` §1).

Hệ quả: **không** có đường “kéo USD BTC vào Ping” trong generation
này. Off-chain indexer gắn `$` là **product claim** — `zdex-trust`
cấm trừ khi ghi rõ nguồn ngoài và testnet/no-value.

---

## 2. Muốn mark majors thì phải có pair

`Ping` chỉ biết `poolID`. `poolIDFor(symbol) = "ugnot|" + symbol`
(`state.gno`). Không có pair → không có mark.

### 2.1 Hai cửa niêm yết

| Cửa | Việc | Mark sau Ping |
|---|---|---|
| **`CreatePool`** (product) | Seed two-sided: `OriginSend` `amountU` ≥ `minListUgnot` (1 GNOT) + token `Approve`/`TransferFrom`. `CreatorBps=0`. `VirtualU=0`. Fee 5/30/100 | `px` = token units / 1 GNOT từ reserve thật |
| **`Launch`** (legacy) | Bonding-curve, mint in-realm, `VirtualU>0`, `ReserveU=0` lúc seed, LP khóa, snipe. **Không expose UI** (`launch.gno` comment, `docs-claims.md`) | `px` dùng `ReserveU+VirtualU` — ảo cho đến Graduate |

Cả hai trả `id` rồi `Ping(id)`. Product listing **mới** = `CreatePool`
only (`AGENTS.md`). `Launch` giữ để pool cũ còn trade; oracle test
local **dùng** `Launch` (`oracle_test.gno` `seedPool`) — đó là test
helper, không phải path majors.

Một symbol một pool. `CreatePool("…", "BTC", …)` lần hai panic
`zdex: pool exists`.

### 2.2 Checklist majors (nếu **đã** có token thật trên đúng chain)

Giả sử (và chỉ khi) một GRC20 / banker Coin **đã** tồn tại trên **cùng**
chain với DEX (Pearl ≠ Sapphire):

1. User ký `CreatePool(tokenKey, "USDC", amountU, amountT, feeBps)` —
   không Zdex “issue” ticker (`docs-claims.md` §2.6).
2. `poolID` = `ugnot|USDC`.
3. Keeper/EOA `Ping("ugnot|USDC")` mỗi khi muốn sample. Cùng height
   overwrite. Ring 32.
4. `Observe("ugnot|USDC", agoBlocks)` khi `SampleCount>=2` và window
   đủ. Không gắn vào `SwapExactIn` / `FillOrder` v2.

Không bước 1 → bước 3 panic. Không bước 3 → `LastSpot=0`,
`SampleCount=0` — UI **không** được bịa số.

### 2.3 Bảng majors — hôm nay

Pearl live: **một** pool `ugnot|ZDEX` (`compare-uniswap-gnoswap.md` F4).
Không invent pool thứ hai trong research này.

| Ticker UI | Icon Onbloc | Asset trên Gno | Pool Zdex Pearl | Ping mark |
|---|---|---|---|---|
| **GNOT** / `ugnot` | `gno-native/images/ugnot.svg` — native | Native banker Coin | Quote asset mọi pool | Không có `ugnot\|GNOT`. Spot là **cạnh** GNOT |
| **ZDEX** | mark zdex (`token-zdex.jpg`) | In-realm / demo listing | `ugnot\|ZDEX` 300 GNOT | `SampleCount=0` — sidecar sống, **chưa** Ping |
| **BTC** | `grc20/images/test_btc.svg` | **Không** có Bitcoin. Ticker GRC20 “BTC” = meme nếu ai mint | Không | Không. `CreatePool` symbol BTC **không** ra BTC thật |
| **ETH** / WETH | `test_eth.svg` + ZKGM `sepoliaeth.svg` | Testnet ETH **Sapphire↔Sepolia** (`@_gnoland` 2026-08-13). Không Pearl | Không trên Pearl v2 | Không. Cấm `CreatePool` ETH trên Pearl (`cross-chain-gno-evm.md` P1) |
| **USDC** | `test_usdc.svg` / `gno_land_r_onbloc_usdc.svg` | Test / GRC20 Onbloc — **không** Circle USDC mainnet trừ khi có proof IBC/bridge **cùng chain** | Không Pearl | Không |
| **USDT** | `test_usdt.svg` + ZKGM `usdt.svg` | Testnet USDT Sepolia→Sapphire. Không Pearl | Không | Không |
| **ATONE** | `test_atone.svg` | Native AtomOne. IBC GNOT/ATONE testnet **không public** (2026-06-11) | Pool id vẫn `ugnot\|…`; banker denom `uatone` **không** nhét v2 | Không. Generation mới nếu IBC Coin (`cross-chain-gno-evm.md` §1.3) |

`tokenIcons.ts` map `BTC`/`ETH`/`USDC`/`USDT`/`ATONE` → SVG **trước**
khi có pool. Đó là avatar picker, không phải oracle.

---

## 3. Icon Onbloc ≠ price feed

[onbloc/gno-token-resource](https://github.com/onbloc/gno-token-resource)
là **catalog avatar** cho Adena / GnoScan / GnoSwap. README của họ:
submission **không** phải endorsement, không investment advice.

Zdex copy rule (`token-icons.md`):

- GNOT = `ugnot.svg` Gnoscan, không gnome wordmark.
- Token có entry → SVG đúng path `image`.
- Token không entry → letters, không identicon.
- `test_*.svg` = **test** GRC20 art, không phải spot Bitcoin/Ethereum.

`web/public/tokens/README.md` gán `btc.svg` ← `test_btc.svg`. File
đó **không** có field giá, không có CoinGecko id, không có TWAP.

Ba lớp **cấm gộp**:

| Lớp | Việc | Không được nói |
|---|---|---|
| Avatar | SVG ticker | “official BTC on Gno”, “price $xx” |
| Listing | `CreatePool` user-signed | “zdex issued BTC” |
| Oracle | `Ping` → `SpotPrice` GNOT | “BTC/USD”, “majors feed”, “index” |

---

## 4. Map Uniswap / GnoSwap / zSwap / Zdex

Không clone EVM. zSwap chỉ cảm hứng README.

| Ý | Uniswap | GnoSwap | zSwap (cảm hứng) | Zdex live |
|---|---|---|---|---|
| Spot | `x/y` v2; tick price v3 | CL tick + wrap `wugnot` | AMM (HTML-in-bytecode, wrap-ish) | `SpotPrice` CPMM, native `ugnot` |
| TWAP | v2 cumul trong pair; v3 observations trong pool | Trong swap CL (Uniswap-v3-style) | Không cột research này | **Ping sidecar** ring 32; **không** trong `SwapExactIn` |
| USD majors | Off-chain (CoinGecko, Chainlink) + WETH quote | Off-chain + GNS/`wugnot` | Off-chain | **Không.** GNOT-only. Realm không HTTP |
| Hooks oracle | v4 `afterSwap` + `func` + flags | Swap callback / flash-swap style | N/A | `/p/` types + `/r/` allowlist + `cross(cur)`. AfterSwap = DEX **v3**, không vá v2 |
| Flash | v4 EIP-1153; v3 flash swap | Callback style | — | **Cấm.** OriginSend một envelope, banker push-only |
| Majors BTC/ETH | ERC-20 / WETH thật trên Ethereum | Wrap + IBC campaign Sapphire (họ) | — | Pearl: **không** có. Bridge ≠ pool |

Uniswap v2 oracle cập nhật **mỗi swap** trong pair. Zdex Ping là
**opt-in keeper** — gần “external poke” hơn là v2 cumul. AfterSwap
observe-only (`hooks-gno.md` §9) mới gần v3 observations; cần
`HookPkg` trên generation mới, allowlist compile-time, **không**
`func()`, không `hookData`, không return-delta.

Readonly taint: `Quote` / `QuoteIn` / `SpotPrice` **không** gọi hook
(`hooks-gno.md`). `PoolInfo` không `cur`. `Ping` có `cur` vì ghi ring
của **oracle realm**, không vì ghi DEX.

---

## 5. Kinh tế — Ping không phải yield

Cite `economics.md`, `lp-apr.md`, `fee-schedule.md`. Không APY.

| Dòng tiền | Số | Ping majors? |
|---|---|---|
| LP fee (no extra stake) | `splitFee` remainder ~8333/10000 của swap fee vào k. Cap `noStakeLp` | Không. Ping 0 cut |
| Protocol share | `poolProtocolFeeBps=1667` ≈ 1/6 **của fee** | Không |
| Epoch pot / points | 80% protocol **ugnot buy** (`defaultFeeShareBps=8000`) | Ping không `creditSwapPoints` |
| Gauge sidecar | v1 lump 100 GNOT (cấm APR); v3 empty | Tách sổ |
| Token protocol / ve | **Không ship** (`economics.md` §5) | Cấm gắn “oracle token” |
| `Ping` | 0 protocol; caller trả gas | Sample TWAP thôi |

Fee APR UI = trailing volume off-chain `chain.mjs` / `spark.json`,
không phải `Observe`. Gắn TWAP vào APR = claim sai.

`FillOrder` không so `SpotPrice`, 0 AMM fee (`economics.md` §1.4).
Book **không** được đọc `Observe` trong `FillOrder` v2
(`next-inherit.md` W2.5).

---

## 6. Feasibility — Gno cho / cấm

| Feature | Trên Gno / Zdex | |
|---|---|---|
| TWAP opt-in Ping | **Đã addpkg** sidecar. Ring 0 trên `ugnot\|ZDEX` | (A) live |
| TWAP auto AfterSwap | DEX generation **mới** + allowlist `/r/` + `cross(cur)` observe-only. Không feed `AmountOut` | (C) không tuần này |
| CoinGecko / HTTP USD | **Impossible** trong realm | Cấm |
| Chainlink / Pyth | Không có primitive Gno trong repo này | Cấm homemade crypto / feed mới trừ user hỏi |
| `CreatePool` ticker BTC | VM cho phép symbol bất kỳ. **Product cấm** nếu copy nói đó là Bitcoin | Trust |
| IBC ETH/USDT list Pearl v2 | Pool id hard `ugnot\|SYMBOL`, `nativeDenom=ugnot`. Voucher IBC = generation mới | Cấm nhét v2 |
| Concentrated liquidity | Math tick realm mới; cấm inherit `ugnot\|ZDEX` | (C) |
| Uniswap v4 hooks 1:1 | `func()`, stored interface, CREATE2 flags, return-delta | **Cấm** |
| Flash | Không EIP-1153 | **Cấm** |
| ve-token | VM sidecar được; product cấm wars | Không ship |
| Keeper Ping `ugnot\|ZDEX` | EOA `MsgCall` `Ping`. 0 protocol fee | Ops / UI, không realm mới |

Manip window ngắn: `hooks-gno.md` §9.3 — TWAP on-chain = spot nội bộ,
không cấp credit. Same-height overwrite chống multi-swap trong một
block; window 32 mẫu vẫn mỏng.

---

## 7. Findings

| # | Finding | Hệ quả |
|---|---|---|
| F1 | `Ping` = `SpotPrice` = token units / 1 GNOT, scale 1e6 | Không CoinGecko, không USD, không decimals-human |
| F2 | UI `quote1gnot` = `Quote(1 GNOT)` **có fee**, khác Ping | Spark ≠ oracle ring |
| F3 | Không pool → không mark. Majors cần `CreatePool`/`Launch` rồi `Ping(poolID)` | Icon BTC không tạo `ugnot\|BTC` |
| F4 | BTC thật **không** có trên Gno. ETH/USDT test = Sapphire. ATONE IBC chưa public | Cấm dashboard “majors USD” trên Pearl |
| F5 | Onbloc `gno-token-resource` = avatar (`test_btc.svg`…) | `token-icons.md`: icon ≠ endorsement ≠ feed |
| F6 | Pearl: 1 pool `ugnot\|ZDEX`; oracle pkg sống; `SampleCount=0` | Mark trung thực duy nhất = ZDEX/GNOT **sau** Ping |
| F7 | Uniswap v2/v3 TWAP trong swap; v4 hook `func()` | Gno: Ping sidecar hoặc AfterSwap gen mới. **Không** 1:1 |
| F8 | `Ping` 0 fee, EOA-only, không `import` vào v2 | Keeper opt-in; không auto từ `SwapExactIn` |
| F9 | LP fee APR no-stake; protocol ~1/6; points 80% ugnot buy; token sau **cấm** ve | Ping không phải yield |
| F10 | Flash / HTTP oracle / wrap / CL trên live v2 | Cấm hoặc (C) realm mới |

---

## 8. Recommended next ship

**W-oracle-honest (B) — `web/` copy + qeval, không `CreatePool` majors.**

Mục tiêu: UI không biến catalog icon thành “BTC/USD”. Oracle sidecar
đã addpkg — dùng đúng nghĩa.

Làm:

1. Docs / Stats / Markets: giá = **GNOT** (`1 GNOT = X SYMBOL` hoặc
   `SpotPrice` raw). Chữ **testnet**. Không `$`, không CoinGecko.
2. `oracleLive`: hiện `SampleCount` / `LastSpot` của pool **đang có**
   (`ugnot|ZDEX`). `0` = “no samples”, không “$0”.
3. Avatar BTC/ETH/USDC/USDT/ATONE giữ rule `token-icons.md` — letters
   nếu không đúng file Gnoscan; **không** gắn số giá khi không có pool.
4. Optional ops (không realm): EOA keeper `Ping("ugnot|ZDEX")` sau
   swap cho ring > 0. 0 protocol cut (`fee-schedule.md`).

Không làm trong item này:

- `CreatePool` / `Launch` ticker BTC ETH USDC USDT ATONE trên Pearl
  (giả majors).
- HTTP USD, Chainlink, “index”.
- AfterSwap trong bytecode v2; `SetNextPkg` vào oracle.
- Feed `Observe` vào `AmountOut` / `FillOrder`.
- Wrap, CL, ve-token, overwrite oracle/v1.

Owner: `zdex-product` (copy English UI). Review: `zdex-trust`.
Research: file này. **Không** `zdex-protocol` realm.

Gate: `cd web; npm test`. Không `gno test` bắt buộc (B). Không
broadcast. Rollback: revert `web/`.

Nếu **sau này** (không tuần này) có GRC20/IBC Coin **thật** trên đúng
chain: listing = `CreatePool` + `Ping(poolID)` đúng F3 — vẫn GNOT
mark, vẫn không USD, vẫn không nói “real BTC”.

---

## 9. Việc research này không làm

- Implement realm / `/p/` / UI.
- Overwrite Pearl v2, AMM v1, oracle/v1, incentives.
- `SetNextPkg` / `SetModule`.
- Promise APY, airdrop, Uniswap-equivalent, migrate LP.
- Invent pool ngoài `ugnot|ZDEX`.
- Mnemonic, raw `gnokey`, tweet, deploy.

---

## Tham chiếu

- `gno.land/r/zdex/oracle/v1/oracle.gno`
- `gno.land/r/zdex/v2/swap.gno` `SpotPrice` / `Quote`
- `gno.land/r/zdex/v2/pool.gno` `CreatePool` / `PoolInfo`
- `gno.land/r/zdex/v2/launch.gno`
- `gno.land/p/zdex/amm/v1`
- `docs/research/hooks-gno.md` §9
- `docs/research/next-inherit.md` W2.5
- `docs/research/compare-uniswap-gnoswap.md`
- `docs/research/token-icons.md`
- `docs/research/cross-chain-gno-evm.md`
- `docs/research/economics.md` / `lp-apr.md` / `fee-schedule.md`
- [onbloc/gno-token-resource](https://github.com/onbloc/gno-token-resource)
