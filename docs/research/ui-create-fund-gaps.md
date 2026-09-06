# UI Create / Fund — Pearl APIs + remaining UX

Date: 2026-09-06  
Seat: `zdex-product`  
Scope: remaining UX **after** the parent Create/Approve/Fund patch. No realm edits. No UI edits in this note (parent owns those files).

Pearl live:

- DEX: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`
- Incentives: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1`
- Token example: `gno.land/r/…/token` GRC20, registry key `pkg.SYMBOL`

Parent intended (treat as done):

1. CreatePool: lookup GRC20, Approve on **TOKEN package** (not registry), scale by decimals, min 1 GNOT, Adena required
2. Liquidity.approve → token pkg `Approve(spender, amount)`
3. Markets Incentivize → Liquidity
4. GaugePanel: min 1 GNOT Fund + connect hint
5. After CreatePool success → Liquidity (so user can Fund)

---

## 1. Pearl APIs — parent has the right ones

### 1.1 External GRC20: `token.Approve(cur, spender, amount)`

Call **the token realm**, not `grc20reg`, not zdex `Approve`.

```
// token package (e.g. deploy/pearl/token/token.gno)
func Approve(cur realm, spender address, amount int64)
```

| Field | Value |
|---|---|
| `pkg_path` | token realm from registry key (`tokenPkgFromKey`: `gno.land/r/…/pkg.SYMBOL` → `gno.land/r/…/pkg`) |
| `func` | `Approve` |
| args | `[spender, amount]` — **2 args** |
| `spender` | zdex **realm** address = `RealmAddr()` / `thisAddr()`, **not** deployer `viewAddr` |
| `amount` | GRC20 **base units** (decimals-scaled) |
| `send` | empty |

Why not the other two Approves:

| Surface | Signature | Why wrong for listing |
|---|---|---|
| zdex v2 `Approve` | `(cur, symbol, spender, amount)` | Internal ledger only (`getTok` panics on unknown symbol) |
| `grc20reg.Approve` | `(cur, tokenKey, spender, amount)` | Wrapper runs with **registry** as current realm. Pearl GRC20 `CallerTeller.guardHome` rejects foreign pkg (`ErrForeignCallerTeller`). Comment in `deploy/pearl/r-v2/token.gno`: registry write wrappers are non-crossing. |

DEX pull after allowance:

```
CreatePool → takeUgnot + grc20reg.TransferFrom(dex cur, key, caller, realm, amountT)
```

Allowance must be `owner=user, spender=zdex RealmAddr`. User MsgCall on the **token package** sets that.

Internal tokens: skip Approve (in-realm `CallerTeller.Transfer`). Parent already hides the button when `resolved.internal`.

### 1.2 `CreatePool` — send `ugnot`

```
func CreatePool(cur realm, tokenKey, symbol string, amountU, amountT, feeBps int64) string
```

| Field | Value |
|---|---|
| `pkg_path` | v2 DEX (`FUNC_SURFACE.CreatePool` = `create`) |
| args | `[tokenKey, symbol, amountU, amountT, feeBps]` |
| `send` | `{amountU}ugnot` — **exact match** (`takeUgnot`: `OriginSend == amountU`) |
| min | `amountU >= minListUgnot` (1_000_000) |
| `tokenKey` | GRC20 registry key (`pkg.SYMBOL`), not a bare ticker |
| `amountT` | base units |

Fee 5 / 30 / 100 bps. Pool id `ugnot|<SYMBOL>`. Native GNOT only — no wrap.

### 1.3 `Fund` — incentivesPkg, amount is OriginSend

```
func Fund(cur realm, poolID string)
```

| Field | Value |
|---|---|
| `pkg_path` | `net.incentivesPkg` / `live.modules.incentives` (`FUNC_SURFACE.Fund` = `incentives`) — **not** v2 |
| args | `[poolID]` only |
| `send` | `{ugnot}ugnot` — **only** denom ugnot (`len(os)==1`) |
| min | `sent >= minFundUgnot` (1_000_000) |
| gate | `PoolInfo.totalLP > minLiquidity` (1000) — pool must already exist |

