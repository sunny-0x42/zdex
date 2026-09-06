# Week list — 2 tuần đóng Zdex (Gno DEX)

**Owner kế hoạch:** `zdex-chief`  
**Outcome:** Zdex ship được như DEX on-chain trên Gno.land — listing `CreatePool`, swap native `ugnot`, LP, escrow book, points — không phải launchpad, không clone Uniswap.  
**Generation:** live code `gno.land/r/zdex/v2`. Hub v1 `NextPkg` trỏ v2. LP v1 không migrate.  
**Phạm vi:** realm, tests, English UI `web/`, deploy tree. Không tweet, không merge, không addpkg nếu chưa có human yes.

## Frozen (không invent)

- DEX-only. Listing = `CreatePool`. `Launch` là legacy (giữ ABI, không phải product).
- Native `ugnot` qua `OriginSend` (không wugnot).
- `MulDiv` overflow-safe. Fee 5 / 30 / 100 bps. Protocol ~1/6, LP ~5/6. Không stake thêm cho LP fee.
- Points = volume + LP AccPoints. 80% protocol ugnot → epoch pot.
- Escrow limit orders (bid/ask, partial, all-or-none, cancel). Book không đụng reserve AMM.
- Internal mint in-realm; GRC20 ngoài = Approve + TransferFrom.
- UI English. LP token picker. Pool id `ugnot|<SYMBOL>`.
- Tests: `gno test ./gno.land/r/zdex/` và `gno test ./gno.land/r/zdex/v2`. UI: `cd web; npm test`.

## Không làm trong 2 tuần

- Uniswap v3 concentrated liquidity, multi-hop router, factory clone.
- Wrap `ugnot` / wugnot.
- Launchpad, bonding-curve listing mới, snipe window cho `CreatePool`.
- Hooks production (research note thôi).
- Sửa `gnomemepad` / Gno Vault.
- Merge, addpkg, tweet, fund movement — trừ khi human gõ **yes**.

## Gap hiện tại (cơ sở kế hoạch)

- Tests v1/v2 vẫn golden-path `Launch`; chưa có `TestCreatePool`.
- `Render()` empty state còn “Launch a coin”; README dẫn `Launch` như API chính.
- UI local đã `gno.land/r/zdex/v2`; Sapphire UI vẫn pkg v1 `…/g1…/zdex`. v2 chưa addpkg.
- Book fill có rounding `payU/payT = 1`; cần security pass.
- Points/fee-share tests chạy trên pool `Launched`, chưa trên `CreatePool` two-sided.

---

## Tuần 1 — đóng surface DEX (song song)

### 1. Golden path `CreatePool` trên v2

| | |
|---|---|
| **Owner** | `zdex-protocol` |
| **Outcome** | `gno.land/r/zdex/v2` có test `CreatePool` làm path chính: two-sided seed ≥ 1 GNOT, fee tier 5/30/100, `CreatorBps=0`, protocol ~1/6, `OriginSend` khớp `amountU`, reject pool trùng. `Launch` giữ hàm, không còn là test/product surface. Empty `Render()` không nói “Launch a coin”. |
| **Human yes** | Không (chỉ realm + test trong repo). |

### 2. Audit primitive Gno

| | |
|---|---|
| **Owner** | `zdex-security` |
| **Outcome** | Pass viết vào `docs/` + fix trong realm nếu fail: `OriginSend` mismatch (swap/LP/bid), EOA-only khi gửi `ugnot`, escrow cancel refund đúng maker, FillOrder rounding, `TransferFrom` confused-deputy (`from` = caller), overflow `MulDiv`/`add64`. Không PoC exploit. |
| **Human yes** | Không cho audit/fix repo. **Yes** nếu muốn patch live Sapphire v1. |

### 3. Book vs AMM + points trên pool DEX

| | |
|---|---|
| **Owner** | `zdex-defi` |
| **Outcome** | Test chứng minh: `PlaceBid`/`FillOrder` không đổi `ReserveU`/`ReserveT`; AMM `SwapExactIn`/`SwapExactOut` không đụng escrow. `CreatePool` → swap → protocol ugnot vào epoch pot 80%; LP AccPoints khi hold, không farm stake. |
| **Human yes** | Không. |

