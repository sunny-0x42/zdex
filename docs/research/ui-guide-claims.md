# UI Guide claims — public English page

Seat: `zdex-trust`. Not a legal opinion. Not investment advice. Does not ship UI.

**Surface:** English Guide on https://zdex-gno.netlify.app (default net Pearl: `netlify.toml` `VITE_ZDEX_DEFAULT_NET=pearl`).  
**Supersedes** `docs/research/trust.md` for this page only where they conflict (public UI is **Pearl**, not Sapphire). Footer in `trust.md` still applies elsewhere until that file is updated.

Nguồn số: `web/config.js`, `web/src/i18n.ts`, `deploy/zdex-v2/types.gno`, `pool.gno`, `points.gno`, `launch.gno`, `swap.gno`, `web/src/lib/wallets.ts`. Không bịa số ngoài source.

Product (`zdex-product`) **phải** follow outline §1. Growth drafts copy theo bảng allowed; không tự thêm slogan.

---

## 1. Section outline product MUST follow

Thứ tự cố định. Không gộp, không đẩy testnet xuống footer, không thêm tab `Launch`. English only.

| # | H2 (English, đúng chữ này) | Việc của section | Bắt buộc trên màn hình |
|---|---|---|---|
| 0 | *(banner, trên H1)* | Testnet + no-value trước mọi hướng dẫn | Câu §2.0. Không nút “Start earning”. |
| 1 | What zdex is | AMM GNOT-native, DEX-only, Pearl testnet | Câu §2.1. Chữ **testnet**. Chain noun **Gno.land** (không “Gnoland”). |
| 2 | Network and faucet | `pearl-1`, realm path, faucet | URL faucet Pearl. Không gọi faucet là “free money” có giá. |
| 3 | Wallet | Adena, non-custodial, `OriginSend` | “You sign.” Không custody. Keplr: không hỗ trợ `MsgCall`. |
| 4 | Swap | Trade native `ugnot` | No wrap. External GRC20 vẫn Approve. |
| 5 | Create a pool | Listing = `CreatePool` | Min 1 GNOT. **Không** dạy `Launch`. |
| 6 | Fees and LP | Tiers + split + no extra stake | 5 / 30 / 100 bps; protocol ~1/6; LPs ~5/6. |
| 7 | Points and epoch pot | Cơ chế, không promo | 80% protocol **ugnot**. Không airdrop. |
| 8 | Incentives sidecar | Extra gauge | Không thay LP swap fees. Optional; ẩn cả section nếu pkg trống **chỉ** khi copy vẫn không hứa farm. |
| 9 | Tokens | Internal ledger ≠ zdex issue | Permissionless vẫn **user-signed**. |
| 10 | What this is not | Cấm claim | Liệt kê §4 nguyên văn. |
| 11 | *(footer, mọi trang Guide)* | Disclaimer | Paste §5. Không rút thành slogan lợi nhuận. |

Quy tắc layout:

1. Banner testnet (§2.0) visible without scroll trên mobile.
2. H1 được phép: `zdex Guide` hoặc `How zdex works`. Cấm H1 có APY / earn / mainnet / audited.
3. TVL, volume, pool count — nếu UI Overview hiện số, Guide chỉ được gọi là **snapshot on Pearl testnet**, không phải mục tiêu hay cam kết.
4. Không deep-link `?tab=launch`. Redirect `launch` → `create` giữ im lặng; Guide không giải thích Launch như path listing.
5. Không đụng copy `gnomi.fun`.

---

## 2. Allowed copy (English)

Chỉ dùng câu dưới hoặc paraphrase **cùng fact**. Không gắn số lợi nhuận. Không đổi “about one-sixth” thành “16.67% APY”.

### 2.0 Banner (mọi view Guide)

**Allowed:**

> This app talks to Gno.land **Pearl testnet** (`pearl-1`). Testnet GNOT and every token here have **no monetary value**. Nothing on this page is an offer, a return, or financial advice.

**Forbidden nearby:** “real GNOT”, “mainnet soon”, “points will be worth”, faucet = cash.

