# Uniswap-like swap layout — copy constraints

Date: 2026-09-06  
Seat: `zdex-trust`. Not a legal opinion. Not investment advice. Does not ship `web/`.

**Surface:** centered Swap (Sell / Buy). Layout may look like Uniswap. **Không** nói “Uniswap-equivalent” / “Uniswap on Gno”.  
**Scope:** English UI labels only. Không đụng `gnomi.fun`. Không bịa protocol feature.

Đã đọc `web/src/i18n.ts` (sau parent edits, nếu có). Hiện **chưa** có keys `Sell` / `Buy` / `Max slippage`. Swap vẫn:

- `youPay` = `You pay`
- `youReceive` = `You receive`
- `impact` = `Price impact`
- `slippage` = `Slippage`
- `confirmSwap` = `Confirm swap`
- tab / CTA: `Trade` / `Swap GNOT and listed tokens…`

Dictionary: `en` only. Không APY / guaranteed / farm trên swap copy. Giữ vậy khi đổi layout.

---

## Allowed labels (English, đúng chữ)

Khi parent đổi panel: **Sell** (token in) / **Buy** (token out). Không dịch. Không “bán” / “mua”.

| Label | Dùng cho |
|---|---|
| **Sell** | Ô token in (thay `You pay` nếu product chọn Uniswap-like) |
| **Buy** | Ô token out (thay `You receive`) |
| **Swap** | CTA / confirm / Guide heading. Không đổi thành Earn / Farm |
| **Price impact** | Quote row (đã có `impact`) |
| **Max slippage** | Setting / quote row. Hiện `slippage` = `Slippage` — được đổi sang **Max slippage**, không gắn yield |

Được giữ (không phải promise): `Fee`, `Minimum received`, `Confirm swap`, `Quote`, `Connect Adena to sign.`

Swap hint giữ fact: GNOT via `OriginSend`. Internal tokens không cần Approve. Listed ticker **không** phải zdex issue.

---

## Forbidden

Không thêm vào Swap, Swap details, tooltip, hay empty state.

| Cấm | Vì sao |
|---|---|
| **APY** | Không có APY on-chain. Fee APR (nếu hiện ở Pools) là trailing 24h est., không đưa lên Swap card |
| **guaranteed** / guaranteed return / risk-free | Không có return. Price impact và slippage là rủi ro execution |
| **farm** / yield farm / earn X% | Gauge là extra `ugnot` sidecar. Không phải farm trên Swap |

Cũng cấm: promised yield, “best rate guaranteed”, custody copy (“we swap for you”). User ký Adena; `ugnot` đi kèm tx (`OriginSend`). Permissionless launch / CreatePool vẫn user-signed.

---

## Product must

1. Labels **Sell / Buy / Swap / Price impact / Max slippage** = English.
2. Swap details = quote mechanics only (price, impact, fee, min out, slippage). Không APY.
3. Non-custodial: Adena + OriginSend. Không custody. Không guaranteed APY.
4. Không bịa exact-out, wrap, wugnot, farm, hay “zdex issues every meme”.
