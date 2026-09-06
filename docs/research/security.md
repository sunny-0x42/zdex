# Audit: `gno.land/r/zdex/v2` (local workspace)

## Verdict

**BLOCK** ship/addpkg của v2 cho đến khi bốn ship blocker được vá: `MulDiv` remainder overflow, `CreatePool`/`tokenPullKey` lệch key, book round-up chống maker, `ClaimFeeShare` pot bị ghi đè.

## Provenance

- Subject: package path `gno.land/r/zdex/v2` trong repo `C:\Users\Hi\zdex` (source of truth cho generation 2).
- Đã đọc full file: `admin.gno`, `book.gno`, `launch.gno`, `math.gno`, `points.gno`, `pool.gno`, `query.gno`, `render.gno`, `state.gno`, `swap.gno`, `token.gno`, `types.gno`, `upgrade.gno`, `util.gno`, `zdex_test.gno`, và `/p/zdex/amm/v1/amm.gno`.
- **Không** phải audit on-chain. Live Sapphire hiện là `gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex` — path khác, không xác minh ở đây.
- Method: `gno-audit` (Phase 1 triage + Phase 2 entrypoints + FP filter). Class số từ `security.md` của gno-mcp. Không PoC, không payload.

## Confidence

First-pass: 18 ứng viên. After FP filter: 14 findings (4 GREEN notes). Catalog Class 2 trên helper unexported được hạ xuống Medium vì không có exported wrapper chuyển `rlm` giả — GRC20 `fnTeller` và `cross(rlm)` đã check `IsCurrent`.

---

## Bảng

| Severity | Finding | File | Fix |
|---|---|---|---|
| Critical | `tokenPullKey` kéo token A lúc `CreatePool`; mọi `pull`/`push` sau dùng `p.Symbol`. External GRC20 happy-path **kẹt quỹ**. Confused deputy nếu `symbol` cũng là registry key khác. | `token.gno:43-51`, `pool.gno:23`, `pool.gno:74`, `swap.gno:97-104` | Resolve **một** canonical key lúc create (`grc20reg.Get(tokenKey)` + `GetSymbol()==symbol`, hoặc internal `tryTok`). Lưu vào `Pool.Token`. Mọi `pullUserToken`/`pushToken` dùng key đó, không dùng ticker. |
| High | `MulDiv` overflow path panic khi `a0*b0` không vừa `int64` dù `a*b/d` vừa. Pool 18 decimals swap/LP **DoS**. | `amm/v1/amm.gno:20-48` | Wide mul (tách 32-bit) cho `floor(a*b/d)`; panic chỉ khi **kết quả** > `int64` max. Test remainder khác 0 với `~1e18`. |
| High | Book `if pay<=0 { pay=1 }` lấy inventory maker với dust. Remove order khi một vế = 0, không refund `GiveAmt` còn lại. | `book.gno:79-85`, `book.gno:102-108`, `book.gno:116-118` | `require(pay>0)` (reject dust). Làm tròn **có lợi maker**. Khi xóa order, `send`/`push` remainder `GiveAmt`. |
| High | `ClaimFeeShare` chỉ giữ **một** epoch đóng. Roll ghi đè `closedPot`/`closedPts`. Unclaimed ugnot **kẹt** trong realm; user miss window thì mất share. `closedPot` không giảm khi claim. | `points.gno:5-26`, `points.gno:111-126` | Lịch sử N epoch, hoặc cộng unclaimed vào `epochPot` kế. Trừ `closedPot` khi claim. Sweep dust admin-gated. |
| Medium | `pullUserToken` / `pushToken` `(_ int, rlm realm)` dùng `rlm.Previous()` **không** `rlm.IsCurrent()`. Catalog Class 2. `sendUgnot` thì có. | `token.gno:53-72` vs `swap.gno:179-185` | Copy guard `if !rlm.IsCurrent() { panic("zdex: spoofed realm") }` như `sendUgnot`. |
| Medium | External / fee-on-transfer / rebase: `TransferFrom(amount)` tin amount, không đo `BalanceOf(this)` trước/sau. Canonical GRC20 không fee-on-transfer; registry chỉ nhận `*grc20.Token`. | `token.gno:53-62` | `delta := balanceAfter - balanceBefore`; credit `delta`. Từ chối token rebase. |
| Medium | `MulDivCeil` overflow path **luôn** `q+1` kể cả khi chia hết → ExactOut trả thêm 1 unit. | `amm/v1/amm.gno:109-120` | Cùng wide mul; ceil chỉ khi remainder ≠ 0. |
| Medium | `Launch` vẫn exported (bonding curve, keep, vest, snipe). Product DEX-only; gnoweb form không gọi nhưng MsgCall vẫn được. | `launch.gno:8` | `panic("zdex: launch disabled")` trên v2, hoặc `mustOwner`. Giữ `ClaimVest` cho pool cũ. |
| Low | Symbol không charset. `poolID`/`Render` form `value="%s"`; snapshot `;`/`\|` split. | `pool.gno:17-18`, `render.gno:92` | `[A-Za-z0-9]{1,12}`. Sanitize attribute. |
| Low | `AccPoints`/`epochPts` `add64` có thể overflow sau volume lớn → pool DoS. | `points.gno:97`, `points.gno:61` | Cap / reset acc theo epoch; test cận `MaxInt64`. |
| Low | `ProposeAdmin` không cancel/expiry. `TransferAdmin` chỉ alias `ProposeAdmin`. | `admin.gno:11-29` | `CancelAdmin` (pending=zero). Đổi tên / godoc. |
| Low | Pause chặn `ClaimFeeShare` nhưng **không** chặn roll epoch (`maybeRollEpoch` trong swap). Admin pause qua boundary → user miss pot. | `points.gno:112-114`, `swap.gno:75` | Cho claim khi pause, hoặc đừng roll khi pause. |
| Info | `CreatePool` không snipe cap (SnipeUntil=0). Sandwich listing là AMM-bình thường. | `pool.gno:29-40` vs `swap.gno:36-46` | Document. Optional listing snipe. |
| Info | `creditFees` dead; `creditSwapPoints` mới ghi bucket. Gọi cả hai sau này = double-count. | `swap.gno:48-56` | Xóa `creditFees` hoặc gọi một chỗ. |
| Info | Hook Uniswap-style **chưa có**. Nếu thêm: Class 3/4 + (C). | — | Xem mục Hook ở dưới. **Không** thêm `func` hook. |

