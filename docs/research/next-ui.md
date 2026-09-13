# Next UI — five items, no DEX v2 overwrite

Date: 2026-09-13  
Seat: `zdex-product`  
Scope: `web/` English UI only. No realm edits. No `SetNextPkg`. No production deploy. No `gnomi.fun`.

Pearl DEX stays `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`. Incentives are sidecars (`incentives/v1` lump, `incentives/v3` timed `FundProgram`). This list does not copy swap/LP into a v3 hub.

UI copy: English keys in `src/i18n.ts` only. No APY / guaranteed / airdrop. Signing stays in Adena.

---

## Ranked

| Rank | Item | Why this order | v2 overwrite? |
|---|---|---|---|
| **1** | CreatePool Approve | First listing on Pearl is still easy to fail. Create tab cannot Approve (gate bug). Unblocks every other tab. | No |
| **2** | Token picker | Swap modal is a stub; Liquidity is still a native `<select>`. This is the DEX identity gap. | No |
| **3** | FundProgram v3 vs v1 dual gauge | Live 100 GNOT lump is v1; timed Remaining is v3. UI shows one row (`gaugeFor` first match). | No |
| **4** | Order book density | Escrow is real; the screen is a MsgCall table. Visual book, no new ABI. | No |
| **5** | Sync all pkgs | **Already shipped.** Claim/Sync already walk every gauge pkg. Do not rebuild. | No |

---

## 1. CreatePool Approve — ship first

**Today (`CreatePool.tsx`):** lookup → Approve on **token package** (spender = `realmAddr`) → `CreatePool` with `OriginSend` ugnot. That routing is correct. The button gate is not.

```
ready = resolved && ≥1 GNOT && tokenBase > 0 && Adena
        && (internal || (tokPkg && realmAddr && approved))

Approve button disabled={!ready}
Create  button disabled={!ready}
```

For an external GRC20, `ready` requires `approved === true`, so **Approve is never clickable**. Create is also locked until Approve, which cannot run. Liquidity’s Approve is independent (`!realmAddr` / missing pkg only) — two doors, two rules.

Other leftover (do not expand this ticket into a rewrite):

- No on-chain allowance read; `setApproved(true)` after a successful tx is the only signal.
- Extra **Fund gauge →** still `setTab("liq")` without `addLp`. After success, `addLp("ugnot|"+symbol)` already runs — drop the pre-success button.
- `decimals === 0` fallback still silent; show decimals from lookup or block Create.
- Liquidity CreatePool path still does not require Approve.

**UI (English):**

| Key / label | Copy |
|---|---|
| `approveFirst` | Approve token *(keep)* |
| `approveThenCreate` | Approve the DEX realm on the token, then create the pool. *(keep)* |
| `approved` | Approved |
| Create CTA | disabled until `approved` **or** `resolved.internal` |
| Approve CTA | enabled when lookup + tokPkg + realmAddr + Adena + amount > 0 — **not** gated on `approved` |

**Pass:** split `approveReady` vs `createReady`. Disable Create until Approve succeeds (external only). Disable Approve until `realmAddr` is known (never `live.viewAddr`). Hide **Fund gauge →** until the new pool is in `live.pools`. Tests: `i18n.test.ts` already asserts TOKEN-package Approve copy — add a component/hub test only if the gate is extracted.

Tiny. Highest leverage. No v2.

---

## 2. Token picker — shared modal

**Today:**

- Swap: token pills open a modal of GNOT + **pooled** symbols. No search, no wallet balance, no import, no catalog. Pair is still derived from the selected pool (`ugnot|<SYMBOL>`).
- Liquidity: long native `<select>` (catalog + pooled + “Custom token…”). Paste/lookup only on `__custom`.
- Create: paste-only. No catalog.
- Backend already: `/api/tokens` (pools + `TokenCatalog()` + GRC20 `Snapshot()`, `balance`, `realmAddr`) and `/api/token?ref=`.

**Ship a shared `TokenPicker` used by Swap + Liquidity** (Create can deep-link the same modal later). Not a DEX v2 change: pool id stays `ugnot|<SYMBOL>`; GNOT-in still `OriginSend`.

Modal sections (English):

1. Search input — symbol, name, `gno.land/r/…`, registry `pkg.SYMBOL`.
2. **Your tokens** — wallet balances (`/api/token` / wallet snapshot).
3. **Pooled** — current GNOT markets, logos via `TokenAvatar` (letters if no Gnoscan asset).
4. **Import** — paste key → Look up → if pooled, select; if not, send Liquidity/Create to seed.

Swap: token-first. Default in = GNOT. Choosing a listed symbol sets `poolId`. Choosing an unpooled token does **not** invent a hop — CTA “Create pool” / “Add liquidity”. No wrap, no wugnot.

Liquidity: replace the `<select>` with the same modal. Keep fee 5 / 30 / 100 only when `isNew`.

Do not: multi-hop router, independent non-GNOT pairs, generated coin art.

---

## 3. FundProgram v3 vs v1 — dual gauge display

**Already on the wire (do not re-fetch):**

