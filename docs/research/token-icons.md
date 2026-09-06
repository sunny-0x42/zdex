# Token avatars — match Gnoscan

Seat: `zdex-trust`. Not a legal opinion. Not investment advice. Does not ship `web/`.

**Surface:** token avatars on the English zdex UI (Trade, Pools, Liquidity, Portfolio, picker).  
**Canon:** [GnoScan](https://gnoscan.io/) via [onbloc/gno-token-resource](https://github.com/onbloc/gno-token-resource) (same set Adena / GnoSwap use).  
Không đụng `gnomi.fun`. Không APY. Dictionary `en` only.

Một avatar **không** phải endorsement, không phải “zdex issued this token”, không phải return. Listing vẫn `CreatePool`, user-signed (Adena + `OriginSend` cho native `ugnot`). Internal in-realm ledger ≠ zdex phát hành mọi meme.

---

## Rule

| Token | Avatar | Cấm |
|---|---|---|
| **GNOT** / `ugnot` | `gno-native/images/ugnot.svg` từ `onbloc/gno-token-resource` | Gnome wordmark / Logo Short Light từ [gnolang/branding](https://github.com/gnolang/branding). Đó là mark sản phẩm Gno.land, không phải token mark Gnoscan dùng. |
| Token **có** entry trong repo đó (GRC20 / IBC) | SVG đúng path `image` của entry (`/grc20/images/…`, `/ibc-native/images/…`, `/ibc-tokens/images/…`) | Icon tự vẽ, cryptocurrency-icons “gần giống”, JPG random |
| Token **không** có entry | Chữ ticker (`TokenAvatar` letters, tối đa 4) | Generated coin, identicon, DiceBear, hash-art, “fake gold coin” |

Product (`zdex-product`) **phải** swap file GNOT hiện tại. Growth không gắn logo gnome lên GNOT trong copy / tweet.

---

## Gap hôm nay (`web/`)

- `web/public/tokens/README.md` ghi `gnot.svg` = gnolang/branding **Logo Short Light**. Sai canon.
- `tokenIcons.ts` map `GNOT` / `UGNOT` → `/tokens/gnot.svg` (file đó). Sai asset, đúng ticker.
- Unknown ticker: `tokenIconSrc` → `null` → letters. **Giữ.** Không generate coin.
- Catalog BTC/ETH/USDC… từ `spothq/cryptocurrency-icons` chỉ được giữ nếu **cùng file** Gnoscan serve cho ticker đó trên Gno.land. Không có entry → letters, không “generic chain coin”.

Không vendoring cả repo Onbloc vào zdex trừ khi product copy đúng `ugnot.svg` (và các SVG đã list). Remote hotlink GitHub raw không phải source of truth khi Gnoscan đổi pin — pin commit hoặc copy file, ghi nguồn.

---

## Copy gần avatar (English)

Được: ticker, pool id `ugnot|<SYMBOL>`, “listed via CreatePool”, “you sign in Adena”.  
Cấm: APY / guaranteed / earn / “official coin” / “zdex issues this” cạnh icon. Fee APR (nếu có trên card) vẫn trailing 24h est., không phải return — xem `apr-claims.md`.