---

## Ship blockers

Vá trước addpkg v2. Không deploy.

### 1. Critical — `CreatePool` / `tokenPullKey` confused deputy + kẹt quỹ

**Class**: operational (wrong asset) + Class 2-adjacent (caller chọn key/symbol tách).

**Evidence**

`tokenPullKey` ưu tiên internal symbol, không thì `tokenKey`:

```43:51:gno.land/r/zdex/v2/token.gno
func tokenPullKey(tokenKey, symbol string) string {
	if tryTok(symbol) != nil {
		return symbol
	}
	if tokenKey != "" {
		return tokenKey
	}
	return symbol
}
```

`CreatePool` kéo bằng key đó, nhưng lưu `Symbol` ticker và `Token` = raw `tokenKey`:

```21:47:gno.land/r/zdex/v2/pool.gno
	takeUgnot(cur, amountU)
	caller := cur.Previous().Address()
	pullUserToken(0, cur, tokenPullKey(tokenKey, symbol), caller, amountT)
	// ...
	p := &Pool{
		ID:          id,
		Token:       tokenKey,
		Symbol:      symbol,
```

Mọi path sau (`AddLiquidity`, `RemoveLiquidity`, `SwapExactIn`/`Out`, book, `CollectFees`) gọi `pullUserToken`/`pushToken` với **`p.Symbol`**, không phải `p.Token`:

```74:74:gno.land/r/zdex/v2/pool.gno
	pullUserToken(0, cur, p.Symbol, caller, tokenIn)
```

```97:104:gno.land/r/zdex/v2/swap.gno
		pushToken(0, cur, p.Symbol, caller, out)
	} else {
		require(tokenIn == p.Symbol || tokenIn == p.Token, "zdex: tokenIn")
		out = AmountOut(amountIn, p.ReserveT, 0, p.ReserveU, 0, p.FeeBps)
		require(out >= minOut, "zdex: slippage")
		assertSnipe(p, out, false)
		pullUserToken(0, cur, p.Symbol, caller, amountIn)
```

External GRC20 registry key là `fqname` (`gno.land/r/….SYMBOL`), không phải ticker. `grc20reg.MustGet(symbol)` với ticker sẽ panic. UI `CreatePool.tsx` gửi `[tokenKey \|\| symbol, symbol]` — đúng pattern registry key + ticker → **seed thành công, swap/LP/remove sau fail**. ugnot + token nằm trong realm, `RemoveLiquidity` cũng `pushToken(p.Symbol)` nên **không rút được**.

