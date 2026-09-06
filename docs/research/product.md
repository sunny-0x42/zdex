# Zdex product UX (`web/`)

Date: 2026-09-06  
Seat: `zdex-product`  
Scope: `C:\Users\Hi\zdex\web` only. English UI. No production deploy. No full rewrite this pass.

Constraint: **do not re-add Vietnamese UI**. `src/i18n.ts` is English-only (`dictionaries = { en: copy }`). `i18n.test.ts` locks `Trade` / `Connect` / wallet copy. Keep it that way.

---

## 1. Shippable today vs Uniswap-style DEX UX

Zdex `web/` is a working **single-hop GNOT DEX** (Adena, native `ugnot` via `OriginSend`, no wugnot). It is not yet a Uniswap-style *product*. The shell is pool-admin + power-user, not token-first retail.

Tabs live: `swap` Trade, `pools`, `liq` Liquidity, `book` Orders, `create` Create pool (nested, not in `NAV_TABS`), `port` Portfolio, `stats` Overview.

| Surface | Shippable now | Uniswap-style bar |
|---|---|---|
| **Trade** | Pool `<select>` → GNOT or listed symbol. Local quote + `/api/quote`. Slippage 0.5/1/2%. Max. Flip. Confirm modal + `/api/preflight` (paused, snipe, insufficient GNOT, slippage). Native `ugnot` attached on GNOT-in. Signing stays in Adena. | Token-first pair. Modal picker with search/balances. Independent in/out tokens. Routed hops. Custom slippage. Disable CTA on insufficient / no pool. Exact-out is a real `SwapExactOut`. |
| **Pools** | Cards + table: price, TVL, 24h volume, fee, fee APR, spark. Click → Trade. Add LP. Empty: “No markets yet…”. New pool button → Create. | Search, sort, watchlist, fee-tier filter, token logos, volume windows, deep link to a pool page. |
| **Liquidity** | Add GNOT + token (catalog / paste key). Existing pool keeps ratio. New token → `CreatePool` + fee 5/30/100 bps. External GRC20 `Approve`. Remove LP by shares. Pool cards with your LP. | Pair picker both sides. Share of pool. Preview tokens out. NFT/position card. Independent collect fees. |
| **Create** | Form: symbol, token key, GNOT ≥ 1, token amount, fee tier. Calls `CreatePool`. | Uniswap has **no** separate “create” tab. New pair is “add liquidity to a token that has no pool”. |
| **Orders** | Place bid (lock GNOT) / ask (lock token). Open table: id, side, give, want. Fill + Cancel. Empty row copy. | Depth book, mid vs AMM, human units, your orders vs all, expire, partial fill amount per row. Or hide until that exists. |
| **Portfolio** | Connect-gated. GNOT + per-pool token + LP. Points life/epoch + claimable GNOT. `ClaimFeeShare`. `HarvestPoints` on the **current** pool only. Vest claim. Watch address works. | Positions valued in quote. Unclaimed fees per pool. Harvest all. Activity. |
| **Overview** | TVL, volume, pool count, height. Protocol card: network, admin, paused, epoch pot, gnoweb. | Charts, fee revenue, top pools — optional. |
| **Wallet / live** | Adena + watch `g1`. Network switch local / Sapphire. SSE `/api/stream`. Height pill. Faucet when present. Tx toast + hash copy. | Persist last pair. Disconnect. Explorer link. |

**Demo-ready (honest):** swap GNOT↔listed token, add/remove LP, list an existing GRC20, claim points, read TVL. Signing never leaves the browser.

**Not demo-ready as “complete DEX”:** picking a token like Uniswap, first-run empty markets, Create vs Add LP (two doors), order book as a book, phone layout with 6 tabs.

Protocol facts the UI already matches (do not regress):

- Native `ugnot` `OriginSend` — no wrap UI.
- Listing = `CreatePool`. `Launch` is legacy (`?tab=launch` remaps to `create`).
- Fee tiers 5 / 30 / 100 bps; copy says protocol ~1/6, LPs ~5/6; no extra stake (`noStakeHint`).
- Pool id `ugnot|<SYMBOL>`.

---

## 2. Gaps

### 2.1 Token picker polish

Swap is **pool-first**: one `<select>` of `SYMBOL / GNOT`, then a second select that is only `GNOT` vs that symbol. Liquidity is a long native `<select>` of catalog + pooled tokens + “Custom token…”.

Missing vs Uniswap token modal:

- Search (symbol, name, `gno.land/r/…` key).
- Wallet balances in the list (lookup API already returns `balance`; Swap/Liq lists do not show it).
- Recent / pooled-first grouping. Catalog mixes `/api/tokens` (pools + `TokenCatalog()` + GRC20 `Snapshot()`).
- Logos — UI uses 2-letter `tok-av`. Fine until a picker exists.
- Swap cannot import a token that is not already a pool. Import lives only on Liquidity/Create.
- `swapHint` (“GNOT is attached… Internal tokens do not need approval.”) is unused.

Backend is ahead of UI: `/api/tokens` + `/api/token?ref=` already resolve registry keys and package paths.

### 2.2 Empty states