`Claim` / `Sync` same pkg, no send. `Claim` = `Sync` on-chain.

Routing in `pkgForFunc` is already correct (`hub.test.ts`). Do not send Fund to v2.

---

## 2. Remaining UX after the parent patch

Parent closes the **wrong-pkg / unscaled / no-Adena / no-min-Fund** holes. These are leftover.

### 2.1 CreatePool — still easy to fail the listing

| Gap | Why it still bites |
|---|---|
| Approve and Create are independent | Create is enabled as soon as lookup + 1 GNOT + Adena. User can skip Approve → `TransferFrom` / insufficient allowance. No “approved” state, no allowance read. |
| `ready` does not require `tokPkg` / `realmAddr` | Approve stays clickable then throws `approveNeedPkg` if key is not `pkg.SYMBOL`. |
| Paste copy vs lookup | `pasteHint` says “registry key **or package path**”. `LookupToken` + `grc20reg.Get` need the registry key. Bare `gno.land/r/…/token` → `tokenNotFound`. |
| No catalog on Create | Liquidity has `/api/tokens`. Create is paste-only. Two doors, two failure modes. |
| Pooled token is a dead end | `j.pooled` → `poolExists` only. No CTA “Add LP instead”. |
| No balances | Lookup can return `balance`; Create does not show GNOT or token. User discovers insufficient in Adena revert. |
| Extra `Fund gauge →` | Always visible, `setTab("liq")` **without** `poolId`. Parent already `addLp` on success. Button before the pool exists dumps the user on the wrong / empty GaugePanel. |
| Decimals 0 fallback | Missing decimals from lookup → `toTokenBase(x, 0)` = raw integer. Silent under-deposit. |
| int64 | Scaled amount can exceed Gno `int64`. No UI cap. |

### 2.2 After CreatePool → Liquidity (Fund target can be wrong)

`create()` does `addLp("ugnot|" + symbol)` after `runTx` (which waits + `refreshLive`). Context still resolves:

```
pool = pools.find(id) || featured || pools[0] || null
```

If HubSnapshot lags (Pearl first pool, waitTx timeout, SSE stale):

- `poolId` is the new id but `pool` falls back to featured / `null`
- Liquidity remounts with `pick = pool?.symbol` → empty or **another** pair
- GaugePanel is `existing \|\| pool` → Fund would hit the **wrong** pool, or `pickPoolFirst`

No “waiting for the new pool” empty. No scroll / `#gauge` to Fund. Create still has a second Fund button that skips `addLp`.

Liquidity **isNew** path (`CreatePool` from the LP form) never calls `addLp`; GaugePanel while seeding a new token is bound to `existing \|\| pool` = the **previous** live pool.

### 2.3 Liquidity Approve — leftover spender bug

Parent moved args to `[spender, amount]` on `tokenPkgFromKey(key)`. Still:

```
spender = realmAddr || live.viewAddr
```

`live.viewAddr` is config **deployer** `g1mv00…` (wallet preview), **not** `RealmAddr()`. If `/api/tokens` fails to return `realmAddr`, Approve sets allowance for the deployer EOA. CreatePool `TransferFrom` still spends as the **realm**. Listing reverts; allowance is stuck on the wrong spender.

Create tab does **not** use this fallback (throws if `realmAddr` empty). Liquidity should match.

Other Liquidity leftovers:

- No `connectToSign`; Add / Create / Remove stay clickable on watch → `needWallet` toast
- Existing-pool token field is **base units** (`fmtInt(need)`), while new-pair input is **human** + `toTokenBase`. Same form, two unit systems
- Token wallet balance unused; GNOT balance shown
- Remove LP: default `burn=0`, no Adena gate, no on-card “unclaimed gauge is forfeited”
- Approve amount for existing = `need + 1%` (`maxToken`); label still shows `need` only

### 2.4 Markets Incentivize → Liquidity (tab only)

Both **Add LP** and **Incentivize** already call `addLp(id)` (tab `liq` + `poolId`). Parent routing is satisfied.