- `chain.mjs` `loadIncentives` concatenates v1, then v2 if `Version()`, then v3 if `Version()`. Each row has `pkg`.
- Wallet `Claimable` **sums** across those rows per `poolId`.
- Writes: `Fund` / `FundProgram` → latest live sidecar (`pkgForFunc`). `Claim` / `Sync` default pkg is still v1 — the panel already overrides by passing `g.pkg`.

**Display bug:** `gaugeFor(live, id)` is `gauges.find(id)` → **first row = v1 lump**. GaugePanel then shows one “Gauge funded”, one `rewardPerBlock` APR, one Remaining. The timed v3 program (Remaining, end height, per-block) is invisible next to the live 100 GNOT lump.

**UI:** two stacked rows on the same pool, not a merged number.

| Row | Source | Show | CTA |
|---|---|---|---|
| Lump | `incentives/v1` | Total funded. Label **Lump (v1)**. No fake APR from a lump (`gaugeBoostPct` stays a ratio, not a return). | No new Fund on v1 while v3 is live (writes already go to v3). |
| Timed | `incentives/v3` (else v2) | Remaining, reward/block, end height. Label **Timed program (v3)**. Duration 1 day / 7 days already exists. | **Start timed program** → `FundProgram` on latest sidecar. |

English copy (no APY):

- `lumpGauge` — Lump (v1)
- `timedGauge` — Timed program
- `remaining` — Remaining
- `endsAt` — Ends at height
- Keep `gaugeHint`: extra ugnot, does not replace LP swap fees, not financial advice.

`FundProgram` stacks Remaining on the latest sidecar; it does **not** overwrite v1 state. Do not imply the 100 GNOT lump moved.

Helper: `gaugesFor(live, poolId)` → all rows. Keep `gaugeFor` as “primary display” only if tests depend on it; prefer filtering by `pkg` in the panel.

---

## 4. Order book density

Escrow ABI is live on v2 (`PlaceBid` / `PlaceAsk` / `FillOrder` / `CancelOrder`). Do not add a book module. Do not touch reserves.

**Today (`Orders.tsx`):** pool `<select>`, give/want as raw integers, one shared Fill amount (`1000000` default), global `live.orders` (not filtered by pool). Empty copy says “this pool” but the table is all pools. `Order` already has `pool`, `side`, `giveAmt`, `wantAmt`, `maker`, `price`.

**Density pass (visual, same msgs):**

- Filter `orders` to `pool.id`.
- Two columns: **Bids** (lock GNOT) / **Asks** (lock token). Sort bids high→low, asks low→high.
- Human units: bid give = GNOT (`fmtGnot`), ask give = token (`fmtInt` / decimals when known). Limit = GNOT per token, not `want/give` regardless of side.
- Depth bar per row (`size / max(size in side)`). Cumulative total optional.
- Mid line: best bid / best ask vs AMM `quote1gnot`.
- Fill amount **on the row**. Ask fill attaches that many `ugnot`. Highlight `maker === walletAddr` as **Yours**.
- Place form: label Give/Want with the actual asset, expiry height keep.

Until Approve exists for PlaceAsk (external GRC20), keep asks on internal / already-allowed tokens — do not silently revert. That Approve is a **separate** ticket (same token-pkg spender as Create). Out of this density pass.

English: Bids, Asks, Price, Size, Total, Mid, AMM, Yours, Fill this order. No “order book APY”.

---

## 5. Sync all pkgs — already shipped

Do **not** schedule a rebuild.

`GaugePanel` Claim and Sync:

```
rows = live.gauges.filter(id === pool.id)
call(Claim|Sync, [pool.id], "", row.pkg) for each row
```

Wallet pending is the sum of `Claimable` across those pkgs (`chain.mjs`). Routing tests in `hub.test.ts` already pin Fund/FundProgram → v3 when live, Claim default → v1 (panel overrides with `g.pkg`).

**Optional polish only** (same pass as dual display, not a fifth project):

- Copy `syncGauge`: **Sync all packages** (behavior already matches).
- Keep **Sync** visible when pending > 0 (today Claim replaces Sync). First Sync on a new pkg still snapshots `LastLP`; hiding it behind Claim on v1 is how a v3 position stays at 0.
- Do not Sync DEX v2. Do not add a “sync hub” control.

---

## Out of this list

- Overwrite / copy DEX v2 → v3 hub.
- `SetModule("incentives")` on live v2 (panic).
- Merge Create tab into Liquidity (still right long-term; Approve gate is the blocker this week).
- Exact-out `SwapExactOut` (checkbox is still not a tx).
- Mobile 3-tab shell.
- PlaceAsk / swap token-in Approve (same token-pkg rule; not density).
- Production deploy, addpkg, tweet.

---

## Suggested next coding pass

1. Split CreatePool Approve/Create gates + drop pre-success Fund button. `cd web; npm test`.
2. Shared TokenPicker on Swap + Liquidity.
3. Dual gauge rows (v1 lump / v3 timed) + Sync copy polish (item 5).
4. Book density on the existing order list.

Human yes still required for merge / addpkg / prod.