Nếu attacker đặt `tokenKey` = registry key token rẻ, `symbol` = registry key token đắt (cả hai là key hợp lệ), seed kéo token rẻ, `ReserveT` đếm amount đó, path sau kéo/đẩy token đắt. Kế toán lẫn asset.

**Considered objection**: “UI luôn khớp key.” Không: UI cố ý tách key/ticker. Internal path (`tryTok(symbol)`) thì ổn; **external là sản phẩm CreatePool**.

**Fix**

1. `tok := grc20reg.Get(tokenKey)`; `require(tok != nil)`; `require(tok.GetSymbol() == symbol)` (hoặc so sánh canonical).
2. Internal: `require(tokenKey == "" || tokenKey == rec.token.ID())`.
3. `p.Token = canonicalKey` (registry key hoặc internal id).
4. Helper `poolTokenRef(p) string` — internal thì `p.Symbol`, external thì `p.Token`. Dùng **mọi** pull/push.
5. Không tin `tokenIn`/`tokenOut` string của caller để chọn asset; chỉ dùng để phân nhánh ugnot vs token.

### 2. High — `MulDiv` remainder overflow (DoS pool lớn)

**Class**: operational (int64) — ưu tiên user: overflow.

**Evidence**

```20:48:gno.land/p/zdex/amm/v1/amm.gno
	prod, ok := overflow.Mul64(a, b)
	if ok {
		return prod / d
	}
	a1 := a / d
	a0 := a % d
	// ...
	p3, ok3 := overflow.Mul64(a0, b0)
	if !ok3 {
		panic("zdex: muldiv overflow")
	}
	sum, ok4 = overflow.Add64(sum, p3/d)
```

Công thức `a1*b + a0*b1 + a0*b0/d` đúng **khi** `a0*b0` vừa `int64`. `a0,b0 < d`. Pool 18 decimals, `d ~ 1e18`, `a0*b0` lên tới `~1e36` → panic dù `floor(a*b/d)` vẫn vừa `int64`.

Test hiện tại `MulDiv(1e12, 1e12, 1e12)` đi overflow path nhưng `a0=0` — **không** bắt remainder.

`AmountOut` = `MulDiv(net, y, x+net)`. Swap/LP/snipe/points/vest đều gọi. Launch cho `decimals <= 18`.

**Considered objection**: “Comment nói overflow-safe.” Rearrange mới cover `a*b` overflow khi `a0=0` hoặc `a0*b0` nhỏ. False panic, không phải trộm quỹ — vẫn block DEX 18-dec.

**Fix**: wide mul 32-bit (hi/lo) cho 128-bit product / `d`. Panic chỉ khi quotient > `int64` max. Thêm test: `MulDiv(1e18-1, 1e18-1, 1e18)` phải ra `1e18-2` (hoặc đúng floor), không panic. Vá `MulDivCeil` cùng lúc (dòng 119 luôn `q+1`).

### 3. High — escrow book round-up chống maker

**Class**: operational (rounding / leftover lock).

**Evidence**

```79:85:gno.land/r/zdex/v2/book.gno
		payU := MulDiv(o.GiveAmt, wantTake, o.WantAmt)
		if payU <= 0 {
			payU = 1
		}
		if payU > o.GiveAmt {
			payU = o.GiveAmt
		}
```

Ask side giống (`payT`, dòng 102–108). `MulDiv` floor = 0 trên fill nhỏ / ratio lớn thì **bump lên 1** và trừ `GiveAmt`. Taker nhận 1 unit inventory với 1 unit dust, lệch limit. Full fill `AllOrNone` không dính (`MulDiv(G, W, W) = G`).

Khi `GiveAmt` hoặc `WantAmt` chạm 0, order **xóa**, không refund remainder:

```116:118:gno.land/r/zdex/v2/book.gno
	if o.GiveAmt == 0 || o.WantAmt == 0 {
		orders.Remove(itoa(int64(o.ID)))
	}
```

Bump-to-1 có thể zero `GiveAmt` khi `WantAmt` còn — inventory maker hết, leftover want hủy.

**Considered objection**: “Tránh fill 0.” Đúng ý, sai hướng: reject, đừng lấy 1 unit của maker. Test `TestLimitOrderBidFill` chỉ full fill 1000/10.

**Fix**