### 2.1 What zdex is

**Allowed (lead, dán nguyên):**

> zdex is a GNOT-native AMM on Gno.land Pearl testnet. It is a non-custodial DEX: you sign with Adena; pools quote native `ugnot` via OriginSend — no wrap, no wugnot. Listing is CreatePool. zdex is not a launchpad and does not custody funds.

Câu ngắn được:

- “Native GNOT AMM + escrow book on Gno.land Pearl testnet.”
- “You sign. Adena + OriginSend. We do not hold your coins.”
- “Inspired by zSwap, rewritten with Gno primitives — not an EVM clone.”

Căn cứ: `README.md`; `unsafe.OriginSend()`; `NETWORKS.pearl`; `wallets.ts`.

**Forbidden:** “Uniswap on Gno”, “live on Gno.land” thiếu **testnet**, “production mainnet”, “the AMM for Gno”.

### 2.2 Network and faucet

**Allowed:**

> Public UI default is Gno Pearl (`chain-id` `pearl-1`). Realm: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`. Get testnet GNOT from the Pearl faucet: https://pearl.testnets.gno.land/faucet. Faucet coins are for testing only and have no value.

Gnoweb (optional, fact): https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2

Local / Sapphire được **một dòng**: picker còn mạng khác; Guide công khai mô tả **Pearl**. Không gộp “live on Gno.land”.

**Forbidden:** “official GNOT”, “mainnet faucet”, “funded by zdex”, TVL/faucet như AUM.

### 2.3 Wallet

**Allowed:**

> Connect Adena (https://adena.app/). zdex never asks for a seed or a private key. You sign each MsgCall in the wallet. GNOT in is attached to the same transaction (`OriginSend`). Watch address is read-only. Keplr does not support Gno MsgCall.

Căn cứ: `installAdena`, `keplrNo`, `swapHint`; không có custody path.

**Forbidden:** “we swap for you”, “deposit with us”, “safe wallet”, “Adena is audited by zdex”, mọi wallet Gno.

### 2.4 Swap

**Allowed:**

> Trade GNOT against a listed pool token. When you pay GNOT, native `ugnot` is sent with the tx — no wrap step. Quotes come from the on-chain pool. Slippage can revert the swap. External GRC20 still needs Approve + TransferFrom. Internal tokens (minted in this realm’s ledger) do not need a separate Approve.

Giữ `swapHint`: “GNOT is attached to the transaction. Internal tokens do not need approval.” Không rút thành “no approval needed” cho mọi token.

**Forbidden:** guaranteed price, “zero slippage”, “best rate on Gno”, MEV-protected như sản phẩm, “risk-free swap”.

### 2.5 Create a pool (listing path)

**Allowed:**

> Listing is CreatePool: you seed a two-sided `ugnot` / GRC20 pool and sign with Adena. The GRC20 must already exist. Minimum **1 GNOT** (`1_000_000 ugnot`). Fee tier 5, 30, or 100 bps. A listed ticker is not issued by zdex.

Giữ `createHint`: “List an existing GRC20 against GNOT. Minimum 1 GNOT. Protocol takes about one-sixth of the swap fee; the rest stays with LPs.”

`Launch` — **một câu, không dạy:**

> Launch is a legacy entry for already-launched pools. Do not use it as the listing path. CreatePool is the product surface.

Nếu bắt buộc giải thích permissionless mint nội bộ: vẫn **user-signed**, không phải zdex phát hành hộ. Không mở form Launch trên Guide.

**Forbidden:** “launch your coin”, “we issue every meme”, “graduate to a pool”, bonding-curve như feature mới, snipe window như lợi thế listing, “permissionless” mà giấu chữ **you sign**.

### 2.6 Fees and LP

**Allowed:**

> Swap fee tiers are 5 / 30 / 100 bps (0.05% / 0.30% / 1.00%). On CreatePool pools the protocol takes about one-sixth of that fee (`ProtocolBps = 1667`); LPs keep about five-sixths. Holding LP receives the LP share of swap fees. No extra staking required.

Giữ `noStakeHint`: “Holding LP earns swap fees. No staking required.”  
“Earns” = share phí swap đã thu, không phải return. Không gắn số %/năm.

CreatePool: `CreatorBps = 0`. Không creator cut.

Legacy `Launched` (chỉ nếu user hỏi, **không** thành section): fee 1%, creator 4000 bps của fee, protocol 1000 bps của fee, LP ~50%. Guide không dạy path này.

**Forbidden:** APY, APR như sản phẩm, “earn X%”, “fixed yield”, “risk-free LP”, “set and forget returns”, so sánh fee như guaranteed income.

`feeApr` trên tab Pools (nếu UI còn label): Guide phải nói *trailing 24h estimate from recent volume; zero volume → no figure; not a return*. Ưu tiên **không** đưa APR vào Guide. Không đổi label thành APY.

### 2.7 Points and epoch pot

**Allowed:**

> Swaps and LP positions accrue points. 80% of protocol `ugnot` fees go to the epoch pot (`defaultFeeShareBps = 8000`) and are shared pro-rata after the epoch closes. Points are a ledger of volume and LP AccPoints, not a token.

Giữ `pointsHint`: “Swaps and LP positions earn points. 80% of protocol GNOT fees are shared each epoch.”

Thêm: claim = `ClaimFeeShare` sau epoch đóng; pot chỉ chia protocol ugnot **đã thu**. Volume = 0 → pot = 0.

**Forbidden:** “airdrop guaranteed”, “points = token”, “snapshot sure”, “you will receive”, rewards token, points có giá USD, “incentives replace fees”.

### 2.8 Incentives sidecar

**Allowed (khớp `gaugeHint`):**

> Extra ugnot gauge. Does not replace LP swap fees. Not financial advice.

Dài hơn:

> Incentives live on a sidecar realm, not inside v2 swap/LP. A gauge is optional extra `ugnot` funded on that sidecar. It does not replace the LP ~5/6 swap-fee share and does not take the 80% protocol epoch pot. No extra stake is required for ordinary LP fees. Gauge may be empty.

Pearl path (fact, không hứa đã fund): `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1`.  
v2 Caps **không** có `incentives`. UI đọc sidecar path riêng. `SetNextPkg` không phải farm.

**Forbidden:** APY farm, “boosted yield”, “emissions”, ve(3,3), “stake LP to earn”, “guaranteed gauge”, farm thay thế fee.

### 2.9 Tokens

**Allowed:**

> Pool id is `ugnot|<SYMBOL>`. Tokens minted inside the DEX realm are an in-realm ledger for that package. Listing a ticker does not mean zdex issued that meme. Permissionless CreatePool is still signed by the user’s Adena.

External GRC20: Approve realm này rồi `TransferFrom`. Internal: không Approve ngoài.

**Forbidden:** “zdex issues every meme”, “official ticker”, “safe token”, “this pool will graduate”, testnet token = asset.

### 2.10 TVL / stats (nếu Guide nhắc Overview)

**Allowed:** “TVL here is the sum of pool GNOT reserves on Pearl testnet at the last refresh. It is a snapshot, not a target.”

**Forbidden:** TVL promises, “growing TVL”, “TVL guaranteed”, “deep liquidity”, so sánh TVL như proof of safety.

---

## 3. Claims cấm (toàn page)

Không nói, không tooltip, không alt text, không meta description. Không “gần đúng”.

| Cấm | Vì sao |
|---|---|
| **APY** / “earn X%” / fixed yield | Không có guaranteed return. `feeApr` ≠ product APY. |
| **Guaranteed returns** | Volume, fee, pot, gauge đều có thể 0. |
| **“risk-free”** / “safe LP” / “no IL” | CPMM; IL và testnet mất hết đều có thật. |
| **Investment advice** / “buy GNOT” / “you should LP” | No-advice. |
| **“mainnet”** / “live on Gno.land” thiếu testnet | Public net = Pearl **testnet**. Mainnet **chưa**. |
| **“audited”** / “security certified” | Có `gno test`. **Không** có public audit report. Test ≠ audit. Đừng nói audited cho đến khi có report công khai. |
| **TVL promises** | TVL = snapshot reserve. Không mục tiêu, không bảo chứng thanh khoản. |
| **Launch as listing path** | `Launch` legacy. Dạy `CreatePool`. |
| Testnet tokens **có giá** / faucet = tiền thật | Pearl GNOT và mọi GRC20 trên app **no value**. |
| “zdex issues every meme” / “we launch your coin” | List token đã có; mint nội bộ (nếu còn) vẫn user-signed. |
| Custody / “deposit with us” / “we swap for you” | Adena + `OriginSend` / `TransferFrom` trong cùng tx. |
| Uniswap-equivalent | Không phải port Uniswap. |
| Airdrop cam kết / points = token | Epoch pot = protocol ugnot đã thu. |
| LP migrate v1 → v2 | Package immutable. Liquidity ở lại package cũ. |
| Soften Critical security findings | Trust không làm dịu lỗ hổng trên Guide. |

Từ cấm (không dùng, kể cả headline): *guaranteed, risk-free, APY, audited, mainnet, we issue, deposit with us, earn X%, risk-free LP, TVL will, airdrop (như cam kết).*

Meta hiện tại `web/index.html` (“zdex is a GNOT-native AMM on Gnoland.”) **thiếu** testnet + Gno.land spelling + non-custodial. Guide và meta production phải theo lead §2.1, không copy meta cũ.

---

## 4. “What this is not” — list product MUST paste

English, bullet, đúng thứ tự:

- Not mainnet. Pearl testnet only on this public UI.
- Not audited. Tests are not an audit.
- Not a launchpad. Do not use Launch to list.
- Not custodial. Keys stay in Adena.
- Not a wrap. Native `ugnot` via OriginSend.
- No APY. No guaranteed returns. No risk-free LP.
- No investment advice.
- No TVL promise. Numbers are snapshots.
- Testnet tokens have no value.
- Incentives sidecar (if any) is extra ugnot, not a replacement for LP fees.
- zdex does not issue every listed meme.

---

## 5. Footer (English, một đoạn — dán nguyên)

> zdex is a non-custodial GNOT-native AMM on Gno.land Pearl testnet (`pearl-1`). Pools quote native ugnot via OriginSend — no wrap, no wugnot. Listing is CreatePool: you sign with Adena; a listed token is not issued by zdex. Swap fee tiers are 0.05% / 0.30% / 1.00%; the protocol takes about one-sixth of that fee and LPs keep the rest with no extra stake. Points share 80% of protocol ugnot in an epoch pot; an incentives sidecar is an extra ugnot gauge and does not replace LP swap fees. Testnet tokens have no value. Fees, points, TVL, and any APR figure are mechanics or snapshots, not returns. Nothing here is an offer, an airdrop, an audit, or financial advice.

---

## 6. Check chéo UI strings

Growth/product không regress `web/src/i18n.ts` khi viết Guide:

| Key | Guide |
|---|---|
| `createHint` | Được. Giữ “list”, không “launch”. |
| `noStakeHint` | Được. Không gắn APY. |
| `pointsHint` | Cơ chế. Không “you will receive”. |
| `gaugeHint` | Được. Extra ugnot; not financial advice. |
| `feeApr` | Không đưa vào Guide như sản phẩm. |
| `tvl` | Snapshot only. |
| `faucet` | Link Pearl faucet; no-value. |
| Tab `launch` | Không tồn tại. Không dạy. |

`web/src/i18n.test.ts` đã khóa: gauge copy không chứa `APY`. Guide cũng vậy.

---

## 7. Việc file này không làm

- Không ký tx, không faucet hộ, không broadcast.
- Không hứa return.
- Không soften Critical trong `docs/research/security.md`.
- Không viết tweet. Không đụng gnomemepad / gnomi.fun.
- Không ship `web/`. Product copy English page theo outline §1.
