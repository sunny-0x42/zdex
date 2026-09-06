# zdex in-app Guide copy (English)

Date: 2026-09-06  
Seat: `zdex-growth`  
Scope: paste-ready English for the in-app Guide. UI is English-only. No APY. No Vietnamese in the sections below. No tweet. No gnomi.fun.

Facts: native `ugnot` via `OriginSend` (no wrap / no wugnot), overflow-safe `MulDiv` AMM, listing = `CreatePool`, `Launch` vest + snipe cap are legacy, escrow book on-chain. Live UI default: Pearl.

**How to paste:** copy each numbered section as one Guide block. Keep headings. Links are live. Skip the Sources appendix.

**UI gaps (do not paste):** Liquidity `GaugePanel` exposes **Fund** and **Claim**, not a separate **Sync** button. On-chain `Claim` = `Sync`. First opt-in (LastLP = 0, pays 0) is not visible until pending > 0. Add a Sync control, or always show Claim. Exact-out checkbox still sends `SwapExactIn` — do not document it as Exact out.

---

## 1. What zdex is

zdex is a non-custodial DEX on Gno.land. You sign in Adena. zdex does not hold keys and does not custody your coins.

Pools are always `ugnot|<SYMBOL>` against native GNOT. GNOT is attached to the transaction as `ugnot` (`OriginSend`). There is no wrap and no wugnot.

The AMM is constant-product with overflow-safe `MulDiv` math. Listing a market is **Create pool**: you seed both sides and open a pair. zdex does not issue the listed token. A ticker on zdex is not a zdex-minted meme.

Swap fee tiers are **0.05% / 0.30% / 1.00%** (5 / 30 / 100 bps). On Create-pool markets the protocol takes about **one-sixth** of that fee; LPs keep the rest **in the pool**. Holding LP receives the LP share of swap fees. No extra stake.

You can also rest **escrow limit orders** on-chain (bid / ask, partial fill, cancel). The book does not move AMM reserves.

Legacy launched pools may still show linear **vest**, an LP **lock**, and a **snipe cap** on the first blocks. New listings use Create pool, not Launch.