| Place | Today | Need |
|---|---|---|
| Pools | Dashed empty + “Create a pool to get started.” No button. | CTA → Create / Liquidity. |
| Trade, no pools | Pool select shows “No pool yet”. Confirm toasts `noPool`. Featured hidden. No CTA. | Same empty + Create. |
| Liquidity, no pick | Form enabled but primary disabled (`!resolved`). Remove LP still shows. | Idle copy + paste/search. *(Tiny fix this pass: Add LP from Pools now preselects the pool token.)* |
| Orders | “No open orders.” in the table. No empty for “no pool”. | Human empty; hide Fill. |
| Portfolio | “Connect a wallet…” only if no `walletAddr`. Watch/viewAddr skips it. No “no LP” empty. | Connect vs watch vs zero positions. |
| Overview | Always KPIs; zeros look live. | Connecting vs empty chain. |
| `noPoolsYet` | Defined, unused. | Use or delete. |

### 2.3 Create vs Add LP overlap

Two `CreatePool` doors:

1. **Create tab** (`CreatePool.tsx`) — symbol + key typed by hand. No catalog, no lookup, no `Approve`. Weak path.
2. **Liquidity** — pick catalog/custom, lookup, approve, fee tier if `isNew`, else `AddLiquidity` at ratio.

Pools “New pool” goes to (1). Markets “Add LP” goes to (2). A user listing a GRC20 can succeed on Liquidity and fail on Create (forgot approve / wrong key).

Uniswap: **one** Add liquidity flow. No pool → seed + fee. Has pool → ratio. Create tab should die as a form and become a deep link into Liquidity (`pick=__custom` or empty token).

### 2.4 Order book UX

Escrow (`PlaceBid` / `PlaceAsk` / `FillOrder` / `CancelOrder`) is real. The screen is a raw MsgCall form.

- Amounts are unscaled integers. Bid give is `ugnot` (default `1000000` = 1 GNOT) but not labeled. Ask give is token units. Limit hint is `want/give` regardless of side — not “GNOT per token”.
- No bid/ask depth, no AMM mid, no filter by pool (table is global `live.orders`).
- One shared Fill amount for every row; default fill `1000000` if empty. Ask fill attaches that many `ugnot`.
- No maker, expiry, remaining. No approve on ask. No “your orders”.
- Until this is a book, consider hiding `book` on mobile or gating behind caps already (`tabsFor` drops it when `book` cap is off).

### 2.5 Mobile

Breakpoint `860px`: desktop nav off, `BottomNav` on, pool table → cards.

Still broken vs a phone DEX:

- Six tabs (Trade, Pools, Liquidity, Orders, Portfolio, Overview) at 11px. Create is correctly **not** in `NAV_TABS`, but six is still too many.
- Header keeps network + height + faucet + wallet. Overflows; no wrap.
- Ticker + page-head eat first screen.
- Toasts `bottom: 16px` sit under the bottom nav (`z-index` 40 vs 35, but physically covered).
- `.pair` stays 2-col. Token inputs 1.55rem — ok. Native selects are painful to search.
- `safe-area-inset-bottom` is set; thumb targets on Fill/Cancel in a wide table are not.

---

## 3. Other product bugs (do not treat as “done”)

- **Exact out is a checkbox, not a tx.** `caps.exactOut` shows the control and `quoteInLocal`, then `doSwap` always `SwapExactIn` with `minOut = 0` in that branch. Price can move; no max-in protection. Either wire `SwapExactOut` or hide the checkbox.
- **HarvestPoints** uses the global selected pool, not the row the user is looking at.
- Featured on Trade: “Trade” button is a no-op (already on swap + that pool).
- Create tab has no approve; Liquidity does.

---

## 4. Top 5 UI ship items to “complete” the product

Ranked by how much they close the Uniswap-style gap. English copy only. No Vietnamese strings. No production deploy in this list.

### 1. Token picker (Swap + Liquidity)

Modal, not `<select>`: search, pooled vs import, wallet balance, paste `gno.land/r/…` or registry key (reuse `/api/token`). Swap becomes **token-first** with GNOT default; pool id is derived (`ugnot|<SYMBOL>`). This is the difference between “realm UI” and “DEX”.

### 2. One liquidity surface — kill the duplicate Create form

Keep tab `create` as a route if needed (`?tab=create` → Liquidity new-pair). One card: pick token → existing `AddLiquidity` at ratio, or seed `CreatePool` + fee 5/30/100 + approve for external GRC20. Pools “New pool” and Markets “Add LP” both land here with the token filled. Remove `CreatePool.tsx` as a second mental model.

### 3. Trade money-path completeness

Empty markets → CTA to create. Disable confirm when no pool, amount 0, or insufficient (preflight already knows `insufficient_gnot`). Show `swapHint`. **Fix exact-out** (`SwapExactOut` + maxIn, or remove the checkbox). Confirm modal already exists — keep it.

### 4. Orders as a book, or don’t show it as one

Per-pool bids/asks, human GNOT vs token, limit as price, your orders vs rest, fill amount on the row, expire height. Until then: raw units + shared fill is a trap; hide or relabel “Escrow (advanced)”.

### 5. Mobile shell + empty CTAs

Three primary tabs: Trade, Pools, Portfolio. Liquidity/Orders/Overview behind Pools or a “More”. Compact header (wallet + network). Toasts above bottom nav. Empty states with one primary button. (LP preselect from Pools is done — see below.)

---

## 5. This pass

- Research only, plus one tiny safe UX fix.
- **Fix:** Liquidity preselects `pool.symbol` so Markets → Add LP is not a blank token `<select>` with the primary button disabled.
- Not done: picker, Create merge, exact-out tx, book, mobile nav.
- Do not merge, addpkg, or ship production without human yes.
