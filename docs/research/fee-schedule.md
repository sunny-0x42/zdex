# Fee schedule — LOCAL-first, Uniswap-family trên Gno

Status: research. Không addpkg. Không `SetFeeShareBps` / `SetEpochBlocks` live. Không phải lời khuyên đầu tư. Không APY.

Mục tiêu: lịch phí **LOCAL-first** để Zdex *cảm giác* như Uniswap family mới nhất trên Gno — native `ugnot`, CPMM full-range, no-stake LP — **không** copy GnoSwap `100 GNS` create / router `0.15%` notional / withdraw `1%`.

Nguồn số Zdex: `gno.land/r/zdex/v2/types.gno` (`feeTierStable=1`, `feeTierLow=5`, `feeTierMid=30`, `feeTierHigh=100`, `poolProtocolFeeBps=1667`, `defaultFeeShareBps=8000`, `minListUgnot=1_000_000`), `math.gno` `splitFee`, `pool.gno` `CreatePool`, `swap.gno` `Quote` / `SwapExactIn` / `SwapExactOut`, `points.gno` `creditSwapPoints`, `book.gno` `FillOrder`, `gno.land/p/zdex/amm/v1` `MulDiv`. Pearl live: `deploy/pearl/r-v2/types.gno` (vẫn `5/30/100`). Uniswap: [Fees](https://developers.uniswap.org/docs/get-started/concepts/fees) (UNIfication Dec 2025, protocol ≈ 1/6). GnoSwap: [docs.gnoswap.io/core-concepts/fees](https://docs.gnoswap.io/core-concepts/fees).

---

## 0. Recommend (LOCAL)

| Mục | Số | Ghi chú |
|---|---|---|
| Swap tiers | **1 / 5 / 30 / 100 bps** | Uniswap v3 family. Default `30`. `maxFeeBps=100`. |
| Pearl live | **5 / 30 / 100** | Giữ nguyên cho đến **addpkg**. Không vá bytecode v2 đang sống. |
| Protocol | **1667 / 10000** của swap fee | ≈ 1/6 Uniswap v2 `feeTo`. Một hằng cho mọi CreatePool tier. |
| LP remainder | `fee − protocol` **vào k** | `CreatorBps=0`. Cap `noStakeLp`. Không extra stake. |
| Epoch pot | **8000 / 10000** của protocol **ugnot buy** | Sell không đổ pot. |
| Interface fee | **0** | Uniswap Labs App + Wallet = 0 (UNIfication / 2026). `web/` không markup. |
| CreatePool listing | **0** token tax | Seed **min 1 GNOT** (`1_000_000` ugnot) là LP, không phải phí niêm yết. |
| Book `FillOrder` | **0 AMM fee** | Escrow 1-1 theo ratio order. |
| `FundProgram` / `Ping` | **0** protocol cut | Fund = principal gauge; Ping = sample TWAP. |
| CL fee-per-tick | **Không** trên live v2 | Curve vẫn CPMM full-range. Không tick, không `tokensOwed`. |

Không recommend: router tax, GNS create, 1% withdraw/unstake, creator cut CreatePool, đổi `1667` / `8000` live, Uniswap v3 `1/4` protocol trên tier 1–5 bps, Uniswap v4 dynamic fee / hook fee.

---

## 1. Vì sao LOCAL-first

`gno.land/r/zdex/v2` **đã** nhận `feeTierStable=1` (`validSwapFee` + panic `"zdex: fee tier 1/5/30/100"`). Tree deploy Pearl **chưa**:

| Tree | Tiers `validSwapFee` | `poolProtocolFeeBps` | `feeShare` |
|---|---|---|---|
| LOCAL `gno.land/r/zdex/v2` | 1 / 5 / 30 / 100 | 1667 | 8000 |
| `gno.land/r/zdex` (gen 1) | 5 / 30 / 100 | 1667 | 8000 |
| `deploy/zdex-v2`, `deploy/pearl/r-v2` | 5 / 30 / 100 | 1667 | 8000 |
| Pearl hub live | 5 / 30 / 100 | 1667 (bytecode đã addpkg) | 8000 |

`Render` local vẫn viết “Fee tiers 5 / 30 / 100 bps”; `web/` select CreatePool vẫn `5/30/100`. Đó là **lag surface**, không phải lịch phí khác. Ship LOCAL: gnodev + UI option `1`. Pearl: **không** `CreatePool(..., 1)` — live panic `"zdex: fee tier 5/30/100"` cho đến generation / addpkg sau (human yes).

Một pool id = `ugnot|<SYMBOL>`. Uniswap v3 cho **nhiều** pool cùng pair khác fee; Zdex **một** symbol một pool. Creator chọn **một** tier lúc seed. Không clone 4 pool / pair.

---

## 2. Uniswap 2026 vs GnoSwap vs Zdex — cảm giác, không clone

### 2.1 Uniswap family (thừa kế ý, không port)

| Ý Uniswap 2026 | Zdex shape |
|---|---|
| v3 tiers **0.01 / 0.05 / 0.30 / 1.00%** | LOCAL: `1/5/30/100` bps trên **cùng** CPMM v2. Không tick. |
| v2 `feeTo` ≈ **1/6** swap fee (UNIfication: v2 LP 0.25% + protocol 0.05%) | `1667/10000` **của fee**, skim ngay. Không mint LP pha loãng √k. |
| Interface fee **0** (Labs App + Wallet sau UNIfication; tweet 2026-05-25) | `web/` 0 markup. Trader chỉ trả `feeBps` pool + gas Gno. |
| v2 fee **vào k**, hold LP = earn | `lp` vào `Reserve*`. `noStakeLp`. |
| `MINIMUM_LIQUIDITY = 1000` | `minLiquidity=1000` burn. |
| v4 dynamic / hook fee | **Cấm** 1:1 (`hooks-gno.md`). Không recommend. |
| v3 protocol 1 bps / 5 bps = **1/4** fee (0.0025% / 0.0125%) | **Không** copy. Zdex giữ **1667** đều mọi tier. |

Uniswap v3 UNIfication **không** đều 1/6: tier 0.01% và 0.05% protocol = 1/4 fee; 0.30% và 1.00% ≈ 1/6. Zdex chọn **Uniswap v2 `feeTo`**, một số, overflow-safe `MulDiv`. Đừng “sát Uniswap hơn” bằng cách đổi 1667 → 2500 trên tier 1.

### 2.2 GnoSwap — **không copy**

[docs.gnoswap.io/core-concepts/fees](https://docs.gnoswap.io/core-concepts/fees):

| GnoSwap | Zdex recommend |
|---|---|
| Swap CL 1/5/30/100 bps, claim `tokensOwed` | Tiers **cùng số**, curve **khác** (vào k). |
| Router **0.15% notional** (cộng trên swap) | **0.** Quote = Swap fee. Không sidecar tax. |
| Create pool **100 GNS** | **0** listing token. Seed ≥ 1 GNOT. |
| Withdraw **1%** LP fee claimed | **0.** `RemoveLiquidity` pro-rata reserve. |
| Unstake **1%** farm | **0.** Swap fee không cần stake. Sidecar Claim không cắt 1%. |
| 100% protocol extras → xGNS | Không token protocol. 80% protocol ugnot **buy** → epoch pot. |

Copy 100 GNS / 0.15% / 1% = biến Zdex thành GnoSwap-lite + wrap path. Product cấm (`compare-uniswap-gnoswap.md` §4).

---

## 3. Công thức (code)

`bpsDen = 10000`. Mọi nhân chia tiền: `MulDiv` (`p/zdex/amm/v1`) — overflow-safe, **floor**.

```
fee      = MulDiv(amountIn, feeBps, 10000)
creator  = MulDiv(fee, CreatorBps, 10000)     // CreatePool: 0
protocol = MulDiv(fee, ProtocolBps, 10000)    // 1667
lp       = fee - creator - protocol           // remainder → k
net      = amountIn - fee
reserve += net + lp
```

Buy (`ugnotSide`): `toUsers = MulDiv(protocol, 8000, 10000)` → `epochPot`; phần còn → `AccruedProtocolU`. Sell: 100% protocol token → `AccruedProtocolT`, **không** pot.

`Quote` / `QuoteIn`: chỉ `AmountOut` / `AmountIn` với `p.FeeBps`. **Không** `splitFee`, không points. `SwapExactIn` / `SwapExactOut` mới tách bucket. `SwapExactOut` fee trên `AmountIn` thực trả (refund ugnot thừa).

Dust: `MulDiv` floor → `fee=0` khi `amountIn * feeBps < 10000`. Tier **1 bps** im lặng với `amountIn < 10000` ugnot (0.01 GNOT). Points vẫn cộng nếu `volU>0`.

---

## 4. Bảng số — CreatePool (recommend)

Ví dụ `SwapExactIn` **buy**, `amountIn = 1_000_000` ugnot (1 GNOT), `CreatorBps=0`, `ProtocolBps=1667`, `feeShareBps=8000`. Số = `MulDiv` floor.

| `feeBps` | % | `fee` | protocol | LP vào k | `epochPot` (80%) | `AccruedProtocolU` (20%) | `ReserveU` + |
|---|---:|---:|---:|---:|---:|---:|---:|
| **1** | 0.01% | 100 | 16 | 84 | 12 | 4 | 999_984 |
| **5** | 0.05% | 500 | 83 | 417 | 66 | 17 | 999_917 |
| **30** (default) | 0.30% | 3_000 | 500 | 2_500 | 400 | 100 | 999_500 |
| **100** | 1.00% | 10_000 | 1_667 | 8_333 | 1_333 | 334 | 991_667 |

Cùng 1 GNOT, **sell** (input token, ugnot out): protocol token 100% `AccruedProtocolT`; `epochPot` **+0**. LP remainder vẫn vào k.

Quy ra **bps notional** (1 GNOT buy, làm tròn từ ugnot trên):

| Tier | Trader trả | LP → k | Protocol skim | trong đó pot | admin `CollectFees` |
|---|---:|---:|---:|---:|---:|
| 1 | 1.00 | 0.84 | 0.16 | 0.12 | 0.04 |
| 5 | 5.00 | 4.17 | 0.83 | 0.66 | 0.17 |
| 30 | 30.00 | 25.00 | 5.00 | 4.00 | 1.00 |
| 100 | 100.00 | 83.33 | 16.67 | 13.33 | 3.34 |

Không phải APR. Không phải cam kết volume.

**Default pool:** `30` bps — generic AMM, cùng chỗ Uniswap v2 / v3 mid. **1** bps: pair rất ổn định (stable / LST vs GNOT) khi LOCAL đã bật; Pearl chưa. **5**: ổn định. **100**: volatile / meme. `feeBps==0` → 30.

---

## 5. Bảng số — bề mặt khác 0

| Surface | Fee protocol / AMM | Ai trả | Code |
|---|---|---|---|
| `CreatePool` listing token | **0** | — | `CreatorBps` không gán = 0 |
| Seed CreatePool | ≥ **1_000_000** ugnot vào reserve | Creator = LP | `minListUgnot` |
| `AddLiquidity` | 0 | — | ratio pool |
| `RemoveLiquidity` | 0 (không 1% GnoSwap) | — | burn share |
| `FillOrder` | **0 AMM** | Taker 1-1 escrow | `book.gno` |
| `PlaceBid` / `PlaceAsk` / `CancelOrder` | 0 | Maker lock / unlock | escrow |
| `Quote` / `QuoteIn` | 0 extra (preview `feeBps`) | — | không state |
| `SwapExactIn` / `Out` | `feeBps` + split 1667 | Trader | `splitFee` |
| `HarvestPoints` / `ClaimFeeShare` | 0 cut | — | pot đã skim lúc swap |
| `CollectFees` | 0 extra | Creator / admin rút bucket | `admin.gno` |
| `Fund` / `FundProgram` | **0** cut; min **1 GNOT** *principal* | Funder → gauge | sidecar; không import swap |
| `Ping` (oracle) | **0** | Caller gas | `oracle/v1` |
| Interface `web/` | **0** | — | không `feeTo` frontend |
| Launch legacy | 100 bps; creator 4000; protocol 1000 | Không recommend listing mới | `launch.gno` |

`FundProgram` `OriginSend` là **tiền farm**, không phải protocol fee. Recommend: không lấy % Fund. `Ping` ghi `SpotPrice` vào ring 32 — không `splitFee`.

Gas Gno (`ugnot` MsgCall) **ngoài** bảng này.

---

## 6. Không CL fee-per-tick trên live v2

Uniswap v3 / GnoSwap: fee accrue **per tick crossed**, `tokensOwed`, collect riêng, in-range only.

Live Pearl `ugnot|ZDEX` + hub v2: CPMM full-range, `lp` vào k, Acc v1 indexed `TotalLP`, `Quote` một công thức. Gắn fee-per-tick lên pool đang sống = phá k, phá Acc, phá book vs spot.

Recommend:

- Live v2 / Pearl: **không** tick, không NFT position, không fee growth `X128`.
- LOCAL: thêm **tier 1 bps** trên **cùng** `AmountOut` — đã có trong `types.gno`.
- CL (nếu bao giờ): realm **mới**, pool id mới, không inherit `ugnot|ZDEX`. Không tuần research này.

---

## 7. Pearl cho đến addpkg

| Hành động | Pearl live |
|---|---|
| Swap / LP / book trên pool `30` bps | Đúng lịch 5/30/100 + 1667 + 80% |
| `CreatePool` `feeBps=1` | **Panic** cho đến addpkg generation mới |
| Đổi `poolProtocolFeeBps` / `feeShareBps` | Live param — **cần human yes**. Research này **không** đề xuất đổi |
| Router 0.15% / 100 GNS / 1% withdraw | **Không** ship |
| Interface fee | Giữ 0 |

Pool đã list giữ `FeeBps` lúc CreatePool. Không migrate tier.

---

## 8. Invariants giữ

- Money path fail-closed; `MulDiv` overflow-safe; floor.
- CreatePool: `CreatorBps=0`, protocol **1667/10000** của fee, LP remainder vào k, no extra stake.
- Protocol skim **trước** k (khác Uniswap v2 mint √k) — depth mỏng hơn `feeTo=off`.
- Epoch pot = 80% protocol **ugnot buy** only.
- Book fill 0 AMM fee (cố ý; volume có thể né AMM — `economics.md`).
- Native `ugnot` `OriginSend`. Không wrap / `wugnot`.
- Một symbol một pool; một `feeBps` / pool.
- Launch keep ≤ 20% bps, linear vest, LP lock, snipe max bps **real** reserve — **không** nới trong lịch phí DEX.

## 9. Assumptions chưa chứng

- Không qeval Pearl lại trong file này; live tiers lấy `deploy/pearl/r-v2` + `compare-uniswap-gnoswap.md` (2026-09-13).
- Uniswap interface = 0 theo docs Labs / UNIfication; protocol 1/6 theo [developers.uniswap.org fees](https://developers.uniswap.org/docs/get-started/concepts/fees). Governance có thể đổi — Zdex **không** auto-follow.
- GnoSwap 100 GNS / 0.15% / 1% theo docs public; router audit từng ghi default 0.1% — **vẫn không copy**.
- UI / `Render` local chưa expose option `1` — cần `zdex-product` sau, không nằm trong file này.
- Không chạy `gno test` / addpkg / tweet.

Không phải lời khuyên đầu tư.
