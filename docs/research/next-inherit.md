# Next inherit — Pearl live đứng yên, surface mới = path mới

Status: research / design. Không deploy. Không addpkg. Không sửa realm live.
Không overwrite `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`.
Không overwrite incentives/v1 (lump 100 GNOT). Không dùng incentives/v2.
Không phải lời khuyên đầu tư.

Câu hỏi: Zdex build **gì tiếp**, sao cho mỗi bước **inherit** state Pearl đang sống
— package mới, hub `Version` / `Caps` / `NextPkg` / `Modules` — không đè live.

Nguồn: `docs/research/upgrade-modules.md`, `hooks-gno.md`, `product.md`,
`lp-apr.md`, `incentives-routing.md`, `economics.md`; qeval Pearl
2026-09-13; UI `web/config.js`, `web/src/lib/hub.ts`, `web/chain.mjs`,
`web/src/components/GaugePanel.tsx`.

---

## 0. Kết luận ngắn

Pearl **đã có** DEX + pool + lump gauge + sidecar FundProgram đúng.
Gap lớn nhất không phải copy Uniswap, không phải DEX v3.

**Next ship:** UI inherit dual-gauge (B). `Fund` / `FundProgram` chỉ
`incentives/v3`. `Claim` / `Sync` trên **mọi** sidecar còn sổ (v1 lump
bắt buộc; v3 khi có program). **Không bao giờ** `FundProgram` vào v2.
Không `SetNextPkg`. Không `SetModule("incentives")` trên v2 (panic).
Không migrate LP `ugnot|ZDEX`.

DEX v3 hub chỉ khi cần slot `validModule` mới (`hooks`, hoặc
`incentives` trên Caps). Hooks Uniswap v4 **không** port 1:1.

---

## 1. Live Pearl — không phá (qeval 2026-09-13)

Profile `pearl` (`pearl-1`). Namespace deployer
`g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr`.

| Path | Việc | State |
|---|---|---|
| `…/p/…/zdex/amm/v1` | Pure math `MulDiv` / `AmountOut` | Live, immutable |
| `…/r/…/zdex/v2` | DEX hub | `Version=2`. `NextPkg=""`. 1 pool |
| `…/r/…/zdex/incentives/v1` | Lump gauge | `Version=1`. 100 GNOT. Acc nhảy |
| `…/r/…/zdex/incentives/v2` | `FundProgram` overwrite | `Version=2`. Empty. **cấm dùng** |
| `…/r/…/zdex/incentives/v3` | `FundProgram` Remaining stack | `Version=3`. Empty. UI Fund ở đây |
| `…/r/…/zdex/token` | GRC20 ví dụ | Live, không phải AMM |
| UI | https://zdex-gno.netlify.app | English, Adena, default Pearl |

`HubSnapshot()`:

```text
2;gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2;;swap;lp;create;book;points;quote;feeShare;noStakeLp
```

Field 2 (`NextPkg`) rỗng — hai `;;` liên tiếp. `Caps()` không có
`incentives`. `Modules()` bảy dòng, mỗi tên trỏ **chính** v2:

```text
swap | lp | create | book | points | quote | admin
→ gno.land/r/g1mv…/zdex/v2
```

`SetModule("incentives", …)` trên path này **panic** `zdex: unknown module`
(`upgrade.gno` `validModule`). Slot đóng lúc addpkg.

Pool `ugnot|ZDEX` — `PoolInfo`:

| Field | Giá trị |
|---|---|
| `reserveU` | `300_000_000` (300 GNOT) |
| `reserveT` | `300_000_000_000` |
| `virtualU` | `0` (CreatePool, không Launch) |
| `totalLP` | `9_486_545_040` |
| `feeBps` | `30` |

`incentives/v1` `GaugeSnapshot("ugnot|ZDEX")`:

```text
ugnot|ZDEX;10541245;100000000;1;0
```

`TotalFunded = 100_000_000` ugnot = **100 GNOT lump**. `On=1`. `Paused=0`.
Acc = `10_541_245` (ugnot-per-LP × 1e9). **Không** `rewardPerBlock`.
Cấm annualize thành Reward APR (`lp-apr.md` §2).

Boost (không phải APR): `100e6 / 300e6 * 100` ≈ **33% of GNOT TVL**
đã posted. One-shot.

v2 / v3 `GaugeSnapshot("ugnot|ZDEX")`:

```text
ugnot|ZDEX;0;0;0;0;0;0;0
```

Cả hai empty. `DexPkg()` của v1 và v3 = live v2. Sidecar **đọc** pool;
không giữ `ReserveU`.

UI `pkgForFunc` (`hub.ts`): `Fund` / `FundProgram` → v3 nếu
`incentivesV3Live`; `Claim` default → `incentivesPkg` (v1).
`GaugePanel` Claim/Sync lặp `g.pkg` theo hàng. Đúng hướng; còn lỗ
`gaugeFor` lấy **hàng đầu** (v1) nên Reward APR v3 có thể bị che.

Guide `i18n.ts` vẫn nói “FundProgram is incentives/v2, then v3” — **stale**.
v2 live nhưng buggy; product phải coi v2 **chết**.

---

## 2. Luật inherit — durable