UI: [https://zdex-gno.netlify.app](https://zdex-gno.netlify.app)  
Source: [https://github.com/sunny-0x42/zdex](https://github.com/sunny-0x42/zdex)  
On-chain (Pearl v2): [https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2)

This public UI talks to Gno **Pearl testnet**. Testnet GNOT is faucet money. Nothing here is an offer, an airdrop, or financial advice.

---

## 2. Connect Adena + Pearl testnet

1. Open [https://zdex-gno.netlify.app](https://zdex-gno.netlify.app). Production defaults to **Gno Pearl**.
2. In the header network picker, choose **Gno Pearl** (`pearl-1`) if it is not already selected.
3. Install Adena: [https://adena.app/](https://adena.app/). Keplr does not support Gno `MsgCall`.
4. Click **Connect** → **Adena**. Approve the zdex connection. Adena adds / switches to:
   - Chain ID: `pearl-1`
   - Name: Gno Pearl
   - RPC: `https://rpc.pearl.testnets.gno.land:443`
5. Confirm the address starts with `g1`.
6. Get testnet GNOT from the **Faucet** button, or [https://pearl.testnets.gno.land/faucet](https://pearl.testnets.gno.land/faucet). You need GNOT for gas and for GNOT-in swaps / LP / bids.

**Watch** (paste a `g1…` address) is read-only. It does not sign.

If Adena is missing, the app tells you: Install Adena at https://adena.app/

---

## 3. Create a pool

Create pool lists an **existing** GRC20 against GNOT. Minimum **1 GNOT**. Pool id: `ugnot|<SYMBOL>`.

Two doors land on the same `CreatePool` call:

- **Pools → New pool** (Create pool form): symbol, token key, GNOT, token amount, fee tier.
- **Liquidity**: pick a catalog token or **Custom token…**, paste a GRC20 registry key or package path (`gno.land/r/…`), **Look up**, then deposit both sides.

Steps (Liquidity path, preferred):

1. Connect Adena on Pearl.
2. Open **Liquidity**.
3. Enter GNOT (≥ 1).
4. Pick the token, or paste its key and Look up.
5. If the token is **external** GRC20, click **Approve token** for this realm, then confirm in Adena.
   Internal (in-realm) tokens do not need approval. GNOT is attached to the tx — no wrap.
6. Choose a fee tier: **0.05%** (tight), **0.30%** (standard), **1.00%** (volatile).
7. Confirm **Create pool**. Adena sends `amountU` as `ugnot` with the call.

If no pool exists yet, the form says: *No pool yet — this deposits the first liquidity and opens the pair.*

Protocol takes about one-sixth of the swap fee; the rest stays with LPs. Create pool has **no creator cut**.

You can also use the gnoweb form on the v2 realm: [Create a pool](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2).

---

## 4. Swap

**Trade** swaps GNOT and a listed token at the pool price. One hop. Native `ugnot` — GNOT-in is attached to the transaction.

1. Connect Adena.
2. Open **Trade**. Pick a pool (`SYMBOL / GNOT`).
3. Choose what you pay: **GNOT** or the listed symbol. Enter the amount (or **Max**).
4. Read the quote (local + on-chain). If they differ, the app uses the on-chain quote.
5. Set **Slippage** (0.5% / 1% / 2%). **Minimum received** is the slippage floor (`minOut`).
6. **Confirm swap**. Preflight may warn:
   - Trading is paused.
   - Anti-snipe window is open. Large trades may revert.
   - Exceeds anti-snipe cap.
   - Insufficient GNOT.
   - Price moved beyond slippage.
7. Sign in Adena.

Internal tokens do not need approval. External GRC20 still needs **Approve** (do that on Liquidity if a sell reverts).

Snipe cap (legacy launched pools only): while the window is open, each tx is capped as a % of **real** reserve. Create-pool markets do not open a snipe window.

gnoweb: same `SwapExactIn` on [Pearl v2](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2).

---

## 5. Add / remove liquidity

Holding LP receives the LP share of swap fees. **No staking required.** LP lives in the DEX realm, not in the gauge sidecar.

**Add**

1. Open **Liquidity**.
2. Pick a pooled token (or create a new pair — see Create a pool).
3. Existing pools keep the current GNOT / token **ratio**. The token field is filled for you.
4. External GRC20: **Approve token**, then **Add liquidity**.
5. Sign. GNOT is attached as `ugnot`.

Legacy launched pools may show **Liquidity is locked until the unlock height.** You cannot add or remove until that height.

**Remove**

1. On the same Liquidity card, see **Your LP**.
2. Enter LP shares to burn.
3. **Remove**. Sign.

Remove returns GNOT + token in proportion to your share (minus the tiny burned minimum liquidity, Uniswap-v2 style).

If this pool is incentivized, **Claim** the gauge **before** you remove LP. Leaving without Claim forfeits unclaimed gauge (next section).

---

## 6. Limit orders (escrow)

**Orders** are on-chain escrow. They do not touch AMM reserves. Filling an order does not pay the AMM swap fee and does not accrue swap points.

| Side | You lock | You want |
| --- | --- | --- |
| **Bid** — lock GNOT, buy token | `ugnot` attached to `PlaceBid` | pool token |
| **Ask** — lock token, sell for GNOT | pool token (`PlaceAsk`; Approve if external) | GNOT |

1. Open **Orders**. Pick the pool.
2. Choose Bid or Ask. **Give** and **Want** are integer units (GNOT bids: `1000000` = 1 GNOT).
3. Optional **Expiry height** (`0` = none).
4. **Place order**. Funds sit in realm escrow until fill or cancel.
5. Open table: **Fill** (taker pays the other side) or **Cancel** (maker refund).

Partial fills keep the original limit ratio. All-or-none is available on-chain; the UI places `false` (partial OK).

Amounts in this tab are raw integers, not decimal GNOT. Cancel returns remaining escrow to the maker.

gnoweb book: [Pearl v2](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2) → Order book.

---

## 7. Points and fee share

Swaps and LP positions accrue **points**. **80% of protocol GNOT fees** (the protocol slice of the swap fee, on GNOT-in / buy) go to the epoch pot and are shared pro-rata after the epoch closes. This is not a token, not an airdrop, and not a return.

On **Portfolio**:

- **Lifetime** — cumulative points (`Life`).
- **This epoch** — points in the open epoch.
- **Claim fee share** — GNOT from the **just-closed** epoch (`ClaimFeeShare`). One claim per closed epoch.
- **Harvest LP points** — move this pool’s LP AccPoints into your score (`HarvestPoints`). Uses the pool currently selected. Harvest before you expect the epoch to close if you want that LP share in the pot.

Trader volume (GNOT in, or GNOT out on a sell) also scores points. Sells do not fund the epoch pot.

If you skip **more than one** epoch with no claim / harvest / swap, the closed-epoch window can expire and that share is gone. Default epoch length is 28,800 blocks (~1 day at 3s).

Protocol pause blocks `ClaimFeeShare`. LP swap fees in the pool are separate: they stay in reserves; you receive them when you remove LP. No extra stake.

---

## 8. Incentivized gauges (Fund / Claim)

Extra `ugnot` on a sidecar realm. **Does not replace** LP swap fees or the epoch pot. LP stays on v2. The gauge only reads `PositionOf`. Not financial advice.

On-chain: [Pearl incentives v1](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1)

**Fund** — any EOA may attach GNOT (`OriginSend`) to a live pool (`totalLP > 1000`). Minimum **1 GNOT**. UI: Liquidity → **Fund gauge**. gnoweb has the same form.

**Sync first, then Claim**

- On-chain **`Claim` = `Sync`**: settle `min(LastLP, live PositionOf)` against Acc, pay what is owed, then snapshot current LP.
- After **Add liquidity**, call **Sync** / **Claim** once **before** you expect to share the next Fund. The first call pays **0** — that is the opt-in snapshot (`LastLP` was 0). New LP does not take Funds that already happened.
- After a Fund, **Claim** to receive your share.
- **Before Remove liquidity**, Claim. If you leave LP without Claim, unclaimed gauge for that window is **forfeited**. The sidecar stays solvent; the share is not paid to you later.
- Pause on the sidecar blocks new Fund. Claim / Sync still work.

UI: Liquidity card, **Claim incentive** when a balance is pending. Pools marked **Incentivized** have a gauge on. If the network has no sidecar, the app says the incentives package is not configured.

There is no emission token, no vote-escrow, and no extra stake for swap fees.

---

## 9. Networks

Use the header picker. Packages are immutable. Liquidity stays on the generation you used. A later path is a new package, not a migrate.

| Network | Chain ID | What it is | DEX package | Faucet |
| --- | --- | --- | --- | --- |
| **Gno Pearl** (live UI default) | `pearl-1` | Current Gno.land testnet. Public zdex v2. | `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2` | [Pearl faucet](https://pearl.testnets.gno.land/faucet) |
| **gnodev local** | `dev` | Your machine. Not a public network. | `gno.land/r/zdex/v2` | none |
| **Gno Sapphire** (older) | `sapphire-1` | Previous testnet. Older zdex v1. No state from Pearl. | `gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex` | Sapphire faucet in the app |

Pearl gnoweb v2: [https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2)

Pearl incentives: [https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1](https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1)

Local: run `start-gnodev.ps1`, then `cd web; node server.mjs` → http://127.0.0.1:8787 (default net **local**). Gnoweb: http://127.0.0.1:8888/r/zdex

Pearl is a **fresh** testnet (not a Sapphire hardfork). Balances and realms do not carry over. This is **not** Gno.land mainnet / betanet.

---

## 10. Safety / not financial advice / testnet

- **Testnet.** Pearl (`pearl-1`) is a Gno.land testnet. Faucet GNOT is not mainnet GNOT. Do not treat balances as real value.
- **You sign.** Adena holds the key. Watch address cannot move funds. zdex does not swap for you and does not take deposits.
- **No wrap.** Native `ugnot` only. If a UI or bot asks you to wrap GNOT / mint wugnot for zdex, that is not this protocol.
- **Listing ≠ issuance.** Create pool lists a token you already have. zdex is not a launchpad.
- **Fees are mechanics.** Trailing “fee APR” on Pools (if shown) is a 24h estimate from volume, not a promised return. Volume can be zero.
- **Points are a ledger.** Lifetime points are not a token and not a guaranteed airdrop.
- **Gauges are optional extra ugnot.** Fund can stop. Leaving LP without Claim forfeits unclaimed gauge. Not a yield product.
- **Snipe / vest / LP lock** apply to **legacy launched** pools. Read the pool card (snipe until, unlock height) before you trade or add LP.
- **Slippage and pause.** Confirm the preflight. A paused protocol blocks swaps, LP, book, and fee-share claim. Gauge Claim still works if the sidecar is funded.
- **Immutable packages.** LP and open orders stay on the package you used. Switching the UI to v2 does not move Sapphire v1 positions.
- **Not audited as a certification.** The repo has `gno test`. That is not an audit report.
- **Not financial advice.** Nothing in this Guide is an offer to buy or sell anything.

Wallet: [Adena](https://adena.app/)  
UI: [https://zdex-gno.netlify.app](https://zdex-gno.netlify.app)  
Code: [https://github.com/sunny-0x42/zdex](https://github.com/sunny-0x42/zdex)

---

## Sources (research only — do not paste into the Guide)

Shipped zdex:

- `web/src/i18n.ts`, `App.tsx` titles, `Header.tsx` Adena + network picker, `CreatePool.tsx` / `Liquidity.tsx` / `Swap.tsx` / `Orders.tsx` / `Portfolio.tsx` / `GaugePanel.tsx`
- `web/config.js` `NETWORKS` (pearl default on Netlify via `VITE_ZDEX_DEFAULT_NET=pearl`)
- `gno.land/r/zdex/v2` `render.gno`: “GNOT-native AMM generation 2. Two-sided pools, native `ugnot` (no wrap), escrow limit orders.”
- `pool.gno` `CreatePool` min 1 GNOT; `types.gno` fee tiers 5/30/100, `poolProtocolFeeBps=1667`, vest/snipe constants on Launch
- `swap.gno` `OriginSend` match; `assertSnipe` on real reserve
- `book.gno` escrow PlaceBid / PlaceAsk / FillOrder / CancelOrder
- `points.gno` `defaultFeeShareBps=8000`; miss more than one epoch → `Closed = 0`
- `gno.land/r/zdex/incentives/v1/incentives.gno`: `Claim` = `Sync`; comment “RemoveLiquidity on v2 without Claim forfeits unclaimed gauge”; first Sync earned 0
- `docs/research/trust.md` allowed public claims; `docs/research/economics.md` fee split; `docs/research/incentives.md` three layers

Gno.land / DEX talk (quoted, not shilled):

- Gno docs, *Gno networks*: Pearl / Test16 is “the latest Gno.land testnet, released on the 26th of August, 2026, and the one to use unless you have a reason not to.” Chain ID `pearl-1`, RPC `https://rpc.pearl.testnets.gno.land:443`. [docs.gno.land/resources/gnoland-networks](https://docs.gno.land/resources/gnoland-networks)
- Gno docs, *Getting started*: “Pearl is the current testnet.” Adena is the browser wallet for gnoweb Actions. [docs.gno.land/builders/getting-started](https://docs.gno.land/builders/getting-started)
- `gnolang/gno` release `chain/pearl`: “Pearl is a **fresh testnet** … **No state carries over from sapphire** — balances, realms, and registered names start from zero.” [github.com/gnolang/gno/releases/tag/chain%2Fpearl](https://github.com/gnolang/gno/releases/tag/chain%2Fpearl)
- Ecosystem DEX talk on X (2026-08/09) is mostly **GnoSwap** concentrated-liquidity AMM, wrap/stake/launchpad — different product. Examples: @_gnoland (2026-06-18) “GnoSwap, the first DEX on Gno.land”; @airdrops551 (2026-08-29) “GnoSwap is making that idea liquid”; @Prof4477 (2026-09-06) “the best-fit use-case for gno.land isn't another DEX…”. zdex Guide stays on native `ugnot` CPMM + escrow; do not copy CL / APY / launchpad copy.
