# zdex

DEX singleton trên Gno.land (Pearl), lấy cảm hứng từ [zSwap](https://zswap.wei.limo/) nhưng viết lại theo primitive Gno — không clone EVM.

## Khác zSwap / GnoSwap ở chỗ nào

| Vấn đề | Cách zdex xử lý |
|---|---|
| Wrap GNOT bắt buộc | Pool quote bằng **native `ugnot`** (`OriginSend` / banker). Không cần wugnot. |
| `int64` tràn khi `x*y` | `MulDiv` tách `a = a1*d + a0` để tích trung gian không tràn. |
| Creator dump lúc launch | Keep tối đa **20%**, **vest tuyến tính**, LP khóa tối thiểu ~1 ngày. |
| Snipe block đầu | Trần % reserve thật mỗi tx trong cửa sổ snipe. |
| Allowance confused-deputy | Token launch mint **trong realm DEX**; swap một chữ ký. GRC20 ngoài vẫn `Approve` realm này rồi `TransferFrom`. |
| Order fail vì hết tiền | Limit order **escrow** on-chain (bid/ask, partial fill, all-or-none, cancel). |
| HTML-in-bytecode (không có trên Gno) | `Render()` + `<gno-form>` trên gnoweb. |

## API chính

- `Launch(name, symbol, decimals, totalSupply, creatorKeepBps, virtualUgnot, vestBlocks, lockBlocks, snipeBlocks, snipeMaxBps)`
- `SwapExactIn(poolID, tokenIn, amountIn, minOut, maxHeight)` — `tokenIn` = `"ugnot"` hoặc symbol
- `Quote(poolID, tokenIn, amountIn)`
- `CreatePool` / `AddLiquidity` / `RemoveLiquidity`
- `PlaceBid` / `PlaceAsk` / `FillOrder` / `CancelOrder`
- `ClaimVest` / `CollectFees`
- `Transfer` / `Approve` / `BalanceOf` cho token mint nội bộ

Pool id: `ugnot|<SYMBOL>`.

## Test

```
gno test ./gno.land/r/zdex/
```

Cần `GNOROOT` trỏ source Gno khớp chain, và `gno mod download` deps từ Pearl:

```
gno mod download -remote-overrides "gno.land=https://rpc.pearl.testnets.gno.land"
```

## UI

Production: https://zdex-gno.netlify.app (default net **Pearl**).
Source: https://github.com/sunny-0x42/zdex

Pearl realm (after addpkg):

`gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`

Gnoweb: https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2
Faucet: https://pearl.testnets.gno.land/faucet

Local:

```
cd web
node server.mjs
```

Mở http://127.0.0.1:8787 (default net **local**). Sapphire still listed in the network picker.

## Local gnodev

Trên Windows, glob workspace `...` không load package (và có thể đi lạc lên `%USERPROFILE%`). Dùng `-extra-root` và workspace lồng (xem `start-gnodev.ps1`):

```
.\start-gnodev.ps1
```

Hoặc:

```
$env:GNOROOT = "C:\Users\Hi\tools\gno"
gnodev local -no-examples -no-watch -web-with-html -web-home /r/zdex -extra-root .\gno.land
```

Gnoweb: http://127.0.0.1:8888/r/zdex

Đã chứng minh trên gnodev (`chain-id` `dev`): `Launch` → pool `ugnot|DEMO`, `SwapExactIn` 1_000_000 ugnot → 254499 DEMO.

## Deploy Sapphire

Đã live trên `sapphire-1`:

- pkg `gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex`
- addpkg tx `cee253d985b4e08f26b19497bd727e0bdeab0c6d00ab8eaf2398f0fc0614ae68` (height 685005)
- demo pool `ugnot|SDEM` (Launch height 685037)

Source v2 (LP seed, fee buckets, snipe 2 chiều, SwapExactOut, admin 2 bước) đã test local.

Deploy on-chain: `gno.land/r/<g1>/v2/zdex` (package name phải là `zdex`). Cần faucet vì deposit bản v1 đã dùng hết grant 24h.

```
node scripts/mcp-sapphire-deploy.mjs
```