Gno `addpkg` **không overwrite**. Path đã live là identity. Sửa ABI /
`validModule` / `Caps` const = **path mới**.

1. **Package path = identity.** v2 DEX, v1 lump, v2 buggy, v3 stack, AMM
   v1 — đứng mãi. Không “vá” bytecode. Không `gnokey` addpkg cùng path.
2. **Surface mới = sidecar `/r/…` mới.** v2 **không** `import` sidecar.
   Sidecar query `PoolInfo` / `PositionOf`. Không `cross(cur)` vào
   `SwapExactIn`.
3. **Hub bốn field là bảng UI, không phải VM.** `Modules` ghi string.
   `SwapExactIn` vẫn chạy trong **cùng** package, cùng `pools` AVL.
   Không dynamic import theo string.
4. **`SetNextPkg` chỉ successor hub DEX.** Không trỏ sidecar farm.
   `NextPkg=""` hôm nay = chưa có v3 DEX. Giữ vậy cho đến khi (C).
5. **`SetModule` chỉ tên trong `validModule` generation đó.** v2:
   `swap;lp;create;book;points;quote;admin`. Tên lạ panic. Pointer UI
   không dời `orders` / `pos`.
6. **Không LP auto-migrate.** `ugnot|ZDEX` (300 GNOT + LP + 100 GNOT
   Acc v1) ở v2 mãi. User muốn AMM mới = `CreatePool` trên hub mới.
   Trust: cấm promise migrate (`trust.md`).
7. **Không Uniswap hooks 1:1.** Không `func()`, không interface
   `cur realm`, không persist `Observer`, không flash accounting,
   không return-delta (`hooks-gno.md`).
8. **UI đọc live, không hardcode trừ fallback `config.js`.**
   `incentivesPkg` / `incentivesV3Pkg` là discovery trước khi hub có
   slot. `followPkg` confirm, không auto-switch im lặng.

Local source `gno.land/r/zdex/incentives/v2` **đã** stack Remaining
(giống v3). Pearl v2 **không** — `Remaining = sent` ghi đè. Đừng
đồng nhất repo với chain.

---

## 3. So sánh — GnoSwap / zSwap / Uniswap / zdex live

Không “Uniswap-equivalent”. Không clone EVM.

| | Uniswap v2/v3/v4 | GnoSwap | zSwap | zdex Pearl live |
|---|---|---|---|---|
| Quote | WETH / ERC-20 | Thường wrap / GRC20 | Native-ish + Launch | Native `ugnot` `OriginSend` |
| Listing | Pair factory | Pair | `Launch` mint | `CreatePool` DEX-only; `Launch` legacy |
| Curve | v2 CPMM; v3 ticks; v4 hooks | v2-like | CPMM + virtual | CPMM full-range; `virtualU=0` trên ZDEX |
| LP fee | v2 vào k; stake không cần | Swap fee | Swap fee | ~5/6 vào k; cap `noStakeLp` |
| Protocol | `feeTo` ~1/6 sqrt(k) | Tuỳ fork | Creator dump risk | ~1/6 skim; 80% buy → epoch pot |
| Hooks | v4 `func` + flash | Không v4 | Không | **Cấm** 1:1; AfterSwap observe = generation sau |
| Book | Thường không | Không (DEX) | Không | Escrow `PlaceBid`/`PlaceAsk` **trong** v2 |
| Farm | Ngoài (MasterChef) | Gauge/stake hay gặp | — | Sidecar; **không** stake LP để lấy fee |
| Upgrade | Proxy / CREATE2 | Path / admin | — | Immutable path + hub pointer |
| Live pool | — | — | — | 1 pool `ugnot\|ZDEX` |

zdex lấy cảm hứng zSwap (`README.md`) rồi viết lại primitive Gno:
`MulDiv`, escrow, `Render` + `<gno-form>`, hub immutable. GnoSwap gần
Uniswap hơn; zdex cố ý native + DEX-only + sidecar farm.

---

## 4. Kinh tế đang inherit — cite file, không vibe

Ba lớp **không cộng** thành “Total APR” (`lp-apr.md`, `incentives.md`).

| Lớp | Chỗ live | Số | UI được hiện |
|---|---|---|---|
| 1. LP swap fee | v2 `splitFee` remainder → k | CreatePool `ProtocolBps=1667` → LP ~8333/10000 | **Fee APR (24h est.)** từ volume off-chain. Volume 0 → `—` |
| 2. Points + epoch pot | v2 `points.gno` | 80% protocol **ugnot buy** (`defaultFeeShareBps=8000`) | Claimable fee-share sau epoch đóng. Không APY |
| 3a. Gauge lump | incentives/v1 | 100 GNOT `Fund` một tx. Acc xong | **Claimable** + **Boost % of TVL**. Cấm APR |
| 3b. Gauge program | incentives/v3 | Empty. `RewardPerBlock` khi FundProgram | **Reward APR (est.)** chỉ khi rate > 0 và height < `EndH` |

Công thức Fee APR (`web/src/lib/amm.ts` `lpFeeAprPct`):

```
lpShare = launched ? 0.5 : (10000-1667)/10000
pct     = volumeU * (feeBps/10000) * lpShare / reserveU * 365 * 100
```

