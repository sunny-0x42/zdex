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
