# Trust — public claims

Nguồn: `README.md`, `docs/COMPANY.md`, copy `web/` (`index.html`, `App.tsx`, `i18n.ts`), hằng số realm (`types.gno`, `launch.gno`, `pool.gno`, `swap.gno`, `points.gno`). Không phải legal opinion. Không phải investment advice.

Sản phẩm công khai: **DEX-only** trên Gno.land. Không phải launchpad. Không custody. User ký bằng Adena; `ugnot` đi kèm tx qua `OriginSend`.

## Footer (English, một đoạn)

Dán nguyên. Không rút thành slogan lợi nhuận.

> zdex is a non-custodial DEX on Gno.land. Pools quote native ugnot via OriginSend — no wrap, no wugnot. Listing is CreatePool: you sign with Adena; a listed token is not issued by zdex. Swap fee tiers are 0.05% / 0.30% / 1.00%; the protocol takes about one-sixth of that fee and LPs keep the rest with no extra stake. This public UI talks to Gno Sapphire testnet. Fees, points, and any APR figure are mechanics or trailing estimates, not returns. Nothing here is an offer, an airdrop, or financial advice.

## Claims được phép (public)

Chỉ nói những gì repo / chain đang làm. Số không có trong source thì không bịa.

| Chủ đề | Được nói (English) | Căn cứ |
|---|---|---|
| DEX-only | zdex is a DEX. Listing is CreatePool against GNOT. Not a launchpad. | `docs/COMPANY.md`; UI Create pool; `Launch` là legacy, không expose trên web |
| Native GNOT | Pools quote native ugnot. No wrap / wugnot. GNOT is attached to the tx (`OriginSend`). | `README.md`; `takeUgnot` + `unsafe.OriginSend()` |
| Non-custodial | You sign in Adena. zdex does not hold keys or custody funds. Watch address is read-only. | `wallets.ts`; Keplr không hỗ trợ Gno `MsgCall` |
| Fees | Swap fee tiers 0.05% / 0.30% / 1.00% (5 / 30 / 100 bps). On CreatePool pools the protocol takes ~1/6 of the swap fee; LPs keep ~5/6. Minimum 1 GNOT to open a pool. | `feeTierLow/Mid/High`; `poolProtocolFeeBps = 1667`; `minListUgnot` |
| No-stake LP | Holding LP receives the LP share of swap fees. No extra staking required. | cap `noStakeLp`; `noStakeHint`; `HarvestPoints` comment |
| Permissionless listing | Anyone can list an existing GRC20 by signing CreatePool. External GRC20 still needs Approve + TransferFrom. | `CreatePool` EOA-only; `pullUserToken` |
| Internal vs listed | Tokens minted inside the DEX realm are an in-realm ledger for that package. Listing a ticker does not mean zdex issued that meme. | `mintInternal`; `Pool.Internal`; copy `swapHint` |
| Limit orders | Escrow limit orders on-chain (bid/ask, partial, cancel). Bid locks GNOT; ask locks token. | `book.gno`; UI Orders |
| Testnet | Public instance is Gno Sapphire testnet (`sapphire-1`). Testnet GNOT is faucet money. | `web/config.js`; faucet URL |
| Engineering | Inspired by zSwap, rewritten with Gno primitives (not an EVM clone). `MulDiv` is overflow-safe. Packages are immutable; a later generation is a new path, existing LP stays. | `README.md`; `upgrade.gno` |
| Points (mô tả cơ chế, không bán) | Swaps and LP positions accrue points. 80% of protocol ugnot fees go to the epoch pot, shared pro-rata after the epoch closes. | `defaultFeeShareBps = 8000`; `ClaimFeeShare` |

Câu ngắn được phép:

- “Native GNOT AMM + escrow book on Gno.land.”
- “You sign. Adena + OriginSend. We do not hold your coins.”
- “CreatePool lists a token. Launch is a legacy entry for already-launched pools.”
- “LP fees come from swaps. No extra stake.”
- “Sapphire testnet — not mainnet.”

## Claims cấm

Không nói, không tweet, không ẩn trong UI. Không “gần đúng”.

| Cấm | Vì sao |
|---|---|
| Guaranteed APY / “earn X%” / fixed yield / risk-free LP | `Fee APR` trên UI là ước lượng trailing 24h (`lpFeeAprPct`), không phải return. Volume = 0 thì APR = không có. |
| “Airdrop guaranteed” / points = token / snapshot chắc chắn | Points là sổ volume + LP AccPoints. Epoch pot chỉ chia protocol ugnot đã thu. Không có token airdrop trong product. |
| “Uniswap-equivalent” / “Uniswap on Gno” | CPMM Gno + virtual ugnot (legacy launch) + escrow book + native `ugnot`. Không phải port Uniswap. |
| “Audited” / “security certified” | Có `gno test`. Không có audit report trong repo. Test ≠ audit. |
| “zdex issues every meme” / “we launch your coin” | `CreatePool` list token đã có. `Launch` mint nội bộ là legacy, EOA-signed, không phải zdex phát hành hộ. |
| Custody / “we swap for you” / “deposit with us” | User ký. Realm nhận `OriginSend` / `TransferFrom` trong cùng tx. Không có ví công ty giữ quỹ user. |
| Mainnet / “live on Gno.land” không kèm testnet | `NETWORKS` chỉ `local` (`dev`) và `sapphire` (`sapphire-1`). Không có mainnet. |
| Promise migrate LP v1 → v2 | Package immutable. `nextPkgHint`: liquidity ở lại package cũ. |
| Keplr / mọi wallet Gno | UI: “Keplr does not support Gno MsgCall.” |
| Soften Critical findings | Trust không được làm dịu lỗ hổng. |
| Investment advice / “buy GNOT” / “this pool will graduate” | No-advice. |