`volumeU` **không** on-chain. `chain.mjs` `trackVolume` = `|ΔreserveU|`
24h wall-clock server + spark `HISTORY=48`. Không đếm sell notional
đúng; đếm cả LP add/remove. Label phải **est.**

Reward APR (`rewardAprPct`) khi v3 `RewardPerBlock > 0`:

```
blocksPerYear = 28800 * 365   // 10_512_000
pct = rpb * blocksPerYear / reserveU * 100
```

v1 không có rpb → không cột này. Token protocol / points-as-GRC20 /
ve(3,3) **không** nằm next (`economics.md` §5, `ROADMAP.md`).

`FillOrder` 0 AMM fee, 0 volume Fee APR, 0 points (`economics.md` §1.4).

---

## 5. Feasibility trên Gno — cái nào cấm

| Feature | Trên Gno / zdex | Class |
|---|---|---|
| Concentrated liquidity (v3 ticks, NFT position) | Làm được như realm **mới** (math tick + `Position` range). **Không inherit** pool full-range. Không nhét vào v2. Không tuần này | (C) nặng; không ship |
| TWAP oracle | Làm được: AfterSwap **observe-only**, allowlist `/r/` + `cross(cur)`. Query `Observe` trên hook realm. Không feed `AmountOut` v1 | (C) nếu auto trong swap; (A) nếu opt-in Ping |
| Flash / flash accounting | **Impossible / dangerous.** Không EIP-1153. OriginSend một envelope. Banker push-only. Hook không `take`/`settle` | Cấm |
| Uniswap v4 hooks 1:1 | **Cấm.** `func()`, stored interface, `hookData`, return-delta, CREATE2 flags | Cấm |
| AfterSwap TWAP (Zdex shape) | `/p/zdex/hooks/v1` types + router `/r/…/hooks` + DEX generation có `HookPkg=""` zero-path | (C) DEX v3; types (A) local |
| ve-token / gauge vote | Sidecar được về mặt VM. Product **cấm** — biến `CreatePool` thành wars, phá `noStakeLp` | Không ship |
| Multi-hop router | DEX mới hoặc sidecar router gọi `SwapExactIn` tĩnh. Pair model vẫn `ugnot\|SYMBOL` — hop thứ hai cần pool khác-GNOT **chưa có** | (C) muộn |
| On-chain 24h volume | Field mới trên `Pool` = generation mới. Event indexer off-chain = (B) | (B) indexer / (C) field |
| Missed-epoch roll | State `closedPot` **trong** v2. Sidecar không roll banker v2 | (C) |
| `SwapExactOut` | **Đã live** trên v2 (`swap.gno`). UI checkbox vẫn gọi `SwapExactIn` | (B) |

Panic cross-realm abort cả tx. Hook AfterSwap panic → swap revert.
TWAP v1: không panic vì ring đầy (drop oldest). Nested swap cần
in-flight lock trên DEX generation có hook.

---

## 6. Bảng next items — ranked

Class: **(A)** sidecar-only addpkg path mới, không đụng v2 bytecode.
**(B)** UI-only `web/`. **(C)** cần DEX hub v3 (`validModule` /
`Caps` / `HookPkg`).

Mọi item: LP `ugnot|ZDEX` ở lại v2. Không auto-migrate.

| # | Class | Item | Inherit live | Gno | Human yes |
|---|---|---|---|---|---|
| **1** | **B** | **Dual-gauge inherit UI** | v1 100 GNOT Claimable; FundProgram **chỉ v3**; v2 = dead; Boost ≠ Reward APR; Guide bỏ “v2 then v3” | Không realm | Không (UI). Netlify CI ok |
| **2** | B | Token-first Trade + **wire `SwapExactOut`** + Approve token-pkg | Cùng `SwapExactIn`/`SwapExactOut` v2. Pool ZDEX demo | ABI đã có | Không |
| **3** | B | Một Liquidity door; Create → wait `ugnot\|SYMBOL` ∈ pools → Fund v3; spender = `RealmAddr` only | CreatePool v2; không Fund nhầm pool | — | Không |
| **4** | B | Orders = book (đơn vị GNOT, fill per-row) hoặc relabel Advanced; mobile 3-tab | Book escrow **trong** v2; `SetModule("book")` sẽ **tách sổ** — không làm | — | Không |
| **5** | A | `/p/zdex/hooks/v1` types + `MustCaps` + TWAP cumul **local tests** | Không addpkg Pearl. v2 ABI freeze | `/p/` frozen post-init; không `cur` trên interface | addpkg `/p/<g1>/zdex/hooks/v1` = yes **sau** |
| **6** | C | DEX v3 hub: slot `incentives` + `hooks`; `HookPkg=""`; in-flight; `CreatePoolHooked`; AfterSwap → router TWAP | `SetNextPkg(v3)` trên v2. Pool ZDEX **không** chuyển. UI follow confirm | Import tĩnh router. `cross(cur)` | Yes: addpkg v3 + `SetNextPkg` |
| **7** | C / không | CL ticks, flash, ve-token, incentives/v4, copy v3 chỉ để farm | Phá inherit hoặc Gno cấm | — | Không hỏi |

Chi tiết #1 (next ship) — lỗ hiện tại:

| Lỗ | File | Fix UI |
|---|---|---|
| `Fund` fallback v2 nếu `v3Live` false | `hub.ts` `pkgForFunc` | Hard-deny v2 path. Fund → v3 else disable |
| `GaugePanel` hiện FundProgram khi `v2Live \|\| v3Live` | `GaugePanel.tsx` | Chỉ `incentivesV3Live` |
| `gaugeFor` lấy gauge đầu (v1) | `hub.ts` | Tách `lumpGauge` (v1) vs `programGauge` (v3) |
| Guide “v2 then v3” | `i18n.ts` | v1 lump live; v3 timed; v2 unused |
| Claimable wallet có thể chỉ v1 | `chain.mjs` | Cộng / hiện hai hàng: v1 Claimable + v3 Claimable |
| `boostTvl` dùng `fmtApr` | `GaugePanel.tsx` | Boost không mang chữ APR (`apr-claims.md`) |

Rollback #1: revert `web/`. AMM / Acc v1 không đổi.

#2–#4 đóng gap `product.md` §4. English only. Exact-out hôm nay:
checkbox + `quoteInLocal` rồi `doSwap` vẫn `SwapExactIn` với nhánh
`minOut` yếu (`Swap.tsx`). Realm đã có `SwapExactOut` + `maxIn`.

#5 không ship hook production. Chỉ khóa shape `/p/` trước khi (C).

#6 **không tuần này.** Làm khi (và chỉ khi) cần AfterSwap tự động,
roll missed-epoch, hoặc fee `FillOrder`. Thin hub chỉ nới slot rồi
`ModuleOf("swap")=v2` **không** chạy AfterSwap trong bytecode v2 —
hook phải nằm generation có `swap.gno` mới. Copy AMM vào v3 = pool
**mới**; ZDEX cũ đứng.

Không xếp: `incentives/v4` (v3 empty + đúng Remaining). Patch Pearl v2
DEX. `SetNextPkg(v2 → incentives/*)`. Farm-stake LP. Token points.

---

## 7. Hub v3 — khi nào mới được mở

Cần generation DEX mới nếu **một** trong các điều sau là yêu cầu product:

- `Caps` / `validModule` thêm `incentives` hoặc `hooks` (UI bỏ config cứng).
- `HookPkg` / AfterSwap trong `SwapExactIn` (TWAP auto).
- Sửa `maybeRollEpoch` (unclaimed `closedPot` kẹt — `economics.md` §3.4).
- `FillOrder` đi `splitFee` + points.
- Volume cumulative on-chain trên `Pool`.

Không cần v3 cho: FundProgram (đã v3 sidecar), Claim lump (v1),
Fee APR est. (off-chain), token picker, Exact out tx.

Khi làm v3:

```text
addpkg  gno.land/r/<g1>/zdex/v3          # Caps += incentives;hooks
addpkg  gno.land/p/<g1>/zdex/hooks/v1    # nếu chưa
addpkg  gno.land/r/<g1>/zdex/hooks       # router switch
addpkg  gno.land/r/<g1>/zdex/hooks/twap
# human yes:
v2.SetNextPkg(v3)                         # UI follow; LP v2 đứng
v3.SetModule("incentives", …/incentives/v3)
v3.SetModule("hooks", …/hooks)            # pointer UI; dispatch vẫn import tĩnh
```

`CreatePool` chữ ký giữ. `CreatePoolHooked` hàm **mới**. Pool ZDEX
không `AttachHook`. Empty `HookPkg` ≡ accounting v2 test vectors.

Pearl packet rewrite namespace `g1` như AMM (`upgrade-modules.md` §8).
Local path `gno.land/r/zdex/v3` không addpkg được trên Pearl.

---

## 8. Recommended next ship

**Item 1 (B) — dual-gauge inherit UI**, ngay sau đó item 2 (Exact out +
token-first) trên cùng `web/`.

Lý do:

1. Chain đã inherit được: 1 pool, 100 GNOT Acc, v3 chờ FundProgram.
2. Bug thừa: UI có thể Fund vào v2 (overwrite Remaining) nếu v3 probe fail.
3. User LP ZDEX cần Sync/Claim **v1** trước khi Remove (forfeit).
4. Không addpkg, không `SetNextPkg`, không risk k.
5. Trust: hai số tách; testnet no-value; NFA (`apr-claims.md`, `trust.md`).

Owner: `zdex-product`. Review: `zdex-trust` (copy), `zdex-research`
(routing). Không `zdex-protocol` realm tuần này.

Gate: `cd web; npm test` (kể `hub.test.ts` deny v2 Fund). Không
`gno test` bắt buộc cho (B). Không broadcast.

---

## 9. Việc không làm

- Overwrite / re-addpkg v2 DEX, AMM v1, incentives v1/v2/v3.
- Dùng Pearl `incentives/v2` dù `Version()` = `"2"`.
- `SetModule("incentives")` trên live v2.
- `SetNextPkg` vào sidecar.
- Promise migrate LP / APY / airdrop / Uniswap-equivalent.
- Uniswap v4 hooks, flash, `func()`, `hookData`, return-delta.
- Concentrated liquidity trên pool đang sống.
- ve(3,3), MasterChef stake-LP-for-fee, Pump.fun listing.
- Implement realm trong research này.
- Mnemonic, raw `gnokey`, tweet.