Leftover: identical behavior. No scroll to GaugePanel, no `?focus=gauge`. User lands on Add LP, may never see Fund. Empty markets CTA still goes to **Create**, not Liquidity (fine for first listing; Fund still needs a live pool).

### 2.5 GaugePanel — min + connect done; flow not

Parent: `fundOk` = pool + Adena + `u >= 1e6`, `minFund` copy, `connectToSign` / `pickPoolFirst`.

Leftover:

| Gap | Detail |
|---|---|
| Disabled reason | Amount `< 1` with wallet connected only shows the static min line; button dies with no extra reason |
| No GNOT balance / gas | `doContractCall` `gasFee = 1_000_000` **plus** send. Fund min 1 GNOT needs **≥ 2 GNOT** in the wallet (gas + send). Same for CreatePool. Never explained |
| First Sync | Gauge pays `min(LastLP, live)` against Acc. First `Sync` with `LastLP=0` pays 0 and snapshots. Copy does not say “Sync after you add LP or you earn 0” |
| `gauge.paused` | Hint only; Fund stays enabled |
| Wrong pool bind | See §2.2. Panel always renders if `incentivesPkg` is set, even while Create is targeting a token that is not that pool |
| Claim vs Sync | Pending > 0 → Claim; else Sync. Correct vs on-chain. Easy to skip Sync after LP |

`Fund` on an empty/missing pool reverts `zdex: empty pool`. After first CreatePool, `totalLP > minLiquidity` holds (seed LP). The race is **UI pool selection**, not the chain gate.

### 2.6 Copy still describes the old Approve

`i18n.ts` Guide create:

> External GRC20 requires **Approve on the zdex realm**, then TransferFrom.

That is the **internal** zdex `Approve(symbol, spender, amount)`, which panics for external tokens. After the patch, Guide/trust copy must say: Approve **on the token package**, spender = zdex `RealmAddr`. `ui-guide-claims.md` §2.9 has the same stale line. `i18n.test.ts` only asserts the substring `Approve`, so the wrong sentence still passes.

### 2.7 Adjacent writes that still pull tokens with no Approve UI

Same `pullUserToken` → `grc20reg.TransferFrom` (needs the same token-pkg allowance):

- **Swap** token-in (`SwapExactIn` with `tokenIn != ugnot`) — no Approve, amount is raw integer not decimals-scaled
- **PlaceAsk** and **FillOrder** on a bid (taker pays token)

Parent did not claim these. They will fail on Pearl for external GRC20 the same way CreatePool used to.

---

## 3. What not to change

- Do not call `grc20reg.Approve` as a fallback in UI without a Pearl homeGuard re-check
- Do not `Fund` on v2; do not put Fund amount in args
- Do not send extra denoms with Fund (`len(os)==1`)
- Do not use deployer `viewAddr` as Approve spender
- Signing stays in Adena (`doContractCall`). No server-side key
- No realm edits in this pass

---

## 4. Suggested next UI pass (not this parent patch)

1. Spender = `realmAddr` only; disable Approve until `/api/tokens` (or lookup) returns it
2. Sequential Create: lookup → Approve (required unless internal) → CreatePool → wait until `ugnot|SYMBOL` is in `live.pools` → Liquidity with that id, scroll GaugePanel
3. Drop the pre-success `Fund gauge →` on Create, or bind it to `addLp` after the pool exists
4. Liquidity: Adena hint; human units for existing `need`; never `live.viewAddr` as spender
5. Markets Incentivize: `addLp` + focus GaugePanel
6. Gauge: show wallet GNOT vs send+gasFee; “Sync once after LP”; disable Fund when `gauge.paused`
7. Fix Guide: Approve on **token package**, spender zdex realm
8. Swap token-in / PlaceAsk: same token-pkg Approve + decimals (separate ticket)

Priority for a first listing on Pearl (0 pools): **(1) spender**, **(2) wait-for-pool before Fund**, **(7) Guide**. Without (2), the parent “CreatePool success → Liquidity so user can Fund” still Funds nothing or the wrong id.
