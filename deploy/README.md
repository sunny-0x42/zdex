# Deploy zdex lên Pearl

gnomcp hiện coi `pearl-1` là read-only (chưa có trong danh sách testnet writable), nên deploy phải dùng `gnokey` / Adena.

## 1. Faucet

https://pearl.testnets.gno.land/faucet

## 2. Đường dẫn package

Deploy dưới namespace địa chỉ của bạn (không cần đăng tên):

```
gno.land/r/<G1_ADDRESS>/zdex
```

Sửa `deploy/zdex/gnomod.toml`:

```
module = "gno.land/r/<G1_ADDRESS>/zdex"
gno = "0.9"
```

## 3. Thư viện AMM (bắt buộc trước realm)

Công thức swap nằm ở package thuần `/p/` để sau này nâng `/v2` không đụng LP hay điểm.

```
gno.land/p/<G1_ADDRESS>/zdex/amm/v1
```

Sửa `deploy/p/zdex/amm/v1/gnomod.toml` rồi addpkg thư mục đó **trước**. Realm `gno.land/r/zdex` import `gno.land/p/zdex/amm/v1` trên local; trên testnet đổi import cho khớp path đã addpkg.

Nâng cấp v2: deploy `deploy/zdex-v2` tới `gno.land/r/<G1_ADDRESS>/zdex/v2` (sửa gnomod.toml). Hub v1 (`deploy/zdex`) init `NextPkg` = path v2. LP v1 không chuyển. UI local trỏ `gno.land/r/zdex/v2`.

## 4. addpkg realm

```
gnokey maketx addpkg ^
  -pkgpath "gno.land/r/<G1_ADDRESS>/zdex" ^
  -pkgdir "C:\Users\Hi\zdex\deploy\zdex" ^
  -gas-fee 1000000ugnot ^
  -gas-wanted 20000000 ^
  -chainid pearl-1 ^
  -remote "https://rpc.pearl.testnets.gno.land:443" ^
  -broadcast ^
  <KEY_NAME>
```

## 5. Mở trên gnoweb

https://pearl.testnets.gno.land/r/<G1_ADDRESS>/zdex

Launch / Swap dùng tab Actions hoặc form trên trang Render. Swap `ugnot` cần `-send <amount>ugnot` khớp `amountIn`.
