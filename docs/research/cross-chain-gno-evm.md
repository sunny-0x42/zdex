# Gno ↔ EVM — hai AMM + một bridge, không fork Uniswap

Status: research. Không deploy. Không addpkg. Không sửa realm live.
Không overwrite `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`.
Không copy Uniswap GPL vào repo này. Không phải lời khuyên đầu tư.
Không “Uniswap-equivalent”. Uniswap v4 hooks **không** port 1:1.

Câu hỏi: Zdex trở thành venue Gno ↔ EVM **như thế nào** mà không fork
Solidity Uniswap lên Gno, không đè Pearl DEX v2, không giả atomic swap
trong `SwapExactIn`.

---

## Nguồn (cite, không bịa)

| Chủ đề | Cite |
|---|---|
| Route Gno ↔ EVM | [gnolang/gno#5624](https://github.com/gnolang/gno/issues/5624) (opened 2026-05-01). Option C **selected**: 1-hop Gno ↔ Union ↔ EVM khi CometBLS + UCS03-ZKGM trên Gno. Option A **interim**: Gno —(IBC v2)→ AtomOne —(IBC v1)→ Osmosis —(Union ZKGM)→ EVM |
| Testnet IBC GNOT / ATONE / GRC20 | [@_gnoland 2026-06-11](https://x.com/_gnoland/status/2065109638895559104): native GNOT ↔ AtomOne, native ATONE ↔ Gno, GRC-20 ↔ AtomOne. **Không public** |
| Onbloc Union IBC | [onbloc/gno-ibc](https://github.com/onbloc/gno-ibc): Union core, CometBLS, state-lens, UCS03-ZKGM. Architecture: [docs/architecture](https://github.com/onbloc/gno-ibc/blob/main/docs/architecture/README.md) |
| Bridge testnet live | [@_gnoland 2026-08-13](https://x.com/_gnoland/status/2087822637871567106): testnet GNOT, ETH, USDT (ERC-20) giữa **Gno Sapphire** và **Ethereum Sepolia**. UI [bridge.onbloc.xyz](https://bridge.onbloc.xyz) |
| Auction wrapped GNOT trên Base | [@_gnoland 2026-07-24](https://x.com/_gnoland/status/2080486472722063486): auction tokens distributed as wrapped GNOT on Base. **Distribution, không phải AMM Zdex** |
| Coins vs GRC20 | [Effective Gno — Coins / GRC20](https://docs.gno.land/resources/effective-gno): Coins **IBC-ready**; GRC20 **not IBC-ready yet** |
| Zdex live | `gno.land/r/zdex/v2` + Pearl `…/g1mv…/zdex/v2`: `OriginSend` ugnot, `CreatePool`, no wrap. `types.gno` `poolProtocolFeeBps=1667`. `docs/research/fee-schedule.md`, `economics.md`, `compare-uniswap-gnoswap.md` |
| GnoSwap wrap | [docs.gnoswap.io FAQ](https://docs.gnoswap.io/references/faq): pools hold GRC-20; native GNOT → `wugnot` |
| Uniswap fee 0.25 / 0.05 | [Uniswap Fees](https://developers.uniswap.org/docs/get-started/concepts/fees) (UNIfication): v2 LP **0.25%** + protocol **0.05%**. Core [GPL-3.0-or-later](https://github.com/Uniswap/v2-core) |
| Hooks Gno | `docs/research/hooks-gno.md` — Uniswap v4 **không** 1:1 |
| Pearl freeze | `docs/research/next-inherit.md`: không overwrite v2. Gno `addpkg` không đè path |
| Company split | `docs/COMPANY.md`: Zdex ≠ Gnomi Labs (`gnomi.fun`) |

---

## 0. Verdict

Zdex **không** biến thành một Uniswap fork xuyên chain.

Hình đúng: **hai AMM độc lập + một bridge có sẵn (rồi mới tới Union 1-hop)**.

| Thành | Việc | Không làm |
|---|---|---|
| **Gno AMM** | Pearl v2 CPMM, native `ugnot` `OriginSend`, listing `CreatePool`. Giữ nguyên | Fork Uniswap Solidity. Wrap bắt buộc. Đè path live |
| **Bridge** | Consume IBC / Union đã có. P1 = deposit UI. P2 = list IBC **Coin** nếu banker nhận denom | Tự viết light client. Atomic swap trong `SwapExactIn` |
| **EVM AMM** | Repo **mới**, chain **mới** (Arc test hoặc Sepolia test). Chỉ **share fee policy** 0.25 / 0.05 | Copy `Uniswap/v2-core` GPL vào `C:\Users\Hi\zdex`. Deploy EVM bytecode trong repo này |

Uniswap v2 core là **GPL-3.0-or-later**. Paste pair/factory vào zdex = nhiễm license + clone EVM — cả hai đều cấm (`README.md`: viết lại primitive Gno, không clone EVM).

Pearl v2 **immutable**. `addpkg` không overwrite
(`docs/research/upgrade-modules.md`). Live path
`gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2` đứng yên.
Surface mới = path mới hoặc UI ngoài DEX.

Hai chain testnet **không** cùng một pool:

| Mặt | Chain | Việc |
|---|---|---|
| Zdex DEX live | Pearl `pearl-1` | Một pool `ugnot\|ZDEX`, `feeBps=30` (`compare-uniswap-gnoswap.md` qeval 2026-09-13) |
| Bridge Onbloc live | Sapphire ↔ Sepolia | Testnet GNOT / ETH / USDT (`@_gnoland` 2026-08-13) |

P1 **không** được nói “bridge xong là swap trên Pearl”. Asset về Sapphire; Pearl pool không tự có.

---

## 1. Asset layer

Ba lớp asset **khác nhau**. Gộp chúng thành một “wrapped GNOT AMM” là path GnoSwap, không phải Zdex.

### 1.1 Native `ugnot` trên Gno (Zdex quote)

Zdex pool id = `ugnot|<SYMBOL>` (`AGENTS.md`, `pool.gno`). Buy-side:

- `CreatePool` / `SwapExactIn` / `AddLiquidity` nhận `ugnot` qua envelope tx.
- `takeUgnot` (`swap.gno`): `cur.Previous().IsUserCall()` + `unsafe.OriginSend().AmountOf("ugnot") == amount`. Không `IsUser()` (MsgRun nuốt envelope — `hooks-gno.md` §3.4, Effective Gno OriginSend).
- Banker **push-only**. Không `transferFrom` native.

Không wrap trên Gno core. Đó là khác biệt product với GnoSwap (`README.md` bảng; FAQ GnoSwap: pool chỉ GRC-20 nên GNOT → `wugnot`).

### 1.2 Wrapped GNOT trên EVM (không phải pool Gno)

Auction Gno.land (2026-07) phân phối token **as wrapped GNOT on Base**. Đó là **distribution** sau sale, không phải AMM Zdex, không phải listing `CreatePool`. Zdex không custody, không mint wrapped GNOT trên Base, không claim đó là pool của mình.

Khi Union 1-hop (#5624 Option C) hoặc interim Option A chạy, GNOT trên EVM sẽ là voucher / wrapped theo UCS03-ZKGM — **asset của bridge**, không phải reserve Pearl.

### 1.3 ETH / USDT vào Gno: banker Coin, không GRC20 — nếu IBC

[Effective Gno](https://docs.gno.land/resources/effective-gno):

> Coins … They're IBC-ready …
> GRC20 tokens … aren't IBC-ready yet.

Hệ quả cho Zdex:

| Inbound | Hình đúng trên Gno | Hình sai |
|---|---|---|
| ETH / USDT qua IBC / ZKGM | Banker **Coin** (IBC denom / voucher). `OriginSend` / `GetCoin` theo denom | Mint GRC20 “WETH” rồi bắt `Approve` như GnoSwap wrap |
| GRC20 Gno → EVM | Testnet Jun 2026 **đã** chuyển GRC-20 ↔ AtomOne nhưng **không public**. Docs vẫn: GRC20 not IBC-ready | Giả mainnet GRC20 hop |

P2 chỉ list IBC denom **khi** denom đó là banker Coin mà `OriginSend` / banker đọc được. Pool id hiện tại hard `ugnot|<SYMBOL>` và `nativeDenom = "ugnot"` (`types.gno`). List `ibc/…` hay voucher ETH **không** nhét vào Pearl v2 — generation mới, path mới.

Wrap Coin → GRC20 (pattern `r/gnoland/wugnot`) là **tuỳ chọn ngoài core**. Core Zdex không bắt wrap.

### 1.4 Bảng asset

| Asset | Ở đâu | Zdex dùng sao | Cite |
|---|---|---|---|
| `ugnot` native | Gno banker | Quote + `OriginSend`. Không wrap | `swap.gno` `takeUgnot`; `AGENTS.md` |
| GRC20 listed | `grc20reg` / internal mint | Cặp `ugnot\|SYMBOL`. Approve + TransferFrom nếu external | `pool.gno` `CreatePool` |
| `wugnot` | GnoSwap / demo wrap | **Không** quote Zdex | GnoSwap FAQ; `README.md` |
| Wrapped GNOT on Base | Auction distribution | Không phải pool Zdex | `@_gnoland` 2026-07-24 |
| Testnet GNOT / ETH / USDT | Sapphire ↔ Sepolia qua Onbloc | P1 deposit UI **chỉ** trỏ bridge. Không swap Pearl | `@_gnoland` 2026-08-13 |
| IBC Coin (tương lai) | Banker denom | P2 list trên generation **mới** nếu Coin | Effective Gno; #5624 |

---

## 2. AMM layer

### 2.1 Gno: giữ v2 CPMM

Live Pearl (`compare-uniswap-gnoswap.md`, `next-inherit.md`):

- Curve: full-range `x*y=k` (`gno.land/p/…/zdex/amm/v1` `MulDiv` / `AmountOut`).
- Listing: `CreatePool(cur, tokenKey, symbol, amountU, amountT, feeBps)` — two-sided, min `1_000_000` ugnot, `CreatorBps=0`.
- Fee live: 5 / 30 / 100 bps (Pearl bytecode). LOCAL thêm tier 1 (`fee-schedule.md`). Default 30.
- Protocol: `poolProtocolFeeBps=1667` ≈ **1/6 của swap fee**, skim ngay. LP remainder vào k. Cap `noStakeLp`.
- `SwapExactIn` / `SwapExactOut` single-hop, một pool một symbol.
- Escrow book **cùng** pkg. Farm = sidecar, không `SetModule("incentives")` trên v2 (panic).

Uniswap v3 ticks / NFT, v4 hooks / flash accounting: **không** gắn lên `ugnot|ZDEX` (`hooks-gno.md`, `compare-uniswap-gnoswap.md` §3.2).

### 2.2 EVM: AMM mới, share **policy** 0.25 / 0.05 — không share **code**

Uniswap v2 sau UNIfication ([Fees](https://developers.uniswap.org/docs/get-started/concepts/fees)):

| | LP | Protocol | Trader |
|---|---:|---:|---:|
| v2 mọi pool | 0.25% | 0.05% | 0.30% |

Zdex CreatePool default `feeBps=30` + `ProtocolBps=1667` (`economics.md` §1.1, `fee-schedule.md` bảng 1 GNOT buy):

| Bucket | ugnot trên 1 GNOT | % notional |
|---|---:|---:|
| Fee gộp | 3_000 | 0.30% |
| Protocol skim | 500 | 0.05% |
| LP vào k | 2_500 | 0.25% |

Đó là **policy** Zdex đã chọn (Uniswap v2 `feeTo` shape, skim không mint LP pha loãng √k). EVM AMM — nếu ship — **cùng số**: trader 0.30%, LP 0.25%, protocol 0.05%. Không copy Uniswap v3 1/4 trên tier 1–5 bps. Không copy router tax 0.15% GnoSwap.

Repo EVM = **ngoài** `C:\Users\Hi\zdex`. Candidate: Arc test hoặc Ethereum Sepolia test. Human yes sau. Không `addpkg` Gno, không Solidity Uniswap trong tree này.

Vì sao tách repo:

1. License: Uniswap v2-core **GPL-3.0-or-later**. Fork vào zdex = GPL lan.
2. VM: Gno không có `CREATE2` pair, không banker pull, không EIP-1153 (`hooks-gno.md`).
3. Pearl freeze: EVM contract không được “vá” vào `r/…/zdex/v2`.

### 2.3 Hai AMM không share liquidity

Reserve Pearl không nhảy khi user bridge Sapphire→Sepolia. Reserve EVM (khi có) không nhảy khi `SwapExactIn` trên Gno. Bridge chuyển **asset**, không ghép k.

---

## 3. Router

`SwapExactIn` live (`swap.gno`): một `poolID`, một `tokenIn` (`"ugnot"` hoặc symbol), `minOut`, `maxHeight`. Buy = `takeUgnot` + push token. Sell = pull token + `sendUgnot`. **Không** hop 2, không gọi bridge, không lock-and-mint.

Cấm: “cross-chain atomic swap” giả trong ABI v2. Gno không có flash accounting; OriginSend một envelope; banker push-only (`hooks-gno.md` §3.4). Packet IBC / ZKGM **async** (send → relayer → recv/ack/timeout — [onbloc process flows](https://github.com/onbloc/gno-ibc/blob/main/docs/architecture/README.md)). Một `MsgCall` không settle hai chain.

Router **sau** khi asset tồn tại **cả hai** phía:

| Phase | Router được phép | Router cấm |
|---|---|---|
| P0–P1 | Quote **một** venue (Pearl hoặc, P1, chỉ hiện link bridge) | Quote “best of Gno+EVM” khi asset chưa có hai phía |
| P2 | Quote Gno pool nếu IBC Coin đã list trên generation mới | Gọi `SwapExactIn` v2 với denom lạ |
| P3 | Quote Gno AMM **và** EVM AMM **sau** khi cùng asset có mặt hai chain | Atomic fill hai k trong một tx Gno |
| P4 | Intent / off-chain solver: user ký Gno **hoặc** EVM; bridge là bước riêng; fill từng venue | Nhét Union `Send` vào `SwapExactIn` Pearl |

`Quote` / `QuoteIn` chỉ đọc `FeeBps` CPMM, không `splitFee`, không points (`economics.md`). Cross-chain quote = **UI/solver**, không đổi chữ ký v2.

#5624 Option C hứa 1-hop UX (một chữ ký) **khi** CometBLS + ZKGM trên Gno xong. Option A cần **hai chữ ký** (Gno→AtomOne, rồi AtomOne→EVM). Zdex không giả 1-hop trước khi chain có.

---

## 4. Phases

Không addpkg. Không overwrite Pearl. Mỗi phase fail-closed: thiếu điều kiện thì **đứng**, không ship nửa vời.

### P0 — docs (file này)

Map route, asset, fee policy, cấm. Không realm, không UI.

### P1 — consume bridge testnet, deposit UI only

Có sẵn: [bridge.onbloc.xyz](https://bridge.onbloc.xyz) Sapphire ↔ Sepolia, testnet GNOT / ETH / USDT (`@_gnoland` 2026-08-13). Stack: [onbloc/gno-ibc](https://github.com/onbloc/gno-ibc) (Union core + UCS03-ZKGM).

Zdex làm: link / deep-link / copy hướng dẫn **deposit**. Không custody. Không wrap trên Pearl. Không `CreatePool` ETH trên Pearl. Không nói asset Sapphire = pool Pearl.

GnoSwap đã dùng cùng bridge cho campaign IBC (ETH/USDC trên Sapphire) — đó là **họ**; Zdex không copy wrap path.

### P2 — Gno AMM list IBC denom **nếu** banker Coin

Điều kiện (tất cả):

1. Denom là Coin (IBC voucher / banker), không phải GRC20 “sắp IBC”.
2. `OriginSend` / banker đọc đúng denom (Effective Gno: Coins IBC-ready).
3. Generation **mới** — Pearl v2 `nativeDenom="ugnot"` + pool id `ugnot|SYMBOL` không mở rộng im lặng.
4. Testnet IBC GRC20 Jun 2026 **vẫn không public** — đừng list GRC20 như IBC denom.

AtomOne hop (#5624 Option A) có thể đưa Coin qua Osmosis→Union. Zdex không tự chạy relayer.

### P3 — EVM AMM (repo mới)

Sepolia test hoặc Arc test. Policy fee 0.25 / 0.05 trên default 0.30%. CPMM full-range, no-stake LP **ý**. Không Uniswap GPL trong zdex. Không v4 hooks 1:1 (EVM bên kia cũng không phải lý do để mang `func()` / `hookData` về Gno).

Human yes: repo, chain, deploy. Ngoài scope file này.

### P4 — intent / router

Quote hai venue khi **cùng** asset đã có hai phía. Bridge = bước user (hoặc solver) riêng. Fill Gno bằng `SwapExactIn` hiện tại; fill EVM bằng AMM P3. Không atomic cross-chain trong v2.

Phụ thuộc #5624 Phase 6 (channel + Voyager) hoặc Onbloc channel đã mở. Zdex không implement CometBLS.

### Phụ thuộc chain (không phải việc Zdex)

| Việc | Ai | Cite |
|---|---|---|
| CometBLS Groth16 trên Gno | gnolang/gno #5583 / #5624 Phase 2 | #5624 |
| UCS03-ZKGM realm trên Gno | #5624 Phase 4 + onbloc/gno-ibc | #5624; onbloc README |
| 1-hop Gno ↔ Union ↔ EVM | Option C, khi Phase 6 xong | #5624 Decision |
| Interim Gno→AtomOne→Osmosis→Union→EVM | Option A, two-signature, Osmosis maintenance risk | #5624 Option A cons |
| IBC GNOT/ATONE/GRC20 public | Chưa. Jun 2026 testnet only | `@_gnoland` 2026-06-11 |

---

## 5. What NOT to do

| Cấm | Vì sao | Cite |
|---|---|---|
| Wrap bắt buộc trên Gno core | Biến Zdex thành GnoSwap-lite. Product: native `ugnot` | `README.md`; `AGENTS.md`; GnoSwap FAQ `wugnot` |
| Fork Uniswap Solidity / copy `v2-core` vào zdex | GPL-3.0; clone EVM; không chạy trên GnoVM | Uniswap/v2-core license; `README.md` |
| Claim Uniswap-equivalent / hooks 1:1 | Gno cấm stored `func()`, `IHooks`, `hookData`, flash accounting, CREATE2 flags | `hooks-gno.md` §1–4; `trust.md` claims cấm |
| Overwrite Pearl v2 / `SetNextPkg` vào farm | Path immutable. `SetModule("incentives")` panic. NextPkg = hub DEX, không sidecar | `next-inherit.md`; `upgrade-modules.md`; `WEEK.md` |
| Atomic cross-chain trong `SwapExactIn` | Một envelope OriginSend; packet IBC async | `swap.gno`; onbloc architecture recv/ack |
| List IBC như GRC20 | Docs: GRC20 not IBC-ready. Testnet GRC20 hop **không public** | Effective Gno; `@_gnoland` 2026-06-11 |
| Coi auction wrapped GNOT Base là AMM Zdex | Distribution, không pool | `@_gnoland` 2026-07-24 |
| Pad / bonding-curve / snipe window mới trong DEX | Listing = `CreatePool`. `Launch` legacy | `WEEK.md`; `COMPANY.md` |
| Router tax, 100 GNS create, 1% withdraw | Copy GnoSwap extras | `fee-schedule.md` §2.2 |
| ve-token / gauge vote trên CreatePool | Product cấm | `compare-uniswap-gnoswap.md` §3.2 |
| `FundProgram` vào incentives/v2 | Overwrite Remaining | `next-inherit.md` |
| Giả 1-hop trước CometBLS+ZKGM | Option C chưa xong; Option A = hai chữ ký | #5624 |

---

## 6. `gnomi.fun` DEX picker — không phải việc Zdex

`docs/COMPANY.md`: Zdex **tách** Gnomi Labs (`gnomi.fun`) và Gno Vault. Repo này không edit gnomemepad.

DEX picker / pad trên `gnomi.fun` là **pad work, công ty khác**. Zdex không ship pad, không bonding-curve listing mới (`WEEK.md`).

Việc Zdex **giữ ổn định** — để pad (nếu có) list vào DEX mà không đụng ABI:

```text
CreatePool(cur realm, tokenKey, symbol string, amountU, amountT, feeBps int64) string
```

- `cur.Previous().IsUserCall()` — EOA, `OriginSend` = `amountU`.
- `amountU >= 1_000_000` ugnot. `amountT > 0`.
- `feeBps` 0 → 30; live Pearl: 5 / 30 / 100 (LOCAL thêm 1 — **không** gọi `CreatePool(..., 1)` trên Pearl cho đến generation mới).
- Token đã tồn tại (internal hoặc `grc20reg`). External: Approve + TransferFrom.
- Pool id `ugnot|<SYMBOL>`. Trùng → panic `"zdex: pool exists"`.
- `CreatorBps=0`. `ProtocolBps=1667`.

Không đổi chữ ký `CreatePool` / `SwapExactIn` / `AddLiquidity` trên live v2 (`hooks-gno.md` header). Pad không được `SetNextPkg`. Zdex không inherit pad UI.

---

## Findings

| # | Phát hiện | Hệ quả Zdex | Cite |
|---|---|---|---|
| F1 | Cross-chain = **hai AMM + bridge**, không một Uniswap fork | P0–P4 như §4. Không Solidity trong repo này | #5624; `README.md` |
| F2 | 1-hop Gno↔Union↔EVM là **mục tiêu chain** (Option C), chưa phải runtime Zdex | Không giả 1-click trong v2 | #5624 Decision / Phase 2–6 |
| F3 | Interim route Option A = Gno→AtomOne→Osmosis→Union→EVM, **hai chữ ký**, Osmosis maintenance | UX P4 phải hiện từng hop | #5624 Option A |
| F4 | Testnet IBC GNOT/ATONE/GRC20 (Jun 2026) **không public** | Không list GRC20 như IBC | `@_gnoland` 2026-06-11 |
| F5 | Bridge **live** là Sapphire↔Sepolia (GNOT/ETH/USDT), không phải Pearl | P1 UI trỏ Onbloc; không nhét ETH vào `ugnot\|ZDEX` | `@_gnoland` 2026-08-13; qeval Pearl |
| F6 | Coins IBC-ready; GRC20 **chưa** | P2 = banker Coin. Wrap GRC20 = ngoài core | Effective Gno |
| F7 | GnoSwap quote `wugnot`; Zdex quote `ugnot` `OriginSend` | Cấm wrap bắt buộc | GnoSwap FAQ; `takeUgnot` |
| F8 | Auction wrapped GNOT on Base = **distribution** | Không phải venue AMM Zdex | `@_gnoland` 2026-07-24 |
| F9 | Fee policy default đã khớp Uniswap v2 UNIfication 0.25 / 0.05 | Share **số** với EVM AMM; không share **GPL code** | `types.gno` 1667; Uniswap Fees; Uniswap/v2-core GPL-3.0 |
| F10 | `SwapExactIn` single-hop, một envelope | Cấm atomic cross-chain trong ABI v2 | `swap.gno` |
| F11 | Uniswap v4 hooks không 1:1 trên Gno | EVM AMM P3 cũng không phải lý do mang hooks về Pearl | `hooks-gno.md` |
| F12 | Pearl v2 immutable, 1 pool, `NextPkg=""` | Surface mới = path mới hoặc UI. Không overwrite | `next-inherit.md` |
| F13 | `CreatePool` là ABI listing ổn định cho pad ngoài | Giữ chữ ký. Pad = `gnomi.fun` (công ty khác) | `pool.gno`; `COMPANY.md` |

---

## Next ship

**P1 deposit UI only** — `web/` English: link [bridge.onbloc.xyz](https://bridge.onbloc.xyz) (Sapphire ↔ Sepolia, testnet GNOT / ETH / USDT). Copy: deposit ≠ swap; Sapphire ≠ Pearl; testnet faucet money (`trust.md`).

Không: realm, `addpkg`, `SetNextPkg`, wrap, `CreatePool` ETH, quote giả hai venue, overwrite Pearl v2.

P2+ chờ Coin IBC public + generation mới. P3 chờ repo EVM **ngoài** zdex + human yes. P4 chờ asset hai phía.

Không phải lời khuyên đầu tư. Không APY. Không airdrop.
