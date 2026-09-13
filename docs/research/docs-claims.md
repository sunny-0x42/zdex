# Docs page claims — in-app English

Seat: `zdex-trust`. Not a legal opinion. Not investment advice. Does not ship UI.

**Surface:** in-app Docs (parent chưa ship `web/src/components/Docs.tsx`).  
**Grep 2026-09-13:** `web/src/i18n.ts` có; `Docs.tsx` **không** có. Không sửa English UI. File này = heading + copy được phép khi product thêm Docs.

**Claim khung (được):** Uniswap-inspired UX on Gno.  
**Claim khung (cấm):** Uniswap v4 equivalent / Uniswap-equivalent / “Uniswap on Gno” / first DEX.

Dictionary: `en` only. Không đụng `gnomi.fun`. Public net = **Pearl testnet**. Non-custodial: Adena + OriginSend. No guaranteed APY.

Nguồn: `docs/research/ui-guide-claims.md`, `trust.md`, `ui-uniswap-layout.md`, `compare-uniswap-gnoswap.md`, `web/src/i18n.ts`.

---

## 1. Six allowed H2 (English, đúng chữ này)

Thứ tự cố định. Không gộp. Không thêm tab `Launch`. Không H2 có APY / earn / mainnet / audited / guaranteed / Uniswap-equivalent / first DEX.

| # | H2 | Việc của section | Bắt buộc trên màn hình |
|---|---|---|---|
| 1 | What zdex is | DEX-only, Pearl testnet, Uniswap-inspired UX **không** phải Uniswap v4 | Câu §2.1. Chữ **testnet**. Chain noun **Gno.land**. |
| 2 | Wallet | Adena, non-custodial, `OriginSend` | “You sign.” Không custody. Keplr: không hỗ trợ `MsgCall`. |
| 3 | Swap | Trade native `ugnot`; layout Uniswap-inspired | No wrap. External GRC20 vẫn Approve. Không guaranteed price. |
| 4 | Create a pool | Listing = `CreatePool`; permissionless vẫn user-signed | Min 1 GNOT. **Không** dạy `Launch`. Listed ticker ≠ zdex issue. |
| 5 | Fees and LP | Tiers + split + no extra stake | 5 / 30 / 100 bps; protocol ~1/6; LPs ~5/6. Không APY. |
| 6 | Tokens | Internal ledger ≠ zdex issue | Permissionless CreatePool / legacy Launch vẫn **user-signed**. |

H1 được phép: `zdex Docs` hoặc `How zdex works`.  
Banner (trên H1, mọi view Docs): paste Guide §2.0 — Pearl testnet, no monetary value, not financial advice.

Footer: paste `docs/research/trust.md` footer, mạng = **Pearl testnet** (không Sapphire nếu UI default Pearl).

---

## 2. Allowed copy (English)

Chỉ dùng câu dưới hoặc paraphrase **cùng fact**. Không gắn số lợi nhuận.

### 2.1 What zdex is

**Allowed (lead):**

> zdex is a GNOT-native AMM on Gno.land Pearl testnet. The in-app layout is Uniswap-inspired UX on Gno. It is not a Uniswap v4 equivalent: no hooks, no flash accounting, no concentrated liquidity. It is a non-custodial DEX: you sign with Adena; pools quote native `ugnot` via OriginSend — no wrap, no wugnot. Listing is CreatePool. zdex is not a launchpad and does not custody funds.

Câu ngắn được:

- “Uniswap-inspired UX on Gno — not Uniswap v4.”
- “You sign. Adena + OriginSend. We do not hold your coins.”
- “Inspired by zSwap, rewritten with Gno primitives — not an EVM clone.”

**Forbidden nearby:** “Uniswap-equivalent”, “Uniswap v4 on Gno”, “Uniswap on Gno”, “first DEX”, “the AMM for Gno”, “live on Gno.land” thiếu **testnet**.

### 2.2 Wallet

**Allowed:** Guide `ui-guide-claims.md` §2.3 nguyên văn (Adena, you sign, OriginSend, watch read-only, Keplr no MsgCall).

### 2.3 Swap

**Allowed:** Guide §2.4 + layout labels Sell / Buy / Swap / Price impact / Max slippage (`ui-uniswap-layout.md`). Swap details = quote mechanics only.

### 2.4 Create a pool

**Allowed:** Guide §2.5. Listing = CreatePool, min 1 GNOT, listed ticker is not issued by zdex.

Launch — **một câu, không dạy:**

> Launch is a legacy entry for already-launched pools. Do not use it as the listing path. Permissionless mint inside the realm, if it still exists, is still user-signed — zdex does not issue the token.

### 2.5 Fees and LP

**Allowed:** Guide §2.6. “Earns” = LP share of swap fees already taken. Không gắn %/năm. Không đổi Fee APR (24h est.) thành APY.

### 2.6 Tokens

**Allowed:**

> Pool id is `ugnot|<SYMBOL>`. Tokens minted inside the DEX realm are an in-realm ledger for that package. Listing a ticker does not mean zdex issued that meme. Permissionless CreatePool is still signed by the user’s Adena.

---

## 3. Forbidden (toàn page Docs)

Không nói, không tooltip, không meta, không H2.

| Cấm | Vì sao |
|---|---|
| **APY** / “earn X%” / fixed yield | Không có guaranteed return. `feeApr` ≠ product APY. |
| **guaranteed** / guaranteed returns / risk-free LP | Volume, fee, pot, gauge đều có thể 0. |
| **Uniswap-equivalent** / Uniswap v4 equivalent / “Uniswap on Gno” | UX có thể giống Uniswap. Mechanics = CPMM Gno + OriginSend + escrow. Không phải port v2/v3/v4. |
| **first DEX** | Không claim thứ hạng trên Gno.land. GnoSwap đã dùng slogan đó trên X. |
| **audited** / security certified | Có `gno test`. Test ≠ audit. |
| “zdex issues every meme” / “we launch your coin” | CreatePool list token đã có. Launch mint nội bộ vẫn user-signed. |
| Custody / “we swap for you” / “deposit with us” | Adena + OriginSend trong cùng tx. |
| **mainnet** / “live on Gno.land” thiếu testnet | Public UI = Pearl **testnet**. |

Từ cấm (kể cả headline): *APY, guaranteed, Uniswap-equivalent, first DEX, audited, mainnet, we issue, deposit with us, earn X%, risk-free LP.*

---

## 4. “What this is not” — product MUST paste (không thành H2 thứ 7)

English, bullet, đúng thứ tự — dưới **What zdex is** hoặc cuối page:

- Not mainnet. Pearl testnet only on this public UI.
- Not a Uniswap v4 equivalent. Uniswap-inspired UX only.
- Not audited. Tests are not an audit.
- Not a launchpad. Do not use Launch to list.
- Not custodial. Keys stay in Adena.
- Not a wrap. Native `ugnot` via OriginSend.
- No APY. No guaranteed returns. No risk-free LP.
- No investment advice.
- A listed ticker is not issued by zdex.

---

## 5. Grep gate (khi `Docs.tsx` xuất hiện)

Sau khi `web/src/i18n.ts` **và** `Docs.tsx` tồn tại, grep hai file:

`APY` · `Uniswap-equivalent` · `first DEX` · `audited` · `guaranteed`

Hit → sửa **English string only**. Không git commit. Không đụng `gnomi.fun`.