Không dùng: *guaranteed, risk-free, APY (như sản phẩm), airdrop (như cam kết), audited, Uniswap-equivalent, mainnet, we issue, deposit with us.*

## Testnet vs mainnet

Phải ghi mạng. Không để user tưởng GNOT testnet = GNOT mainnet.

| Môi trường | Chain | Package UI đang trỏ | Faucet | Được gọi là |
|---|---|---|---|---|
| Local gnodev | `dev` | `gno.land/r/zdex/v2` (hub `gno.land/r/zdex`) | không | máy local, không phải mạng công |
| Sapphire | `sapphire-1` | `gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex` | `https://sapphire.testnets.gno.land/faucet` | **testnet công khai** |
| Pearl | `pearl-1` (docs deploy) | không có trong `NETWORKS` của UI | Pearl faucet | testnet khác; **không** claim là product surface trừ khi UI trỏ tới |
| Gno.land mainnet | — | không có | — | **chưa** |

Disclosure bắt buộc trên site / tweet / README công khai:

1. Tên mạng + `chain-id` (`Gno Sapphire` / `sapphire-1`).
2. Chữ **testnet**. Faucet = testnet GNOT, không phải tiền thật trên mainnet.
3. Realm path đầy đủ. Không rút thành “zdex is live” nếu thiếu testnet.
4. Sapphire addpkg hiện là generation đã deploy dưới địa chỉ đó (v1 path). Source mới: `gno.land/r/zdex/v2` trên local. **Không** nói “v2 is live on Sapphire” cho đến khi addpkg v2 thật sự nằm trên chain đó.
5. Demo pool `ugnot|SDEM` trên Sapphire là testnet demo, không phải listing mainnet.

README mở đầu “Gno.land (Pearl)” và UI public là Sapphire — copy công khai phải chọn **một** mạng và nêu đúng. Không gộp “live on Gno.land”.

## Swap / listing / fee copy

Review copy hiện có. Growth/product sửa theo bảng này; file này không ship UI.

| Copy | OK? | Ghi chú trust |
|---|---|---|
| `createHint`: “List an existing GRC20 against GNOT… Protocol takes about one-sixth…” | Được | Đúng DEX-only. Giữ “list”, không đổi thành “launch”. |
| `swapHint`: “GNOT is attached to the transaction. Internal tokens do not need approval.” | Được nếu không rút | External GRC20 vẫn Approve. Cấm slogan “no approval needed”. |
| `noStakeHint`: “Holding LP earns swap fees. No staking required.” | Được | “Earns” = share phí swap, không phải APY. Không gắn số. |
| `pointsHint`: “Swaps and LP positions earn points. 80% of protocol GNOT fees are shared each epoch.” | Cơ chế, không promo | Không thêm “airdrop”, “rewards token”, “you will receive”. |
| `feeApr` / subtitle Pools “fee APR” | Nguy hiểm | Phải hiểu là trailing 24h estimate. Legacy launch pool LP share 50% fee; CreatePool ~5/6. Không đổi label thành APY. |
| `index.html`: “zdex is a GNOT-native AMM on Gnoland.” | Thiếu | Dùng **Gno.land**. Thiếu testnet + non-custodial. AMM không mô tả escrow book. Ưu tiên đoạn footer ở trên. |
| gnoweb `render.gno`: “None yet. Launch a coin below.” | Cấm public | Product surface là CreatePool. `Launch` không được mời trên gnoweb. |

`Launch` (nếu bị hỏi): legacy bonding-curve minter, creator keep tối đa 20%, vest tuyến tính, LP lock ≥ ~1 ngày, snipe cap. Giữ để pool đã launch còn trade. **Không** market như tính năng mới. Permissionless mint nội bộ vẫn là **user ký**, không phải zdex phát hành.

Fee split không gộp:

- CreatePool: `ProtocolBps = 1667` (~1/6), không creator cut.
- Legacy `Launched`: `launchFeeBps = 100` (1%), creator 4000 bps của fee, protocol 1000 bps của fee, LP phần còn lại (~50%).

## Một câu “what zdex is” (nội bộ)

zdex là DEX singleton trên Gno.land: pool `ugnot|<SYMBOL>`, quote native `ugnot` bằng `OriginSend`, list bằng `CreatePool` do user ký Adena, phí 5/30/100 bps (protocol ~1/6 trên pool DEX, LP không cần stake thêm). Public surface hiện là Sapphire testnet; `Launch` là legacy; không custody, không hứa return, không airdrop, không audit, không Uniswap-equivalent.