---

## 10. Checklist khi implement (không làm ở note này)

- [ ] `pkgForFunc(Fund*)` không bao giờ trả path `…/incentives/v2`
- [ ] Claim/Sync v1 vẫn chạy khi v3 empty
- [ ] `ugnot|ZDEX` pool id / `SwapExactIn` chữ ký không đổi
- [ ] Fee APR label `Fee APR (24h est.)`; Boost không APR; Reward APR chỉ v3 rate>0
- [ ] Guide: Approve **token package**, spender = zdex `RealmAddr`; FundProgram = v3
- [ ] `gno test ./gno.land/r/zdex/` và `./gno.land/r/zdex/v2` vẫn xanh nếu có đụng repo realm — **không đụng**
- [ ] Không addpkg / gnokey từ chat

---

## Tham chiếu

| Mục | Chỗ |
|---|---|
| Slot freeze / sidecar | `docs/research/upgrade-modules.md` |
| Hooks ≠ v4 | `docs/research/hooks-gno.md` |
| UI gap Uniswap-like | `docs/research/product.md` |
| Fee APR vs lump | `docs/research/lp-apr.md` |
| Routing farm | `docs/research/incentives-routing.md` |
| Create/Fund leftover | `docs/research/ui-create-fund-gaps.md` |
| Missed epoch / FillOrder | `docs/research/economics.md` §3–4 |
| Hub source | `gno.land/r/zdex/v2/upgrade.gno` |
| Pearl v2 overwrite | `deploy/pearl/incentives-v2/incentives.gno` `Remaining = sent` |
| Pearl v3 stack | `deploy/pearl/incentives-v3/incentives.gno` `pot = Remaining + sent` |
| UI route | `web/src/lib/hub.ts` `pkgForFunc`; `web/config.js` `NETWORKS.pearl` |
| Live qeval | Pearl 2026-09-13 `HubSnapshot`, `PoolInfo`, `GaugeSnapshot` |

---

## Wave 2 — after picker and dual gauge

Status: research / design. Append 2026-09-13. Không overwrite §0–§10.
Không deploy. Không addpkg. Không sửa realm live. Không CL trên
`ugnot|ZDEX`. Không APY. Không lời khuyên đầu tư.