- `require(payU > 0 && payT > 0, "zdex: dust")` — bỏ bump.
- Bid: taker nhận `floor` ugnot (maker-favorable). Ask: taker nhận `floor` token; ugnot taker trả `ceil` nếu cần.
- Trước `Remove`: nếu `GiveAmt > 0`, trả maker (cùng nhánh `CancelOrder`).
- `CancelOrder` đã không `assertNotPaused` — **giữ** (cứu escrow khi pause). GREEN.

### 4. High — `ClaimFeeShare` một snapshot, pot kẹt

**Class**: operational (no exit / overwritten accounting).

**Evidence**

Roll chỉ giữ epoch vừa đóng:

```18:24:gno.land/r/zdex/v2/points.gno
	closedID = epoch
	closedPts = epochPts
	closedPot = epochPot
	epoch++
	epochPts = 0
	epochPot = 0
	epochEnd = h + epochBlocks
```

Claim gửi ugnot, **không** trừ `closedPot`, chỉ set `ClaimedID`:

```111:126:gno.land/r/zdex/v2/points.gno
func ClaimFeeShare(cur realm) int64 {
	assertNotPaused()
	maybeRollEpoch()
	require(closedID > 0 && closedPot > 0 && closedPts > 0, "zdex: nothing to share")
	// ...
	out := MulDiv(s.Closed, closedPot, closedPts)
	require(out > 0, "zdex: share too small")
	s.ClaimedID = closedID
	sendUgnot(0, cur, owner, out)
```

`syncScore`: `EpochID` lệch quá 1 epoch → `Closed = 0`. Miss ~1 ngày (`defaultEpochBlocks = 28800`) = mất share. ugnot unclaimed vẫn nằm banker, không còn bucket, `CollectFees` không quét pot. Catalog: consume native mà không có đường thoát đủ — kẹt quỹ.

Pause chặn claim (`assertNotPaused`) nhưng swap vẫn `maybeRollEpoch` — admin pause qua boundary làm miss hàng loạt (Low, admin-trusted, vẫn vá chung).

**Considered objection**: “User phải claim đúng hạn.” Window 1 ngày + overwrite + không sweep = mất quỹ user và kẹt native. Points là cap (`feeShare;noStakeLp`).

**Fix**

- Map `epochID -> {pot, pts}` hoặc vòng N closed epochs.
- Unclaimed leftover cộng vào `epochPot` mới khi roll.
- `closedPot -= out` (hoặc `claimed` chạy) để kế toán khớp banker.
- Cho `ClaimFeeShare` khi pause; hoặc freeze `maybeRollEpoch` khi pause.
- Admin `SweepDust` optional, không phải đường chính.

---

## Later (không block math DEX nếu 4 mục trên xong; vẫn nên vá trước mainnet)

### Medium — Class 2 helper `rlm` không `IsCurrent`

`pullUserToken` tin `rlm.Previous().Address()`:

```53:62:gno.land/r/zdex/v2/token.gno
func pullUserToken(_ int, rlm realm, symbol string, from address, amount int64) {
	require(amount > 0, "zdex: amount")
	require(from == rlm.Previous().Address(), "zdex: from must be caller")
	rec := tryTok(symbol)
	if rec != nil {
		checkErr(rec.token.CallerTeller().Transfer(0, rlm, thisAddr(), amount))
		return
	}
	grc20reg.TransferFrom(cross(rlm), symbol, from, thisAddr(), amount)
}
```

`pushToken` (dòng 64) cũng không check. `sendUgnot` thì có:

```179:185:gno.land/r/zdex/v2/swap.gno
func sendUgnot(_ int, rlm realm, to address, amount int64) {
	if !rlm.IsCurrent() {
		panic("zdex: spoofed realm")
	}
	bk := banker.NewBanker(banker.BankerTypeRealmSend, rlm)
	bk.SendCoins(rlm.Address(), to, chain.Coins{{Denom: nativeDenom, Amount: amount}})
}
```

**FP**: unexported; mọi call site truyền crossing `cur`. `fnTeller.Transfer`/`TransferFrom` check `IsCurrent` (`tellers.gno:81-83`, `109-111`). `cross(rlm)` cần live frame. **Không** hạ catalog shape — một wrapper exported là designation-forgery. Vá cho đồng bộ `sendUgnot`.

`from == caller` trên pull **đúng** (chống confused-deputy allowance: không `TransferFrom` người thứ ba). Giữ.

### Medium — đo balance trước/sau khi kéo external