### 4. English UI theo live generation

| | |
|---|---|
| **Owner** | `zdex-product` |
| **Outcome** | `web/` English: follow `HubSnapshot` / `NextPkg` / `Modules`; LP token picker + `CreatePool`; book escrow; points claim. Tab `launch` không tồn tại (redirect `create` giữ). Copy DEX-only, no-advice. `cd web; npm test` xanh. |
| **Human yes** | Không. |

### 5. Freeze “Gno DEX, không Uniswap”

| | |
|---|---|
| **Owner** | `zdex-research` |
| **Outcome** | `docs/` note ngắn: khác Uniswap ở `OriginSend`, `CreatePool` listing, escrow book, `Render()` + `<gno-form>`, hub immutable (`Version`/`Caps`/`NextPkg`). Hooks = feasibility, không ship. Không viết realm/UI. |
| **Human yes** | Không. |

---

## Tuần 2 — gnoweb, test gate, deploy packet

### 6. `Render()` là surface DEX trên gnoweb

| | |
|---|---|
| **Owner** | `zdex-protocol` |
| **Outcome** | gnoweb v2: home = pools + `CreatePool` + `SwapExactIn`; pool page = quote + add/remove LP; book = place/fill/cancel; points/epoch đọc được. Không form `Launch`. Test `TestRenderHome` assert copy DEX. |
| **Human yes** | Không. |

### 7. Deploy tree + test gate

| | |
|---|---|
| **Owner** | `zdex-devops` |
| **Outcome** | `deploy/zdex-v2` khớp `gno.land/r/zdex/v2`; `deploy/p/zdex/amm/v1` khớp math. `gnodev` qua `start-gnodev.ps1`. Gate bắt buộc trước khi xin yes: `gno test ./gno.land/r/zdex/` · `gno test ./gno.land/r/zdex/v2` · `cd web; npm test`. Packet addpkg sẵn, **không broadcast**. |
| **Human yes** | Không cho sync tree. |

### 8. Sapphire v2 addpkg (cổng đóng)

| | |
|---|---|
| **Owner** | `zdex-devops` (protocol review path; product trỏ pkg sau khi live) |
| **Outcome** | Packet: addpkg `gno.land/r/<g1>/zdex/v2` (package name `zdex`), rồi hub v1 `SetNextPkg` = path đó. UI Sapphire `pkg`/`hubPkg` cập nhật sau khi chain có v2. README: DEX-only, `CreatePool` trước, `Launch` legacy. |
| **Human yes** | **Có.** addpkg, `SetNextPkg` on-chain, mọi broadcast. Không hỏi mnemonic. Không raw `gnokey` trong chat. |

---

## Thứ tự / phụ thuộc

```
Tuần 1:  [1 protocol] [2 security] [3 defi] [4 product] [5 research]  ← song song
Tuần 2:  [6 protocol Render] → [7 devops gate] → [8 addpkg]  ← 8 chặn human yes
```

- 1 xong mới khóa copy `Render`/README (6 + phần trust trong 8).
- 2 + 3 phải xanh trước 7.
- 4 chạy local `gno.land/r/zdex/v2`; Sapphire pkg chỉ đổi sau 8.
- 5 không chặn ship; đọc trước khi viết claim công khai.

## Gate trước khi hỏi deploy yes

```
gno test ./gno.land/r/zdex/
gno test ./gno.land/r/zdex/v2
cd web && npm test
```

Stop. Báo residual. Không addpkg nếu một lệnh fail.

## Residual (chấp nhận sau 2 tuần)

- Sapphire v1 immutable; LP/order cũ ở đó. v2 là generation mới.
- `Launch` vẫn gọi được trên realm (legacy ABI). Product không expose.
- Hooks, router, pair không-`ugnot`: ngoài tuần này.
- Public tweet / production domain: human yes riêng, không nằm week list.