Parent **đang** ship TokenPicker + dual-gauge inherit UI (item 1–2 của
§6 / `next-ui.md` #2–#3). Wave 2 **bắt đầu sau** hai surface đó land
trên `web/`. Không làm lại picker. Không làm lại `lumpGauge` /
`programGauge`. Luật inherit §2 vẫn đứng: path = identity; sidecar
không `import` vào `SwapExactIn`; `SetNextPkg` chỉ successor hub;
không LP auto-migrate; không Uniswap hooks 1:1.

Pearl vẫn một pool `ugnot|ZDEX` trên v2. `incentives/v1` 100 GNOT lump.
`incentives/v3` empty, FundProgram đúng stack Remaining. `incentives/v2`
**chết**.

---

### Kết luận ngắn

Sau picker + dual-gauge, gap tiền thật tiếp theo **không** phải hub v3.

**Next ship:** **W2.1 (B) wire `SwapExactOut`**. ABI đã live. Checkbox
đang gọi `SwapExactIn` với `minOut = 0`. Không addpkg. Không
`SetNextPkg`. Pool ZDEX đứng.

Sau đó: book density (B) rồi một cửa CreatePool (B) để listing thứ hai
không fail Approve / Fund nhầm pool. Oracle = sidecar **Ping** (A),
không AfterSwap. SweepDust = farm **v4** muộn (A). Thin hub (C) chỉ
khi cần slot mới. **Không** concentrated liquidity trên pool đang sống.

---

### Bảng ranked — 8 inherit items

Class: **(A)** sidecar-only path mới. **(B)** `web/` only. **(C)** DEX
hub v3 (`validModule` / `Caps` / `HookPkg`).

| # | Class | Item | Inherit live | Gno | Human yes |
|---|---|---|---|---|---|
| **W2.1** | **B** | **Wire `SwapExactOut`** | Cùng v2 `swap.gno`. `QuoteIn` đã có. Pool ZDEX | ABI live | Không (UI) |
| **W2.2** | B | Book density | Escrow `PlaceBid`/`PlaceAsk`/`FillOrder` **trong** v2. Không `SetModule("book")` | ABI live | Không |
| **W2.3** | B | Thêm listing `CreatePool` (một cửa + wait pool + spender `RealmAddr`) | `CreatePool` v2 permissionless. 1 pool hôm nay | — | Không |
| **W2.4** | B | `PlaceAsk` / sell-token Approve trên **token package** | Cùng spender `RealmAddr` như CreatePool. ZDEX internal skip | — | Không |
| **W2.5** | A | Oracle sidecar **Ping** (TWAP ring, `PoolInfo` query) | Không nhúng v2. Không feed `AmountOut` | Query không `cur`; không `func()` | addpkg sidecar **sau** types local |
| **W2.6** | A | Farm **v4** `SweepDust` (admin + paused) | v1 lump / v3 Remaining **không** đụng. Path mới | Banker sidecar; cấm sweep `Owed` | Yes: addpkg v4, không Fund v2 |
| **W2.7** | C | Thin hub v3 — **chỉ** khi cần slot `incentives`/`hooks` hoặc AfterSwap trong `swap.gno` mới | `SetNextPkg(v3)`. LP ZDEX **ở lại** v2 | Import tĩnh. `ModuleOf("swap")=v2` **không** chạy hook | Yes: addpkg v3 + `SetNextPkg` |
| **W2.8** | C / **không** | Concentrated liquidity trên live ZDEX | Phá inherit full-range + Acc v1 | Math tick làm được trên realm **mới**; **cấm** gắn lên v2 | Không hỏi |

Không xếp lại: TokenPicker, dual-gauge, `FundProgram` vào v2, ve-token,
flash, Uniswap v4 hooks 1:1, `incentives/v4` **trước** khi v3 có program.

---

### Chi tiết từng item

#### W2.1 — Wire `SwapExactOut` (B) — next ship

Realm **đã** có (`gno.land/r/zdex/v2/swap.gno`, Pearl packet
`deploy/pearl/r-v2/swap.gno`):

```text
SwapExactOut(cur, poolID, tokenOut, amountOut, maxIn, maxHeight) int64
QuoteIn(poolID, tokenOut, amountOut) int64
```

Buy (`tokenOut` = symbol): `IsUserCall`, `AmountIn`, `in <= maxIn`,
`OriginSend >= in`, refund `sent-in`. Sell: `pullUserToken(in)`,
`sendUgnot(amountOut)`. Fee trên `in` thật — `economics.md` §1.4.
Test `TestSwapExactOut` local.

UI hôm nay (`web/src/components/Swap.tsx`):

| Lỗ | Hành vi |
|---|---|
| `doSwap` | luôn `SwapExactIn` + `quote.inn` + `quote.min` |
| Exact-out branch | `quote.min = 0n` — **không** max-in on-chain |
| `/api/quote` | `quoteExactIn` thôi (`chain.mjs`) — không `QuoteIn` |
| `/api/preflight` | `tokenIn` + `amountIn` + `minOut` — không `maxIn` |
| Caps | `quote` → `caps.exactOut` hiện checkbox (`hub.ts`) |

Wire:

1. Checkbox on → `call("SwapExactOut", [pool.id, tokenOut, amountOut, maxIn, deadline], send)`.
2. `maxIn = QuoteIn + slip` (local `quoteInLocal` + qeval `QuoteIn` khi có).
3. Buy: `send = maxIn ugnot` (realm refund thừa). Không gửi đúng `inn`
   rồi hy vọng — `require(sent >= in)`.
4. Sell: `send` rỗng; `pullUserToken` `in`; Approve token-pkg nếu
   external (W2.4).
5. Preflight: insufficient GNOT vs `maxIn`; snipe cap trên `amountOut`.
6. Ẩn checkbox nếu `!caps.exactOut` — đừng để UX giả.

Không đổi chữ ký. Không `minOut=0` trên exact-in. Rollback = revert
`web/`. `cd web; npm test`.

#### W2.2 — Book density (B)

Escrow **đã** trong v2 (`book.gno`). `orders` AVL cùng package với
AMM. `SetModule("book", other)` **tách sổ** — UI gọi path trống, lệnh
cũ kẹt v2. **Không làm.**

`Orders.tsx` hôm nay: give/want integer, một `fillAmt` default
`1000000`, `live.orders` **global**, hint `want/give` bất kể side,
empty copy nói “this pool” nhưng bảng mọi pool.

Density — visual, cùng msg:

- Filter `o.pool === pool.id`.
- Cột Bids (lock GNOT) / Asks (lock token). Sort bid cao→thấp, ask
  thấp→cao.
- Human: bid give = `fmtGnot`; ask give = token units. Limit = GNOT
  per token.
- Fill **trên hàng**. Ask fill `OriginSend` ugnot. Highlight
  `maker === walletAddr`.
- Mid: best bid/ask vs AMM `quote1gnot`. Depth bar optional.
- `FillOrder` **0** AMM fee, 0 points, 0 volume Fee APR
  (`economics.md` §1.4). UI không gắn spark / fee-share cho fill.

ZDEX internal: `PlaceAsk` không Approve. Listing GRC20 mới: W2.4
trước, không silent revert. English: Bids, Asks, Price, Size, Mid,
AMM, Yours, Fill this order. Không “book yield”.

#### W2.3 — Thêm listing `CreatePool` (B)

Pearl: **một** pool. Listing thêm = user `CreatePool` trên **cùng**
v2, id `ugnot|<SYMBOL>`, seed ≥ 1 GNOT, fee 5/30/100, `CreatorBps=0`,
`ProtocolBps=1667`. Không `Launch`. Không zdex mint ticker. Không
pool thứ hai trên hub mới.

Picker (Wave 1) import token chưa pooled → CTA Create / Add LP, **không**
bịa hop. Wave 2 đóng cửa fail còn lại (`ui-create-fund-gaps.md`,
`next-ui.md` #1):

| Lỗ | Fix UI |
|---|---|
| Hai form Create + Liquidity | Một cửa: `?tab=create` → Liquidity new-pair. `CreatePool.tsx` không còn mental model thứ hai |
| Create xong SSE trễ → Fund / GaugePanel pool cũ | Wait `ugnot\|SYMBOL` ∈ `live.pools` rồi `addLp`. Không Fund trước khi pool hiện |
| Liquidity spender `realmAddr \|\| viewAddr` | **Chỉ** `RealmAddr()`. `viewAddr` = deployer EOA — allowance kẹt |
| `decimals === 0` silent | Block Create hoặc hiện decimals từ lookup |
| Pooled paste → `poolExists` chết | CTA Add LP |
| Extra Fund trước khi pool có | Ẩn cho đến `live.pools` |

`TransferFrom` sau CreatePool đi realm, không deployer. Catalog
`/api/tokens` + `/api/token?ref=` đã có — không ABI mới.

Nhiều pool ≠ TVL promise. Mỗi listing tự seed. Gauge v3 empty cho
pool mới cho đến `FundProgram` **v3**. Không auto-Fund 100 GNOT v1
sang id mới.

#### W2.4 — PlaceAsk / sell Approve (B)

Cùng rule CreatePool: MsgCall `Approve(spender, amount)` trên **token
package**, spender = zdex `RealmAddr`, không `grc20reg.Approve`, không
v2 `Approve` (internal ledger). Swap sell-token và `PlaceAsk` external
cùng spender.

ZDEX demo internal → skip. W2.2 density trên ZDEX chạy không đợi
W2.4. Listing GRC20 thứ hai **cần** W2.4 kẻo ask/sell revert.

#### W2.5 — Oracle sidecar Ping (A)

Không copy Uniswap v4. Không `func()`. Không persist `Observer`.
Không `hookData`. Không return-delta.

Hai shape (`hooks-gno.md`, `upgrade-modules.md` §6.1):

| Shape | Class | Việc |
|---|---|---|
| **Ping** opt-in | **(A)** | Sidecar `/r/<g1>/zdex/oracle` (hoặc `/hooks/twap` **không** gắn DEX). User/keeper `Ping(poolID)` đọc `PoolInfo` (không `cur`, giống farm). Ring N=32. `Observe` qeval | 
| AfterSwap auto | **(C)** | `HookPkg` trong `SwapExactIn` generation **mới**. v2 bytecode **không** gọi hook. Thin hub trỏ `ModuleOf("swap")=v2` **không** đủ |

Wave 2 làm **Ping**, không AfterSwap.

Spec Ping (local `/p/zdex/hooks/v1` types + math trước addpkg):

- `priceX6 = MulDiv(ReserveT, 1e6, ReserveU+VirtualU)` — cùng
  `SpotPrice`.
- Cùng height: overwrite last. Ring đầy: drop oldest, **không** panic.
- Overflow cumul: skip, Emit, vẫn lưu spot.
- `Observe(poolID, agoBlocks)` off-path. Window thiếu → panic query,
  không swap.
- **Cấm** feed `AmountOut` / `AmountIn` v1. Book limit đọc `Observe`
  sau, không trong `FillOrder` v2.
- Không Pyth. Spot nội bộ, manip window ngắn được. Copy no-advice.

v2 không `import` oracle. Sidecar không `cross(cur)` mutator DEX.
Router allowlist + AfterSwap = W2.7, không Wave 2 coding.

#### W2.6 — Farm v4 `SweepDust` (A)

**Không** tuần này. `incentives/v3` empty và **đúng** Remaining stack.
§6 đã cấm xếp v4 sớm. Mở khi **cả hai**: (1) v3 có program
`Remaining > 0` trên pool thật, (2) trước mainnet — Medium
`incentives-security.md`.

Dust nằm banker sidecar, không gán EOA:

- Share `minLiquidity / TotalLP` (burn 1000 Uniswap-v2 style).
- LP chưa `Sync` (`LastLP=0`) lúc `Fund` — 100% kẹt nếu không ai
  checkpoint.
- `MulDiv` floor (`delta=0` → `accrue` không trừ Remaining đúng lúc).
- Forfeit `RemoveLiquidity` trước Claim.

`SweepDust` **được** (path mới):

- `mustOwner` + `paused==true`.
- Chỉ banker **trên** `funded - claimed - owed`. `Owed` /
  `Claimable` **cấm** quét — đó là user chưa Claim
  (`incentives.md` §5.3: không `Recover` / `Collect` Funded−Claimed).
- Không `cross(cur)` v2. Không đụng Acc v1 100 GNOT bằng cách
  re-addpkg v1.
- Two-step admin copy v2 trên **cùng** generation v4 (v1/v3 admin
  một bước — không vá path đã live).

Cấm:

- Gọi v4 là “incentives/v2” (Pearl v2 overwrite Remaining).
- `FundProgram` vào v1 hay Pearl v2.
- Sweep khi unpaused.
- Implied APY từ dust đã quét.

UI: ẩn Sweep khỏi Guide. Admin tool sau human yes. Claim/Sync v1+v3
vẫn hai hàng (Wave 1).

#### W2.7 — Thin hub v3 (C)

“Thin hub” = path mới chỉ nới `validModule` / `Caps` (`incentives`,
`hooks`) rồi `SetModule("swap", v2)`.

**Không chạy AfterSwap.** `SwapExactIn` là hàm trong package nhận
MsgCall. `Modules` là bảng UI (`upgrade.gno`). v2 `swap.gno` không
đọc `HookPkg` — field đó **không tồn tại** trên `Pool` live.

Thin hub **đủ** khi product chỉ cần:

- UI bỏ `incentivesPkg` cứng: `ModuleOf("incentives")` trên v3.
- Pointer `hooks` cho UI, dispatch **chưa** nằm swap.

Thin hub **không đủ** khi cần AfterSwap / `CreatePoolHooked` /
`maybeRollEpoch` fix / `FillOrder` `splitFee` / volume on-chain
(§7). Lúc đó copy `swap.gno` (+ in-flight lock) vào v3 = **pool mới**.
`ugnot|ZDEX` (300 GNOT, `totalLP`, Acc v1) **ở lại** v2. User muốn
hooked AMM = `CreatePool` trên v3, không migrate.

`SetNextPkg` chỉ sau addpkg v3. Không trỏ sidecar farm. Local
`gno.land/r/zdex/v3` ≠ Pearl `gno.land/r/<g1>/zdex/v3`.

Wave 2 **không** mở W2.7. TokenPicker / ExactOut / book / listing
không cần generation DEX mới (§7).

#### W2.8 — Không CL trên live ZDEX (C / không)

Concentrated liquidity (ticks, NFT position, range) **không inherit**
pool full-range.

Live `PoolInfo` `ugnot|ZDEX`: `virtualU=0`, `feeBps=30`,
`reserveU=300e6`, CPMM `AmountOut` / `geoMean` LP. Position = shares
`TotalLP`, không range. Gauge v1 Acc indexed `TotalLP`. Tick trên
cùng id phá k, phá Acc, phá `Quote` UI.

Gno **không** cấm math tick trên realm **mới**. Product **cấm**:

- Gắn ticks / `HookPkg` / fee-tier thứ hai lên pool đang sống.
- Promise “Uniswap v3 on ZDEX”.
- NFT position migrate từ `Position.LP`.
- Flash accounting / EIP-1153 — **impossible** (OriginSend một
  envelope, banker push-only).

CL = generation DEX **khác**, pool id mới, user LP lại. Không Wave 2.
Không tuần này. Không hỏi.

---

### Thứ tự ship (sau picker + dual-gauge)

```text
W2.1 SwapExactOut wire     web/     ngay
W2.2 Book density          web/     cùng sprint nếu còn slot
W2.4 PlaceAsk Approve      web/     trước listing GRC20 external
W2.3 Một cửa CreatePool    web/     listing #2 không fail Fund
W2.5 Oracle Ping types     /p/ local tests — addpkg sau yes
W2.6 SweepDust v4          không — đợi v3 Remaining > 0
W2.7 Thin hub              không — đợi slot / AfterSwap thật
W2.8 CL on ZDEX            không bao giờ trên pool live
```

Owner W2.1–W2.4: `zdex-product`. Review copy: `zdex-trust`. Routing
oracle/farm: `zdex-research`. Realm W2.5–W2.7: `zdex-protocol` **sau**
human yes, không trong note này.

Gate W2.1: `cd web; npm test` (SwapExactOut nhánh `maxIn`, không
`SwapExactIn` khi checkbox on). Không `gno test` bắt buộc. Không
broadcast.

---

### Việc Wave 2 không làm

- Overwrite v2 DEX / AMM v1 / incentives v1/v2/v3.
- `SetModule("incentives"|"hooks"|"book")` trên live v2.
- `SetNextPkg` vào farm hoặc oracle sidecar.
- AfterSwap trong bytecode v2.
- Feed TWAP vào `AmountOut`.
- `SweepDust` trên v1 (100 GNOT Acc) hoặc v3 empty.
- Concentrated liquidity / ve-token / flash / `func()` trên ZDEX live.
- Multi-hop (pair vẫn `ugnot|SYMBOL`; hop 2 cần pool khác-GNOT — chưa có).
- Implement realm trong research này.
- Mnemonic, raw `gnokey`, tweet, APY.

---

### Tham chiếu Wave 2

| Mục | Chỗ |
|---|---|
| Exact-out fake checkbox | `web/src/components/Swap.tsx` `doSwap`; `product.md` §3 |
| `SwapExactOut` / `QuoteIn` | `gno.land/r/zdex/v2/swap.gno` |
| `/api/quote` exact-in only | `web/chain.mjs` `quoteExactIn` |
| Book table | `web/src/components/Orders.tsx`; `next-ui.md` #4 |
| FillOrder 0 fee | `book.gno`; `economics.md` §1.4 |
| Create leftover | `docs/research/ui-create-fund-gaps.md` |
| Spender ≠ deployer | `CreatePool.tsx` vs Liquidity `viewAddr` fallback |
| Ping vs AfterSwap | `upgrade-modules.md` §6.1; `hooks-gno.md` §9 |
| SweepDust Medium | `incentives-security.md`; `incentives.md` §5.3 |
| Thin hub không = hook | `upgrade.gno` `Modules`; `next-inherit.md` §6 #6 |
| CL cấm inherit | `next-inherit.md` §5; `ROADMAP.md` |