Canonical `*grc20.Token` không fee-on-transfer. Vẫn đo `delta` nếu registry đổi, hoặc document “chỉ GRC20 chuẩn.”

### Medium — `Launch` còn public

Vest/snipe/keep trên Launch nhìn đúng (`maxCreatorKeepBps=2000`, `minVestBlocks`/`minLockBlocks`, two-sided snipe `assertSnipe`). Product: DEX-only. MsgCall `Launch` vẫn mint bonding curve. Disable trên v2; giữ `ClaimVest`.

### Low — symbol charset / Render attribute

`require(symbol != "", ...)`. `renderPool` `value="%s"` với `p.ID`. Snapshot `ufmt` ghép `;`. Restrict ticker.

### Low — `AccPoints` overflow DoS

`p.AccPoints = add64(..., MulDiv(volU, ptsScale, p.TotalLP))` với `ptsScale=1e9`. Volume lớn → panic, pool đứng. Reset/cap theo epoch.

### Low — admin two-step thiếu cancel

`ProposeAdmin` + `AcceptAdmin` đúng hai bước. `TransferAdmin` = `ProposeAdmin` (không chuyển ngay — tốt, tên dễ hiểu nhầm). Không clear pending trừ propose address khác (`next.IsValid()` nên không propose zero). Thêm cancel.

### Info — listing không snipe; `creditFees` dead; `SetModule` tin UI

`SetModule`/`SetNextPkg` admin-only: UI có thể bị trỏ sang pkg độc. Liquidity **không** migrate. Document hub trust.

---

## GREEN (giữ)

| Item | Evidence |
|---|---|
| Payment guard `IsUserCall` + `OriginSend`, **không** `IsUser()` | `swap.gno:86-88`, `swap.gno:130-134`, `swap.gno:187-190`, `pool.gno:10`, `launch.gno:10`. Test `TestPaymentGuardRejectsRealm`. |
| `SwapExactOut` `sent >= in`, refund `sent-in` | `swap.gno:133-144` |
| Admin two-step | `admin.gno:11-25`, `TestAdminTwoStep` |
| Launch vest tuyến tính, LP seed unowned, snipe hai phía | `launch.gno:37-73`, `swap.gno:36-46`, `TestSnipeCap` / `TestSellDuringSnipe` / `TestVestingReleases` |
| `CancelOrder` không pause — cứu escrow | `book.gno:123-134` |
| Internal GRC20 `TransferFrom` dùng `CallerTeller` (spender = previous, `IsCurrent` trong teller) | `token.gno:98-101` |
| `Render` `sanitize.InlineText` | `render.gno:34`, `render.gno:77` |
| Không `IsUser()` + `OriginSend` cùng hàm | triage sạch |
| Không stored `realm` value | `types.gno` chỉ `address` |
| `avl.Tree` unexported, Iterate chỉ closure trong package — (B) không lộ | `state.gno:15-21` |
| Không hook / `func` parameter trên permission path — Class 3/4 hiện **không** có | — |

---

## OriginSend / IsUserCall (chi tiết)

Canonical (`security.md` payment-guard): `cur.Previous().IsUserCall()` **trước** `unsafe.OriginSend()`, trước mutate.

| Entrypoint | Guard | Amount |
|---|---|---|
| `takeUgnot` | `IsUserCall` | `sent == amount` |
| `SwapExactIn` buy | `IsUserCall` (inline, không qua `takeUgnot`) | `sent == amountIn` |
| `SwapExactOut` buy | `IsUserCall` | `sent >= in`, refund excess |
| `CreatePool` / `Launch` | `IsUserCall` rồi `takeUgnot` | exact |
| `PlaceBid` / Fill ask | `takeUgnot` | exact |
| Sell token → ugnot | không cần OriginSend; realm được bán | pull + `sendUgnot` |

MsgRun không qua `IsUserCall`. Không thấy `IsUser()` trên payment path.

Lệch nhỏ: buy swap **duplicate** guard thay vì gọi `takeUgnot` (`SwapExactOut` cần `>=`). OK nếu không drift.

---

## Approve / TransferFrom / confused deputy

- Internal: `Approve`/`TransferFrom` exported trên zdex, `CallerTeller` → spender = `Previous()`, `IsCurrent` trong `/p/grc20`.
- External: user `Approve` **zdex realm** trên `grc20reg`; zdex `TransferFrom(from, this, amt)` với `from == caller`. Third party **không** kéo allowance người khác.
- Lỗ: **key lúc create ≠ key lúc pull** (blocker 1), không phải thiếu `from==caller`.
- Infinite approve vẫn là UX; mọi pull hiện lấy `amount` từ caller. Đừng thêm helper kéo “max” im lặng.

