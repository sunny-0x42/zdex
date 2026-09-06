# Recheck: JUST-LANDED blockers — `gno.land/r/zdex/v2` (local)

## Verdict

**SHIP** (security) cho Pearl addpkg của `gno.land/p/zdex/amm/v1` + `gno.land/r/zdex/v2`.

Bốn ship blocker trong `docs/research/security.md` đã vá trên source; `deploy/zdex-v2` và `deploy/p/zdex/amm/v1` **khớp hash**. `gno test ./gno.land/p/zdex/amm/v1` và `gno test ./gno.land/r/zdex/v2` xanh.

Không phải clearance on-chain. Pearl chưa có package này. Addpkg vẫn cần human **yes** + rewrite path `g1…` (`deploy/PEARL.md`) — đó là ops, không phải lỗ quỹ.

## Provenance

- Subject: workspace `C:\Users\Hi\zdex` (không đọc Pearl live — `gno.land/p/zdex/amm/v1` chưa tồn tại).
- Method: `gno-audit` Phase 1+2, FP filter. Không PoC.
- Đọc: `amm/v1/amm.gno`, `v2/{book,points,token,pool,swap,admin,launch,math,state,types,upgrade}.gno`, tests.

---

## Blocker đóng (không lặp lại)

| Cũ | Vá | Evidence |
|---|---|---|
| High `MulDiv` remainder panic | 128-bit `bits.Mul64`/`Div64`; ceil chỉ khi `r != 0`; panic khi quotient > `int64` | `amm.gno:35-58` |
| High book `pay=1` + xóa không refund | `require(pay>0)`; `settleFill` refund `GiveAmt` khi `WantAmt==0` | `book.gno:79-80`, `book.gno:100-101`, `book.gno:117-128` |
| High pot ghi đè / không trừ | `carry := closedPot` vào epoch mới; claim `sub64` pot **và** pts | `points.gno:18-24`, `points.gno:123-125` |
| Medium Class 2 helper | `pullUserToken` / `pushToken` `IsCurrent` | `token.gno:62-64`, `token.gno:76-78` |
| Critical lệch key | `CreatePool` lưu `p.Token=ref` + `Internal`; mọi pull/push swap/LP/book/CollectFees dùng `poolTokRef` | `pool.gno:27-51`, `token.gno:53-58` |

`poolTokRef` còn sống trên path quỹ:

- `pool.gno:79`, `pool.gno:130`
- `swap.gno:97`, `swap.gno:104`, `swap.gno:141`, `swap.gno:152`
- `book.gno:39`, `book.gno:84-86`, `book.gno:106`, `book.gno:125`, `book.gno:138`
- `admin.gno:71`

`tokenIn`/`tokenOut` chỉ nhánh ugnot vs token (`swap.gno:100`, `swap.gno:129`); asset thật = `poolTokRef`.

OriginSend: `IsUserCall` trước `OriginSend` (`swap.gno:86-88`, `swap.gno:130-134`, `swap.gno:187-190`). `from == caller` trên pull (`token.gno:65`). Admin two-step `ProposeAdmin`/`AcceptAdmin` (`admin.gno:11-25`).

---

## Remaining (không BLOCK addpkg)

### Medium

**`Launch` vẫn exported.** `launch.gno:8-9` — MsgCall mint bonding curve, vest, snipe. Product DEX-only; gnoweb/UI không gọi không đủ. Pearl testnet chấp nhận được; trước mainnet `panic("zdex: launch disabled")`, giữ `ClaimVest`.

**External GRC20 fee-on-transfer / rebase.** `token.gno:71` tin `amount` trên `TransferFrom`, không đo `BalanceOf(this)` trước/sau. Canonical `*grc20.Token` không FoT. Document “chỉ GRC20 chuẩn”; hoặc credit `delta`.

### Low

**Miss-window redistributes, không trả đúng user.** `points.gno:18-24` — leftover `closedPot` vào `epochPot` kế. User miss 1 epoch mất share; quỹ không kẹt. Sequential `closedPts -= s.Closed` (`points.gno:125`) lệch dust 1 ugnot theo thứ tự claim.

**`ClaimFeeShare` roll khi pause.** `points.gno:113-114` — không `assertNotPaused` (đúng hướng: claim khi pause). `maybeRollEpoch` vẫn chạy → claimer có thể đóng snapshot khi admin đang pause. Freeze roll khi `paused`, hoặc chỉ skip roll.

**`AccPoints` `add64` DoS.** `points.gno:98` — volume lớn panic, pool đứng. Cap/reset theo epoch.

**Admin không cancel pending.** `admin.gno:11-29` — `TransferAdmin` alias `ProposeAdmin`. Thêm `CancelAdmin`.

**Symbol charset.** `pool.gno:21` chỉ `symbol != ""`. `[A-Za-z0-9]{1,12}`.

**`ClaimVest` push theo ticker.** `launch.gno:100` — `pushToken(..., symbol, ...)`. An toàn vì Launch `Internal=true`; đừng dùng cho vest external.

### Info

- `CreatePool` không snipe (`pool.gno:40-51` vs `swap.gno:36-46`). Sandwich listing = AMM bình thường.
- `creditFees` dead (`swap.gno:48-56`); đừng gọi cùng `creditSwapPoints`.
- Book P2P không snipe — không rút reserve Launch.
- Tests golden-path vẫn `Launch`; chưa `TestCreatePool` external registry key. Coverage, không lệch code.
- Pearl ops: import `gno.land/p/zdex/amm/v1` fail namespace — rewrite `gno.land/p/<g1>/zdex/amm/v1` trước addpkg (`deploy/PEARL.md`).

## GREEN giữ

Payment `IsUserCall` (không `IsUser()`), `CancelOrder` không pause, two-step admin, `from==caller`, snipe hai phía trên Launch, vest tuyến tính `launch.gno:105-112`.

## Open

- Banker invariant `ReserveU + accruedU + epochPot + closedPot + bid escrow` chưa test conservation.
- Live Sapphire v1 path khác — không cover.

## Không làm

Không exploit payload. Không mnemonic. Không broadcast. Không sửa `gnomemepad`.