---

## Admin two-step

Đúng: `ProposeAdmin` (owner) → `AcceptAdmin` (pending). `mustOwner` = `cur.Previous().Address() == admin` trên crossing `cur` (runtime-current). `init` gán deployer.

Thiếu: cancel pending; `TransferAdmin` tên như instant. `SetPaused` / `SetFeeShareBps` / `SetEpochBlocks` / `SetModule` / `SetNextPkg` một chữ ký — đúng với pause/params; `SetModule` là trust UI.

`CollectFees` creator **hoặc** admin, chạy khi pause (test `TestFeeBucketsIndependent`). Cố ý.

---

## Hook risk (nếu thêm Uniswap-style sau)

Hiện **không** có `hooks`, `beforeSwap`, `func(...)` trên swap/LP/book. **Đừng** thêm cho đến khi có design review.

Nếu thêm:

| Shape | Class | Vì sao chết |
|---|---|---|
| `interface { BeforeSwap(cur realm, ...) }` | 1a/1b | `cur` capability leak |
| `interface { BeforeSwap(...) }` caller-supplied, gọi rồi mới đổi reserve | 3 | impl-substitution + reenter entrypoint zdex |
| `var hook func(*Pool)` / `SetHook(fn)` | 4 + (C) | closed-over-authority; `/p/` top-level callback = no-anchor (B) |
| Hook trên `/p/` type `Iterate(cb func(*Node))` gắn vào pool | (B) | launder write dưới `m.Realm = zdex` |

**Rule nếu ship hook**

1. Không nhận `cur realm` trên interface.
2. Canonical type assert (`*ZdexHook` do **zdex** declare) — seal method không đủ.
3. Checks → effects → interactions; không gọi hook giữa hai mutate.
4. Callback typed `func(*Pool)` **cấm** nếu `Pool` là `/r/` mà hook `/p/` không gọi được — typed bằng type `/r/zdex` để `/p/` attacker không match.
5. Không `cross(cur)` vào hook với live capability.
6. Flag `inSwap` nếu vẫn muốn gọi ra ngoài.
7. Hook **không** đổi `OriginSend` / không skip snipe / fee.

Không làm Uniswap v4 `unlock` callback. AMM Gno nên giữ synchronous, no user code in the tick.

---

## Vest / snipe / LP lock (Launch — không blocker nếu Launch disable)

- Keep cap 20%, vest min ~1 ngày, LP lock ~1 ngày, snipe default 2% / 1000 blocks, max 10%.
- Seed LP unowned (`Position` không gán creator) → không rút curve seed.
- `assertSnipe`: buy cap `% ReserveT`, sell cap `% ReserveU`. `CreatePool` SnipeUntil=0.
- Book **không** snipe — P2P escrow, không rút reserve Launch trừ khi token đã ra khỏi pool (đã qua cap AMM). OK.
- `ClaimVest` `MulDiv` tuyến tính; `EndH<=StartH` → full (dòng 109). `minVestBlocks` khi keep>0.

---

## Open questions

- `gno.land/p/zdex/amm/v1` đã addpkg chưa? Vá MulDiv = package **mới** (`/v2`) vì `/p/` immutable.
- Sapphire live có dùng `tokenPullKey` giống v2 không? Path live khác — không cover.
- `MulDiv(1e18-1, 1e18-1, 1e18)` chưa chạy trong audit này (không PoC). Reviewer protocol nên thêm test **expect đúng số**, không phải script tấn công.
- Banker conservation: `ReserveU + accruedU + epochPot + closedPot + bid escrow` vs `OriginSend` net. Nên invariant test; không trace hết banker trong pass này.

---

## Cross-references

- `gno-mcp` `skills/gno/references/security.md` — Class 1a/1b/2/3/4, payment-guard, operational
- `interrealm.md` — `IsCurrent`, `IsUserCall` vs `IsUser`, `cross`
- `patterns.md` — helper `rlm.IsCurrent`, panic-revert
- Skill `zdex-company` — MulDiv, OriginSend, escrow, two-step admin
- Tests: `gno test ./gno.land/r/zdex/v2` — chưa cover remainder MulDiv, mismatch key, book dust, miss-epoch claim

## Không làm

Không exploit payload. Không mnemonic. Không broadcast. Không sửa `gnomemepad`.
